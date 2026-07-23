import type { DatabaseConnection, DatabaseExecutor } from '@/core/database/contracts';
import { appMigrations, type MigrationDefinition } from '@/core/database/migrations';
import { initializeDatabase } from './migration-runner';
import { migrationOneFixture as fixture } from '@/features/shell/database/migration-one-fixture';

type StatefulFixtureState = { userVersion: number; ledger: { version: number; checksum: string }[]; migrationTwoObjects: string[]; migrationWrites: number; fixturePresent: boolean };

function createVersionOneFixtureConnection(failStatement?: string): Readonly<{ connection: DatabaseConnection; state: StatefulFixtureState }> {
  const state: StatefulFixtureState = { userVersion: 1, ledger: [{ version: fixture.migration.version, checksum: fixture.migration.checksum }], migrationTwoObjects: [], migrationWrites: 0, fixturePresent: true };
  const snapshot = (): StatefulFixtureState => ({ ...state, ledger: state.ledger.map((entry) => ({ ...entry })), migrationTwoObjects: [...state.migrationTwoObjects] });
  const restore = (value: StatefulFixtureState): void => { state.userVersion = value.userVersion; state.ledger = value.ledger; state.migrationTwoObjects = value.migrationTwoObjects; state.migrationWrites = value.migrationWrites; state.fixturePresent = value.fixturePresent; };
  const executor: DatabaseExecutor = {
    exec: jest.fn(async (sql: string) => { if (sql === failStatement) throw new Error('injected migration failure'); if (sql.startsWith('CREATE ')) state.migrationTwoObjects.push(sql); if (sql.startsWith('PRAGMA user_version = ')) state.userVersion = Number(sql.slice('PRAGMA user_version = '.length)); }),
    run: jest.fn(async (_sql: string, params: readonly unknown[]) => { state.ledger.push({ version: params[0] as number, checksum: params[2] as string }); state.migrationWrites += 1; return { changes: 1 }; }),
    first: jest.fn(async (sql: string) => {
      if (sql === 'PRAGMA foreign_keys') return { foreign_keys: 1 };
      if (sql === 'PRAGMA journal_mode = WAL') return { journal_mode: 'wal' };
      if (sql === 'PRAGMA busy_timeout') return { timeout: 3_000 };
      if (sql === 'PRAGMA user_version') return { user_version: state.userVersion };
      if (sql.includes("name = 'schema_migrations'")) return { name: 'schema_migrations' };
      if (sql === 'PRAGMA quick_check(1)') return { quick_check: 'ok' };
      return null;
    }) as DatabaseExecutor['first'],
    all: jest.fn(async (sql: string) => { if (sql === 'PRAGMA foreign_key_check') return []; if (sql.includes('FROM schema_migrations')) return state.ledger; return []; }) as DatabaseExecutor['all'],
  };
  const connection: DatabaseConnection = { ...executor, withExclusiveTransaction: jest.fn(async (task) => { const before = snapshot(); try { return await task(executor); } catch (error) { restore(before); throw error; } }), close: jest.fn(async () => undefined) };
  return { connection, state };
}

function createConnection(options: Readonly<{ foreignKeyRows?: readonly Record<string, unknown>[]; quickCheck?: string }> = {}): DatabaseConnection {
  const first = jest.fn(async (sql: string): Promise<Record<string, unknown> | null> => {
    let result: Record<string, unknown> | null = null;
    if (sql === 'PRAGMA foreign_keys') result = { foreign_keys: 1 };
    if (sql === 'PRAGMA journal_mode = WAL') result = { journal_mode: 'wal' };
    if (sql === 'PRAGMA busy_timeout') result = { timeout: 3_000 };
    if (sql === 'PRAGMA user_version') result = { user_version: appMigrations.length };
    if (sql.includes("name = 'schema_migrations'")) result = { name: 'schema_migrations' };
    if (sql === 'PRAGMA quick_check(1)') result = { quick_check: options.quickCheck ?? 'ok' };
    return result;
  });
  const all = jest.fn(async (sql: string): Promise<readonly Record<string, unknown>[]> => {
    if (sql === 'PRAGMA foreign_key_check') return options.foreignKeyRows ?? [];
    if (sql.includes('FROM schema_migrations')) return appMigrations.map((migration) => ({ version: migration.version, checksum: migration.checksum }));
    return [];
  });
  const executor: DatabaseExecutor = {
    exec: jest.fn(async () => undefined),
    run: jest.fn(async () => ({ changes: 1 })),
    first: first as DatabaseExecutor['first'],
    all: all as DatabaseExecutor['all'],
  };
  return {
    ...executor,
    withExclusiveTransaction: jest.fn(async (task) => task(executor)),
    close: jest.fn(async () => undefined),
  };
}

const migration = (version: number): MigrationDefinition => ({ version, name: `migration-${version}`, checksum: String(version).repeat(64), statements: [] });

describe('migration runner', () => {
  test.each([
    ["reversed", [migration(2), migration(1)]],
    ['duplicate', [migration(1), migration(1)]],
    ['gapped', [migration(1), migration(3)]],
  ])('rejects %s migration definitions before configuring the connection', async (_label, migrations) => {
    const connection = createConnection();
    await expect(initializeDatabase(connection, '1.0.0', migrations)).rejects.toThrow('strictly ascending and gap-free');
    expect(connection.exec).not.toHaveBeenCalled();
  });

  test('fails when foreign_key_check returns a violation row', async () => {
    await expect(initializeDatabase(createConnection({ foreignKeyRows: [{ table: 'foods' } ] }), '1.0.0')).rejects.toMatchObject({ category: 'integrity' });
  });

  test('fails when quick_check does not return exactly ok', async () => {
    await expect(initializeDatabase(createConnection({ quickCheck: 'not ok' }), '1.0.0')).rejects.toMatchObject({ category: 'integrity' });
  });

  test('rejects an invalid migration audit timestamp before beginning a migration', async () => {
    const connection = createConnection();
    (connection.first as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql === 'PRAGMA foreign_keys') return { foreign_keys: 1 };
      if (sql === 'PRAGMA journal_mode = WAL') return { journal_mode: 'wal' };
      if (sql === 'PRAGMA busy_timeout') return { timeout: 3_000 };
      if (sql === 'PRAGMA user_version') return { user_version: 0 };
      if (sql.includes("name = 'schema_migrations'")) return null;
      return null;
    });
    await expect(initializeDatabase(connection, '1.0.0', appMigrations, () => 'not-a-timestamp')).rejects.toMatchObject({ category: 'configuration' });
    expect(connection.withExclusiveTransaction).not.toHaveBeenCalled();
  });

  test('retained version-one fixture pins the published ledger identity before Migration 002 is considered', () => {
    expect(fixture.migration).toEqual({ version: appMigrations[0]?.version, name: appMigrations[0]?.name, checksum: appMigrations[0]?.checksum });
    expect(appMigrations[1]?.version).toBe(2);
    expect(fixture.food.revision.revisionNumber).toBe(1);
    expect(fixture.food.portion.id).toBeTruthy();
  });

  test('upgrades the retained version-one fixture once and preserves its deterministic seed state', async () => {
    const { connection, state } = createVersionOneFixtureConnection();
    await initializeDatabase(connection, '1.0.0', appMigrations, () => fixture.ledger.appliedAt);
    expect(state.fixturePresent).toBe(true);
    expect(state.userVersion).toBe(3);
    expect(state.ledger).toEqual(appMigrations.map((entry) => ({ version: entry.version, checksum: entry.checksum })));
    expect(state.migrationTwoObjects).toEqual(appMigrations.slice(1).flatMap((entry) => entry.statements.filter((statement) => statement.startsWith('CREATE '))));
    const writes = state.migrationWrites;
    await initializeDatabase(connection, '1.0.0', appMigrations, () => fixture.ledger.appliedAt);
    expect(state.migrationWrites).toBe(writes);
  });

  test('rolls an injected version-two failure back to the complete version-one fixture state', async () => {
    const failingMigration: MigrationDefinition = { version: 2, name: 'failing-manual-logging', checksum: 'f'.repeat(64), statements: ['CREATE TABLE transient_phase_three_fixture (id INTEGER)', 'FAIL MIGRATION TWO'] };
    const { connection, state } = createVersionOneFixtureConnection('FAIL MIGRATION TWO');
    const migrationOne = appMigrations[0];
    if (migrationOne === undefined) throw new Error('Migration 001 is missing.');
    await expect(initializeDatabase(connection, '1.0.0', [migrationOne, failingMigration], () => fixture.ledger.appliedAt)).rejects.toThrow('injected migration failure');
    expect(state).toMatchObject({ userVersion: 1, ledger: [{ version: 1, checksum: fixture.migration.checksum }], migrationTwoObjects: [], fixturePresent: true });
    await initializeDatabase(connection, '1.0.0', appMigrations, () => fixture.ledger.appliedAt);
    expect(state.userVersion).toBe(3);
  });
});

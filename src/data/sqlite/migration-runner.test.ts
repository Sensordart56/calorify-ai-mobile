import type { DatabaseConnection, DatabaseExecutor } from '@/core/database/contracts';
import { phaseTwoMigrations, type MigrationDefinition } from '@/core/database/migrations';
import { initializeDatabase } from './migration-runner';

function createConnection(options: Readonly<{ foreignKeyRows?: readonly Record<string, unknown>[]; quickCheck?: string }> = {}): DatabaseConnection {
  const first = jest.fn(async (sql: string): Promise<Record<string, unknown> | null> => {
    let result: Record<string, unknown> | null = null;
    if (sql === 'PRAGMA foreign_keys') result = { foreign_keys: 1 };
    if (sql === 'PRAGMA journal_mode = WAL') result = { journal_mode: 'wal' };
    if (sql === 'PRAGMA busy_timeout') result = { timeout: 3_000 };
    if (sql === 'PRAGMA user_version') result = { user_version: 1 };
    if (sql.includes("name = 'schema_migrations'")) result = { name: 'schema_migrations' };
    if (sql === 'PRAGMA quick_check(1)') result = { quick_check: options.quickCheck ?? 'ok' };
    return result;
  });
  const all = jest.fn(async (sql: string): Promise<readonly Record<string, unknown>[]> => {
    if (sql === 'PRAGMA foreign_key_check') return options.foreignKeyRows ?? [];
    if (sql.includes('FROM schema_migrations')) return [{ version: 1, checksum: phaseTwoMigrations[0].checksum }];
    return [];
  });
  const executor: DatabaseExecutor = {
    exec: jest.fn(async () => undefined),
    run: jest.fn(async () => undefined),
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
    await expect(initializeDatabase(connection, '1.0.0', phaseTwoMigrations, () => 'not-a-timestamp')).rejects.toMatchObject({ category: 'configuration' });
    expect(connection.withExclusiveTransaction).not.toHaveBeenCalled();
  });
});

import type { DatabaseConnection } from '@/core/database/contracts';
import { requireApplicationVersion } from '@/core/application/app-version';
import { DatabaseInitializationError } from '@/core/database/errors';
import type { MigrationDefinition } from '@/core/database/migrations';
import { appMigrations } from '@/core/database/migrations';
import { requireUtcTimestamp } from '@/core/time/utc-timestamp';

const BUSY_TIMEOUT_MILLISECONDS = 3_000;

type UserVersionRow = { readonly user_version: number };
type LedgerRow = { readonly version: number; readonly checksum: string };

export type DatabaseInitializationStep =
  | 'migration-definition'
  | 'application-version'
  | 'connection-configuration'
  | 'migration-ledger'
  | 'migration-application'
  | 'integrity-check';

type InitializationStepObserver = (step: DatabaseInitializationStep) => void;

function readFirstValue(row: Record<string, unknown> | null): unknown {
  return row === null ? undefined : Object.values(row)[0];
}

async function configureConnection(connection: DatabaseConnection): Promise<void> {
  await connection.exec('PRAGMA foreign_keys = ON');
  const foreignKeys = await connection.first<{ readonly foreign_keys: number }>('PRAGMA foreign_keys');
  if (foreignKeys?.foreign_keys !== 1) throw new DatabaseInitializationError('configuration', 'Foreign keys could not be enabled.');

  const journal = await connection.first<{ readonly journal_mode: string }>('PRAGMA journal_mode = WAL');
  if (journal?.journal_mode.toLowerCase() !== 'wal') throw new DatabaseInitializationError('configuration', 'WAL could not be enabled.');

  await connection.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MILLISECONDS}`);
  const timeout = await connection.first<{ readonly timeout: number }>('PRAGMA busy_timeout');
  if (timeout?.timeout !== BUSY_TIMEOUT_MILLISECONDS) throw new DatabaseInitializationError('configuration', 'Busy timeout could not be configured.');
}

async function hasLedger(connection: DatabaseConnection): Promise<boolean> {
  const row = await connection.first<{ readonly name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'");
  return row?.name === 'schema_migrations';
}

async function validateIntegrity(connection: DatabaseConnection): Promise<void> {
  const foreignKeyRows = await connection.all<Record<string, unknown>>('PRAGMA foreign_key_check');
  if (foreignKeyRows.length !== 0) throw new DatabaseInitializationError('integrity', 'Foreign-key integrity check failed.');
  const quickCheck = await connection.first<Record<string, unknown>>('PRAGMA quick_check(1)');
  if (readFirstValue(quickCheck) !== 'ok') throw new DatabaseInitializationError('integrity', 'Quick integrity check failed.');
}

function validateDefinitions(migrations: readonly MigrationDefinition[]): readonly MigrationDefinition[] {
  for (const [index, migration] of migrations.entries()) {
    if (!Number.isSafeInteger(migration.version) || migration.version !== index + 1) {
      throw new DatabaseInitializationError('migration', 'Migration versions must be strictly ascending and gap-free.');
    }
  }
  return migrations;
}

export async function initializeDatabase(
  connection: DatabaseConnection,
  appVersion: string,
  migrations: readonly MigrationDefinition[] = appMigrations,
  now: () => string = () => new Date().toISOString(),
  reportStep: InitializationStepObserver = () => undefined,
): Promise<void> {
  reportStep('migration-definition');
  const orderedMigrations = validateDefinitions(migrations);
  let validAppVersion: string;
  try {
    reportStep('application-version');
    validAppVersion = requireApplicationVersion(appVersion);
  } catch (error) {
    throw new DatabaseInitializationError('configuration', error instanceof Error ? error.message : 'Application version is invalid.');
  }
  reportStep('connection-configuration');
  await configureConnection(connection);
  reportStep('migration-ledger');
  const userVersion = await connection.first<UserVersionRow>('PRAGMA user_version');
  const ledgerExists = await hasLedger(connection);
  const version = userVersion?.user_version ?? 0;

  if (!ledgerExists && version > 0) {
    throw new DatabaseInitializationError('migration', 'Migration ledger is missing for a versioned database.');
  }

  const applied = ledgerExists
    ? await connection.all<LedgerRow>('SELECT version, checksum FROM schema_migrations ORDER BY version ASC')
    : [];
  if (ledgerExists && (applied.length === 0 || applied[applied.length - 1]?.version !== version || applied.some((entry, index) => entry.version !== index + 1))) {
    throw new DatabaseInitializationError('migration', 'Migration ledger and user version disagree.');
  }

  for (const entry of applied) {
    const definition = orderedMigrations.find((migration) => migration.version === entry.version);
    if (definition === undefined || definition.checksum !== entry.checksum) {
      throw new DatabaseInitializationError('migration', 'Applied migration checksum does not match this application.');
    }
  }

  const missing = orderedMigrations.filter((migration) => migration.version > version);
  if (missing.length > 0) {
    reportStep('migration-application');
    let appliedAt: string;
    try {
      appliedAt = requireUtcTimestamp(now());
    } catch (error) {
      throw new DatabaseInitializationError('configuration', error instanceof Error ? error.message : 'Migration timestamp is invalid.');
    }
    await connection.withExclusiveTransaction(async (transaction) => {
      for (const migration of missing) {
        for (const statement of migration.statements) await transaction.exec(statement);
        await transaction.run(
          'INSERT INTO schema_migrations (version, name, checksum, applied_at, app_version) VALUES (?, ?, ?, ?, ?)',
          [migration.version, migration.name, migration.checksum, appliedAt, validAppVersion],
        );
        await transaction.exec(`PRAGMA user_version = ${migration.version}`);
      }
    });
  }

  reportStep('integrity-check');
  await validateIntegrity(connection);
}

import type { DatabaseConnection } from '@/core/database/contracts';
import { phaseTwoMigrations, type MigrationDefinition } from '@/core/database/migrations';
import { openExpoDatabase, DISPOSABLE_INTEGRATION_DATABASE, resetDisposableDevelopmentDatabase } from '@/data/sqlite/expo-sqlite-database';
import { initializeDatabase } from '@/data/sqlite/migration-runner';

export type VerificationResult = Readonly<{ id: string; passed: boolean; category?: string }>;

type DisposableCaseDependencies = Readonly<{
  openDatabase: (name: string) => Promise<DatabaseConnection>;
  resetDatabase: (name: string) => Promise<void>;
}>;

const disposableCaseDependencies: DisposableCaseDependencies = {
  openDatabase: openExpoDatabase,
  resetDatabase: resetDisposableDevelopmentDatabase,
};

function categoryFor(error: unknown): string {
  return error instanceof Error && /checksum|ledger|version/i.test(error.message) ? 'migration' : 'database';
}

export async function runDisposableCase(
  id: string,
  run: (connection: DatabaseConnection) => Promise<void>,
  dependencies: DisposableCaseDependencies = disposableCaseDependencies,
): Promise<VerificationResult> {
  let result: VerificationResult;
  try {
    await dependencies.resetDatabase(DISPOSABLE_INTEGRATION_DATABASE);
    const connection = await dependencies.openDatabase(DISPOSABLE_INTEGRATION_DATABASE);
    try { await run(connection); } finally { await connection.close(); }
    result = { id, passed: true };
  } catch (error) {
    result = { id, passed: false, category: categoryFor(error) };
  }

  try {
    await dependencies.resetDatabase(DISPOSABLE_INTEGRATION_DATABASE);
  } catch (error) {
    return { id, passed: false, category: categoryFor(error) };
  }
  return result;
}

const now = '2026-07-14T00:00:00.000Z';

async function insertFoodWithRevision(connection: DatabaseConnection): Promise<void> {
  await connection.withExclusiveTransaction(async (transaction) => {
    await transaction.run('INSERT INTO foods (id, canonical_name, normalized_name, origin, current_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ['food-1', 'Test food', 'test food', 'user', 'revision-1', now, now]);
    await transaction.run('INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['revision-1', 'food-1', 1, null, 1_000_000, 'gram', 1, 0, 0, 0, null, null, null, 0, now]);
  });
}

async function expectRejected(operation: () => Promise<void>, message: string): Promise<void> {
  let rejected = false;
  try { await operation(); } catch { rejected = true; }
  if (!rejected) throw new Error(message);
}

export function verifyConcurrentWriteOutcome(
  results: readonly PromiseSettledResult<void>[],
  rowIds: readonly number[],
): void {
  const expectedRowIds: number[] = [];
  for (const [index, result] of results.entries()) {
    const id = index + 1;
    if (result.status === 'fulfilled') {
      expectedRowIds.push(id);
    } else if (!/locked|busy/i.test(String(result.reason))) {
      throw new Error('exclusive write failed for an unexpected reason');
    }
  }
  if (expectedRowIds.length === 0) {
    throw new Error('exclusive writes did not produce a successful write');
  }
  if (rowIds.length !== expectedRowIds.length || rowIds.some((id, index) => id !== expectedRowIds[index])) {
    throw new Error('exclusive write rows did not match fulfilled writes');
  }
}

export async function runDatabaseVerification(): Promise<readonly VerificationResult[]> {
  const results: VerificationResult[] = [];
  results.push(await runDisposableCase('fresh-bootstrap', async (connection) => { await initializeDatabase(connection, '1.0.0'); }));
  results.push(await runDisposableCase('idempotent-reopen', async (connection) => { await initializeDatabase(connection, '1.0.0'); await initializeDatabase(connection, '1.0.0'); }));
  results.push(await runDisposableCase('composite-ownership', async (connection) => { await initializeDatabase(connection, '1.0.0'); await insertFoodWithRevision(connection); }));
  results.push(await runDisposableCase('cross-food-ownership-rejection', async (connection) => {
    await initializeDatabase(connection, '1.0.0'); await insertFoodWithRevision(connection);
    await expectRejected(async () => connection.withExclusiveTransaction(async (transaction) => {
      await transaction.run('INSERT INTO foods (id, canonical_name, normalized_name, origin, current_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ['food-2', 'Other food', 'other food', 'user', 'revision-1', now, now]);
      await transaction.run('INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['revision-2', 'food-2', 1, null, 1_000_000, 'gram', 1, 0, 0, 0, null, null, null, 0, now]);
    }), 'cross-food current revision was accepted');
  }));
  results.push(await runDisposableCase('immutable-revision', async (connection) => {
    await initializeDatabase(connection, '1.0.0'); await insertFoodWithRevision(connection);
    await expectRejected(() => connection.run('UPDATE food_revisions SET revision_number = ? WHERE id = ?', [2, 'revision-1']), 'immutable revision update was accepted');
    await expectRejected(() => connection.run('DELETE FROM food_revisions WHERE id = ?', ['revision-1']), 'immutable revision delete was accepted');
  }));
  results.push(await runDisposableCase('checksum-mismatch', async (connection) => {
    await initializeDatabase(connection, '1.0.0');
    await connection.run('UPDATE schema_migrations SET checksum = ? WHERE version = ?', ['0'.repeat(64), 1]);
    let rejected = false;
    try { await initializeDatabase(connection, '1.0.0'); } catch { rejected = true; }
    if (!rejected) throw new Error('checksum mismatch was accepted');
  }));
  results.push(await runDisposableCase('injected-migration-rollback', async (connection) => {
    const failing: MigrationDefinition = { version: 2, name: 'injected-failure', checksum: 'f'.repeat(64), statements: ['CREATE TABLE injected_failure (id INTEGER)', 'THIS IS INVALID SQL'] };
    let rejected = false;
    try { await initializeDatabase(connection, '1.0.0', [...phaseTwoMigrations, failing]); } catch { rejected = true; }
    if (!rejected || await connection.first<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'schema_migrations'") !== null) throw new Error('failed migration was not rolled back');
  }));
  results.push(await runDisposableCase('inconsistent-user-version-ledger', async (connection) => {
    await connection.exec('PRAGMA user_version = 1');
    await expectRejected(() => initializeDatabase(connection, '1.0.0'), 'missing migration ledger was accepted');
  }));
  results.push(await runDisposableCase('numeric-sql-constraint-boundary', async (connection) => {
    await initializeDatabase(connection, '1.0.0');
    await expectRejected(() => connection.withExclusiveTransaction(async (transaction) => {
      await transaction.run('INSERT INTO foods (id, canonical_name, normalized_name, origin, current_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ['food-limit', 'Limit food', 'limit food', 'user', 'revision-limit', now, now]);
      await transaction.run('INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['revision-limit', 'food-limit', 1, null, 1_000_000, 'gram', Number.MAX_SAFE_INTEGER + 1, 0, 0, 0, null, null, null, 0, now]);
    }), 'unsafe numeric value was accepted');
  }));
  results.push(await runDisposableCase('unique-constraint-rejection', async (connection) => {
    await initializeDatabase(connection, '1.0.0'); await insertFoodWithRevision(connection);
    await expectRejected(() => connection.run('INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['revision-duplicate', 'food-1', 1, null, 1_000_000, 'gram', 1, 0, 0, 0, null, null, null, 0, now]), 'duplicate revision was accepted');
  }));
  results.push(await runDisposableCase('returned-pragma-results', async (connection) => {
    await initializeDatabase(connection, '1.0.0');
    const foreignKeyRows = await connection.all<Record<string, unknown>>('PRAGMA foreign_key_check');
    const quickCheck = await connection.first<Record<string, unknown>>('PRAGMA quick_check(1)');
    if (foreignKeyRows.length !== 0 || Object.values(quickCheck ?? {})[0] !== 'ok') throw new Error('returned PRAGMA result was invalid');
  }));
  results.push(await runDisposableCase('exclusive-concurrent-writes', async (connection) => {
    await initializeDatabase(connection, '1.0.0');
    await connection.exec('CREATE TABLE verification_writes (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    const writes = await Promise.allSettled([
      connection.withExclusiveTransaction((transaction) => transaction.run('INSERT INTO verification_writes (id, value) VALUES (?, ?)', [1, 'one'])),
      connection.withExclusiveTransaction((transaction) => transaction.run('INSERT INTO verification_writes (id, value) VALUES (?, ?)', [2, 'two'])),
    ]);
    const rows = await connection.all<{ id: number }>('SELECT id FROM verification_writes ORDER BY id');
    verifyConcurrentWriteOutcome(writes, rows.map((row) => row.id));
  }));
  return results;
}

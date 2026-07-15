import type { DatabaseExecutor, DatabaseMutationResult } from '@/core/database/contracts';
import { appMigrations, type MigrationDefinition } from '@/core/database/migrations';
import { StaleReviewConflict } from '@/core/domain/manual-logging';
import type { MealDetail, PersistedItem, RequiredTotals } from '@/core/application/manual-logging-ports';
import { ManualLoggingUseCases } from '@/core/application/manual-logging-use-cases';
import type { Clock, IdGenerator } from '@/core/application/runtime-ports';
import {
  DISPOSABLE_PHASE_THREE_DATABASE,
  openExpoDatabase,
  resetDisposableDevelopmentDatabase,
} from '@/data/sqlite/expo-sqlite-database';
import { initializeDatabase } from '@/data/sqlite/migration-runner';
import { SqliteManualLoggingRepository } from '@/data/sqlite/manual-logging-repository';
import { migrationOneFixture } from './migration-one-fixture';

export type ManualLoggingVerificationResult = Readonly<{ id: string; passed: boolean; category?: string }>;
export const MANUAL_LOGGING_VERIFICATION_CASE_IDS = [
  'migration-001-upgrade',
  'migration-002-rollback',
  'meal-create-and-integrity',
  'meal-transaction-rollback',
  'goal-and-today-queries',
] as const;

type CaseId = typeof MANUAL_LOGGING_VERIFICATION_CASE_IDS[number];
type VerificationConnection = Awaited<ReturnType<typeof openExpoDatabase>>;
type CountTable = 'meals' | 'meal_items';

const MIGRATION_TWO_APPLIED_AT = '2026-07-16T00:00:00.000Z';

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireEqual(actual: unknown, expected: unknown, message: string): void {
  requireCondition(actual === expected, message);
}

function requireRecord(
  actual: Readonly<Record<string, unknown>> | null,
  expected: Readonly<Record<string, unknown>>,
  message: string,
): void {
  requireCondition(actual !== null, message);
  for (const [key, value] of Object.entries(expected)) requireEqual(actual[key], value, message);
}

function requireTotals(actual: RequiredTotals, expected: RequiredTotals, message: string): void {
  requireEqual(actual.caloriesKcalScaled, expected.caloriesKcalScaled, message);
  requireEqual(actual.proteinGScaled, expected.proteinGScaled, message);
  requireEqual(actual.carbohydratesGScaled, expected.carbohydratesGScaled, message);
  requireEqual(actual.fatGScaled, expected.fatGScaled, message);
}

function migrationOne(): MigrationDefinition {
  const migration = appMigrations[0];
  if (migration === undefined) throw new Error('published migration one missing');
  return migration;
}

function migrationTwo(): MigrationDefinition {
  const migration = appMigrations[1];
  if (migration === undefined) throw new Error('manual logging migration missing');
  return migration;
}

function verificationId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function category(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown';
  if (/migration|checksum|ledger/i.test(error.message)) return 'migration';
  if (/foreign|integrity|quick/i.test(error.message)) return 'integrity';
  if (/fixed|overflow/i.test(error.message)) return 'numeric';
  return 'database';
}

async function requireIntegrity(connection: VerificationConnection): Promise<void> {
  const foreignKeys = await connection.all<Record<string, unknown>>('PRAGMA foreign_key_check');
  requireCondition(foreignKeys.length === 0, 'foreign-key integrity failed');
  const quickCheck = await connection.first<Record<string, unknown>>('PRAGMA quick_check(1)');
  requireCondition(quickCheck !== null && Object.values(quickCheck)[0] === 'ok', 'quick integrity check failed');
}

async function withPhaseThreeDatabase(operation: (connection: VerificationConnection) => Promise<void>): Promise<void> {
  const connection = await openExpoDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  try {
    await initializeDatabase(connection, '1.0.0', appMigrations);
    await operation(connection);
    await requireIntegrity(connection);
  } finally {
    await connection.close();
  }
}

async function seedMigrationOneFixture(connection: VerificationConnection): Promise<void> {
  await connection.withExclusiveTransaction(async (transaction) => {
    const { food, ledger } = migrationOneFixture;
    const { revision, portion } = food;
    await transaction.run(
      'INSERT INTO foods (id, canonical_name, normalized_name, origin, current_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [food.id, food.canonicalName, food.normalizedName, 'user', revision.id, ledger.appliedAt, ledger.appliedAt],
    );
    await transaction.run(
      'INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [revision.id, food.id, revision.revisionNumber, null, revision.basisQuantityScaled, revision.basisUnit, revision.caloriesKcalScaled, revision.proteinGScaled, revision.carbohydratesGScaled, revision.fatGScaled, null, null, null, 1, ledger.appliedAt],
    );
    await transaction.run(
      'INSERT INTO food_portions (id, food_id, label, normalized_label, quantity_scaled, equivalent_quantity_scaled, equivalent_unit, source_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [portion.id, food.id, portion.label, portion.normalizedLabel, portion.quantityScaled, portion.equivalentQuantityScaled, portion.equivalentUnit, null, ledger.appliedAt],
    );
  });
}

async function requireFixtureRows(connection: VerificationConnection): Promise<void> {
  const { food, ledger } = migrationOneFixture;
  const { revision, portion } = food;
  const foodRow = await connection.first<Record<string, unknown>>(
    'SELECT id, canonical_name, normalized_name, origin, current_revision_id, archived_at, created_at, updated_at FROM foods WHERE id = ?',
    [food.id],
  );
  requireRecord(foodRow, {
    id: food.id,
    canonical_name: food.canonicalName,
    normalized_name: food.normalizedName,
    origin: 'user',
    current_revision_id: revision.id,
    archived_at: null,
    created_at: ledger.appliedAt,
    updated_at: ledger.appliedAt,
  }, 'migration fixture food changed');

  const revisionRow = await connection.first<Record<string, unknown>>(
    'SELECT id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at FROM food_revisions WHERE id = ?',
    [revision.id],
  );
  requireRecord(revisionRow, {
    id: revision.id,
    food_id: food.id,
    revision_number: revision.revisionNumber,
    source_id: null,
    basis_quantity_scaled: revision.basisQuantityScaled,
    basis_unit: revision.basisUnit,
    calories_kcal_scaled: revision.caloriesKcalScaled,
    protein_g_scaled: revision.proteinGScaled,
    carbohydrates_g_scaled: revision.carbohydratesGScaled,
    fat_g_scaled: revision.fatGScaled,
    fibre_g_scaled: null,
    sugar_g_scaled: null,
    sodium_mg_scaled: null,
    user_modified: 1,
    created_at: ledger.appliedAt,
  }, 'migration fixture revision changed');

  const portionRow = await connection.first<Record<string, unknown>>(
    'SELECT id, food_id, label, normalized_label, quantity_scaled, equivalent_quantity_scaled, equivalent_unit, source_id, created_at FROM food_portions WHERE id = ?',
    [portion.id],
  );
  requireRecord(portionRow, {
    id: portion.id,
    food_id: food.id,
    label: portion.label,
    normalized_label: portion.normalizedLabel,
    quantity_scaled: portion.quantityScaled,
    equivalent_quantity_scaled: portion.equivalentQuantityScaled,
    equivalent_unit: portion.equivalentUnit,
    source_id: null,
    created_at: ledger.appliedAt,
  }, 'migration fixture portion changed');
}

async function requireMigrationState(connection: VerificationConnection, expectedVersion: 1 | 2): Promise<void> {
  const version = await connection.first<{ user_version: number }>('PRAGMA user_version');
  requireEqual(version?.user_version, expectedVersion, 'migration user version changed');
  const ledger = await connection.all<Record<string, unknown>>(
    'SELECT version, name, checksum, applied_at, app_version FROM schema_migrations ORDER BY version ASC',
  );
  const expected: Record<string, unknown>[] = [{
    version: migrationOneFixture.migration.version,
    name: migrationOneFixture.migration.name,
    checksum: migrationOneFixture.migration.checksum,
    applied_at: migrationOneFixture.ledger.appliedAt,
    app_version: migrationOneFixture.ledger.appVersion,
  }];
  if (expectedVersion === 2) {
    const second = migrationTwo();
    expected.push({
      version: second.version,
      name: second.name,
      checksum: second.checksum,
      applied_at: MIGRATION_TWO_APPLIED_AT,
      app_version: migrationOneFixture.ledger.appVersion,
    });
  }
  requireEqual(ledger.length, expected.length, 'migration ledger length changed');
  ledger.forEach((row, index) => requireRecord(row, expected[index] ?? {}, 'migration ledger changed'));
  await requireFixtureRows(connection);
}

async function bootstrapMigrationOneFixture(): Promise<void> {
  const connection = await openExpoDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  try {
    await initializeDatabase(connection, migrationOneFixture.ledger.appVersion, [migrationOne()], () => migrationOneFixture.ledger.appliedAt);
    await seedMigrationOneFixture(connection);
    await requireMigrationState(connection, 1);
    await requireIntegrity(connection);
  } finally {
    await connection.close();
  }
}

async function migrationOneUpgrade(): Promise<void> {
  await bootstrapMigrationOneFixture();
  let connection = await openExpoDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  try {
    await initializeDatabase(connection, migrationOneFixture.ledger.appVersion, appMigrations, () => MIGRATION_TWO_APPLIED_AT);
    await requireMigrationState(connection, 2);
    await requireIntegrity(connection);
  } finally {
    await connection.close();
  }

  connection = await openExpoDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  try {
    await initializeDatabase(connection, migrationOneFixture.ledger.appVersion, appMigrations, () => '2026-07-16T01:00:00.000Z');
    await requireMigrationState(connection, 2);
    await requireIntegrity(connection);
  } finally {
    await connection.close();
  }
}

async function migrationTwoRollback(): Promise<void> {
  await bootstrapMigrationOneFixture();
  const connection = await openExpoDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  try {
    const failing: MigrationDefinition = {
      version: 2,
      name: 'verification-failing-migration',
      checksum: 'f'.repeat(64),
      statements: ['CREATE TABLE verification_partial_schema (id INTEGER)', "SELECT RAISE(ABORT, 'verification failure')"],
    };
    let failed = false;
    try {
      await initializeDatabase(connection, migrationOneFixture.ledger.appVersion, [migrationOne(), failing], () => MIGRATION_TWO_APPLIED_AT);
    } catch {
      failed = true;
    }
    requireCondition(failed, 'rollback was not triggered');
    await requireMigrationState(connection, 1);
    const partial = await connection.first<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'verification_partial_schema'",
    );
    requireEqual(partial, null, 'partial migration schema remained');
    await requireIntegrity(connection);

    await initializeDatabase(connection, migrationOneFixture.ledger.appVersion, appMigrations, () => MIGRATION_TWO_APPLIED_AT);
    await requireMigrationState(connection, 2);
    await requireIntegrity(connection);
  } finally {
    await connection.close();
  }
}

class VerificationIds implements IdGenerator {
  public constructor(private index = 1) {}
  public next(): string { return verificationId(this.index++); }
}

class VerificationClock implements Clock {
  private tick = 0;
  public constructor(private readonly date = '2026-07-16') {}
  public utcNow(): string { return `2026-07-16T00:00:${String(this.tick++).padStart(2, '0')}.000Z`; }
  public localDate(): string { return this.date; }
  public timezoneOffsetMinutes(): number { return 330; }
}

const manualFood = {
  name: 'Verification food',
  basisQuantityScaled: 100,
  basisUnit: 'gram' as const,
  nutrients: {
    caloriesKcalScaled: 1,
    proteinGScaled: 1,
    carbohydratesGScaled: 1,
    fatGScaled: 1,
    fibreGScaled: null,
    sugarGScaled: null,
    sodiumMgScaled: null,
  },
  userModified: true,
  source: { provider: null, recordId: null, datasetVersion: null, licenseId: null, valuesHash: null },
};

class FaultingMealItemRepository extends SqliteManualLoggingRepository {
  private inserts = 0;
  public readonly insertedItemIds: string[] = [];
  public constructor(private readonly failOnInsert: number) { super(); }
  public override async insertMealItem(
    transaction: DatabaseExecutor,
    mealId: string,
    item: PersistedItem,
    now: string,
  ): Promise<DatabaseMutationResult> {
    const result = await super.insertMealItem(transaction, mealId, item, now);
    this.inserts += 1;
    this.insertedItemIds.push(item.id);
    if (this.inserts === this.failOnInsert) throw new Error('injected meal-item failure');
    return result;
  }
}

async function createVerificationFood(
  connection: VerificationConnection,
  ids = new VerificationIds(),
  clock = new VerificationClock(),
): Promise<Readonly<{
  useCases: ManualLoggingUseCases;
  repository: SqliteManualLoggingRepository;
  foodId: string;
  revisionId: string;
}>> {
  const repository = new SqliteManualLoggingRepository();
  const useCases = new ManualLoggingUseCases(connection, repository, repository, ids, clock);
  const foodId = await useCases.createManualFood(manualFood);
  const state = await repository.loadFoodState(connection, foodId);
  requireCondition(state !== null, 'verification food missing');
  return { useCases, repository, foodId, revisionId: state.currentRevisionId };
}

function command(
  foodId: string,
  revisionId: string,
  occurredAtUtc = '2026-07-16T12:00:00.000Z',
  localDate = '2026-07-16',
) {
  return {
    category: 'lunch' as const,
    occurredAtUtc,
    localDate,
    timezoneOffsetMinutes: 330,
    items: [
      { foodId, foodRevisionId: revisionId, portionId: null, inputName: 'Verification food', inputQuantityScaled: 50, inputUnit: 'gram', resolutionMethod: 'manual' as const },
      { foodId, foodRevisionId: revisionId, portionId: null, inputName: 'Verification food', inputQuantityScaled: 100, inputUnit: 'gram', resolutionMethod: 'manual' as const },
    ],
  } as const;
}

async function readCount(connection: VerificationConnection, table: CountTable): Promise<number> {
  const row = await connection.first<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  requireCondition(row !== null && Number.isSafeInteger(row.count) && row.count >= 0, 'database count is invalid');
  return row.count;
}

async function expectRejected(operation: () => Promise<unknown>, message: string): Promise<void> {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  requireCondition(rejected, message);
}

const constraintProbeSql = 'INSERT INTO meal_items (id, meal_id, position, food_id, food_revision_id, input_name, input_quantity_scaled, input_unit, resolved_quantity_scaled, resolved_unit, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, resolution_method, source_provider, source_record_id, source_dataset_version, source_license_id, source_values_hash, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

async function insertConstraintProbe(
  connection: VerificationConnection,
  id: string,
  mealId: string,
  foodId: string | null,
  revisionId: string | null,
): Promise<void> {
  await connection.withExclusiveTransaction(async (transaction) => {
    await transaction.run(constraintProbeSql, [
      id,
      mealId,
      90,
      foodId,
      revisionId,
      'Integrity probe',
      1,
      'gram',
      1,
      'gram',
      100,
      'gram',
      0,
      0,
      0,
      0,
      null,
      null,
      null,
      'manual',
      null,
      null,
      null,
      null,
      null,
      1,
      '2026-07-16T00:00:30.000Z',
    ]);
  });
}

function requireMealSnapshot(detail: MealDetail, mealId: string, foodId: string, revisionId: string): void {
  requireEqual(detail.header.id, mealId, 'meal header ID changed');
  requireEqual(detail.header.category, 'lunch', 'meal category changed');
  requireEqual(detail.header.occurredAtUtc, '2026-07-16T12:00:00.000Z', 'meal occurrence changed');
  requireEqual(detail.header.localDate, '2026-07-16', 'meal saved date changed');
  requireEqual(detail.header.timezoneOffsetMinutes, 330, 'meal offset changed');
  requireEqual(detail.header.createdAt, '2026-07-16T00:00:01.000Z', 'meal created timestamp changed');
  requireEqual(detail.header.updatedAt, '2026-07-16T00:00:01.000Z', 'meal updated timestamp changed');
  requireTotals(detail.header.totals, { caloriesKcalScaled: 2, proteinGScaled: 2, carbohydratesGScaled: 2, fatGScaled: 2 }, 'meal header totals changed');
  requireEqual(detail.items.length, 2, 'meal item count changed');

  detail.items.forEach((item, position) => {
    const expectedQuantity = position === 0 ? 50 : 100;
    requireEqual(item.id, verificationId(position + 4), 'meal item ID changed');
    requireEqual(item.mealId, mealId, 'meal item ownership changed');
    requireEqual(item.position, position, 'meal item position changed');
    requireEqual(item.foodId, foodId, 'meal item food changed');
    requireEqual(item.foodRevisionId, revisionId, 'meal item revision changed');
    requireEqual(item.inputName, manualFood.name, 'meal item name changed');
    requireEqual(item.inputQuantityScaled, expectedQuantity, 'meal item input quantity changed');
    requireEqual(item.inputUnit, 'gram', 'meal item input unit changed');
    requireEqual(item.resolvedQuantityScaled, expectedQuantity, 'meal item resolved quantity changed');
    requireEqual(item.resolvedUnit, 'gram', 'meal item resolved unit changed');
    requireEqual(item.basisQuantityScaled, manualFood.basisQuantityScaled, 'meal item basis quantity changed');
    requireEqual(item.basisUnit, manualFood.basisUnit, 'meal item basis unit changed');
    requireTotals(item.nutrients, { caloriesKcalScaled: 1, proteinGScaled: 1, carbohydratesGScaled: 1, fatGScaled: 1 }, 'meal item totals changed');
    requireEqual(item.nutrients.fibreGScaled, null, 'meal item fibre changed');
    requireEqual(item.nutrients.sugarGScaled, null, 'meal item sugar changed');
    requireEqual(item.nutrients.sodiumMgScaled, null, 'meal item sodium changed');
    requireEqual(item.resolutionMethod, 'manual', 'meal item resolution changed');
    requireEqual(item.source.provider, null, 'meal item provider changed');
    requireEqual(item.source.recordId, null, 'meal item source record changed');
    requireEqual(item.source.datasetVersion, null, 'meal item dataset changed');
    requireEqual(item.source.licenseId, null, 'meal item license changed');
    requireEqual(item.source.valuesHash, null, 'meal item source hash changed');
    requireEqual(item.userModified, true, 'meal item modification state changed');
    requireEqual(item.createdAt, '2026-07-16T00:00:01.000Z', 'meal item timestamp changed');
  });
}

async function mealCreateAndIntegrity(connection: VerificationConnection): Promise<void> {
  const { useCases, repository, foodId, revisionId } = await createVerificationFood(connection);
  const mealId = await useCases.createMeal(command(foodId, revisionId));
  requireEqual(mealId, verificationId(3), 'meal ID changed');
  const detail = await useCases.mealDetail(mealId);
  requireMealSnapshot(detail, mealId, foodId, revisionId);
  requireTotals(
    await repository.sumPersistedMeal(connection, mealId),
    detail.header.totals,
    'persisted aggregate differs from meal header',
  );

  const secondFood = await createVerificationFood(connection, new VerificationIds(1_000), new VerificationClock());
  await expectRejected(
    () => insertConstraintProbe(connection, 'probe-cross-food', mealId, foodId, secondFood.revisionId),
    'cross-food revision ownership was accepted',
  );
  await expectRejected(
    () => insertConstraintProbe(connection, 'probe-missing-revision', mealId, foodId, null),
    'food without revision was accepted',
  );
  await expectRejected(
    () => insertConstraintProbe(connection, 'probe-missing-food', mealId, null, revisionId),
    'revision without food was accepted',
  );
  const probeRows = await connection.first<{ count: number }>(
    "SELECT COUNT(*) AS count FROM meal_items WHERE id IN ('probe-cross-food', 'probe-missing-revision', 'probe-missing-food')",
  );
  requireEqual(probeRows?.count, 0, 'rejected integrity probe was persisted');

  await useCases.appendFoodRevision(foodId, revisionId, manualFood);
  const mealsBeforeStale = await readCount(connection, 'meals');
  const itemsBeforeStale = await readCount(connection, 'meal_items');
  let staleConflict = false;
  try {
    await useCases.createMeal(command(foodId, revisionId, '2026-07-16T13:00:00.000Z'));
  } catch (error) {
    if (!(error instanceof StaleReviewConflict)) throw error;
    staleConflict = true;
  }
  requireCondition(staleConflict, 'stale review was accepted');
  requireEqual(await readCount(connection, 'meals'), mealsBeforeStale, 'stale save changed meal count');
  requireEqual(await readCount(connection, 'meal_items'), itemsBeforeStale, 'stale save changed item count');
}

async function mealTransactionRollback(connection: VerificationConnection): Promise<void> {
  const { useCases, foodId, revisionId } = await createVerificationFood(connection);
  const mealsBeforeCreate = await readCount(connection, 'meals');
  const itemsBeforeCreate = await readCount(connection, 'meal_items');
  const faultingCreate = new FaultingMealItemRepository(2);
  const createWithFault = new ManualLoggingUseCases(
    connection,
    faultingCreate,
    faultingCreate,
    new VerificationIds(100),
    new VerificationClock(),
  );
  let creationFailed = false;
  try {
    await createWithFault.createMeal(command(foodId, revisionId));
  } catch (error) {
    creationFailed = error instanceof Error && error.message === 'injected meal-item failure';
  }
  requireCondition(creationFailed, 'meal create fault did not occur');
  requireEqual(faultingCreate.insertedItemIds.join(','), [verificationId(101), verificationId(102)].join(','), 'meal create fault sequence changed');
  requireEqual(await readCount(connection, 'meals'), mealsBeforeCreate, 'failed creation left a meal');
  requireEqual(await readCount(connection, 'meal_items'), itemsBeforeCreate, 'failed creation left meal items');

  const mealId = await useCases.createMeal(command(foodId, revisionId));
  const before = await useCases.mealDetail(mealId);
  const faultingEdit = new FaultingMealItemRepository(2);
  const editWithFault = new ManualLoggingUseCases(
    connection,
    faultingEdit,
    faultingEdit,
    new VerificationIds(200),
    new VerificationClock(),
  );
  let editFailed = false;
  try {
    await editWithFault.editMeal(mealId, command(foodId, revisionId, '2026-07-16T14:00:00.000Z'));
  } catch (error) {
    editFailed = error instanceof Error && error.message === 'injected meal-item failure';
  }
  requireCondition(editFailed, 'meal edit fault did not occur');
  requireEqual(faultingEdit.insertedItemIds.join(','), [verificationId(200), verificationId(201)].join(','), 'meal edit fault sequence changed');
  requireCondition(before.items.every((item) => !faultingEdit.insertedItemIds.includes(item.id)), 'faulted edit reused persisted item IDs');
  const after = await useCases.mealDetail(mealId);
  requireEqual(JSON.stringify(after), JSON.stringify(before), 'meal edit rollback changed the saved snapshot');
  requireEqual(await readCount(connection, 'meals'), 1, 'meal edit rollback changed parent count');
  requireEqual(await readCount(connection, 'meal_items'), 2, 'meal edit rollback changed child count');
}

async function goalAndTodayQueries(connection: VerificationConnection): Promise<void> {
  const { useCases, repository, foodId, revisionId } = await createVerificationFood(connection);
  const firstTargets = { caloriesKcalScaled: 100, proteinGScaled: 1, carbohydratesGScaled: 2, fatGScaled: 3 };
  const replacementTargets = { caloriesKcalScaled: 200, proteinGScaled: 2, carbohydratesGScaled: 3, fatGScaled: 4 };
  const firstGoalId = await useCases.saveTodayGoal(firstTargets);
  const firstGoal = await repository.findGoal(connection, '2026-07-16');
  requireCondition(firstGoal !== null, 'first goal was not saved');
  requireEqual(firstGoal.id, firstGoalId, 'first goal ID changed');
  requireTotals(firstGoal.totals, firstTargets, 'first goal totals changed');

  const replacedGoalId = await useCases.saveTodayGoal(replacementTargets);
  const replacedGoal = await repository.findGoal(connection, '2026-07-16');
  requireCondition(replacedGoal !== null, 'same-date goal replacement is missing');
  requireEqual(replacedGoalId, firstGoalId, 'same-date goal replacement changed ID');
  requireEqual(replacedGoal.id, firstGoal.id, 'same-date goal row changed ID');
  requireEqual(replacedGoal.createdAt, firstGoal.createdAt, 'same-date goal replacement changed created timestamp');
  requireCondition(replacedGoal.updatedAt !== firstGoal.updatedAt, 'same-date goal replacement did not advance updated timestamp');
  requireTotals(replacedGoal.totals, replacementTargets, 'same-date goal replacement totals changed');

  const earlierGoals = new ManualLoggingUseCases(
    connection,
    repository,
    repository,
    new VerificationIds(500),
    new VerificationClock('2026-07-10'),
  );
  const laterGoals = new ManualLoggingUseCases(
    connection,
    repository,
    repository,
    new VerificationIds(600),
    new VerificationClock('2026-07-20'),
  );
  const earlierGoalId = await earlierGoals.saveTodayGoal({ caloriesKcalScaled: 150, proteinGScaled: 5, carbohydratesGScaled: 6, fatGScaled: 7 });
  const laterGoalId = await laterGoals.saveTodayGoal({ caloriesKcalScaled: 250, proteinGScaled: 8, carbohydratesGScaled: 9, fatGScaled: 10 });
  requireEqual(await useCases.applicableGoal('2026-07-09'), null, 'date before earliest goal did not return no-goal');
  requireEqual((await useCases.applicableGoal('2026-07-12'))?.id, earlierGoalId, 'earlier applicable goal selection failed');
  requireEqual((await useCases.applicableGoal('2026-07-16'))?.id, firstGoalId, 'exact-date goal selection failed');
  requireEqual((await useCases.applicableGoal('2026-07-18'))?.id, firstGoalId, 'between-date goal selection failed');
  requireEqual((await useCases.applicableGoal('2026-07-20'))?.id, laterGoalId, 'later exact-date goal selection failed');

  const adjacentUtcMeal = await useCases.createMeal(command(foodId, revisionId, '2026-07-15T23:30:00.000Z', '2026-07-16'));
  const tiedMealOne = await useCases.createMeal(command(foodId, revisionId, '2026-07-16T12:00:00.000Z', '2026-07-16'));
  const tiedMealTwo = await useCases.createMeal(command(foodId, revisionId, '2026-07-16T12:00:00.000Z', '2026-07-16'));
  const latestMeal = await useCases.createMeal(command(foodId, revisionId, '2026-07-16T18:00:00.000Z', '2026-07-16'));
  const excludedMeal = await useCases.createMeal(command(foodId, revisionId, '2026-07-16T09:00:00.000Z', '2026-07-15'));
  const today = await useCases.today('2026-07-16');
  requireEqual(today.meals.map((meal) => meal.id).join(','), [latestMeal, tiedMealOne, tiedMealTwo, adjacentUtcMeal].join(','), 'Today ordering or saved-date grouping failed');
  requireCondition(!today.meals.some((meal) => meal.id === excludedMeal), 'Today included a meal from another saved date');
  requireCondition(today.meals.every((meal) => meal.localDate === '2026-07-16'), 'Today returned another saved date');
  requireTotals(today.totals, { caloriesKcalScaled: 8, proteinGScaled: 8, carbohydratesGScaled: 8, fatGScaled: 8 }, 'Today totals changed');
}

const operations: Readonly<Record<CaseId, () => Promise<void>>> = {
  'migration-001-upgrade': migrationOneUpgrade,
  'migration-002-rollback': migrationTwoRollback,
  'meal-create-and-integrity': async () => withPhaseThreeDatabase(mealCreateAndIntegrity),
  'meal-transaction-rollback': async () => withPhaseThreeDatabase(mealTransactionRollback),
  'goal-and-today-queries': async () => withPhaseThreeDatabase(goalAndTodayQueries),
};

async function runCase(id: CaseId): Promise<ManualLoggingVerificationResult> {
  let result: ManualLoggingVerificationResult;
  try {
    await resetDisposableDevelopmentDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
    await operations[id]();
    result = { id, passed: true };
  } catch (error) {
    result = { id, passed: false, category: category(error) };
  }
  try {
    await resetDisposableDevelopmentDatabase(DISPOSABLE_PHASE_THREE_DATABASE);
  } catch {
    return { id, passed: false, category: 'cleanup' };
  }
  return result;
}

export async function runManualLoggingVerification(): Promise<readonly ManualLoggingVerificationResult[]> {
  const results: ManualLoggingVerificationResult[] = [];
  for (const id of MANUAL_LOGGING_VERIFICATION_CASE_IDS) results.push(await runCase(id));
  return results;
}

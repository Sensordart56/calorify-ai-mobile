import type { DatabaseExecutor, DatabaseMutationResult, SqlValue } from '@/core/database/contracts';
import { RepositoryIntegrityError, SqliteManualLoggingRepository } from './manual-logging-repository';

type Call = Readonly<{ kind: 'run' | 'first' | 'all'; sql: string; params: readonly SqlValue[] }>;
class RecordingExecutor implements DatabaseExecutor {
  public readonly calls: Call[] = [];
  public firstValue: object | null = null;
  public allValue: readonly object[] = [];
  public mutation: DatabaseMutationResult = { changes: 1 };
  public async exec(): Promise<void> { return undefined; }
  public async run(sql: string, params: readonly SqlValue[]): Promise<DatabaseMutationResult> { this.calls.push({ kind: 'run', sql, params }); return this.mutation; }
  public async first<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> { this.calls.push({ kind: 'first', sql, params }); return this.firstValue as Row | null; }
  public async all<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<readonly Row[]> { this.calls.push({ kind: 'all', sql, params }); return this.allValue as readonly Row[]; }
}

const header = { id: 'meal-1', category: 'lunch', occurred_at_utc: '2026-07-15T12:00:00.000Z', local_date: '2026-07-15', timezone_offset_minutes: 330, calories_kcal_scaled: 100, protein_g_scaled: 20, carbohydrates_g_scaled: 30, fat_g_scaled: 40, created_at: '2026-07-15T12:00:00.000Z', updated_at: '2026-07-15T12:00:00.000Z' };
const item = { id: 'item-1', meal_id: 'meal-1', position: 0, food_id: 'food-1', food_revision_id: 'revision-1', input_name: 'O\'Brien meal', input_quantity_scaled: 100, input_unit: 'gram', resolved_quantity_scaled: 100, resolved_unit: 'gram', basis_quantity_scaled: 100, basis_unit: 'gram', calories_kcal_scaled: 100, protein_g_scaled: 20, carbohydrates_g_scaled: 30, fat_g_scaled: 40, fibre_g_scaled: null, sugar_g_scaled: null, sodium_mg_scaled: null, resolution_method: 'manual', source_provider: null, source_record_id: null, source_dataset_version: null, source_license_id: null, source_values_hash: null, user_modified: 0, created_at: '2026-07-15T12:00:00.000Z' };

describe('manual logging SQLite repository', () => {
  const executor = new RecordingExecutor();
  const repository = new SqliteManualLoggingRepository();
  beforeEach(() => { executor.calls.splice(0); executor.firstValue = null; executor.allValue = []; executor.mutation = { changes: 1 }; });

  test('binds food and portion values rather than interpolating them', async () => {
    const value = "food-' OR 1=1 --";
    await repository.loadCurrentRevision(executor, value, 'revision-1');
    await repository.deletePortion(executor, value);
    for (const call of executor.calls) { expect(call.sql).not.toContain(value); expect(call.params).toContain(value); }
  });

  test('maps a reviewed revision and rejects malformed booleans', async () => {
    executor.firstValue = { id: 'revision-1', food_id: 'food-1', revision_number: 1, basis_quantity_scaled: 100, basis_unit: 'gram', calories_kcal_scaled: 1, protein_g_scaled: 2, carbohydrates_g_scaled: 3, fat_g_scaled: 4, fibre_g_scaled: null, sugar_g_scaled: null, sodium_mg_scaled: null, user_modified: 1, provider: null, provider_record_id: null, dataset_version: null, license_id: null, payload_hash: null };
    await expect(repository.loadCurrentRevision(executor, 'food-1', 'revision-1')).resolves.toMatchObject({ userModified: true, nutrients: { fibreGScaled: null } });
    executor.firstValue = { ...executor.firstValue, user_modified: 2 };
    await expect(repository.loadCurrentRevision(executor, 'food-1', 'revision-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
  });

  test('maps food state, portion, and exact/applicable goals', async () => {
    executor.firstValue = { id: 'food-1', canonical_name: 'Rice', normalized_name: 'rice', current_revision_id: 'revision-1', archived_at: null, created_at: '2026-07-15T12:00:00.000Z', updated_at: '2026-07-15T12:00:00.000Z' };
    await expect(repository.loadFoodState(executor, 'food-1')).resolves.toMatchObject({ archivedAt: null, currentRevisionId: 'revision-1' });
    executor.firstValue = { id: 'portion-1', food_id: 'food-1', label: 'Cup', normalized_label: 'cup', quantity_scaled: 1, equivalent_quantity_scaled: 240, equivalent_unit: 'millilitre' };
    await expect(repository.loadPortion(executor, 'portion-1')).resolves.toMatchObject({ equivalentUnit: 'millilitre' });
    executor.firstValue = { ...header, id: 'goal-1', effective_local_date: '2026-07-01' };
    await repository.findGoal(executor, '2026-07-01');
    await repository.findApplicableGoal(executor, '2026-07-15');
    expect(executor.calls.at(-1)).toMatchObject({ params: ['2026-07-15'] });
    expect(executor.calls.at(-1)?.sql).toContain('effective_local_date <= ?');
  });

  test('propagates mutation counts and binds the full meal insert', async () => {
    executor.mutation = { changes: 0 };
    const result = await repository.insertMeal(executor, { id: 'meal-1', command: { category: 'lunch', occurredAtUtc: '2026-07-15T12:00:00.000Z', localDate: '2026-07-15', timezoneOffsetMinutes: 330, items: [] }, totals: { caloriesKcalScaled: 1, proteinGScaled: 2, carbohydratesGScaled: 3, fatGScaled: 4 }, now: '2026-07-15T12:00:00.000Z' });
    expect(result).toEqual({ changes: 0 });
    expect(executor.calls[0]?.params).toContain('meal-1');
    expect(executor.calls[0]?.sql).not.toContain('meal-1');
  });

  test('uses saved local date and stable ordering for Today', async () => {
    executor.allValue = [header];
    const today = await repository.listToday(executor, '2026-07-15');
    expect(today.totals).toEqual({ caloriesKcalScaled: 100, proteinGScaled: 20, carbohydratesGScaled: 30, fatGScaled: 40 });
    expect(executor.calls[0]).toMatchObject({ params: ['2026-07-15'] });
    expect(executor.calls[0]?.sql).toContain('local_date = ? ORDER BY occurred_at_utc DESC, id ASC');
  });

  test('rejects invalid date inputs, overflow, malformed aggregate values, and source hashes', async () => {
    await expect(repository.listToday(executor, 'not-a-date')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    await expect(repository.findGoal(executor, '2026-02-30')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    executor.allValue = [{ ...header, calories_kcal_scaled: Number.MAX_SAFE_INTEGER }, { ...header, id: 'meal-2', calories_kcal_scaled: 1 }];
    await expect(repository.listToday(executor, '2026-07-15')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    executor.firstValue = { calories: 1.5, protein: 2, carbohydrates: 3, fat: 4 };
    await expect(repository.sumPersistedMeal(executor, 'meal-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    executor.firstValue = header;
    executor.allValue = [{ ...item, source_values_hash: 'ABC' }];
    await expect(repository.loadMealDetail(executor, 'meal-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    executor.allValue = [{ ...item, food_revision_id: null }];
    await expect(repository.loadMealDetail(executor, 'meal-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
  });

  test('uses keyset history and rejects an invalid page size or cursor', async () => {
    executor.allValue = [header, { ...header, id: 'meal-2' }];
    await expect(repository.listHistory(executor, 1, { occurredAtUtc: header.occurred_at_utc, id: 'meal-0' })).resolves.toMatchObject({ nextCursor: { id: 'meal-1' } });
    expect(executor.calls[0]?.params).toEqual([header.occurred_at_utc, header.occurred_at_utc, 'meal-0', 2]);
    expect(executor.calls[0]?.sql).toContain('id > ?');
    await expect(repository.listHistory(executor, 0, null)).rejects.toBeInstanceOf(RepositoryIntegrityError);
    await expect(repository.listHistory(executor, 1, { occurredAtUtc: 'bad', id: 'meal-1' })).rejects.toBeInstanceOf(RepositoryIntegrityError);
  });

  test('rejects corrupt zero-item and non-contiguous persisted meal snapshots', async () => {
    executor.firstValue = header;
    executor.allValue = [{ ...item, position: 1 }, { ...item, id: 'item-0', position: 0 }];
    await expect(repository.loadMealDetail(executor, 'meal-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
    expect(executor.calls[1]?.sql).toContain('ORDER BY position ASC');
    executor.allValue = [];
    await expect(repository.loadMealDetail(executor, 'meal-1')).rejects.toBeInstanceOf(RepositoryIntegrityError);
  });

  test('aggregates persisted totals with a bound meal ID', async () => {
    executor.firstValue = { calories: 1, protein: 2, carbohydrates: 3, fat: 4 };
    await expect(repository.sumPersistedMeal(executor, 'meal-1')).resolves.toEqual({ caloriesKcalScaled: 1, proteinGScaled: 2, carbohydratesGScaled: 3, fatGScaled: 4 });
    expect(executor.calls[0]).toMatchObject({ params: ['meal-1'] });
  });
});

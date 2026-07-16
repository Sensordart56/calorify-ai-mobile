import type { DatabaseConnection, DatabaseExecutor } from '@/core/database/contracts';
import type { StoredGoal } from './manual-logging-ports';
import { ManualLoggingUseCases, NotFoundError, ValidationError } from './manual-logging-use-cases';
import { StaleReviewConflict } from '@/core/domain/manual-logging';
import type { FoodPortion } from '@/core/domain/manual-logging';

const nutrients = { caloriesKcalScaled: 100, proteinGScaled: 1, carbohydratesGScaled: 2, fatGScaled: 3, fibreGScaled: null, sugarGScaled: null, sodiumMgScaled: null };
const food = { id: 'food-1', canonicalName: 'Rice', normalizedName: 'rice', currentRevisionId: 'revision-1', archivedAt: null, createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z' };
const revision = { id: 'revision-1', foodId: 'food-1', revisionNumber: 1, basisQuantityScaled: 100, basisUnit: 'gram' as const, nutrients, userModified: true, source: { provider: null, recordId: null, datasetVersion: null, licenseId: null, valuesHash: null } };
const foodCommand = { name: '  Brown Rice  ', basisQuantityScaled: 100, basisUnit: 'gram' as const, nutrients, userModified: true, source: revision.source };

function setup(ids = ['food-2', 'revision-2', 'portion-2', 'goal-2', 'meal-2', 'item-2']) {
  const executor: DatabaseExecutor = { exec: async () => undefined, run: async () => ({ changes: 1 }), first: async () => null, all: async () => [] };
  const database: DatabaseConnection = { ...executor, withExclusiveTransaction: async (task) => task(executor), close: async () => undefined };
  const reader = { listFoods: jest.fn(async () => []), loadFoodWithCurrentRevision: jest.fn(async () => ({ state: food, revision })), listPortions: jest.fn(async () => []), loadCurrentRevision: jest.fn(async () => revision), loadFoodState: jest.fn(async () => food), loadPortion: jest.fn(async (): Promise<FoodPortion | null> => null), findGoal: jest.fn(async (): Promise<StoredGoal | null> => null), findApplicableGoal: jest.fn(async (): Promise<StoredGoal | null> => null), loadMealHeader: jest.fn(async () => null), mealExists: jest.fn(async () => true), loadMealDetail: jest.fn(async () => null), listToday: jest.fn(async () => ({ meals: [], totals: { caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 } })), listHistory: jest.fn(async () => ({ meals: [], nextCursor: null })) };
  const writer = { insertFood: jest.fn(async () => ({ changes: 1 })), insertRevision: jest.fn(async () => ({ changes: 1 })), moveCurrentRevision: jest.fn(async () => ({ changes: 1 })), setArchive: jest.fn(async () => ({ changes: 1 })), insertPortion: jest.fn(async () => ({ changes: 1 })), deletePortion: jest.fn(async () => ({ changes: 1 })), insertGoal: jest.fn(async () => ({ changes: 1 })), replaceGoal: jest.fn(async () => ({ changes: 1 })), insertMeal: jest.fn(async () => ({ changes: 1 })), insertMealItem: jest.fn(async () => ({ changes: 1 })), deleteMealItems: jest.fn(async () => ({ changes: 1 })), updateMeal: jest.fn(async () => ({ changes: 1 })), deleteMeal: jest.fn(async () => ({ changes: 1 })), sumPersistedMeal: jest.fn(async () => ({ caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 })) };
  let next = 0;
  return { reader, writer, useCases: new ManualLoggingUseCases(database, reader, writer, { next: () => ids[next++] ?? 'extra-id' }, { utcNow: () => '2026-07-16T00:00:00.000Z', localDate: () => '2026-07-16', timezoneOffsetMinutes: () => 330 }) };
}

describe('manual logging application operations', () => {
  test('creates a normalized manual food and initial immutable revision in one transaction', async () => {
    const { useCases, writer } = setup();
    await expect(useCases.createManualFood(foodCommand)).resolves.toBe('food-2');
    expect(writer.insertFood).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'food-2', normalizedName: 'brown rice' }));
    expect(writer.insertRevision).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'revision-2', revisionNumber: 1 }), expect.any(String));
  });
  test('appends only from the reviewed current revision', async () => {
    const { useCases, reader, writer } = setup(['revision-2']);
    await expect(useCases.appendFoodRevision('food-1', 'revision-1', foodCommand)).resolves.toBe('revision-2');
    expect(writer.moveCurrentRevision).toHaveBeenCalledWith(expect.anything(), 'food-1', 'revision-2', expect.any(String));
    reader.loadFoodState.mockResolvedValue({ ...food, currentRevisionId: 'other' });
    await expect(useCases.appendFoodRevision('food-1', 'revision-1', foodCommand)).rejects.toBeInstanceOf(StaleReviewConflict);
  });
  test('uses affected-row contracts for archive and portion creation', async () => {
    const { useCases, writer } = setup(['portion-2']);
    await useCases.setFoodArchived('food-1', true);
    expect(writer.setArchive).toHaveBeenCalledWith(expect.anything(), 'food-1', expect.any(String), expect.any(String));
    await expect(useCases.createPortion('food-1', { label: ' Cup ', quantityScaled: 1, equivalentQuantityScaled: 240, equivalentUnit: 'millilitre' })).resolves.toBe('portion-2');
    expect(writer.insertPortion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ normalizedLabel: 'cup' }), expect.any(String));
    writer.setArchive.mockResolvedValue({ changes: 0 });
    await expect(useCases.setFoodArchived('food-1', false)).rejects.toThrow('Required database row');
  });
  test('replaces a reviewed portion through one exclusive mutation', async () => {
    const { useCases, reader, writer } = setup(['portion-2']);
    reader.loadPortion.mockResolvedValue({ id: 'portion-1', foodId: 'food-1', label: 'Cup', normalizedLabel: 'cup', quantityScaled: 1, equivalentQuantityScaled: 240, equivalentUnit: 'millilitre' });
    await expect(useCases.replaceFoodPortion('food-1', 'portion-1', { label: 'Large cup', quantityScaled: 1, equivalentQuantityScaled: 300, equivalentUnit: 'millilitre' })).resolves.toBe('portion-2');
    expect(writer.deletePortion).toHaveBeenCalledWith(expect.anything(), 'portion-1');
    expect(writer.insertPortion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'portion-2', normalizedLabel: 'large cup' }), expect.any(String));
  });
  test('inserts or replaces only today’s validated goal', async () => {
    const { useCases, reader, writer } = setup(['goal-2']);
    const goal = { caloriesKcalScaled: 1, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 };
    await expect(useCases.saveTodayGoal(goal)).resolves.toBe('goal-2');
    expect(writer.insertGoal).toHaveBeenCalled();
    reader.findGoal.mockResolvedValue({ id: 'goal-existing', effectiveLocalDate: '2026-07-16', createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z', totals: goal });
    await expect(useCases.saveTodayGoal(goal)).resolves.toBe('goal-existing');
    expect(writer.replaceGoal).toHaveBeenCalled();
    await expect(useCases.saveTodayGoal({ ...goal, caloriesKcalScaled: 0 })).rejects.toBeInstanceOf(ValidationError);
  });
  test('delegates validated applicable-goal/detail/Today/history queries and maps missing meal', async () => {
    const { useCases, reader } = setup();
    await useCases.applicableGoal('2026-07-16'); await useCases.today('2026-07-16'); await useCases.history(10, null);
    expect(reader.findApplicableGoal).toHaveBeenCalled(); expect(reader.listToday).toHaveBeenCalled(); expect(reader.listHistory).toHaveBeenCalled();
    await expect(useCases.mealDetail('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
  test('normalizes bounded food search and exposes structured food and portion results', async () => {
    const { useCases, reader } = setup();
    await useCases.foods('  RICE  ', 10); await useCases.food('food-1'); await useCases.portions('food-1');
    expect(reader.listFoods).toHaveBeenCalledWith(expect.anything(), 'rice', 10);
    expect(reader.loadFoodWithCurrentRevision).toHaveBeenCalledWith(expect.anything(), 'food-1');
    expect(reader.listPortions).toHaveBeenCalledWith(expect.anything(), 'food-1');
    await expect(useCases.foods('rice', 51)).rejects.toBeInstanceOf(ValidationError);
  });
});

import type { DatabaseConnection, DatabaseExecutor } from '@/core/database/contracts';
import { ManualLoggingUseCases, ValidationError, validateMealCommand } from './manual-logging-use-cases';
import type { ManualLoggingRepository } from './manual-logging-ports';

const executor: DatabaseExecutor = { exec: async () => undefined, run: async () => ({ changes: 1 }), first: async () => null, all: async () => [] };
const transactionCalls = jest.fn();
const withExclusiveTransaction = async <T,>(task: (transaction: DatabaseExecutor) => Promise<T>): Promise<T> => { transactionCalls(); return task(executor); };
const database: DatabaseConnection = { ...executor, withExclusiveTransaction, close: async () => undefined };
const reader: ManualLoggingRepository = { listFoods: async () => [], loadFoodWithCurrentRevision: async () => null, listPortions: async () => [], loadCurrentRevision: async () => null, loadFoodState: async () => null, loadPortion: async () => null, findGoal: async () => null, findApplicableGoal: async () => null, loadMealHeader: async () => null, mealExists: async () => false, loadMealDetail: async () => null, listToday: async () => ({ meals: [], totals: { caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 } }), listHistory: async () => ({ meals: [], nextCursor: null }) };
const writer = { insertFood: async () => ({ changes: 1 }), insertRevision: async () => ({ changes: 1 }), moveCurrentRevision: async () => ({ changes: 1 }), setArchive: async () => ({ changes: 1 }), insertPortion: async () => ({ changes: 1 }), deletePortion: async () => ({ changes: 1 }), insertGoal: async () => ({ changes: 1 }), replaceGoal: async () => ({ changes: 1 }), insertMeal: async () => ({ changes: 1 }), insertMealItem: async () => ({ changes: 1 }), deleteMealItems: async () => ({ changes: 0 }), updateMeal: async () => ({ changes: 1 }), deleteMeal: async () => ({ changes: 1 }), sumPersistedMeal: async () => ({ caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 }) };
const useCases = new ManualLoggingUseCases(database, reader, writer, { next: () => 'id' }, { utcNow: () => '2026-07-15T00:00:00.000Z', localDate: () => '2026-07-15', timezoneOffsetMinutes: () => 330 });
test('rejects an unlinked meal item before a write transaction', async () => {
  transactionCalls.mockClear();
  await expect(useCases.createMeal({ category: 'lunch', occurredAtUtc: '2026-07-15T00:00:00.000Z', localDate: '2026-07-15', timezoneOffsetMinutes: 330, items: [{ foodId: null, foodRevisionId: null, portionId: null, inputName: 'x', inputQuantityScaled: 1, inputUnit: 'gram', resolutionMethod: 'manual' }] })).rejects.toBeInstanceOf(ValidationError);
  expect(transactionCalls).not.toHaveBeenCalled();
});

test.each([
  ['empty meal', { category: 'lunch', occurredAtUtc: '2026-07-15T00:00:00.000Z', localDate: '2026-07-15', timezoneOffsetMinutes: 330, items: [] }],
  ['bad timestamp', { category: 'lunch', occurredAtUtc: 'invalid', localDate: '2026-07-15', timezoneOffsetMinutes: 330, items: [] }],
  ['bad category', { category: 'bad', occurredAtUtc: '2026-07-15T00:00:00.000Z', localDate: '2026-07-15', timezoneOffsetMinutes: 330, items: [] }],
])('pure validation rejects %s', (_label, command) => expect(() => validateMealCommand(command as never)).toThrow(ValidationError));

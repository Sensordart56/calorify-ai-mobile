import { addFoodToDraft, createMealDraftItemIdFactory, removeMealDraftItem, updateMealDraftItem, type MealDraft } from './manual-logging-provider';

const food = { id: 'food-1', canonicalName: 'Rice', normalizedName: 'rice', currentRevisionId: 'revision-1', archivedAt: null, basisQuantityScaled: 100, basisUnit: 'gram' as const, caloriesKcalScaled: 1 };
const base: MealDraft = { mode: 'create', mealId: null, category: 'breakfast', occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, items: [] };

test('draft item IDs remain unique across removals, duplicates, and new drafts', () => {
  const next = createMealDraftItemIdFactory();
  const first = addFoodToDraft(base, food, next()); const second = addFoodToDraft(first, food, next()); const removed = removeMealDraftItem(second, first.items[0]?.id ?? ''); const third = addFoodToDraft(removed, food, next()); const fresh = addFoodToDraft(base, food, next());
  expect(new Set([...second.items, ...third.items, ...fresh.items].map((item) => item.id)).size).toBe(4);
  expect(third.items.map((item) => item.id)).toEqual([second.items[1]?.id, 'draft-item-2']);
  expect(fresh.items[0]?.id).toBe('draft-item-3');
});

test('updates and removes exactly one draft item without mutating prior drafts', () => {
  const next = createMealDraftItemIdFactory(); const original = addFoodToDraft(addFoodToDraft(base, food, next()), food, next()); const changed = updateMealDraftItem(original, 'draft-item-1', { inputQuantity: '2' }); const removed = removeMealDraftItem(changed, 'draft-item-0');
  expect(original.items.map((item) => item.inputQuantity)).toEqual(['1', '1']); expect(changed.items.map((item) => item.inputQuantity)).toEqual(['1', '2']); expect(removed.items).toHaveLength(1); expect(removed.items[0]?.id).toBe('draft-item-1');
});

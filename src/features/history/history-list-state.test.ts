import type { HistoryPage, MealHeader } from '@/core/application/manual-logging-ports';
import { appendHistoryPage, groupHistoryMeals, replaceHistoryPage } from './history-list-state';

function meal(id: string, localDate: string, occurredAtUtc: string): MealHeader {
  return { id, localDate, occurredAtUtc, category: 'lunch', timezoneOffsetMinutes: 330, createdAt: occurredAtUtc, updatedAt: occurredAtUtc, totals: { caloriesKcalScaled: 1, proteinGScaled: 2, carbohydratesGScaled: 3, fatGScaled: 4 } };
}

const first = meal('meal-1', '2026-07-19', '2026-07-19T12:00:00.000Z');
const tied = meal('meal-2', '2026-07-19', '2026-07-19T12:00:00.000Z');
const older = meal('meal-3', '2026-07-18', '2026-07-18T12:00:00.000Z');

test('replaces page one and merges a repeated saved date across pages', () => {
  const page: HistoryPage = { meals: [first], nextCursor: { localDate: first.localDate, occurredAtUtc: first.occurredAtUtc, id: first.id } };
  const initial = replaceHistoryPage(page);
  const appended = appendHistoryPage(initial, { meals: [first, tied, older], nextCursor: null });
  expect(appended.meals.map((value) => value.id)).toEqual(['meal-1', 'meal-2', 'meal-3']);
  expect(groupHistoryMeals(appended.meals)).toEqual([
    { localDate: '2026-07-19', meals: [first, tied] },
    { localDate: '2026-07-18', meals: [older] },
  ]);
  expect(appended.nextCursor).toBeNull();
});

test('page-one refresh discards accumulated rows and cursor', () => {
  const accumulated = { meals: [first, older], nextCursor: { localDate: older.localDate, occurredAtUtc: older.occurredAtUtc, id: older.id } };
  expect(replaceHistoryPage({ meals: [tied], nextCursor: null })).not.toEqual(accumulated);
  expect(replaceHistoryPage({ meals: [tied], nextCursor: null })).toEqual({ meals: [tied], nextCursor: null });
});

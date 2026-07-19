import type { HistoryCursor, HistoryPage, MealHeader } from '@/core/application/manual-logging-ports';

export type HistoryListState = Readonly<{
  meals: readonly MealHeader[];
  nextCursor: HistoryCursor | null;
}>;
export type HistoryGroup = Readonly<{ localDate: string; meals: readonly MealHeader[] }>;

export function replaceHistoryPage(page: HistoryPage): HistoryListState {
  return { meals: [...page.meals], nextCursor: page.nextCursor };
}

export function appendHistoryPage(current: HistoryListState, page: HistoryPage): HistoryListState {
  const seen = new Set(current.meals.map((meal) => meal.id));
  const additions = page.meals.filter((meal) => !seen.has(meal.id));
  return { meals: [...current.meals, ...additions], nextCursor: page.nextCursor };
}

export function groupHistoryMeals(meals: readonly MealHeader[]): readonly HistoryGroup[] {
  const groups: { localDate: string; meals: MealHeader[] }[] = [];
  const byDate = new Map<string, { localDate: string; meals: MealHeader[] }>();
  for (const meal of meals) {
    const existing = byDate.get(meal.localDate);
    if (existing !== undefined) {
      existing.meals.push(meal);
      continue;
    }
    const group = { localDate: meal.localDate, meals: [meal] };
    byDate.set(meal.localDate, group);
    groups.push(group);
  }
  return groups;
}

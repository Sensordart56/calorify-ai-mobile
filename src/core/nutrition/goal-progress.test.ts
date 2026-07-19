import type { StoredGoal, TodaySummary } from '@/core/application/manual-logging-ports';
import { projectTodayGoal } from './goal-progress';

const summary: TodaySummary = {
  meals: [],
  totals: { caloriesKcalScaled: 1_500_000, proteinGScaled: 5_000_000, carbohydratesGScaled: 0, fatGScaled: 2_000_000 },
};
const goal: StoredGoal = {
  id: 'goal-1',
  effectiveLocalDate: '2026-07-01',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  totals: { caloriesKcalScaled: 2_000_000, proteinGScaled: 5_000_000, carbohydratesGScaled: 0, fatGScaled: 1_000_000 },
};

test('projects no goal without inventing target progress', () => {
  expect(projectTodayGoal(summary, null)).toBeNull();
});

test('distinguishes under, met, exceeded, and zero-target nutrients', () => {
  expect(projectTodayGoal(summary, goal)).toEqual({
    effectiveLocalDate: '2026-07-01',
    calories: { consumedScaled: 1_500_000, targetScaled: 2_000_000, percentage: 75, state: 'under' },
    protein: { consumedScaled: 5_000_000, targetScaled: 5_000_000, percentage: 100, state: 'met' },
    carbohydrates: { consumedScaled: 0, targetScaled: 0, percentage: null, state: 'no-target' },
    fat: { consumedScaled: 2_000_000, targetScaled: 1_000_000, percentage: 100, state: 'exceeded' },
  });
});

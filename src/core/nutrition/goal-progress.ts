import type { RequiredTotals, StoredGoal, TodaySummary } from '@/core/application/manual-logging-ports';
import { checkedPercentageHalfUp } from './fixed-point';

export type GoalProgressState = 'no-target' | 'under' | 'met' | 'exceeded';
export type NutrientGoalProgress = Readonly<{
  consumedScaled: number;
  targetScaled: number;
  percentage: number | null;
  state: GoalProgressState;
}>;
export type TodayGoalProgress = Readonly<{
  effectiveLocalDate: string;
  calories: NutrientGoalProgress;
  protein: NutrientGoalProgress;
  carbohydrates: NutrientGoalProgress;
  fat: NutrientGoalProgress;
}>;

function progress(consumedScaled: number, targetScaled: number): NutrientGoalProgress {
  const percentage = checkedPercentageHalfUp(consumedScaled, targetScaled);
  const state: GoalProgressState = targetScaled === 0
    ? 'no-target'
    : consumedScaled < targetScaled
      ? 'under'
      : consumedScaled === targetScaled
        ? 'met'
        : 'exceeded';
  return { consumedScaled, targetScaled, percentage, state };
}

export function projectTodayGoal(summary: TodaySummary, goal: StoredGoal | null): TodayGoalProgress | null {
  if (goal === null) return null;
  const consumed = summary.totals;
  const target: RequiredTotals = goal.totals;
  return {
    effectiveLocalDate: goal.effectiveLocalDate,
    calories: progress(consumed.caloriesKcalScaled, target.caloriesKcalScaled),
    protein: progress(consumed.proteinGScaled, target.proteinGScaled),
    carbohydrates: progress(consumed.carbohydratesGScaled, target.carbohydratesGScaled),
    fat: progress(consumed.fatGScaled, target.fatGScaled),
  };
}

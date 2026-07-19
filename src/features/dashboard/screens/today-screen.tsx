import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { TodayDashboard } from '@/core/application/manual-logging-ports';
import { appPaths } from '@/core/navigation/secondary-screens';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { projectTodayGoal, type NutrientGoalProgress } from '@/core/nutrition/goal-progress';
import { Spacing } from '@/constants/theme';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { InlineError } from '@/shared/ui/inline-error';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

type ProgressRowProps = Readonly<{
  label: string;
  progress: NutrientGoalProgress;
  format: (value: number) => string;
}>;

function ProgressRow({ format, label, progress }: ProgressRowProps) {
  const theme = useTheme();
  const consumed = format(progress.consumedScaled);
  if (progress.percentage === null) {
    return <View style={styles.progressCopy}><ThemedText type="smallBold">{label}</ThemedText><ThemedText themeColor="textSecondary">{consumed} consumed · No target set</ThemedText></View>;
  }
  const target = format(progress.targetScaled);
  const state = progress.state === 'met' ? 'Target met' : progress.state === 'exceeded' ? 'Target exceeded' : `${progress.percentage}%`;
  const valueText = `${consumed} of ${target}. ${state}.`;
  return <View accessible accessibilityLabel={`${label} goal progress`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress.percentage, text: valueText }} style={styles.progressCopy}>
    <ThemedText type="smallBold">{label}</ThemedText>
    <ThemedText themeColor="textSecondary">{consumed} of {target} · {state}</ThemedText>
    <View accessibilityElementsHidden style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><View style={[styles.fill, { backgroundColor: theme.accent, width: `${progress.percentage}%` }]} /></View>
  </View>;
}

function categoryTitle(category: string): string {
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

function totalsText(totals: TodayDashboard['summary']['totals']): string {
  return `${formatCalories(totals.caloriesKcalScaled)} calories · ${formatMacroGrams(totals.proteinGScaled)} protein · ${formatMacroGrams(totals.carbohydratesGScaled)} carbohydrates · ${formatMacroGrams(totals.fatGScaled)} fat`;
}

export function TodayScreen() {
  const router = useRouter();
  const logging = useManualLogging();
  const [dashboard, setDashboard] = useState<TodayDashboard | null>(null);
  const dashboardRef = useRef<TodayDashboard | null>(null);
  const requestId = useRef(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const hasContent = dashboardRef.current !== null;
    if (hasContent) setRefreshing(true);
    else setState('loading');
    setRefreshError(null);
    try {
      const value = await logging.todayDashboard();
      if (id !== requestId.current) return;
      dashboardRef.current = value;
      setDashboard(value);
      setState('ready');
    } catch {
      if (id !== requestId.current) return;
      if (hasContent) setRefreshError('Today could not be refreshed. Your saved data was not changed.');
      else setState('error');
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, [logging]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]));

  if (state === 'loading' && dashboard === null) return <Screen title="Today"><LoadingState title="Loading Today" body="Reading saved meals and goals from this device." /></Screen>;
  if (state === 'error' && dashboard === null) return <Screen title="Today"><ErrorState title="Today unavailable" body="Try again. Your saved meals and goals were not changed." /><ActionButton label="Retry Today" onPress={() => void load()} /></Screen>;

  const summary = dashboard?.summary;
  if (summary === undefined || dashboard === null) return null;
  const goal = projectTodayGoal(summary, dashboard.goal);
  return <Screen title="Today" description={`Saved locally for ${dashboard.localDate}.`}>
    {refreshing ? <View accessible accessibilityLabel="Refreshing Today" accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}><ThemedText themeColor="textSecondary" type="small">Refreshing Today…</ThemedText></View> : null}
    <Card><SectionHeading>Today’s nutrition summary</SectionHeading><ThemedText>{totalsText(summary.totals)}</ThemedText></Card>
    <Card><SectionHeading>Goal progress</SectionHeading>
      {goal === null ? <View accessible accessibilityLabel="No goal applies today. Add a daily goal when you are ready." style={styles.progressCopy}><ThemedText type="smallBold">No goal applies today</ThemedText><ThemedText themeColor="textSecondary">Add a daily goal when you are ready.</ThemedText></View> : <View style={styles.progressList}>
        <ThemedText themeColor="textSecondary" type="small">Effective {goal.effectiveLocalDate}</ThemedText>
        <ProgressRow format={formatCalories} label="Calories" progress={goal.calories} />
        <ProgressRow format={formatMacroGrams} label="Protein" progress={goal.protein} />
        <ProgressRow format={formatMacroGrams} label="Carbohydrates" progress={goal.carbohydrates} />
        <ProgressRow format={formatMacroGrams} label="Fat" progress={goal.fat} />
      </View>}
      <ActionButton label="View goals" onPress={() => router.push(appPaths.goals)} variant="secondary" />
    </Card>
    {summary.meals.length === 0 ? <EmptyState title="No meals saved today" body="Log a meal manually when you are ready." /> : <Card><SectionHeading>Today’s meals</SectionHeading>{summary.meals.map((meal) => <ListRow key={meal.id} title={categoryTitle(meal.category)} detail={totalsText(meal.totals)} accessibilityLabel={`Open ${meal.category} meal. ${totalsText(meal.totals)}`} onPress={() => router.push(appPaths.mealDetail(meal.id))} />)}</Card>}
    <InlineError message={refreshError} />
    <ActionButton disabled={refreshing} label={refreshing ? 'Refreshing Today' : 'Refresh Today'} onPress={() => void load()} variant="secondary" />
    <View style={styles.actions}>
      <ActionButton label="Log meal" onPress={() => router.push(appPaths.log)} />
      <ActionButton label="Enter food manually" onPress={() => router.push(appPaths.manualEntry)} variant="secondary" />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two },
  fill: { borderRadius: Spacing.one, height: '100%' },
  progressCopy: { gap: Spacing.one },
  progressList: { gap: Spacing.three },
  track: { borderRadius: Spacing.one, height: Spacing.one, overflow: 'hidden' },
});

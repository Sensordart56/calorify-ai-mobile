import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { HistoryListState } from '@/features/history/history-list-state';
import { appPaths } from '@/core/navigation/secondary-screens';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { appendHistoryPage, groupHistoryMeals, replaceHistoryPage } from '@/features/history/history-list-state';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { InlineError } from '@/shared/ui/inline-error';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

export const HISTORY_PAGE_SIZE = 20;
const emptyList: HistoryListState = { meals: [], nextCursor: null };

function categoryTitle(category: string): string {
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

function totalsText(totals: HistoryListState['meals'][number]['totals']): string {
  return `${formatCalories(totals.caloriesKcalScaled)} calories · ${formatMacroGrams(totals.proteinGScaled)} protein · ${formatMacroGrams(totals.carbohydratesGScaled)} carbohydrates · ${formatMacroGrams(totals.fatGScaled)} fat`;
}

export function HistoryScreen() {
  const router = useRouter();
  const logging = useManualLogging();
  const [list, setList] = useState<HistoryListState>(emptyList);
  const listRef = useRef<HistoryListState>(emptyList);
  const requestGeneration = useRef(0);
  const loadingMoreRef = useRef(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const hasContent = listRef.current.meals.length > 0;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoadMoreError(null);
    setRefreshError(null);
    if (hasContent) setRefreshing(true);
    else setState('loading');
    try {
      const page = await logging.history(HISTORY_PAGE_SIZE, null);
      if (generation !== requestGeneration.current) return;
      const replacement = replaceHistoryPage(page);
      listRef.current = replacement;
      setList(replacement);
      setState('ready');
    } catch {
      if (generation !== requestGeneration.current) return;
      if (hasContent) setRefreshError('History could not be refreshed. Your saved meals were not changed.');
      else setState('error');
    } finally {
      if (generation === requestGeneration.current) setRefreshing(false);
    }
  }, [logging]);

  const loadNextPage = useCallback(async () => {
    const cursor = listRef.current.nextCursor;
    if (cursor === null || loadingMoreRef.current) return;
    const generation = requestGeneration.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await logging.history(HISTORY_PAGE_SIZE, cursor);
      if (generation !== requestGeneration.current) return;
      const appended = appendHistoryPage(listRef.current, page);
      listRef.current = appended;
      setList(appended);
    } catch {
      if (generation === requestGeneration.current) setLoadMoreError('More history could not be loaded. Existing meals remain available.');
    } finally {
      if (generation === requestGeneration.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [logging]);

  useFocusEffect(useCallback(() => {
    void loadFirstPage();
    return () => {
      requestGeneration.current += 1;
      loadingMoreRef.current = false;
    };
  }, [loadFirstPage]));

  const groups = useMemo(() => groupHistoryMeals(list.meals), [list.meals]);
  if (state === 'loading' && list.meals.length === 0) return <Screen title="History"><LoadingState title="Loading history" body="Reading saved meals from this device." /></Screen>;
  if (state === 'error' && list.meals.length === 0) return <Screen title="History"><ErrorState title="History unavailable" body="Try again. Your saved meals were not changed." /><ActionButton label="Retry history" onPress={() => void loadFirstPage()} /></Screen>;

  return <Screen title="History" description="Meals saved locally on this device.">
    {refreshing ? <View accessible accessibilityLabel="Refreshing history" accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}><ThemedText themeColor="textSecondary" type="small">Refreshing history…</ThemedText></View> : null}
    {groups.length === 0 ? <EmptyState title="No saved meals yet" body="Meals you save manually will appear here." /> : groups.map((group) => <Card key={group.localDate}><SectionHeading>{group.localDate}</SectionHeading>{group.meals.map((meal) => <ListRow key={meal.id} title={categoryTitle(meal.category)} detail={totalsText(meal.totals)} accessibilityLabel={`Open ${meal.category} meal saved for ${meal.localDate}. ${totalsText(meal.totals)}`} onPress={() => router.push(appPaths.mealDetail(meal.id))} />)}</Card>)}
    <InlineError message={refreshError} />
    <ActionButton disabled={refreshing || loadingMore} label={refreshing ? 'Refreshing history' : 'Refresh history'} onPress={() => void loadFirstPage()} variant="secondary" />
    {loadMoreError !== null ? <><InlineError message={loadMoreError} /><ActionButton disabled={refreshing || loadingMore} label="Retry load more" onPress={() => void loadNextPage()} variant="secondary" /></> : null}
    {loadMoreError === null && list.nextCursor !== null ? <ActionButton disabled={refreshing || loadingMore} label={loadingMore ? 'Loading more meals' : 'Load more meals'} onPress={() => void loadNextPage()} variant="secondary" /> : null}
    {list.meals.length > 0 && list.nextCursor === null ? <ThemedText accessibilityLiveRegion="polite" themeColor="textSecondary" type="small">End of history</ThemedText> : null}
  </Screen>;
}

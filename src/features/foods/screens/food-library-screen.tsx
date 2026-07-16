import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import type { FoodListItem } from '@/core/application/manual-logging-ports';
import { formatCalories } from '@/core/nutrition/display-format';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

export function FoodLibraryScreen() {
  const router = useRouter();
  const logging = useManualLogging();
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<readonly FoodListItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = () => { setState('loading'); void logging.foods(query, 50).then((result) => { setFoods(result); setState('ready'); }).catch(() => setState('error')); };
  useFocusEffect(useCallback(() => { let active = true; setState('loading'); void logging.foods(query, 50).then((result) => { if (active) { setFoods(result); setState('ready'); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [logging, query]));
  return (
    <Screen title="Food Library" description="Browse locally saved foods. Search uses literal name matching.">
      <FormField label="Search foods" onChangeText={(value) => { setState('loading'); setQuery(value); }} placeholder="Search by food name" value={query} />
      {state === 'loading' ? <LoadingState title="Loading foods" body="Reading local foods." /> : null}
      {state === 'error' ? <><ErrorState title="Food Library unavailable" body="Try again. Your local foods were not changed." /><ActionButton label="Retry food library" onPress={load} variant="secondary" /></> : null}
      {state === 'ready' && foods.length === 0 ? <EmptyState title="No foods found" body="Create a manual food to start your local library." /> : null}
      {state === 'ready' && foods.length > 0 ? <Card><SectionHeading>Foods</SectionHeading>{foods.map((food) => <ListRow key={food.id} title={food.canonicalName} detail={`${formatCalories(food.caloriesKcalScaled)} calories per basis${food.archivedAt === null ? '' : ' · archived'}`} accessibilityLabel={`View ${food.canonicalName}${food.archivedAt === null ? '' : ', archived'}`} onPress={() => router.push(`/food-detail?foodId=${encodeURIComponent(food.id)}` as Href)} />)}</Card> : null}
      <ActionButton label="Add food manually" onPress={() => router.push('/manual-entry')} />
      <ThemedText type="small" themeColor="textSecondary">Archived foods stay visible but cannot be selected for a new meal until restored.</ThemedText>
    </Screen>
  );
}

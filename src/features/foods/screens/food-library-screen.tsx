import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { foodLibraryFixtures } from '@/features/shell/fixtures/demo-content';
import { appPaths } from '@/core/navigation/secondary-screens';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/state-panels';
import { FormField } from '@/shared/ui/form-field';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';

export function FoodLibraryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => foodLibraryFixtures.filter(({ name }) => name.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return (
    <Screen title="Food Library" description="Future local foods, sources, and portions.">
      <StatusBadge label="Fixture foods only" />
      <FormField label="Search fixture foods" onChangeText={setQuery} placeholder="Search by food name" value={query} />
      {matches.length === 0 ? <EmptyState title="No fixture foods found" body="Search is presentation-only. The local food library arrives in a later phase." /> : (
        <Card><SectionHeading>Fixture foods</SectionHeading>{matches.map((food) => <ThemedText key={food.name}>{food.name}<ThemedText themeColor="textSecondary" type="small"> — {food.detail}</ThemedText></ThemedText>)}</Card>
      )}
      <Card><SectionHeading>Provenance</SectionHeading><ThemedText themeColor="textSecondary">Source, license, and row-level provenance are placeholders. No food data ships in this shell.</ThemedText></Card>
      <ActionButton label="Add food manually" onPress={() => router.push(appPaths.manualEntry)} />
    </Screen>
  );
}

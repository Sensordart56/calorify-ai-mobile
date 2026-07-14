import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { productCopy } from '@/shared/copy/product-copy';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/state-panels';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function HistoryScreen() {
  const [showFixture, setShowFixture] = useState(false);
  return (
    <Screen title="History" description="Meals will be stored locally in a later phase.">
      <StatusBadge label="Fixture-only history" />
      {showFixture ? (
        <Card><SectionHeading>Today</SectionHeading><ThemedText>Lunch preview — rice bowl</ThemedText><ThemedText themeColor="textSecondary">Fixture list item; no meal is stored.</ThemedText></Card>
      ) : <EmptyState title="No saved meals yet" body={productCopy.persistenceNotice} />}
      <View style={styles.actions}>
        <ActionButton label={showFixture ? 'Show empty history' : 'Show fixture meal'} onPress={() => setShowFixture((current) => !current)} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { gap: Spacing.two } });

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { reviewItems } from '@/features/shell/fixtures/demo-content';
import { productCopy } from '@/shared/copy/product-copy';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';

export function ReviewScreen() {
  const [visibleItems, setVisibleItems] = useState(reviewItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  return (
    <Screen title="Review meal" description="Fixture review only — no meal can be saved.">
      <StatusBadge label="Fixture preview, not authoritative" />
      <Card>
        <SectionHeading>Breakfast preview</SectionHeading>
        {visibleItems.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemCopy}><ThemedText type="smallBold">{item.name} · {item.quantity}</ThemedText><ThemedText themeColor="textSecondary" type="small">{item.status}: {item.detail}</ThemedText></View>
            <ActionButton label={`Edit ${item.name} fixture`} onPress={() => setEditingItemId(item.id)} variant="secondary" />
            {editingItemId === item.id ? <ThemedText type="small" themeColor="textSecondary">Editing is a presentation-only fixture state.</ThemedText> : null}
            <ActionButton label={`Remove ${item.name}`} onPress={() => setVisibleItems((items) => items.filter(({ id }) => id !== item.id))} variant="secondary" />
          </View>
        ))}
        {visibleItems.length === 0 ? <ThemedText themeColor="textSecondary">All fixture items are hidden in this preview.</ThemedText> : null}
      </Card>
      <Card>
        <SectionHeading>Fixture preview totals</SectionHeading>
        <ThemedText>420 calories · 18 g protein · 61 g carbohydrates · 12 g fat</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{productCopy.fixtureNotice}</ThemedText>
      </Card>
      <View style={styles.actions}>
        <ActionButton disabled label="Save meal (available in a later phase)" onPress={() => undefined} />
        <ThemedText type="small" themeColor="textSecondary">Edit and remove actions here affect only this in-memory fixture view.</ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.two, paddingVertical: Spacing.two },
  itemCopy: { gap: Spacing.half, width: '100%' },
  actions: { gap: Spacing.two },
});

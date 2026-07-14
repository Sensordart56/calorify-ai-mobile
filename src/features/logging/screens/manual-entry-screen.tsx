import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { productCopy } from '@/shared/copy/product-copy';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { Screen } from '@/shared/ui/screen';
import { StatusBadge } from '@/shared/ui/status-badge';

export function ManualEntryScreen() {
  const [fields, setFields] = useState({ foodName: '', quantity: '', unit: '', calories: '', protein: '', carbohydrates: '', fat: '' });
  const update = (field: keyof typeof fields) => (value: string) => setFields((current) => ({ ...current, [field]: value }));

  return (
    <Screen title="Manual entry" description="Enter a food as a local, presentation-only draft.">
      <StatusBadge label="Not saved" />
      <Card>
        <View style={styles.fields}>
          <FormField label="Food name" onChangeText={update('foodName')} value={fields.foodName} />
          <FormField keyboardType="decimal-pad" label="Quantity" onChangeText={update('quantity')} value={fields.quantity} />
          <FormField label="Unit" onChangeText={update('unit')} placeholder="For example: g" value={fields.unit} />
          <FormField keyboardType="decimal-pad" label="Calories" onChangeText={update('calories')} value={fields.calories} />
          <FormField keyboardType="decimal-pad" label="Protein" onChangeText={update('protein')} value={fields.protein} />
          <FormField keyboardType="decimal-pad" label="Carbohydrates" onChangeText={update('carbohydrates')} value={fields.carbohydrates} />
          <FormField keyboardType="decimal-pad" label="Fat" onChangeText={update('fat')} value={fields.fat} />
        </View>
      </Card>
      <ActionButton label="Keep editing draft" onPress={() => undefined} variant="secondary" />
      <ThemedText type="small" themeColor="textSecondary">This phase does not calculate or save nutrition. {productCopy.persistenceNotice}</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: Spacing.two } });

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { Screen } from '@/shared/ui/screen';
import { StatusBadge } from '@/shared/ui/status-badge';

export function GoalsScreen() {
  const [goals, setGoals] = useState({ calories: '2000', protein: '90', carbohydrates: '250', fat: '65' });
  const update = (field: keyof typeof goals) => (value: string) => setGoals((current) => ({ ...current, [field]: value }));
  return (
    <Screen title="Goals" description="Fixture targets for the future daily summary.">
      <StatusBadge label="Fixture inputs only" />
      <Card><View style={styles.fields}>
        <FormField keyboardType="decimal-pad" label="Calories" onChangeText={update('calories')} value={goals.calories} />
        <FormField keyboardType="decimal-pad" label="Protein" onChangeText={update('protein')} value={goals.protein} />
        <FormField keyboardType="decimal-pad" label="Carbohydrates" onChangeText={update('carbohydrates')} value={goals.carbohydrates} />
        <FormField keyboardType="decimal-pad" label="Fat" onChangeText={update('fat')} value={goals.fat} />
      </View></Card>
      <ActionButton label="Keep editing fixture targets" onPress={() => undefined} variant="secondary" />
      <ThemedText type="small" themeColor="textSecondary">Goals are not validated or persisted in this phase.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: Spacing.two } });

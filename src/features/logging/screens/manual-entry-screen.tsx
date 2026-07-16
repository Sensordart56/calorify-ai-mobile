import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { emptyManualFoodFields, toManualFoodCommand, type ManualFoodFields } from '@/features/shell/manual-logging/form-values';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { InlineError } from '@/shared/ui/inline-error';
import { Screen } from '@/shared/ui/screen';

export function ManualEntryScreen() {
  const router = useRouter();
  const logging = useManualLogging();
  const [fields, setFields] = useState<ManualFoodFields>(emptyManualFoodFields);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (field: keyof ManualFoodFields) => (value: string) => setFields((current) => ({ ...current, [field]: value }));
  const save = async () => { if (saving) return; setError(null); setSaving(true); try { const foodId = await logging.createManualFood(toManualFoodCommand(fields)); router.replace(`/food-detail?foodId=${encodeURIComponent(foodId)}` as Href); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Food could not be saved. Your entries are still available.'); } finally { setSaving(false); } };

  return (
    <Screen title="Manual food" description="Create a local food without a model or network.">
      <Card><View style={styles.fields}>
        <FormField label="Food name" onChangeText={update('name')} value={fields.name} />
        <FormField keyboardType="decimal-pad" label="Nutrition basis quantity" onChangeText={update('basisQuantity')} value={fields.basisQuantity} />
        <FormField label="Basis unit" onChangeText={update('basisUnit')} placeholder="gram, millilitre, each, or serving" value={fields.basisUnit} />
        <FormField keyboardType="decimal-pad" label="Calories" onChangeText={update('calories')} value={fields.calories} />
        <FormField keyboardType="decimal-pad" label="Protein" onChangeText={update('protein')} value={fields.protein} />
        <FormField keyboardType="decimal-pad" label="Carbohydrates" onChangeText={update('carbohydrates')} value={fields.carbohydrates} />
        <FormField keyboardType="decimal-pad" label="Fat" onChangeText={update('fat')} value={fields.fat} />
        <FormField keyboardType="decimal-pad" label="Fibre (optional)" onChangeText={update('fibre')} value={fields.fibre} />
        <FormField keyboardType="decimal-pad" label="Sugar (optional)" onChangeText={update('sugar')} value={fields.sugar} />
        <FormField keyboardType="decimal-pad" label="Sodium (optional)" onChangeText={update('sodium')} value={fields.sodium} />
      </View></Card>
      <InlineError message={error} />
      <ActionButton disabled={saving} label={saving ? 'Saving food' : 'Save food'} onPress={() => void save()} />
      <ThemedText type="small" themeColor="textSecondary">Required calories and macronutrients are saved as an immutable first revision.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: Spacing.two } });

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { FoodPortion } from '@/core/domain/manual-logging';
import type { FoodWithCurrentRevision } from '@/core/application/manual-logging-ports';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { unscaleDecimal } from '@/core/nutrition/fixed-point';
import { Spacing } from '@/constants/theme';
import { emptyPortionFields, fieldsFromRevision, toManualFoodCommand, toPortionCommand, type ManualFoodFields, type PortionFields } from '@/features/shell/manual-logging/form-values';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { InlineError } from '@/shared/ui/inline-error';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

type DetailState = Readonly<{ food: FoodWithCurrentRevision; portions: readonly FoodPortion[] }>;

export function FoodDetailScreen({ foodId }: Readonly<{ foodId: string }>) {
  const logging = useManualLogging();
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [fields, setFields] = useState<ManualFoodFields | null>(null);
  const [portionFields, setPortionFields] = useState<PortionFields>(emptyPortionFields);
  const [replacePortionId, setReplacePortionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setStatus('loading'); setError(null); try { const [food, portions] = await Promise.all([logging.food(foodId), logging.portions(foodId)]); setDetail({ food, portions }); setFields(fieldsFromRevision(food.state.canonicalName, food.revision)); setStatus('ready'); } catch (cause) { setStatus(cause instanceof Error && cause.name === 'NotFoundError' ? 'missing' : 'error'); } };
  useEffect(() => { let active = true; void Promise.all([logging.food(foodId), logging.portions(foodId)]).then(([food, portions]) => { if (active) { setDetail({ food, portions }); setFields(fieldsFromRevision(food.state.canonicalName, food.revision)); setStatus('ready'); } }).catch((cause) => { if (active) setStatus(cause instanceof Error && cause.name === 'NotFoundError' ? 'missing' : 'error'); }); return () => { active = false; }; }, [foodId, logging]);
  const updateFood = (field: Exclude<keyof ManualFoodFields, 'name'>) => (value: string) => setFields((current) => current === null ? current : { ...current, [field]: value });
  const updatePortion = (field: keyof PortionFields) => (value: string) => setPortionFields((current) => ({ ...current, [field]: value }));
  const run = async (operation: () => Promise<void>) => { if (saving) return; setSaving(true); setError(null); try { await operation(); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Changes could not be saved. Your form values are still available.'); } finally { setSaving(false); } };
  if (status === 'loading') return <Screen title="Food details"><LoadingState title="Loading food" body="Reading local food details." /></Screen>;
  if (status === 'missing') return <Screen title="Food details"><EmptyState title="Food not found" body="It may have been removed from this local database." /></Screen>;
  if (status === 'error' || detail === null || fields === null) return <Screen title="Food details"><ErrorState title="Food unavailable" body="Try opening this food again. No local data was changed." /><ActionButton label="Retry food details" onPress={() => void load()} variant="secondary" /></Screen>;
  const archived = detail.food.state.archivedAt !== null;
  const revision = detail.food.revision;
  const selectReplacement = (portion: FoodPortion) => { setReplacePortionId(portion.id); setPortionFields({ label: portion.label, quantity: unscaleDecimal(portion.quantityScaled), equivalentQuantity: unscaleDecimal(portion.equivalentQuantityScaled), equivalentUnit: portion.equivalentUnit }); };
  return (
    <Screen title={detail.food.state.canonicalName} description={archived ? 'Archived foods are viewable and can be restored.' : `Current revision ${revision.revisionNumber}.`}>
      <Card><SectionHeading>Current nutrition basis</SectionHeading><ThemedText>{formatCalories(revision.nutrients.caloriesKcalScaled)} calories · {formatMacroGrams(revision.nutrients.proteinGScaled)} protein · {formatMacroGrams(revision.nutrients.carbohydratesGScaled)} carbohydrates · {formatMacroGrams(revision.nutrients.fatGScaled)} fat</ThemedText></Card>
      <InlineError message={error} />
      {archived ? <ActionButton disabled={saving} label={saving ? 'Restoring food' : 'Restore food'} onPress={() => void run(async () => logging.setFoodArchived(foodId, false))} /> : <>
        <Card><SectionHeading>Edit as a new revision</SectionHeading><View style={styles.fields}>
          <ThemedText type="small" themeColor="textSecondary">Food name: {detail.food.state.canonicalName}</ThemedText><FormField keyboardType="decimal-pad" label="Nutrition basis quantity" onChangeText={updateFood('basisQuantity')} value={fields.basisQuantity} /><FormField label="Basis unit" onChangeText={updateFood('basisUnit')} value={fields.basisUnit} /><FormField keyboardType="decimal-pad" label="Calories" onChangeText={updateFood('calories')} value={fields.calories} /><FormField keyboardType="decimal-pad" label="Protein" onChangeText={updateFood('protein')} value={fields.protein} /><FormField keyboardType="decimal-pad" label="Carbohydrates" onChangeText={updateFood('carbohydrates')} value={fields.carbohydrates} /><FormField keyboardType="decimal-pad" label="Fat" onChangeText={updateFood('fat')} value={fields.fat} /><FormField keyboardType="decimal-pad" label="Fibre (optional)" onChangeText={updateFood('fibre')} value={fields.fibre} /><FormField keyboardType="decimal-pad" label="Sugar (optional)" onChangeText={updateFood('sugar')} value={fields.sugar} /><FormField keyboardType="decimal-pad" label="Sodium (optional)" onChangeText={updateFood('sodium')} value={fields.sodium} />
        </View></Card>
        <ActionButton disabled={saving} label={saving ? 'Saving revision' : 'Save new revision'} onPress={() => void run(async () => { await logging.appendFoodRevision(foodId, revision.id, toManualFoodCommand({ ...fields, name: detail.food.state.canonicalName })); })} />
        <Card><SectionHeading>{replacePortionId === null ? 'Add portion' : 'Replace portion'}</SectionHeading><View style={styles.fields}><FormField label="Portion label" onChangeText={updatePortion('label')} value={portionFields.label} /><FormField keyboardType="decimal-pad" label="Portion quantity" onChangeText={updatePortion('quantity')} value={portionFields.quantity} /><FormField keyboardType="decimal-pad" label="Equivalent quantity" onChangeText={updatePortion('equivalentQuantity')} value={portionFields.equivalentQuantity} /><FormField label="Equivalent unit" onChangeText={updatePortion('equivalentUnit')} placeholder="gram, millilitre, or each" value={portionFields.equivalentUnit} /></View></Card>
        <ActionButton disabled={saving} label={saving ? 'Saving portion' : replacePortionId === null ? 'Add portion' : 'Save replacement'} onPress={() => void run(async () => { const command = toPortionCommand(portionFields); if (replacePortionId === null) await logging.createPortion(foodId, command); else await logging.replaceFoodPortion(foodId, replacePortionId, command); setReplacePortionId(null); setPortionFields(emptyPortionFields); })} />
        {detail.portions.length === 0 ? <EmptyState title="No portions" body="Add a portion for food-specific conversions." /> : <Card><SectionHeading>Portions</SectionHeading>{detail.portions.map((portion) => <View key={portion.id} style={styles.portion}><ThemedText>{portion.label}</ThemedText><ActionButton accessibilityHint="Loads this portion into the replacement form" label={`Replace ${portion.label}`} onPress={() => selectReplacement(portion)} variant="secondary" /></View>)}</Card>}
        <ActionButton disabled={saving} label="Archive food" onPress={() => void run(async () => logging.setFoodArchived(foodId, true))} variant="secondary" />
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({ fields: { gap: Spacing.two }, portion: { gap: Spacing.two, paddingVertical: Spacing.two } });

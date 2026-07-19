import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { FoodPortion, FoodRevision } from '@/core/domain/manual-logging';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { Spacing } from '@/constants/theme';
import { previewMeal, toMealCommand, type MealPreview } from '@/features/shell/manual-logging/form-values';
import { useManualLogging, useMealDraft, type MealDraftItem } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { InlineError } from '@/shared/ui/inline-error';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, LoadingState } from '@/shared/ui/state-panels';

type ItemOptions = Readonly<{ basisUnit: string; revision: FoodRevision; portions: readonly FoodPortion[] }>;

export function ReviewScreen() {
  const router = useRouter(); const logging = useManualLogging(); const draftStore = useMealDraft(); const draft = draftStore.draft;
  const [options, setOptions] = useState<Readonly<Record<string, ItemOptions>>>({}); const [saving, setSaving] = useState(false); const [confirmCancel, setConfirmCancel] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (draft === null) return; let active = true; void Promise.all(draft.items.map(async (item) => ({ id: item.id, food: await logging.food(item.foodId), portions: await logging.portions(item.foodId) }))).then((rows) => { if (active) setOptions(Object.fromEntries(rows.map((row) => [row.id, { basisUnit: row.food.revision.basisUnit, revision: row.food.revision, portions: row.portions }]))); }).catch(() => { if (active) setError('Some current food details could not be loaded. Remove or replace the affected item.'); }); return () => { active = false; }; }, [draft, logging]);
  const previewResult = useMemo<Readonly<{ preview: MealPreview | null; error: string | null }>>(() => { if (draft === null || Object.keys(options).length < draft.items.length) return { preview: null, error: null }; try { return { preview: previewMeal(draft.items.map((item) => { const option = options[item.id]; if (option === undefined) throw new Error(`${item.canonicalName} is unavailable for preview.`); const portion = item.portionId === null ? null : option.portions.find((value) => value.id === item.portionId) ?? null; return { item, revision: option.revision, portion }; })), error: null }; } catch (cause) { return { preview: null, error: cause instanceof Error ? cause.message : 'Meal preview could not be calculated.' }; } }, [draft, options]);
  if (draft === null) return <Screen title="Review meal"><EmptyState title="No meal to review" body="Add a food from Log to start a manual meal." /><ActionButton label="Go to Log" onPress={() => router.replace('/log' as Href)} /></Screen>;
  const preview = previewResult.preview; const previewFor = (id: string) => preview?.items.find((item) => item.id === id) ?? null;
  const save = async () => { if (saving || preview === null) return; setSaving(true); setError(null); try { const command = toMealCommand(draft); if (draft.mode === 'create') { const mealId = await logging.createMeal(command); draftStore.clear(); router.replace(`/meal-detail?mealId=${encodeURIComponent(mealId)}` as Href); } else if (draft.mealId !== null) { await logging.editMeal(draft.mealId, command); draftStore.clear(); router.back(); } else throw new Error('Meal edit is missing its ID.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Meal could not be saved. Your draft is still available.'); } finally { setSaving(false); } };
  const acceptCurrent = (item: MealDraftItem, portion: FoodPortion | null) => { const option = options[item.id]; if (option === undefined) return; draftStore.updateItem(item.id, portion === null ? { foodRevisionId: option.revision.id, inputUnit: option.basisUnit, portionId: null, requiresReview: false, reviewReason: null } : { foodRevisionId: option.revision.id, inputUnit: portion.normalizedLabel, portionId: portion.id, requiresReview: false, reviewReason: null }); };
  return <Screen title={draft.mode === 'edit' ? 'Review meal changes' : 'Review meal'} description="Preview only. Saving re-resolves every food and recomputes nutrition in one local transaction.">
    <Card><SectionHeading>Meal category</SectionHeading><View style={styles.actions}>{(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const).map((category) => <ActionButton key={category} label={category === draft.category ? `${category} selected` : category} onPress={() => draftStore.setCategory(category)} variant="secondary" />)}</View></Card>
    <InlineError message={error ?? previewResult.error} />
    {draft.items.map((item) => { const itemPreview = previewFor(item.id); return <Card key={item.id}><SectionHeading>{item.canonicalName}</SectionHeading><View style={styles.fields}><FormField keyboardType="decimal-pad" label={`Quantity for ${item.canonicalName}`} onChangeText={(inputQuantity) => draftStore.updateItem(item.id, { inputQuantity })} value={item.inputQuantity} /><FormField label={`Unit for ${item.canonicalName}`} onChangeText={(inputUnit) => draftStore.updateItem(item.id, { inputUnit, portionId: null })} value={item.inputUnit} /></View>{item.requiresReview ? <InlineError message={item.reviewReason ?? 'This item requires explicit re-review. Choose a current unit or portion.'} /> : null}{itemPreview === null ? <LoadingState title="Preview unavailable" body="Resolve this item before saving." /> : <ThemedText themeColor="textSecondary" type="small">Preview: {formatCalories(itemPreview.nutrients.caloriesKcalScaled)} calories · {formatMacroGrams(itemPreview.nutrients.proteinGScaled)} protein · {formatMacroGrams(itemPreview.nutrients.carbohydratesGScaled)} carbohydrates · {formatMacroGrams(itemPreview.nutrients.fatGScaled)} fat</ThemedText>}<View style={styles.actions}><ActionButton label="Accept current basis unit" onPress={() => acceptCurrent(item, null)} variant="secondary" />{options[item.id]?.portions.map((portion) => <ActionButton key={portion.id} label={`Accept ${portion.label}`} onPress={() => acceptCurrent(item, portion)} variant="secondary" />)}<ActionButton label={`Remove ${item.canonicalName}`} onPress={() => draftStore.removeItem(item.id)} variant="secondary" /></View></Card>; })}
    {draft.items.length === 0 ? <EmptyState title="No items in this meal" body="Return to Log and add at least one active food." /> : null}
    {Object.keys(options).length < draft.items.length ? <LoadingState title="Checking current foods" body="Loading compatible portions before save." /> : null}
    {preview !== null ? <Card><SectionHeading>Preview totals</SectionHeading><ThemedText>{formatCalories(preview.totals.caloriesKcalScaled)} calories · {formatMacroGrams(preview.totals.proteinGScaled)} protein · {formatMacroGrams(preview.totals.carbohydratesGScaled)} carbohydrates · {formatMacroGrams(preview.totals.fatGScaled)} fat</ThemedText></Card> : null}
    <ActionButton disabled={saving || preview === null || draft.items.length === 0 || draft.items.some((item) => item.requiresReview)} label={saving ? 'Saving meal' : draft.mode === 'edit' ? 'Save meal changes' : 'Save meal'} onPress={() => void save()} />
    {confirmCancel ? <Card><ThemedText>Discard this unsaved meal draft?</ThemedText><View style={styles.actions}><ActionButton label="Keep editing" onPress={() => setConfirmCancel(false)} variant="secondary" /><ActionButton label="Discard meal draft" onPress={() => { draftStore.clear(); router.replace('/log' as Href); }} /></View></Card> : <ActionButton label="Cancel meal" onPress={() => setConfirmCancel(true)} variant="secondary" />}
  </Screen>;
}

const styles = StyleSheet.create({ actions: { gap: Spacing.two }, fields: { gap: Spacing.two } });

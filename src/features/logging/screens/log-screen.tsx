import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { FoodPortion, FoodRevision } from '@/core/domain/manual-logging';
import type { FoodListItem } from '@/core/application/manual-logging-ports';
import type { FoodResolutionCandidate } from '@/core/search/food-resolution';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { Spacing } from '@/constants/theme';
import { previewMeal, type MealPreview } from '@/features/shell/manual-logging/form-values';
import { useManualLogging, useMealDraft, type MealDraftItem } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { InlineError } from '@/shared/ui/inline-error';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

type ItemOptions = Readonly<{ revision: FoodRevision; portions: readonly FoodPortion[] }>;

export function LogScreen() {
  const router = useRouter(); const logging = useManualLogging(); const draftStore = useMealDraft(); const draft = draftStore.draft;
  const [query, setQuery] = useState(''); const [candidates, setCandidates] = useState<readonly FoodResolutionCandidate[]>([]); const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unresolved' | 'error'>('idle'); const [options, setOptions] = useState<Readonly<Record<string, ItemOptions>>>({}); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (draft === null || draft.items.length === 0) return; let active = true; void Promise.all(draft.items.map(async (item) => ({ id: item.id, food: await logging.food(item.foodId), portions: await logging.portions(item.foodId) }))).then((rows) => { if (active) setOptions(Object.fromEntries(rows.map((row) => [row.id, { revision: row.food.revision, portions: row.portions }]))); }).catch(() => { if (active) setError('Some draft foods could not be loaded. Remove or replace the affected item.'); }); return () => { active = false; }; }, [draft, logging]);
  const previewResult = useMemo<Readonly<{ preview: MealPreview | null; error: string | null }>>(() => { if (draft === null || draft.items.length === 0 || Object.keys(options).length < draft.items.length) return { preview: null, error: null }; try { return { preview: previewMeal(draft.items.map((item) => { const option = options[item.id]; if (option === undefined) throw new Error(`${item.canonicalName} is unavailable.`); const portion = item.portionId === null ? null : option.portions.find((value) => value.id === item.portionId) ?? null; return { item, revision: option.revision, portion }; })), error: null }; } catch (cause) { return { preview: null, error: cause instanceof Error ? cause.message : 'Draft preview could not be calculated.' }; } }, [draft, options]);
  const choose = (food: FoodListItem, method: FoodResolutionCandidate['method'] = 'exact') => { if (draft === null || draft.mode !== 'create') draftStore.beginCreate(); draftStore.addFood(food, method); setCandidates([]); setState('idle'); };
  const find = async () => { setState('loading'); setError(null); try { const result = await logging.resolveFood(query, null, 10); if (result.kind === 'automatic') { choose(result.candidate.food, result.candidate.method); return; } if (result.kind === 'review') { setCandidates(result.candidates); setState('ready'); return; } setCandidates([]); setState('unresolved'); } catch (cause) { setCandidates([]); setState('error'); setError(cause instanceof Error ? cause.message : 'Local food search failed.'); } };
  const selectCategory = (category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other') => { draftStore.setCategory(category); };
  const accept = (item: MealDraftItem, portion: FoodPortion | null) => { const option = options[item.id]; if (option === undefined) return; draftStore.updateItem(item.id, portion === null ? { foodRevisionId: option.revision.id, inputUnit: option.revision.basisUnit, portionId: null, requiresReview: false, reviewReason: null } : { foodRevisionId: option.revision.id, inputUnit: portion.normalizedLabel, portionId: portion.id, requiresReview: false, reviewReason: null }); };
  const preview = previewResult.preview;
  return <Screen title="Log" description="Build a meal from local foods before reviewing and saving.">
    <Card><SectionHeading>Manual logging is ready</SectionHeading><ThemedText themeColor="textSecondary">No local model is installed. Manual logging works without a network.</ThemedText></Card>
    <Card><SectionHeading>Meal category</SectionHeading><View style={styles.actions}>{(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const).map((category) => <ActionButton key={category} label={draft?.category === category ? `${category} selected` : category} onPress={() => selectCategory(category)} variant="secondary" />)}</View></Card>
    <FormField label="Find a local food" onChangeText={setQuery} placeholder="For example, raw apple" value={query} />
    <ActionButton disabled={state === 'loading' || query.trim().length === 0} label={state === 'loading' ? 'Finding local foods' : 'Find local food'} onPress={() => void find()} />
    {state === 'loading' ? <LoadingState title="Finding local foods" body="Checking the installed catalog and your Food Library." /> : null}{state === 'error' ? <ErrorState title="Local search unavailable" body="Your meal draft was not changed. You can still create a manual food." /> : null}{state === 'unresolved' ? <EmptyState title="No local match found" body="Try a more specific name or create a manual food. Nothing was selected automatically." /> : null}
    {state === 'ready' && candidates.length > 0 ? <Card><SectionHeading>Choose the intended food</SectionHeading>{candidates.map((candidate) => <ListRow key={`${candidate.method}-${candidate.food.id}`} title={candidate.food.canonicalName} detail={candidate.method === 'alias' ? `Matched an alternate name: ${candidate.matchedText}` : 'Ranked local catalog result — tap to confirm'} onPress={() => choose(candidate.food, candidate.method)} accessibilityLabel={`Choose ${candidate.food.canonicalName}`} />)}</Card> : null}
    {draft?.items.map((item) => <Card key={item.id}><SectionHeading>{item.canonicalName}</SectionHeading><View style={styles.fields}><FormField keyboardType="decimal-pad" label={`Quantity for ${item.canonicalName}`} onChangeText={(inputQuantity) => draftStore.updateItem(item.id, { inputQuantity })} value={item.inputQuantity} /><FormField label={`Unit for ${item.canonicalName}`} onChangeText={(inputUnit) => draftStore.updateItem(item.id, { inputUnit, portionId: null })} value={item.inputUnit} /></View>{item.requiresReview ? <InlineError message={item.reviewReason ?? 'Choose a current unit or portion.'} /> : null}<View style={styles.actions}><ActionButton label="Use current basis unit" onPress={() => accept(item, null)} variant="secondary" />{options[item.id]?.portions.map((portion) => <ActionButton key={portion.id} label={`Use ${portion.label}`} onPress={() => accept(item, portion)} variant="secondary" />)}<ActionButton label={`Remove ${item.canonicalName}`} onPress={() => draftStore.removeItem(item.id)} variant="secondary" /></View></Card>)}
    <InlineError message={error ?? previewResult.error} />
    {draft !== null && draft.items.length > 0 && preview === null ? <LoadingState title="Draft preview" body="Checking current food nutrition." /> : null}
    {preview !== null ? <Card><SectionHeading>Meal preview</SectionHeading><ThemedText>{formatCalories(preview.totals.caloriesKcalScaled)} calories · {formatMacroGrams(preview.totals.proteinGScaled)} protein · {formatMacroGrams(preview.totals.carbohydratesGScaled)} carbohydrates · {formatMacroGrams(preview.totals.fatGScaled)} fat</ThemedText></Card> : null}
    <ActionButton disabled={preview === null || draft === null || draft.items.length === 0 || draft.items.some((item) => item.requiresReview)} label="Review and save" onPress={() => router.push('/review' as Href)} />
    <ActionButton label="Create a manual food" onPress={() => router.push('/manual-entry' as Href)} variant="secondary" />
  </Screen>;
}

const styles = StyleSheet.create({ actions: { gap: Spacing.two }, fields: { gap: Spacing.two } });

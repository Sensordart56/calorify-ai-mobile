import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { MealDetail } from '@/core/application/manual-logging-ports';
import { formatCalories, formatMacroGrams } from '@/core/nutrition/display-format';
import { unscaleDecimal } from '@/core/nutrition/fixed-point';
import { Spacing } from '@/constants/theme';
import { useManualLogging, useMealDraft, type MealDraft, type MealDraftItem } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { InlineError } from '@/shared/ui/inline-error';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

const canonicalUnits = ['gram', 'millilitre', 'each', 'serving'] as const;

export function MealDetailScreen({ mealId }: Readonly<{ mealId: string }>) {
  const router = useRouter();
  const logging = useManualLogging();
  const draftStore = useMealDraft();
  const [detail, setDetail] = useState<MealDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refresh = async () => { setWorking(true); setError(null); try { setDetail(await logging.mealDetail(mealId)); setState('ready'); } catch (cause) { setState(cause instanceof Error && cause.name === 'NotFoundError' ? 'missing' : 'error'); } finally { setWorking(false); } };
  useFocusEffect(useCallback(() => { let active = true; void logging.mealDetail(mealId).then((value) => { if (active) { setDetail(value); setState('ready'); } }).catch((cause) => { if (active) setState(cause instanceof Error && cause.name === 'NotFoundError' ? 'missing' : 'error'); }); return () => { active = false; }; }, [logging, mealId]));
  const beginEdit = async () => { if (detail === null || working) return; setWorking(true); setError(null); try { const items: MealDraftItem[] = []; for (const item of detail.items) { if (item.foodId === null || item.foodRevisionId === null) { items.push({ id: item.id, foodId: `missing-${item.id}`, foodRevisionId: '', canonicalName: item.inputName, inputQuantity: unscaleDecimal(item.inputQuantityScaled), inputUnit: item.inputUnit, portionId: null, requiresReview: true, reviewReason: 'This saved item no longer links to a food. Remove it or add a replacement.' }); continue; } try { const [food, portions] = await Promise.all([logging.food(item.foodId), logging.portions(item.foodId)]); const canonical = (canonicalUnits as readonly string[]).includes(item.inputUnit); const portion = canonical ? null : portions.find((candidate) => candidate.normalizedLabel === item.inputUnit) ?? null; const reason = food.state.archivedAt !== null ? 'This food is archived. Restore it or remove this item.' : food.revision.id !== item.foodRevisionId ? 'This food has a newer nutrition revision. Explicitly accept a current unit or portion.' : !canonical && portion === null ? 'The original portion is no longer available. Choose a current unit or portion.' : null; items.push({ id: item.id, foodId: food.state.id, foodRevisionId: food.revision.id, canonicalName: food.state.canonicalName, inputQuantity: unscaleDecimal(item.inputQuantityScaled), inputUnit: item.inputUnit, portionId: portion?.id ?? null, requiresReview: reason !== null, reviewReason: reason }); } catch { items.push({ id: item.id, foodId: item.foodId, foodRevisionId: item.foodRevisionId, canonicalName: item.inputName, inputQuantity: unscaleDecimal(item.inputQuantityScaled), inputUnit: item.inputUnit, portionId: null, requiresReview: true, reviewReason: 'Current food details could not be loaded. Remove or replace this item.' }); } }
      const draft: MealDraft = { mode: 'edit', mealId: detail.header.id, category: detail.header.category, occurredAtUtc: detail.header.occurredAtUtc, localDate: detail.header.localDate, timezoneOffsetMinutes: detail.header.timezoneOffsetMinutes, items };
      draftStore.beginEdit(draft); router.push('/review' as Href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Meal could not be prepared for review.'); } finally { setWorking(false); } };
  const remove = async () => { if (working) return; setWorking(true); setError(null); try { await logging.deleteMeal(mealId); router.replace('/log' as Href); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Meal could not be deleted.'); setWorking(false); } };
  if (state === 'loading') return <Screen title="Meal details"><LoadingState title="Loading meal" body="Reading saved meal snapshots." /></Screen>;
  if (state === 'missing') return <Screen title="Meal details"><EmptyState title="Meal not found" body="This saved meal is unavailable in the local database." /></Screen>;
  if (state === 'error' || detail === null) return <Screen title="Meal details"><ErrorState title="Meal unavailable" body="Try opening this meal again. Your data was not changed." /><ActionButton label="Retry" onPress={() => void refresh()} /></Screen>;
  const totals = detail.header.totals;
  return <Screen title="Meal details" description={`${detail.header.category} · saved for ${detail.header.localDate}`}>
    <Card><SectionHeading>Saved totals</SectionHeading><ThemedText>{formatCalories(totals.caloriesKcalScaled)} calories · {formatMacroGrams(totals.proteinGScaled)} protein · {formatMacroGrams(totals.carbohydratesGScaled)} carbohydrates · {formatMacroGrams(totals.fatGScaled)} fat</ThemedText></Card>
    <Card><SectionHeading>Saved items</SectionHeading>{detail.items.map((item) => <View key={item.id} style={styles.item}><ThemedText type="smallBold">{item.inputName}</ThemedText><ThemedText themeColor="textSecondary" type="small">{unscaleDecimal(item.inputQuantityScaled)} {item.inputUnit} · {formatCalories(item.nutrients.caloriesKcalScaled)} calories snapshot</ThemedText></View>)}</Card>
    <InlineError message={error} />
    <ActionButton disabled={working} label={working ? 'Preparing review' : 'Edit meal'} onPress={() => void beginEdit()} />
    {confirmDelete ? <Card><ThemedText>This permanently removes this meal and its saved item snapshots.</ThemedText><View style={styles.actions}><ActionButton label="Keep meal" onPress={() => setConfirmDelete(false)} variant="secondary" /><ActionButton disabled={working} label="Confirm delete meal" onPress={() => void remove()} /></View></Card> : <ActionButton disabled={working} label="Delete meal" onPress={() => setConfirmDelete(true)} variant="secondary" />}
  </Screen>;
}

const styles = StyleSheet.create({ actions: { gap: Spacing.two }, item: { gap: Spacing.half, paddingVertical: Spacing.two } });

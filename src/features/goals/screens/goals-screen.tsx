import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { scaleDecimal, unscaleDecimal } from '@/core/nutrition/fixed-point';
import { Spacing } from '@/constants/theme';
import { useManualLogging } from '@/features/shell/manual-logging/manual-logging-provider';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { InlineError } from '@/shared/ui/inline-error';
import { Screen } from '@/shared/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

type GoalFields = Readonly<{ calories: string; protein: string; carbohydrates: string; fat: string }>;
const empty: GoalFields = { calories: '', protein: '', carbohydrates: '', fat: '' };
function localToday(): string { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
function parseGoal(fields: GoalFields) { const parse = (value: string, label: string, positive: boolean) => { if (value.trim().length === 0) throw new Error(`${label} is required.`); const scaled = scaleDecimal(value.trim()); if (positive && scaled < 1) throw new Error(`${label} must be greater than zero.`); return scaled; }; return { caloriesKcalScaled: parse(fields.calories, 'Calories', true), proteinGScaled: parse(fields.protein, 'Protein', false), carbohydratesGScaled: parse(fields.carbohydrates, 'Carbohydrates', false), fatGScaled: parse(fields.fat, 'Fat', false) }; }

export function GoalsScreen() {
  const logging = useManualLogging();
  const [fields, setFields] = useState<GoalFields>(empty);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localToday();
  const load = () => { setState('loading'); void logging.applicableGoal(today).then((goal) => { if (goal !== null) setFields({ calories: unscaleDecimal(goal.totals.caloriesKcalScaled), protein: unscaleDecimal(goal.totals.proteinGScaled), carbohydrates: unscaleDecimal(goal.totals.carbohydratesGScaled), fat: unscaleDecimal(goal.totals.fatGScaled) }); setState('ready'); }).catch(() => setState('error')); };
  useEffect(() => { let active = true; void logging.applicableGoal(today).then((goal) => { if (active) { if (goal !== null) setFields({ calories: unscaleDecimal(goal.totals.caloriesKcalScaled), protein: unscaleDecimal(goal.totals.proteinGScaled), carbohydrates: unscaleDecimal(goal.totals.carbohydratesGScaled), fat: unscaleDecimal(goal.totals.fatGScaled) }); setState('ready'); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [logging, today]);
  const update = (field: keyof GoalFields) => (value: string) => setFields((current) => ({ ...current, [field]: value }));
  const save = async () => { if (saving) return; setSaving(true); setError(null); try { await logging.saveTodayGoal(parseGoal(fields)); setState('ready'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Goal could not be saved. Your values are still available.'); } finally { setSaving(false); } };
  return <Screen title="Goals" description={`Set or replace the target effective today (${today}).`}>
    {state === 'loading' ? <LoadingState title="Loading goal" body="Reading your local goal." /> : null}
    {state === 'error' ? <><ErrorState title="Goal unavailable" body="Try again. Your local goal was not changed." /><ActionButton label="Retry goal" onPress={load} variant="secondary" /></> : null}
    {state === 'ready' && fields.calories.length === 0 ? <EmptyState title="No current goal" body="Add a daily goal when you are ready." /> : null}
    <Card><View style={styles.fields}><FormField keyboardType="decimal-pad" label="Calories" onChangeText={update('calories')} value={fields.calories} /><FormField keyboardType="decimal-pad" label="Protein" onChangeText={update('protein')} value={fields.protein} /><FormField keyboardType="decimal-pad" label="Carbohydrates" onChangeText={update('carbohydrates')} value={fields.carbohydrates} /><FormField keyboardType="decimal-pad" label="Fat" onChangeText={update('fat')} value={fields.fat} /></View></Card>
    <InlineError message={error} />
    <ActionButton disabled={saving} label={saving ? 'Saving goal' : 'Save today’s goal'} onPress={() => void save()} />
    <ThemedText type="small" themeColor="textSecondary">Saving again today replaces only today’s local target; older effective dates remain historical records.</ThemedText>
  </Screen>;
}

const styles = StyleSheet.create({ fields: { gap: Spacing.two } });

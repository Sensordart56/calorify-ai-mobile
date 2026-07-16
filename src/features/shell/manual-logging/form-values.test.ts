import { toManualFoodCommand, toMealCommand, toPortionCommand, previewMeal } from './form-values';
import { updateMealDraftItem, type MealDraft } from './manual-logging-provider';

const fields = { name: 'Rice', basisQuantity: '100', basisUnit: 'gram', calories: '0', protein: '0', carbohydrates: '0', fat: '0', fibre: '', sugar: '', sodium: '' };
const revision = { id: 'revision-current', foodId: 'food-1', revisionNumber: 2, basisQuantityScaled: 100_000_000, basisUnit: 'gram' as const, nutrients: { caloriesKcalScaled: 100_000_000, proteinGScaled: 10_000_000, carbohydratesGScaled: 20_000_000, fatGScaled: 5_000_000, fibreGScaled: 0, sugarGScaled: null, sodiumMgScaled: null }, userModified: true, source: { provider: null, recordId: null, datasetVersion: null, licenseId: null, valuesHash: null } };
const draft: MealDraft = { mode: 'create', mealId: null, category: 'lunch', occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, items: [{ id: 'draft-item-0', foodId: 'food-1', foodRevisionId: 'revision-current', canonicalName: 'Rice', inputQuantity: '100', inputUnit: 'gram', portionId: null, requiresReview: false, reviewReason: null }] };

describe('Phase 3B manual form boundaries', () => {
  test('accepts zero required and optional nutrients while blank optional nutrients stay unknown', () => {
    expect(toManualFoodCommand(fields).nutrients).toEqual({ caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0, fibreGScaled: null, sugarGScaled: null, sodiumMgScaled: null });
    expect(toManualFoodCommand({ ...fields, fibre: '0', sugar: '0', sodium: '0' }).nutrients).toMatchObject({ fibreGScaled: 0, sugarGScaled: 0, sodiumMgScaled: 0 });
  });
  test.each([['blank', { ...fields, calories: '' }], ['negative', { ...fields, protein: '-1' }], ['precision', { ...fields, fat: '1.0000001' }], ['unsafe', { ...fields, carbohydrates: '9007199255' }]])('rejects %s nutrient input', (_label, value) => expect(() => toManualFoodCommand(value)).toThrow());
  test('keeps quantities strictly positive', () => { expect(() => toManualFoodCommand({ ...fields, basisQuantity: '0' })).toThrow(); expect(() => toPortionCommand({ label: 'Cup', quantity: '0', equivalentQuantity: '1', equivalentUnit: 'gram' })).toThrow(); expect(() => toMealCommand({ ...draft, items: [{ ...draft.items[0], inputQuantity: '0' }] })).toThrow(); });
  test('calculates canonical and portion preview totals with zero nutrients', () => {
    const portion = { id: 'portion-1', foodId: 'food-1', label: 'Half', normalizedLabel: 'half', quantityScaled: 1_000_000, equivalentQuantityScaled: 50_000_000, equivalentUnit: 'gram' as const };
    const preview = previewMeal([{ item: draft.items[0], revision, portion: null }, { item: { ...draft.items[0], id: 'draft-item-1', inputQuantity: '1', inputUnit: 'half', portionId: 'portion-1' }, revision, portion }]);
    expect(preview.totals).toEqual({ caloriesKcalScaled: 150_000_000, proteinGScaled: 15_000_000, carbohydratesGScaled: 30_000_000, fatGScaled: 7_500_000 });
    expect(() => previewMeal([{ item: { ...draft.items[0], inputUnit: 'cup' }, revision, portion: null }])).toThrow();
    expect(() => previewMeal([{ item: { ...draft.items[0], requiresReview: true, reviewReason: 'new revision' }, revision, portion: null }])).toThrow();
  });
  test('does not submit an old revision until a current choice explicitly clears review', () => {
    const stale = { ...draft, mode: 'edit' as const, mealId: 'meal-1', items: [{ ...draft.items[0], foodRevisionId: 'revision-old', requiresReview: true, reviewReason: 'new revision' }] };
    expect(() => toMealCommand(stale)).toThrow('Resolve every flagged');
    const accepted = updateMealDraftItem(stale, 'draft-item-0', { foodRevisionId: 'revision-current', inputUnit: 'gram', portionId: null, requiresReview: false, reviewReason: null });
    expect(toMealCommand(accepted).items[0]).toMatchObject({ foodRevisionId: 'revision-current', inputUnit: 'gram' });
  });
});

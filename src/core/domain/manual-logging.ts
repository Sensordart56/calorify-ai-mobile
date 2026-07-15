import { checkedAdd, checkedMultiplyDivideHalfUp } from '@/core/nutrition/fixed-point';

export type CanonicalUnit = 'gram' | 'millilitre' | 'each' | 'serving';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type ResolutionMethod = 'manual' | 'exact' | 'alias' | 'fts' | 'vector' | 'accepted_online';

export class ManualLoggingError extends Error { public constructor(message: string) { super(message); this.name = 'ManualLoggingError'; } }
export class StaleReviewConflict extends ManualLoggingError { public constructor() { super('Reviewed food data is no longer current.'); this.name = 'StaleReviewConflict'; } }

export type Nutrients = Readonly<{ caloriesKcalScaled: number; proteinGScaled: number; carbohydratesGScaled: number; fatGScaled: number; fibreGScaled: number | null; sugarGScaled: number | null; sodiumMgScaled: number | null }>;
export type FoodRevision = Readonly<{ id: string; foodId: string; revisionNumber: number; basisQuantityScaled: number; basisUnit: CanonicalUnit; nutrients: Nutrients; userModified: boolean; source: Readonly<{ provider: string | null; recordId: string | null; datasetVersion: string | null; licenseId: string | null; valuesHash: string | null }> }>;
export type FoodPortion = Readonly<{ id: string; foodId: string; label: string; normalizedLabel: string; quantityScaled: number; equivalentQuantityScaled: number; equivalentUnit: Exclude<CanonicalUnit, 'serving'> }>;

const unitRatios: Readonly<Record<string, Readonly<{ unit: CanonicalUnit; numerator: number; denominator: number }>>> = {
  milligram: { unit: 'gram', numerator: 1, denominator: 1_000 },
  gram: { unit: 'gram', numerator: 1, denominator: 1 },
  kilogram: { unit: 'gram', numerator: 1_000, denominator: 1 },
  millilitre: { unit: 'millilitre', numerator: 1, denominator: 1 },
  litre: { unit: 'millilitre', numerator: 1_000, denominator: 1 },
  each: { unit: 'each', numerator: 1, denominator: 1 },
  serving: { unit: 'serving', numerator: 1, denominator: 1 },
};

export function resolveQuantity(inputQuantityScaled: number, inputUnit: string, portion: FoodPortion | null): Readonly<{ quantityScaled: number; unit: CanonicalUnit }> {
  if (portion !== null && inputUnit === portion.normalizedLabel) {
    return { quantityScaled: checkedMultiplyDivideHalfUp(inputQuantityScaled, portion.equivalentQuantityScaled, portion.quantityScaled), unit: portion.equivalentUnit };
  }
  const ratio = unitRatios[inputUnit];
  if (ratio === undefined) throw new ManualLoggingError('The selected unit is not supported.');
  return { quantityScaled: checkedMultiplyDivideHalfUp(inputQuantityScaled, ratio.numerator, ratio.denominator), unit: ratio.unit };
}

export function calculateItemNutrients(revision: FoodRevision, resolvedQuantityScaled: number, resolvedUnit: CanonicalUnit): Nutrients {
  if (revision.basisUnit !== resolvedUnit) throw new ManualLoggingError('The reviewed unit is incompatible with this food revision.');
  const scale = (value: number | null): number | null => value === null ? null : checkedMultiplyDivideHalfUp(value, resolvedQuantityScaled, revision.basisQuantityScaled);
  return {
    caloriesKcalScaled: scale(revision.nutrients.caloriesKcalScaled) ?? 0,
    proteinGScaled: scale(revision.nutrients.proteinGScaled) ?? 0,
    carbohydratesGScaled: scale(revision.nutrients.carbohydratesGScaled) ?? 0,
    fatGScaled: scale(revision.nutrients.fatGScaled) ?? 0,
    fibreGScaled: scale(revision.nutrients.fibreGScaled), sugarGScaled: scale(revision.nutrients.sugarGScaled), sodiumMgScaled: scale(revision.nutrients.sodiumMgScaled),
  };
}

export function sumRequiredNutrients(items: readonly Nutrients[]): Pick<Nutrients, 'caloriesKcalScaled' | 'proteinGScaled' | 'carbohydratesGScaled' | 'fatGScaled'> {
  return items.reduce((total, item) => ({ caloriesKcalScaled: checkedAdd(total.caloriesKcalScaled, item.caloriesKcalScaled), proteinGScaled: checkedAdd(total.proteinGScaled, item.proteinGScaled), carbohydratesGScaled: checkedAdd(total.carbohydratesGScaled, item.carbohydratesGScaled), fatGScaled: checkedAdd(total.fatGScaled, item.fatGScaled) }), { caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 });
}

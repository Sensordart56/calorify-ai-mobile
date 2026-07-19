import type { DatabaseExecutor, DatabaseMutationResult } from '@/core/database/contracts';
import type { FoodPortion, FoodRevision, MealCategory, Nutrients, ResolutionMethod } from '@/core/domain/manual-logging';

export type ReviewedItem = Readonly<{ foodId: string | null; foodRevisionId: string | null; portionId: string | null; inputName: string; inputQuantityScaled: number; inputUnit: string; resolutionMethod: ResolutionMethod }>;
export type MealCommand = Readonly<{ category: MealCategory; occurredAtUtc: string; localDate: string; timezoneOffsetMinutes: number; items: readonly ReviewedItem[] }>;
export type PersistedItem = Readonly<{ id: string; position: number; revision: FoodRevision; input: ReviewedItem; resolvedQuantityScaled: number; resolvedUnit: FoodRevision['basisUnit']; nutrients: Nutrients }>;

export interface ManualLoggingRepository extends ManualLoggingQuery {
  loadCurrentRevision(transaction: DatabaseExecutor, foodId: string, revisionId: string): Promise<FoodRevision | null>;
  loadFoodState(transaction: DatabaseExecutor, foodId: string): Promise<FoodState | null>;
  loadPortion(transaction: DatabaseExecutor, portionId: string): Promise<FoodPortion | null>;
}

export type RequiredTotals = Pick<Nutrients, 'caloriesKcalScaled' | 'proteinGScaled' | 'carbohydratesGScaled' | 'fatGScaled'>;
export type StoredGoal = Readonly<{ id: string; effectiveLocalDate: string; createdAt: string; updatedAt: string; totals: RequiredTotals }>;
export type HistoryCursor = Readonly<{ localDate: string; occurredAtUtc: string; id: string }>;
export type FoodState = Readonly<{ id: string; canonicalName: string; normalizedName: string; currentRevisionId: string; archivedAt: string | null; createdAt: string; updatedAt: string }>;
export type FoodListItem = Readonly<{ id: string; canonicalName: string; normalizedName: string; currentRevisionId: string; archivedAt: string | null; basisQuantityScaled: number; basisUnit: FoodRevision['basisUnit']; caloriesKcalScaled: number }>;
export type FoodWithCurrentRevision = Readonly<{ state: FoodState; revision: FoodRevision }>;
export type MealHeader = Readonly<{ id: string; category: MealCategory; occurredAtUtc: string; localDate: string; timezoneOffsetMinutes: number; createdAt: string; updatedAt: string; totals: RequiredTotals }>;
export type MealItemSnapshot = Readonly<{ id: string; mealId: string; position: number; foodId: string | null; foodRevisionId: string | null; inputName: string; inputQuantityScaled: number; inputUnit: string; resolvedQuantityScaled: number; resolvedUnit: FoodRevision['basisUnit']; basisQuantityScaled: number; basisUnit: FoodRevision['basisUnit']; nutrients: Nutrients; resolutionMethod: ResolutionMethod; source: FoodRevision['source']; userModified: boolean; createdAt: string }>;
export type MealDetail = Readonly<{ header: MealHeader; items: readonly MealItemSnapshot[] }>;
export type TodaySummary = Readonly<{ meals: readonly MealHeader[]; totals: RequiredTotals }>;
export type TodayDashboard = Readonly<{ localDate: string; summary: TodaySummary; goal: StoredGoal | null }>;
export type HistoryPage = Readonly<{ meals: readonly MealHeader[]; nextCursor: HistoryCursor | null }>;
export interface ManualLoggingQuery {
  listFoods(transaction: DatabaseExecutor, normalizedQuery: string, limit: number): Promise<readonly FoodListItem[]>;
  loadFoodWithCurrentRevision(transaction: DatabaseExecutor, foodId: string): Promise<FoodWithCurrentRevision | null>;
  listPortions(transaction: DatabaseExecutor, foodId: string): Promise<readonly FoodPortion[]>;
  findGoal(transaction: DatabaseExecutor, date: string): Promise<StoredGoal | null>;
  findApplicableGoal(transaction: DatabaseExecutor, date: string): Promise<StoredGoal | null>;
  loadMealHeader(transaction: DatabaseExecutor, mealId: string): Promise<MealHeader | null>;
  mealExists(transaction: DatabaseExecutor, mealId: string): Promise<boolean>;
  loadMealDetail(transaction: DatabaseExecutor, mealId: string): Promise<MealDetail | null>;
  listToday(transaction: DatabaseExecutor, localDate: string): Promise<TodaySummary>;
  listHistory(transaction: DatabaseExecutor, limit: number, cursor: HistoryCursor | null): Promise<HistoryPage>;
}
export interface ManualLoggingWriter {
  insertFood(transaction: DatabaseExecutor, input: Readonly<{ id: string; name: string; normalizedName: string; revision: FoodRevision; now: string }>): Promise<DatabaseMutationResult>;
  insertRevision(transaction: DatabaseExecutor, revision: FoodRevision, now: string): Promise<DatabaseMutationResult>;
  moveCurrentRevision(transaction: DatabaseExecutor, foodId: string, revisionId: string, now: string): Promise<DatabaseMutationResult>;
  setArchive(transaction: DatabaseExecutor, foodId: string, archivedAt: string | null, now: string): Promise<DatabaseMutationResult>;
  insertPortion(transaction: DatabaseExecutor, portion: FoodPortion, now: string): Promise<DatabaseMutationResult>;
  deletePortion(transaction: DatabaseExecutor, portionId: string): Promise<DatabaseMutationResult>;
  insertGoal(transaction: DatabaseExecutor, input: Readonly<{ id: string; date: string; nutrients: RequiredTotals; now: string }>): Promise<DatabaseMutationResult>;
  replaceGoal(transaction: DatabaseExecutor, id: string, date: string, nutrients: RequiredTotals, now: string): Promise<DatabaseMutationResult>;
  insertMeal(transaction: DatabaseExecutor, input: Readonly<{ id: string; command: MealCommand; totals: RequiredTotals; now: string }>): Promise<DatabaseMutationResult>;
  insertMealItem(transaction: DatabaseExecutor, mealId: string, item: PersistedItem, now: string): Promise<DatabaseMutationResult>;
  deleteMealItems(transaction: DatabaseExecutor, mealId: string): Promise<DatabaseMutationResult>;
  updateMeal(transaction: DatabaseExecutor, mealId: string, command: MealCommand, totals: RequiredTotals, now: string): Promise<DatabaseMutationResult>;
  deleteMeal(transaction: DatabaseExecutor, mealId: string): Promise<DatabaseMutationResult>;
  sumPersistedMeal(transaction: DatabaseExecutor, mealId: string): Promise<RequiredTotals>;
}

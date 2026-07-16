import { createContext, type PropsWithChildren, useContext, useMemo, useRef, useState } from 'react';

import { ManualLoggingUseCases } from '@/core/application/manual-logging-use-cases';
import type { FoodListItem } from '@/core/application/manual-logging-ports';
import { ExpoClock } from '@/data/expo-clock';
import { ExpoIdGenerator } from '@/data/expo-id-generator';
import { SqliteManualLoggingRepository } from '@/data/sqlite/manual-logging-repository';
import { useDatabaseConnection } from '@/features/shell/database/database-initialization-gate';

const ManualLoggingContext = createContext<ManualLoggingUseCases | null>(null);

export function ManualLoggingProvider({ children }: PropsWithChildren) {
  const database = useDatabaseConnection();
  const useCases = useMemo(() => {
    const repository = new SqliteManualLoggingRepository();
    return new ManualLoggingUseCases(database, repository, repository, new ExpoIdGenerator(), new ExpoClock());
  }, [database]);
  return <ManualLoggingContext.Provider value={useCases}>{children}</ManualLoggingContext.Provider>;
}

export function useManualLogging(): ManualLoggingUseCases {
  const value = useContext(ManualLoggingContext);
  if (value === null) throw new Error('Manual logging is not ready.');
  return value;
}

export type MealDraftItem = Readonly<{ id: string; foodId: string; foodRevisionId: string; canonicalName: string; inputQuantity: string; inputUnit: string; portionId: string | null; requiresReview: boolean; reviewReason: string | null }>;
export type MealDraft = Readonly<{ mode: 'create' | 'edit'; mealId: string | null; category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'; occurredAtUtc: string; localDate: string; timezoneOffsetMinutes: number; items: readonly MealDraftItem[] }>;

type MealDraftContextValue = Readonly<{
  draft: MealDraft | null;
  beginCreate: () => void;
  beginEdit: (draft: MealDraft) => void;
  addFood: (food: FoodListItem) => void;
  updateItem: (id: string, changes: Partial<Pick<MealDraftItem, 'inputQuantity' | 'inputUnit' | 'portionId' | 'foodRevisionId' | 'canonicalName' | 'requiresReview' | 'reviewReason'>>) => void;
  removeItem: (id: string) => void;
  setCategory: (category: MealDraft['category']) => void;
  clear: () => void;
}>;

const MealDraftContext = createContext<MealDraftContextValue | null>(null);

function createDraft(mode: MealDraft['mode'], mealId: string | null): MealDraft {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return { mode, mealId, category: 'breakfast', occurredAtUtc: now.toISOString(), localDate, timezoneOffsetMinutes: offset, items: [] };
}

export function createMealDraftItemIdFactory(): () => string { let next = 0; return () => `draft-item-${next++}`; }
export function addFoodToDraft(draft: MealDraft, food: FoodListItem, itemId: string): MealDraft { return { ...draft, items: [...draft.items, { id: itemId, foodId: food.id, foodRevisionId: food.currentRevisionId, canonicalName: food.canonicalName, inputQuantity: '1', inputUnit: food.basisUnit, portionId: null, requiresReview: false, reviewReason: null }] }; }
export function updateMealDraftItem(draft: MealDraft, id: string, changes: Partial<Pick<MealDraftItem, 'inputQuantity' | 'inputUnit' | 'portionId' | 'foodRevisionId' | 'canonicalName' | 'requiresReview' | 'reviewReason'>>): MealDraft { return { ...draft, items: draft.items.map((item) => item.id === id ? { ...item, ...changes } : item) }; }
export function removeMealDraftItem(draft: MealDraft, id: string): MealDraft { return { ...draft, items: draft.items.filter((item) => item.id !== id) }; }

export function MealDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const nextItemId = useRef(createMealDraftItemIdFactory());
  const value = useMemo<MealDraftContextValue>(() => ({
    draft,
    beginCreate: () => setDraft(createDraft('create', null)),
    beginEdit: (nextDraft) => setDraft(nextDraft),
    addFood: (food) => setDraft((current) => addFoodToDraft(current ?? createDraft('create', null), food, nextItemId.current())),
    updateItem: (id, changes) => setDraft((current) => current === null ? null : updateMealDraftItem(current, id, changes)),
    removeItem: (id) => setDraft((current) => current === null ? null : removeMealDraftItem(current, id)),
    setCategory: (category) => setDraft((current) => ({ ...(current ?? createDraft('create', null)), category })),
    clear: () => setDraft(null),
  }), [draft]);
  return <MealDraftContext.Provider value={value}>{children}</MealDraftContext.Provider>;
}

export function useMealDraft(): MealDraftContextValue {
  const value = useContext(MealDraftContext);
  if (value === null) throw new Error('Meal draft is not ready.');
  return value;
}

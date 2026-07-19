import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { FoodListItem } from '@/core/application/manual-logging-ports';
import type { FoodPortion, FoodRevision } from '@/core/domain/manual-logging';
import { FoodDetailScreen } from '@/features/foods/screens/food-detail-screen';
import { FoodLibraryScreen } from '@/features/foods/screens/food-library-screen';
import { GoalsScreen } from '@/features/goals/screens/goals-screen';
import { addFoodToDraft, createMealDraftItemIdFactory, removeMealDraftItem, updateMealDraftItem, type MealDraft } from '@/features/shell/manual-logging/manual-logging-provider';

import { LogScreen } from './log-screen';
import { ManualEntryScreen } from './manual-entry-screen';
import { MealDetailScreen } from './meal-detail-screen';
import { ReviewScreen } from './review-screen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockLatestFocusEffect: (() => void | (() => void)) | null = null;
const mockLogging = {
  foods: jest.fn(), food: jest.fn(), portions: jest.fn(), createManualFood: jest.fn(), appendFoodRevision: jest.fn(),
  setFoodArchived: jest.fn(), createPortion: jest.fn(), replaceFoodPortion: jest.fn(), createMeal: jest.fn(),
  editMeal: jest.fn(), mealDetail: jest.fn(), deleteMeal: jest.fn(), applicableGoal: jest.fn(), saveTodayGoal: jest.fn(),
};
let mockDraft: MealDraft | null = null;
const mockItemId = createMealDraftItemIdFactory();
const mockDraftApi = {
  beginCreate: jest.fn(() => { mockDraft = { mode: 'create', mealId: null, category: 'breakfast', occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, items: [] }; }),
  beginEdit: jest.fn((draft: MealDraft) => { mockDraft = draft; }),
  addFood: jest.fn((food: FoodListItem) => { if (mockDraft === null) mockDraftApi.beginCreate(); mockDraft = addFoodToDraft(mockDraft as MealDraft, food, mockItemId()); }),
  updateItem: jest.fn((id: string, changes) => { if (mockDraft !== null) mockDraft = updateMealDraftItem(mockDraft, id, changes); }),
  removeItem: jest.fn((id: string) => { if (mockDraft !== null) mockDraft = removeMealDraftItem(mockDraft, id); }),
  setCategory: jest.fn((category: MealDraft['category']) => { if (mockDraft === null) mockDraftApi.beginCreate(); mockDraft = { ...(mockDraft as MealDraft), category }; }),
  clear: jest.fn(() => { mockDraft = null; }),
};

jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void | (() => void)) => { mockLatestFocusEffect = effect; return jest.requireActual('react').useEffect(effect, [effect]); }, useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }) }));
jest.mock('@/features/shell/manual-logging/manual-logging-provider', () => ({
  ...jest.requireActual('@/features/shell/manual-logging/manual-logging-provider'),
  useManualLogging: () => mockLogging,
  useMealDraft: () => ({ draft: mockDraft, ...mockDraftApi }),
}));

const rice: FoodListItem = { id: 'food-rice', canonicalName: 'Rice', normalizedName: 'rice', currentRevisionId: 'revision-rice', archivedAt: null, basisQuantityScaled: 100_000_000, basisUnit: 'gram', caloriesKcalScaled: 130_000_000 };
const revision: FoodRevision = { id: 'revision-rice', foodId: rice.id, revisionNumber: 1, basisQuantityScaled: 100_000_000, basisUnit: 'gram', nutrients: { caloriesKcalScaled: 130_000_000, proteinGScaled: 2_500_000, carbohydratesGScaled: 28_000_000, fatGScaled: 300_000, fibreGScaled: null, sugarGScaled: null, sodiumMgScaled: null }, userModified: true, source: { provider: null, recordId: null, datasetVersion: null, licenseId: null, valuesHash: null } };
const portion: FoodPortion = { id: 'portion-bowl', foodId: rice.id, label: 'Bowl', normalizedLabel: 'bowl', quantityScaled: 1_000_000, equivalentQuantityScaled: 150_000_000, equivalentUnit: 'gram' };

describe('Log composition screen', () => {
  beforeEach(() => {
    mockDraft = null;
    mockBack.mockReset(); mockPush.mockReset(); mockReplace.mockReset();
    Object.values(mockDraftApi).forEach((value) => value.mockClear());
    Object.values(mockLogging).forEach((value) => value.mockReset());
    mockLogging.foods.mockResolvedValue([rice]);
    mockLogging.food.mockResolvedValue({ state: { id: rice.id, canonicalName: rice.canonicalName, normalizedName: rice.normalizedName, currentRevisionId: rice.currentRevisionId, archivedAt: null, createdAt: '', updatedAt: '' }, revision });
    mockLogging.portions.mockResolvedValue([portion]);
  });

  test('keeps composition on Log while selecting a category, adding, editing, removing, and explicitly reviewing', async () => {
    const view = await render(<LogScreen />);
    await view.findByRole('button', { name: 'Add Rice to meal' });

    await fireEvent.press(view.getByRole('button', { name: 'dinner' }));
    expect(mockDraftApi.setCategory).toHaveBeenCalledWith('dinner');
    await view.rerender(<LogScreen />);
    expect(view.getByRole('button', { name: 'dinner selected' })).toBeOnTheScreen();

    await fireEvent.press(view.getByRole('button', { name: 'Add Rice to meal' }));
    expect(mockPush).not.toHaveBeenCalled();
    await view.rerender(<LogScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Add Rice to meal' }));
    await view.rerender(<LogScreen />);
    expect(mockDraft?.items.map((item) => item.id)).toEqual(['draft-item-0', 'draft-item-1']);
    await waitFor(() => expect(view.getByText('Meal preview')).toBeOnTheScreen());
    expect(view.getByText('Meal preview')).toBeOnTheScreen();

    await fireEvent.changeText(view.getAllByLabelText('Quantity for Rice')[0], '2');
    await fireEvent.press(view.getAllByRole('button', { name: 'Use Bowl' })[0]);
    expect(mockDraftApi.updateItem).toHaveBeenCalledWith('draft-item-0', expect.objectContaining({ inputQuantity: '2' }));
    expect(mockDraftApi.updateItem).toHaveBeenCalledWith('draft-item-0', expect.objectContaining({ portionId: portion.id, inputUnit: 'bowl' }));

    await fireEvent.press(view.getByRole('button', { name: 'Review and save' }));
    expect(mockPush).toHaveBeenCalledWith('/review');

    await fireEvent.press(view.getAllByRole('button', { name: 'Remove Rice' })[0]);
    await view.rerender(<LogScreen />);
    expect(mockDraftApi.removeItem).toHaveBeenCalledWith('draft-item-0');
    await fireEvent.press(view.getByRole('button', { name: 'Add Rice to meal' }));
    await view.rerender(<LogScreen />);
    expect(mockDraft?.items.map((item) => item.id)).toEqual(['draft-item-1', 'draft-item-2']);
  });
});

describe('Manual entry screen', () => {
  beforeEach(() => { Object.values(mockLogging).forEach((value) => value.mockReset()); mockPush.mockReset(); mockLogging.createManualFood.mockResolvedValue('food-rice'); });

  test('uses decimal keyboards, rejects invalid input, accepts zero nutrients, and retains a recoverable save error', async () => {
    const view = await render(<ManualEntryScreen />);
    expect(view.getByLabelText('Calories').props.keyboardType).toBe('decimal-pad');
    await fireEvent.press(view.getByRole('button', { name: 'Save food' }));
    await waitFor(() => expect(view.getByText('Calories is required.')).toBeOnTheScreen());
    for (const [label, value] of [['Food name', 'Rice'], ['Nutrition basis quantity', '100'], ['Basis unit', 'gram'], ['Calories', '0'], ['Protein', '0'], ['Carbohydrates', '0'], ['Fat', '0']] as const) await fireEvent.changeText(view.getByLabelText(label), value);
    mockLogging.createManualFood.mockRejectedValueOnce(new Error('Storage is full'));
    await fireEvent.press(view.getByRole('button', { name: 'Save food' }));
    await waitFor(() => expect(view.getByText('Storage is full')).toBeOnTheScreen());
    expect(view.getByLabelText('Food name').props.value).toBe('Rice');
    await fireEvent.press(view.getByRole('button', { name: 'Save food' }));
    await waitFor(() => expect(mockLogging.createManualFood).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rice', nutrients: expect.objectContaining({ caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 }) })));
  });
});

describe('Food Library screen', () => {
  beforeEach(() => { Object.values(mockLogging).forEach((value) => value.mockReset()); mockPush.mockReset(); });

  test('shows loading and archived results, navigates to detail, and retries a failed lookup', async () => {
    mockLogging.foods.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ ...rice, archivedAt: '2026-07-16T00:00:00.000Z' }]);
    const view = await render(<FoodLibraryScreen />);
    await waitFor(() => expect(view.getByRole('button', { name: 'Retry food library' })).toBeOnTheScreen());
    await fireEvent.press(view.getByRole('button', { name: 'Retry food library' }));
    await waitFor(() => expect(view.getByLabelText('View Rice, archived')).toBeOnTheScreen());
    await fireEvent.press(view.getByLabelText('View Rice, archived'));
    expect(mockPush).toHaveBeenCalledWith('/food-detail?foodId=food-rice');
    expect(view.getByText('Archived foods stay visible but cannot be selected for a new meal until restored.')).toBeOnTheScreen();
  });

  test('reloads current revision summaries whenever the library regains focus', async () => {
    mockLogging.foods.mockResolvedValueOnce([rice]).mockResolvedValueOnce([{ ...rice, caloriesKcalScaled: 140_000_000 }]);
    const view = await render(<FoodLibraryScreen />);
    await view.findByText('130 calories per basis');
    await act(async () => { mockLatestFocusEffect?.(); });
    await waitFor(() => expect(view.getByText('140 calories per basis')).toBeOnTheScreen());
    expect(mockLogging.foods).toHaveBeenCalledTimes(2);
  });
});

describe('Food Detail screen', () => {
  beforeEach(() => {
    Object.values(mockLogging).forEach((value) => value.mockReset());
    mockLogging.food.mockResolvedValue({ state: { id: rice.id, canonicalName: rice.canonicalName, normalizedName: rice.normalizedName, currentRevisionId: revision.id, archivedAt: null, createdAt: '', updatedAt: '' }, revision });
    mockLogging.portions.mockResolvedValue([portion]);
    mockLogging.appendFoodRevision.mockRejectedValue(new Error('Reviewed food data is no longer current.'));
    mockLogging.setFoodArchived.mockResolvedValue(undefined);
    mockLogging.createPortion.mockResolvedValue('portion-new');
    mockLogging.replaceFoodPortion.mockResolvedValue('portion-new');
  });

  test('loads authoritative values, preserves the canonical name for immutable revisions, handles stale errors, archive, and portions', async () => {
    const view = await render(<FoodDetailScreen foodId={rice.id} />);
    await view.findByText('Food name: Rice');
    expect(view.queryByLabelText('Food name')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Save new revision' }));
    await waitFor(() => expect(mockLogging.appendFoodRevision).toHaveBeenCalledWith(rice.id, revision.id, expect.objectContaining({ name: 'Rice' })));
    expect(view.getByText('Reviewed food data is no longer current.')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'Archive food' }));
    await waitFor(() => expect(mockLogging.setFoodArchived).toHaveBeenCalledWith(rice.id, true));
    for (const [label, value] of [['Portion label', 'Cup'], ['Portion quantity', '1'], ['Equivalent quantity', '150'], ['Equivalent unit', 'gram']] as const) await fireEvent.changeText(view.getByLabelText(label), value);
    await fireEvent.press(view.getByRole('button', { name: 'Add portion' }));
    await waitFor(() => expect(mockLogging.createPortion).toHaveBeenCalledWith(rice.id, expect.objectContaining({ label: 'Cup' })));
    await fireEvent.press(view.getByRole('button', { name: 'Replace Bowl' }));
    await fireEvent.press(view.getByRole('button', { name: 'Save replacement' }));
    await waitFor(() => expect(mockLogging.replaceFoodPortion).toHaveBeenCalledWith(rice.id, portion.id, expect.anything()));
  });

  test('offers a retry after an unavailable food load', async () => {
    mockLogging.food.mockRejectedValueOnce(new Error('offline'));
    const view = await render(<FoodDetailScreen foodId={rice.id} />);
    await waitFor(() => expect(view.getByRole('button', { name: 'Retry food details' })).toBeOnTheScreen());
    await fireEvent.press(view.getByRole('button', { name: 'Retry food details' }));
    await waitFor(() => expect(view.getByText('Food name: Rice')).toBeOnTheScreen());
  });
});

describe('Review screen', () => {
  beforeEach(() => {
    Object.values(mockLogging).forEach((value) => value.mockReset()); mockBack.mockReset(); mockPush.mockReset(); mockReplace.mockReset();
    mockLogging.food.mockResolvedValue({ state: { id: rice.id, canonicalName: rice.canonicalName, normalizedName: rice.normalizedName, currentRevisionId: revision.id, archivedAt: null, createdAt: '', updatedAt: '' }, revision });
    mockLogging.portions.mockResolvedValue([portion]);
    mockLogging.createMeal.mockRejectedValueOnce(new Error('Storage is full')).mockResolvedValue('meal-1');
  });

  test('previews authoritative totals, flags stale items for explicit resolution, and retries a create save failure', async () => {
    mockDraft = { mode: 'create', mealId: null, category: 'lunch', occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, items: [{ id: 'review-item', foodId: rice.id, foodRevisionId: 'revision-old', canonicalName: rice.canonicalName, inputQuantity: '100', inputUnit: 'gram', portionId: null, requiresReview: true, reviewReason: 'This food has a newer nutrition revision.' }] };
    const flagged = await render(<ReviewScreen />);
    await flagged.findByText('This food has a newer nutrition revision.');
    expect(flagged.getByRole('button', { name: 'Save meal' })).toBeDisabled();
    await fireEvent.press(flagged.getByRole('button', { name: 'Accept current basis unit' }));
    expect(mockDraftApi.updateItem).toHaveBeenCalledWith('review-item', expect.objectContaining({ foodRevisionId: revision.id, requiresReview: false }));

    mockDraft = { ...mockDraft, items: [{ ...mockDraft.items[0], foodRevisionId: revision.id, requiresReview: false, reviewReason: null }] };
    const saving = await render(<ReviewScreen />);
    await saving.findByText('Preview totals');
    expect(saving.getAllByText(/130 calories/).length).toBeGreaterThan(0);
    await fireEvent.press(saving.getByRole('button', { name: 'Save meal' }));
    await waitFor(() => expect(saving.getByText('Storage is full')).toBeOnTheScreen());
    await fireEvent.press(saving.getByRole('button', { name: 'Save meal' }));
    await waitFor(() => expect(mockLogging.createMeal).toHaveBeenCalledTimes(2));
    expect(mockReplace).toHaveBeenCalledWith('/meal-detail?mealId=meal-1');
  });

  test('returns to the existing Meal Detail after saving an edit', async () => {
    mockLogging.editMeal.mockResolvedValue(undefined);
    mockDraft = { mode: 'edit', mealId: 'meal-1', category: 'lunch', occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, items: [{ id: 'review-item', foodId: rice.id, foodRevisionId: revision.id, canonicalName: rice.canonicalName, inputQuantity: '100', inputUnit: 'gram', portionId: null, requiresReview: false, reviewReason: null }] };
    const view = await render(<ReviewScreen />);
    await view.findByText('Preview totals');

    await fireEvent.press(view.getByRole('button', { name: 'Save meal changes' }));

    await waitFor(() => expect(mockLogging.editMeal).toHaveBeenCalledWith('meal-1', expect.anything()));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

const mealDetail = {
  header: { id: 'meal-1', category: 'lunch' as const, occurredAtUtc: '2026-07-16T00:00:00.000Z', localDate: '2026-07-16', timezoneOffsetMinutes: 330, createdAt: '', updatedAt: '', totals: { caloriesKcalScaled: 130_000_000, proteinGScaled: 2_500_000, carbohydratesGScaled: 28_000_000, fatGScaled: 300_000 } },
  items: [{ id: 'snapshot-1', mealId: 'meal-1', position: 0, foodId: rice.id, foodRevisionId: 'revision-old', inputName: 'Saved rice', inputQuantityScaled: 100_000_000, inputUnit: 'gram', resolvedQuantityScaled: 100_000_000, resolvedUnit: 'gram' as const, basisQuantityScaled: 100_000_000, basisUnit: 'gram' as const, nutrients: revision.nutrients, resolutionMethod: 'manual' as const, source: revision.source, userModified: true, createdAt: '' }],
};

describe('Meal Detail screen', () => {
  beforeEach(() => {
    Object.values(mockLogging).forEach((value) => value.mockReset()); mockBack.mockReset(); mockPush.mockReset();
    mockLogging.mealDetail.mockResolvedValue(mealDetail); mockLogging.food.mockResolvedValue({ state: { id: rice.id, canonicalName: rice.canonicalName, normalizedName: rice.normalizedName, currentRevisionId: revision.id, archivedAt: null, createdAt: '', updatedAt: '' }, revision }); mockLogging.portions.mockResolvedValue([]); mockLogging.deleteMeal.mockResolvedValue(undefined);
  });

  test('displays persisted snapshots, prepares flagged edits for re-review, and confirms deletion', async () => {
    const view = await render(<MealDetailScreen mealId="meal-1" />);
    await view.findByText('Saved rice');
    expect(view.getAllByText(/130 calories/).length).toBeGreaterThan(0);
    await fireEvent.press(view.getByRole('button', { name: 'Edit meal' }));
    await waitFor(() => expect(mockDraftApi.beginEdit).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ requiresReview: true })] })));
    expect(mockPush).toHaveBeenCalledWith('/review');
    await fireEvent.press(view.getByRole('button', { name: 'Delete meal' }));
    await fireEvent.press(view.getByRole('button', { name: 'Confirm delete meal' }));
    await waitFor(() => expect(mockLogging.deleteMeal).toHaveBeenCalledWith('meal-1'));
  });

  test('shows not-found and retries an unavailable meal', async () => {
    const missing = new Error('missing'); missing.name = 'NotFoundError';
    mockLogging.mealDetail.mockRejectedValueOnce(missing).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(mealDetail);
    const notFound = await render(<MealDetailScreen mealId="missing" />);
    await waitFor(() => expect(notFound.getByText('Meal not found')).toBeOnTheScreen());
    const retry = await render(<MealDetailScreen mealId="meal-1" />);
    await waitFor(() => expect(retry.getByRole('button', { name: 'Retry' })).toBeOnTheScreen());
    await fireEvent.press(retry.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(retry.getByText('Saved rice')).toBeOnTheScreen());
  });

  test('reloads authoritative snapshots whenever Meal Detail regains focus', async () => {
    const editedDetail = { ...mealDetail, header: { ...mealDetail.header, totals: { ...mealDetail.header.totals, caloriesKcalScaled: 140_000_000 } } };
    mockLogging.mealDetail.mockResolvedValueOnce(mealDetail).mockResolvedValueOnce(editedDetail);
    const view = await render(<MealDetailScreen mealId="meal-1" />);
    await waitFor(() => expect(view.getAllByText(/130 calories/)).toHaveLength(2));

    await act(async () => { mockLatestFocusEffect?.(); });

    await waitFor(() => expect(view.getByText(/140 calories/)).toBeOnTheScreen());
  });
});

describe('Goals screen', () => {
  beforeEach(() => { Object.values(mockLogging).forEach((value) => value.mockReset()); mockLogging.applicableGoal.mockResolvedValue(null); mockLogging.saveTodayGoal.mockResolvedValue(undefined); });

  test('shows no-goal and current-goal states, accepts zero macros, replaces today, and retries a failed lookup', async () => {
    const view = await render(<GoalsScreen />);
    await view.findByText('No current goal');
    for (const [label, value] of [['Calories', '2000'], ['Protein', '0'], ['Carbohydrates', '0'], ['Fat', '0']] as const) await fireEvent.changeText(view.getByLabelText(label), value);
    await fireEvent.press(view.getByRole('button', { name: /Save today/ }));
    await waitFor(() => expect(mockLogging.saveTodayGoal).toHaveBeenCalledWith({ caloriesKcalScaled: 2_000_000_000, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 }));

    mockLogging.applicableGoal.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'goal-1', effectiveLocalDate: '2026-07-16', createdAt: '', updatedAt: '', totals: { caloriesKcalScaled: 2_000_000_000, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 } });
    const retry = await render(<GoalsScreen />);
    await waitFor(() => expect(retry.getByRole('button', { name: 'Retry goal' })).toBeOnTheScreen());
    await fireEvent.press(retry.getByRole('button', { name: 'Retry goal' }));
    await waitFor(() => expect(retry.getByLabelText('Calories').props.value).toBe('2000'));
  });
});

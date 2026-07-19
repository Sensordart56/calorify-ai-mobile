import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { HistoryPage, MealHeader } from '@/core/application/manual-logging-ports';
import { HISTORY_PAGE_SIZE, HistoryScreen } from './history-screen';

const mockPush = jest.fn();
const mockHistory = jest.fn<Promise<HistoryPage>, [number, HistoryPage['nextCursor']]>();
let mockLatestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => { mockLatestFocusEffect = effect; },
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/features/shell/manual-logging/manual-logging-provider', () => ({
  useManualLogging: () => ({ history: mockHistory }),
}));

function meal(id: string, localDate: string, occurredAtUtc: string): MealHeader {
  return { id, localDate, occurredAtUtc, category: 'dinner', timezoneOffsetMinutes: 330, createdAt: occurredAtUtc, updatedAt: occurredAtUtc, totals: { caloriesKcalScaled: 600_000_000, proteinGScaled: 20_000_000, carbohydratesGScaled: 30_000_000, fatGScaled: 10_000_000 } };
}

const first = meal('meal-1', '2026-07-19', '2026-07-19T18:00:00.000Z');
const tied = meal('meal-2', '2026-07-19', '2026-07-19T18:00:00.000Z');
const older = meal('meal-3', '2026-07-18', '2026-07-18T18:00:00.000Z');
const cursor = { localDate: first.localDate, occurredAtUtc: first.occurredAtUtc, id: first.id };

describe('HistoryScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockHistory.mockReset();
    mockHistory.mockResolvedValue({ meals: [], nextCursor: null });
    mockLatestFocusEffect = null;
  });

  test('groups saved dates, pages with the cursor, deduplicates, and opens Meal Detail by ID', async () => {
    mockHistory.mockResolvedValueOnce({ meals: [first], nextCursor: cursor }).mockResolvedValueOnce({ meals: [first, tied, older], nextCursor: null });
    const view = await render(<HistoryScreen />);
    expect(view.getByLabelText('Loading history. Reading saved meals from this device.')).toHaveProp('accessibilityState', { busy: true });
    await act(async () => { mockLatestFocusEffect?.(); });
    expect(await view.findByRole('header', { name: '2026-07-19' })).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'Load more meals' }));
    await waitFor(() => expect(view.getByRole('header', { name: '2026-07-18' })).toBeOnTheScreen());
    expect(view.getAllByRole('button', { name: /Open dinner meal/ })).toHaveLength(3);
    expect(mockHistory).toHaveBeenNthCalledWith(1, HISTORY_PAGE_SIZE, null);
    expect(mockHistory).toHaveBeenNthCalledWith(2, HISTORY_PAGE_SIZE, cursor);
    expect(view.getByText('End of history')).toBeOnTheScreen();
    await fireEvent.press(view.getAllByRole('button', { name: /Open dinner meal/ })[1]);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal-detail', params: { mealId: 'meal-2' } });
  });

  test('retries initial and load-more failures without discarding rows', async () => {
    mockHistory.mockRejectedValueOnce(new Error('storage'));
    const view = await render(<HistoryScreen />);
    await act(async () => { mockLatestFocusEffect?.(); });
    expect(await view.findByLabelText('History unavailable. Try again. Your saved meals were not changed.')).toBeOnTheScreen();
    mockHistory.mockResolvedValueOnce({ meals: [first], nextCursor: cursor });
    await fireEvent.press(view.getByRole('button', { name: 'Retry history' }));
    expect(await view.findByRole('button', { name: /Open dinner meal/ })).toBeOnTheScreen();
    mockHistory.mockRejectedValueOnce(new Error('storage'));
    await fireEvent.press(view.getByRole('button', { name: 'Load more meals' }));
    expect(await view.findByRole('alert')).toHaveTextContent('More history could not be loaded. Existing meals remain available.');
    expect(view.getByRole('button', { name: /Open dinner meal/ })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Retry load more' })).toBeOnTheScreen();
  });

  test('refocus replaces page one and a failed refresh retains successful content', async () => {
    mockHistory.mockResolvedValueOnce({ meals: [first, older], nextCursor: null });
    const view = await render(<HistoryScreen />);
    await act(async () => { mockLatestFocusEffect?.(); });
    await view.findByRole('header', { name: '2026-07-18' });
    mockHistory.mockResolvedValueOnce({ meals: [tied], nextCursor: null });
    await act(async () => { mockLatestFocusEffect?.(); });
    await waitFor(() => expect(view.queryByRole('header', { name: '2026-07-18' })).not.toBeOnTheScreen());
    mockHistory.mockRejectedValueOnce(new Error('storage'));
    await fireEvent.press(view.getByRole('button', { name: 'Refresh history' }));
    expect(await view.findByRole('alert')).toHaveTextContent('History could not be refreshed. Your saved meals were not changed.');
    expect(view.getByRole('button', { name: /Open dinner meal/ })).toBeOnTheScreen();
  });
});

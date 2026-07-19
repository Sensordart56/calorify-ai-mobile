import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { TodayDashboard } from '@/core/application/manual-logging-ports';
import { TodayScreen } from '@/features/dashboard/screens/today-screen';

const mockPush = jest.fn();
const mockTodayDashboard = jest.fn<Promise<TodayDashboard>, []>();
let mockLatestFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockLatestFocusEffect = effect;
  },
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/features/shell/manual-logging/manual-logging-provider', () => ({
  useManualLogging: () => ({ todayDashboard: mockTodayDashboard }),
}));

const meal = {
  id: 'meal-1', category: 'lunch' as const, occurredAtUtc: '2026-07-19T12:00:00.000Z', localDate: '2026-07-19', timezoneOffsetMinutes: 330,
  createdAt: '2026-07-19T12:00:00.000Z', updatedAt: '2026-07-19T12:00:00.000Z',
  totals: { caloriesKcalScaled: 500_000_000, proteinGScaled: 20_000_000, carbohydratesGScaled: 30_000_000, fatGScaled: 10_000_000 },
};
const dashboard: TodayDashboard = {
  localDate: '2026-07-19',
  summary: { meals: [meal], totals: meal.totals },
  goal: {
    id: 'goal-1', effectiveLocalDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
    totals: { caloriesKcalScaled: 2_000_000_000, proteinGScaled: 0, carbohydratesGScaled: 30_000_000, fatGScaled: 5_000_000 },
  },
};

describe('TodayScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockTodayDashboard.mockReset();
    mockTodayDashboard.mockResolvedValue(dashboard);
    mockLatestFocusEffect = null;
  });

  test('renders SQLite totals, goal states, and opaque Meal Detail navigation', async () => {
    const view = await render(<TodayScreen />);
    expect(view.getByLabelText('Loading Today. Reading saved meals and goals from this device.')).toHaveProp('accessibilityState', { busy: true });
    await act(async () => { mockLatestFocusEffect?.(); });
    expect(await view.findAllByText('500 calories · 20.0 g protein · 30.0 g carbohydrates · 10.0 g fat')).toHaveLength(2);
    expect(view.getByRole('progressbar', { name: 'Calories goal progress' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 25, text: '500 of 2000. 25%.' });
    expect(view.getByText('20.0 g consumed · No target set')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: /Open lunch meal/ }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/meal-detail', params: { mealId: 'meal-1' } });
  });

  test('shows persisted empty state and retries an initial error', async () => {
    mockTodayDashboard.mockRejectedValueOnce(new Error('storage'));
    const view = await render(<TodayScreen />);
    await act(async () => { mockLatestFocusEffect?.(); });
    expect(await view.findByLabelText('Today unavailable. Try again. Your saved meals and goals were not changed.')).toBeOnTheScreen();
    mockTodayDashboard.mockResolvedValueOnce({ ...dashboard, summary: { meals: [], totals: { caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 } }, goal: null });
    await fireEvent.press(view.getByRole('button', { name: 'Retry Today' }));
    expect(await view.findByLabelText('No meals saved today. Log a meal manually when you are ready.')).toBeOnTheScreen();
    expect(view.getByLabelText('No goal applies today. Add a daily goal when you are ready.')).toBeOnTheScreen();
  });

  test('refocus replaces content and refresh failure retains the last successful dashboard', async () => {
    const view = await render(<TodayScreen />);
    await act(async () => { mockLatestFocusEffect?.(); });
    await view.findByText('Saved locally for 2026-07-19.');
    mockTodayDashboard.mockResolvedValueOnce({ ...dashboard, localDate: '2026-07-20' });
    await act(async () => { mockLatestFocusEffect?.(); });
    await waitFor(() => expect(view.getByText('Saved locally for 2026-07-20.')).toBeOnTheScreen());
    mockTodayDashboard.mockRejectedValueOnce(new Error('storage'));
    await fireEvent.press(view.getByRole('button', { name: 'Refresh Today' }));
    expect(await view.findByRole('alert')).toHaveTextContent('Today could not be refreshed. Your saved data was not changed.');
    expect(view.getByText('Saved locally for 2026-07-20.')).toBeOnTheScreen();
  });
});

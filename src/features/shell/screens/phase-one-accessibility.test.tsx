import { fireEvent, render } from '@testing-library/react-native';

import { TodayScreen } from '@/features/dashboard/screens/today-screen';
import { FoodLibraryScreen } from '@/features/foods/screens/food-library-screen';
import { GoalsScreen } from '@/features/goals/screens/goals-screen';
import { HistoryScreen } from '@/features/history/screens/history-screen';
import { LogScreen } from '@/features/logging/screens/log-screen';
import { ManualEntryScreen } from '@/features/logging/screens/manual-entry-screen';
import { ReviewScreen } from '@/features/logging/screens/review-screen';
import { AboutDataSourcesScreen } from '@/features/settings/screens/about-data-sources-screen';
import { ModelsScreen } from '@/features/settings/screens/models-screen';
import { SettingsScreen } from '@/features/settings/screens/settings-screen';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/state-panels';

const mockPush = jest.fn();
const mockManualLogging = {
  foods: async () => [],
  applicableGoal: async () => null,
  todayDashboard: async () => ({ localDate: '2026-07-19', summary: { meals: [], totals: { caloriesKcalScaled: 0, proteinGScaled: 0, carbohydratesGScaled: 0, fatGScaled: 0 } }, goal: null }),
  history: async () => ({ meals: [], nextCursor: null }),
};
const mockMealDraft = { draft: null, beginCreate: jest.fn(), beginEdit: jest.fn(), addFood: jest.fn(), updateItem: jest.fn(), removeItem: jest.fn(), setCategory: jest.fn(), clear: jest.fn() };

jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]), useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/shell/manual-logging/manual-logging-provider', () => ({
  useManualLogging: () => mockManualLogging,
  useMealDraft: () => mockMealDraft,
}));

describe('Phase 1 presentation screens', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  test.each([
    ['Today', TodayScreen], ['Log', LogScreen], ['History', HistoryScreen], ['Settings', SettingsScreen],
    ['Review meal', ReviewScreen], ['Manual food', ManualEntryScreen], ['Goals', GoalsScreen],
    ['Food Library', FoodLibraryScreen], ['Models', ModelsScreen], ['About and Data Sources', AboutDataSourcesScreen],
  ])('exposes an accessible heading for %s', async (heading, Component) => {
    const view = await render(<Component />);
    expect(view.getByRole('header', { name: heading })).toBeOnTheScreen();
  });

  test('navigates from Today actions to their exact destinations', async () => {
    const view = await render(<TodayScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'View goals' }));
    expect(mockPush).toHaveBeenLastCalledWith('/goals');
    await fireEvent.press(view.getByRole('button', { name: 'Log meal' }));
    expect(mockPush).toHaveBeenLastCalledWith('/log');
    await fireEvent.press(view.getByRole('button', { name: 'Enter food manually' }));
    expect(mockPush).toHaveBeenLastCalledWith('/manual-entry');
  });

  test('navigates from Log to manual food creation', async () => {
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Create a manual food' }));
    expect(mockPush).toHaveBeenLastCalledWith('/manual-entry');
  });

  test('navigates from Settings to every secondary destination', async () => {
    const view = await render(<SettingsScreen />);
    const destinations = [
      ['Goals', '/goals'],
      ['Food Library', '/food-library'],
      ['Models', '/models'],
      ['About and Data Sources', '/about-data-sources'],
    ] as const;
    for (const [label, destination] of destinations) {
      await fireEvent.press(view.getByRole('button', { name: label }));
      expect(mockPush).toHaveBeenLastCalledWith(destination);
    }
  });

  test('labels persisted Today empty states without fixture nutrition', async () => {
    const view = await render(<TodayScreen />);
    expect(await view.findByLabelText('No meals saved today. Log a meal manually when you are ready.')).toBeOnTheScreen();
    expect(view.queryByText(/fixture/i)).not.toBeOnTheScreen();
  });

  test('gives empty, loading, and error states accessible summaries', async () => {
    const view = await render(<><EmptyState title="Empty" body="Nothing here" /><LoadingState title="Loading" body="Please wait" /><ErrorState title="Problem" body="Try again" /></>);
    expect(view.getByLabelText('Empty. Nothing here')).toBeOnTheScreen();
    expect(view.getByLabelText('Loading. Please wait')).toBeOnTheScreen();
    expect(view.getByLabelText('Problem. Try again')).toBeOnTheScreen();
  });
});

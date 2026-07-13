import { render } from '@testing-library/react-native';

import { TodayScreen } from '@/features/dashboard/screens/today-screen';

describe('TodayScreen', () => {
  test('presents the manual-first foundation accessibly', async () => {
    const view = await render(<TodayScreen />);

    expect(view.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(view.getByLabelText('Manual logging is the foundation')).toBeOnTheScreen();
  });
});

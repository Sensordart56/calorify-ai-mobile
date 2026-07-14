import { render } from '@testing-library/react-native';

import { TodayScreen } from '@/features/dashboard/screens/today-screen';

describe('TodayScreen', () => {
  test('presents the fixture shell and manual entry accessibly', async () => {
    const view = await render(<TodayScreen />);

    expect(view.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Enter food manually' })).toBeOnTheScreen();
    expect(view.getByLabelText('Status: Fixture/demo content')).toBeOnTheScreen();
  });
});

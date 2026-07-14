import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DatabaseConnection } from '@/core/database/contracts';
import { RecoveryVerification } from './recovery-verification';

const mockReleaseConnection = jest.fn(async () => undefined);
const mockInitializeDatabase = jest.fn(async () => undefined);
let capturedInitialize: ((connection: DatabaseConnection, appVersion: string) => Promise<void>) | undefined;
let capturedRealInitializerArguments: readonly unknown[] = [];

jest.mock('./database-initialization-gate', () => ({
  DatabaseInitializationGate: ({
    children,
    onConnectionReady,
    initialize,
  }: {
    readonly children: ReactNode;
    readonly onConnectionReady?: (release: () => Promise<void>) => void;
    readonly initialize: (connection: DatabaseConnection, appVersion: string) => Promise<void>;
  }) => {
    capturedInitialize = initialize;
    onConnectionReady?.(mockReleaseConnection);
    return children;
  },
}));

jest.mock('@/data/sqlite/migration-runner', () => ({
  initializeDatabase: (...args: unknown[]) => {
    capturedRealInitializerArguments = args;
    return mockInitializeDatabase();
  },
}));

describe('recovery verification cleanup', () => {
  beforeEach(() => {
    mockReleaseConnection.mockReset();
    mockReleaseConnection.mockResolvedValue(undefined);
    mockInitializeDatabase.mockReset();
    mockInitializeDatabase.mockResolvedValue(undefined);
    capturedInitialize = undefined;
    capturedRealInitializerArguments = [];
  });

  test('injects exactly one failure, then calls the real initializer on the next attempt', async () => {
    const resetRecoveryDatabase = jest.fn(async () => undefined);
    const view = await render(<RecoveryVerification onReturn={() => undefined} resetRecoveryDatabase={resetRecoveryDatabase} />);
    await waitFor(() => expect(capturedInitialize).toBeDefined());
    if (capturedInitialize === undefined) throw new Error('The recovery initializer was not captured.');
    const connection = {} as DatabaseConnection;

    await expect(capturedInitialize(connection, '1.0.0')).rejects.toMatchObject({ category: 'migration' });
    await capturedInitialize(connection, '1.0.0');

    expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
    expect(capturedRealInitializerArguments).toEqual([connection, '1.0.0', undefined, undefined, expect.any(Function)]);
    view.unmount();
  });

  test('retains the disposable database on uncontrolled unmount instead of racing the gate cleanup', async () => {
    const resetRecoveryDatabase = jest.fn(async () => undefined);
    const view = await render(<RecoveryVerification onReturn={() => undefined} resetRecoveryDatabase={resetRecoveryDatabase} />);
    await waitFor(() => expect(resetRecoveryDatabase).toHaveBeenCalledTimes(1));

    await act(async () => {
      view.unmount();
    });

    expect(mockReleaseConnection).not.toHaveBeenCalled();
    expect(resetRecoveryDatabase).toHaveBeenCalledTimes(1);
  });

  test('releases the connection before explicitly resetting the disposable database', async () => {
    const order: string[] = [];
    mockReleaseConnection.mockImplementation(async () => { order.push('release'); });
    const resetRecoveryDatabase = jest.fn(async () => { order.push('reset'); });
    const onReturn = jest.fn();
    const view = await render(<RecoveryVerification onReturn={onReturn} resetRecoveryDatabase={resetRecoveryDatabase} />);
    expect(await view.findByRole('button', { name: 'Return to database cases' })).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Return to database cases' }));
    });

    await waitFor(() => expect(onReturn).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['reset', 'release', 'reset']);
  });
});

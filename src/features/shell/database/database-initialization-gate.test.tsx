import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { DatabaseConnection } from '@/core/database/contracts';
import { DatabaseInitializationError } from '@/core/database/errors';
import { DatabaseInitializationGate } from './database-initialization-gate';

const mockOpenExpoDatabase = jest.fn();

jest.mock('@/data/sqlite/expo-sqlite-database', () => ({ openExpoDatabase: (...args: unknown[]) => mockOpenExpoDatabase(...args) }));

function createConnection(): DatabaseConnection {
  return {
    exec: jest.fn(async () => undefined),
    run: jest.fn(async () => undefined),
    first: jest.fn(async () => null),
    all: jest.fn(async () => []),
    withExclusiveTransaction: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  mockOpenExpoDatabase.mockReset();
});

test('shows an accessible local database loading state', async () => {
  const opening = deferred<DatabaseConnection>();
  const connection = createConnection();
  mockOpenExpoDatabase.mockReturnValue(opening.promise);
  const view = await render(<DatabaseInitializationGate><></></DatabaseInitializationGate>);
  await waitFor(() => expect(mockOpenExpoDatabase).toHaveBeenCalledTimes(1));
  expect(view.getByRole('header', { name: 'Preparing Calorify AI' })).toBeOnTheScreen();
  expect(view.getByLabelText(/Local database/)).toBeOnTheScreen();
  await act(async () => {
    view.unmount();
    opening.resolve(connection);
  });
  await waitFor(() => expect(connection.close).toHaveBeenCalledTimes(1));
});

test('closes an opened connection exactly once when unmounted before opening resolves', async () => {
  const opening = deferred<DatabaseConnection>();
  const connection = createConnection();
  mockOpenExpoDatabase.mockReturnValue(opening.promise);
  const view = await render(<DatabaseInitializationGate><></></DatabaseInitializationGate>);
  await waitFor(() => expect(mockOpenExpoDatabase).toHaveBeenCalledTimes(1));
  await act(async () => {
    view.unmount();
    opening.resolve(connection);
  });
  await waitFor(() => expect(connection.close).toHaveBeenCalledTimes(1));
});

test('shows the recoverable integrity-failure presentation without normal navigation and closes the connection', async () => {
  const connection = createConnection();
  mockOpenExpoDatabase.mockResolvedValue(connection);
  const initialize = jest.fn(async () => { throw new DatabaseInitializationError('integrity', 'foreign_key_check returned a violation'); });
  const view = await render(<DatabaseInitializationGate initialize={initialize} resolveApplicationVersion={() => '1.0.0'}><Text>Ready</Text></DatabaseInitializationGate>);
  expect(await view.findByRole('header', { name: 'Local database needs attention' })).toBeOnTheScreen();
  expect(view.queryByText('Ready')).toBeNull();
  expect(connection.close).toHaveBeenCalledTimes(1);
});

test('reports only the classified category and an optional development diagnostic', async () => {
  const connection = createConnection();
  const onInitializationFailure = jest.fn();
  mockOpenExpoDatabase.mockResolvedValue(connection);
  const view = await render(
    <DatabaseInitializationGate
      initialize={async () => { throw new DatabaseInitializationError('integrity', 'foreign_key_check returned a violation'); }}
      resolveApplicationVersion={() => '1.0.0'}
      onInitializationFailure={onInitializationFailure}
      developmentFailureDiagnostic={{ category: 'integrity', step: 'integrity-check' }}
    ><Text>Ready</Text></DatabaseInitializationGate>,
  );
  expect(await view.findByText('Recovery retry stopped during integrity-check (integrity).')).toBeOnTheScreen();
  expect(onInitializationFailure).toHaveBeenCalledWith(expect.objectContaining({ category: 'integrity' }));
});

test('retries a failed initialization and closes each connection once', async () => {
  const first = createConnection();
  const second = createConnection();
  mockOpenExpoDatabase.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  const initialize = jest.fn()
    .mockRejectedValueOnce(new Error('migration failed'))
    .mockResolvedValueOnce(undefined);
  const view = await render(<DatabaseInitializationGate initialize={initialize} resolveApplicationVersion={() => '1.0.0'}><Text>Ready</Text></DatabaseInitializationGate>);
  expect(await view.findByRole('button', { name: 'Retry database setup' })).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(view.getByRole('button', { name: 'Retry database setup' }));
  });
  expect(await view.findByText('Ready')).toBeOnTheScreen();
  expect(first.close).toHaveBeenCalledTimes(1);
  view.unmount();
  await waitFor(() => expect(second.close).toHaveBeenCalledTimes(1));
});

test('provides a release function that closes a ready connection exactly once', async () => {
  const connection = createConnection();
  let release: (() => Promise<void>) | undefined;
  mockOpenExpoDatabase.mockResolvedValue(connection);
  const view = await render(
    <DatabaseInitializationGate
      initialize={async () => undefined}
      onConnectionReady={(providedRelease) => { release = providedRelease; }}
      resolveApplicationVersion={() => '1.0.0'}
    ><Text>Ready</Text></DatabaseInitializationGate>,
  );
  expect(await view.findByText('Ready')).toBeOnTheScreen();
  if (release === undefined) throw new Error('The gate did not provide a release function.');
  await release();
  expect(connection.close).toHaveBeenCalledTimes(1);
  view.unmount();
  await waitFor(() => expect(connection.close).toHaveBeenCalledTimes(1));
});

test('fails safely when no valid configured application version is available', async () => {
  const connection = createConnection();
  mockOpenExpoDatabase.mockResolvedValue(connection);
  const view = await render(<DatabaseInitializationGate resolveApplicationVersion={() => { throw new Error('version unavailable'); }}>Ready</DatabaseInitializationGate>);
  expect(await view.findByRole('header', { name: 'Local database needs attention' })).toBeOnTheScreen();
  expect(view.queryByText('Ready')).toBeNull();
  expect(connection.close).toHaveBeenCalledTimes(1);
});

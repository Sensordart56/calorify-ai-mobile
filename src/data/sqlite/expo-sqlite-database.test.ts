import { DISPOSABLE_RECOVERY_DATABASE, resetDisposableDevelopmentDatabase } from './expo-sqlite-database';

jest.mock('expo-sqlite', () => ({ deleteDatabaseAsync: jest.fn(async () => undefined) }));

describe('disposable development database reset authority', () => {
  test('rejects the production database name', async () => {
    await expect(resetDisposableDevelopmentDatabase('calorify.db')).rejects.toThrow('Only declared disposable development databases');
  });

  test('accepts the declared recovery database name', async () => {
    await expect(resetDisposableDevelopmentDatabase(DISPOSABLE_RECOVERY_DATABASE)).resolves.toBeUndefined();
  });
});

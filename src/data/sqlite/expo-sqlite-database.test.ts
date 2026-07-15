import { createExpoExecutor, DISPOSABLE_RECOVERY_DATABASE, resetDisposableDevelopmentDatabase } from './expo-sqlite-database';

jest.mock('expo-sqlite', () => ({ deleteDatabaseAsync: jest.fn(async () => undefined) }));

describe('disposable development database reset authority', () => {
  test('rejects the production database name', async () => {
    await expect(resetDisposableDevelopmentDatabase('calorify.db')).rejects.toThrow('Only declared disposable development databases');
  });

  test('accepts the declared recovery database name', async () => {
    await expect(resetDisposableDevelopmentDatabase(DISPOSABLE_RECOVERY_DATABASE)).resolves.toBeUndefined();
  });
});

describe('Expo executor mutation results', () => {
  const native = (changes: unknown) => ({ execAsync: jest.fn(), runAsync: jest.fn(async () => ({ changes, lastInsertRowId: 9 })), getFirstAsync: jest.fn(), getAllAsync: jest.fn() });
  test.each([0, 1, 37])('maps native changes %s to the narrow result', async (changes) => {
    const database = native(changes);
    await expect(createExpoExecutor(database as never).run('UPDATE meals SET updated_at = ?', ['time'])).resolves.toEqual({ changes });
    expect(database.runAsync).toHaveBeenCalledWith('UPDATE meals SET updated_at = ?', ['time']);
  });
  test.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid native changes %s', async (changes) => {
    await expect(createExpoExecutor(native(changes) as never).run('DELETE FROM meals', [])).rejects.toThrow('invalid affected-row count');
  });
  test('does not leak native mutation fields into the data-layer result', async () => {
    const result = await createExpoExecutor(native(1) as never).run('DELETE FROM meals', []);
    expect(result).toEqual({ changes: 1 });
    expect('lastInsertRowId' in result).toBe(false);
  });
});

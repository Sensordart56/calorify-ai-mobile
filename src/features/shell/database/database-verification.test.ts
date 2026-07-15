import type { DatabaseConnection } from '@/core/database/contracts';
import { runDisposableCase, verifyConcurrentWriteOutcome } from './database-verification';

function connection(): DatabaseConnection {
  return {
    exec: jest.fn(async () => undefined),
    run: jest.fn(async () => ({ changes: 1 })),
    first: jest.fn(async () => null),
    all: jest.fn(async () => []),
    withExclusiveTransaction: async <Result,>(task: (transaction: import('@/core/database/contracts').DatabaseExecutor) => Promise<Result>): Promise<Result> => task({ exec: async () => undefined, run: async () => ({ changes: 1 }), first: async () => null, all: async () => [] }),
    close: jest.fn(async () => undefined),
  };
}

describe('disposable verification cases', () => {
  test('reports a failed pre-case reset', async () => {
    const resetDatabase = jest.fn(async () => { throw new Error('reset failed'); });
    const result = await runDisposableCase('reset', async () => undefined, { openDatabase: jest.fn(), resetDatabase });
    expect(result).toEqual({ id: 'reset', passed: false, category: 'database' });
  });

  test('does not report success when the final reset fails', async () => {
    const resetDatabase = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('reset failed'));
    const result = await runDisposableCase('cleanup', async () => undefined, { openDatabase: jest.fn(async () => connection()), resetDatabase });
    expect(result).toEqual({ id: 'cleanup', passed: false, category: 'database' });
  });
});

describe('exclusive concurrent-write verification', () => {
  test('accepts two fulfilled writes with matching rows', () => {
    expect(() => verifyConcurrentWriteOutcome([{ status: 'fulfilled', value: undefined }, { status: 'fulfilled', value: undefined }], [1, 2])).not.toThrow();
  });

  test('accepts one fulfilled write and one bounded busy rejection with matching rows', () => {
    expect(() => verifyConcurrentWriteOutcome([{ status: 'fulfilled', value: undefined }, { status: 'rejected', reason: new Error('database is locked') }], [1])).not.toThrow();
  });

  test('rejects unexpected write errors and row mismatches', () => {
    expect(() => verifyConcurrentWriteOutcome([{ status: 'fulfilled', value: undefined }, { status: 'rejected', reason: new Error('disk I/O') }], [1])).toThrow();
    expect(() => verifyConcurrentWriteOutcome([{ status: 'fulfilled', value: undefined }, { status: 'rejected', reason: new Error('busy') }], [2])).toThrow();
  });
});

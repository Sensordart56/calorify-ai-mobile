import * as SQLite from 'expo-sqlite';

import type { DatabaseConnection, DatabaseExecutor, DatabaseMutationResult, SqlValue } from '@/core/database/contracts';

export function createExpoExecutor(database: Pick<SQLite.SQLiteDatabase, 'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'>): DatabaseExecutor {
  return new ExpoExecutor(database);
}

class ExpoExecutor implements DatabaseExecutor {
  public constructor(private readonly database: Pick<SQLite.SQLiteDatabase, 'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'>) {}

  public async exec(sql: string): Promise<void> {
    await this.database.execAsync(sql);
  }

  public async run(sql: string, params: readonly SqlValue[]): Promise<DatabaseMutationResult> {
    const result = await this.database.runAsync(sql, [...params]);
    if (!Number.isSafeInteger(result.changes) || result.changes < 0) throw new Error('SQLite returned an invalid affected-row count.');
    return { changes: result.changes };
  }

  public async first<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
    return this.database.getFirstAsync<Row>(sql, [...params]);
  }

  public async all<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<readonly Row[]> {
    return this.database.getAllAsync<Row>(sql, [...params]);
  }
}

const EXCLUSIVE_BUSY_TIMEOUT_MILLISECONDS = 3_000;

class ExpoConnection extends ExpoExecutor implements DatabaseConnection {
  public constructor(
    private readonly databaseName: string,
    private readonly sqlite: SQLite.SQLiteDatabase,
  ) {
    super(sqlite);
  }

  public async withExclusiveTransaction<Result>(task: (transaction: DatabaseExecutor) => Promise<Result>): Promise<Result> {
    // Expo's withExclusiveTransactionAsync starts BEGIN before its callback. SQLite
    // only accepts foreign_keys changes outside a transaction, so configure the
    // dedicated public useNewConnection connection before BEGIN EXCLUSIVE instead.
    const transaction = await SQLite.openDatabaseAsync(this.databaseName, {
      useNewConnection: true,
      finalizeUnusedStatementsBeforeClosing: false,
    });
    try {
      await transaction.execAsync('PRAGMA foreign_keys = ON');
      const setting = await transaction.getFirstAsync<{ readonly foreign_keys: number }>('PRAGMA foreign_keys');
      if (setting?.foreign_keys !== 1) {
        throw new Error('Foreign keys could not be enabled for the exclusive transaction connection.');
      }
      await transaction.execAsync(`PRAGMA busy_timeout = ${EXCLUSIVE_BUSY_TIMEOUT_MILLISECONDS}`);
      await transaction.execAsync('BEGIN EXCLUSIVE');
      try {
        const result = await task(new ExpoExecutor(transaction));
        await transaction.execAsync('COMMIT');
        return result;
      } catch (error) {
        await transaction.execAsync('ROLLBACK');
        throw error;
      }
    } finally {
      await transaction.closeAsync();
    }
  }

  public async close(): Promise<void> {
    await this.sqlite.closeAsync();
  }
}

export async function openExpoDatabase(name: string): Promise<DatabaseConnection> {
  return new ExpoConnection(name, await SQLite.openDatabaseAsync(name, {
    finalizeUnusedStatementsBeforeClosing: false,
  }));
}

export const DISPOSABLE_INTEGRATION_DATABASE = 'calorify-phase2-integration-test.db';
export const DISPOSABLE_RECOVERY_DATABASE = 'calorify-phase2-recovery-verification.db';
export const DISPOSABLE_PHASE_THREE_DATABASE = 'calorify-phase3-integration-test.db';

function isDeclaredDisposableDatabase(name: string): boolean {
  return name === DISPOSABLE_INTEGRATION_DATABASE || name === DISPOSABLE_RECOVERY_DATABASE || name === DISPOSABLE_PHASE_THREE_DATABASE;
}

export async function resetDisposableDevelopmentDatabase(name: string): Promise<void> {
  if (!isDeclaredDisposableDatabase(name)) {
    throw new Error('Only declared disposable development databases may be reset.');
  }
  try {
    await SQLite.deleteDatabaseAsync(name);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/not found|does not exist|no such file/i.test(message)) {
      throw error;
    }
  }
}

export type SqlValue = string | number | null | boolean;

export interface DatabaseExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params: readonly SqlValue[]): Promise<void>;
  first<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
  all<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<readonly Row[]>;
}

export interface DatabaseConnection extends DatabaseExecutor {
  withExclusiveTransaction(task: (transaction: DatabaseExecutor) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export interface DatabasePort {
  readonly connection: DatabaseConnection;
}

export type DatabaseStartupPhase = 'opening' | 'configuring' | 'migrating' | 'checking' | 'ready' | 'failed';

export interface DatabaseStartupState {
  readonly phase: DatabaseStartupPhase;
  readonly errorCategory?: DatabaseErrorCategory;
}

export type DatabaseErrorCategory = 'busy' | 'integrity' | 'migration' | 'configuration' | 'unknown';

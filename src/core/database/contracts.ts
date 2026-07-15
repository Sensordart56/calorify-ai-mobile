export type SqlValue = string | number | null | boolean;
export type DatabaseMutationResult = Readonly<{ changes: number }>;

export interface DatabaseExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params: readonly SqlValue[]): Promise<DatabaseMutationResult>;
  first<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
  all<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<readonly Row[]>;
}

export interface DatabaseConnection extends DatabaseExecutor {
  withExclusiveTransaction<Result>(task: (transaction: DatabaseExecutor) => Promise<Result>): Promise<Result>;
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

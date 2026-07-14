import type { DatabaseErrorCategory } from './contracts';

export class DatabaseInitializationError extends Error {
  public constructor(
    public readonly category: DatabaseErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = 'DatabaseInitializationError';
  }
}

export function classifyDatabaseError(error: unknown): DatabaseInitializationError {
  if (error instanceof DatabaseInitializationError) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Database initialization failed.';
  if (/locked|busy/i.test(message)) return new DatabaseInitializationError('busy', 'The database is busy. Try again.');
  if (/integrity|corrupt|quick_check|foreign key/i.test(message)) return new DatabaseInitializationError('integrity', 'The local database needs recovery.');
  if (/migration|checksum|user_version|ledger/i.test(message)) return new DatabaseInitializationError('migration', 'The local database could not be safely migrated.');
  return new DatabaseInitializationError('unknown', 'The local database could not be opened.');
}

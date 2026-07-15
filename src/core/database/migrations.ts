import foundationManifest from '@/data/sqlite/migrations/001-foundation.json';
import manualLoggingManifest from '@/data/sqlite/migrations/002-manual-logging.json';

export interface MigrationDefinition {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly statements: readonly string[];
}

function assertManifest(value: typeof foundationManifest | typeof manualLoggingManifest): MigrationDefinition {
  if (!Number.isSafeInteger(value.version) || value.version < 1 || !/^[a-f0-9]{64}$/.test(value.checksum)) {
    throw new Error('Migration manifest is invalid.');
  }
  return value;
}

export const appMigrations: readonly MigrationDefinition[] = [assertManifest(foundationManifest), assertManifest(manualLoggingManifest)];

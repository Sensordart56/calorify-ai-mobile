import foundationManifest from '@/data/sqlite/migrations/001-foundation.json';

export interface MigrationDefinition {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly statements: readonly string[];
}

function assertManifest(value: typeof foundationManifest): MigrationDefinition {
  if (!Number.isSafeInteger(value.version) || value.version < 1 || !/^[a-f0-9]{64}$/.test(value.checksum)) {
    throw new Error('Migration manifest is invalid.');
  }
  return value;
}

export const phaseTwoMigrations: readonly MigrationDefinition[] = [assertManifest(foundationManifest)];

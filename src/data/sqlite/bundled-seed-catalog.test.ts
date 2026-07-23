import type { DatabaseConnection, DatabaseExecutor, SqlValue } from '@/core/database/contracts';
import type { VerifiedSeedCatalog } from '@/core/seed/catalog';
import { installBundledSeedCatalog } from './bundled-seed-catalog';

jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digest: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-sqlite', () => ({ deserializeDatabaseAsync: jest.fn() }));

const catalog: VerifiedSeedCatalog = {
  releaseId: 'usda-fdc-v1-2026-04', generatedAt: '2026-07-20T00:00:00.000Z', aliases: [], portions: [],
  foods: [{ id: 'seed-food-1', sourceId: 'seed-source-1', sourceRecordId: '123', stableSourceKey: '456', datasetVersion: 'Foundation Foods 2026-04-30', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/123/nutrients', payloadHash: 'a'.repeat(64), revisionId: 'seed-revision-1', canonicalName: 'Apple, raw', normalizedName: 'apple raw', basisQuantityScaled: 100_000_000, basisUnit: 'gram', nutrients: { caloriesKcalScaled: 52_000_000, proteinGScaled: 300_000, carbohydratesGScaled: 14_000_000, fatGScaled: 200_000, fibreGScaled: null, sugarGScaled: null, sodiumMgScaled: null } }],
};

function connection(installed = false, transactionFirst?: (sql: string) => object | null | undefined): Readonly<{ database: DatabaseConnection; runs: { sql: string; params: readonly SqlValue[] }[]; transactions: jest.Mock }> {
  const runs: { sql: string; params: readonly SqlValue[] }[] = [];
  const executor: DatabaseExecutor = {
    exec: async () => undefined,
    run: async (sql, params) => { runs.push({ sql, params }); return { changes: 1 }; },
    first: async <Row extends object>(sql: string): Promise<Row | null> => {
      const configured = transactionFirst?.(sql);
      if (configured !== undefined) return configured as Row | null;
      if (sql.includes('SELECT active_release_id')) return null;
      if (sql.includes('SELECT f.origin')) return null;
      if (sql.includes('SELECT id FROM food_revisions')) return null;
      if (sql.includes('COALESCE(MAX')) return { maximum: 0 } as Row;
      if (sql.includes('COUNT(*)')) return { count: 1 } as Row;
      return null;
    },
    all: async () => [],
  };
  const transactions = jest.fn();
  const withExclusiveTransaction = async <Result,>(task: (value: DatabaseExecutor) => Promise<Result>): Promise<Result> => { transactions(); return task(executor); };
  const database: DatabaseConnection = { ...executor, first: async <Row extends object>(sql: string): Promise<Row | null> => sql.includes('FROM seed_releases') && installed ? { id: catalog.releaseId, food_count: 216 } as Row : null, withExclusiveTransaction, close: async () => undefined };
  return { database, runs, transactions };
}

function upgradeConnection(existing: Readonly<{ origin: 'seed' | 'manual'; currentRevisionId: string; userModified: 0 | 1 }>): ReturnType<typeof connection> {
  return connection(false, (sql) => {
    if (sql.includes('SELECT active_release_id')) return { active_release_id: 'prior-release' };
    if (sql.includes('SELECT f.origin')) return { origin: existing.origin, current_revision_id: existing.currentRevisionId, user_modified: existing.userModified };
    if (sql.includes('SELECT id FROM food_revisions')) return null;
    if (sql.includes('COALESCE(MAX')) return { maximum: 1 };
    if (sql.includes('COUNT(*)')) return { count: 1 };
    if (sql.includes('FROM seed_release_foods WHERE release_id')) return { food_revision_id: 'prior-revision' };
    return undefined;
  });
}

describe('bundled seed catalog installation', () => {
  test('imports a verified release in one exclusive transaction using bound values', async () => {
    const state = connection(); const reader = jest.fn(async () => catalog);
    await expect(installBundledSeedCatalog(state.database, '1.0.0', () => '2026-07-20T00:00:00.000Z', reader)).resolves.toEqual({ state: 'active', releaseId: catalog.releaseId, foodCount: 1 });
    expect(state.transactions).toHaveBeenCalledTimes(1); expect(reader).toHaveBeenCalledTimes(1);
    expect(state.runs.some((entry) => entry.sql.includes('INSERT INTO seed_releases') && entry.params.includes(catalog.releaseId))).toBe(true);
    expect(state.runs.every((entry) => !entry.sql.includes('Apple, raw'))).toBe(true);
  });

  test('reuses an installed release without reading or replacing the bundled rows', async () => {
    const state = connection(true); const reader = jest.fn(async () => catalog);
    await expect(installBundledSeedCatalog(state.database, '1.0.0', () => '2026-07-20T00:00:00.000Z', reader)).resolves.toEqual({ state: 'active', releaseId: catalog.releaseId, foodCount: 216 });
    expect(reader).not.toHaveBeenCalled(); expect(state.transactions).toHaveBeenCalledTimes(1);
    expect(state.runs).toHaveLength(1); expect(state.runs[0]?.sql).toContain('seed_catalog_state');
  });

  test('advances an unchanged prior seed revision during a release upgrade', async () => {
    const state = upgradeConnection({ origin: 'seed', currentRevisionId: 'prior-revision', userModified: 0 });
    await installBundledSeedCatalog(state.database, '1.0.0', () => '2026-07-20T00:00:00.000Z', async () => catalog);
    expect(state.runs.some((entry) => entry.sql.startsWith('UPDATE foods SET canonical_name') && entry.params.at(-1) === catalog.foods[0]?.id)).toBe(true);
  });

  test('preserves a user-modified seed revision during a release upgrade', async () => {
    const state = upgradeConnection({ origin: 'seed', currentRevisionId: 'user-revision', userModified: 1 });
    await installBundledSeedCatalog(state.database, '1.0.0', () => '2026-07-20T00:00:00.000Z', async () => catalog);
    expect(state.runs.some((entry) => entry.sql.startsWith('UPDATE foods SET canonical_name'))).toBe(false);
    expect(state.runs.some((entry) => entry.sql.startsWith('UPDATE foods SET archived_at') && entry.sql.includes('r.user_modified = 0'))).toBe(true);
  });

  test('rejects a seed identity collision with a manual food', async () => {
    const state = upgradeConnection({ origin: 'manual', currentRevisionId: 'manual-revision', userModified: 1 });
    await expect(installBundledSeedCatalog(state.database, '1.0.0', () => '2026-07-20T00:00:00.000Z', async () => catalog)).rejects.toThrow('collides with non-seed data');
  });
});

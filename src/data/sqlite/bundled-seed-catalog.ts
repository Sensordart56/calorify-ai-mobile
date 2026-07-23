import { Asset } from 'expo-asset';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { requireApplicationVersion } from '@/core/application/app-version';
import type { DatabaseConnection, DatabaseExecutor } from '@/core/database/contracts';
import type { Nutrients } from '@/core/domain/manual-logging';
import type { SeedCatalogAlias, SeedCatalogFood, SeedCatalogPortion, SeedCatalogStatus, VerifiedSeedCatalog } from '@/core/seed/catalog';
import { requireUtcTimestamp } from '@/core/time/utc-timestamp';
import sourceManifest from '@/../data/seed/usda-v1/source-manifest.json';
import assetManifest from '@/../assets/data/seed-usda-v1.manifest.json';

function catalogAssetModule(): number { return require('../../../assets/data/seed-usda-v1.db') as number; }
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_CATALOG_BYTES = 20 * 1024 * 1024;

function text(value: unknown, label: string, maximum = 1024): string { if (typeof value !== 'string' || value.length < 1 || value.length > maximum) throw new Error(`${label} is invalid.`); return value; }
function hash(value: unknown, label: string): string { const result = text(value, label, 64); if (!HASH_PATTERN.test(result)) throw new Error(`${label} is invalid.`); return result; }
function integer(value: unknown, label: string, minimum = 0): number { if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new Error(`${label} is invalid.`); return value as number; }
function nullableInteger(value: unknown, label: string): number | null { return value === null ? null : integer(value, label); }
function hex(bytes: ArrayBuffer): string { return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join(''); }
async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> { return hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)); }

async function verifiedCatalogBytes(): Promise<Uint8Array<ArrayBuffer>> {
  const asset = await Asset.fromModule(catalogAssetModule()).downloadAsync();
  if (asset.localUri === null) throw new Error('Seed asset has no local URI.');
  const source = new File(asset.localUri);
  if (!source.exists || source.size !== assetManifest.catalogByteLength || source.size > MAX_CATALOG_BYTES) throw new Error('Seed asset identity failed.');
  const bytes = await source.bytes();
  if (await sha256(bytes) !== assetManifest.catalogSha256) throw new Error('Seed asset identity failed.');
  return bytes;
}

function food(row: Readonly<Record<string, unknown>>): SeedCatalogFood {
  const basisUnit = text(row.basis_unit, 'Seed basis unit', 16); if (basisUnit !== 'gram') throw new Error('Seed basis unit is unsupported.');
  const nutrients: Nutrients = { caloriesKcalScaled: integer(row.calories_kcal_scaled, 'Seed calories'), proteinGScaled: integer(row.protein_g_scaled, 'Seed protein'), carbohydratesGScaled: integer(row.carbohydrates_g_scaled, 'Seed carbohydrates'), fatGScaled: integer(row.fat_g_scaled, 'Seed fat'), fibreGScaled: nullableInteger(row.fibre_g_scaled, 'Seed fibre'), sugarGScaled: nullableInteger(row.sugar_g_scaled, 'Seed sugar'), sodiumMgScaled: nullableInteger(row.sodium_mg_scaled, 'Seed sodium') };
  return { id: text(row.id, 'Seed food ID', 128), sourceId: text(row.source_id, 'Seed source ID', 128), sourceRecordId: text(row.provider_record_id, 'Seed provider record ID', 128), stableSourceKey: text(row.stable_source_key, 'Seed stable key', 128), datasetVersion: text(row.dataset_version, 'Seed dataset version', 256), sourceUrl: text(row.source_url, 'Seed source URL'), payloadHash: hash(row.payload_hash, 'Seed payload hash'), revisionId: text(row.revision_id, 'Seed revision ID', 128), canonicalName: text(row.canonical_name, 'Seed canonical name', 256), normalizedName: text(row.normalized_name, 'Seed normalized name', 256), basisQuantityScaled: integer(row.basis_quantity_scaled, 'Seed basis quantity', 1), basisUnit, nutrients };
}

export async function readBundledSeedCatalog(): Promise<VerifiedSeedCatalog> {
  const database = await SQLite.deserializeDatabaseAsync(await verifiedCatalogBytes(), {
    // expo-sqlite 57 can crash in native statement finalization when an FTS-enabled
    // build closes a database. Queries here are one-shot and finalize themselves.
    finalizeUnusedStatementsBeforeClosing: false,
  });
  try {
    await database.execAsync('PRAGMA query_only = ON');
    const fk = await database.getAllAsync<Record<string, unknown>>('PRAGMA foreign_key_check'); const quick = await database.getFirstAsync<Record<string, unknown>>('PRAGMA quick_check(1)');
    if (fk.length !== 0 || quick === null || Object.values(quick)[0] !== 'ok') throw new Error('Seed catalog integrity failed.');
    const metadata = await database.getFirstAsync<Readonly<Record<string, unknown>>>('SELECT release_id, generated_at, provider, license_id, attribution FROM catalog_metadata');
    if (metadata === null || text(metadata.release_id, 'Seed release ID', 128) !== assetManifest.releaseId || text(metadata.provider, 'Seed provider', 256) !== sourceManifest.provider || text(metadata.license_id, 'Seed license', 32) !== 'CC0-1.0' || text(metadata.attribution, 'Seed attribution') !== sourceManifest.attribution) throw new Error('Seed catalog metadata failed.');
    const rows = await database.getAllAsync<Readonly<Record<string, unknown>>>('SELECT f.*, s.provider_record_id, s.dataset_version, s.source_url, s.payload_hash FROM catalog_foods f JOIN catalog_sources s ON s.id = f.source_id ORDER BY f.id ASC');
    const aliases = await database.getAllAsync<Readonly<Record<string, unknown>>>('SELECT id, food_id, alias, normalized_alias, locale FROM catalog_aliases ORDER BY id ASC');
    const portions = await database.getAllAsync<Readonly<Record<string, unknown>>>('SELECT id, food_id, source_id, label, normalized_label, quantity_scaled, equivalent_quantity_scaled, equivalent_unit FROM catalog_portions ORDER BY id ASC');
    if (rows.length !== assetManifest.acceptedFoods || aliases.length !== assetManifest.aliases || portions.length !== assetManifest.portions) throw new Error('Seed catalog counts failed.');
    return { releaseId: assetManifest.releaseId, generatedAt: requireUtcTimestamp(text(metadata.generated_at, 'Seed generated timestamp', 32)), foods: rows.map(food), aliases: aliases.map((row): SeedCatalogAlias => ({ id: text(row.id, 'Seed alias ID', 128), foodId: text(row.food_id, 'Seed alias food ID', 128), alias: text(row.alias, 'Seed alias', 256), normalizedAlias: text(row.normalized_alias, 'Seed normalized alias', 256), locale: row.locale === null ? null : text(row.locale, 'Seed alias locale', 32) })), portions: portions.map((row): SeedCatalogPortion => { const unit = text(row.equivalent_unit, 'Seed portion unit', 16); if (unit !== 'gram') throw new Error('Seed portion unit is unsupported.'); return { id: text(row.id, 'Seed portion ID', 128), foodId: text(row.food_id, 'Seed portion food ID', 128), sourceId: text(row.source_id, 'Seed portion source ID', 128), label: text(row.label, 'Seed portion label', 256), normalizedLabel: text(row.normalized_label, 'Seed normalized portion', 256), quantityScaled: integer(row.quantity_scaled, 'Seed portion quantity', 1), equivalentQuantityScaled: integer(row.equivalent_quantity_scaled, 'Seed portion equivalent', 1), equivalentUnit: unit }; }) };
  } finally { await database.closeAsync(); }
}

async function activeRelease(transaction: DatabaseExecutor): Promise<string | null> { const row = await transaction.first<Readonly<{ active_release_id: unknown }>>('SELECT active_release_id FROM seed_catalog_state WHERE singleton = 1'); return row === null ? null : text(row.active_release_id, 'Active seed release', 128); }

async function insertFood(transaction: DatabaseExecutor, item: SeedCatalogFood, now: string, priorRelease: string | null): Promise<void> {
  await transaction.run('INSERT OR IGNORE INTO food_sources (id, provider, provider_record_id, dataset_version, source_url, license_id, attribution, retrieved_at, payload_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [item.sourceId, sourceManifest.providerKey, item.sourceRecordId, item.datasetVersion, item.sourceUrl, sourceManifest.licenseId, sourceManifest.attribution, sourceManifest.sources.find((source) => source.datasetVersion === item.datasetVersion)?.retrievedAt ?? now, item.payloadHash]);
  const existing = await transaction.first<Readonly<{ origin: unknown; current_revision_id: unknown; user_modified: unknown }>>('SELECT f.origin, f.current_revision_id, r.user_modified FROM foods f JOIN food_revisions r ON r.id = f.current_revision_id AND r.food_id = f.id WHERE f.id = ?', [item.id]);
  if (existing !== null && text(existing.origin, 'Existing food origin', 32) !== 'seed') throw new Error('Seed food identity collides with non-seed data.');
  const revisionExists = await transaction.first<Readonly<{ id: unknown }>>('SELECT id FROM food_revisions WHERE id = ? AND food_id = ?', [item.revisionId, item.id]);
  if (existing === null) await transaction.run('INSERT INTO foods (id, canonical_name, normalized_name, origin, current_revision_id, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)', [item.id, item.canonicalName, item.normalizedName, 'seed', item.revisionId, now, now]);
  if (revisionExists === null) {
    const maximum = await transaction.first<Readonly<{ maximum: unknown }>>('SELECT COALESCE(MAX(revision_number), 0) AS maximum FROM food_revisions WHERE food_id = ?', [item.id]); const revisionNumber = integer(maximum?.maximum ?? 0, 'Seed revision number') + 1;
    const n = item.nutrients; await transaction.run('INSERT INTO food_revisions (id, food_id, revision_number, source_id, basis_quantity_scaled, basis_unit, calories_kcal_scaled, protein_g_scaled, carbohydrates_g_scaled, fat_g_scaled, fibre_g_scaled, sugar_g_scaled, sodium_mg_scaled, user_modified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)', [item.revisionId, item.id, revisionNumber, item.sourceId, item.basisQuantityScaled, item.basisUnit, n.caloriesKcalScaled, n.proteinGScaled, n.carbohydratesGScaled, n.fatGScaled, n.fibreGScaled, n.sugarGScaled, n.sodiumMgScaled, now]);
  }
  if (existing !== null && priorRelease !== null) {
    const prior = await transaction.first<Readonly<{ food_revision_id: unknown }>>('SELECT food_revision_id FROM seed_release_foods WHERE release_id = ? AND food_id = ?', [priorRelease, item.id]);
    if (prior !== null && text(existing.current_revision_id, 'Current revision ID', 128) === text(prior.food_revision_id, 'Prior seed revision ID', 128) && integer(existing.user_modified, 'User modified flag') === 0) await transaction.run('UPDATE foods SET canonical_name = ?, normalized_name = ?, current_revision_id = ?, archived_at = NULL, updated_at = ? WHERE id = ?', [item.canonicalName, item.normalizedName, item.revisionId, now, item.id]);
  }
  await transaction.run('INSERT INTO seed_release_foods (release_id, food_id, food_revision_id, source_id, stable_source_key) VALUES (?, ?, ?, ?, ?)', [assetManifest.releaseId, item.id, item.revisionId, item.sourceId, item.stableSourceKey]);
}

async function retireRemovedSeedFoods(transaction: DatabaseExecutor, priorRelease: string | null, now: string): Promise<void> {
  if (priorRelease === null || priorRelease === assetManifest.releaseId) return;
  await transaction.run("UPDATE foods SET archived_at = ?, updated_at = ? WHERE origin = 'seed' AND archived_at IS NULL AND EXISTS (SELECT 1 FROM seed_release_foods prior JOIN food_revisions r ON r.food_id = foods.id AND r.id = foods.current_revision_id WHERE prior.release_id = ? AND prior.food_id = foods.id AND prior.food_revision_id = foods.current_revision_id AND r.user_modified = 0) AND NOT EXISTS (SELECT 1 FROM seed_release_foods current WHERE current.release_id = ? AND current.food_id = foods.id)", [now, now, priorRelease, assetManifest.releaseId]);
}

export async function installBundledSeedCatalog(database: DatabaseConnection, appVersion: string, now: () => string = () => new Date().toISOString(), readCatalog: () => Promise<VerifiedSeedCatalog> = readBundledSeedCatalog): Promise<SeedCatalogStatus> {
  const version = requireApplicationVersion(appVersion); const installedAt = requireUtcTimestamp(now());
  const alreadyInstalled = await database.first<Readonly<{ id: unknown; food_count: unknown }>>('SELECT id, food_count FROM seed_releases WHERE id = ?', [assetManifest.releaseId]);
  if (alreadyInstalled !== null) {
    await database.withExclusiveTransaction(async (transaction) => { await transaction.run('INSERT INTO seed_catalog_state (singleton, active_release_id) VALUES (1, ?) ON CONFLICT(singleton) DO UPDATE SET active_release_id = excluded.active_release_id', [assetManifest.releaseId]); });
    return { state: 'active', releaseId: text(alreadyInstalled.id, 'Installed seed release', 128), foodCount: integer(alreadyInstalled.food_count, 'Installed seed food count') };
  }
  const catalog = await readCatalog();
  await database.withExclusiveTransaction(async (transaction) => {
    const priorRelease = await activeRelease(transaction);
    await transaction.run('INSERT INTO seed_releases (id, source_manifest_hash, catalog_hash, license_notice_hash, generated_at, installed_at, app_version, food_count, alias_count, portion_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [catalog.releaseId, assetManifest.sourceManifestSha256, assetManifest.catalogSha256, assetManifest.licenseNoticeSha256, catalog.generatedAt, installedAt, version, catalog.foods.length, catalog.aliases.length, catalog.portions.length]);
    for (const source of sourceManifest.sources) await transaction.run('INSERT INTO seed_release_sources (release_id, data_type, dataset_version, source_url, artifact_hash, artifact_byte_length, license_id, attribution, retrieved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [catalog.releaseId, source.dataType, source.datasetVersion, source.sourceUrl, source.sha256, source.byteLength, sourceManifest.licenseId, sourceManifest.attribution, source.retrievedAt]);
    for (const item of catalog.foods) await insertFood(transaction, item, installedAt, priorRelease);
    await retireRemovedSeedFoods(transaction, priorRelease, installedAt);
    for (const alias of catalog.aliases) { await transaction.run('INSERT OR IGNORE INTO food_aliases (id, food_id, alias, normalized_alias, locale, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [alias.id, alias.foodId, alias.alias, alias.normalizedAlias, alias.locale, 'seed', installedAt]); await transaction.run('INSERT INTO seed_release_aliases (release_id, alias_id) VALUES (?, ?)', [catalog.releaseId, alias.id]); }
    for (const portion of catalog.portions) { await transaction.run('INSERT OR IGNORE INTO food_portions (id, food_id, label, normalized_label, quantity_scaled, equivalent_quantity_scaled, equivalent_unit, source_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [portion.id, portion.foodId, portion.label, portion.normalizedLabel, portion.quantityScaled, portion.equivalentQuantityScaled, portion.equivalentUnit, portion.sourceId, installedAt]); await transaction.run('INSERT INTO seed_release_portions (release_id, portion_id) VALUES (?, ?)', [catalog.releaseId, portion.id]); }
    const count = await transaction.first<Readonly<{ count: unknown }>>('SELECT COUNT(*) AS count FROM seed_release_foods WHERE release_id = ?', [catalog.releaseId]); if (integer(count?.count ?? -1, 'Installed seed membership count') !== catalog.foods.length) throw new Error('Installed seed membership count failed.');
    await transaction.run('INSERT INTO seed_catalog_state (singleton, active_release_id) VALUES (1, ?) ON CONFLICT(singleton) DO UPDATE SET active_release_id = excluded.active_release_id', [catalog.releaseId]);
  });
  return { state: 'active', releaseId: catalog.releaseId, foodCount: catalog.foods.length };
}

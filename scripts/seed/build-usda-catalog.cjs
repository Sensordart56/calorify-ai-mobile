const { createHash } = require('node:crypto');
const { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { unzipSync } = require('fflate');

const ROOT = resolve(__dirname, '..', '..');
const CONTRACT_ROOT = join(ROOT, 'data', 'seed', 'usda-v1');
const ASSET_ROOT = join(ROOT, 'assets', 'data');
const REPORT_ROOT = join(CONTRACT_ROOT, 'reports');
const manifest = JSON.parse(readFileSync(join(CONTRACT_ROOT, 'source-manifest.json'), 'utf8'));
const selection = JSON.parse(readFileSync(join(CONTRACT_ROOT, 'selection.json'), 'utf8'));
const SCALE = 1_000_000;
const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const REQUIRED = Object.freeze({ protein: [1003, 'g'], fat: [1004, 'g'], carbohydrates: [1005, 'g'] });
const OPTIONAL = Object.freeze({ fibre: [1079, 'g'], sugar: [2000, 'g'], sodium: [1093, 'mg'] });

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function stableId(prefix, ...parts) { return `${prefix}-${sha256(parts.join('\0'))}`; }
function requireText(value, label) { if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} is missing.`); return value.trim(); }
function legacyNormalizeName(value) {
  const normalized = requireText(value, 'Food name').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\u0000-\u001f\u007f-\u009f]/gu, '').replace(/['’]/gu, '').replace(/[\p{P}\p{Z}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0 || normalized.length > 256) throw new Error('Food normalized name is invalid.');
  return normalized;
}
void legacyNormalizeName;
function normalizeName(value) {
  const normalized = requireText(value, 'Food name').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ').replace(/[\p{P}\p{Z}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0 || normalized.length > 256) throw new Error('Food normalized name is invalid.');
  return normalized;
}
function scaleDecimal(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} is invalid.`);
  const text = String(value);
  if (/e/i.test(text)) throw new Error(`${label} uses unsupported exponent notation.`);
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > 6) throw new Error(`${label} exceeds six decimal places.`);
  const scaled = Number(whole) * SCALE + Number(fraction.padEnd(6, '0'));
  if (!Number.isSafeInteger(scaled) || scaled < 0 || scaled > MAX_SAFE) throw new Error(`${label} is outside the safe fixed-point range.`);
  return scaled;
}
function extractJson(zipBytes) {
  const files = unzipSync(zipBytes);
  const entry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.json'));
  if (!entry) throw new Error('USDA archive contains no JSON file.');
  return JSON.parse(Buffer.from(entry[1]).toString('utf8'));
}
function sourceArtifact(contract) {
  const absolute = join(ROOT, contract.localFile.replaceAll('/', '\\'));
  if (!existsSync(absolute)) throw new Error(`Missing source archive: ${contract.localFile}`);
  const bytes = readFileSync(absolute);
  if (bytes.length !== contract.byteLength || sha256(bytes) !== contract.sha256) throw new Error(`Source archive identity failed: ${contract.localFile}`);
  return { contract, bytes, json: extractJson(bytes) };
}
function nutrient(food, id, unit) {
  const matches = (food.foodNutrients ?? []).filter((entry) => entry?.nutrient?.id === id && entry?.nutrient?.unitName === unit && typeof entry.amount === 'number');
  if (matches.length > 1) throw new Error(`duplicate nutrient ${id}`);
  return matches[0]?.amount ?? null;
}
function energy(food, dataType) {
  const ids = dataType === 'foundation' ? [2048, 2047] : [1008];
  for (const id of ids) { const value = nutrient(food, id, 'kcal'); if (value !== null) return { id, value }; }
  return null;
}
function portionQuantity(portion, dataType) {
  if (dataType === 'foundation' && typeof portion.amount === 'number' && portion.amount > 0) return portion.amount;
  const match = typeof portion.portionDescription === 'string' ? portion.portionDescription.trim().match(/^(\d+(?:\.\d+)?)\b/u) : null;
  return match ? Number(match[1]) : null;
}
function validateFood(food, dataType, datasetVersion, provider) {
  const stableKey = dataType === 'foundation' ? String(food.ndbNumber ?? '') : String(food.foodCode ?? '');
  if (!stableKey) throw new Error('stable source key is missing');
  const canonicalName = selection.nameOverrides[`${dataType}:${stableKey}`] ?? food.description;
  const normalizedName = normalizeName(canonicalName);
  const values = {};
  for (const [name, [id, unit]] of Object.entries(REQUIRED)) { const value = nutrient(food, id, unit); if (value === null) throw new Error(`required nutrient ${id} is missing`); values[name] = value; }
  const selectedEnergy = energy(food, dataType); if (selectedEnergy === null) throw new Error('required energy is missing');
  values.calories = selectedEnergy.value;
  for (const [name, [id, unit]] of Object.entries(OPTIONAL)) values[name] = nutrient(food, id, unit);
  if (values.calories > 1000 || values.protein > 100 || values.fat > 100 || values.carbohydrates > 100 || (values.fibre ?? 0) > 100 || (values.sugar ?? 0) > 100 || (values.sodium ?? 0) > 100000 || values.protein + values.fat + values.carbohydrates > 105) throw new Error('nutrient range validation failed');
  const normalizedValues = {
    basisQuantityScaled: 100 * SCALE, basisUnit: 'gram', energyNutrientId: selectedEnergy.id,
    caloriesKcalScaled: scaleDecimal(values.calories, 'Calories'), proteinGScaled: scaleDecimal(values.protein, 'Protein'), carbohydratesGScaled: scaleDecimal(values.carbohydrates, 'Carbohydrates'), fatGScaled: scaleDecimal(values.fat, 'Fat'),
    fibreGScaled: values.fibre === null ? null : scaleDecimal(values.fibre, 'Fibre'), sugarGScaled: values.sugar === null ? null : scaleDecimal(values.sugar, 'Sugar'), sodiumMgScaled: values.sodium === null ? null : scaleDecimal(values.sodium, 'Sodium'),
  };
  const sourceRecordId = String(food.fdcId ?? ''); if (!sourceRecordId) throw new Error('FDC ID is missing');
  const foodId = stableId('seed-food', provider, dataType, stableKey);
  const payloadHash = sha256(JSON.stringify({ sourceRecordId, stableKey, canonicalName, ...normalizedValues }));
  const sourceId = stableId('seed-source', provider, datasetVersion, sourceRecordId);
  const revisionId = stableId('seed-revision', foodId, datasetVersion, sourceRecordId, payloadHash);
  const aliases = (selection.aliases[`${dataType}:${stableKey}`] ?? []).map((entry) => ({ alias: requireText(entry.alias, 'Alias'), locale: entry.locale ?? null })).filter((entry) => normalizeName(entry.alias) !== normalizedName);
  const portions = [];
  for (const portion of food.foodPortions ?? []) {
    const quantity = portionQuantity(portion, dataType); const grams = portion.gramWeight; const label = portion.portionDescription ?? portion.modifier;
    if (quantity === null || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(grams) || grams <= 0 || typeof label !== 'string' || label.trim().length === 0) continue;
    try { portions.push({ label: label.trim(), normalizedLabel: normalizeName(label), quantityScaled: scaleDecimal(quantity, 'Portion quantity'), equivalentQuantityScaled: scaleDecimal(grams, 'Portion grams'), equivalentUnit: 'gram' }); } catch { /* Excluded by the explicit safe portion contract. */ }
  }
  return { dataType, stableKey, sourceRecordId, sourceId, foodId, revisionId, canonicalName: canonicalName.trim(), normalizedName, payloadHash, values: normalizedValues, aliases, portions };
}
function selected(food, dataType) {
  const stableKey = dataType === 'foundation' ? String(food.ndbNumber ?? '') : String(food.foodCode ?? '');
  if (selection.excludedStableKeys.includes(`${dataType}:${stableKey}`)) return false;
  return dataType === 'foundation' ? selection.includeAllValidatedFoundation === true : selection.includedFnddsFoodCodes.includes(stableKey);
}
function collectFoods(artifacts) {
  const accepted = []; const exclusions = [];
  for (const artifact of artifacts) {
    const dataType = artifact.contract.dataType; const records = dataType === 'foundation' ? artifact.json.FoundationFoods : artifact.json.SurveyFoods;
    if (!Array.isArray(records)) throw new Error(`${dataType} archive shape is invalid.`);
    for (const food of records) {
      if (food === null || typeof food !== 'object') { exclusions.push({ dataType, stableKey: '', fdcId: null, reason: 'invalid-null-record' }); continue; }
      const stableKey = dataType === 'foundation' ? String(food.ndbNumber ?? '') : String(food.foodCode ?? '');
      if (!selected(food, dataType)) { exclusions.push({ dataType, stableKey, fdcId: food.fdcId ?? null, reason: 'not-selected' }); continue; }
      try { accepted.push(validateFood(food, dataType, artifact.contract.datasetVersion, manifest.providerKey)); }
      catch (error) { exclusions.push({ dataType, stableKey, fdcId: food.fdcId ?? null, reason: error instanceof Error ? error.message : 'validation-failed' }); }
    }
  }
  accepted.sort((a, b) => a.foodId.localeCompare(b.foodId)); exclusions.sort((a, b) => `${a.dataType}:${a.stableKey}`.localeCompare(`${b.dataType}:${b.stableKey}`));
  return { accepted, exclusions };
}
function createCatalog(foods, outputPath) {
  if (existsSync(outputPath)) rmSync(outputPath);
  const db = new DatabaseSync(outputPath);
  try {
    db.exec("PRAGMA page_size=4096; PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON; CREATE TABLE catalog_metadata (release_id TEXT PRIMARY KEY, source_manifest_sha256 TEXT NOT NULL, generated_at TEXT NOT NULL, provider TEXT NOT NULL, license_id TEXT NOT NULL, attribution TEXT NOT NULL); CREATE TABLE catalog_sources (id TEXT PRIMARY KEY, data_type TEXT NOT NULL, provider_record_id TEXT NOT NULL, stable_source_key TEXT NOT NULL, dataset_version TEXT NOT NULL, source_url TEXT NOT NULL, license_id TEXT NOT NULL, attribution TEXT NOT NULL, retrieved_at TEXT NOT NULL, payload_hash TEXT NOT NULL); CREATE TABLE catalog_foods (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES catalog_sources(id), stable_source_key TEXT NOT NULL, canonical_name TEXT NOT NULL, normalized_name TEXT NOT NULL, revision_id TEXT NOT NULL UNIQUE, basis_quantity_scaled INTEGER NOT NULL, basis_unit TEXT NOT NULL, calories_kcal_scaled INTEGER NOT NULL, protein_g_scaled INTEGER NOT NULL, carbohydrates_g_scaled INTEGER NOT NULL, fat_g_scaled INTEGER NOT NULL, fibre_g_scaled INTEGER, sugar_g_scaled INTEGER, sodium_mg_scaled INTEGER, UNIQUE(source_id, revision_id)); CREATE TABLE catalog_aliases (id TEXT PRIMARY KEY, food_id TEXT NOT NULL REFERENCES catalog_foods(id), alias TEXT NOT NULL, normalized_alias TEXT NOT NULL, locale TEXT, UNIQUE(food_id, normalized_alias, locale)); CREATE TABLE catalog_portions (id TEXT PRIMARY KEY, food_id TEXT NOT NULL REFERENCES catalog_foods(id), source_id TEXT NOT NULL REFERENCES catalog_sources(id), label TEXT NOT NULL, normalized_label TEXT NOT NULL, quantity_scaled INTEGER NOT NULL, equivalent_quantity_scaled INTEGER NOT NULL, equivalent_unit TEXT NOT NULL, UNIQUE(food_id, normalized_label)); CREATE INDEX catalog_foods_normalized_name ON catalog_foods(normalized_name, id); CREATE INDEX catalog_aliases_normalized_alias ON catalog_aliases(normalized_alias, food_id);");
    db.prepare('INSERT INTO catalog_metadata VALUES (?, ?, ?, ?, ?, ?)').run(manifest.releaseId, sha256(readFileSync(join(CONTRACT_ROOT, 'source-manifest.json'))), manifest.catalogGeneratedAt, manifest.provider, manifest.licenseId, manifest.attribution);
    const sourceContracts = new Map(manifest.sources.map((source) => [source.dataType, source]));
    const insertSource = db.prepare('INSERT INTO catalog_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertFood = db.prepare('INSERT INTO catalog_foods VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertAlias = db.prepare('INSERT INTO catalog_aliases VALUES (?, ?, ?, ?, ?)');
    const insertPortion = db.prepare('INSERT INTO catalog_portions VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const food of foods) {
        const source = sourceContracts.get(food.dataType);
        insertSource.run(food.sourceId, food.dataType, food.sourceRecordId, food.stableKey, source.datasetVersion, source.sourceUrl, manifest.licenseId, manifest.attribution, source.retrievedAt, food.payloadHash);
        const v = food.values;
        insertFood.run(food.foodId, food.sourceId, food.stableKey, food.canonicalName, food.normalizedName, food.revisionId, v.basisQuantityScaled, v.basisUnit, v.caloriesKcalScaled, v.proteinGScaled, v.carbohydratesGScaled, v.fatGScaled, v.fibreGScaled, v.sugarGScaled, v.sodiumMgScaled);
        for (const alias of food.aliases.sort((a, b) => normalizeName(a.alias).localeCompare(normalizeName(b.alias)))) insertAlias.run(stableId('seed-alias', food.foodId, normalizeName(alias.alias), alias.locale ?? ''), food.foodId, alias.alias, normalizeName(alias.alias), alias.locale);
        for (const portion of food.portions.sort((a, b) => a.normalizedLabel.localeCompare(b.normalizedLabel))) insertPortion.run(stableId('seed-portion', food.foodId, portion.normalizedLabel, portion.quantityScaled, portion.equivalentQuantityScaled), food.foodId, food.sourceId, portion.label, portion.normalizedLabel, portion.quantityScaled, portion.equivalentQuantityScaled, portion.equivalentUnit);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const fk = db.prepare('PRAGMA foreign_key_check').all(); const quick = db.prepare('PRAGMA quick_check(1)').get();
    if (fk.length !== 0 || Object.values(quick)[0] !== 'ok') throw new Error('Generated catalog integrity failed.');
    db.exec('VACUUM');
  } finally { db.close(); }
}
function main() {
  if (manifest.schemaVersion !== 1 || selection.schemaVersion !== 1 || manifest.releaseId !== selection.releaseId || manifest.licenseId !== 'CC0-1.0') throw new Error('Seed contracts are incompatible.');
  const artifacts = manifest.sources.map(sourceArtifact); const { accepted, exclusions } = collectFoods(artifacts);
  if (accepted.length === 0) throw new Error('No fully validated USDA foods were selected.');
  mkdirSync(ASSET_ROOT, { recursive: true }); mkdirSync(REPORT_ROOT, { recursive: true });
  const outputPath = join(ASSET_ROOT, 'seed-usda-v1.db'); createCatalog(accepted, outputPath);
  const bytes = readFileSync(outputPath); if (bytes.length > 20 * 1024 * 1024) throw new Error('Catalog exceeds the approved 20 MiB bound.');
  const report = { releaseId: manifest.releaseId, acceptedFoods: accepted.length, foundationFoods: accepted.filter((food) => food.dataType === 'foundation').length, fnddsFoods: accepted.filter((food) => food.dataType === 'survey').length, aliases: accepted.reduce((sum, food) => sum + food.aliases.length, 0), portions: accepted.reduce((sum, food) => sum + food.portions.length, 0), excludedRows: exclusions.length, catalogByteLength: statSync(outputPath).size, catalogSha256: sha256(bytes) };
  writeFileSync(join(ASSET_ROOT, 'seed-usda-v1.manifest.json'), `${JSON.stringify({ ...report, sourceManifestSha256: sha256(readFileSync(join(CONTRACT_ROOT, 'source-manifest.json'))), selectionSha256: sha256(readFileSync(join(CONTRACT_ROOT, 'selection.json'))), licenseNoticeSha256: sha256(readFileSync(join(CONTRACT_ROOT, 'LICENSE-NOTICE.md'))) }, null, 2)}\n`);
  writeFileSync(join(REPORT_ROOT, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`); writeFileSync(join(REPORT_ROOT, 'exclusions.json'), `${JSON.stringify(exclusions, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
main();

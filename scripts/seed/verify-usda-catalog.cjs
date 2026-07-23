const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const root = resolve(__dirname, '..', '..');
const asset = join(root, 'assets', 'data', 'seed-usda-v1.db');
const manifest = JSON.parse(readFileSync(join(root, 'assets', 'data', 'seed-usda-v1.manifest.json'), 'utf8'));
const bytes = readFileSync(asset); const hash = createHash('sha256').update(bytes).digest('hex');
const contractRoot = join(root, 'data', 'seed', 'usda-v1');
const sourceManifestHash = createHash('sha256').update(readFileSync(join(contractRoot, 'source-manifest.json'))).digest('hex');
const selectionHash = createHash('sha256').update(readFileSync(join(contractRoot, 'selection.json'))).digest('hex');
const licenseHash = createHash('sha256').update(readFileSync(join(contractRoot, 'LICENSE-NOTICE.md'))).digest('hex');
if (hash !== manifest.catalogSha256 || bytes.length !== manifest.catalogByteLength || sourceManifestHash !== manifest.sourceManifestSha256 || selectionHash !== manifest.selectionSha256 || licenseHash !== manifest.licenseNoticeSha256 || manifest.acceptedFoods < 1 || manifest.fnddsFoods !== 0) throw new Error('Seed catalog manifest verification failed.');
const db = new DatabaseSync(asset, { readOnly: true });
try {
  const licenseFailure = db.prepare("SELECT COUNT(*) AS count FROM catalog_sources WHERE license_id <> 'CC0-1.0' OR attribution = '' OR source_url NOT LIKE 'https://fdc.nal.usda.gov/%'").get();
  const provenanceFailure = db.prepare('SELECT COUNT(*) AS count FROM catalog_foods f LEFT JOIN catalog_sources s ON s.id = f.source_id WHERE s.id IS NULL').get();
  const count = db.prepare('SELECT COUNT(*) AS count FROM catalog_foods').get(); const fk = db.prepare('PRAGMA foreign_key_check').all(); const quick = db.prepare('PRAGMA quick_check(1)').get();
  if (licenseFailure.count !== 0 || provenanceFailure.count !== 0 || count.count !== manifest.acceptedFoods || fk.length !== 0 || Object.values(quick)[0] !== 'ok') throw new Error('Seed catalog validation failed.');
} finally { db.close(); }

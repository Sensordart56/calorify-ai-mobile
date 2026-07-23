const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = resolve(__dirname, '..', '..');
const corpus = JSON.parse(readFileSync(join(root, 'data', 'seed', 'usda-v1', 'lexical-corpus.json'), 'utf8'));
const catalog = new DatabaseSync(join(root, 'assets', 'data', 'seed-usda-v1.db'), { readOnly: true });
const search = new DatabaseSync(':memory:');
function normalize(value) { return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ').replace(/[\p{P}\p{Z}]+/gu, ' ').trim().replace(/\s+/gu, ' '); }
function expression(value) { return normalize(value).split(' ').map((token) => `"${token.replace(/"/gu, '""')}"*`).join(' AND '); }

try {
  const metadata = catalog.prepare('SELECT release_id FROM catalog_metadata').get();
  if (metadata?.release_id !== corpus.releaseId) throw new Error('Lexical corpus release does not match the catalog.');
  const foods = catalog.prepare('SELECT id, canonical_name, normalized_name FROM catalog_foods ORDER BY id').all();
  search.exec("CREATE VIRTUAL TABLE foods_fts USING fts5(food_id UNINDEXED, term, tokenize = 'unicode61 remove_diacritics 0')");
  const insert = search.prepare('INSERT INTO foods_fts (food_id, term) VALUES (?, ?)');
  for (const food of foods) insert.run(food.id, food.normalized_name);
  for (const alias of catalog.prepare('SELECT food_id, normalized_alias FROM catalog_aliases ORDER BY id').all()) insert.run(alias.food_id, alias.normalized_alias);
  const groups = new Map();
  for (const food of foods) groups.set(food.normalized_name, [...(groups.get(food.normalized_name) ?? []), food.id]);
  const automaticCases = foods.filter((food) => groups.get(food.normalized_name).length === 1);
  const automaticCorrect = automaticCases.filter((food) => groups.get(normalize(food.canonical_name))?.[0] === food.id).length;
  const results = corpus.queries.map((entry) => {
    const expected = foods.find((food) => food.canonical_name === entry.expectedCanonicalName);
    if (!expected) throw new Error(`Missing corpus target: ${entry.expectedCanonicalName}`);
    const candidates = search.prepare('SELECT food_id FROM foods_fts WHERE foods_fts MATCH ? ORDER BY bm25(foods_fts), food_id ASC LIMIT 5').all(expression(entry.query)).map((row) => row.food_id);
    return { ...entry, expectedFoodId: expected.id, top5FoodIds: candidates, hit: candidates.includes(expected.id) };
  });
  const classes = [...new Set(results.map((entry) => entry.class))].sort().map((name) => { const rows = results.filter((entry) => entry.class === name); return { name, queries: rows.length, top5Hits: rows.filter((entry) => entry.hit).length, top5Recall: rows.filter((entry) => entry.hit).length / rows.length }; });
  const safetyResults = corpus.safetyQueries.map((entry) => { const normalized = normalize(entry.query); const exact = groups.get(normalized) ?? []; const candidates = search.prepare('SELECT food_id FROM foods_fts WHERE foods_fts MATCH ? ORDER BY bm25(foods_fts), food_id ASC LIMIT 5').all(expression(entry.query)).map((row) => row.food_id); return { ...entry, exactCount: exact.length, disposition: exact.length === 1 ? 'automatic' : candidates.length > 0 ? 'review' : 'unresolved' }; });
  const report = { releaseId: corpus.releaseId, automaticCases: automaticCases.length, automaticCorrect, automaticPrecision: automaticCases.length === 0 ? 1 : automaticCorrect / automaticCases.length, queryCount: results.length, top5Hits: results.filter((entry) => entry.hit).length, overallTop5Recall: results.filter((entry) => entry.hit).length / results.length, classes, safetyResults, results };
  writeFileSync(join(root, 'data', 'seed', 'usda-v1', 'reports', 'lexical-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (report.automaticPrecision !== corpus.requiredAutomaticPrecision || report.overallTop5Recall < corpus.minimumOverallTop5Recall || classes.some((entry) => entry.top5Recall < corpus.minimumClassTop5Recall) || safetyResults.some((entry) => entry.disposition === 'automatic')) throw new Error('Lexical quality gate failed.');
  process.stdout.write(`${JSON.stringify({ automaticPrecision: report.automaticPrecision, overallTop5Recall: report.overallTop5Recall, classes })}\n`);
} finally { search.close(); catalog.close(); }

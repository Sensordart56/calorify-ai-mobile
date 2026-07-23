import type { DatabaseConnection } from '@/core/database/contracts';
import { requireUtcTimestamp } from '@/core/time/utc-timestamp';

const SEARCH_SCHEMA_VERSION = 1;

async function cleanup(database: DatabaseConnection): Promise<void> {
  await database.exec('DROP TRIGGER IF EXISTS foods_fts_food_insert; DROP TRIGGER IF EXISTS foods_fts_food_update; DROP TRIGGER IF EXISTS foods_fts_food_delete; DROP TRIGGER IF EXISTS foods_fts_alias_insert; DROP TRIGGER IF EXISTS foods_fts_alias_update; DROP TRIGGER IF EXISTS foods_fts_alias_delete; DROP TABLE IF EXISTS foods_fts');
  await database.run('DELETE FROM food_search_index_state WHERE singleton = 1', []);
}

export async function rebuildFoodSearchIndex(database: DatabaseConnection, now: () => string = () => new Date().toISOString()): Promise<boolean> {
  const rebuiltAt = requireUtcTimestamp(now());
  try {
    await database.withExclusiveTransaction(async (transaction) => {
      await transaction.exec("CREATE VIRTUAL TABLE IF NOT EXISTS foods_fts USING fts5(food_id UNINDEXED, source_key UNINDEXED, term, kind UNINDEXED, locale UNINDEXED, tokenize = 'unicode61 remove_diacritics 0'); DELETE FROM foods_fts; INSERT INTO foods_fts (food_id, source_key, term, kind, locale) SELECT id, 'food:' || id, normalized_name, 'canonical', NULL FROM foods; INSERT INTO foods_fts (food_id, source_key, term, kind, locale) SELECT a.food_id, 'alias:' || a.id, a.normalized_alias, 'alias', a.locale FROM food_aliases a LEFT JOIN seed_release_aliases sra ON sra.alias_id = a.id LEFT JOIN seed_catalog_state cs ON cs.active_release_id = sra.release_id WHERE a.origin <> 'seed' OR cs.singleton = 1; CREATE TRIGGER IF NOT EXISTS foods_fts_food_insert AFTER INSERT ON foods BEGIN INSERT INTO foods_fts (food_id, source_key, term, kind, locale) VALUES (new.id, 'food:' || new.id, new.normalized_name, 'canonical', NULL); END; CREATE TRIGGER IF NOT EXISTS foods_fts_food_update AFTER UPDATE OF normalized_name ON foods BEGIN DELETE FROM foods_fts WHERE source_key = 'food:' || old.id; INSERT INTO foods_fts (food_id, source_key, term, kind, locale) VALUES (new.id, 'food:' || new.id, new.normalized_name, 'canonical', NULL); END; CREATE TRIGGER IF NOT EXISTS foods_fts_food_delete AFTER DELETE ON foods BEGIN DELETE FROM foods_fts WHERE source_key = 'food:' || old.id; END; CREATE TRIGGER IF NOT EXISTS foods_fts_alias_insert AFTER INSERT ON food_aliases WHEN new.origin <> 'seed' BEGIN INSERT INTO foods_fts (food_id, source_key, term, kind, locale) VALUES (new.food_id, 'alias:' || new.id, new.normalized_alias, 'alias', new.locale); END; CREATE TRIGGER IF NOT EXISTS foods_fts_alias_update AFTER UPDATE OF normalized_alias, locale ON food_aliases WHEN new.origin <> 'seed' BEGIN DELETE FROM foods_fts WHERE source_key = 'alias:' || old.id; INSERT INTO foods_fts (food_id, source_key, term, kind, locale) VALUES (new.food_id, 'alias:' || new.id, new.normalized_alias, 'alias', new.locale); END; CREATE TRIGGER IF NOT EXISTS foods_fts_alias_delete AFTER DELETE ON food_aliases BEGIN DELETE FROM foods_fts WHERE source_key = 'alias:' || old.id; END");
      const release = await transaction.first<Readonly<{ active_release_id: string }>>('SELECT active_release_id FROM seed_catalog_state WHERE singleton = 1');
      await transaction.run('INSERT INTO food_search_index_state (singleton, schema_version, active_release_id, rebuilt_at) VALUES (1, ?, ?, ?) ON CONFLICT(singleton) DO UPDATE SET schema_version = excluded.schema_version, active_release_id = excluded.active_release_id, rebuilt_at = excluded.rebuilt_at', [SEARCH_SCHEMA_VERSION, release?.active_release_id ?? null, rebuiltAt]);
    });
    return true;
  } catch {
    await cleanup(database).catch(() => undefined);
    return false;
  }
}

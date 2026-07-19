# Local Database Design

Status: Phase 2 complete on 2026-07-15; final API 36 route-boundary, disposable verification, recovery, fresh-bootstrap, and relaunch evidence is recorded in HANDOFF.md

Engine: expo-sqlite / SQLite in app-private storage

Authority: local database for nutrition, history, goals, settings, accepted online foods, and metadata

## Design rules

- Foreign keys are enabled on every connection.
- WAL mode is enabled after open; select a measured busy timeout.
- All user/provider inputs use bound parameters and prepared statements.
- Migrations are forward-only, numbered, checksumed, and executed exclusively.
- A meal and every item snapshot commit in one exclusive transaction.
- Historical snapshots remain meaningful if foods are edited, archived, reseeded, or removed.
- Seed content, user content, and accepted online content remain distinguishable.
- Authoritative nutrition revisions are immutable. Editing creates a new revision.
- Search indexes and future embeddings are derived and rebuildable.
- Store energy and nutrient values at sufficient precision; round for display only and define any persisted normalization explicitly.
- Phase 2 numeric storage uses fixed-point scale 1,000,000 with checked, centralized conversion; no value or intermediate calculation may exceed JavaScript's safe-integer range.
- Timestamps are UTC instants plus the local calendar context needed for historical day grouping.

## Database files

Recommended initial design: one writable application database initialized from a bundled, rights-audited SQLite asset.

Why one database:

- Meals can atomically reference food revisions without cross-database transaction complexity.
- expo-sqlite can import a bundled asset on first creation.
- Backup/export, integrity checking, migration fixtures, and issue recovery stay understandable.

Seed upgrades for existing users must be data migrations or deterministic delta packages, not replacement of the writable database. User modifications create new revisions/aliases and never mutate a shipped seed revision.

If seed size or release cadence later justifies attached read-only catalogs, record a new decision and prove transaction, upgrade, and backup behavior first.

## Logical schema

Names and exact SQL types are finalized in the approved Phase 2 implementation. Migration 001 creates only `schema_migrations`, `food_sources`, `foods`, `food_revisions`, `food_aliases`, and `food_portions`. Meals, goals, settings, seed releases, FTS, model metadata, downloads, and online cache remain in their owning later phases.

### schema_migrations

| Field | Meaning |
|---|---|
| version | Monotonic primary key |
| name | Human-readable migration name |
| checksum | Hash of the immutable migration definition |
| applied_at | UTC application time |
| app_version | App version applying it |

PRAGMA user_version mirrors the latest completed version for tooling, while schema_migrations supplies auditability. A checksum mismatch is a developer/release error, not a reason to rewrite history.

## Phase 2 migration 001 contract

Migration `001-foundation` is itself the first checksummed migration; there is no separately-created or unchecksummed bootstrap schema. It creates `schema_migrations` first inside its exclusive transaction, then creates the remaining Phase 2 tables, validates them, inserts its own ledger record, and sets `PRAGMA user_version = 1` before commit.

All Phase 2 IDs are non-empty opaque `TEXT` primary keys. UTC instants are canonical UTC RFC 3339 `TEXT` values ending in `Z`, with either no fractional seconds or exactly three fractional digits; local calendar dates are canonical `YYYY-MM-DD` `TEXT` values. The boundary parser first checks this approved shape, then parses and round-trips it through UTC ISO serialization so impossible dates, leap days, clock components, and normalized instants are rejected before binding. SQL `CHECK` constraints reject empty identifiers and malformed basic shapes. Booleans are `INTEGER NOT NULL CHECK (value IN (0, 1))`; enumerations are constrained `TEXT` values.

The authoritative revision columns are `basis_quantity_scaled`, `calories_kcal_scaled`, `protein_g_scaled`, `carbohydrates_g_scaled`, `fat_g_scaled`, and nullable `fibre_g_scaled`, `sugar_g_scaled`, and `sodium_mg_scaled`. They are `INTEGER`; required nutrients use `CHECK (typeof(column) = 'integer' AND column BETWEEN 0 AND 9007199254740991)`, positive quantities use the same check with lower bound `1`, and optional nutrients are either `NULL` or satisfy that non-negative check. This keeps every value that crosses the Expo JavaScript boundary within `Number.MAX_SAFE_INTEGER`, even though SQLite itself can store larger signed integers.

`food_revisions` must declare both `UNIQUE(food_id, revision_number)` and the table-level constraint `UNIQUE(food_id, id)`. The latter is required because SQLite requires the referenced parent columns of a composite foreign key to be a declared primary key or unique key with matching collation; a unique `id` primary key alone is not a compatible parent key for the ordered pair `(food_id, id)`.

`foods` uses the deferrable composite foreign key `FOREIGN KEY (id, current_revision_id) REFERENCES food_revisions(food_id, id) DEFERRABLE INITIALLY DEFERRED`. `food_revisions.food_id` similarly references `foods(id)` as deferrable and initially deferred. This permits creation of a food and its first revision in one transaction while requiring the selected current revision to belong to that same food at commit. `food_revisions` also has `BEFORE UPDATE` and `BEFORE DELETE` abort triggers, preserving immutable authoritative revisions. A non-null `current_revision_id` is therefore not bypassable after a successful commit.

### seed_releases

| Field | Meaning |
|---|---|
| id | Stable seed release ID |
| source_manifest_hash | Hash of the reproducible source manifest |
| database_hash | Hash of the generated seed artifact |
| generated_at | Build timestamp |
| app_version | First app version containing it |
| record_count | Validated record count |

### food_sources

| Field | Meaning |
|---|---|
| id | Local source record ID |
| provider | manual, seed provider name, USDA, Open Food Facts, or other approved provider |
| provider_record_id | Stable external ID when present |
| dataset_version | Dataset/retrieval version |
| source_url | Canonical record/dataset URL when permitted |
| license_id | Normalized license identifier |
| attribution | Required display attribution |
| retrieved_at | Retrieval/import time |
| payload_hash | Hash of normalized source values or retained raw evidence policy |

A unique provider plus provider_record_id plus dataset_version constraint prevents accidental duplicate source identities where the provider supports them.

### foods

| Field | Meaning |
|---|---|
| id | Stable local food identity |
| canonical_name | Current preferred display name |
| normalized_name | Deterministic search normalization |
| origin | seed, user, or accepted_online |
| current_revision_id | Current immutable nutrition revision |
| archived_at | Nullable archive time |
| created_at / updated_at | UTC audit times |

Food identity can remain stable while nutrition revisions change. Seed foods are not overwritten by user edits; edits produce a user-owned revision or derived food identity according to the Phase 4 merge policy.

### food_revisions

| Field | Meaning |
|---|---|
| id | Immutable revision ID |
| food_id | Owning food |
| revision_number | Monotonic within food |
| source_id | Provenance record; required except explicitly local manual data |
| basis_quantity_scaled | Positive fixed-point basis quantity at scale 1,000,000 |
| basis_unit | Canonical gram, millilitre, or each/serving basis |
| calories_kcal_scaled | Non-negative fixed-point energy |
| protein_g_scaled | Non-negative fixed-point protein |
| carbohydrates_g_scaled | Non-negative fixed-point carbohydrate |
| fat_g_scaled | Non-negative fixed-point fat |
| fibre_g_scaled / sugar_g_scaled / sodium_mg_scaled | Nullable fixed-point nutrients with explicit missing semantics |
| user_modified | Whether the user changed sourced values |
| created_at | UTC creation time |

Do not use zero to mean unknown. Nullable nutrients are unknown/not supplied; zero is a sourced or user-entered zero.

Revisions are immutable after insert. foods.current_revision_id changes only to a valid revision belonging to that food.

### food_aliases

| Field | Meaning |
|---|---|
| id | Alias ID |
| food_id | Target food |
| alias | Display alias |
| normalized_alias | Search key |
| locale | Optional BCP 47 language/region |
| origin | seed, user, or accepted_online |
| created_at | UTC time |

Use a uniqueness policy that exposes, rather than silently overwrites, an alias pointing to multiple foods. Ambiguous aliases produce candidates.

### food_portions

| Field | Meaning |
|---|---|
| id | Portion ID |
| food_id | Food identity |
| label | slice, small banana, tablespoon, cup, and similar |
| normalized_label | Search key |
| quantity | Positive portion count |
| equivalent_quantity | Positive canonical equivalent |
| equivalent_unit | gram, millilitre, or each |
| source_id | Portion provenance |
| created_at | UTC time |

A portion is an explicit food-specific conversion. It does not authorize a general volume-to-mass conversion for other foods.

### foods_fts

FTS5 virtual table derived from canonical names and aliases. Content synchronization is managed by explicit repository operations or tested triggers. It contains no authoritative nutrition.

Use FTS tokenizer/settings that are reproducible in the SDK 57 SQLite build. Measure ranking against the golden corpus. If the index is damaged, rebuild it from foods and food_aliases.

### meals

| Field | Meaning |
|---|---|
| id | UUID/local stable ID |
| occurred_at_utc | Meal instant |
| local_date | Calendar date at entry for stable daily grouping |
| timezone_offset_minutes | Offset at entry |
| timezone_id | Optional IANA ID when reliably available |
| meal_type | Validated category or user label policy |
| total_calories_kcal | Derived total snapshot |
| total_protein_g | Derived total snapshot |
| total_carbohydrates_g | Derived total snapshot |
| total_fat_g | Derived total snapshot |
| raw_text | Nullable, only if the user explicitly chooses to retain it |
| created_at / updated_at | UTC audit times |

Totals are stored for fast/history-stable reads but are always computed from the exact item snapshots within the same transaction. Tests assert equality within the declared decimal policy.

### meal_items

| Field | Meaning |
|---|---|
| id | Stable item ID |
| meal_id | Parent with cascade delete |
| position | Stable review/display order |
| food_id | Nullable link to current identity |
| food_revision_id | Nullable link to source revision |
| input_name | Confirmed name shown at save |
| input_quantity / input_unit | Confirmed user-facing amount |
| resolved_quantity / resolved_unit | Canonical amount used for scaling |
| basis_quantity / basis_unit | Revision basis at save |
| calories_kcal | Immutable item snapshot |
| protein_g / carbohydrates_g / fat_g | Immutable item snapshots |
| optional nutrient snapshots | Nullable values with missing semantics |
| resolution_method | manual, exact, alias, fts, vector, or accepted_online |
| source_provider / source_record_id | Provenance snapshot |
| source_dataset_version / source_license_id | Provenance snapshot |
| source_values_hash | Normalized source snapshot hash |
| user_modified | Whether confirmed nutrition differs from provider values |
| created_at | UTC time |

The foreign keys aid navigation/audit, but snapshot columns are history truth. If an archived/reseeded food is unavailable, meal detail still renders correctly.

### nutrition_goals

| Field | Meaning |
|---|---|
| id | Goal version ID |
| effective_local_date | First local date using this target |
| calories_kcal | Positive target |
| protein_g / carbohydrates_g / fat_g | Non-negative targets |
| created_at | UTC time |

Versioning makes a historical dashboard explainable. If product scope chooses current-goal-only behavior, record that simplification before implementation.

### app_settings

| Field | Meaning |
|---|---|
| key | Allowlisted setting key |
| value_json | Schema-validated serialized value |
| updated_at | UTC time |

Do not store API/provider/signing secrets. Prefer explicit typed repository methods over arbitrary key reads throughout UI code.

### installed_models

| Field | Meaning |
|---|---|
| model_id / version | Manifest identity |
| file_path | App-private final path |
| expected_size / actual_size | Byte validation |
| sha256 | Verified final file hash |
| format / architecture / quantization | Verified metadata |
| compatibility_status | Last deterministic check |
| verified_at | UTC verification time |
| active | Selected runtime model |
| last_loaded_at / last_error_code | Operational metadata without prompt data |

Only a verified record may be active. Enforce at most one active model unless runtime requirements change.

### model_downloads

| Field | Meaning |
|---|---|
| model_id / version | Manifest target |
| staging_path | App-private partial file |
| source_url | Allowlisted manifest URL |
| expected_size / expected_sha256 | Immutable expectation |
| bytes_downloaded | Durable progress |
| resume_data | SDK/native resume state if valid for this URL/version |
| etag / last_modified | Server identity when supplied |
| state | queued, downloading, paused, verifying, failed |
| updated_at / error_code | Recovery metadata |

Never store bearer tokens here. A changed manifest identity invalidates the partial file.

### online_lookup_cache

| Field | Meaning |
|---|---|
| cache_key | Normalized provider/query/contract key |
| response_json | Validated minimal candidate payload |
| provider | Backend provider |
| fetched_at / expires_at | Cache policy |
| contract_version | Decoder compatibility |

This transient cache is not authoritative. User-accepted results create food_sources, foods/revisions, aliases/portions as appropriate. Cache expiry does not delete accepted foods.

## Foreign-key contract

| Child field | Parent | Delete/update behavior |
|---|---|---|
| foods.(id, current_revision_id) | food_revisions.(food_id, id) | Deferrable composite FK; the revision must belong to the same food |
| food_revisions.food_id | foods.id | Restrict; archive foods instead of deleting referenced identity |
| food_revisions.source_id | food_sources.id | Restrict |
| food_aliases.food_id | foods.id | Cascade when an unreferenced food is truly deleted |
| food_portions.food_id | foods.id | Cascade when an unreferenced food is truly deleted |
| food_portions.source_id | food_sources.id | Restrict |
| meal_items.meal_id | meals.id | Cascade so explicit meal deletion is atomic |
| meal_items.food_id | foods.id | Set null or restrict/archive according to the finalized deletion policy |
| meal_items.food_revision_id | food_revisions.id | Set null or restrict/archive; snapshots remain authoritative |
| installed/download metadata | Manifest identity, not a mutable FK | Validate through the model catalog service |

The current-revision ownership rule is enforced by the composite foreign key above, backed by `UNIQUE(food_id, id)` in `food_revisions`; it is not repository-only validation. Integration tests must create a food/revision pair successfully, reject a cross-food current revision at transaction commit, and prove that a correctly declared composite parent key avoids SQLite's `foreign key mismatch` error.

After every open/migration, foreign_keys must read as enabled. Runtime and integration tests inspect the returned rows of `PRAGMA foreign_key_check` and fail unless there are zero rows.

## Index plan

Create only indexes justified by actual reads and verify query plans:

| Index | Supports |
|---|---|
| foods(normalized_name) with active/origin policy | Exact canonical lookup |
| food_aliases(normalized_alias, food_id) | Exact alias candidates |
| food_revisions(food_id, revision_number) unique | Revision history/current ownership |
| food_revisions(food_id, id) unique | Composite current-revision foreign-key parent key |
| food_sources(provider, provider_record_id, dataset_version) | Provenance deduplication |
| food_portions(food_id, normalized_label) | Unit/portion resolution |
| meals(local_date, occurred_at_utc desc, id) | Today and saved-date-first History reads |
| meals(occurred_at_utc desc, id) | Retained chronological query support |
| meal_items(meal_id, position) unique | Ordered detail and item aggregation |
| nutrition_goals(effective_local_date desc) | Applicable target lookup |
| installed_models(active) partial/unique policy | Single active verified model |
| model_downloads(state, updated_at) | Startup recovery |
| online_lookup_cache(expires_at) | Bounded expiry cleanup |
| foods_fts virtual index | Full-text candidates |

Avoid offset pagination for History. Phase 3C orders by saved `local_date DESC`, then `occurred_at_utc DESC`, then stable `id ASC`, and uses all three fields in the matching keyset cursor. This keeps captured-date groups contiguous, makes tied timestamps deterministic, and prevents page-boundary skips. Search/history query plans are tested with volume fixtures as data grows; Migration 002 remains immutable and requires no Phase 3C schema change.

## Migration protocol

Migration definitions are ordered JSON manifests named `001-foundation.json`, `002-...json`, and so on. Each has a numeric version, immutable name, ordered SQL statement array, and checked-in SHA-256 checksum. The canonical checksum payload is the fixed-key JSON representation of version, name, and statements only; statement line endings normalize to LF before UTF-8 hashing. A Node built-in `crypto` verifier checks source manifests, and `npm run check` runs that verifier before TypeScript, lint, and Jest. Runtime compares each recorded checksum with the manifest checksum; it need not hash migration source on-device and does not need `expo-crypto`.

1. Open the database without rendering data-dependent routes, set and verify the connection PRAGMAs outside a transaction, then read `PRAGMA user_version` and determine whether `schema_migrations` exists.
2. If the ledger is absent and `user_version` is `0`, treat the database as a valid empty first install. If the ledger is absent and `user_version` is greater than `0`, or the ledger exists with an impossible/gapped history, stop with a recoverable initialization error; never infer or rebuild history.
3. On a valid first install, open a dedicated Expo SQLite `useNewConnection` connection, enable and verify foreign keys and the bounded busy timeout before beginning `BEGIN EXCLUSIVE`. Migration 001 creates `schema_migrations` as its first statement, creates all its other schema objects, inserts its own version/name/checksum/audit record, then sets `PRAGMA user_version = 1`; all statements use that same exclusive connection and commit once.
4. On an existing valid database, verify every recorded migration against the local immutable manifest before entering one identically configured exclusive transaction for missing versions. Apply missing migrations in order, insert each audit record, and advance `user_version` in the same transaction.
5. Commit only if every statement, checksum, invariant, and deferred foreign key succeeds. A thrown error rolls back schema changes, ledger writes, and `user_version` together.
6. After commit, explicitly inspect the returned rows from `PRAGMA foreign_key_check`; any row is a recoverable initialization failure. Explicitly inspect the first returned value from `PRAGMA quick_check(1)` and require exactly `ok`; any other result is a recoverable integrity failure.
7. Only then expose repositories and render data-dependent navigation.

Expo SDK 57's `withExclusiveTransactionAsync` opens a new connection and starts `BEGIN` before its callback. SQLite cannot enable `foreign_keys` after a transaction has begun, so the Phase 2 adapter instead uses Expo's public `openDatabaseAsync(name, { useNewConnection: true })` option, enables and verifies foreign keys before `BEGIN EXCLUSIVE`, and closes that dedicated connection after commit or rollback. This preserves isolation while ensuring foreign-key enforcement on the exclusive connection; plain asynchronous transactions remain unsuitable for this critical section.

Migration rules:

- Never edit a released migration.
- Never silently drop user data.
- Destructive transformations use create-copy-validate-swap within one transaction.
- Retain migration fixtures for every supported production version.
- Backfills are idempotent or guarded by the schema version.
- Large backfills use a separately designed resumable plan rather than leaving a transaction unbounded.
- A failed migration leaves the previous version intact and produces a recoverable error.
- A first-install bootstrap is never outside the migration ledger or checksum protocol.

## Transactional meal-save protocol

Input to SaveMeal contains confirmed intent, not authoritative nutrient totals.

Inside one exclusive transaction:

1. Validate the meal envelope and non-empty item list.
2. Reload every selected food revision and portion.
3. Reject archived/missing/incompatible values with a typed conflict.
4. Convert units using pure domain rules.
5. Calculate full-precision nutrient snapshots.
6. Insert the meal with derived totals.
7. Insert ordered item snapshots with provenance.
8. Re-sum persisted item values or assert calculated totals before commit.
9. Commit.

Do not perform model inference, HTTP, file download, embedding creation, or user prompts within the database transaction. Those happen before review or after an authoritative commit as rebuildable work.

## Date, decimal, and rounding policy

Phase 2 fixes the storage scale at `SCALE = 1_000_000`. A single framework-independent numeric module owns `scale`, `unscale`, checked addition, checked multiplication/division, and comparison. It accepts only finite decimal input with at most six fractional digits after normalization; it never uses a binary floating-point result as authoritative storage.

- `scale` parses canonical decimal text into a safe integer and rejects values, products, or rounding requirements outside `0..Number.MAX_SAFE_INTEGER` instead of rounding silently.
- `unscale` returns canonical decimal text from a safe integer; presentation may format that text but cannot change stored value.
- Every persisted scaled value and every JavaScript intermediate must satisfy `Number.isSafeInteger`. Before multiplication, the module checks the operand bound; before addition, it checks the remaining headroom. SQL uses the matching `9007199254740991` upper bound in every scaled-value `CHECK` constraint.
- Source or user values with more than six fractional digits are rejected in Phase 2/3 until an explicitly approved rounding policy handles them. No source ingestion or meal calculation may silently truncate, use `Math.round` on an unsafe value, or rely on a SQLite value outside JavaScript-safe range.
- Phase 3 owns user-facing calorie/macro display precision and any explicitly approved input rounding mode. It must sum exact scaled item values, test lower/upper boundaries and overflow, then derive display-only values.
- Capture local_date at the user-confirmed meal timezone so later travel does not move historical meals to another day.
- Phase 3 queries Today by equality with the device's current local calendar date and each meal's saved `local_date`; History groups by that saved date. `occurred_at_utc` orders chronologically, and the captured offset is audit/display context that never re-groups a historical meal after travel.

Tests cover exact scale/unscale round trips, maximum safe stored values, rejected fractional precision, multiplication/addition overflow, SQL CHECK rejection above the safe bound, and daylight-saving date boundaries even though the initial target timezone may not use them.

## Seed build and upgrade

The build pipeline must:

1. Download/read only approved source artifacts with pinned versions and hashes.
2. Preserve raw evidence outside the mobile package according to provider terms.
3. Normalize into a documented intermediate schema.
4. Validate licenses, attribution, nutrients, basis units, duplicates, aliases, and portions.
5. Generate deterministic IDs or a stable ID mapping.
6. Create the SQLite asset and indexes.
7. Run integrity, foreign key, query, and golden-value tests.
8. Emit a source manifest, record count, artifact hash, and license notice.

The current legacy CSV fails the provenance gate and is input evidence only, not a source artifact.

## Backup, export, and recovery

- The approved privacy-first Phase 2 baseline is `android.allowBackup: false`. It disables Android backup and restore for all application data, not just the database. Until explicit export/import exists, uninstall, device loss, or device replacement can therefore cause unrecoverable local-data loss.
- This app-config change is verifiable as resolved configuration only in Phase 2. Proof that a generated native Android manifest and backup/restore behavior honor it is deferred to the later native/release phase; Expo Go uses its host application's manifest.
- Design a user-triggered export with schema version, manifest, hashes, and clear inclusion choices.
- If exports contain meal history, consider encryption and require an explicit destination chosen by the user.
- Imports validate size, format, schema range, checksums, IDs, and constraints in staging before merging.
- Corruption handling never auto-deletes. Offer retry, diagnostics, and export/recovery options where technically possible.

## Android SQLite integration harness

The Phase 2 Android-only development route is `/database-verification`, composed by `src/app/database-verification.tsx`; its recovery behavior is feature-owned in `src/features/shell/database/recovery-verification.tsx`. It is not linked from tabs or product settings. After the approved `npx expo start --android` API 36 test session is running, the tester opens the Metro URL shown by Expo with the Expo Router suffix `/--/database-verification` (for example, the displayed `exp://<metro-host>:<port>/--/database-verification` URL) through Expo Go's development URL entry. The route shows an explicit warning that it uses a disposable database only. Tests, Jest setup, testing-library imports, and Node builtin imports are prohibited under `src/app` and checked by `npm run verify:routes` before all other `npm run check` gates.

The route constructs the fixed database name `calorify-phase2-integration-test.db`, never imports the production database name or directory from the application database adapter, and creates no repository bound to the production database. Before each individual case it calls the test-only reset function for that exact literal name, opens a new connection, applies the normal connection invariants, runs the case, closes the connection, then resets that same literal test database in `finally`. The reset helper rejects every other name, including the production database name.

The screen has one `Run all cases` control. It disables itself while the fixed in-app list runs serially; every case performs its own reset/open/run/close/finally-reset lifecycle before the next begins: fresh bootstrap; idempotent reopen; composite ownership; cross-food ownership rejection; immutable revision; checksum mismatch; injected migration rollback; inconsistent user-version/ledger; numeric SQL constraint boundary; unique-constraint rejection; returned `foreign_key_check` and `quick_check(1)` validation; and exclusive concurrent writes. Each displays only a case ID, pass/fail state, and sanitized error category. It does not display SQL rows, database paths, meal data, or arbitrary exception text; a failed reset is itself a failed case.

The same guarded route also has a development-only `Verify recovery and Retry` control. It intentionally fails one initialization attempt, shows the normal non-destructive Retry UI, then initializes only `calorify-phase2-recovery-verification.db` after Retry. On its explicit Return action, it releases the gate-owned recovery connection exactly once before resetting that declared disposable database; a cleanup failure remains visible and does not silently navigate away. On Android Back or any uncontrolled route unmount it does not attempt a concurrent reset, instead retaining the harmless disposable file until the next safe pre-entry reset. It never opens, resets, or deletes `calorify.db`. This control is absent from production because the route itself renders not-found before any database is opened.

The route is guarded by `__DEV__`. If a production build reaches the path, it renders the existing safe not-found/error presentation, opens no database, and exposes no reset control.

## Required test matrix

- Fresh database and bundled-asset initialization.
- Upgrade from every supported schema fixture.
- Re-running already-applied migrations.
- Tampered migration checksum.
- Migration 001 bootstrap, including creation and population of its own ledger in one transaction.
- `user_version > 0` with no migration ledger, gapped ledger, and history/user-version disagreement.
- Failure injection at every create/copy/swap step.
- Foreign-key and uniqueness violations, including a successful composite current-revision relation without `foreign key mismatch` and rejected cross-food ownership.
- Inspection of returned `foreign_key_check` rows and `quick_check(1)` result, not merely execution of those PRAGMAs.
- Fixed-point scale/unscale, safe-bound, rounding-rejection, SQL constraint, and arithmetic-overflow tests.
- Meal failure on each item insert proving total rollback.
- Concurrent repository writes during exclusive work.
- FTS rebuild equivalence.
- Seed delta applied with user food/revision collisions.
- Unknown versus zero nutrients.
- Archive/edit food while historical meals remain unchanged.
- Timezone travel and boundary queries.
- Low storage/database full.
- Export/import round trip once implemented.

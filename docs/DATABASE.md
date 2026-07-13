# Local Database Design

Status: proposed; implement in PLAN.md Phase 2 after review

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

Names and exact SQL types are finalized in Phase 2. SQLite identifiers below describe required semantics.

### schema_migrations

| Field | Meaning |
|---|---|
| version | Monotonic primary key |
| name | Human-readable migration name |
| checksum | Hash of the immutable migration definition |
| applied_at | UTC application time |
| app_version | App version applying it |

PRAGMA user_version mirrors the latest completed version for tooling, while schema_migrations supplies auditability. A checksum mismatch is a developer/release error, not a reason to rewrite history.

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
| basis_quantity | Positive decimal basis |
| basis_unit | Canonical gram, millilitre, or each/serving basis |
| calories_kcal | Non-negative energy |
| protein_g | Non-negative protein |
| carbohydrates_g | Non-negative carbohydrate |
| fat_g | Non-negative fat |
| fibre_g / sugar_g / sodium_mg | Nullable future/display nutrients with explicit missing semantics |
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
| foods.current_revision_id | food_revisions.id | Restrict; repository verifies revision belongs to the food |
| food_revisions.food_id | foods.id | Restrict; archive foods instead of deleting referenced identity |
| food_revisions.source_id | food_sources.id | Restrict |
| food_aliases.food_id | foods.id | Cascade when an unreferenced food is truly deleted |
| food_portions.food_id | foods.id | Cascade when an unreferenced food is truly deleted |
| food_portions.source_id | food_sources.id | Restrict |
| meal_items.meal_id | meals.id | Cascade so explicit meal deletion is atomic |
| meal_items.food_id | foods.id | Set null or restrict/archive according to the finalized deletion policy |
| meal_items.food_revision_id | food_revisions.id | Set null or restrict/archive; snapshots remain authoritative |
| installed/download metadata | Manifest identity, not a mutable FK | Validate through the model catalog service |

SQLite cannot directly express “current_revision_id belongs to this food” with an ordinary foreign key. Enforce it through one repository operation plus a trigger or composite-key design selected and tested in Phase 2.

After every open/migration, foreign_keys must read as enabled. Migration and CI tests run foreign_key_check and fail on any row.

## Index plan

Create only indexes justified by actual reads and verify query plans:

| Index | Supports |
|---|---|
| foods(normalized_name) with active/origin policy | Exact canonical lookup |
| food_aliases(normalized_alias, food_id) | Exact alias candidates |
| food_revisions(food_id, revision_number) unique | Revision history/current ownership |
| food_sources(provider, provider_record_id, dataset_version) | Provenance deduplication |
| food_portions(food_id, normalized_label) | Unit/portion resolution |
| meals(local_date, occurred_at_utc desc) | Dashboard and daily history |
| meals(occurred_at_utc desc, id) | Keyset pagination |
| meal_items(meal_id, position) unique | Ordered detail and item aggregation |
| nutrition_goals(effective_local_date desc) | Applicable target lookup |
| installed_models(active) partial/unique policy | Single active verified model |
| model_downloads(state, updated_at) | Startup recovery |
| online_lookup_cache(expires_at) | Bounded expiry cleanup |
| foods_fts virtual index | Full-text candidates |

Avoid offset pagination for large history; use occurred_at_utc plus stable ID keyset cursors. Search/history queries are tested with EXPLAIN QUERY PLAN fixtures as data volume grows.

## Migration protocol

1. Open the database without rendering data-dependent routes.
2. Apply connection PRAGMAs, including foreign_keys ON.
3. Read PRAGMA user_version and schema_migrations.
4. Verify every already-applied migration checksum known to this app version.
5. Start one exclusive migration transaction.
6. Apply each missing migration in order with its transaction handle.
7. Run migration-specific invariants and foreign_key_check.
8. Insert migration audit row and update user_version only after that step succeeds.
9. Commit once; then run a bounded quick_check/integrity policy appropriate to database size.
10. Expose repositories and render navigation.

For expo-sqlite, use withExclusiveTransactionAsync and execute every statement through the provided transaction object. Plain asynchronous transactions can be affected by queries outside the transaction and are not suitable for this critical section.

Migration rules:

- Never edit a released migration.
- Never silently drop user data.
- Destructive transformations use create-copy-validate-swap within one transaction.
- Retain migration fixtures for every supported production version.
- Backfills are idempotent or guarded by the schema version.
- Large backfills use a separately designed resumable plan rather than leaving a transaction unbounded.
- A failed migration leaves the previous version intact and produces a recoverable error.

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

Decisions to finalize before Phase 3:

- Use a decimal/fixed-scale representation for calculations; do not rely on repeated binary floating-point rounding.
- Store more precision than the UI displays.
- Sum unrounded item results, then round the meal display.
- Define calorie/macro display decimals consistently.
- Capture local_date at the user-confirmed meal timezone so later travel does not move historical meals to another day.
- Query “today” using the current local calendar interval converted to UTC, while historical rows retain their saved local_date.

Golden tests cover daylight-saving transitions even though the initial target timezone may not use them.

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

- Exclude database, model files, partial downloads, and online cache from automatic Android backup by default until a privacy/security decision approves a format.
- Design a user-triggered export with schema version, manifest, hashes, and clear inclusion choices.
- If exports contain meal history, consider encryption and require an explicit destination chosen by the user.
- Imports validate size, format, schema range, checksums, IDs, and constraints in staging before merging.
- Corruption handling never auto-deletes. Offer retry, diagnostics, and export/recovery options where technically possible.

## Required test matrix

- Fresh database and bundled-asset initialization.
- Upgrade from every supported schema fixture.
- Re-running already-applied migrations.
- Tampered migration checksum.
- Failure injection at every create/copy/swap step.
- Foreign-key and uniqueness violations.
- Meal failure on each item insert proving total rollback.
- Concurrent repository writes during exclusive work.
- FTS rebuild equivalence.
- Seed delta applied with user food/revision collisions.
- Unknown versus zero nutrients.
- Archive/edit food while historical meals remain unchanged.
- Timezone travel and boundary queries.
- Low storage/database full.
- Export/import round trip once implemented.

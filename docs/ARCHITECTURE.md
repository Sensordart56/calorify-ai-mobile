# Calorify Mobile Architecture

Status: proposed baseline for phased implementation

Platform: Android first, Expo SDK 57, React Native 0.86, TypeScript strict

Runtime posture: local-first, manual-first, New Architecture

## Quality attributes in priority order

1. Nutrition correctness and explainability.
2. Offline availability and graceful degradation.
3. Local data durability and migration safety.
4. Privacy and minimal network disclosure.
5. Usability on practical Android phone hardware.
6. Testability and replaceable native/provider boundaries.
7. Performance, download size, and battery/thermal control.

## Runtime shape

    User input
       |
       +--> Manual form -------------------------+
       |                                         |
       +--> Optional local LLM extraction        |
                  |                              |
             food mentions only                  |
                  |                              |
                  +--> deterministic resolver <--+
                         | exact
                         | alias
                         | FTS candidates
                         | optional vector after evaluation
                         v
                   review and correction
                         |
                 authoritative save use case
                         |
            exclusive SQLite meal transaction
                         |
                dashboard/history/goals

    Unresolved candidate -- explicit opt-in --> future backend
                                                   |
                                          USDA / Open Food Facts
                                                   |
                                  provenance-rich candidates
                                                   |
                                      user accepts or edits
                                                   |
                                      local authoritative revision

Every arrow to the future backend is optional. If it fails, the flow returns to review/manual entry.

## Layer boundaries

| Layer | Owns | Must not own |
|---|---|---|
| Routes/screens | Navigation, layout, accessibility, interaction state | SQL, nutrition math, provider/model calls |
| Feature/application | Use-case orchestration, review state, commands, result types | Native details or unvalidated provider payloads |
| Domain | Units, portions, nutrition scaling, meal totals, goals, provenance rules | React, Expo, SQLite, filesystem, HTTP |
| Data | Repositories, migrations, queries, transactions, mapping | UI state or model prompts |
| Retrieval | Normalization, exact/alias/FTS ranking, confidence policy | Authoritative meal writes |
| Inference | Prompt/schema, runtime adapter, cancellation, compatibility | Nutrition values or food authority |
| Model lifecycle | Catalog, storage, resume, verification, activation | Meal interpretation or UI navigation |
| Online | Backend contract, provider normalization, privacy/timeout policy | Embedded provider secrets or direct scraping |

## Proposed source organization

    src/app/                     Expo Router composition
    src/features/logging/        input, review, manual entry
    src/features/dashboard/      today and goal progress
    src/features/history/        history and meal detail
    src/features/foods/          library, aliases, portions, revisions
    src/features/goals/          target editing
    src/features/settings/       privacy, models, data, about
    src/core/domain/             pure entities, units, nutrition, errors
    src/core/application/        use cases and ports
    src/data/sqlite/             database, migrations, repositories
    src/services/retrieval/      normalization and candidate ranking
    src/services/inference/      local model adapter and structured parse
    src/services/models/         downloads and installed-model state
    src/services/online/         optional backend client
    src/shared/                  UI primitives and infrastructure helpers
    tests/fixtures/              golden input, schema, and provider fixtures

Names may be refined in Phase 0, but dependencies point inward: Expo/native adapters implement application ports; domain code imports no framework.

## Application startup

1. Install global error handling that redacts user data.
2. Open the app-private SQLite database.
3. Enable foreign keys, WAL, and the selected busy timeout.
4. Run forward migrations exclusively and verify schema metadata.
5. Load settings and minimal dashboard state.
6. Discover installed model records and verify the selected file still exists; do not load it yet.
7. Render navigation.
8. Load a model only when the user enters model-assisted logging or explicitly preloads it.

A database migration failure produces a recovery screen with export/support options where feasible. It must not silently delete data. A missing/corrupt optional model disables AI entry but does not block startup or manual entry.

## Navigation and screens

Recommended stable route shape:

- Today: totals, goals, recent meals, Log meal action.
- Log: natural-language entry when compatible model exists, plus equal-priority Manual entry.
- Review: extracted items, candidate selection, quantities/units, unresolved items, totals preview.
- Manual food: existing food search or explicit food/nutrition creation.
- History and meal detail: local pagination/filtering, snapshot display, edit/delete.
- Goals: validated calories/macros.
- Food Library: user foods, aliases, portions, provenance, archive.
- Settings: privacy/network opt-in, data export/import, appearance.
- Models: compatibility, disclosure, download progress, active model, delete.
- About/Data Sources: licenses, limitations, support, privacy.

The Phase 0 shell uses the accepted stable Expo Router JavaScript Stack/Tabs APIs across native and web. Unstable native tabs are not a product dependency.

## Core domain flow

### Input

A DraftMeal contains:

- Optional user-entered raw text held in memory by default.
- Local timestamp and meal type.
- DraftItem values: extracted or manual display name, decimal quantity, normalized unit token, optional selected candidate/revision, and user edits.

The LLM output schema stops at display name, positive quantity, and supported unit string. It contains no calories, macros, IDs, source claims, or confidence treated as authority.

### Resolution

For each DraftItem:

1. Normalize Unicode, case, punctuation, whitespace, and safe singular/alias variants.
2. Match a canonical name exactly.
3. Match an alias exactly.
4. Query FTS and score a small candidate set.
5. Optionally add vector candidates only after a measured decision.
6. Apply conservative auto-selection rules; otherwise ask the user.
7. If no match is suitable, create/select a manual food or explicitly invoke online lookup.

Similarity alone never authorizes nutrition. The selected immutable FoodRevision and a valid UnitResolution do.

### Unit resolution

Supported canonical dimensions:

- Mass: milligram, gram, kilogram.
- Volume: millilitre, litre.
- Count/serving: each and named portions such as slice or tablespoon only when the food has a mapped equivalent.

Same-dimension conversions are deterministic. Cross-dimension conversion requires a food-specific FoodPortion. When no mapping exists, the user changes the unit, supplies a portion, or logs manual nutrition. No quantity-only fallback is allowed.

### Authoritative save

The SaveMeal use case:

1. Validates every draft value.
2. Opens an exclusive database transaction.
3. Reloads the selected immutable food revisions and portion mappings inside that transaction.
4. Computes each nutrient snapshot using decimal-domain rules.
5. Sums unrounded item values, then applies display/storage rounding policy.
6. Inserts the meal.
7. Inserts all meal-item snapshots.
8. Verifies or derives meal totals.
9. Commits once.

The transaction callback uses only its transaction handle. Any failure rolls back all meal writes. Search indexes and embeddings are derived data and cannot make the authoritative save fail after commit.

## State management

- SQLite is the durable source of truth for meals, foods, goals, settings, caches, and model metadata.
- Feature-local React state handles forms and review.
- A lightweight query/cache layer may coordinate repository reads after measured need; do not mirror the entire database in a global store.
- Model runtime state is an explicit finite state machine: unavailable, compatible-not-installed, downloading, verifying, installed, loading, ready, failed, deleting.
- Online lookup state is request-scoped and cancelable.

Avoid storing large model bytes, raw database pages, or full history lists in JavaScript memory.

## Error model and degradation

Use typed error categories with user-safe messages:

- Validation: correct fields locally.
- Ambiguous resolution: review candidate.
- Unknown food: manual entry or optional online lookup.
- Database busy/migration/corruption/storage: retry or recovery; never silently reset.
- Model unavailable/incompatible/out-of-memory/cancelled: switch to manual entry.
- Download interrupted/corrupt/insufficient storage: keep verified model and resume/retry staging.
- Online offline/timeout/quota/provider-invalid: return to local/manual flow.

Diagnostics may include coarse error codes, app version, schema version, device class, and model ID. They exclude raw meal text, food history, provider queries, database content, and credentials.

## Expo/Android choices

- Expo SDK 57 maps to React Native 0.86 and React 19.2; the repository is already aligned.
- SDK 57 is entirely New Architecture.
- Use Continuous Native Generation and configuration plugins rather than hand-maintained native projects.
- Native dependencies require development builds and rebuilds; Expo Go is not the model/extension test target.
- Expo SQLite supplies persistent storage, bundled database import, prepared statements, exclusive transactions, FTS, and an optional sqlite-vec build-time extension.
- Android production is distributed as an App Bundle; downloadable models stay outside the base bundle unless a later size/licensing decision says otherwise.
- Primary production ABI is arm64-v8a. x86_64 supports emulator functionality, not performance claims.
- Current SDK 57 Android compile/target API is 36. Test API 35/36 before release and monitor API 37 compatibility separately.
- The manual application configuration floor is Android 7/API 24, matching Expo SDK 57. This floor covers non-model functionality and remains subject to Phase 9 compatibility testing.
- Local-model RAM, storage, chipset, and supported-device tiers are separate capabilities and remain undecided until Phase 6 physical ARM64 benchmarks.

## Performance budgets to define

Phase owners must set measurable budgets rather than use subjective “fast”:

- Startup to interactive with no model load.
- Database open/migration by schema size.
- Exact and FTS query p95.
- Review/save transaction p95.
- Model cold-load time and peak resident memory.
- Extraction time p50/p95 and thermal/battery change over repeated use.
- Base AAB/download size, seed database size, optional model download sizes.
- Online fallback timeout and cache hit behavior.

Until measured, model/RAM/device tier claims are provisional.

## Privacy and backup

- Default operation has no network requirement after assets are installed.
- Raw meal text is processed locally and held in memory unless the user explicitly saves it.
- Future online lookup sends only a user-approved unresolved food query, not a meal, history, goals, device contacts, advertising ID, or model prompt transcript.
- Exclude the user database, staging downloads, and model files from Android automatic/cloud backup by default until an encrypted backup policy is approved.
- Prefer explicit local export/import with clear scope and user control.
- If crash reporting is adopted, opt-in/notice and aggressive redaction are required; no meal text by default.

## Testing architecture

- Pure domain tests: units, nutrition scaling, totals, validation, dates/timezones.
- Repository/migration tests: real SQLite files, every retained version, constraints, transactions, failure injection.
- Retrieval evaluation: versioned golden corpus and precision/recall/top-k report.
- Model contract tests: fake runtime for most tests; physical-device performance/compatibility suite for the spike.
- Download tests: local controlled HTTP fixture for range/resume/corruption scenarios.
- Online contract tests: recorded provider fixtures behind the backend boundary.
- Component/navigation tests: accessibility and state transitions.
- Android tests: API 35/36, lifecycle, process death, low storage, network transitions, TalkBack/font scaling.

## Deliberate exclusions from the first offline release

- Required login or cloud sync.
- Direct client calls containing provider secrets.
- Website scraping.
- Automatic acceptance of uncertain food matches.
- Generated nutrition.
- Vector search before lexical evaluation.
- Bundled legacy CSV without a rights audit.
- Arbitrary model URLs or user-entered daemon endpoints.
- Automatic publishing or signing.

## Primary technical references

- Expo SDK 57 version matrix: https://docs.expo.dev/versions/v57.0.0/
- Expo Router SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/router/
- Expo SQLite SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
- Expo New Architecture: https://docs.expo.dev/guides/new-architecture/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/

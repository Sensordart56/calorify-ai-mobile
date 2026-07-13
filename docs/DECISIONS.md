# Architecture Decision Log

Last updated: 2026-07-13

Status vocabulary:

- Accepted: working constraint for implementation.
- Proposed: preferred direction that still needs phase evidence or owner approval.
- Deferred: intentionally not selected yet.
- Rejected: outside the current plan.
- Blocked: unsafe until specified evidence/authority exists.

An Accepted decision is changed only by a new dated entry that supersedes it and explains migration/rollback impact.

## D-001 — Separate mobile repository

Date: 2026-07-13

Status: Accepted

Context: The legacy project contains a browser UI, Express, Prisma/PostgreSQL/pgvector, and Ollama assumptions that are not a mobile runtime. The user designated it read-only.

Decision: Build the Android application only in the separate mobile repository. On the current owner workstation it is checked out at C:\B Drive\Apps\calorify-ai-mobile; the read-only legacy checkout is at C:\B Drive\Apps\Calorify AI. These absolute paths are local context, not portable repository requirements. The intended future public repositories are https://github.com/Sensordart56/calorify-ai-mobile and https://github.com/Sensordart56/calorifyai-react-webapp respectively.

Alternatives: Convert the legacy repository in place; maintain one mixed web/mobile monorepo.

Consequences: Mobile has a clean dependency/build boundary. Useful domain concepts are reimplemented with tests rather than copying server infrastructure. Cross-repository documentation must identify evidence precisely.

Revisit when: Only if a human approves a monorepo migration with a safe history/build plan. Never infer permission to edit the legacy repository.

## D-002 — Android-first platform and test lanes

Date: 2026-07-13

Status: Accepted

Context: Google Play is the intended channel and local inference performance is hardware-sensitive.

Decision: Design for Android phones first. Set the non-model/manual application configuration floor to Android 7/API 24, matching Expo SDK 57. Use Android 16/API 36 as the primary emulator, API 35 for the main backward-compatibility lane, and API 37 as a later latest-platform lane when the Expo/RN toolchain supports it. Physical ARM64 phones decide local-model support/performance and permanent RAM/storage/chipset tiers.

Alternatives: Cross-platform parity from day one; emulator-only validation; target API 37 through manual native overrides.

Consequences: UI/domain boundaries should remain portable, but iOS is not a first-release gate. API 24 is the configured manual-app floor, not proof that every later feature is supported there. Emulator results cannot justify model RAM, thermal, battery, or latency claims.

Revisit when: The Android release is stable and an approved iOS/platform roadmap exists, or Play/Expo requirements change.

## D-003 — Expo SDK 57, New Architecture, CNG

Date: 2026-07-13

Status: Accepted

Context: The scaffold already resolves Expo 57.0.4, React Native 0.86, React 19.2.3, and strict TypeScript. SDK 57 is New-Architecture-only.

Decision: Keep the exact SDK 57 baseline, TypeScript strict mode, Continuous Native Generation, and Expo Router. Use development builds after native dependencies appear. Use the stable Expo Router JavaScript Tabs API; remove the starter unstable native-tabs path.

Alternatives: Immediate SDK change; legacy React Native architecture; hand-maintained Android project; Expo Go as the native-module runtime.

Consequences: Native packages must prove RN 0.86/plugin compatibility. Navigation has one shared native/web implementation and avoids an unstable product dependency. Generated native versions, including Gradle/AGP, are determined in the authorized native build phase.

Implementation evidence: Phase 0 removed all unstable-native-tabs imports, added stable Tabs with Today/Settings routes, and passed typecheck, lint, tests, and an Android export. The shell also passed an Android 16/API 36 Pixel_8 AVD review for launch, Today/Settings tabs, light/dark themes, 1.3 font scale, back behavior, force-stop, and relaunch. This is emulator UI/behavior evidence only.

Revisit when: A separately planned SDK upgrade is required by support/security/policy, or stable navigation evidence justifies another library.

## D-004 — Local-first and manual-first

Date: 2026-07-13

Status: Accepted

Context: Native inference, downloads, networks, providers, and backends can all fail independently.

Decision: Meal logging, food/manual nutrition, history, goals, and saves work without a backend, account, network, or model. Optional assets may be installed ahead of offline use. Manual entry remains first-class in every state.

Alternatives: Require a backend; require a model; require login/cloud sync.

Consequences: Startup and authoritative save cannot fetch configuration or call a service. Model/online failures degrade to local review/manual without data loss.

Revisit when: Only with explicit product-owner approval to change a mandatory invariant.

## D-005 — Model extracts food mentions only

Date: 2026-07-13

Status: Accepted

Context: The legacy prompt intends name/quantity/unit extraction, but a production boundary must be enforced rather than trusted.

Decision: Constrain and validate model output to food name, positive quantity, and unit. It supplies no nutrition, source, database ID, match authority, or medical guidance.

Alternatives: Ask an LLM for complete nutrition; accept free-form model JSON; use model confidence as authority.

Consequences: A deterministic resolver and immutable database/manual/accepted-online revision calculate nutrition. Every extracted field remains reviewable.

Revisit when: No current condition; any expansion needs a new safety/correctness decision and explicit owner approval.

## D-006 — SQLite replaces required server persistence

Date: 2026-07-13

Status: Proposed for Phase 2

Context: PostgreSQL, Prisma, pgvector, Express, and Docker cannot be required for an offline phone app.

Decision: Use one app-private writable expo-sqlite database initialized from an audited bundled asset, with direct typed repositories, prepared statements, foreign keys, WAL, and forward checksumed migrations.

Alternatives: Embedded object store; mobile ORM; separate attached read-only seed/user databases; retain a required server.

Consequences: Queries/transactions/migrations are explicit and testable. Seed upgrades are data migrations/deltas, not replacement of a user database.

Revisit when: Catalog size/update evidence shows attached catalogs or a proven ORM materially improves maintenance without weakening transactions, FTS, migration control, or recovery.

## D-007 — Transactional authority and immutable history

Date: 2026-07-13

Status: Accepted

Context: The legacy normal save trusts client nutrition/totals, custom-food work spans operations, and food edits can change historical identity.

Decision: The SaveMeal use case reloads selected immutable revisions/portions, validates unit dimensions, calculates snapshots/totals, and inserts the meal plus all items in one exclusive SQLite transaction. Item snapshots include identity, amounts/bases, nutrients, resolution, source/version/license/hash, and edit state.

Alternatives: Trust UI totals; write items one by one; join live food data for history; update nutrition rows in place.

Consequences: UI totals are previews. History remains explainable after edits/reseeds. Derived search/index work cannot control an authoritative commit.

Revisit when: Only if another storage engine proves equivalent atomicity, migration safety, and snapshot durability.

## D-008 — Dimensional unit conversion

Date: 2026-07-13

Status: Accepted

Context: Legacy mismatch fallback can treat quantity alone as a valid scale across grams, pieces, and tablespoons.

Decision: Mass, volume, and count are separate dimensions. Same-dimension conversion is deterministic; cross-dimension conversion needs an explicit food-specific portion. Ambiguity requires user correction.

Alternatives: Heuristic density/portion guesses; legacy quantity-only fallback.

Consequences: Some entries require more review, but silent large nutrition errors are prevented.

Revisit when: Approved source data supplies a traceable food-specific conversion or the user explicitly defines one.

## D-009 — Lexical retrieval before optional vectors

Date: 2026-07-13

Status: Accepted for initial implementation

Context: The legacy uses vector top-1 while stored aliases are unused. A second mobile embedding model adds storage, memory, initialization, licensing, and lifecycle cost.

Decision: Resolve normalized exact name, exact alias, then FTS/fuzzy candidates. Mark unknown clearly and offer Manual. Add vector fallback only if a versioned golden-corpus evaluation demonstrates material quality lift; precompute seed embeddings at build time if selected.

Alternatives: Vector-only; bundle/download an embedding model immediately; remote retrieval first.

Consequences: Initial resolution is small, fast, explainable, and offline. sqlite-vec and any embedding model remain deferred.

Revisit when: Phase 5 reports agreed precision/recall/top-k gaps and a vector spike passes size, runtime, licensing, and rebuild gates.

## D-010 — llama.rn and provisional small GGUF

Date: 2026-07-13

Status: Proposed for Phase 6

Context: Ollama is a desktop daemon. Recent llama.rn supports New Architecture, an Expo plugin, Android ABIs, and constrained generation, but native/model behavior is device-specific.

Decision: Spike a pinned llama.rn adapter with the ggml-org Qwen3 0.6B Q4_0 GGUF, approximately 429 MB, as the first candidate. Use 1.7B Q4-class and roughly 4B Q4-class only as optional comparison/power tiers. No embedding model initially.

Alternatives: Copy legacy qwen3:4b/nomic unchanged; use cloud inference; choose Gemma 3 1B QAT Q4 after a separate terms/size comparison; ship manual-only.

Consequences: The default is not approved until physical ARM64 accuracy, validity, latency, memory, thermal, battery, cancellation, and lifecycle evidence passes owner-defined thresholds. Manual-only remains a releasable fallback.

Revisit when: RN 0.86 integration fails, license/hosting review fails, the candidate misses thresholds, or a smaller officially supported model offers materially better evidence.

## D-011 — Verified app-private model lifecycle

Date: 2026-07-13

Status: Accepted design; implementation choice pending Phase 7

Context: Large model downloads can be interrupted, corrupted, replaced, incompatible, or too large; Ollama’s pull behavior is not an app-owned installation contract.

Decision: Use an app-trusted allowlisted manifest, app-private persistent staging/final paths, durable resume reconciliation, exact size, streaming SHA-256, GGUF/runtime checks, atomic activation, user deletion, and last-known-good rollback. Exclude models from backup.

Alternatives: Load arbitrary URLs; trust TLS/filename only; verify in JavaScript memory; overwrite the active model; bundle a large model in the base AAB.

Consequences: No partial/unverified file loads. Install consumes staging plus final headroom. A streaming/native whole-file hashing implementation and manifest-signature/hosting owner remain unresolved.

Revisit when: Expo/runtime APIs provide a simpler equally verified lifecycle, Play Asset Delivery becomes preferable, or measured size/update needs change distribution.

## D-012 — Legacy seed quarantined

Date: 2026-07-13

Status: Blocked

Context: The legacy CSV merges sources, strips row provenance, and may contain IFCT-derived records. Official IFCT publication restricts electronic reproduction for product creation without written permission.

Decision: Do not ship or import the legacy CSV into a release. Build a deterministic seed from approved sources with row-level provider/version/license/attribution/transformation lineage.

Alternatives: Assume all rows are open; display blanket attribution; copy the CSV and fix later; obtain reviewed written permission and reconstruct provenance.

Consequences: The first catalog may be smaller. Manual functionality must be complete. IFCT/unknown rows are a release blocker until excluded or authorized.

Revisit when: A rights owner provides reviewed permission and lineage can be proven, or the seed is rebuilt without restricted/unknown material.

## D-013 — Future online lookup through controlled backend

Date: 2026-07-13

Status: Proposed for Phase 10

Context: USDA requires a protected key; provider schemas/quotas/terms change; a mobile binary cannot keep secrets. General web results are weak nutrition authority.

Decision: After the offline product passes physical-device hardening, optionally send only an explicitly approved unresolved query to a Calorify backend. It calls fixed structured providers—USDA FoodData Central first and Open Food Facts selectively—using validation, rate/cost limits, cache, timeouts, minimal logs, and provenance.

Alternatives: Direct provider calls with embedded keys; arbitrary URL proxy; unrestricted web search/scraping; backend-required logging.

Consequences: Backend ownership, region, auth/abuse policy, retention, incident response, provider terms, and budget must be approved. Its outage never breaks local/manual behavior.

Revisit when: A provider offers a safe public client credentialless API, another regional source passes license/quality review, or product privacy/operations cannot support a backend.

## D-014 — Online candidates require explicit confirmation

Date: 2026-07-13

Status: Accepted

Context: Structured providers can be incomplete, duplicated, stale, or expressed with an incorrect serving basis.

Decision: Show identity, nutrient basis/values, provider ID, URL, retrieval time, match explanation, license/attribution, and warnings. Accept, edit, reject, and Manual are explicit actions. Original sourced values remain distinct from edits; only accepted revisions are authoritative/offline durable.

Alternatives: Auto-save first result; overwrite an accepted food on refresh; treat transient cache as authority.

Consequences: Review adds friction but preserves correctness/provenance. Provider failure returns to local/manual. Previously accepted revisions/history remain stable.

Revisit when: Only if a new source/candidate class has separately proven deterministic identity and an owner approves a narrower auto-accept rule with rollback evidence.

## D-015 — No scraping or general web in the first release

Date: 2026-07-13

Status: Accepted

Context: HTML/search snippets introduce unstable extraction, licensing, attribution, serving, prompt-injection, and security risk.

Decision: Use only licensed structured local data and approved structured provider APIs. Do not fetch arbitrary URLs, scrape sites, or generate online nutrition.

Alternatives: Browser automation, search engine snippets, LLM web research, arbitrary user URLs.

Consequences: Unknown foods sometimes require manual entry. Prompt injection is outside the initial provider path because provider text is not fed to an LLM.

Revisit when: A separate threat/legal/quality design is explicitly approved after the structured product is mature.

## D-016 — Backup/export and telemetry are conservative

Date: 2026-07-13

Status: Proposed/Deferred

Context: Meal history is sensitive, model files are large/re-downloadable, and third-party diagnostics can alter Play disclosures.

Decision: Exclude database, model, staging, and cache from automatic Android backup until an encrypted user-understood design is approved. Plan explicit export/import. Select no analytics/crash SDK during architecture; any future provider must redact meal/query/prompt data and update privacy/Data Safety.

Alternatives: Default cloud backup; unencrypted broad export; analytics/crash SDK by default; no recovery/export path.

Consequences: Device loss recovery is initially limited. Privacy/network behavior stays simple. Export encryption/retention and telemetry ownership remain unresolved.

Revisit when: Phase 2/Play security review approves an export/backup format or Phase 9 demonstrates a diagnostics need and acceptable processor/retention controls.

## D-017 — Production AAB, optional post-install model

Date: 2026-07-13

Status: Proposed for Play phase

Context: Google Play distributes AABs and model files are large, optional, hardware-sensitive, and independently updatable.

Decision: Ship the app and audited seed through the AAB. Install compatible models after clear size/network consent from controlled hosting. Use human-controlled Play App Signing/upload custody.

Alternatives: Put a large GGUF in the base bundle; Play Asset Delivery; require model install; unsigned/sideload-only production.

Consequences: Model hosting/manifest/download operations become release dependencies, while initial app size and device admission improve. Store listing must disclose model size/support/manual fallback.

Revisit when: Measured base size, offline onboarding, Play delivery capabilities, or hosting operations favor an equally verifiable asset-delivery design.

## D-018 — External release actions require explicit approval

Date: 2026-07-13

Status: Accepted

Context: Signing, provider registration, deployment, console declarations, upload, and rollout affect external systems and may be irreversible.

Decision: Agents may prepare and verify local artifacts only within the current phase. Signing-key generation/rotation, backend deployment, Play mutation/upload/publish, and production promotion require explicit human authorization.

Alternatives: Automated agent release; implicit approval from implementation tasks.

Consequences: HANDOFF and Play checklist separate readiness from external execution. Production upload and promotion are distinct approvals.

Revisit when: A human defines a scoped automated release policy with credentials, approvers, audit, and rollback.

## D-019 — Provisional development identity

Date: 2026-07-13

Status: Accepted for development; not approved for store publication

Context: The public repository and development shell need consistent links without prematurely fixing a permanent Play identity.

Decision: Use Calorify AI as the approved provisional display name, calorify-ai-mobile as the Expo slug, and calorify as the approved provisional URL scheme. Document com.sensordart56.calorify as the recommended future Android application ID, but do not configure it or describe it as Play-approved.

Alternatives: Keep the accidental calorifyaimobile scheme; remove all schemes; configure the candidate package immediately; claim the provisional name is permanent.

Consequences: Development deep-link configuration is consistent while the permanent store name/package/brand decision remains reversible. Any public release must explicitly approve and configure the application ID.

Revisit when: The owner approves permanent store identity, brand assets, deep-link ownership, and signing/store custody.

## D-020 — Public source license and non-publishing CI

Date: 2026-07-13

Status: Accepted

Context: The intended mobile repository is public. The inherited license named only Expo, and local checks need a portable checkpoint gate without granting deployment authority.

Decision: Apply MIT to original Calorify AI Mobile source under Sensordart56 while preserving the Expo template notice. Explicitly exclude automatic relicensing of dependencies, assets, datasets, and model weights. Add read-only GitHub Actions CI on pushes and pull requests to main using Node 22, npm ci, and npm run check; it performs no build publication, signing, deployment, or upload.

Alternatives: Leave the template-only notice; omit a source license; treat third-party/data/model licenses as MIT; add publishing CI.

Consequences: The source grant is explicit, third-party obligations remain separate, and future GitHub checks mirror local Phase 0 verification without external release effects.

Implementation evidence: The Phase 0 public-tree scan found no environment files, signing material, databases, model weights, release artifacts, foods.csv, or recognized secret patterns. docs/PHASE_0_AUDIT.md records every direct dependency and starter asset removed or retained. The workflow parses as YAML and contains only checkout, Node setup, npm ci, and npm run check.

Revisit when: The legal owner/entity changes, a contributor policy is adopted, or CI scope is deliberately expanded with separate authority.

## Unresolved decision register

| Owner decision | Needed by |
|---|---|
| Permanent store name, Android application ID authorization, brand/store owner | Before store configuration |
| Local-model RAM/storage/chipset/device tiers | Phase 6 |
| Exact decimal/storage rounding policy | Phase 2/3 |
| Historical goal versions versus current-goal-only semantics | Phase 3 |
| Licensed seed sources, IFCT permission/exclusion, provenance owner | Phase 4 |
| Retrieval metrics and auto-selection thresholds | Phase 5 |
| Model acceptance thresholds and physical test phones | Phase 6 |
| Model host, manifest signature, file hashing implementation | Phase 7 |
| Optional larger model/license comparison | Phase 6/7 |
| Telemetry/crash reporting and retention | Phase 9/Play |
| Backend owner/region/auth/rate/cost/incident policy | Phase 10 |
| Provider terms/attribution and cache TTLs | Phase 10 |
| Backup/export encryption and retention | Phase 2/Play |
| Play account type, signing custody, support/privacy owners | Before Play setup |

# Calorify Mobile Delivery Plan

Last updated: 2026-07-15

This plan deliberately separates product slices from high-risk native, data, and distribution work. A phase starts only after the prior gate is satisfied. If a gate fails, keep the last working phase intact and record the rollback or revised decision in docs/DECISIONS.md and HANDOFF.md.

## Objective and definition of done

Build a production-quality Android-first Calorify port that preserves useful meal logging, history, goals, settings, and review behavior while replacing Express/PostgreSQL/Ollama with an offline mobile architecture. The product is done only when the offline/manual application is durable, optional local inference is device-qualified, any online fallback is controlled and user-confirmed, Play compliance evidence is current, closed testing is complete, and a human has approved a reproducible production candidate.

A phase is done only when:

- Its deliverables and acceptance gate are satisfied.
- Required tests pass, or an exact blocker/runtime gap is recorded without pretending success.
- Risks and new/reversed decisions are recorded.
- The working tree is understood and HANDOFF.md is updated.
- The next task is the smallest next phase, not a later feature bundle.

Update HANDOFF.md after every meaningful implementation milestone and before intentionally changing models, IDEs, agents, or human owners.

## Current status

| Work | Status |
|---|---|
| Architecture/planning inspection and ten documents | Completed |
| Phase 0 — Baseline, review cleanup, and provisional identity | Complete |
| Phase 1 — Mobile shell and offline navigation | Complete on 2026-07-14; static checks and required representative API 36 runtime gate passed |
| Phase 2 — SQLite foundation and migrations | Complete on 2026-07-15: corrected API 36 deep-link, disposable verification, recovery, fresh-bootstrap, and relaunch gates passed |
| Phase 3 — Complete manual logging slice | Complete on 2026-07-19: Phase 3A/3B plus SQLite-backed Today/History, API 36 online/offline, mutation, pagination, accessibility/layout, lifecycle, and final automated gates passed |
| Phases 4–14 | Pending |
| Emulator/device/runtime verification | Phase 0/1 shell, Phase 2 SQLite, and the complete Phase 3 manual product passed their representative Pixel_8/API 36 gates; no API 35/37, TalkBack, physical-device, local-model, performance, release, or Play claim |

## Macro roadmap

| Stage | Detailed phases |
|---|---|
| Foundation | Phase 0 |
| Mobile shell | Phase 1 |
| Offline product | Phases 2-5 |
| Local AI | Phases 6-8 |
| Android hardening | Phase 9 |
| Online fallback | Phases 10-11 |
| Store release | Phases 12-14 |

## Locked decisions

- Separate mobile repository; legacy repository remains read-only.
- Android-first Expo SDK 57, React Native New Architecture, TypeScript strict, and CNG/development-build path.
- Local/manual operation is complete without model or backend.
- SQLite replaces required PostgreSQL/Prisma; llama.rn is only a gated replacement candidate for Ollama.
- Model output never supplies nutrition.
- Transactional authoritative saves, foreign keys, migrations, and historical snapshots.
- Exact/alias/FTS retrieval precedes any measured vector fallback.
- Online results require explicit user acceptance and backend-protected keys.
- Trusted structured providers precede any general-web capability; scraping is excluded initially.
- No external publishing/signing/deployment without explicit authorization.

## Cross-phase dependencies

| Dependency | Blocks |
|---|---|
| Permanent store identity/application ID authorization | Store artifact and publication, not the provisional Phase 0 shell |
| Deterministic lint/test baseline | Every implementation gate |
| SQLite schema/migrations | Manual logging, seed, accepted online cache |
| Complete manual slice | Model-assisted and online UX |
| Seed license/provenance audit | Bundled nutrition release |
| Golden retrieval/extraction corpus | Vector decision and model acceptance |
| Physical ARM64 phones | Model/device support decision |
| Verified model host/manifest/hash path | Model lifecycle release |
| Backend/privacy/terms/operator approval | Online fallback |
| Developer account/signing/privacy owners | Play release candidate |

## Top risks and responses

| Risk | Response/gate |
|---|---|
| Unknown/restricted seed rights | Quarantine legacy CSV; ship only audited rows |
| Model memory/latency/thermal failure | Small candidate spike on physical phones; manual fallback |
| Corrupt/interrupted large downloads | Staging, resume reconciliation, streaming hash, atomic activation |
| Wrong food/unit silently accepted | Conservative lexical pipeline, dimensional rules, user review |
| Local data loss during upgrades | Forward exclusive migrations, fixtures, snapshots, no silent reset |
| Online provider outage/quota/schema drift | Backend validation/cache/budgets/circuit breaker; local fallback |
| SDK/native dependency incompatibility | Pinned Phase 6 development-build spike before product integration |
| Policy drift before launch | Recheck current official Play requirements at Phase 12 |
| Scope collapse into one rewrite | Phase gates, rollback points, HANDOFF discipline |

## Unresolved decisions

- Permanent store name, Android application ID authorization, brand assets, and store/signing owners.
- Local-model RAM/storage/chipset/device tiers and physical benchmark phones.
- Licensed seed sources and IFCT permission/exclusion.
- Retrieval and model acceptance thresholds.
- Model hosting, signed manifest, streaming hash implementation, and optional tiers.
- Telemetry/no-telemetry, encrypted export/backup policy.
- Online backend region, abuse/auth, retention, cost, and operations.

## Non-negotiable release outcomes

1. A user can log, edit, inspect, and delete meals without a network or model.
2. Model output contains only structured food mentions; nutrition remains database- or user-authoritative.
3. Meal writes are atomic and historical items retain full nutrition and provenance snapshots.
4. The app can recover from interrupted downloads, corrupt assets, low storage, killed processes, and unavailable online providers.
5. No secret ships in the client, and no seed or online dataset ships without verified distribution rights and provenance.
6. Android API 35 and 36 are tested before release; API 37 is an early-compatibility lane once the toolchain supports it.

## Phase 0 — Baseline and product identity

Status: complete on 2026-07-13; checkpoint ready for human review; Phase 1 remains unauthorized

Deliverables:

- Replace default demo assumptions with a consistent provisional development name/slug/scheme, a documented but unconfigured Android application ID candidate, and a manual-app Android floor.
- Add deterministic lint, type-check, and unit-test commands that work without network access.
- Use the accepted stable Expo Router JavaScript Tabs API; do not add unstable native tabs.
- Add a small architecture skeleton only; no database, model runtime, or whole-product implementation.
- Establish accessibility, localization-ready copy, privacy-safe logging, and error-boundary conventions.
- Prepare the local tree for a future public repository with source licensing, secret/data/model safeguards, cross-platform line endings, and non-publishing CI.

Evidence:

- Expo public configuration resolves as SDK 57 with provisional display name Calorify AI.
- Provisional URL scheme is calorify; candidate com.sensordart56.calorify remains documentation-only and unconfigured.
- Manual-app configuration floor is Android 7/API 24; local-model device tiers remain gated on Phase 6 physical benchmarks.
- npm run check passes strict type checking, zero-warning lint, and two Jest suites.
- Bounded Android JavaScript export succeeds: 1 Hermes bundle, 1,237 modules.
- Stable Expo Router Tabs replaces all unstable-native-tabs imports.
- Route files compose two feature screens through core/shared boundaries.
- Public-repository scan found no committed environment files, signing material, databases, model weights, release artifacts, foods.csv, or recognized secret patterns; the exact dependency/asset review is recorded in docs/PHASE_0_AUDIT.md.
- GitHub Actions is read-only CI for pushes and pull requests to main: Node 22, npm ci, and npm run check, with no signing, publishing, deployment, or artifact upload.
- Pixel_8 AVD runtime verification on Android 16/API 36 covered launch, Today, Settings, tab switching, light/dark readability, 1.3 font scale, Android back behavior, force-stop, and relaunch.
- The runtime evidence is x86_64 emulator UI/behavior evidence only; no physical-device, ARM64, model, performance, thermal, battery, or store-compatibility claim was made.
- Expo Go, Metro, and the emulator were stopped after verification; light mode and font scale 1.0 were restored first.

Gate:

- Satisfied: provisional display name, slug, and URL scheme are owner-approved and consistent.
- Satisfied: candidate Android application ID is documented without configuring or presenting it as store approval.
- Satisfied: manual-app floor is separated from Phase 6 model capability tiers.
- Satisfied: no unexplained SDK dependency drift.
- Satisfied: deterministic checks and bounded Android export pass.
- Satisfied: the authorized API 36 shell runtime review and public-repository scan are recorded.
- Satisfied: PLAN.md, docs/DECISIONS.md, and HANDOFF.md agree on the Phase 0 checkpoint and remaining store/model decisions.
- At the Phase 0 checkpoint, Phase 1 remained pending and required separate authorization.

Rollback:

- Revert only Phase 0-owned scaffold changes; the repository returns to the verified SDK 57 starter.

## Phase 1 — Mobile shell and offline navigation

Status: complete on 2026-07-14. Static checks passed, and the required representative Pixel 8 Android 16/API 36 runtime gate passed: light-mode navigation and ordinary Back; dark mode and 1.3x font scale on Today, Manual Entry, Settings, and Food Library; text and decimal keyboard behavior; fixture search states; portrait enforcement; and final clean relaunch. Comprehensive screen-by-screen dark-mode/keyboard testing, TalkBack, API 35/API 37, physical-device, and Predictive Back validation remain deferred to Phase 9 or their designated later gates.

Deliverables:

- Implement stable route groups and phone layouts for Today/Log, Review, History, Goals, Food Library, Settings, Models, and About.
- Add shared theme, accessible controls, loading/empty/error states, and app-level error handling.
- Use in-memory fixtures only. Include a permanent Manual entry route.

Tests:

- Route and reducer unit tests.
- Accessibility-label smoke tests.
- Android API 36 emulator navigation, configured portrait-orientation policy, ordinary Android Back, keyboard, and process-restart checks. Predictive Back is deferred to Phase 9.

Gate:

- Every primary screen is reachable and usable without network access.
- No business logic lives in route components.
- Satisfied: the required representative API 36 runtime evidence is recorded in HANDOFF.md; light mode and font scale 1.0, plus normal rotation settings, were restored before shutdown.

Rollback:

- Keep the navigation shell and remove fixture-specific feature code.

## Phase 2 — SQLite foundation and migrations

Status: complete on 2026-07-15. D-006 remains accepted. The corrected API 36 gate proved that a cold `/database-verification` deep link remains reachable outside the product database gate; all 12 disposable cases and the recovery failure/Retry/Return flow passed. After that proof, the owner explicitly authorized clearing Expo Go data on the Pixel_8 development emulator only, removing the obsolete pre-publication `calorify.db` with its superseded Migration 001 checksum. The fresh normal route then bootstrapped Migration 001 and reached Today; a force-stop and relaunch reached Today again with no red screen, JavaScript exception, or final Metro application error. This was development cleanup only, not production recovery behavior; no automatic reset was added. Migration 001 is immutable after publication.

Deliverables:

- Add expo-sqlite with a typed repository boundary.
- Create the schema in docs/DATABASE.md using forward-only, checksumed migrations.
- Enable foreign keys, WAL, and a bounded busy timeout on every opened database.
- Add migration, constraint, corruption, backup-exclusion, and repository tests.
- Initialize navigation only after the database is ready or a recoverable error is shown.

Tests:

- Empty install to current schema.
- Upgrade from every retained schema fixture.
- Interrupted/failed migration rollback.
- Foreign-key rejection and concurrent write serialization.

Gate:

- Schema version and migration history agree.
- A failed migration never exposes a partially upgraded database.
- Satisfied: the guarded verification route is structurally outside the product gate and remained reachable on a cold API 36 deep link despite the obsolete production-database checksum.
- Satisfied: all 12 disposable integration cases and the intentional recovery failure/Retry/Return flow passed on API 36 without opening, resetting, or deleting `calorify.db`.
- Satisfied: after the owner-authorized, development-only Expo Go clear, Migration 001 bootstrapped the normal database and Today survived a force-stop/relaunch with no application error.

Rollback:

- Restore the prior app/database fixture in development. Production migrations remain forward-only.

## Phase 3 — Complete manual logging slice

Status: complete on 2026-07-19. Phase 3A/3B established the transactional manual product; Phase 3C replaced Today and History fixtures and passed query, arithmetic, component, accessibility, route, static/config, migration-identity, export, safety, and owner-assisted Pixel_8/API 36 online/offline, mutation, pagination, layout, navigation, and lifecycle gates. The runtime gate found and corrected a duplicate post-edit Meal Detail stack entry; edit-save now returns to the existing detail and focus reloads its authoritative snapshot before one Back returns to the originating list. Live Expo Doctor still reports only newer SDK 57 patch recommendations than the locked baseline; dependency changes remain separately scoped and were not required for Phase 3.

Deliverables:

- Manual foods, compatible portion conversions, meal creation/edit/delete, goals, dashboard totals, history, and detail.
- Recompute nutrition inside the domain save use case and write meal plus items in one exclusive transaction.
- Store immutable item snapshots even if a source food is later edited or archived.
- Add local export/import design hooks without implementing cloud sync.

Tests:

- Rounding, date/timezone, unit compatibility, daily boundaries, goal progress, CRUD, and atomic failure tests.
- Verify a failed item insert leaves no meal or partial item rows.

Gate:

- The useful product works end-to-end with airplane mode and no model installed.

Rollback:

- Before Migration 002 is exposed, disable only incomplete Phase 3 UI paths. Once Migration 002 has run, a Phase 2 binary correctly rejects the unknown future migration and is not a safe rollback target; preserve the database and use a compatible feature-disable or a fix-forward migration/recovery build. Never reset user data as rollback.

## Phase 4 — Licensed seed database

Status: complete on 2026-07-20. Static/provenance gates pass; a clean Medium Phone Android API 36 bootstrap installed and disclosed `usda-fdc-v1-2026-04`, and force-stop/relaunch preserved the active release without a native crash. Release-delta rules are covered by deterministic upgrade tests; a second real catalog release is not fabricated solely for runtime evidence.

Deliverables:

- Quarantine the legacy CSV until every record has defensible provenance and redistribution rights.
- Build a reproducible source-to-SQLite pipeline with source manifests, licenses, checksums, validation, duplicate rules, aliases, portions, and nutrient revisions.
- Bundle a compact, indexed SQLite seed asset and define delta migrations for existing users.
- Publish an in-app data-sources notice.

Tests:

- Import deterministic checksum.
- Nutrient ranges, unit dimensions, duplicate identity, alias collisions, referential integrity, and representative query fixtures.
- Legal/provenance audit produces no unknown rows.

Gate:

- Written permission exists for restricted material, or that material is excluded.
- Every shipped nutrition row maps to a recorded source and license.

Rollback:

- Ship a smaller fully licensed dataset; manual logging remains complete.

## Phase 5 — Lexical food resolution and review

Status: complete on 2026-07-20. Automated gates pass at 100% unique-exact auto-selection precision and 100% top-five recall for the versioned alias, prefix, and reordered corpus. Medium Phone Android API 36 verified automatic canonical exact resolution, explicit alias and reordered-FTS review, unresolved/manual fallback, and live lookup while emulator networking was disabled.

Deliverables:

- Resolve normalized exact names, aliases, and FTS candidates in that order.
- Rank conservative candidates and present uncertain/ambiguous matches for user confirmation.
- Never convert between mass, volume, and count without an explicit portion mapping.
- Create a golden corpus covering spelling, plurals, regional names, mixed units, and unknown foods.

Tests:

- Precision/recall and top-k reports by query class.
- No silent acceptance below the approved confidence threshold.

Gate:

- Exact/alias/FTS quality is measured before any vector dependency is considered.
- Unknown foods route to manual entry without blocking a meal.

Rollback:

- Disable approximate ranking and retain exact, alias, and manual paths.

## Phase 6 — Local model feasibility spike

Deliverables:

- Use a development build and integrate llama.rn behind a runtime interface.
- Benchmark the provisional small-model candidate described in docs/MODEL_RUNTIME.md on a representative physical ARM64 phone, a low-memory phone if available, and the API 36 x86_64 emulator for functional checks.
- Constrain output with a JSON grammar/schema to food name, quantity, and unit; disable thinking and keep context/output bounded.
- Evaluate structured validity and extraction quality against the golden corpus.

Tests and measurements:

- Cold load, peak memory, time to first token, tokens/second, p50/p95 completion time, thermal behavior, cancellation, background/foreground, repeated runs, malformed output, and low-storage/low-memory recovery.

Gate:

- The model meets an approved latency, memory, validity, and extraction threshold on real target hardware.
- Manual mode remains available when compatibility or capacity checks fail.
- The default model choice remains provisional until this gate passes.

Rollback:

- Remove the native runtime from the product path and ship manual plus lexical logging.

## Phase 7 — Verified model lifecycle

Deliverables:

- Implement catalog manifest, compatibility checks, consent and size disclosure, free-space checks, resumable staging download, durable progress, streaming SHA-256 verification, GGUF metadata validation, atomic activation, cancellation, deletion, and rollback to the last known-good model.
- Store files in app-private storage and exclude them from backup.
- Support provisional device tiers as recommendations, never as guaranteed compatibility.

Tests:

- Network loss, restart, killed app, corrupt bytes, wrong checksum, wrong architecture, insufficient disk, server without range support, duplicate request, and interrupted activation.

Gate:

- No partial or unverified file can become active.
- A broken catalog or download cannot break manual logging.

Rollback:

- Delete staged assets and retain the last verified model or manual-only mode.

## Phase 8 — Offline natural-language logging

Deliverables:

- Connect local extraction to deterministic retrieval, review/edit, and transactional save.
- Show unresolved foods and conversions explicitly.
- Persist no prompt or raw meal text beyond what the user chooses to save.

Tests:

- End-to-end golden meal corpus, cancellation, process death, multilingual/unsupported input messaging, and privacy-safe diagnostics.

Gate:

- Nutrition never comes from generated text.
- Users can correct every extracted field before save.
- All online code remains absent or disabled.

Rollback:

- Disable natural-language entry while retaining all manual records and paths.

## Phase 9 — Android hardening

Deliverables:

- Test API 35 and 36 phones/emulators, representative RAM/storage tiers, lifecycle, font scaling, TalkBack, dark mode, timezones, locale decimals, predictive back, backup/restore policy, update migrations, battery and thermal behavior.
- Add privacy-preserving crash/ANR handling only after the telemetry decision is approved.

Gate:

- No critical crash, data-loss, accessibility, privacy, or migration issue remains.
- API 37 compatibility observations are recorded when the SDK/toolchain lane is available.

Rollback:

- Narrow the supported-device policy or disable the risky optional capability.

## Phase 10 — Controlled online service

Deliverables:

- Build a separately deployed backend adapter for USDA FoodData Central first and Open Food Facts where appropriate.
- Keep provider keys server-side; enforce provider allowlists, schemas, timeouts, retries, rate limits, budget caps, caches, and minimal logs.
- Send only the unresolved food query after an explicit user action; never send meal history.
- Return normalized candidates with stable provider IDs and provenance.

Tests:

- Contract tests against recorded provider fixtures, quota/rate-limit behavior, malformed payloads, provider outage, cache expiry, abuse controls, and secret scanning.

Gate:

- Privacy, terms, cost, operational ownership, and incident procedures are approved.
- The local app is fully useful while the backend is down.

Rollback:

- Remotely or locally disable online lookup without a client data migration.

## Phase 11 — Online fallback review and cache

Deliverables:

- Add opt-in lookup for unresolved foods, candidate comparison, provenance display, accept/edit/reject, and local authoritative revision creation.
- Preserve sourced values separately from user edits.
- Cache only reviewed/accepted nutrition as authoritative; give transient query caches an expiry.

Gate:

- Provider failure or rejection always returns to local/manual review.
- Data Safety and privacy disclosures match observed traffic.

Rollback:

- Disable online lookup and keep already accepted local records with provenance.

## Phase 12 — Play readiness

Deliverables:

- Complete the checklist in docs/PLAY_STORE.md: AAB configuration, target API, signing custody, store assets, privacy policy, Data Safety, Health apps declaration, data-source licenses, model disclosures, accessibility, content, support, account/deletion applicability, reviewer instructions, and test tracks.
- Generate release notes and a reproducible release candidate without publishing.

Gate:

- Compliance evidence is reviewed by a human owner.
- No key, restricted dataset, debug endpoint, development server, or unverified model is present.

Rollback:

- Do not promote the release candidate; address the failed checklist item in a new build.

## Phase 13 — Closed test and production decision

Deliverables:

- Run the applicable Play closed-test period and tester count, collect structured feedback, inspect pre-launch reports and Android vitals, and rehearse staged rollout/rollback.
- Decide whether local model download is default, optional, or deferred based on field data.

Gate:

- A human explicitly authorizes production submission.
- Production monitoring and rollback owners are named.

Rollback:

- Halt the track or staged rollout. No automated publishing is authorized by this plan.

## Phase 14 — Production readiness

Deliverables:

- Resolve every closed-test/pre-launch blocker, freeze the approved dependency/data/model manifests, reproduce the final AAB, and verify its hashes/configuration.
- Finalize support, incident response, staged-rollout thresholds, database fix-forward plan, backend/model kill switches, and release ownership.
- Prepare a human-review packet covering licenses, privacy/policy declarations, device evidence, known limitations, and rollback.

Gate:

- No unresolved critical data-loss, correctness, security, privacy, license, accessibility, crash/ANR, policy, or device-support risk.
- Named humans approve upload and, separately, production promotion.

Rollback:

- Keep the candidate out of production or halt a staged rollout. Fix forward with a new verified artifact.

## Cross-phase evidence rules

- Static success is not runtime success.
- Emulator success is not physical-device model performance.
- A model repository checksum is not a verified downloaded file until checked on-device.
- Passing tests is not a license audit.
- Store policy requirements must be rechecked against current official sources immediately before submission.
- Each phase updates HANDOFF.md with commands actually run, commands still required, and any new blocker.
- Update HANDOFF.md before intentionally switching models, IDEs, agents, or human owners.

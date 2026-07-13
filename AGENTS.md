# Calorify Mobile Working Rules

This repository is the Android-first Expo/React Native successor to the legacy Calorify web application.

## Documentation and scope

- Before writing or changing Expo code, read the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ and the relevant versioned subpages.
- Treat PLAN.md as the phase contract and HANDOFF.md as the current source of truth. Work on one approved phase at a time.
- Update HANDOFF.md at every meaningful handoff with completed work, checks, remaining risks, and exact next commands.
- Keep architectural decisions and reversals in docs/DECISIONS.md. Do not silently replace an accepted decision.
- On the current owner workstation, the legacy repository is at C:\B Drive\Apps\Calorify AI and is reference-only. This absolute path is local development context, not a portable repository requirement. Do not edit it.

## Product invariants

- The core experience is local-first and must remain usable offline after optional assets are installed.
- Manual food and meal entry must always work without a model, network, account, or backend.
- A language model may extract only food names, quantities, and units. It must never invent nutrition values.
- Authoritative nutrition comes only from the bundled database, an explicit manual entry, or an online result the user reviewed and accepted.
- Store meal history, goals, settings, model state, accepted foods, and lookup caches locally.
- An online lookup failure must never prevent an offline/manual save.
- Never put API keys, provider secrets, signing keys, or service credentials in the app or repository.
- A meal and all of its items are written in one exclusive database transaction.
- Enable foreign keys, use forward-only versioned migrations, and preserve immutable historical nutrition snapshots.
- Treat downloaded models and databases as untrusted until their size, checksum, format, and compatibility are verified.
- Do not scrape food websites in the first release.

## Expo and native constraints

- Keep Expo SDK 57, React Native 0.86, React 19.2, TypeScript strict mode, and the New Architecture unless a separately approved upgrade phase changes them.
- SDK 57 is New-Architecture-only. Do not plan a legacy-architecture fallback.
- Use the accepted stable Expo Router JavaScript Tabs API. Do not reintroduce unstable native tabs without a new decision and test evidence.
- Keep Continuous Native Generation: native Android files are generated artifacts unless a decision records otherwise.
- Use development builds once native modules such as llama.rn or SQLite extensions are introduced. Expo Go is not a compatibility target for those phases.
- Do not run prebuild, add native packages, or create native projects during documentation-only work.
- The manual-app configuration floor is Android 7/API 24, matching Expo SDK 57. Release support still requires the later compatibility matrix.
- Target phone ARM64 first. Keep x86_64 only where it materially helps emulator testing.
- Do not define permanent local-model RAM, storage, chipset, or device tiers before the Phase 6 physical ARM64 benchmarks.

## Code and data boundaries

- Route files are composition points, not places for business logic, SQL, model orchestration, or network policy.
- Put domain rules in framework-independent TypeScript. Put SQLite, model runtime, filesystem, and online providers behind typed interfaces.
- Keep TypeScript strict. Do not add unchecked any, suppressions, or non-null assertions to bypass a design problem; narrow untrusted values at boundaries.
- Prefer explicit result/error types, immutable inputs, small pure functions, and dependency injection through application ports.
- Keep files feature-oriented under src/features, domain/application policy under src/core, adapters under src/data or src/services, and shared presentation primitives under src/shared.
- Keep tests beside a feature or under tests according to the Phase 0 convention; keep golden/provider/migration fixtures versioned and free of secrets.
- UI values are never authoritative meal nutrition. Re-resolve foods and recompute item and meal totals inside the save use case.
- Convert units only through compatible dimensions or an explicit food portion mapping. Ambiguous conversions require user confirmation.
- Use prepared statements and parameter binding for every query containing user or provider data.
- Do not log meal text, food history, model prompts, database rows, file paths containing user data, tokens, or secrets.
- Keep source identity, license, retrieval time, and user edits distinguishable for imported and online nutrition.
- Bundled seed data must have distributable licensing and row-level provenance. Unknown provenance is a release blocker.

## Local model and online boundaries

- A local model is optional. Gate llama.rn behind a typed adapter, constrained JSON, device compatibility checks, cancellation, and a permanent manual fallback.
- Store models in app-private persistent storage. Download into a separate staging path, resume safely, verify exact size/SHA-256/GGUF compatibility, then activate atomically.
- Do not select a default or device tier from model-card claims alone; require the physical ARM64 benchmark gate in PLAN.md.
- Search the local database before any network request.
- Future online search is separately enabled/invoked and sends only the minimum unresolved query to a controlled backend.
- Only approved structured providers are allowed. No arbitrary proxy, URL fetch, HTML scraping, search snippets, or client-held provider key.
- Preserve provider ID, URL, retrieval time, dataset/version, license/attribution, original values, and user edits. Nothing becomes authoritative until the user accepts it.

## Verification and safety

- Prefer bounded checks: configuration inspection, type checking, linting, unit tests, migration tests, and non-interactive builds.
- Do not start Docker, PostgreSQL, Ollama, the legacy server, an emulator, or a long-running Expo/Metro process unless the current phase explicitly requires it.
- Never claim runtime verification unless it actually ran. Record unavailable runtime checks in HANDOFF.md with the exact future command.
- Do not publish, sign, upload, create store listings, send external messages, or perform irreversible external actions without explicit authorization.
- Preserve user changes and unrelated worktree edits. Do not use destructive Git commands.

Allowed planning/development commands include bounded inspection and the repository scripts:

    git status --short
    npm ls --depth=0
    npx expo config --type public
    npx expo-doctor
    npm run typecheck
    npm run lint
    npm test -- --run

The last four commands are expected to become deterministic in Phase 0; until then, HANDOFF.md records which exist and pass. The repository currently has no native/EAS release-build configuration. Phase 12 may define and verify a production AAB command such as eas build --platform android --profile production, but that can contact an external build service and requires explicit authorization. Dependency installation, prebuild, native generation, development servers, emulators, physical-device commands, and release builds are phase-scoped actions, not routine inspection.

Runtime verification expectations:

- UI/database behavior: Android API 36 primary emulator, API 35 backward-compatibility lane, and API 37 later compatibility lane.
- Local-model compatibility/performance: representative physical ARM64 Android phones, including the approved lowest tier. Emulator results are never performance evidence.
- Release: inspect the production AAB plus run the physical-device, accessibility, lifecycle, offline, update/migration, storage, memory, thermal, and battery matrices.

Change-scope rule: implement only the current PLAN.md phase. Do not opportunistically add a later database, model, online, analytics, permission, build, or publishing capability.

## Definition of done for a phase

A phase is done only when its documented deliverables exist, its bounded checks pass or are truthfully recorded, new decisions are captured, and HANDOFF.md contains the smallest safe next phase. Update HANDOFF.md after every meaningful milestone and before intentionally switching models, IDEs, agents, or human owners. Passing static checks is not evidence of emulator, device, inference, network, or Play Console verification.

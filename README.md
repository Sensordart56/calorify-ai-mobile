# Calorify AI Mobile

Android-first, local-first mobile port of Calorify AI, built with Expo SDK 57, React Native 0.86, Expo Router, and strict TypeScript.

Phase 3 provides the complete offline manual product. Phases 4–5 add a verified USDA FoodData Central Foundation Foods catalog, forward-only Migration 003, and conservative exact/alias/FTS lookup with explicit review. Static, provenance, lexical-quality, and representative Android API 36 runtime gates pass. Local inference, model downloads, and online lookup remain intentionally unimplemented.

## Current product contract

- Manual nutrition logging remains useful without a network, account, backend, or model.
- A future local model may extract only food names, quantities, and units.
- Nutrition comes from local database records, explicit manual entry, or a sourced online result accepted by the user.
- Meals are re-resolved and saved transactionally with immutable historical snapshots.

## Quality checks

Install the locked dependencies, then run:

    npm ci
    npm run check

npm run check verifies routes, immutable migration identities, the licensed seed artifact and lexical quality report, then runs strict TypeScript, zero-warning Expo ESLint, and deterministic Jest tests.

The seed artifact can be reproduced from the pinned official source archives with `npm run build:seed`; `npm run verify:seed` rejects source-contract, selection, license-notice, byte-length, hash, provenance, or integrity drift.

Additional bounded inspection:

    npx expo config --type public
    EXPO_OFFLINE=1 npx expo install --check

PowerShell equivalent:

    $env:EXPO_OFFLINE='1'; npx expo install --check

Starting Android or Expo/Metro is a runtime action and is not required for static verification:

    npm run android

Do not use that command unless the current phase explicitly calls for emulator verification.

## Current shell

- Stable Expo Router JavaScript tabs: Today, Log, History, and Settings.
- Database-backed product: Today, History, Manual food, Food Library, Food Detail, Review meal, Meal Detail, and Goals.
- About and Data Sources reports the active catalog release and its USDA/CC0 basis; Models remains informational for its later phase.
- Feature screens live under src/features; route files only compose those screens.
- Framework-independent contracts live under src/core.
- Shared presentation primitives live under src/shared.

Identity currently used for development:

- Approved provisional display name: Calorify AI.
- Expo slug: calorify-ai-mobile.
- Approved provisional URL scheme: calorify.
- Recommended future Android application ID: com.sensordart56.calorify.

The Android application ID is documentation-only and is not configured or authorized for Play publication. The manual-app configuration floor is Android 7/API 24, matching Expo SDK 57; local-model RAM/storage/device tiers remain gated on Phase 6 physical-phone benchmarks.

## Public repository and licensing

The intended repository is https://github.com/Sensordart56/calorify-ai-mobile, owned by the Sensordart56 GitHub account. The configured remote is https://github.com/Sensordart56/calorify-ai-mobile.git. Commit, push, signing, deployment, and publishing remain separate owner-authorized actions.

The root MIT LICENSE intentionally covers the original Calorify AI Mobile application source in this repository and preserves the Expo template notice. It does not automatically relicense:

- npm/Expo/React Native dependencies;
- fonts, icons, images, or other third-party assets;
- nutrition datasets or imported provider records;
- model weights, tokenizers, prompts distributed with third-party terms;
- generated build artifacts.

Those materials retain their own licenses, notices, attribution, and redistribution requirements. The bundled nutrition catalog is derived only from pinned USDA FoodData Central Foundation Foods under CC0 1.0; its source contract, reviewed selection, license notice, exclusions, row provenance, and hashes live under `data/seed/usda-v1`. No model weight is included.

## Project documents

- AGENTS.md — durable implementation rules.
- PLAN.md — gated delivery phases.
- HANDOFF.md — current evidence, blockers, and continuation prompt.
- docs/ARCHITECTURE.md — target mobile architecture.
- docs/DATABASE.md — planned local schema and migration contract.
- docs/MODEL_RUNTIME.md — optional local inference feasibility plan.
- docs/ONLINE_FALLBACK.md — future controlled online lookup.
- docs/PLAY_STORE.md — release-readiness checklist.
- docs/DECISIONS.md — architecture decision log.
- docs/LEGACY_ARCHITECTURE.md — inspected legacy behavior and defects.

On the owner workstation, the legacy project is at C:\B Drive\Apps\Calorify AI and is read-only reference material. That absolute path is local development context, not a portable repository requirement.

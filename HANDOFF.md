# Current Handoff

Last updated: 2026-07-14

## Project and checkpoint

Calorify AI Mobile is the Android-first, local/manual-first port of the legacy Calorify application.

- Writable repository on the current owner workstation: `C:\B Drive\Apps\calorify-ai-mobile`
- Read-only legacy reference on the current owner workstation: `C:\B Drive\Apps\Calorify AI`
- Public mobile repository: https://github.com/Sensordart56/calorify-ai-mobile
- Public legacy repository: https://github.com/Sensordart56/calorifyai-react-webapp
- Branch: `main`, tracking `origin/main`
- Origin: https://github.com/Sensordart56/calorify-ai-mobile.git
- Phase 0 checkpoint commit: `34b29c540dfcf729d9e4d431a2263420ca3c298c`
- Initial public push: successful on 2026-07-14
- Working tree: clean after the repository handoff commit
- Current phase: Phase 0 complete and published
- Next implementation phase: Phase 1 is pending and is not authorized

The Phase 0 checkpoint and this documentation-only handoff were committed and pushed under explicit owner authorization. No pull request, release, tag, issue, signing action, artifact upload, deployment, repository-setting change, or other external action was performed.

## Completed Phase 0 work

- Kept the Expo SDK 57 baseline: Expo 57.0.4, React Native 0.86.0, React 19.2.3, TypeScript 6.0.3 strict, and New Architecture.
- Replaced the starter unstable/custom tab paths with stable Expo Router JavaScript Tabs.
- Added minimal Today and Settings routes backed by feature screens, plus `src/core`, `src/features`, and `src/shared` boundaries.
- Added shared accessible screen/card primitives, a root error-boundary convention, a not-found route, strict linting, Jest configuration, and deterministic repository scripts.
- Applied the approved provisional development identity: display name `Calorify AI`, slug `calorify-ai-mobile`, and URL scheme `calorify`.
- Kept candidate Android application ID `com.sensordart56.calorify` documentation-only and unconfigured because it is not approved for Play/store use.
- Documented Android 7/API 24 as the manual-app configuration floor. Permanent local-model RAM, storage, chipset, and device tiers remain a Phase 6 physical ARM64 decision.
- Added explicit MIT source licensing, public-repository safeguards, cross-platform line-ending policy, and read-only GitHub Actions checks.
- Removed only proven-unused starter demo assets, code, reset script, and direct dependencies. The complete item-by-item rationale is in `docs/PHASE_0_AUDIT.md`.

No SQLite, food data, llama.rn, sqlite-vec, model files, backend, online lookup, analytics, native project, signing, or Phase 1 screen set was added.

## Public-repository review

The bounded Phase 0 scan found:

- No `.env` file, `foods.csv`, signing key/certificate, database, model weight, APK/AAB, or other release artifact in the publishable tree.
- No recognized private-key, GitHub-token, AWS-key, OpenAI-key, Slack-token, or assigned API-key/secret/password/token pattern.
- No unexpected Git remote or external GitHub state was found before publication; the authorized destination was empty.
- Owner-workstation absolute paths only in planning/handoff context, where they are explicitly labeled local and non-portable.
- MIT covers original application source; dependencies, retained provisional Expo-derived assets, future data, and future models remain subject to their own licenses.

The retained icon, adaptive-icon, favicon, splash, and `assets/expo.icon` files are provisional Expo-derived development assets referenced by app configuration. Final brand assets remain an owner decision.

## Runtime evidence

The Phase 0 shell was verified with Expo Go on the already-running `Pixel_8` AVD:

- Android 16/API 36, 1080 × 2400, reported emulator model `sdk_gphone64_x86_64`.
- App launch to Today.
- Today and Settings content and two-way tab switching.
- Corrected provisional identity copy and tab labels without missing-glyph icons.
- Readability in light and dark themes.
- Basic Android text scaling at `1.3`; Today and Settings app content remained readable without clipping.
- Android back from Settings returned to Today; the next back returned to the launcher.
- Expo Go force-stop and relaunch succeeded through the emulator host address `exp://10.0.2.2:8081`.
- A final default-display relaunch succeeded with light mode and font scale `1.0` restored.

During server turnover, Expo Go briefly showed its development-only connection/reloading UI. Reconnecting through Android's standard emulator host address completed successfully; no application error overlay was present in the final checks.

This is x86_64 emulator UI/behavior evidence only. It is not evidence for a physical phone, ARM64 compatibility, model feasibility, memory, latency, thermal behavior, battery behavior, or Play device support.

After verification:

- Expo Go was force-stopped.
- The Metro process was stopped and port 8081 was confirmed to have no listener.
- The emulator was killed and `adb devices` reported no attached devices.

Future equivalent shell verification, after explicitly starting an API 36 AVD, is:

```powershell
npm run android
```

Future model verification remains gated on representative physical ARM64 phones in Phase 6.

## Checks

The Phase 0 checkpoint passes:

```powershell
npm run typecheck
npx eslint . --no-cache --max-warnings=0
npm run lint
npm test -- --runInBand
npm run check
npx expo config --type public --json
git diff --check
```

Additional evidence:

- `EXPO_OFFLINE=1 npx expo install --check` reports dependencies aligned, with Expo's expected offline-validation warning.
- Two Jest suites and two tests pass.
- Public Expo configuration resolves SDK 57, name `Calorify AI`, slug `calorify-ai-mobile`, and scheme `calorify`, with no Android package configured.
- `.github/workflows/ci.yml` parses as YAML and runs Node 22, `npm ci`, and `npm run check` for pushes and pull requests to `main`; it does not publish, sign, deploy, or upload artifacts.
- `.gitattributes` classifies source/configuration as normalized text and binary assets as binary.
- `npm ls --depth=0` passes.

The Phase 0 checkpoint was committed and pushed after the checks passed. The documentation-only handoff commit leaves the working tree clean on `main`, tracking `origin/main`.

## Notable review corrections

- TypeScript-only ESLint rules are scoped to `*.ts`/`*.tsx`.
- Documentation consistently selects stable Expo Router Tabs.
- The app scheme now matches the approved provisional `calorify` value.
- The manual-app API 24 configuration floor is separate from future physical model-capability tiers.
- “Committed commands” wording was removed; these are repository scripts in an uncommitted tree.
- Proven-unused demo assets and direct dependencies were removed and individually documented.
- Public-source license, `.gitattributes`, CI, secret/data/model/signing exclusions, and scan evidence were added.

## Remaining owner decisions

These do not block the Phase 0 checkpoint but must be resolved before the indicated later work:

- Permanent store name, Android application ID authorization, final brand assets, store organization, and signing custody: before store/native release configuration.
- Licensed seed sources, IFCT permission/exclusion, and provenance ownership: Phase 4.
- Model acceptance thresholds, representative physical phones, permanent device tiers, model hosting, manifest signing, and hashing implementation: Phases 6–7.
- Telemetry/no-telemetry and encrypted export/backup policy: Phase 9/Play readiness.
- Online backend privacy, region, abuse controls, retention, cost, provider terms, and operations: Phase 10.

## Exact next task

Review the published Phase 0 checkpoint. Begin Phase 1 only if the owner separately authorizes it; do not infer Phase 1 authorization from Phase 0 completion or publication.

## Do not do

- Do not edit the local legacy reference or copy its `foods.csv`.
- Do not start Phase 1, SQLite, llama.rn, model/data/backend work, native generation, or online lookup without separate authorization.
- Do not configure the candidate Android application ID as if it were store-approved.
- Do not make physical-device/model/performance claims from this emulator run.
- Do not perform further Git publication, signing, upload, deployment, or release actions without explicit approval.

## Copyable continuation prompt

```text
Continue Calorify AI Mobile from C:\B Drive\Apps\calorify-ai-mobile.

Read AGENTS.md, PLAN.md, HANDOFF.md, docs/ARCHITECTURE.md, docs/DECISIONS.md, and docs/PHASE_0_AUDIT.md. Before changing Expo code, read the exact relevant Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/.

Phase 0 is complete and published at commit 34b29c540dfcf729d9e4d431a2263420ca3c298c. The local branch is main, tracks origin/main, and the authorized public repository is https://github.com/Sensordart56/calorify-ai-mobile. Phase 1 is not authorized. Do not add Phase 1 screens, SQLite, llama.rn, models, food data, backend/online work, native projects, signing, further publishing, or legacy-repository changes.

Preserve the provisional identity: Calorify AI, calorify-ai-mobile, and calorify. Keep com.sensordart56.calorify documentation-only until store identity is explicitly approved. Treat Android 7/API 24 only as the manual-app configuration floor; physical ARM64 tests in Phase 6 decide model/device tiers.

If asked to review the checkpoint, inspect only. If separately authorized to begin another phase or perform Git/external actions, state that authority precisely and update PLAN.md, docs/DECISIONS.md, and HANDOFF.md with exact evidence.
```

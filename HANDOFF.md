# Current Handoff

Last updated: 2026-07-15

## Current state

- Repository: `C:\B Drive\Apps\calorify-ai-mobile`
- Read-only legacy reference: `C:\B Drive\Apps\Calorify AI`
- Branch: `feature/phase-2-sqlite-foundation` (local only; no upstream configured)
- Base: `6159532` / `origin/main`
- Phase 0: complete and published.
- Phase 1: merged into `main` through pull request #1 on 2026-07-14; merge commit `6159532`.
- Before Phase 2 planning, local `main` was clean and synchronized with `origin/main` at `6159532`.
- Phase 2: complete on 2026-07-15. The corrected API 36 deep-link, disposable verification, recovery, fresh-bootstrap, and force-stop/relaunch gates passed.
- Implementation commit: `e3219ec31dfb2ddd20955e578e5397de20e503c9` (`feat: implement phase 2 SQLite foundation`).
- Published branch: `feature/phase-2-sqlite-foundation`, tracking `origin/feature/phase-2-sqlite-foundation`; remote feature head is `e3219ec31dfb2ddd20955e578e5397de20e503c9` before this handoff commit.
- `main` and `origin/main` remain unchanged at `6159532406baa53227e321224583e00993f7e7ee`. No pull request, merge, tag, release, deployment, native-project generation, or Phase 3 work occurred.
- Owner planning decisions approved: fixed-point storage scale `1,000,000` with JavaScript-safe arithmetic constraints, and privacy-first `android.allowBackup: false` with the documented no-backup/no-restore recovery tradeoff.
- Implemented the revised contract: checksum verification through `npm run check`, atomic checksummed Migration 001 bootstrap, returned-PRAGMA validation, and a disposable development-only Android integration route. D-006 is accepted based on the completed API 36 evidence.
- Phase 1 publication: `e193209` (`feat: implement phase 1 mobile shell`) and `d05b6c9` (`docs: record phase 1 publication handoff`) remain ancestors of `main`; retain the existing local and remote Phase 1 branch.
- `expo-sqlite` was installed at the SDK-compatible version. No native project generation, merge, tag, release, deployment, or production publishing occurred.
- Final publication verification passed: `npm run check` (13 suites, 71 tests), public Expo configuration (`android.allowBackup: false` and `expo-sqlite` plugin), offline `npx expo install --check`, `git diff --check`, migration checksum verification, and intended-scope/artifact inspection.
- Accepted backup limitation: `android.allowBackup=false` disables Android backup and restore for all application data. Until export/import exists, uninstall, device loss, or replacement can lose local data.

## Implementation and test status

- Added `expo-sqlite`, its Expo config plugin, and `android.allowBackup: false`. The resolved public Expo config reports `android.allowBackup: false`.
- Added fixed-point nutrition storage at scale `1,000,000`, canonical decimal conversion, safe-integer checks, checked arithmetic, and boundary tests.
- Added typed database contracts, Expo SQLite adapter, connection invariants (foreign keys, WAL, 3,000 ms busy timeout), forward checksummed Migration 001, and non-destructive initialization/retry UI. The exclusive adapter uses a dedicated `useNewConnection` connection configured before `BEGIN EXCLUSIVE`; this corrects Expo SDK 57's transaction-callback ordering, which otherwise prevents SQLite from enabling foreign keys on that connection.
- Migration 001 atomically creates only `schema_migrations`, `food_sources`, `foods`, `food_revisions`, `food_aliases`, and `food_portions`; it records itself and synchronizes `PRAGMA user_version` in one exclusive transaction. It includes the compatible `UNIQUE(food_id, id)` parent key, deferrable current-revision ownership foreign key, scaled safe-integer SQL checks, and immutable-revision triggers.
- Added guarded development-only `/database-verification`. It bypasses the normal application database gate, uses only the exact disposable `calorify-phase2-integration-test.db` for its 12 serial cases, and its reset helper rejects every other name. The same route's recovery control uses only `calorify-phase2-recovery-verification.db`; neither control opens, resets, or deletes `calorify.db`. Production access renders not-found before any database is opened.
- Kept `src/app` route-only: recovery verification now lives in `src/features/shell/database/recovery-verification.tsx`, its test lives beside it, and `scripts/verify-route-tree.cjs` rejects test/spec/Jest setup files, Jest/testing-library imports, and Node builtin imports under `src/app`. `npm run check` runs this guard before migration verification.
- Corrected `npm run check` passed: migration checksum verification, strict TypeScript, zero-warning lint, and 12 Jest suites / 64 tests.
- Final `npx expo config --type public` resolved `android.allowBackup: false` and the `expo-sqlite` plugin. `$env:npm_config_offline = 'true'; npx expo install --check` reported dependencies up to date. `git diff --check` passed.

## Phase 2 API 36 runtime evidence

Completed on the already-running Pixel_8 Android 16/API 36 x86_64 emulator, reusing the configured Android SDK at `C:\Users\ujjua\AppData\Local\Android\Sdk`. `adb version`, `adb devices`, and the emulator tooling were discoverable; the device reported API level 36.

- Expo Go opened `exp://10.0.2.2:8081/--/database-verification`. The guarded route identified itself as development-only and stated that the production database is never opened or reset.
- All 12 sanitized cases passed once: `fresh-bootstrap`, `idempotent-reopen`, `composite-ownership`, `cross-food-ownership-rejection`, `immutable-revision`, `checksum-mismatch`, `injected-migration-rollback`, `inconsistent-user-version-ledger`, `numeric-sql-constraint-boundary`, `unique-constraint-rejection`, `returned-pragma-results`, and `exclusive-concurrent-writes`.
- This proves Migration 001's composite parent key is compatible in SQLite (the valid food/revision relation succeeded without a foreign-key mismatch), cross-food ownership was rejected, failure rollback was clean, and the harness inspected successful returned `foreign_key_check` and `quick_check(1)` results. The harness reset only `calorify-phase2-integration-test.db` before/after each case.
- The normal development URL `exp://10.0.2.2:8081/--/` initialized `calorify.db` and reached Today. A force-stop of Expo Go followed by the same normal URL again reached Today.
- The route's intentional recovery control displayed `Local database needs attention` and `Retry database setup`; pressing Retry displayed `Recovery verification complete` after initializing only `calorify-phase2-recovery-verification.db`. No production-database deletion occurred.
- No final red error screen or Metro application error was observed. Metro and the emulator were stopped after verification.

## 2026-07-15 pre-publication correction pass

- Corrected migration definition ordering, migration-ledger timestamp/audit validation, application-version resolution, disposable-case final cleanup authority, exact concurrent-write outcome validation, and database-gate lifecycle release behavior. The recovery control now releases its gate-owned disposable connection before attempting cleanup; a cleanup failure remains visible rather than being swallowed.
- Strengthened the UTC boundary parser to accept only the approved `Z` formats and then parse-and-round-trip them, rejecting impossible calendar dates, leap days, clock components, and normalized instants. The recovery route now retains its harmless disposable database on Android Back/uncontrolled unmount; its explicit Return still proves gate connection release before reset. Tests cover valid leap days, invalid date/time components, uncontrolled unmount, ordered release/reset, and production reset rejection.
- Corrected static verification passed: `npm run check` (12 suites / 64 tests); `npx expo config --type public` resolved `android.allowBackup: false`; offline `npx expo install --check` reported dependencies up to date; and `git diff --check` passed.
- On Pixel_8 Android 16/API 36, the guarded route again ran all 12 sanitized disposable cases as Passed. Its intentional failure showed `Local database needs attention`, and Retry reached `Recovery verification complete`. Returning then exposed a real cleanup failure because the recovery connection was still open; that defect was corrected and covered by a new exact-once release test.
- The required corrected API 36 rerun did not complete. Pixel_8 cold-booted at API 36 without wiping data; Expo Go remained installed; the old reverse mapping was removed and `adb reverse tcp:8081 tcp:8081` was configured; Metro was started with `npx expo start --go --clear --localhost`; and Expo Go was force-stopped without clearing data before opening `exp://127.0.0.1:8081/--/database-verification`. Expo Go rendered its native error page. Its error view reported `java.io.IOException: Failed to download remote update`; bounded Android logs contained no React Native JavaScript or AndroidRuntime application exception. The environment then denied the requested hidden background Metro restart because of its usage limit. Do not treat the earlier runtime run as evidence for the corrected timestamp or cleanup behavior, and do not update/reinstall Expo Go or change packages without owner approval.
- Confirmed and corrected the loader cause: `src/app/database-verification.test.tsx` was treated by Expo Router as an application route module. Its `@testing-library/react-native` dependency brought Node-only `console`/`util` imports into Metro before app JavaScript started. The test is now `src/features/shell/database/recovery-verification.test.tsx`, and the recovery implementation is feature-owned. The bounded `npx expo export --platform android --output-dir C:\tmp\calorify-phase2-route-export` succeeded: one Android Hermes bundle (1,305 modules) with no testing-library, Jest test-file, `node:console`, or `node:util` reference. This proves the route-tree bundling correction; it is not API 36 runtime evidence.

- Corrected API 36 rerun: the owner-provided persistent Metro server answered `packager-status:running` at `http://127.0.0.1:8081/status`; the connected Pixel_8 emulator reported API level 36; and Expo Go loaded `exp://10.0.2.2:8081/--/database-verification` to its guarded disposable-database screen without a red screen or JavaScript exception. Standard ADB tap, touch-down/up, and scroll injection did not reach the visible controls. Android input diagnostics showed the Expo `ExperienceActivity` window marked `NOT_VISIBLE` for input dispatch, so the 12 cases and recovery interaction could not be truthfully completed by automation. No app data, package, dependency, or source change was made; leave Metro and the emulator running for owner-assisted interaction or input-session recovery.

- Owner-assisted recovery observation: the first intentional failure displayed correctly, but Retry returned to the same recoverable screen rather than reaching completion. This remains an unpassed runtime gate. The initial source did not expose the classified error, and bounded logcat contained no application exception because the gate handled it. Added development-only safe diagnostics on the guarded recovery flow: the visible failure now includes only the last initialization step and `DatabaseErrorCategory`; no SQL, database rows, paths, or user data are rendered or logged. It distinguishes application version, connection configuration, migration ledger/application, and integrity check. Focused tests and strict type checking pass; wait for the owner to perform one targeted Retry and record the displayed safe pair before diagnosing or fixing a functional defect.

- Independent cold-start routing diagnosis: the root layout used `usePathname()` to decide whether to mount `DatabaseInitializationGate`. On a cold `/database-verification` deep link, the root Stack can mount before that pathname resolves, allowing the production `calorify.db` gate to fail before the verification route is reachable. The root now unconditionally mounts its Stack. A pathless `(app)` route group contains every product tab and secondary route and wraps only that group in `DatabaseInitializationGate`; `/database-verification` and `+not-found` remain root siblings. Public URLs, headers, tabs, ordinary Android Back behavior, theme provider, and status bar configuration are unchanged. New route-boundary tests prove structurally that the root never imports or opens the production gate, the verification route is outside the product group, and a failing product gate cannot block that root sibling.
- The existing pre-publication emulator `calorify.db` may contain the superseded Migration 001 checksum. Do not infer this as application corruption or use any automatic repair. After the corrected verification-route bypass is proven on API 36, one explicit owner-authorized emulator data clear will be required to remove only that stale development state before the final rerun. This is not production recovery behavior and does not authorize deleting a real user database.

## 2026-07-15 final Phase 2 API 36 gate

- The owner confirmed the corrected cold `exp://10.0.2.2:8081/--/database-verification` route opened the guarded verification screen instead of the production-database error. All 12 disposable case IDs passed, and recovery failure → Retry → `Recovery verification complete` → Return passed with no cleanup failure. The normal route still showed the expected obsolete Migration 001 checksum error before cleanup, proving the verification route did not bypass or modify the production database.
- After that evidence, the owner explicitly authorized exactly `adb shell pm clear host.exp.exponent` for the Pixel_8 development emulator. Only Expo Go data was cleared: no AVD wipe, uninstall, package update, other package clear, application-code reset, or automatic database reset occurred.
- The normal `exp://10.0.2.2:8081/--/` route then bootstrapped the current Migration 001 and reached Today. Expo Go was force-stopped without clearing data; reopening the same URL reached Today again. Bounded emulator evidence showed normal React Native startup only, with no red screen, JavaScript exception, remote-update failure, or final Metro application error.
- This development-only clear removed stale pre-publication state and is not production recovery behavior. Migration 001 remains immutable after publication. D-006 remains accepted.

- Added stable JavaScript tabs: Today, Log, History, and Settings; stack routes for Review meal, Manual entry, Goals, Food Library, Models, and About/Data Sources.
- Added fixture-only presentation state and accessible shared controls. Route files only compose feature screens.
- Phase 1 added no persistence, nutrition calculation, SQL, food data, networking, model runtime, native project, dependency, permission, EAS, signing, or release configuration; Phase 2 supersedes that limited persistence statement only with its documented SQLite foundation.
- `npx jest src/features/shell/screens/phase-one-accessibility.test.tsx --runInBand` passed: 1 suite, 15 tests. It covers headings, exact Today/Log/Settings `router.push` destinations, fixture labeling, and state accessibility semantics.
- Earlier full static verification passed: `npm run typecheck`; `npx eslint . --no-cache --max-warnings=0`; `npm run lint`; `npm test -- --runInBand`; `npm run check`; `npx expo config --type public --json`; `$env:EXPO_OFFLINE='1'; npx expo install --check`; and `git diff --check`. The full Jest run passed 4 suites and 18 tests. After this closure update, `npm run check` again passed (4 suites, 18 tests), `npx expo config --type public --json` confirmed portrait orientation and `predictiveBackGestureEnabled: false`, offline `npx expo install --check` reported dependencies up to date with its expected offline-validation warning, and `git diff --check` passed.

## API 36 runtime evidence

Completed on the Pixel 8 Android 16/API 36 x86_64 emulator:

- Light-mode navigation: all four tabs; Today to Log; Manual entry; Log to Review; History; Settings to Goals, Food Library, Models, and About/Data Sources; ordinary Android Back from secondary routes; scrolling and action reachability.
- Dark mode and 1.3x font scale: clean launch to Today without a red screen; representative Manual Entry, Settings, and Food Library inspection. Headings, status badges, cards, labels, fields, long Settings labels, fixture warnings, list rows, borders, and controls remained readable with no observed clipping or overlap.
- Manual Entry: entered representative food text and decimal Fat value; the top and final fields could be focused and scrolled into view; scrolling worked with the numeric keyboard open; Android Back dismissed the keyboard before leaving; the bottom `Keep editing draft` action remained reachable after dismissal; no red screen appeared.
- Settings: the representative Models destination opened and ordinary Android Back returned to Settings.
- Food Library: matching `oats` showed fixture results, non-matching `zzz` showed `No fixture foods found`; the normal text keyboard dismissed with Android Back; scrolling worked and `Add food manually` remained reachable.
- Orientation: a single landscape rotation request left the app in portrait (`[0,0][1080,2400]`, rotation `0`), consistent with the configured portrait policy.
- Lifecycle: after restoring light mode, font scale 1.0, and normal rotation settings, Expo Go was force-stopped and relaunched through active Metro. Today and all four tabs loaded, with no red error screen and no final Metro application error.

Predictive Back is not enabled (`predictiveBackGestureEnabled: false`) and was not verified in Expo Go. Under D-021 it is deferred to Phase 9; Phase 1 verifies ordinary Android Back and configured portrait orientation only.

Deferred: comprehensive screen-by-screen dark-mode and keyboard coverage, TalkBack, Predictive Back, API 35/API 37, physical devices, ARM64, model/performance/thermal, and Play verification. These belong to Phase 9 or their designated later gate.

## Next action

Phase 2 is published on its feature branch and ready for human review. Only with separate authorization, open a pull request; do not begin Phase 3, generate native projects, merge, tag, publish a release, deploy, or perform store actions.

## Continuation prompt

Phase 2 is complete and published on `feature/phase-2-sqlite-foundation`; do not expand into Phase 3 without separate authorization. Its corrected source, static, export, and API 36 evidence are recorded above. Retain Migration 001 unchanged. Predictive Back remains deferred to Phase 9 under D-021.

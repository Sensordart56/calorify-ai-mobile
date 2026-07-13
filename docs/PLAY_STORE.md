# Google Play Readiness

Status: planning checklist; re-verify every policy immediately before submission

Checked against official guidance available 2026-07-13

No publishing, signing, upload, or console mutation is authorized by this document

## Current Android baseline

- Expo SDK 57 uses React Native 0.86 and targets/compiles Android API 36 according to its versioned documentation.
- Google Play currently documents API 35 or higher for new apps/updates, while Android guidance announces an API 36 target requirement in August 2026. The SDK 57 target is positioned for that transition, but recheck at release.
- Test the release candidate on API 35 and 36. Add API 37 compatibility testing when the Expo/RN toolchain supports it; do not raise target/compile levels by ad-hoc native edits.
- Production distribution uses an Android App Bundle. Development/internal APKs are not production artifacts.

Official references:

- https://docs.expo.dev/versions/v57.0.0/
- https://developer.android.com/google/play/requirements/target-sdk
- https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability

## Ownership decisions required early

- Final product name, icon/brand rights, Android application ID, URL scheme, and store listing owner.
- Whether the Play developer account is personal or organization, its verification status, and who controls it.
- Play App Signing custody, upload-key custody/backup/rotation, and release approvers.
- Support email/site, public privacy-policy host, incident contact, and legal entity.
- Supported countries/languages, minimum Android/device/RAM/storage policy, and content rating answers.
- Monetization/ads/subscriptions status. First release should not add ads or billing by accident.

Application IDs are effectively permanent after distribution. Do not choose a placeholder and upload it.

## Build and release artifact

- Pin supported Node/npm/Java and dependency lockfile.
- Use an approved Expo/EAS build profile or reproducible local Android release process.
- Keep native configuration generated through Expo config/plugins.
- Set version name and monotonically increasing version code.
- Configure production application ID, label, scheme, icons, adaptive icon, monochrome icon if used, splash, orientation/resizability, edge-to-edge, predictive back, and permissions.
- Generate AAB, mapping/native debug symbols as applicable, SBOM/dependency inventory, licenses, and artifact hashes.
- Run Expo config inspection, doctor, type check, lint, unit/integration tests, and a clean production build.
- Inspect the final manifest/AAB for permissions, exported components, cleartext traffic, backup rules, debuggable flag, deep links, ABIs, bundled data, SDKs, secrets, endpoints, and file sizes.
- Verify arm64-v8a production support. Retain x86_64 only if build/size policy accepts it; emulator support is not a Play device promise.
- Do not bundle model files in the base module by default. Google Play size thresholds allow larger apps, but large cellular downloads create warnings/friction. Optional, disclosed, resumable app-private downloads are the working design.

Google Play currently documents a 500 MB compressed base-module limit and larger Play Asset Delivery limits, with a warning for installs over 200 MB; verify current limits and whether app-hosted model downloads affect disclosure/user experience at release:

https://support.google.com/googleplay/android-developer/answer/9859372

## Signing and secret handling

- Enroll/confirm Play App Signing through a human-controlled console process.
- Store upload keys outside Git and normal build logs with documented backup and access control.
- Store EAS/CI credentials in approved secret storage; least privilege and two-person release review where possible.
- Provider/API keys belong only on the future backend.
- Scan source, history, environment/config output, AAB contents, source maps, and native resources for secrets.
- Document key loss/compromise/rotation procedures.
- A planning or coding agent must not create, upload, rotate, or publish signing material without explicit authorization.

## Data provenance and licenses

Release blocker:

- Do not ship the legacy foods.csv. It combines sources, strips row provenance, and includes records potentially derived from IFCT.
- The official IFCT publication restricts electronic storage/reproduction for creating a product without prior written permission. Obtain reviewed written permission or exclude IFCT-derived/unknown rows.
- Every bundled and accepted online food must retain provider record identity, dataset/version, license, attribution, retrieval evidence, and transformations.
- Open Food Facts database/content/image licenses are distinct; omit images initially unless their separate obligations are handled.
- Include in-app data-source/license notices and any store/privacy disclosures.
- Audit model weights, tokenizer/chat template, runtime native artifacts, icons/fonts, third-party libraries, and store media for redistribution and attribution.

Official source for IFCT terms:

https://www.nin.res.in/ebooks/IFCT2017_16122024.pdf

## Privacy and Data Safety

- Publish a public, accessible, non-geofenced, non-editable privacy-policy URL; Play guidance says it should not be a PDF. Link the same policy in-app.
- Describe local meal/history/goals data, optional model downloads, backup/export behavior, any diagnostics, and future online query behavior.
- Complete Data Safety for closed/open/production tracks based on actual app and SDK network/storage behavior. Internal-testing-only apps may be exempt, but do not rely on that for release planning.
- A “no collection” app still completes the form and privacy obligations as applicable.
- Inspect every SDK rather than copying its marketing claim.
- If online fallback launches, disclose the unresolved query, backend/provider, purpose, retention, encryption in transit, deletion, and sharing/processing classifications.
- Default to no advertising ID and no unnecessary device identifier.
- Exclude meal database and model files from automatic cloud backup until an approved encrypted backup policy exists.
- Provide user-driven local export/delete controls. If accounts/cloud data are later added, implement the applicable in-app and web account-deletion rules.
- Avoid raw meal text, food history, goals, provider queries, or model prompts in logs/crash reports. Decide telemetry before adding a provider.

Official Data Safety guidance:

https://support.google.com/googleplay/android-developer/answer/10787469

## Health apps declaration and health policy

Calorie/macronutrient and nutrition tracking is health/fitness functionality. Treat the app as in-scope for the Play Health apps declaration rather than assuming a medical disclaimer removes the requirement.

- Complete the Health apps declaration for applicable tracks.
- Select accurate nutrition/fitness categories and describe functionality consistently with the store listing.
- Provide prominent limitations: informational tracking, possible extraction/database errors, user review required, not diagnosis/treatment, seek qualified advice for medical needs.
- Do not make clinical, weight-loss, disease, or measurement-accuracy claims without appropriate evidence/authorization.
- Do not imply the local LLM supplies medical or authoritative nutrition advice.
- If health permissions, Health Connect, sensors, or medical-device functions are ever added, conduct a new permissions/policy review.
- Ensure screenshots and marketing claims match tested capability.

Official references:

- https://support.google.com/googleplay/android-developer/answer/14738291
- https://support.google.com/googleplay/android-developer/answer/16679511

## AI-generated content policy assessment

The model is a narrow productivity extractor, not a conversational content generator, and its result is reviewed before save. Before submission:

- Recheck whether Play classifies the shipped interaction as generative AI under the current policy.
- If in scope, provide required in-app reporting/flagging and safeguards.
- Independently provide correction and feedback for every extraction.
- Block the model schema from producing nutrition/medical content and test adversarial inputs.
- Explain local processing and model limitations without claiming perfect accuracy.

Official reference:

https://support.google.com/googleplay/android-developer/answer/14094294

## Permissions, security, and platform behavior

- Request no dangerous permission unless a completed feature needs it at that moment.
- Initial scope should not need location, contacts, microphone, camera, health, storage-wide, notification, advertising, accessibility-service, VPN, background location, or exact alarm permissions.
- A future barcode camera or notification feature needs just-in-time disclosure, denial behavior, Data Safety update, and store-policy review.
- Use Storage Access Framework/system pickers for explicit export/import rather than broad storage access.
- Enforce HTTPS; no cleartext production traffic. Online backend accepts no arbitrary proxy URLs.
- Validate deep links and exported Android components.
- Use app-private storage for database/models and safe scoped paths for deletion.
- Maintain dependency/native CVE review and a supported upgrade policy.
- Test process death, backgrounding, low storage/memory, database corruption, interrupted model transfer, and offline startup.
- Model/data downloads require exact size/hash/format verification and atomic activation.

## Accessibility and device quality

- TalkBack labels, roles, state, order, and actions for all controls/charts.
- Font scaling without clipped nutrition values or blocked actions.
- Touch targets, contrast, dark/light modes, reduced motion, color-independent status, and accessible error text.
- Keyboard/input-method behavior and numeric locale separators.
- Predictive back, edge-to-edge/insets, lifecycle/state restoration, rotation/resizability policy, and large-screen behavior even if phone-first.
- API 35/36 install, upgrade, navigation, database, model/manual flow, and uninstall/reinstall.
- Representative low/mid ARM64 phones for memory, thermal, battery, and model latency; emulator is insufficient.
- Offline/airplane mode after assets, slow/interrupted network for downloads, and provider outage.
- Timezone/date boundaries and locale/unit formats.
- Pre-launch report and Android vitals review before promotion.

## Store listing and reviewer package

- Accurate title, short/full descriptions, category/tags, contact, privacy URL, data-source notice, and support workflow.
- Phone screenshots from the release candidate; no unimplemented screens or misleading results.
- Feature graphic, icon, and optional video with owned/licensed assets.
- Clearly state optional model download size/device compatibility/manual fallback.
- Explain local/offline behavior precisely; do not say “nothing leaves the device” if fonts, crash SDK, updates, model downloads, or online lookup make requests.
- Explain nutrition/model limitations and review workflow.
- Complete content rating, ads declaration, target audience, news/financial/government applicability, and any other console declarations truthfully.
- If any feature is login/restricted, provide durable reviewer credentials and instructions. Prefer no login in first release.
- Supply review notes for optional model installation, manual fallback, permissions, and any region/device constraint.

Reviewer-access guidance:

https://support.google.com/googleplay/android-developer/answer/15191715

## Testing tracks and account eligibility

- Use internal testing for early AAB/install/pre-launch checks.
- Confirm whether the developer account is subject to the personal-account closed-testing requirement introduced for accounts created after 2023-11-13. Current guidance requires at least 12 opted-in testers continuously for 14 days before production access; recheck exact applicability/current numbers.
- Plan tester recruitment, privacy-safe feedback, version support, release notes, and issue triage.
- Run closed testing on the actual release path, including model download/manual mode, migrations, offline usage, accessibility, and device tiers.
- Review Play automated/pre-launch results and fix policy/security/crash issues.
- Production submission and rollout require explicit human approval.

Official reference:

https://support.google.com/googleplay/android-developer/answer/14151465

## Release candidate gate

All must be true:

- Phase gates through Android hardening are complete.
- Static, database, migration, retrieval, model, download, accessibility, and physical-device evidence is attached.
- API 35/36 compatibility and production AAB inspection pass.
- Seed/model/library/media licenses and attribution pass human review.
- IFCT/unknown-provenance blocker is resolved by permission or exclusion.
- Privacy policy, Data Safety, Health declaration, AI assessment, content rating, and store claims match observed behavior.
- No secrets, debug settings, broad permissions, remote fonts, development endpoints, or unverified assets.
- Offline/manual operation succeeds when model/backend are absent.
- Signing/release owners and rollback procedure are confirmed.
- A human authorizes upload; a second explicit decision authorizes production promotion.

## Staged rollout and rollback

- Start with the smallest approved percentage after closed testing.
- Monitor crash/ANR, startup/database migration, model install/load failures, storage issues, and support reports without collecting meal content.
- Define thresholds that halt promotion.
- Keep online fallback remotely disableable and models/catalog revocable without disabling manual/offline operation.
- Database migrations are forward-only; rollback means stop rollout/fix-forward, not install an older binary that cannot read the schema.
- Play halt/unpublish/rollout changes are human console actions unless separately authorized.

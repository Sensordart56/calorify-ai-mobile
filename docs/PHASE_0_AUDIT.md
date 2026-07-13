# Phase 0 Public-Repository Audit

Date: 2026-07-13

Scope: Phase 0 review corrections only

## Repository boundary

- Intended future public repository: https://github.com/Sensordart56/calorify-ai-mobile
- Intended owner account: Sensordart56
- Legacy public reference: https://github.com/Sensordart56/calorifyai-react-webapp
- No GitHub repository, remote, commit, push, branch rename, release, signing action, or deployment was created during this review.
- Absolute C:\ paths in AGENTS.md, HANDOFF.md, and legacy evidence are explicitly local workstation context, not portable build requirements.

## License review

The inherited LICENSE named only 650 Industries/Expo and did not clearly state the owner’s intent for original Calorify AI Mobile source.

The root MIT LICENSE now intentionally covers original application source under Sensordart56 and preserves the Expo template notice. It does not automatically relicense dependencies, fonts, icons, images, nutrition datasets, provider records, model weights, tokenizers, or generated artifacts. Those retain their own terms.

## Removed direct dependencies

The following direct dependencies had no application/config import and were not required direct dependencies for the stable Phase 0 Router shell:

- @expo/ui
- expo-device
- expo-glass-effect
- expo-image
- expo-symbols
- expo-system-ui
- expo-web-browser
- react-native-gesture-handler
- react-native-reanimated
- react-native-worklets

Some Expo UI/glass/symbol packages remain transitively installed by Expo Router; they are no longer declared as application dependencies. Gesture Handler and Reanimated are optional Expo Router peers and are not used by this shell.

## Retained direct dependencies

- expo, react, react-native: application runtime.
- expo-router: stable Stack/Tabs routing.
- expo-constants and expo-linking: documented Expo Router requirements.
- expo-font: satisfies the Router/symbol font peer path used by the installed Router package.
- expo-splash-screen: configured splash plugin.
- expo-status-bar: root status bar.
- react-native-safe-area-context and react-native-screens: Router/navigation requirements.
- react-dom and react-native-web: declared web target.

Development dependencies are retained for strict TypeScript, ESLint, Jest, Jest Expo, and React Native Testing Library checks.

## Removed starter assets

The following files were unreferenced by source or app configuration and were deleted:

- assets/images/expo-badge.png
- assets/images/expo-badge-white.png
- assets/images/expo-logo.png
- assets/images/logo-glow.png
- assets/images/react-logo.png
- assets/images/react-logo@2x.png
- assets/images/react-logo@3x.png
- assets/images/tutorial-web.png
- assets/images/tabIcons/home.png
- assets/images/tabIcons/home@2x.png
- assets/images/tabIcons/home@3x.png
- assets/images/tabIcons/explore.png
- assets/images/tabIcons/explore@2x.png
- assets/images/tabIcons/explore@3x.png

## Retained provisional assets

Every retained asset is referenced by app.json:

- assets/images/icon.png: main icon.
- assets/images/android-icon-background.png: Android adaptive icon background.
- assets/images/android-icon-foreground.png: Android adaptive icon foreground.
- assets/images/android-icon-monochrome.png: Android themed icon.
- assets/images/splash-icon.png: configured splash image.
- assets/images/favicon.png: web favicon.
- assets/expo.icon/icon.json, Assets/grid.png, and Assets/expo-symbol 2.svg: configured iOS icon package and its internal references.

These remain Expo-derived provisional development assets, not final Calorify brand assets. Their replacement and brand ownership remain owner decisions before store preparation.

## Public-tree safeguards

- .gitignore blocks local environment files, credentials/signing files, databases, model weights, APKs, and AABs.
- .gitattributes normalizes repository text to LF while keeping Windows command/PowerShell scripts CRLF and common assets binary.
- GitHub Actions CI uses Node 22, npm ci, and npm run check for pushes/pull requests to main only.
- CI has read-only contents permission and performs no artifact upload, signing, deployment, or publishing.
- No foods.csv, environment file, database, model, signing material, or release artifact was present in the audited tree.

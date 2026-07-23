const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo SQLite's web worker and the bundled native seed are imported assets.
config.resolver.assetExts.push('wasm', 'db');

module.exports = config;

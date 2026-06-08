const { getDefaultConfig } = require("expo/metro-config");

// Expo SDK 54's Metro resolver can struggle with the ESM output that
// @react-navigation/drawer ships in `lib/module`.  Explicit ".js" paths
// sometimes fail to resolve, resulting in the error shown in the
// bundler log.  The workaround is to remove the extension from the
// exports (see node_modules patch) and tell Metro to treat additional
// file types as source.

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // allow .mjs/.cjs when packages ship ESM/modern builds
  config.resolver.sourceExts.push("cjs", "mjs");

  // Fix for Firebase: "Component auth has not been registered yet"
  // Forces Metro to use the correct React Native bundle instead of the Node/Browser one
  config.resolver.unstable_enablePackageExports = false;

  return config;
})();
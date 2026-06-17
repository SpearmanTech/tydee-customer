import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Foona",
  slug: "Foona",
  scheme: "Foona",

  platforms: ["ios", "android", "web"],

  web: {
    output: "static",
  },

  // 🚀 1. THE NATIVE ANDROID CONFIG
  android: {
    // 🚨 IMPORTANT: Make sure this exactly matches the package name in your Firebase Console!
    // The terminal suggested com.spearman.Foona, but your earlier JSON had com.yasomwe.Foona.
    package: "com.spearman.Foona",
    googleServicesFile: "./google-services.json",
  },

  // 🚀 2. THE NATIVE IOS CONFIG (For later)
  ios: {
    bundleIdentifier: "com.spearman.Foona",
    googleServicesFile: "./GoogleService-Info.plist",
  },

  // 🚀 3. THE NATIVE FIREBASE PLUGINS
  plugins: [
    "expo-router",
    "@react-native-community/datetimepicker",
    "expo-secure-store",
    "expo-web-browser",
    "expo-font",
    "expo-asset",
    "expo-dev-client",
    "@react-native-firebase/app",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },
};

export default config;

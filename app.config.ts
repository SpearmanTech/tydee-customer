import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Tydee",
  slug: "tydee",
  scheme: "tydee",

  platforms: ["ios", "android", "web"],

  web: {
    output: "static",
  },

  plugins: ["expo-router", "@react-native-community/datetimepicker"],

  experiments: {
    typedRoutes: true,
  },
};

export default config;

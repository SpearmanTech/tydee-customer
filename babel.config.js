module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"], // Add this line
          alias: {
            "@": "./app",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
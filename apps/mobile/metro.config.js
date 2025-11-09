// apps/mobile/metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname, { isMonorepo: true });

// SVG transformer
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// alias para matar o react-native-worklets (JS)
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "react-native-worklets": path.resolve(__dirname, "empty-worklets.js"),
};

// (opcional) colapsar frames "InternalBytecode"
config.symbolicator = {
  customizeFrame(frame) {
    if (frame.file && frame.file.includes("InternalBytecode")) {
      return { collapse: true };
    }
    return {};
  },
};

module.exports = config;

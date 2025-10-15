// apps/mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname, { isMonorepo: true });

// SVG transformer
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// (opcional) colapsar frames "InternalBytecode" na simbolização
config.symbolicator = {
  customizeFrame(frame) {
    if (frame.file && frame.file.includes("InternalBytecode")) {
      return { collapse: true };
    }
    return {};
  },
};

module.exports = config;

import { type ExpoConfig, type ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Bibliotecario",
  slug: "bibliotecario",
  version: "1.0.0",
  scheme: "bibliotecario",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: ["expo-router", "expo-font", "expo-secure-store"],
  platforms: ["ios", "android"],
  extra: { API_URL: process.env.EXPO_PUBLIC_API_URL },
});

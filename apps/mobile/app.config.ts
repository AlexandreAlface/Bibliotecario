export default {
  expo: {
    name: "Bibliotecario",
    slug: "bibliotecario",
    scheme: "bibliotecario",
    platforms: ["ios", "android"],   // <— acrescenta isto
    plugins: ["expo-font", "expo-secure-store"],
    extra: { API_URL: process.env.EXPO_PUBLIC_API_URL },
  },
};


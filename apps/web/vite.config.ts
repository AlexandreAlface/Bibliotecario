// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@bibliotecario/ui-web": path.resolve(__dirname, "../../packages/ui-web/src"),
    },
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    preserveSymlinks: true,
  },
  server: {
    fs: {
      allow: [
        "..",
        path.resolve(__dirname, "../../"),
        path.resolve(__dirname, "../../packages/ui-web"),
        path.resolve(__dirname, "../../node_modules"),
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
        secure: false,
        // ajuda a garantir que o Set-Cookie chega como domínio localhost
        cookieDomainRewrite: "localhost",
      },
    },
  },
});

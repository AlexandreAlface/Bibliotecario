// apps/web/src/main.tsx
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";

import { BibliotecarioThemeProvider } from "@bibliotecario/ui-web";
import { AuthProvider } from "./contexts/AuthContext";
import { CssBaseline } from "@mui/material"; // 👈

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BibliotecarioThemeProvider>
      <CssBaseline /> {/* 👈 baseline global */}
      <RouterProvider router={router} />
    </BibliotecarioThemeProvider>
  </AuthProvider>
);

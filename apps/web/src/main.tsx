// apps/web/src/main.tsx
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import { BibliotecarioThemeProvider } from "@bibliotecario/ui-web";
import { AuthProvider } from "./contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BibliotecarioThemeProvider>
      <RouterProvider router={router} />
    </BibliotecarioThemeProvider>
  </AuthProvider>
);

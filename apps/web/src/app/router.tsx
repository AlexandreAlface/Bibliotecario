// apps/web/src/app/router.tsx
import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { UserSessionProvider } from "../contexts/UserSession";

// páginas app
import LandingPage from "../pages";
import FamiliaPage from "@/pages/familia";
import SuggestionsPage from "@/pages/suggestions";
import AchievementsPage from "@/pages/achievements";
import AgendasPage from "@/pages/agenda";
import ConsultasPage from "@/pages/consultas";

// páginas auth
import Login from "@/pages/auth/Login";
import CreateAccount from "@/pages/auth/CreateAccount";
import CreateProfilesPage from "@/pages/auth/CreateProfilesPage";

// Layout simples para as rotas de auth (sem sidebar)
// (se quiseres, troca por um componente em src/layouts/AuthLayout.tsx)
function AuthLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  // Rotas de autenticação (sem AppLayout / sem menu)
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "create-account", element: <CreateAccount /> },
      { path: "create-profiles", element: <CreateProfilesPage /> },
    ],
  },

  // Rotas da aplicação (com AppLayout e menu)
  {
    element: (
      <UserSessionProvider>
        <AppLayout />
      </UserSessionProvider>
    ),
    children: [
      { index: true, element: <LandingPage /> },
      { path: "suggestions", element: <SuggestionsPage /> },
      { path: "achievements", element: <AchievementsPage /> },
      { path: "agenda", element: <AgendasPage /> },
      { path: "consultas", element: <ConsultasPage /> },
      { path: "familia", element: <FamiliaPage /> },
    ],
  },

  // (opcional) 404
  // { path: "*", element: <NotFoundPage /> },
]);

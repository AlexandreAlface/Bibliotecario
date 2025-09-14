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
import ReviewsPage from "@/pages/reviews";
import ReadingsPage from "@/pages/readings";
import SuggestionsByCategoriesPage from "@/pages/suggestions-categories";

// auth
import Login from "@/pages/auth/Login";
import CreateAccount from "@/pages/auth/CreateAccount";
import CreateProfilesPage from "@/pages/auth/CreateProfilesPage";
import Logout from "@/pages/Logout";

// NEW
import ProfilesPage from "@/pages/profiles";

// Layout simples p/ Auth
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
      { path: "logout", element: <Logout /> },
    ],
  },

  // PERFIS (sem sidebar) — mas com sessão
  {
    element: (
      <UserSessionProvider>
        <Outlet />
      </UserSessionProvider>
    ),
    children: [{ path: "/profiles", element: <ProfilesPage /> }],
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
      { path: "reviews", element: <ReviewsPage /> },
      { path: "reading", element: <ReadingsPage /> },
      {
        path: "suggestions-categories",
        element: <SuggestionsByCategoriesPage />,
      },
      { path: "achievements", element: <AchievementsPage /> },
      { path: "agenda", element: <AgendasPage /> },
      { path: "consultas", element: <ConsultasPage /> },
      { path: "familia", element: <FamiliaPage /> },
    ],
  },
]);

import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { UserSessionProvider } from "../contexts/UserSession";
import { RequireRole } from "@/routes/RequireRole";
import { RequireAuth } from "@/routes/RequireAuth";

// páginas app (família)
import LandingPage from "../pages/families";
import FamiliaPage from "@/pages/families/familia";
import SuggestionsPage from "@/pages/families/suggestions";
import AchievementsPage from "@/pages/families/achievements";
import AgendasPage from "@/pages/families/agenda";
import ConsultasPage from "@/pages/families/consultas";
import ReviewsPage from "@/pages/families/reviews";
import ReadingsPage from "@/pages/families/readings";
import SuggestionsByCategoriesPage from "@/pages/families/suggestions-categories";
import FamilyEventsPage from "@/pages/families/events";

// auth
import Login from "@/pages/auth/Login";
import CreateAccount from "@/pages/auth/CreateAccount";
import CreateProfilesPage from "@/pages/auth/CreateProfilesPage";
import Logout from "@/pages/families/Logout";

// perfis
import ProfilesPage from "@/pages/profiles";

// Bibliotecário
import LibrarianHome from "@/pages/librarian/Home";
import LibrarianConsultasPendentes from "@/pages/librarian/ConsultasPendentes";
import LibrarianAgenda from "@/pages/librarian/Agenda";
import LibrarianFamilias from "@/pages/librarian/Familias";
import LibrarianSlots from "@/pages/librarian/Slots";
import HistoricoConsultasPage from "@/pages/librarian/historico";

// Admin
import AdminHome from "@/pages/admin/Home";
import AdminLibrarians from "@/pages/admin/Librarians";
import AdminFamilies from "@/pages/admin/Families";
import AdminSlotsGlobal from "@/pages/admin/Slots";
import AdminEvents from "@/pages/admin/Events";
import AdminBacklog from "@/pages/admin/Backlog";
import AdminMetrics from "@/pages/admin/Metrics";
import AdminFeeds from "@/pages/admin/Feeds";

function AuthLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  // ---- Auth (sem AppLayout) ----
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

  // ---- Escolha de perfis (Família autenticada) ----
  {
    element: (
      <UserSessionProvider>
        <RequireRole roles={["FAMILY", "FAMÍLIA"]}>
          <Outlet />
        </RequireRole>
      </UserSessionProvider>
    ),
    children: [{ path: "/profiles", element: <ProfilesPage /> }],
  },

  // ---- App (autenticado) ----
  {
    element: (
      <UserSessionProvider>
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      </UserSessionProvider>
    ),
    children: [
      // Família
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
      { path: "eventos", element: <FamilyEventsPage /> },

      // Bibliotecário
      {
        path: "librarian",
        element: (
          <RequireRole
            roles={["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO", "ADMIN"]}
          >
            <Outlet />
          </RequireRole>
        ),
        children: [
          { index: true, element: <LibrarianHome /> },
          {
            path: "consultas/pendentes",
            element: <LibrarianConsultasPendentes />,
          },
          { path: "agenda", element: <LibrarianAgenda /> },
          { path: "familias", element: <LibrarianFamilias /> },
          { path: "slots", element: <LibrarianSlots /> },
          { path: "historico", element: <HistoricoConsultasPage /> },
        ],
      },

      // Admin
      {
        path: "admin",
        element: (
          <RequireRole roles={["ADMIN", "ADMINISTRATOR", "ADMINISTRADOR"]}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminHome /> },
          { path: "bibliotecarios", element: <AdminLibrarians /> },
          { path: "familias", element: <AdminFamilies /> },
          { path: "slots", element: <AdminSlotsGlobal /> },
          { path: "propostas", element: <AdminBacklog /> },
          { path: "eventos", element: <AdminEvents /> },
          { path: "feeds", element: <AdminFeeds /> },
          { path: "metricas", element: <AdminMetrics /> },
        ],
      },
    ],
  },
]);

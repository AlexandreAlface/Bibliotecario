// apps/web/src/routes/router.tsx
import { createBrowserRouter, Outlet } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { UserSessionProvider } from "../contexts/UserSession";
import { RequireRole } from "@/routes/RequireRole";

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

// auth
import Login from "@/pages/auth/Login";
import CreateAccount from "@/pages/auth/CreateAccount";
import CreateProfilesPage from "@/pages/auth/CreateProfilesPage";
import Logout from "@/pages/families/Logout";

// perfis (família)
import ProfilesPage from "@/pages/profiles";

// --- Bibliotecário ---
import LibrarianHome from "@/pages/librarian/Home";
import LibrarianConsultasPendentes from "@/pages/librarian/ConsultasPendentes";
import LibrarianAgenda from "@/pages/librarian/Agenda";
import LibrarianFamilias from "@/pages/librarian/Familias";
import LibrarianSlots from "@/pages/librarian/Slots";
import HistoricoConsultasPage from "@/pages/librarian/historico";


// --- Admin (NOVO) ---
import AdminHome from "@/pages/admin/Home";
import AdminLibrarians from "@/pages/admin/Librarians";
import AdminFamilies from "@/pages/admin/Families";
import AdminSlotsGlobal from "@/pages/admin/Slots";
import AdminEvents from "@/pages/admin/Events";
import AdminBacklog from "@/pages/admin/Backlog";
import AdminMetrics from "@/pages/admin/Metrics";
import AdminFeeds from "@/pages/admin/Feeds";

// Layout simples p/ Auth
function AuthLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  // ---------------- Auth (sem AppLayout) ----------------
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

  // ---------------- Perfis (sem sidebar), só FAMÍLIA ----------------
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

  // ---------------- App (com AppLayout) ----------------
  {
    element: (
      <UserSessionProvider>
        <AppLayout />
      </UserSessionProvider>
    ),
    children: [
      // ----- Área Família -----
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

      // ----- Área Bibliotecário -----
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

      // ----- Área Admin (NOVO) -----
      {
        path: "admin",
        element: (
          <RequireRole roles={["ADMIN", "ADMINISTRATOR", "ADMINISTRADOR"]}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminHome /> }, // dashboard
          { path: "bibliotecarios", element: <AdminLibrarians /> }, // gerir bibliotecários
          { path: "familias", element: <AdminFamilies /> }, // famílias (read-only)
          { path: "slots", element: <AdminSlotsGlobal /> }, // bloqueios/slots globais
          { path: "propostas", element: <AdminBacklog /> }, // backlog de propostas
          { path: "eventos", element: <AdminEvents /> }, // eventos
          { path: "feeds", element: <AdminFeeds /> }, // feeds RSS
          { path: "metricas", element: <AdminMetrics /> }, // métricas & gráficos
        ],
      },
    ],
  },
]);

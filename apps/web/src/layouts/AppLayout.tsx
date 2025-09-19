// src/layouts/AppLayout.tsx
import { useMemo, useState, type JSX } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { GradientBackground, SidebarMenu } from "@bibliotecario/ui-web";
import { Box, GlobalStyles } from "@mui/material";
import {
  Home,
  Wand2,
  Trophy,
  CalendarDays,
  CalendarCheck2,
  UsersRound,
  Stars,
  Book,
  LogOut,
  ClipboardCheck,
  History,
  Clock,
  BarChart3,
  Rss,
} from "lucide-react";
import { useUserSession } from "../contexts/UserSession";

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 64;

// largura máxima desejada para desktop largo (27")
const CONTENT_MAX_PX = 1920;
const SIDE_PAD = "clamp(16px, 2.2vw, 48px)";

// --- tipos + helpers para seleção ativa ---
type Item = { label: string; icon: JSX.Element; href: string; exact?: boolean };

const norm = (s: string) => (s === "/" ? "/" : s.replace(/\/+$/, "")); // remove barra final (exceto "/")

function pickActive(pathname: string, items: Item[]) {
  const pn = norm(pathname);

  // 1) se houver item com exact=true e match exato, ganha
  const exact = items.find((i) => i.exact && norm(i.href) === pn);
  if (exact) return norm(exact.href);

  // 2) caso geral: escolher o prefixo mais longo que casa
  const match = items
    .map((i) => ({ ...i, hrefN: norm(i.href) }))
    .filter((i) => pn === i.hrefN || pn.startsWith(i.hrefN + "/"))
    .sort((a, b) => b.hrefN.length - a.hrefN.length)[0];

  return match ? match.hrefN : undefined;
}

export default function AppLayout() {
  const { user, asChild, isFamily, isLibrarian, isAdmin } = useUserSession();
  const [menuOpen, setMenuOpen] = useState(true);
  const location = useLocation();

  // ------- Menus por papel -------
  const familyMenu: Item[] = [
    { label: "Início", icon: <Home />, href: "/", exact: true },
    { label: "Sugestões", icon: <Wand2 />, href: "/suggestions" },
    { label: "Leituras", icon: <Book />, href: "/reading" },
    { label: "Avaliar leituras", icon: <Stars />, href: "/reviews" },
    { label: "Conquistas", icon: <Trophy />, href: "/achievements" },
    { label: "Agenda", icon: <CalendarDays />, href: "/agenda" },
    // “Trocar de perfil” só faz sentido para famílias
    ...(isFamily
      ? [{ label: "Trocar de perfil", icon: <UsersRound />, href: "/profiles" }]
      : []),
    // Se não quiseres “Consultas” para família, apaga a linha abaixo
    { label: "Consultas", icon: <CalendarCheck2 />, href: "/consultas" },
  ];

  const librarianMenu: Item[] = [
    { label: "Painel", icon: <Home />, href: "/librarian", exact: true },
    {
      label: "Consultas pendentes",
      icon: <ClipboardCheck />,
      href: "/librarian/consultas/pendentes",
    },
    { label: "Slots", icon: <Clock />, href: "/librarian/slots" }, // 👈 NOVO
    { label: "Agenda", icon: <CalendarDays />, href: "/librarian/agenda" },
    { label: "Histórico", icon: <History />, href: "/librarian/historico" },
    { label: "Famílias", icon: <UsersRound />, href: "/librarian/familias" },
  ];

  const adminMenu: Item[] = [
    { label: "Painel", icon: <Home />, href: "/admin", exact: true },
    {
      label: "Bibliotecários",
      icon: <UsersRound />,
      href: "/admin/bibliotecarios",
    },
    { label: "Famílias", icon: <UsersRound />, href: "/admin/familias" },
    { label: "Slots globais", icon: <Clock />, href: "/admin/slots" },
    { label: "Propostas", icon: <ClipboardCheck />, href: "/admin/propostas" },
    { label: "Eventos", icon: <CalendarDays />, href: "/admin/eventos" },
    { label: "Feeds", icon: <Rss />, href: "/admin/feeds" },
    { label: "Métricas", icon: <BarChart3 />, href: "/admin/metricas" },
  ];

  const rawItems = isAdmin
    ? adminMenu
    : isLibrarian
    ? librarianMenu
    : familyMenu;

  // calcula qual href está ativo (não inclui “Sair” na conta)
  const activeHref = pickActive(location.pathname, rawItems);
  const menuItems = [
    ...rawItems.map(({ label, icon, href }) => ({
      label,
      icon,
      href,
      selected: norm(href) === activeHref,
    })),
    { label: "Sair", icon: <LogOut />, href: "/auth/logout", selected: false },
  ];

  // ------- Cabeçalho -------
  const familyName = user?.fullName ?? "Família";
  const headerTitle = isAdmin
    ? user?.fullName || "Administrador"
    : isLibrarian
    ? user?.fullName || "Bibliotecário"
    : asChild && user?.actingChild
    ? user.actingChild.name!
    : `Família ${familyName}`;

  const headerSubtitle = isAdmin
    ? "Administrador"
    : isLibrarian
    ? "Bibliotecário"
    : asChild
    ? "Modo criança"
    : "Família";

  const sidebarWidth = useMemo(
    () => (menuOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED),
    [menuOpen]
  );

  const actingAvatarUrl =
    !isLibrarian && asChild && user?.actingChild
      ? user?.children?.find(
          (c) => Number(c.id) === Number(user.actingChild!.id)
        )?.avatarUrl || undefined
      : undefined;

  return (
    <GradientBackground>
      {/* OVERRIDE GLOBAL DE CONTAINER (mata o cap de 1200px) */}
      <GlobalStyles
        styles={{
          ".MuiContainer-root": { maxWidth: "none" },
          "@media (min-width:1200px)": {
            ".MuiContainer-maxWidthLg": { maxWidth: "1500px" },
          },
          "@media (min-width:1536px)": {
            ".MuiContainer-maxWidthXl": { maxWidth: `${CONTENT_MAX_PX}px` },
          },
        }}
      />

      <SidebarMenu
        open={menuOpen}
        onToggle={(open) => setMenuOpen(open)}
        items={menuItems}
        headerTitle={headerTitle!}
        headerSubtitle={headerSubtitle}
        headerAvatarUrl={actingAvatarUrl}
        sx={{ bgcolor: "background.paper", zIndex: (t) => t.zIndex.drawer }}
      />

      {/* Área de conteúdo à direita da sidebar */}
      <Box
        component="main"
        sx={{
          ml: `${sidebarWidth}px`,
          minHeight: "100vh",
          width: `calc(100vw - ${sidebarWidth}px)`,
          px: SIDE_PAD,
          transition: (t) =>
            t.transitions.create("margin-left", {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
        <Box
          sx={{ mx: "auto", width: "100%", maxWidth: `${CONTENT_MAX_PX}px` }}
        >
          <Outlet />
        </Box>
      </Box>
    </GradientBackground>
  );
}

// src/layouts/AppLayout.tsx
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useUserSession } from "../contexts/UserSession";

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 64;

// largura máxima desejada para desktop largo (27")
const CONTENT_MAX_PX = 1680; // ajusta p.ex. 1760/1800
const SIDE_PAD = "clamp(16px, 2.2vw, 48px)";

export default function AppLayout() {
  const { user, asChild } = useUserSession();
  const [menuOpen, setMenuOpen] = useState(true);
  const location = useLocation();

  const familyName = user?.fullName ?? "Família";
  const roleLabel = (user?.roles?.[0] ?? "").toString();

  const is = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const baseItems = [
    { label: "Início", icon: <Home />, href: "/" },
    { label: "Sugestões", icon: <Wand2 />, href: "/suggestions" },
    { label: "Leituras", icon: <Book />, href: "/reading" },
    { label: "Avaliar leituras", icon: <Stars />, href: "/reviews" },
    { label: "Conquistas", icon: <Trophy />, href: "/achievements" },
    { label: "Agenda", icon: <CalendarDays />, href: "/agenda" },
    { label: "Trocar de perfil", icon: <UsersRound />, href: "/profiles" },
  ];

  const extraItems = asChild
    ? []
    : [
        { label: "Consultas", icon: <CalendarCheck2 />, href: "/consultas" },
        { label: "Família", icon: <UsersRound />, href: "/familia" },
      ];

  const menuItems = [
    ...baseItems,
    ...extraItems,
    { label: "Sair", icon: <LogOut />, href: "/auth/logout" },
  ].map((i) => ({ ...i, selected: is(i.href) }));

  const headerTitle =
    asChild && user?.actingChild
      ? user.actingChild.name
      : `Família ${familyName}`;
  const headerSubtitle = asChild ? "Modo criança" : roleLabel || "Família";

  const sidebarWidth = useMemo(
    () => (menuOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED),
    [menuOpen]
  );

  const actingAvatarUrl =
    asChild && user?.actingChild
      ? user?.children?.find(
          (c) => Number(c.id) === Number(user.actingChild!.id)
        )?.avatarUrl || undefined
      : undefined;

  return (
    <GradientBackground>
      {/* ⬇⬇⬇ OVERRIDE GLOBAL DE CONTAINER (mata o cap de 1200px) */}
      <GlobalStyles
        styles={{
          // por defeito, deixa o Container ocupar a largura total
          ".MuiContainer-root": { maxWidth: "none" },

          // se alguma página usar explicitamente lg/xl,
          // aumenta os limites globais
          "@media (min-width:1200px)": {
            ".MuiContainer-maxWidthLg": { maxWidth: "1360px" }, // opcional
          },
          "@media (min-width:1536px)": {
            ".MuiContainer-maxWidthXl": { maxWidth: `${CONTENT_MAX_PX}px` },
          },
        }}
      />
      {/* ⬆⬆⬆ */}

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
        {/* Faixa central fluida até um máximo */}
        <Box
          sx={{ mx: "auto", width: "100%", maxWidth: `${CONTENT_MAX_PX}px` }}
        >
          <Outlet />
        </Box>
      </Box>
    </GradientBackground>
  );
}

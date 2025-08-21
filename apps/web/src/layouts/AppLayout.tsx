import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { GradientBackground, SidebarMenu } from "@bibliotecario/ui-web";
import { Box } from "@mui/material";
import {
  Home,
  Wand2,
  Trophy,
  CalendarDays,
  CalendarCheck2,
  UsersRound,
} from "lucide-react";
import { useUserSession } from "../contexts/UserSession";

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 64;

export default function AppLayout() {
  const { user, asChild } = useUserSession();
  const [menuOpen, setMenuOpen] = useState(true); // começa aberto
  const location = useLocation();
  const navigate = useNavigate();

  const familyName = user?.fullName ?? "Família";
  const roleLabel = (user?.roles?.[0] ?? "").toString();

  // highlight simples pela rota atual
  const is = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const menuItems = useMemo(
    () =>
      asChild
        ? [
            { label: "Início", icon: <Home />, href: "/" },
            { label: "Sugestões", icon: <Wand2 />, href: "/suggestions" },
            { label: "Conquistas", icon: <Trophy />, href: "/achievements" },
            { label: "Agenda", icon: <CalendarDays />, href: "/agenda" },
          ].map((i) => ({ ...i, selected: is(i.href) }))
        : [
            { label: "Início", icon: <Home />, href: "/" },
            { label: "Sugestões", icon: <Wand2 />, href: "/suggestions" },
            { label: "Conquistas", icon: <Trophy />, href: "/achievements" },
            { label: "Agenda", icon: <CalendarDays />, href: "/agenda" },
            {
              label: "Consultas",
              icon: <CalendarCheck2 />,
              href: "/consultas",
            },
            { label: "Família", icon: <UsersRound />, href: "/familia" },
          ].map((i) => ({ ...i, selected: is(i.href) })),
    [asChild, location.pathname]
  );

  const headerTitle =
    asChild && user?.actingChild
      ? user.actingChild.name
      : `Família ${familyName}`;
  const headerSubtitle = asChild ? "Modo criança" : roleLabel || "Família";

  const sidebarWidth = useMemo(
    () => (menuOpen ? SIDEBAR_OPEN : SIDEBAR_CLOSED),
    [menuOpen]
  );

  return (
    <GradientBackground>
      <SidebarMenu
        open={menuOpen}
        onToggle={(open) => setMenuOpen(open)}
        items={menuItems}
        headerTitle={headerTitle}
        headerSubtitle={headerSubtitle}
        headerAvatarUrl={
          asChild ? user?.actingChild?.avatarUrl ?? undefined : undefined
        }
        sx={{
          bgcolor: "background.paper",
          zIndex: (t) => t.zIndex.drawer,
        }}
      />

      <Box
        sx={{
          ml: `${sidebarWidth}px`,
          transition: (t) =>
            t.transitions.create("margin-left", {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
        <Outlet />
      </Box>
    </GradientBackground>
  );
}

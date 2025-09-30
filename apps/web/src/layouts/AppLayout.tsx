import * as React from "react";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Toolbar,
  Tooltip,
  Typography,
  Stack,
} from "@mui/material";
import {
  Link as RouterLink,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import HomeRounded from "@mui/icons-material/HomeRounded";
import FamilyRestroomRounded from "@mui/icons-material/FamilyRestroomRounded";
import ChildCareRounded from "@mui/icons-material/ChildCareRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import RateReviewRounded from "@mui/icons-material/RateReviewRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import RssFeedRounded from "@mui/icons-material/RssFeedRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import ListAltRounded from "@mui/icons-material/ListAltRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import DashboardCustomizeRounded from "@mui/icons-material/DashboardCustomizeRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";

import { useUserSession } from "@/contexts/UserSession";
import { GradientBackgroundWithShapes, Logo } from "@bibliotecario/ui-web";
import { alpha } from "@mui/material/styles";

const drawerWidth = 248;

type NavItem = { to: string; label: string; icon: React.ReactNode };

function buildMenu(opts: {
  asChild: boolean;
  isFamily: boolean;
  isLibrarian: boolean;
  isAdmin: boolean;
}): NavItem[] {
  const { asChild, isFamily, isLibrarian, isAdmin } = opts;

  if (asChild) {
    return [
      { to: "/", label: "Início", icon: <HomeRounded /> },
      { to: "/reading", label: "Leituras", icon: <LibraryBooksRounded /> },
      { to: "/eventos", label: "Eventos", icon: <EventAvailableRounded /> },
      { to: "/suggestions", label: "Sugestões", icon: <EmojiEventsRounded /> },
      {
        to: "/suggestions-categories",
        label: "Sug. por categorias",
        icon: <CategoryRounded />,
      },
      { to: "/contents", label: "Conteúdos", icon: <LightbulbRounded /> }, // 👈 NOVO (criança)
      {
        to: "/achievements",
        label: "Conquistas",
        icon: <EmojiEventsRounded />,
      },
      { to: "/reviews", label: "Opiniões", icon: <RateReviewRounded /> },
    ];
  }

  const items: NavItem[] = [];

  if (isFamily) {
    items.push(
      { to: "/", label: "Início", icon: <HomeRounded /> },
      { to: "/familia", label: "Família", icon: <FamilyRestroomRounded /> },
      { to: "/consultas", label: "Consultas", icon: <PeopleAltRounded /> },
      { to: "/eventos", label: "Eventos", icon: <EventAvailableRounded /> },
      { to: "/reading", label: "Leituras", icon: <LibraryBooksRounded /> },
      { to: "/suggestions", label: "Sugestões", icon: <EmojiEventsRounded /> },
      {
        to: "/suggestions-categories",
        label: "Sug. por categorias",
        icon: <CategoryRounded />,
      },
      { to: "/contents", label: "Conteúdos", icon: <LightbulbRounded /> }, // 👈 NOVO (família)
      {
        to: "/achievements",
        label: "Conquistas",
        icon: <EmojiEventsRounded />,
      },
      { to: "/agenda", label: "Agenda", icon: <CalendarMonthRounded /> },
      { to: "/reviews", label: "Opiniões", icon: <RateReviewRounded /> }
    );
  }

  if (isLibrarian) {
    items.push(
      {
        to: "/librarian",
        label: "Início",
        icon: <DashboardCustomizeRounded />,
      },
      {
        to: "/librarian/livros",
        label: "Livros",
        icon: <LibraryBooksRounded />,
      },
      {
        to: "/librarian/consultas/pendentes",
        label: "Pendentes",
        icon: <EventAvailableRounded />,
      },
      {
        to: "/librarian/agenda",
        label: "Agenda",
        icon: <CalendarMonthRounded />,
      },
      {
        to: "/librarian/familias",
        label: "Famílias",
        icon: <PeopleAltRounded />,
      },
      {
        to: "/librarian/slots",
        label: "Slots",
        icon: <ScheduleRounded />,
      },
      {
        to: "/librarian/historico",
        label: "Histórico",
        icon: <HistoryRounded />,
      }
    );
  }

  if (isAdmin) {
    items.push(
      { to: "/admin", label: "Início", icon: <AdminPanelSettingsRounded /> },
      {
        to: "/librarian/livros",
        label: "Livros",
        icon: <LibraryBooksRounded />,
      },
      {
        to: "/admin/bibliotecarios",
        label: "Bibliotecários",
        icon: <PeopleAltRounded />,
      },
      { to: "/admin/familias", label: "Famílias", icon: <PeopleAltRounded /> },
      { to: "/admin/slots", label: "Slots", icon: <ScheduleRounded /> },
      { to: "/admin/propostas", label: "Propostas", icon: <ListAltRounded /> },
      {
        to: "/admin/eventos",
        label: "Eventos",
        icon: <EventAvailableRounded />,
      },
      { to: "/admin/feeds", label: "Feeds", icon: <RssFeedRounded /> },
      {
        to: "/admin/micro-contents",
        label: "Micro-conteúdos",
        icon: <LightbulbRounded />,
      },
      { to: "/admin/metricas", label: "Métricas", icon: <QueryStatsRounded /> },
      {
        to: "/admin/livros",
        label: "Livros (CSV)",
        icon: <LibraryBooksRounded />,
      }
      // { to: "/admin/bibliotecarios/novo", label: "Adicionar bibliotecário", icon: <PersonAddRounded /> },
    );
  }

  const seen = new Set<string>();
  return items.filter((it) =>
    seen.has(it.to) ? false : (seen.add(it.to), true)
  );
}

export default function AppLayout() {
  const {
    user,
    loading,
    asChild,
    isAdmin,
    isLibrarian,
    isFamily,
    setSelectedChildId,
    clearChild,
    logout,
  } = useUserSession();

  const location = useLocation();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const children = user?.children ?? [];
  const kids = user?.children ?? [];
  const acting = user?.actingChild ?? null;

  const menuItems = React.useMemo(
    () => buildMenu({ asChild, isFamily, isLibrarian, isAdmin }),
    [asChild, isFamily, isLibrarian, isAdmin]
  );

  function matchesPath(pathname: string, base: string) {
    const p = pathname.replace(/\/+$/, "");
    const b = base.replace(/\/+$/, "");
    if (b === "/") return p === "/";
    return p === b || p.startsWith(b + "/");
  }

  // escolhe o item com o 'to' mais longo que casa com o path atual
  const activeTo = React.useMemo(() => {
    const path = location.pathname;
    let best = "";
    for (const it of menuItems) {
      if (matchesPath(path, it.to) && it.to.length > best.length) {
        best = it.to;
      }
    }
    return best;
  }, [location.pathname, menuItems]);

  const handlePickFamily = async () => {
    setAnchorEl(null);
    await clearChild();
    if (location.pathname.startsWith("/profiles"))
      navigate("/", { replace: true });
  };
  const handlePickChild = async (childId: number) => {
    setAnchorEl(null);
    await setSelectedChildId(childId);
    if (location.pathname.startsWith("/profiles"))
      navigate("/", { replace: true });
  };
  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const activeName = React.useMemo(() => {
    if (asChild && acting?.name) return acting.name;
    if (isFamily) return `Família ${user?.fullName ?? ""}`.trim();
    return user?.fullName ?? "";
  }, [asChild, acting?.name, isFamily, user?.fullName]);

  const activeRole = React.useMemo(() => {
    if (asChild) return "Criança";
    if (isAdmin) return "Admin";
    if (isLibrarian) return "Bibliotecário";
    if (isFamily) return "Família";
    return "";
  }, [asChild, isAdmin, isLibrarian, isFamily]);

  // helpers de “glass” para garantir contraste sobre o gradiente
  const glassStyles = (t: any) => ({
    backgroundColor: "rgba(255,255,255,.60)",
    backgroundImage: `linear-gradient(90deg, ${alpha(
      t.palette.secondary.main,
      0.18
    )}, ${alpha(t.palette.primary.main, 0.18)})`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderColor: alpha(t.palette.common.black, 0.06),
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  });

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* TOPBAR harmonizada com o gradiente */}
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={(t) => ({
          zIndex: (th) => th.zIndex.drawer + 1,
          borderBottom: "1px solid",
          ...glassStyles(t),
        })}
      >
        <Toolbar
          sx={{
            height: 64, // 👈 fixa a altura
            minHeight: 64,
            py: 0,
            alignItems: "center",
          }}
        >
          {/* Caixa do logo controla o tamanho máximo */}
          <Box
            sx={{
              height: { xs: 40, sm: 46, md: 52 }, // 👈 aumenta aqui sem crescer a barra
              lineHeight: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                textDecoration: "none",
                color: "text.primary",
                fontWeight: 900,
                letterSpacing: 0.3,
              }}
            >
              Bibliotecário
            </Typography>
            {/* não passes width; deixa a altura mandar */}
            <Logo variant={"bf"} sx={{ height: "100%", width: "auto" }} />
          </Box>

          <Box sx={{ flex: 1 }} />
          {!!user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                size="small"
                color={asChild ? "secondary" : "primary"}
                icon={
                  asChild ? <ChildCareRounded /> : <FamilyRestroomRounded />
                }
                label={
                  asChild
                    ? "Modo criança"
                    : isLibrarian || isAdmin
                    ? isAdmin
                      ? "Admin"
                      : "Bibliotecário"
                    : "Modo família"
                }
                sx={{ fontWeight: 700 }}
              />

              <Stack
                alignItems="flex-end"
                sx={{ display: { xs: "none", sm: "flex" }, mr: 0.5 }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  noWrap
                  title={activeName}
                >
                  {activeName || "—"}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {activeRole}
                </Typography>
              </Stack>

              {!!children.length && isFamily && (
                <Tooltip title="Trocar de perfil">
                  <IconButton onClick={handleOpenMenu} sx={{ ml: 0.5 }}>
                    <Avatar
                      src={asChild ? acting?.avatarUrl ?? undefined : undefined}
                      sx={{ width: 36, height: 36, fontWeight: 800 }}
                    >
                      {asChild
                        ? (acting?.name || "?").slice(0, 1).toUpperCase()
                        : (user.fullName || "F").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <ArrowDropDownRounded />
                  </IconButton>
                </Tooltip>
              )}

              <Menu anchorEl={anchorEl} open={open} onClose={handleCloseMenu}>
                <MenuList dense disablePadding>
                  <MenuItem onClick={handlePickFamily}>
                    <ListItemIcon>
                      <FamilyRestroomRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Família" />
                  </MenuItem>

                  <Divider />

                  {kids.map((c) => (
                    <MenuItem
                      key={c.id}
                      onClick={() => handlePickChild(Number(c.id))}
                    >
                      <ListItemIcon>
                        <ChildCareRounded fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={c.name || "Criança"} />
                    </MenuItem>
                  ))}

                  <Divider />

                  <MenuItem
                    component={RouterLink}
                    to="/profiles"
                    onClick={handleCloseMenu}
                  >
                    <ListItemIcon>
                      <PeopleAltRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Escolher perfis" />
                  </MenuItem>
                </MenuList>
              </Menu>

              <Tooltip title="Terminar sessão">
                <IconButton
                  onClick={async () => {
                    await logout();
                    navigate("/auth/login", { replace: true });
                  }}
                >
                  <LogoutRounded />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* SIDENAV com “frosted glass” + pill nos ativos */}
      <Drawer
        variant="permanent"
        sx={(t) => ({
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            ...glassStyles(t),
          },
        })}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", py: 1 }}>
          <List>
            {menuItems.map((it) => {
              const active = it.to === activeTo; // 👈 só UM fica ativo
              return (
                <ListItemButton
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  selected={active}
                  sx={(theme) => ({
                    borderRadius: 999,
                    mx: 1.25,
                    my: 0.5,
                    px: 1.5,
                    "& .MuiListItemIcon-root": {
                      minWidth: 40,
                      color: active
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                    },
                    "& .MuiListItemText-primary": {
                      fontWeight: active ? 800 : 600,
                    },
                    "&.Mui-selected": {
                      backgroundImage: `linear-gradient(135deg,
                        ${alpha(theme.palette.secondary.main, 0.18)},
                        ${alpha(theme.palette.primary.main, 0.18)})`,
                      border: `1px solid ${alpha(
                        theme.palette.primary.main,
                        0.25
                      )}`,
                      boxShadow: "0 6px 16px rgba(0,0,0,.08)",
                    },
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.common.white, 0.4),
                    },
                  })}
                >
                  <ListItemIcon>{it.icon}</ListItemIcon>
                  <ListItemText primary={it.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* CONTEÚDO com o gradiente+formas */}
      <Box component="main" sx={{ flexGrow: 1, p: 0, position: "relative" }}>
        <Toolbar sx={{ minHeight: 68 }} />
        <GradientBackgroundWithShapes
          decorations={12}
          floating
          seed={2025}
          sx={{
            minHeight: "calc(100vh - 68px)",
            p: { xs: 2, sm: 3 },
          }}
        >
          {loading ? (
            <Typography sx={{ opacity: 0.6 }}>A carregar…</Typography>
          ) : (
            <Outlet />
          )}
        </GradientBackgroundWithShapes>
      </Box>
    </Box>
  );
}

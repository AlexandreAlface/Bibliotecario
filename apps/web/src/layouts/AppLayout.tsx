// apps/web/src/layouts/AppLayout.tsx
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

import { useUserSession } from "@/contexts/UserSession";

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
      {
        to: "/achievements",
        label: "Conquistas",
        icon: <EmojiEventsRounded />,
      },
      
    ];
  }

  const items: NavItem[] = [
    { to: "/", label: "Início", icon: <HomeRounded /> },
  ];

  if (isFamily) {
    items.push(
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
        label: "Equipa · Início",
        icon: <DashboardCustomizeRounded />,
      },
      {
        to: "/librarian/consultas/pendentes",
        label: "Equipa · Pendentes",
        icon: <EventAvailableRounded />,
      },
      {
        to: "/librarian/agenda",
        label: "Equipa · Agenda",
        icon: <CalendarMonthRounded />,
      },
      {
        to: "/librarian/familias",
        label: "Equipa · Famílias",
        icon: <PeopleAltRounded />,
      },
      {
        to: "/librarian/slots",
        label: "Equipa · Slots",
        icon: <ScheduleRounded />,
      },
      {
        to: "/librarian/historico",
        label: "Equipa · Histórico",
        icon: <HistoryRounded />,
      }
    );
  }

  if (isAdmin) {
    items.push(
      {
        to: "/admin",
        label: "Admin · Início",
        icon: <AdminPanelSettingsRounded />,
      },
      {
        to: "/admin/bibliotecarios",
        label: "Admin · Bibliotecários",
        icon: <PeopleAltRounded />,
      },
      {
        to: "/admin/familias",
        label: "Admin · Famílias",
        icon: <PeopleAltRounded />,
      },
      { to: "/admin/slots", label: "Admin · Slots", icon: <ScheduleRounded /> },
      {
        to: "/admin/propostas",
        label: "Admin · Propostas",
        icon: <ListAltRounded />,
      },
      {
        to: "/admin/eventos",
        label: "Admin · Eventos",
        icon: <EventAvailableRounded />,
      },
      { to: "/admin/feeds", label: "Admin · Feeds", icon: <RssFeedRounded /> },
      {
        to: "/admin/metricas",
        label: "Admin · Métricas",
        icon: <QueryStatsRounded />,
      }
    );
  }

  // remove duplicados (caso o user acumule papéis)
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

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: "none",
              color: "inherit",
              fontWeight: 900,
              letterSpacing: 0.3,
            }}
          >
            Bibliotecário
          </Typography>

          <Box sx={{ flex: 1 }} />

          {!!user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
              />

              {!!children.length && isFamily && (
                <Tooltip title="Trocar de perfil">
                  <IconButton onClick={handleOpenMenu}>
                    <Avatar
                      src={asChild ? acting?.avatarUrl ?? undefined : undefined}
                      sx={{ width: 36, height: 36 }}
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
                  {/* Família */}
                  <MenuItem onClick={handlePickFamily}>
                    <ListItemIcon>
                      <FamilyRestroomRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Família" />
                  </MenuItem>

                  <Divider />

                  {/* Crianças */}
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

                  {/* Ir para ecrã de perfis */}
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
                    navigate("/auth/login", { replace: true }); // 👈 era "/login"
                  }}
                >
                  <LogoutRounded />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menuItems.map((it) => {
              const active =
                location.pathname === it.to ||
                location.pathname.startsWith(it.to + "/");
              return (
                <ListItemButton
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.25,
                    "&.Mui-selected": { bgcolor: "action.selected" },
                  }}
                >
                  <ListItemIcon>{it.icon}</ListItemIcon>
                  <ListItemText primary={it.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {loading ? (
          <Typography sx={{ opacity: 0.6 }}>A carregar…</Typography>
        ) : (
          <Outlet />
        )}
      </Box>
    </Box>
  );
}

// apps/web/src/pages/librarian/ConsultasTabs.tsx
import * as React from "react";
import {
  Tabs,
  Tab,
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";

const TABS = [
  { value: "pendentes", label: "Pendentes", icon: <EventAvailableRounded /> },
  { value: "agenda", label: "Agenda", icon: <CalendarMonthRounded /> },
  { value: "slots", label: "Slots", icon: <ScheduleRounded /> },
  { value: "historico", label: "Histórico", icon: <HistoryRounded /> },
] as const;

export default function LibrarianConsultasTabs() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const current = React.useMemo(() => {
    const seg = location.pathname.split("/").filter(Boolean);
    const idx = seg.lastIndexOf("consultas");
    const maybe = seg[idx + 1] || "pendentes";
    return (
      TABS.some((t) => t.value === maybe) ? maybe : "pendentes"
    ) as (typeof TABS)[number]["value"];
  }, [location.pathname]);

  const handleChange = (_: React.SyntheticEvent, next: string) => {
    if (next !== current) navigate(next);
  };

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header + Tabs sticky (sem glass) */}
      <Paper
        elevation={1}
        sx={{
          position: "sticky",
          top: 8,
          zIndex: 1,
          borderRadius: 3,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ letterSpacing: 1, fontWeight: 700, opacity: 0.8 }}
            >
              Bibliotecário
            </Typography>
            <Typography
              component="h1"
              sx={{
                m: 0,
                fontSize: { xs: 26, sm: 28 },
                fontWeight: 900,
                letterSpacing: 0.2,
                lineHeight: 1.2,
              }}
            >
              Consultas
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Revise pendentes, veja a agenda, gere slots e consulte o
              histórico.
            </Typography>
          </Box>

          {/* Ações rápidas */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<EventAvailableRounded />}
              onClick={() => navigate("pendentes")}
            >
              Ver pendentes
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalendarMonthRounded />}
              onClick={() => navigate("agenda")}
            >
              Abrir agenda
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleRounded />}
              onClick={() => navigate("slots")}
            >
              Gerir slots
            </Button>
          </Stack>
        </Stack>

        {/* Tabs com ícones e “pill” */}
        <Tabs
          value={current}
          onChange={handleChange}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Navegação de Consultas (Bibliotecário)"
          sx={{
            minHeight: 0,
            "& .MuiTabs-flexContainer": { gap: 0.5 },
            "& .MuiTab-root": {
              minHeight: 40,
              borderRadius: 999,
              px: 1.5,
              textTransform: "none",
              fontWeight: 700,
              alignItems: "center",
              "& .MuiTab-iconWrapper": { mr: 1 },
            },
            "& .MuiTab-root.Mui-selected": {
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            },
            "& .MuiTabs-indicator": { height: 0 },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              disableRipple
            />
          ))}
        </Tabs>
      </Paper>

      {/* Conteúdo das tabs */}
      <Box sx={{ mt: 2 }}>
        <Outlet />
      </Box>
    </Container>
  );
}

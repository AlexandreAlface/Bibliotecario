// apps/web/src/pages/admin/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { getAdminMetrics, type AdminMetrics } from "@/services/admin";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import AccountBoxRounded from "@mui/icons-material/AccountBoxRounded";
import Grid from "@mui/material/GridLegacy";

function StatTile({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box>{icon}</Box>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>{label}</Typography>
          <Typography variant="h5" fontWeight={900} lineHeight={1}>{value}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function AdminHome() {
  const { user } = useUserSession() as any;
  const libraryId = Number((user?.userLibraries?.[0]?.libraryId as any) ?? (user as any)?.libraryId ?? 0);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!libraryId) return;
    (async () => {
      try {
        setErr(null);
        const m = await getAdminMetrics(libraryId);
        setMetrics(m);
      } catch (e: any) {
        setErr(e?.message || "Falha a carregar métricas.");
      }
    })();
  }, [libraryId]);

  const weekly = metrics?.weeklyConsultations ?? [];
  const util = metrics?.slotUtilization ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2, letterSpacing: 0.3 }}>Admin — Biblioteca</Typography>
      {err && <Typography color="error" sx={{ mb: 1 }}>{err}</Typography>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}><StatTile label="Consultas/semana" value={weekly.slice(-1)[0]?.count ?? 0} icon={<EventAvailableRounded />} /></Grid>
        <Grid item xs={12} md={4}><StatTile label="Bibliotecários ativos" value={metrics?.activeLibrarians ?? 0} icon={<AccountBoxRounded />} /></Grid>
        <Grid item xs={12} md={4}><StatTile label="Famílias atendidas" value={metrics?.familiesServed ?? 0} icon={<GroupsRounded />} /></Grid>

        <Grid item xs={12} md={7}>
          <WhiteCard sx={{ p: 2, height: 340 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Consultas por semana</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <RTooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <WhiteCard sx={{ p: 2, height: 340 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Utilização de slots (%)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={util}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <RTooltip />
                <Line type="monotone" dataKey="percent" />
              </LineChart>
            </ResponsiveContainer>
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

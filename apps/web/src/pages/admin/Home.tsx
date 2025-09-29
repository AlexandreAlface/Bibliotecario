// apps/web/src/pages/admin/Home.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { alpha } from "@mui/material/styles";

// lucide
import {
  CalendarCheck2,
  Users,
  IdCard,
  Clock4,
  ShieldBan,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listLibrarySlots,
  listGlobalBlocks,
  getMyLibrary,
  getAdminMetrics,
  type SlotLite,
  type BlockSlot,
  type AdminMetrics,
  type LibraryLite,
} from "@/services/admin";

// -------- helpers de datas --------
function startOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
const nf = new Intl.NumberFormat("pt-PT");

function StatTile({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Box
      sx={(t) => ({
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: `0 1px 0 ${alpha(t.palette.common.black, 0.05)}`,
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        {!!icon && <Box sx={{ opacity: 0.9 }}>{icon}</Box>}
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={900} lineHeight={1}>
            {typeof value === "number" ? nf.format(value) : value}
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function ChartCard({
  title,
  children,
  height = 360,
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <WhiteCard sx={{ p: 2, height }}>
      <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </WhiteCard>
  );
}

function WeeklyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: "background.paper",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" fontWeight={700}>
        Semana de {d.toLocaleDateString("pt-PT")}
      </Typography>
      <Typography variant="body2">Consultas: {payload[0].value}</Typography>
    </Box>
  );
}

function UtilTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: "background.paper",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" fontWeight={700}>
        {new Date(label).toLocaleDateString("pt-PT")}
      </Typography>
      <Typography variant="body2">Utilização: {payload[0].value}%</Typography>
    </Box>
  );
}

export default function AdminHome() {
  const theme = useTheme();
  const { user } = useUserSession() as any;

  // -------- biblioteca única do admin --------
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  async function loadMyLibrary() {
    try {
      setLibLoading(true);
      const lib = await getMyLibrary();
      if (!lib) {
        setMyLib(null);
        setLibErr("Não estás associado a nenhuma biblioteca.");
      } else {
        setMyLib(lib);
        setLibErr(null);
      }
    } catch (e: any) {
      setMyLib(null);
      setLibErr(e?.message || "Falha a carregar a tua biblioteca.");
    } finally {
      setLibLoading(false);
    }
  }

  useEffect(() => {
    void loadMyLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // -------- dados --------
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [slotsToday, setSlotsToday] = useState<{
    open: number;
    booked: number;
    blocked: number;
  }>({
    open: 0,
    booked: 0,
    blocked: 0,
  });
  const [blocksCount, setBlocksCount] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function reloadAll() {
    if (!myLib?.id) return;
    try {
      setLoading(true);
      setErr(null);
      const [m, slots, blocks] = await Promise.all([
        getAdminMetrics(myLib.id),
        listLibrarySlots(myLib.id, {
          from: startOfDayISO(),
          to: endOfDayISO(),
        }),
        listGlobalBlocks(myLib.id),
      ]);

      setMetrics(m);

      const tally = (slots as SlotLite[]).reduce(
        (acc, s) => {
          if (s.status === "OPEN") acc.open++;
          else if (s.status === "BOOKED") acc.booked++;
          else if (s.status === "BLOCKED") acc.blocked++;
          return acc;
        },
        { open: 0, booked: 0, blocked: 0 }
      );
      setSlotsToday(tally);
      setBlocksCount((blocks as BlockSlot[]).length);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar dados.");
      setMetrics(null);
      setSlotsToday({ open: 0, booked: 0, blocked: 0 });
      setBlocksCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (myLib?.id) void reloadAll();
  }, [myLib?.id]);

  const weekly = metrics?.weeklyConsultations ?? [];
  const util = metrics?.slotUtilization ?? [];
  const lastWeekCount = useMemo(
    () => (weekly.length ? weekly[weekly.length - 1]?.count ?? 0 : 0),
    [weekly]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Admin — Biblioteca
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {libLoading ? (
              "A carregar biblioteca…"
            ) : libErr ? (
              libErr
            ) : myLib ? (
              <>
                Biblioteca: <b>{myLib.name}</b>
              </>
            ) : (
              "—"
            )}
          </Typography>
        </Box>

        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void reloadAll()} disabled={!myLib?.id}>
              <RefreshCw size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {err && (
        <Typography color="error" sx={{ mb: 1 }}>
          {err}
        </Typography>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Consultas (semana)"
              value={lastWeekCount}
              icon={<CalendarCheck2 size={22} />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Bibliotecários ativos"
              value={metrics?.activeLibrarians ?? 0}
              icon={<IdCard size={22} />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Famílias atendidas"
              value={metrics?.familiesServed ?? 0}
              icon={<Users size={22} />}
            />
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Slots hoje (abertos)"
              value={slotsToday.open}
              icon={<Clock4 size={22} />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Slots hoje (reservados)"
              value={slotsToday.booked}
              icon={<Clock4 size={22} />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Bloqueios ativos"
              value={blocksCount}
              icon={<ShieldBan size={22} />}
            />
          )}
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Consultas por semana">
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={weekly}>
                <defs>
                  <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={theme.palette.primary.main}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor={alpha(theme.palette.primary.main, 0.5)}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                />
                <YAxis allowDecimals={false} />
                <RTooltip content={<WeeklyTooltip />} />
                <Bar
                  dataKey="count"
                  fill="url(#barColor)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <ChartCard title="Utilização de slots (%)">
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={metrics?.slotUtilization ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                />
                <YAxis domain={[0, 100]} />
                <Legend />
                <RTooltip content={<UtilTooltip />} />
                <Line
                  type="monotone"
                  dataKey="percent"
                  name="Utilização"
                  stroke={theme.palette.secondary.main}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Atalhos */}
      <WhiteCard sx={{ mt: 2, p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          divider={<Divider orientation="vertical" flexItem />}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" fontWeight={900}>
            Atalhos
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              component={RouteLink as any}
              href="/admin/slots"
              endIcon={<ArrowRight size={16} />}
            >
              Gestão de slots
            </Button>
            <Button
              variant="outlined"
              component={RouteLink as any}
              href="/admin/familias"
              endIcon={<ArrowRight size={16} />}
            >
              Famílias
            </Button>
            <Button
              variant="outlined"
              component={RouteLink as any}
              href="/admin/eventos"
              endIcon={<ArrowRight size={16} />}
            >
              Eventos culturais
            </Button>
            <Button
              variant="outlined"
              component={RouteLink as any}
              href="/admin/consultas/pendentes"
              endIcon={<ArrowRight size={16} />}
            >
              Backlog de consultas
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {updatedAt
              ? `Atualizado ${updatedAt.toLocaleTimeString("pt-PT")}`
              : "—"}
          </Typography>
        </Stack>
      </WhiteCard>
    </Container>
  );
}

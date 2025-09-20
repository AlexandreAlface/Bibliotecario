// apps/web/src/pages/admin/Home.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
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

// lucide (mantemos para evitar MIME issues)
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
  type SlotLite,
  type BlockSlot,
} from "@/services/admin";
import {
  getAdminMetrics,
  listMyLibraries,
  type AdminMetrics,
} from "@/services/adminMetrics";

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

type LibraryLite = { id: number; name: string };

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

  // -------- bibliotecas (selector no header) --------
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);
  const [libraryId, setLibraryId] = useState<number | null>(null);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLibsLoading(true);
        const libs = await listMyLibraries();
        setLibraries(libs || []);
        const fallback =
          Number(
            (user?.userLibraries?.[0]?.libraryId as any) ??
              (user as any)?.libraryId ??
              0
          ) || null;
        const initial =
          libs?.[0]?.id ??
          (fallback && libs?.some((l) => l.id === fallback) ? fallback : null);
        setLibraryId(initial ?? null);
      } catch (e: any) {
        setLibraries([]);
        setLibraryId(null);
        setLibsErr(e?.message || "Falha a carregar bibliotecas.");
      } finally {
        setLibsLoading(false);
      }
    })();
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
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const [m, slots, blocks] = await Promise.all([
        getAdminMetrics(libraryId),
        listLibrarySlots(libraryId, {
          from: startOfDayISO(),
          to: endOfDayISO(),
        }),
        listGlobalBlocks(libraryId),
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
    if (libraryId) void reloadAll();
  }, [libraryId]);

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
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Admin — Biblioteca
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Autocomplete
            sx={{ minWidth: 280 }}
            options={libraries}
            loading={libsLoading}
            value={libraries.find((l) => l.id === libraryId) || null}
            onChange={(_, v) => setLibraryId(v ? v.id : null)}
            getOptionLabel={(o) => o?.name ?? ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => (
              <TextField {...params} label="Biblioteca" />
            )}
          />
          <Tooltip title="Atualizar">
            <span>
              <IconButton
                onClick={() => void reloadAll()}
                disabled={!libraryId}
              >
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {libsErr && (
        <Typography color="error" sx={{ mb: 1 }}>
          {libsErr}
        </Typography>
      )}
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
              <LineChart data={util}>
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

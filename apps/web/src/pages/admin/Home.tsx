// apps/web/src/pages/admin/Home.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Container,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
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
  Building2,
} from "lucide-react";

import { WhiteCard } from "@bibliotecario/ui-web";
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
  color = "default",
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  hint?: string;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "default";
}) {
  const theme = useTheme();
  const palette =
    color === "default" ? theme.palette.grey : (theme.palette as any)[color];
  const accent =
    color === "default" ? theme.palette.text.secondary : palette.main;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: theme.palette.divider,
        boxShadow: theme.shadows[1],
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        {!!icon && (
          <Box
            sx={{
              display: "inline-flex",
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(accent, 0.12),
              color: accent,
              lineHeight: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {label}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={900}
            lineHeight={1}
            sx={{
              color:
                color === "default" ? theme.palette.text.primary : palette.dark,
            }}
          >
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
  subtitle,
  children,
  height = 360,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <WhiteCard sx={{ p: 2, height }}>
      <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{ opacity: 0.7, display: "block", mb: 1 }}
        >
          {subtitle}
        </Typography>
      )}
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
  const lastWeekCount = useMemo(
    () => (weekly.length ? weekly[weekly.length - 1]?.count ?? 0 : 0),
    [weekly]
  );
  const util = metrics?.slotUtilization ?? [];

  // ---- média móvel (4 semanas) — calculada **dentro** do componente ----
  type WeeklyPoint = { week: string; count: number; ma4?: number };
  const weeklyWithMA: WeeklyPoint[] = useMemo(() => {
    const arr: WeeklyPoint[] = weekly.map((w: any) => ({
      week: String(w?.week ?? ""),
      count: Number(w?.count ?? 0),
    }));
    return arr.map((w, i) => {
      const from = Math.max(0, i - 3);
      const slice = arr.slice(from, i + 1);
      const avg =
        slice.reduce((acc, p) => acc + (p?.count ?? 0), 0) / slice.length;
      return { ...w, ma4: Number(avg.toFixed(2)) };
    });
  }, [weekly]);

  return (
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <WhiteCard sx={{ mb: 2, p: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          flexWrap="wrap"
        >
          <Stack spacing={0.25}>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ letterSpacing: 0.3 }}
            >
              Painel da biblioteca
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip
                size="small"
                icon={<Building2 size={14} />}
                label={
                  libLoading
                    ? "A carregar…"
                    : libErr
                    ? libErr
                    : myLib
                    ? myLib.name
                    : "—"
                }
                sx={{ mr: 0.5 }}
              />
              {updatedAt && (
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Atualizado às {updatedAt.toLocaleTimeString("pt-PT")}
                </Typography>
              )}
            </Stack>
          </Stack>

          <Tooltip title="Atualizar">
            <span>
              <IconButton
                onClick={() => void reloadAll()}
                disabled={!myLib?.id}
                aria-label="Atualizar"
              >
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </WhiteCard>

      {err && (
        <Typography color="error" sx={{ mb: 1 }}>
          {err}
        </Typography>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Consultas (semana)"
              value={lastWeekCount}
              icon={<CalendarCheck2 size={22} />}
              color="primary"
            />
          )}
        </Grid>
        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Bibliotecários ativos"
              value={metrics?.activeLibrarians ?? 0}
              icon={<IdCard size={22} />}
              color="info"
            />
          )}
        </Grid>
        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Famílias atendidas"
              value={metrics?.familiesServed ?? 0}
              icon={<Users size={22} />}
              color="secondary"
            />
          )}
        </Grid>

        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Slots hoje (abertos)"
              value={slotsToday.open}
              icon={<Clock4 size={22} />}
              color="success"
            />
          )}
        </Grid>
        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Slots hoje (reservados)"
              value={slotsToday.booked}
              icon={<Clock4 size={22} />}
              color="warning"
            />
          )}
        </Grid>
        <Grid item xs={12} md={2}>
          {loading ? (
            <Skeleton variant="rounded" height={80} />
          ) : (
            <StatTile
              label="Bloqueios ativos"
              value={blocksCount}
              icon={<ShieldBan size={22} />}
              color="error"
            />
          )}
        </Grid>
      </Grid>

      {/* Gráficos (2) */}
      <Grid container spacing={2}>
        {/* 1) Consultas por semana (barras + média móvel) */}
        <Grid item xs={12} md={7}>
          <ChartCard
            title="Consultas por semana"
            subtitle="Barras: total de consultas por semana. A linha mostra a média móvel das últimas 4 semanas."
          >
            <ResponsiveContainer width="100%" height="85%">
              <ComposedChart data={weeklyWithMA}>
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
                <Legend />
                <RTooltip content={<WeeklyTooltip />} />
                <Bar
                  dataKey="count"
                  name="Consultas"
                  fill="url(#barColor)"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="ma4"
                  name="Média móvel (4s)"
                  stroke={theme.palette.secondary.main}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* 2) Utilização de slots (%) (área + linhas de referência) */}
        <Grid item xs={12} md={5}>
          <ChartCard
            title="Utilização de slots (%)"
            subtitle="Percentagem diária de utilização dos slots. Linhas de referência: 50% (razoável) e 70% (boa utilização)."
            height={360}
          >
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={util}>
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={theme.palette.secondary.main}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={alpha(theme.palette.secondary.main, 0.06)}
                    />
                  </linearGradient>
                </defs>
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
                <ReferenceLine
                  y={70}
                  stroke={theme.palette.success.main}
                  strokeDasharray="4 4"
                  label={{
                    value: "70% bom",
                    position: "right",
                    fill: theme.palette.success.main,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  y={50}
                  stroke={theme.palette.warning.main}
                  strokeDasharray="4 4"
                  label={{
                    value: "50% ok",
                    position: "right",
                    fill: theme.palette.warning.main,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percent"
                  name="Utilização"
                  stroke={theme.palette.secondary.main}
                  strokeWidth={2}
                  fill="url(#utilGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Container>
  );
}

/**
 * =============================================================================
 *  Admin · Métricas & Dashboard
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Metrics.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Reforços “como combinado”:
 *   • Comentários completos (pt-PT) em todo o ficheiro.
 *   • Marcação explícita de funções/expressões **puras**.
 *   • Manter funções curtas (≤ ~30 linhas) com nomes descritivos.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { WhiteCard } from "@bibliotecario/ui-web";
import {
  loadMetricsData,
  type ConsultationFull,
} from "@/services/admin/adminMetrics";
import { getMyLibrary, type LibraryLite } from "@/services/admin/admin";

/* ========================================================================== */
/*                                  HELPERS                                   */
/* ========================================================================== */
/**
 * Helpers de data/tempo. Mantidos pequenos, determinísticos e sem efeitos
 * colaterais → ✅ **PUROS**
 */
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d: Date, n: number) {
  return addDays(d, n * 7);
}
function fmtYMD(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}
/** Início da semana ISO (segunda-feira). ✅ **PURO** */
function startOfISOWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setHours(-24 * (day - 1), 0, 0, 0);
  else d.setHours(0, 0, 0, 0);
  return d;
}
/**
 * Chave ISO de semana com rótulo amigável. ✅ **PURO**
 * - key: YYYY-Wnn
 * - label: YYYY-Wnn (dd/mm)
 */
function isoWeekKey(d: Date) {
  const monday = startOfISOWeek(d);
  const year = monday.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const days = Math.floor((monday.getTime() - oneJan.getTime()) / 86400000);
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7);
  const ddmmyy = monday.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  });
  return {
    key: `${year}-W${String(week).padStart(2, "0")}`,
    label: `${year}-W${String(week).padStart(2, "0")} (${ddmmyy})`,
    monday,
  };
}

const WEEKDAY_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* Layout para cartões e caixas de gráfico (constantes meramente visuais) */
const CARD_SX = {
  flex: 1,
  p: { xs: 2, md: 2.75 },
  minHeight: { xs: 420, md: 520, lg: 560 },
  display: "flex",
  flexDirection: "column",
} as const;

const CHART_BOX_SX = {
  flex: 1,
  minHeight: { xs: 320, md: 400, lg: 460 },
} as const;

/* ========================================================================== */
/*                           AGREGADORES / TRANSFORMERS                       */
/* ========================================================================== */
/** Nome curto "Primeiro Ú." (ou o próprio nome). ✅ **PURO** */
function shortName(full?: string | null) {
  if (!full) return "—";
  const parts = full.split(" ");
  if (parts.length <= 1) return full;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Agrupa consultas por semana (ISO) e conta por estado. ✅ **PURO**
 * Saída ordenada por data (asc).
 */
function groupConsultationsByWeek(items: ConsultationFull[]) {
  const map = new Map<string, any>();
  for (const c of items) {
    const when = c.startAt || c.requestedAt;
    if (!when) continue;
    const { key, label, monday } = isoWeekKey(new Date(when));
    const slot = map.get(key) || {
      key,
      label,
      monday,
      total: 0,
      PENDING: 0,
      CONFIRMED: 0,
      DECLINED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    slot.total += 1;
    const s = (c.status || "").toUpperCase();
    slot[s] = (slot[s] || 0) + 1;
    map.set(key, slot);
  }
  return Array.from(map.values()).sort(
    (a, b) => a.monday.getTime() - b.monday.getTime()
  );
}

/** Converte contagens semanais em percentagens por estado. ✅ **PURO** */
function weeklyStatusPercent(weekly: any[]) {
  return weekly.map((w) => {
    const t = w.total || 1;
    return {
      label: w.label,
      PENDING_PCT: Math.round(((w.PENDING || 0) / t) * 1000) / 10,
      CONFIRMED_PCT: Math.round(((w.CONFIRMED || 0) / t) * 1000) / 10,
      DECLINED_PCT: Math.round(((w.DECLINED || 0) / t) * 1000) / 10,
      CANCELLED_PCT: Math.round(((w.CANCELLED || 0) / t) * 1000) / 10,
      COMPLETED_PCT: Math.round(((w.COMPLETED || 0) / t) * 1000) / 10,
    };
  });
}

/** Taxa semanal de confirmação: (CONFIRMED+COMPLETED)/total. ✅ **PURO** */
function weeklyConversion(weekly: any[]) {
  return weekly.map((w) => {
    const booked = (w.CONFIRMED || 0) + (w.COMPLETED || 0);
    const t = w.total || 0;
    const rate = t > 0 ? Math.round((booked / t) * 1000) / 10 : 0;
    return { label: w.label, rate };
  });
}

/** Antecedência média (dias) por semana, com base em startAt vs requestedAt. ✅ **PURO** */
function leadTimeByWeek(items: ConsultationFull[]) {
  const map = new Map<string, { sum: number; n: number; label: string }>();
  for (const c of items) {
    if (!c.startAt || !c.requestedAt) continue;
    const dtStart = new Date(c.startAt).getTime();
    const dtReq = new Date(c.requestedAt).getTime();
    if (!(dtStart > 0 && dtReq > 0)) continue;
    const diffDays = (dtStart - dtReq) / 86400000;
    const { key, label } = isoWeekKey(new Date(c.startAt));
    const slot = map.get(key) || { sum: 0, n: 0, label };
    slot.sum += diffDays;
    slot.n += 1;
    map.set(key, slot);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      value: v.n ? +(v.sum / v.n).toFixed(1) : 0,
    }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

/** Histograma de buckets de antecedência (dias). ✅ **PURO** */
function leadBuckets(items: ConsultationFull[]) {
  // 0–1, 2–3, 4–7, 8–14, 15+ dias
  const buckets = [
    { key: "0–1", from: 0, to: 1.0001, value: 0 },
    { key: "2–3", from: 2, to: 3.0001, value: 0 },
    { key: "4–7", from: 4, to: 7.0001, value: 0 },
    { key: "8–14", from: 8, to: 14.0001, value: 0 },
    { key: "15+", from: 15, to: Infinity, value: 0 },
  ];
  for (const c of items) {
    if (!c.startAt || !c.requestedAt) continue;
    const dt =
      (new Date(c.startAt).getTime() - new Date(c.requestedAt).getTime()) /
      86400000;
    const b = buckets.find((x) => dt >= x.from && dt < x.to);
    if (b) b.value += 1;
  }
  return buckets.map((b) => ({ name: b.key, value: b.value }));
}

/** Distribuição global por estado (para pie). ✅ **PURO** */
function statusDistribution(items: ConsultationFull[]) {
  const acc = {
    PENDING: 0,
    CONFIRMED: 0,
    DECLINED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
  };
  for (const c of items) {
    const s = (c.status || "").toUpperCase();
    (acc as any)[s] = ((acc as any)[s] || 0) + 1;
  }
  return Object.entries(acc).map(([name, value]) => ({ name, value }));
}

/**
 * Top bibliotecários (Pareto: valor + acumulado %). ✅ **PURO**
 * - `limit` controla quantos são mostrados.
 */
function topLibrarians(items: ConsultationFull[], limit = 12) {
  const map = new Map<string, number>();
  const nameMap = new Map<string, string>();
  for (const c of items) {
    const id = (c as any).librarian?.id;
    if (!id) continue;
    const key = String(id);
    map.set(key, (map.get(key) || 0) + 1);
    if ((c as any).librarian?.fullName)
      nameMap.set(key, (c as any).librarian.fullName);
  }
  const arr = Array.from(map.entries())
    .map(([id, value]) => ({
      id,
      value,
      name: shortName(nameMap.get(id) || `#${id}`),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const total = arr.reduce((s, x) => s + x.value, 0) || 1;
  let cum = 0;
  return arr
    .map((x) => {
      cum += x.value;
      return { ...x, cumPct: Math.round((cum / total) * 1000) / 10 };
    })
    .reverse(); // para layout vertical-left
}

/** Contagem por dia da semana (Dom..Sáb). ✅ **PURO** */
function byWeekday(items: ConsultationFull[]) {
  const arr = Array.from({ length: 7 }, (_, i) => ({
    name: WEEKDAY_PT[i],
    value: 0,
  }));
  for (const c of items) {
    const when = c.startAt || c.requestedAt;
    if (!when) continue;
    const d = new Date(when);
    arr[d.getDay()].value += 1;
  }
  return arr;
}

/** Série de utilização semanal: booked/(abertos+booked). ✅ **PURO** */
type SlotsLite = {
  id: number;
  startAt: string;
  endAt: string;
  libraryId?: number | null;
};
function utilizationSeries(weekly: any[], openSlots: SlotsLite[]) {
  const slotMap = new Map<string, number>();
  for (const s of openSlots) {
    const { key } = isoWeekKey(new Date(s.startAt));
    slotMap.set(key, (slotMap.get(key) || 0) + 1);
  }
  return weekly.map((w) => {
    const abertos = slotMap.get(w.key) || 0;
    const booked = (w.CONFIRMED || 0) + (w.COMPLETED || 0);
    const total = booked + abertos;
    const rate = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { key: w.key, label: w.label, utilizacao: rate, abertos, booked };
  });
}

/* ========================================================================== */
/*                                   TILES                                    */
/* ========================================================================== */
/** Pequeno tile com gradiente para KPIs (apenas UI). */
function StatTile({
  label,
  value,
  sublabel,
  gradient,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  gradient: string;
}) {
  return (
    <Box
      sx={{
        p: 2.2,
        borderRadius: 3,
        color: "#fff",
        background: gradient,
        boxShadow: "0 12px 28px rgba(0,0,0,.18)",
        border: "1px solid rgba(255,255,255,.15)",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.9 }}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={900} lineHeight={1}>
        {value}
      </Typography>
      {!!sublabel && (
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  );
}

/* ========================================================================== */
/*                                    PAGE                                    */
/* ========================================================================== */
/**
 * Página: AdminMetrics
 *  • Carrega biblioteca do admin e dados de métricas da janela escolhida;
 *  • Calcula séries/visões derivadas no cliente (useMemo);
 *  • Apresenta KPIs e gráficos (Recharts).
 */
export default function AdminMetrics() {
  const theme = useTheme();

  /* -------- Biblioteca do admin (única) -------- */
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  /* -------- Janela temporal (por defeito: 12 semanas) -------- */
  const [fromYmd, setFromYmd] = useState(
    fmtYMD(addWeeks(startOfDay(new Date()), -12))
  );
  const [toYmd, setToYmd] = useState(fmtYMD(new Date()));

  /* -------- Dados remotos -------- */
  const [consultas, setConsultas] = useState<ConsultationFull[]>([]);
  const [openSlots, setOpenSlots] = useState<SlotsLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* -------- Paleta context-aware (usada nos gráficos) -------- */
  const C = {
    PENDING: theme.palette.warning.light,
    CONFIRMED: theme.palette.success.main,
    COMPLETED: theme.palette.success.dark,
    DECLINED: theme.palette.error.main,
    CANCELLED: theme.palette.grey[400],
    TOTAL: theme.palette.primary.main,
    INFO: theme.palette.info.main,
    SECONDARY: theme.palette.secondary.main,
  };
  const gPrimary = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`;
  const gSecondary = `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`;
  const gSuccess = `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`;
  const gInfo = `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)`;

  /* -------- Carregar biblioteca do admin -------- */
  useEffect(() => {
    (async () => {
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
        setLibErr(e?.message || "Falha a carregar a biblioteca.");
      } finally {
        setLibLoading(false);
      }
    })();
  }, []);

  /**
   * (Re)carrega métricas/slots para a biblioteca e intervalo selecionados.
   * Mantido curto; lida com estados de loading/erro.
   */
  async function reload() {
    if (!myLib?.id) return;
    try {
      setLoading(true);
      setErr(null);
      const { consultas: cons, openSlots: slots } = await loadMetricsData({
        from: startOfDay(new Date(fromYmd)).toISOString(),
        to: endOfDay(new Date(toYmd)).toISOString(),
        libraryId: myLib.id,
      });
      setConsultas(cons);
      setOpenSlots(slots as any);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar métricas");
      setConsultas([]);
      setOpenSlots([]);
    } finally {
      setLoading(false);
    }
  }

  // Dispara load sempre que muda a janela temporal ou a biblioteca.
  useEffect(() => {
    if (myLib?.id) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromYmd, toYmd, myLib?.id]);

  /* -------- Agregações derivadas (✅ **PURO** via useMemo) -------- */
  const weekly = useMemo(
    () => groupConsultationsByWeek(consultas),
    [consultas]
  );
  const weeklyPct = useMemo(() => weeklyStatusPercent(weekly), [weekly]);
  const convSerie = useMemo(() => weeklyConversion(weekly), [weekly]);
  const utilSerie = useMemo(
    () => utilizationSeries(weekly, openSlots),
    [weekly, openSlots]
  );
  const statusPie = useMemo(() => statusDistribution(consultas), [consultas]);
  const topLibsPareto = useMemo(() => topLibrarians(consultas), [consultas]);
  const weekday = useMemo(() => byWeekday(consultas), [consultas]);
  const leadSerie = useMemo(() => leadTimeByWeek(consultas), [consultas]);
  const leadHist = useMemo(() => leadBuckets(consultas), [consultas]);

  /* -------- KPIs simples (✅ **PURO**: derivados de estado) -------- */
  const totalConsultas = consultas.length;
  const confirmadas = consultas.filter(
    (c) => c.status === "CONFIRMED" || c.status === "COMPLETED"
  ).length;
  const taxaConfirm = totalConsultas
    ? Math.round((confirmadas / totalConsultas) * 100)
    : 0;

  const bookedTotal = confirmadas;
  const openTotal = openSlots.length;
  const utilizacaoMedia =
    bookedTotal + openTotal > 0
      ? Math.round((bookedTotal / (bookedTotal + openTotal)) * 100)
      : 0;

  const activeLibrarians = useMemo(
    () =>
      new Set(consultas.map((c) => (c as any).librarian?.id).filter(Boolean))
        .size,
    [consultas]
  );
  const familiasAtendidas = useMemo(
    () =>
      new Set(consultas.map((c) => (c as any).family?.id).filter(Boolean)).size,
    [consultas]
  );

  /** Atalhos de intervalo (4, 12, 26 semanas). Mantido curto. */
  const quickSet = (weeks: number) => {
    const to = new Date();
    const from = addWeeks(startOfDay(to), -weeks);
    setFromYmd(fmtYMD(from));
    setToYmd(fmtYMD(to));
  };

  /* --------------------------------- RENDER --------------------------------- */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header c/ título e ação de recarregar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h3" fontWeight={900}>
          Métricas & Dashboard
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              onClick={() => void reload()}
              disabled={loading || !myLib?.id}
            >
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Filtros (datas + presets + biblioteca info) */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          {/* Datas (De/Até + Hoje) */}
          <Stack direction="row" spacing={1}>
            <TextField
              label="De"
              type="date"
              value={fromYmd}
              onChange={(e) => setFromYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="Até"
              type="date"
              value={toYmd}
              onChange={(e) => setToYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <IconButton
              onClick={() => {
                const t = new Date();
                setFromYmd(fmtYMD(t));
                setToYmd(fmtYMD(t));
              }}
              title="Hoje"
            >
              <TodayRounded />
            </IconButton>
          </Stack>

          {/* Atalhos rápidos */}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button size="small" onClick={() => quickSet(4)}>
              Últimas 4 semanas
            </Button>
            <Button size="small" onClick={() => quickSet(12)}>
              12 semanas
            </Button>
            <Button size="small" onClick={() => quickSet(26)}>
              6 meses
            </Button>
          </Stack>

          {/* Biblioteca (info/estado) */}
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {libLoading ? (
              "A carregar biblioteca…"
            ) : myLib ? (
              <>
                Biblioteca: <b>{myLib.name}</b>
              </>
            ) : (
              libErr || "—"
            )}
          </Typography>
        </Stack>
      </WhiteCard>

      {!!err && (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      )}

      {!myLib?.id ? (
        <WhiteCard>
          <Typography sx={{ opacity: 0.8 }}>
            {libLoading
              ? "A carregar…"
              : libErr || "Não tens biblioteca associada para ver métricas."}
          </Typography>
        </WhiteCard>
      ) : (
        <>
          {/* KPIs principais */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <StatTile
                label="Consultas (janela)"
                value={totalConsultas}
                sublabel={`${fmtYMD(fromYmd)} — ${fmtYMD(toYmd)}`}
                gradient={gPrimary}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatTile
                label="Taxa de confirmação"
                value={`${taxaConfirm}%`}
                sublabel={`${confirmadas} confirmadas/concluídas`}
                gradient={gSuccess}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatTile
                label="Bibliotecários ativos"
                value={activeLibrarians}
                sublabel={`${familiasAtendidas} famílias atendidas`}
                gradient={gSecondary}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatTile
                label="Utilização média de slots"
                value={`${utilizacaoMedia}%`}
                sublabel={`booked ${bookedTotal} / abertos ${openTotal}`}
                gradient={gInfo}
              />
            </Grid>
          </Grid>

          {/* Linha 1 — Stacked % por estado + taxa de confirmação */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={8} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Distribuição semanal por estado (%)
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Stacked 100%: composição por estado ao longo das semanas.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyPct}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <RTooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <Bar
                        dataKey="CONFIRMED_PCT"
                        name="Confirmada"
                        stackId="pct"
                        fill={C.CONFIRMED}
                      />
                      <Bar
                        dataKey="COMPLETED_PCT"
                        name="Concluída"
                        stackId="pct"
                        fill={C.COMPLETED}
                      />
                      <Bar
                        dataKey="PENDING_PCT"
                        name="Pendente"
                        stackId="pct"
                        fill={C.PENDING}
                      />
                      <Bar
                        dataKey="DECLINED_PCT"
                        name="Recusada"
                        stackId="pct"
                        fill={C.DECLINED}
                      />
                      <Bar
                        dataKey="CANCELLED_PCT"
                        name="Cancelada"
                        stackId="pct"
                        fill={C.CANCELLED}
                      />
                      <Brush dataKey="label" height={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>

            <Grid item xs={12} md={4} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Taxa de confirmação por semana
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  (Confirmadas+Concluídas) / Total · Linhas: 40% (ok), 60%
                  (bom).
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={convSerie}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <ReferenceLine
                        y={60}
                        stroke={theme.palette.success.main}
                        strokeDasharray="4 4"
                      />
                      <ReferenceLine
                        y={40}
                        stroke={theme.palette.warning.main}
                        strokeDasharray="4 4"
                      />
                      <RTooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        name="Confirmação"
                        stroke={C.SECONDARY}
                        fill={C.SECONDARY}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>

          {/* Linha 2 — Histograma de antecedência + Pareto de bibliotecários */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={5} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Antecedência das marcações (histograma)
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Dias entre pedido e início — perceção das janelas de
                  planeamento.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadHist}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Bar
                        dataKey="value"
                        name="Consultas"
                        fill={C.TOTAL}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>

            <Grid item xs={12} md={7} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Pareto de bibliotecários (janela)
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Contribuição (barras) + acumulado (%) em linha.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={topLibsPareto}
                      layout="vertical"
                      margin={{ left: 28, right: 28 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <RTooltip />
                      <Legend />
                      <Bar
                        dataKey="value"
                        name="Consultas"
                        barSize={18}
                        fill={C.CONFIRMED}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumPct"
                        name="Acumulado (%)"
                        stroke={C.INFO}
                        strokeWidth={2}
                        dot={false}
                        yAxisId={1}
                      />
                      <YAxis
                        yAxisId={1}
                        orientation="right"
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>

          {/* Linha 3 — Utilização semanal + distribuição por dia da semana */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={7} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Utilização de slots (%) por semana
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  (Confirmadas+Concluídas) / (Abertos+Confirmadas+Concluídas).
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={utilSerie}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <RTooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <ReferenceLine
                        y={70}
                        stroke={theme.palette.success.main}
                        strokeDasharray="4 4"
                      />
                      <ReferenceLine
                        y={50}
                        stroke={theme.palette.warning.main}
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="utilizacao"
                        name="Utilização"
                        stroke={C.TOTAL}
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>

            <Grid item xs={12} md={5} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Consultas por dia da semana
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Padrão semanal — útil para abrir slots nos dias “fortes”.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekday}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Bar
                        dataKey="value"
                        name="Consultas"
                        fill={C.PENDING}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>

          {/* Extra — Anel por estado + Antecedência média por semana */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Distribuição global por estado
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Foto geral da janela selecionada.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RTooltip />
                      <Legend />
                      <Pie
                        data={statusPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {statusPie.map((entry, i) => {
                          const map: any = {
                            PENDING: C.PENDING,
                            CONFIRMED: C.CONFIRMED,
                            COMPLETED: C.COMPLETED,
                            DECLINED: C.DECLINED,
                            CANCELLED: C.CANCELLED,
                          };
                          return (
                            <Cell key={i} fill={map[entry.name] || "#ccc"} />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>

            <Grid item xs={12} md={8} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Antecedência média por semana (dias)
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  Média de dias entre pedido e consulta realizada.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={leadSerie}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <RTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Dias"
                        stroke={C.INFO}
                        fill={C.INFO}
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}

/**
 * =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */

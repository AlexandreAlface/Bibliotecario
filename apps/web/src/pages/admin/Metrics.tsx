/**
 * =============================================================================
 *  Admin · Métricas & Dashboard (versão Chart.js)
 *  Autor: Alexandre Brissos — Nº 21131
 *  Alterações:
 *   • Mantidos:   "Distribuição global por estado" (Pie)
 *                 "Consultas por dia da semana" (Bar)
 *   • Removidos:  restantes gráficos Recharts
 *   • Novos:      "Consultas por hora do dia" (Bar)
 *                 "Antecedência das marcações (dias)" (Bar)
 *   • Tech:       Migrado para Chart.js via react-chartjs-2
 *   • Comentários em pt-PT; funções puras; componentes curtos.
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
  Button,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import { WhiteCard } from "@bibliotecario/ui-web";
import { getMyLibrary, type LibraryLite } from "@/services/admin/admin";
import {
  getAdminMetricsBreakdown,
  type AdminMetricsBreakdown,
} from "@/services/admin/adminMetrics";

// ---------- Chart.js (registo de elementos) ----------
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as CJTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CJTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

/* ========================================================================== */
/*                                  HELPERS                                   */
/* ========================================================================== */
// Datas (✅ puras e pequenas)
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
function addWeeks(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n * 7);
  return x;
}
function fmtYMD(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}

const WEEKDAY_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CARD_SX = {
  flex: 1,
  p: { xs: 2, md: 2.75 },
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "flex-start",
  textAlign: "center", // centra títulos/descrições
  minHeight: { xs: 380, md: 460 }, // altura uniforme dos tiles
} as const;

const CHART_BOX_SX = {
  mt: 2,
  flex: 1,
  minHeight: 320, // espaço mínimo para o canvas
  display: "flex",
  alignItems: "center", // centra verticalmente
  justifyContent: "center", // centra horizontalmente
  width: "100%",
} as const;

/* ========================================================================== */
/*                                   PAGE                                     */
/* ========================================================================== */
export default function AdminMetrics() {
  const theme = useTheme();

  // -------- Biblioteca do admin --------
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  // -------- Janela temporal (por defeito: 12 semanas) --------
  const [fromYmd, setFromYmd] = useState(
    fmtYMD(addWeeks(startOfDay(new Date()), -12))
  );
  const [toYmd, setToYmd] = useState(fmtYMD(new Date()));

  // -------- Dados de breakdown (endpoint novo) --------
  const [metrics, setMetrics] = useState<AdminMetricsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Paleta para séries (usada uma vez; Chart.js gere opacidade)
  const C = {
    PENDING: theme.palette.warning.light,
    CONFIRMED: theme.palette.success.main,
    COMPLETED: theme.palette.success.dark,
    DECLINED: theme.palette.error.main,
    CANCELLED: theme.palette.grey[400],
    INFO: theme.palette.info.main,
    PRIMARY: theme.palette.primary.main,
    SECONDARY: theme.palette.secondary.main,
  };

  // Carregar biblioteca do admin
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

  // (Re)carregar métricas da API (endpoint novo)
  async function reload() {
    if (!myLib?.id) return;
    try {
      setLoading(true);
      setErr(null);
      const fromISO = new Date(fromYmd);
      fromISO.setHours(0, 0, 0, 0);
      const toISO = new Date(toYmd);
      toISO.setHours(23, 59, 59, 999);
      const data = await getAdminMetricsBreakdown(
        myLib.id,
        fromISO.toISOString(),
        toISO.toISOString()
      );
      setMetrics(data);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar métricas");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (myLib?.id) void reload();
  }, [fromYmd, toYmd, myLib?.id]);

  // ---------- Derivações simples para os gráficos (✅ puras via useMemo) ----------
  const statusPie = useMemo(() => {
    const s = metrics?.status || {};
    const labels = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "DECLINED",
      "CANCELLED",
    ];
    const values = labels.map((k) => s[k] || 0);
    const colors = [
      C.PENDING,
      C.CONFIRMED,
      C.COMPLETED,
      C.DECLINED,
      C.CANCELLED,
    ];
    return {
      labels: ["Pendente", "Confirmada", "Concluída", "Recusada", "Cancelada"],
      datasets: [{ data: values, backgroundColor: colors }],
    };
  }, [metrics]);

  const weekdayBar = useMemo(() => {
    const map = new Map((metrics?.weekday || []).map((w) => [w.dow, w.count]));
    const counts = Array.from({ length: 7 }, (_, i) => map.get(i) || 0);
    return {
      labels: WEEKDAY_PT,
      datasets: [
        { label: "Consultas", data: counts, backgroundColor: C.PRIMARY },
      ],
    };
  }, [metrics]);

  const hourlyBar = useMemo(() => {
    const map = new Map((metrics?.hourly || []).map((h) => [h.hour, h.count]));
    const labels = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`
    );
    const counts = Array.from({ length: 24 }, (_, i) => map.get(i) || 0);
    return {
      labels,
      datasets: [
        { label: "Consultas", data: counts, backgroundColor: C.SECONDARY },
      ],
    };
  }, [metrics]);

  const leadHistBar = useMemo(() => {
    const order = ["0–1", "2–3", "4–7", "8–14", "15+"];
    const map = new Map(
      (metrics?.leadHistogram || []).map((b) => [b.bucket, b.count])
    );
    const values = order.map((k) => map.get(k) || 0);
    return {
      labels: order,
      datasets: [{ label: "Consultas", data: values, backgroundColor: C.INFO }],
    };
  }, [metrics]);

  // Atalhos de intervalo
  const quickSet = (weeks: number) => {
    const to = new Date();
    const from = addWeeks(startOfDay(to), -weeks);
    setFromYmd(fmtYMD(from));
    setToYmd(fmtYMD(to));
  };

  // ---------- Chart.js opções comuns (legendas, tooltips, eixos) ----------
  const optionsBar = {
    responsive: true,
    maintainAspectRatio: false, // <—
    plugins: {
      legend: { display: true, position: "top" as const },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  const optionsPie = {
    responsive: true,
    maintainAspectRatio: false, // <—
    plugins: {
      legend: { position: "right" as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = ctx.raw as number;
            const total =
              ctx.dataset.data.reduce((s: number, x: number) => s + x, 0) || 1;
            const pct = Math.round((value / total) * 1000) / 10;
            return ` ${ctx.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  /* --------------------------------- RENDER --------------------------------- */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header */}
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

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          {/* Datas */}
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

          {/* Atalhos */}
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

          {/* Biblioteca */}
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
          {/* === Gráfico 1 — Distribuição global por estado (MANTIDO) === */}
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                {" "}
                {/* ✅ ALTERADO */}
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Distribuição global por estado
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Mostra a proporção de consultas por estado na janela
                  selecionada…
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  {" "}
                  {/* ✅ NOVO */}
                  <Pie
                    data={statusPie}
                    options={optionsPie as any}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </WhiteCard>
            </Grid>

            {/* === Gráfico 2 — Consultas por dia da semana (MANTIDO) === */}
            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Consultas por dia da semana
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Volume de marcações por dia (Dom..Sáb). Serve para identificar
                  os dias “fortes” e abrir slots preferenciais nesses dias.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <Bar
                    data={weekdayBar}
                    options={optionsBar as any}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>

          {/* === NOVO — Consultas por hora do dia === */}
          <Grid container spacing={2} alignItems="stretch" sx={{ mt: 1 }}>
            <Grid item xs={12} md={7} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Consultas por hora do dia
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Distribuição das consultas pela hora de início (00–23h). Ajuda
                  a definir janelas de atendimento mais requisitadas.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <Bar
                    data={hourlyBar}
                    options={optionsBar as any}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </WhiteCard>
            </Grid>

            {/* === NOVO — Antecedência das marcações (dias) === */}
            <Grid item xs={12} md={5} sx={{ display: "flex" }}>
              <WhiteCard sx={CARD_SX}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 0.25 }}>
                  Antecedência das marcações (dias)
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Histograma de dias entre pedido e realização: 0–1, 2–3, 4–7,
                  8–14, 15+. Útil para calibrar prazos de resposta e campanhas
                  de lembrete.
                </Typography>
                <Box sx={CHART_BOX_SX}>
                  <Bar
                    data={leadHistBar}
                    options={optionsBar as any}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </WhiteCard>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}

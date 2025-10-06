/**
 * =============================================================================
 *  Admin · Gestão de Slots (consultas)
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Slots.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Reforços pedidos:
 *   • Comentários detalhados (pt-PT) por todo o código.
 *   • Identificação explícita de funções **puras** (determinísticas, sem efeitos).
 *   • Manter funções curtas (≈≤30 linhas) e focadas.
 *   • Sem alterações funcionais inesperadas.
 * =============================================================================
 */

import { useEffect, useMemo, useState, type JSX } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  InputAdornment,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import PersonOutline from "@mui/icons-material/PersonOutline";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import ReportGmailerrorredRounded from "@mui/icons-material/ReportGmailerrorredRounded";
import LocalLibraryRounded from "@mui/icons-material/LocalLibraryRounded";

import { Info } from "lucide-react";
import { Paginator, WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  createGlobalBlock,
  deleteGlobalBlock,
  listGlobalBlocks,
  listLibrarySlots,
  setSlotStatus,
  listLibraryLibrarians,
  getMyLibrary,
  type BlockSlot,
  type SlotLite,
  type LibrarianLite,
  type LibraryLite,
} from "@/services/admin/admin";

/* ============================================================================
 *                                 HELPERS PUROS
 * ========================================================================== */

/** Devolve AAAA-MM-DD para um Date. ✅ **PURO** */
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
/** Devolve HH:MM (24h) para um Date. ✅ **PURO** */
function hhmm(d: Date) {
  return d.toTimeString().slice(0, 5);
}
/** ISO do início do dia (00:00:00.000). ✅ **PURO** */
function startOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
/** ISO do fim do dia (23:59:59.999). ✅ **PURO** */
function endOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

/* ============================================================================
 *                              CONSTANTES DE ESTADO
 * ========================================================================== */

type SlotStatus = "OPEN" | "BOOKED" | "BLOCKED";

/** Etiquetas por estado (UI). ✅ **PURO** */
const STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: "Disponível",
  BOOKED: "Reservado",
  BLOCKED: "Bloqueado",
};
/** Cores dos chips por estado. ✅ **PURO** */
const STATUS_COLOR: Record<
  SlotStatus,
  "default" | "success" | "error" | "warning"
> = {
  OPEN: "success",
  BOOKED: "warning",
  BLOCKED: "error",
};
/** Ícones por estado. ✅ **PURO** */
const STATUS_ICON: Record<SlotStatus, JSX.Element> = {
  OPEN: <CheckCircleRounded />,
  BOOKED: <EventAvailableRounded />,
  BLOCKED: <BlockRounded />,
};

/** Opções de paginação para a lista de slots. ✅ **PURO** */
const PAGE_SIZE_OPTIONS = [8, 10, 12, 16, 20, 24, 32, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/* ============================================================================
 *                                   COMPONENTE
 * ========================================================================== */

export default function AdminSlots() {
  const { user } = useUserSession() as any;

  // ---------- Biblioteca do admin ----------
  const [library, setLibrary] = useState<LibraryLite | null>(null);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  /**
   * Carrega a biblioteca do utilizador admin.
   * Mantido pequeno (≤30 linhas) e com gestão de erros simples.
   */
  useEffect(() => {
    (async () => {
      try {
        setLibsLoading(true);
        const lib = await getMyLibrary();
        if (!lib) {
          setLibrary(null);
          setLibsErr("Não estás associado a nenhuma biblioteca.");
        } else {
          setLibrary(lib);
          setLibsErr(null);
        }
      } catch (e: any) {
        setLibrary(null);
        setLibsErr(e?.message || "Falha a carregar a tua biblioteca.");
      } finally {
        setLibsLoading(false);
      }
    })();
  }, [user?.id]);

  const libraryId = library?.id ?? null;

  // ---------- Filtros de SLOTS ----------
  const [fromY, setFromY] = useState(ymd(new Date())); // data inicial (YYYY-MM-DD)
  const [toY, setToY] = useState(ymd(new Date(Date.now() + 30 * 86400000))); // +30 dias
  const [statuses, setStatuses] = useState<SlotStatus[]>([
    "OPEN",
    "BOOKED",
    "BLOCKED",
  ]);
  const [librarianId, setLibrarianId] = useState<number | null>(null);

  // ---------- Bibliotecários ----------
  const [librarians, setLibrarians] = useState<LibrarianLite[]>([]);
  /**
   * Carrega bibliotecários da biblioteca (ou limpa quando não há biblioteca).
   * Também normaliza o `librarianId` selecionado se desaparecer da lista.
   */
  useEffect(() => {
    (async () => {
      if (!libraryId) {
        setLibrarians([]);
        setLibrarianId(null);
        return;
      }
      try {
        const list = await listLibraryLibrarians(libraryId);
        setLibrarians(list);
        setLibrarianId((prev) =>
        // mantém seleção se ainda existir
          prev && list.some((l) => l.id === prev) ? prev : null
        );
      } catch {
        setLibrarians([]);
        setLibrarianId(null);
      }
    })();
  }, [libraryId]);

  // ---------- Dados de SLOTS ----------
  const [slots, setSlots] = useState<SlotLite[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);

  /**
   * Recarrega os slots aplicando filtros atuais (datas/estados/bibliotecário).
   * Importa também bibliotecários com base nos próprios slots se necessário.
   */
  async function reloadSlots() {
    if (!libraryId) return;
    try {
      setSlotsLoading(true);
      setSlotsErr(null);
      const res = await listLibrarySlots(libraryId, {
        from: startOfDayISO(new Date(fromY)),
        to: endOfDayISO(new Date(toY)),
        statuses: statuses.length ? statuses : undefined,
        librarianId: librarianId || undefined,
      });
      setSlots(res);

      // Fallback: constrói lista de bibliotecários a partir dos slots carregados
      if (librarians.length === 0) {
        const map = new Map<number, LibrarianLite>();
        for (const s of res) {
          const l = s.librarian;
          if (l?.id)
            map.set(l.id, {
              id: l.id,
              fullName: l.fullName,
              email: l.email ?? "",
            });
        }
        setLibrarians(
          Array.from(map.values()).sort((a, b) =>
            a.fullName.localeCompare(b.fullName, "pt")
          )
        );
      }
    } catch (e: any) {
      setSlotsErr(e?.message || "Falha a carregar slots.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  // Recarrega ao variar filtros/chaves principais (join converge dependências)
  useEffect(() => {
    void reloadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId, fromY, toY, librarianId, statuses.join(",")]);

  // ---------- Paginação de slots ----------
  const [pageSizeSlots, setPageSizeSlots] = useState<PageSize>(10);
  const [pageSlots, setPageSlots] = useState(1);

  // Reset página quando filtros mudam
  useEffect(() => {
    setPageSlots(1);
  }, [libraryId, fromY, toY, librarianId, statuses.join(","), pageSizeSlots]);

  const pageCountSlots = Math.max(1, Math.ceil(slots.length / pageSizeSlots));
  /** Slice memoizado da página corrente. ✅ **PURO (via inputs)** */
  const slotsPage = useMemo(() => {
    const from = (pageSlots - 1) * pageSizeSlots;
    return slots.slice(from, from + pageSizeSlots);
  }, [slots, pageSlots, pageSizeSlots]);

  // ---------- Bloqueios globais ----------
  const [items, setItems] = useState<BlockSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Dialog novo bloqueio (estado local controlado)
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState(ymd(new Date()));
  const [fromTime, setFromTime] = useState(hhmm(new Date()));
  const [toDate, setToDate] = useState(ymd(new Date()));
  const [toTime, setToTime] = useState(hhmm(new Date()));
  const [reason, setReason] = useState("");

  /**
   * Recarrega bloqueios globais para a biblioteca atual.
   * Pequeno, com estados de loading/erro.
   */
  async function reloadBlocks() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const arr = await listGlobalBlocks(libraryId);
      setItems(arr);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (libraryId) void reloadBlocks();
  }, [libraryId]);

  /**
   * Cria um novo bloqueio global (toda a biblioteca indisponível).
   * Também força refresh aos slots para refletir a mudança.
   */
  async function createBlock() {
    if (!libraryId) return;
    try {
      const startAt = new Date(`${fromDate}T${fromTime}:00`).toISOString();
      const endAt = new Date(`${toDate}T${toTime}:00`).toISOString();
      await createGlobalBlock(libraryId, { startAt, endAt, reason: reason || undefined });
      setOpen(false);
      setReason("");
      await reloadBlocks();
      await reloadSlots();
    } catch (e: any) {
      alert(e?.message || "Falha a criar bloqueio.");
    }
  }

  /**
   * Remove um bloqueio global existente (confirmação simples).
   * Recarrega listas depois da operação.
   */
  async function del(id: number) {
    if (!libraryId) return;
    if (!confirm("Remover bloqueio?")) return;
    try {
      await deleteGlobalBlock(libraryId, id);
      await reloadBlocks();
      await reloadSlots();
    } catch (e: any) {
      alert(e?.message || "Falha ao remover.");
    }
  }

  // --- Ranges de bloqueio global (para cruzar com slots)
  /** Pré-processa os ranges [start,end] dos bloqueios (ms). ✅ **PURO (inputs)** */
  const globalRanges = useMemo(
    () =>
      items.map(
        (b) =>
          [new Date(b.startAt).getTime(), new Date(b.endAt).getTime()] as [
            number,
            number
          ]
      ),
    [items]
  );
  /** Verifica sobreposição slot <-> range global. ✅ **PURO** */
  const slotHitsGlobal = (startMs: number, endMs: number) =>
    globalRanges.some(([a, b]) => startMs < b && a < endMs);

  // ---------- Paginação bloqueios ----------
  const [pageBlocks, setPageBlocks] = useState(1);
  useEffect(() => {
    setPageBlocks(1);
  }, [libraryId]);
  const pageCountBlocks = Math.max(1, Math.ceil(items.length / 20));
  /** Página de bloqueios corrente. ✅ **PURO (via inputs)** */
  const itemsPage = useMemo(() => {
    const from = (pageBlocks - 1) * 20;
    return items.slice(from, from + 20);
  }, [items, pageBlocks]);

  /* ==========================================================================
   *                                     UI
   * ======================================================================== */

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Cabeçalho + biblioteca */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <AccessTimeRounded />
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Gestão de slots
          </Typography>
          {library && (
            <Chip
              size="small"
              icon={<LocalLibraryRounded />}
              label={library.name}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            />
          )}
        </Stack>
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              onClick={() => {
                void reloadSlots();
                void reloadBlocks();
              }}
              disabled={!libraryId || libsLoading}
            >
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {!!libsErr && (
        <Typography color="error" sx={{ mb: 2 }}>
          {libsErr}
        </Typography>
      )}

      {/* ----- SLOTS ----- */}
      <WhiteCard sx={{ mb: 3, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <TodayRounded fontSize="small" />
          <Typography variant="h6" fontWeight={900}>Slots de consultas</Typography>
        </Stack>

        {/* Filtros */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, opacity: 0.85 }}>
          <TuneRounded fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
        </Stack>

        {/* Linha de filtros */}
        <Grid container spacing={1.5} sx={{ mb: 1 }}>
          {/* Datas */}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="De"
                type="date"
                value={fromY}
                onChange={(e) => setFromY(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                size="small"
                label="Até"
                type="date"
                value={toY}
                onChange={(e) => setToY(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            </Stack>
          </Grid>

          {/* Bibliotecário */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={librarians}
              value={librarians.find((l) => l.id === librarianId) || null}
              onChange={(_, v) => setLibrarianId(v ? v.id : null)}
              getOptionLabel={(o) => o?.fullName ?? ""}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Bibliotecário (opcional)"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonOutline fontSize="small" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Estados + paginação por página */}
          <Grid item xs={12} md={4}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flex: 1, flexWrap: { xs: "wrap", md: "nowrap" } }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8, mr: 0.5, whiteSpace: "nowrap" }}>
                  Estados:
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={statuses}
                  onChange={(_, v) => setStatuses(v)}
                  aria-label="Estados"
                >
                  {(["OPEN", "BOOKED", "BLOCKED"] as SlotStatus[]).map((s) => (
                    <ToggleButton key={s} value={s}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {STATUS_ICON[s]}
                        <span>{STATUS_LABEL[s]}</span>
                      </Stack>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>

              <TextField
                select
                size="small"
                label="Slots/página"
                value={pageSizeSlots}
                onChange={(e) => setPageSizeSlots(Number(e.target.value) as PageSize)}
                sx={{ minWidth: 160, ml: { xs: 0, md: "auto" }, alignSelf: { xs: "flex-start", md: "center" } }}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Grid>
        </Grid>

        {/* Lista (paginada) */}
        {slotsErr && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }} color="error.main">
            <ReportGmailerrorredRounded fontSize="small" />
            <Typography color="error">{slotsErr}</Typography>
          </Stack>
        )}

        {slotsLoading ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
        ) : !libraryId ? (
          <Typography sx={{ opacity: 0.7 }}>{libsErr ?? "Sem biblioteca associada."}</Typography>
        ) : slots.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem slots no intervalo/critério.</Typography>
        ) : (
          <>
            <Stack spacing={1.25} divider={<Divider />}>
              {slotsPage.map((s) => {
                const a = new Date(s.startAt);
                const b = new Date(s.endAt);
                const aMs = a.getTime();
                const bMs = b.getTime();
                const hitsGlobal = slotHitsGlobal(aMs, bMs);

                // Regras de ação por estado atual
                const canBlock = s.status === "OPEN";
                const canUnblock = s.status === "BLOCKED" && !hitsGlobal;
                const disableReason =
                  s.status === "BOOKED" ? "Slot reservado — não pode ser bloqueado" : undefined;

                return (
                  <Stack key={s.id} direction="row" spacing={1.25} alignItems="center">
                    <Box flex={1} minWidth={0}>
                      {/* Linha de título + estado */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                        <Typography fontWeight={900} noWrap title={s.librarian?.fullName || ""}>
                          {s.librarian?.fullName || "—"}
                        </Typography>
                        <Chip
                          size="small"
                          icon={STATUS_ICON[s.status]}
                          color={STATUS_COLOR[s.status]}
                          variant="outlined"
                          label={STATUS_LABEL[s.status]}
                          sx={{ borderRadius: 2 }}
                        />
                      </Stack>

                      {/* Metadados do slot */}
                      <Stack direction="row" spacing={1} sx={{ mt: 0.25 }} useFlexGap flexWrap="wrap">
                        <Chip
                          size="small"
                          icon={<CalendarMonthRounded />}
                          label={a.toLocaleDateString("pt-PT")}
                          sx={{ borderRadius: 2 }}
                        />
                        <Chip
                          size="small"
                          icon={<AccessTimeRounded />}
                          label={`${a.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} — ${b.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}
                          sx={{ borderRadius: 2 }}
                          variant="outlined"
                        />
                        {s.consultationId && (
                          <Chip size="small" color="warning" label={`Consulta #${s.consultationId}`} sx={{ borderRadius: 2 }} />
                        )}
                        {hitsGlobal && (
                          <Chip size="small" color="error" label="Bloqueio global" sx={{ borderRadius: 2 }} />
                        )}
                      </Stack>
                    </Box>

                    {/* Ações (bloquear/desbloquear) com tooltip também quando disabled */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title={disableReason || "Bloquear"}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<LockRounded />}
                            disabled={!canBlock}
                            onClick={() =>
                              void setSlotStatus(libraryId!, s.id, "BLOCKED").then(reloadSlots)
                            }
                          >
                            Bloquear
                          </Button>
                        </span>
                      </Tooltip>

                      <Tooltip title={hitsGlobal ? "Coberto por Bloqueio global" : "Desbloquear"}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<LockOpenRounded />}
                            disabled={!canUnblock}
                            onClick={() =>
                              void setSlotStatus(libraryId!, s.id, "OPEN").then(reloadSlots)
                            }
                          >
                            Desbloquear
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>

            {/* Paginação (slots) */}
            <Paginator
              count={pageCountSlots}
              page={pageSlots}
              onChange={(_, p) => setPageSlots(p)}
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
            />
          </>
        )}
      </WhiteCard>

      {/* ----- BLOQUEIOS GLOBAIS ----- */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="h5" fontWeight={900}>Bloqueios globais</Typography>
          <Tooltip
            arrow
            placement="top"
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="body2" fontWeight={700}>O que é um bloqueio global?</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Janela de <b>indisponibilidade da biblioteca</b> (feriados, eventos internos,
                  manutenção). Aplica-se a <b>todos os bibliotecários</b>.
                </Typography>
              </Box>
            }
          >
            <Box sx={{ display: "inline-flex", color: "text.secondary", cursor: "help" }}>
              <Info size={18} />
            </Box>
          </Tooltip>
        </Stack>
        <Button variant="contained" onClick={() => setOpen(true)} disabled={!libraryId} startIcon={<BlockRounded />}>
          Novo bloqueio
        </Button>
      </Stack>

      {err && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }} color="error.main">
          <ReportGmailerrorredRounded fontSize="small" />
          <Typography color="error">{err}</Typography>
        </Stack>
      )}

      {/* Lista de bloqueios globais */}
      <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
        {loading ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem bloqueios ativos.</Typography>
        ) : (
          <>
            <Stack spacing={1.25} divider={<Divider />}>
              {itemsPage.map((b) => (
                <Stack key={b.id} direction="row" spacing={1.25} alignItems="center">
                  <Chip
                    size="small"
                    icon={<CalendarMonthRounded />}
                    label={`${new Date(b.startAt).toLocaleString("pt-PT")} — ${new Date(b.endAt).toLocaleString("pt-PT")}`}
                    sx={{ borderRadius: 2 }}
                  />
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    {b.reason || "—"}
                  </Typography>
                  <Box sx={{ ml: "auto" }}>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => void del(b.id)}
                      startIcon={<BlockRounded />}
                    >
                      Remover
                    </Button>
                  </Box>
                </Stack>
              ))}
            </Stack>

            {/* Paginação (bloqueios) */}
            <Paginator
              count={pageCountBlocks}
              page={pageBlocks}
              onChange={(_, p) => setPageBlocks(p)}
              siblingCount={1}
              boundaryCount={1}
            />
          </>
        )}
      </WhiteCard>

      {/* Dialog novo bloqueio */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo bloqueio</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              label="De (data)"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="De (hora)"
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              label="Até (data)"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Até (hora)"
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <TextField
            label="Motivo (opcional)"
            fullWidth
            sx={{ mt: 1 }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={createBlock} startIcon={<LockRounded />}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

/**
 * =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */

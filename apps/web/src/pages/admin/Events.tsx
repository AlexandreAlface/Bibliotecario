/**
 * =============================================================================
 *  Admin · Eventos culturais da biblioteca
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Events.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  O que foi reforçado “como combinado”:
 *   • Comentários por todo o ficheiro (pt-PT) para clarificar intenções.
 *   • Helpers puros (sem side-effects) para filtragem, paginação e formatação.
 *   • Funções curtas (≲ 30 linhas) e com nomes explícitos.
 *   • Pequenas proteções de UX (botões desativados, tooltips, estados).
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Drawer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import NotesRounded from "@mui/icons-material/NotesRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import LocalActivityOutlined from "@mui/icons-material/LocalActivityOutlined";
import RssFeedRounded from "@mui/icons-material/RssFeedRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";

import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  deleteEvent,
  listLibraryEvents,
  upsertEvent,
  type EventLite,
  getMyLibrary,
  type LibraryLite,
  listEventReservations,
  updateEventReservationStatus,
  deleteEventReservation,
  getEventReservationsSummary,
} from "@/services/admin/admin";

import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/pt";

/* ============================================================================
 *  Constantes & Tipos
 * ========================================================================== */

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "/api";

type ViewFilter = "upcoming" | "past" | "all";

/* ============================================================================
 *  Helpers PUROS (sem side-effects)
 *  — Mantêm as funções curtas e testáveis
 * ========================================================================== */

/** Formata um Date em string compatível com <input type="datetime-local">. */
function toDateTimeLocalString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Arredonda uma data para o próximo múltiplo de 30 minutos. */
function roundUpToNextHalfHour(d: Date): Date {
  const x = new Date(d);
  const min = x.getMinutes();
  const delta = 30 - (min % 30 || 30);
  x.setMinutes(min + delta, 0, 0);
  return x;
}

/** Extrai categorias únicas ordenadas alfabeticamente. */
function categoriesFromEvents(list: EventLite[]): string[] {
  const s = new Set<string>();
  for (const ev of list) {
    const c = (ev.category || "").trim();
    if (c) s.add(c);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/** Determina se um evento está a decorrer (ongoing) dado um timestamp atual. */
function isOngoing(ev: EventLite, nowMs: number): boolean {
  if (!ev.endDate) return false;
  const start = new Date(ev.startDate).getTime();
  const end = new Date(ev.endDate).getTime();
  return start <= nowMs && end >= nowMs;
}

/** Aplica filtros ao conjunto de eventos (puro). */
function filterEvents(
  events: EventLite[],
  q: string,
  vf: ViewFilter,
  fromDate: string,
  toDate: string,
  catSel: string,
  nowMs: number
): EventLite[] {
  const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
  const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
  const qNorm = q.trim().toLowerCase();

  return events.filter((ev) => {
    // texto (título/local)
    const inQuery =
      !qNorm ||
      ev.title.toLowerCase().includes(qNorm) ||
      (ev.location ?? "").toLowerCase().includes(qNorm);
    if (!inQuery) return false;

    // categoria
    if (catSel && (ev.category || "") !== catSel) return false;

    // intervalo temporal
    const start = new Date(ev.startDate).getTime();
    const end = ev.endDate ? new Date(ev.endDate).getTime() : start;
    if (fromMs && end < fromMs) return false;
    if (toMs && start > toMs) return false;

    // período
    const ongoing = isOngoing(ev, nowMs);
    if (vf === "upcoming") return ongoing || start >= nowMs;
    if (vf === "past") return end < nowMs && !ongoing;
    return true;
  });
}

/** Pagina um array (1-based). */
function paginate<T>(arr: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}

/* ============================================================================
 *  UI: componentes pequenos e focados
 * ========================================================================== */

/** Chip de estado de inscrição. */
function StatusChip({ s }: { s: "PENDING" | "CONFIRMED" }) {
  return (
    <Chip
      size="small"
      label={s === "CONFIRMED" ? "Confirmada" : "Pendente"}
      color={s === "CONFIRMED" ? "success" : "default"}
      variant={s === "CONFIRMED" ? "filled" : "outlined"}
      sx={{ borderRadius: 2 }}
    />
  );
}

/** Mini-resumo de capacidade/contagens de um evento (lazy). */
function EventSummary({ eventId }: { eventId?: number }) {
  const [sum, setSum] = useState<{
    capacity: number | null;
    confirmed: number;
    pending: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEventReservationsSummary(eventId)
      .then(setSum)
      .catch(() => setSum(null));
  }, [eventId]);

  if (!sum) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
      <Chip
        icon={<CheckCircleOutlineIcon />}
        label={`Confirmadas: ${sum.confirmed}`}
        color="success"
        sx={{ borderRadius: 2 }}
      />
      <Chip
        icon={<HighlightOffIcon />}
        label={`Pendentes: ${sum.pending}`}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      />
      <Chip
        icon={<PeopleOutlineIcon />}
        label={`Total: ${sum.total}`}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      />
      {sum.capacity != null && (
        <Chip
          icon={<LocalActivityOutlined />}
          label={`Capacidade: ${sum.capacity}`}
          color="primary"
          sx={{ borderRadius: 2 }}
        />
      )}
    </Stack>
  );
}

/**
 * Tabela de inscrições de um evento.
 * Mantém as ações de confirmar/pendente/remover e uma pesquisa simples.
 */
function ReservationsTable({ eventId }: { eventId?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "PENDING" | "CONFIRMED">("");

  // carrega inscrições com os filtros locais
  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await listEventReservations(eventId, {
        q,
        status,
        limit: 200,
      });
      setRows(res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventId]); // recarrega ao abrir outro evento

  return (
    <Stack spacing={1.25}>
      {/* Filtros da lista de inscritos */}
      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          label="Pesquisar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          sx={{ width: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="PENDING">Pendentes</MenuItem>
          <MenuItem value="CONFIRMED">Confirmadas</MenuItem>
        </TextField>
        <Tooltip title="Atualizar lista">
          <span>
            <Button onClick={load} disabled={loading}>
              Atualizar
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {/* Tabela de inscritos */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Família</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Inscrito em</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.familyName}</TableCell>
              <TableCell>{r.familyEmail}</TableCell>
              <TableCell>{r.familyPhone}</TableCell>
              <TableCell>
                {new Date(r.bookedAt).toLocaleString("pt-PT")}
              </TableCell>
              <TableCell>
                <StatusChip s={r.status} />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {/* Confirmar */}
                  <Tooltip title="Confirmar">
                    <span>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            await updateEventReservationStatus(
                              eventId!,
                              r.id,
                              "CONFIRMED"
                            );
                            await load();
                          } catch (e: any) {
                            alert(e?.message || "Falha ao confirmar.");
                          }
                        }}
                      >
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* Marcar pendente */}
                  <Tooltip title="Marcar como pendente">
                    <span>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            await updateEventReservationStatus(
                              eventId!,
                              r.id,
                              "PENDING"
                            );
                            await load();
                          } catch (e: any) {
                            alert(e?.message || "Falha ao alterar estado.");
                          }
                        }}
                      >
                        <HighlightOffIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* Remover */}
                  <Tooltip title="Remover inscrição">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          try {
                            await deleteEventReservation(eventId!, r.id);
                            await load();
                          } catch (e: any) {
                            alert(e?.message || "Falha ao remover.");
                          }
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>Sem inscrições.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}

/* ============================= PÁGINA ============================= */

export default function AdminEvents() {
  const { user } = useUserSession() as any;

  // Estado: biblioteca do admin
  const [library, setLibrary] = useState<LibraryLite | null>(null);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  // Carrega a biblioteca associada ao utilizador admin
  useEffect(() => {
    (async () => {
      try {
        setLibsLoading(true);
        const lib = await getMyLibrary();
        setLibrary(lib);
        if (!lib) setLibsErr("Não estás associado a nenhuma biblioteca.");
      } catch (e: any) {
        setLibrary(null);
        setLibsErr(e?.message || "Falha a carregar a tua biblioteca.");
      } finally {
        setLibsLoading(false);
      }
    })();
  }, [user?.id]);

  const libraryId = library?.id ?? null;

  // Dados de eventos + estados de controlo
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filtros
  const [q, setQ] = useState("");
  const [vf, setVf] = useState<ViewFilter>("upcoming");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [catSel, setCatSel] = useState<string>("");

  // Paginação
  const [page, setPage] = useState(1);
  const perPage = 8;

  // Categorias únicas (derivadas da lista carregada)
  const categories = useMemo(() => categoriesFromEvents(events), [events]);

  // Form “Adicionar evento (manual)”
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState<string>("");
  const [evEnd, setEvEnd] = useState<string>("");
  const [evLoc, setEvLoc] = useState("");
  const [evDesc, setEvDesc] = useState("");

  /** Recarrega todos os eventos da biblioteca atual. */
  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const list = await listLibraryEvents(libraryId);
      // Ordena por data de início ascendente
      setEvents(
        [...list].sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
      );
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar.");
    } finally {
      setLoading(false);
    }
  }

  // Carrega ao selecionar biblioteca
  useEffect(() => {
    if (libraryId) void reload();
  }, [libraryId]);

  // Volta à página 1 quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [q, vf, fromDate, toDate, catSel, events.length]);

  /** Cria evento manualmente (usa nome da biblioteca como categoria por defeito). */
  async function addEvent() {
    if (!libraryId || !evTitle || !evStart) return;
    try {
      await upsertEvent(libraryId, {
        title: evTitle,
        startDate: evStart,
        endDate: evEnd || undefined,
        location: evLoc || undefined,
        description: evDesc || undefined,
        category: library?.name?.trim() || undefined,
      } as any);
      // limpa form e recarrega
      setEvTitle("");
      setEvStart("");
      setEvEnd("");
      setEvLoc("");
      setEvDesc("");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Falha ao criar evento.");
    }
  }

  // Aplica filtros (puro) e calcula a página corrente
  const nowMs = Date.now();
  const filtered = useMemo(
    () => filterEvents(events, q, vf, fromDate, toDate, catSel, nowMs),
    [events, q, vf, fromDate, toDate, catSel, nowMs]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSlice = useMemo(
    () => paginate(filtered, page, perPage),
    [filtered, page, perPage]
  );

  /** Predefine o “Início” no form para o próximo bloco de 30m. */
  function ensureStartPreset() {
    if (evStart) return;
    setEvStart(toDateTimeLocalString(roundUpToNextHalfHour(new Date())));
  }

  // Drawer de inscritos
  const [drawer, setDrawer] = useState<{
    open: boolean;
    event: EventLite | null;
  }>({ open: false, event: null });

  /* ------------------------------------------------------------------------ */

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header simples */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ mb: 2, gap: 1.25, flexWrap: "wrap" }}
      >
        <CalendarMonthRounded />
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Eventos culturais {library ? `— ${library.name}` : ""}
        </Typography>
        {library && (
          <Chip
            size="small"
            icon={<CategoryRounded />}
            label={library.name}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          />
        )}
      </Stack>

      {/* Alertas de contexto */}
      {!!libsErr && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {libsErr}
        </Alert>
      )}
      {!libsErr && !library && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {libsLoading
            ? "A carregar biblioteca…"
            : "Não estás associado a nenhuma biblioteca. Pede a um administrador para te atribuir."}
        </Alert>
      )}
      {!!err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Lista + filtros */}
        <Grid item xs={12} md={7}>
          <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={1.5}>
              {/* Filtros principais */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                flexWrap="wrap"
                alignItems="center"
              >
                <ToggleButtonGroup
                  size="small"
                  value={vf}
                  exclusive
                  onChange={(_, v) => v && setVf(v)}
                  aria-label="Filtro de período"
                  sx={{ mr: { sm: 0.5 } }}
                >
                  <ToggleButton value="upcoming">Próximos</ToggleButton>
                  <ToggleButton value="past">Passados</ToggleButton>
                  <ToggleButton value="all">Todos</ToggleButton>
                </ToggleButtonGroup>

                <TextField
                  size="small"
                  placeholder="Procurar por título ou local…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  sx={{
                    width: { xs: "100%", sm: 360 },
                    "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  size="small"
                  label="Desde"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="Até"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  size="small"
                  label="Categoria"
                  value={catSel}
                  onChange={(e) => setCatSel(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="text"
                  onClick={() => {
                    setQ("");
                    setFromDate("");
                    setToDate("");
                    setCatSel("");
                  }}
                >
                  Limpar filtros
                </Button>

                <Tooltip title="Recarregar">
                  <span>
                    <IconButton
                      onClick={() => void reload()}
                      disabled={loading || !libraryId}
                      aria-label="Recarregar"
                      sx={{ ml: "auto" }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Divider />

              {/* Lista paginada */}
              <Stack spacing={1.5} divider={<Divider />}>
                {pageSlice.map((ev) => {
                  const start = new Date(ev.startDate);
                  const end = ev.endDate ? new Date(ev.endDate) : null;
                  const source = (ev as any).source as "FEED" | undefined;
                  const canDelete = source !== "FEED";
                  const ongoing = isOngoing(ev, nowMs);

                  return (
                    <Stack
                      key={ev.id}
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                    >
                      <Box flex={1} minWidth={0}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 0.25, flexWrap: "wrap" }}
                        >
                          <Typography fontWeight={900} noWrap title={ev.title}>
                            {ev.title}
                          </Typography>
                          {source === "FEED" && (
                            <Chip
                              size="small"
                              icon={<RssFeedRounded />}
                              label="Feed"
                              sx={{ borderRadius: 2 }}
                            />
                          )}
                          {ongoing && (
                            <Chip
                              size="small"
                              color="success"
                              icon={<AccessTimeRounded />}
                              label="A decorrer"
                              sx={{ borderRadius: 2 }}
                            />
                          )}
                          {ev.category && (
                            <Chip
                              size="small"
                              variant="outlined"
                              icon={<CategoryRounded />}
                              label={ev.category}
                              sx={{ borderRadius: 2 }}
                            />
                          )}
                        </Stack>

                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {start.toLocaleString("pt-PT")}
                          {end ? ` — ${end.toLocaleString("pt-PT")}` : ""}
                          {ev.location ? (
                            <>
                              {" "}
                              •{" "}
                              <PlaceOutlined
                                fontSize="inherit"
                                sx={{ mr: 0.25, verticalAlign: "text-bottom" }}
                              />
                              {ev.location}
                            </>
                          ) : null}
                        </Typography>

                        {!!ev.description && (
                          <Typography
                            variant="body2"
                            title={ev.description}
                            sx={{
                              opacity: 0.9,
                              mt: 0.25,
                              whiteSpace: "normal",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            <NotesRounded
                              fontSize="inherit"
                              sx={{
                                mr: 0.5,
                                verticalAlign: "text-bottom",
                                opacity: 0.8,
                              }}
                            />
                            {ev.description}
                          </Typography>
                        )}
                      </Box>

                      {/* Inscritos */}
                      <Tooltip title="Gerir inscritos">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PeopleOutlineIcon />}
                          onClick={() => setDrawer({ open: true, event: ev })}
                        >
                          Inscritos
                        </Button>
                      </Tooltip>

                      {/* Remover (desativado para feed) */}
                      {canDelete ? (
                        <Tooltip title="Remover evento">
                          <IconButton
                            color="error"
                            onClick={async () => {
                              if (!libraryId) return;
                              const ok = confirm("Remover este evento?");
                              if (!ok) return;
                              await deleteEvent(libraryId, ev.id);
                              await reload();
                            }}
                            aria-label="Remover"
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Eventos de feed não podem ser removidos aqui">
                          <span>
                            <IconButton
                              color="error"
                              disabled
                              aria-label="Remover desativado"
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  );
                })}

                {pageSlice.length === 0 && (
                  <Typography sx={{ opacity: 0.7 }}>
                    {loading ? "A carregar…" : "Sem eventos a apresentar."}
                  </Typography>
                )}
              </Stack>

              {/* Paginação */}
              <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  shape="rounded"
                />
              </Stack>
            </Stack>
          </WhiteCard>
        </Grid>

        {/* Coluna: Adicionar manual */}
        <Grid item xs={12} md={5}>
          <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Adicionar evento (manual)
            </Typography>
            <Stack spacing={1.25} sx={{ mb: 1 }}>
              <TextField
                label="Título"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                onFocus={ensureStartPreset}
              />
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="pt"
              >
                <DateTimePicker
                  label="Início"
                  value={evStart ? dayjs(evStart) : null}
                  onChange={(v) =>
                    setEvStart(v ? v.format("YYYY-MM-DDTHH:mm") : "")
                  }
                  slotProps={{
                    textField: { fullWidth: true, onFocus: ensureStartPreset },
                  }}
                  minutesStep={5}
                />

                <DateTimePicker
                  label="Fim (opcional)"
                  value={evEnd ? dayjs(evEnd) : null}
                  onChange={(v) =>
                    setEvEnd(v ? v.format("YYYY-MM-DDTHH:mm") : "")
                  }
                  minDateTime={evStart ? dayjs(evStart) : undefined}
                  slotProps={{ textField: { fullWidth: true } }}
                  minutesStep={5}
                />
              </LocalizationProvider>
              <TextField
                label="Local (opcional)"
                value={evLoc}
                onChange={(e) => setEvLoc(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Descrição (opcional)"
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                multiline
                minRows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <NotesRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip
                title={
                  !libraryId
                    ? "Sem biblioteca"
                    : !evTitle || !evStart
                    ? "Preenche título e início"
                    : `Criar evento em ${library?.name}`
                }
              >
                <span>
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={addEvent}
                    disabled={!evTitle || !evStart || !libraryId}
                  >
                    Adicionar
                  </Button>
                </span>
              </Tooltip>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Categoria é definida por defeito com o <b>nome da biblioteca</b>
                .
              </Typography>
            </Stack>
          </WhiteCard>
        </Grid>
      </Grid>

      {/* Drawer lateral para gerir inscritos do evento selecionado */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={() => setDrawer({ open: false, event: null })}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 860 },
            top: { xs: 56, sm: 64 },
            height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
          },
        }}
        sx={{ zIndex: (t) => t.zIndex.appBar - 1 }}
        ModalProps={{
          BackdropProps: { sx: { zIndex: (t) => t.zIndex.appBar - 2 } },
        }}
      >
        <Stack spacing={1.25} sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={900}>
              Inscritos — {drawer.event?.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {drawer.event && (
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  href={`${API_BASE}/admin/events/${drawer.event.id}/reservations/export.csv`}
                >
                  Exportar CSV
                </Button>
              )}
              <IconButton
                onClick={() => setDrawer({ open: false, event: null })}
                aria-label="Fechar"
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>

          {drawer.event && <EventSummary eventId={drawer.event.id} />}
          {drawer.event && <ReservationsTable eventId={drawer.event.id} />}
        </Stack>
      </Drawer>
    </Container>
  );
}

/* =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */

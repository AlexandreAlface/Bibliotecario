import { useEffect, useMemo, useState } from "react";
import {
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

import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  deleteEvent,
  listLibraryEvents,
  upsertEvent,
  type EventLite,
} from "@/services/admin";
import { listMyLibraries } from "@/services/adminMetrics";
import {
  listEventReservations,
  updateEventReservationStatus,
  deleteEventReservation,
  createEventReservation,
  getEventReservationsSummary,
} from "@/services/admin";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "/api";

type ViewFilter = "upcoming" | "past" | "all";
type LibraryLite = { id: number; name: string };

/* util */
function toDateTimeLocalString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* --------------------- Chips de estado (reservas) --------------------- */
function StatusChip({ s }: { s: "PENDING" | "CONFIRMED" }) {
  return (
    <Chip
      size="small"
      label={s === "CONFIRMED" ? "Confirmada" : "Pendente"}
      color={s === "CONFIRMED" ? "success" : "default"}
      variant={s === "CONFIRMED" ? "filled" : "outlined"}
    />
  );
}

/* --------------------- Resumo de inscritos --------------------- */
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
    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
      <Chip label={`Confirmadas: ${sum.confirmed}`} color="success" />
      <Chip label={`Pendentes: ${sum.pending}`} variant="outlined" />
      <Chip label={`Total: ${sum.total}`} variant="outlined" />
      {sum.capacity != null && (
        <Chip label={`Capacidade: ${sum.capacity}`} color="primary" />
      )}
    </Stack>
  );
}

/* --------------------- Tabela + ações de inscritos --------------------- */
function ReservationsTable({ eventId }: { eventId?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "PENDING" | "CONFIRMED">("");
  const [familyIdInput, setFamilyIdInput] = useState("");

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
  }, [eventId]); // 1ª carga

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          label="Pesquisar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <TextField
          select
          size="small"
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="PENDING">Pendentes</MenuItem>
          <MenuItem value="CONFIRMED">Confirmadas</MenuItem>
        </TextField>
        <Button onClick={load} disabled={loading}>
          Atualizar
        </Button>
      </Stack>

      {/* adicionar manualmente */}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          label="ID da família"
          value={familyIdInput}
          onChange={(e) => setFamilyIdInput(e.target.value)}
          sx={{ width: 180 }}
        />
        <Button
          variant="outlined"
          onClick={async () => {
            if (!eventId || !Number(familyIdInput)) return;
            try {
              await createEventReservation(eventId, Number(familyIdInput));
              setFamilyIdInput("");
              await load();
            } catch (e: any) {
              alert(e?.message || "Falha ao adicionar inscrição.");
            }
          }}
        >
          Adicionar inscrição
        </Button>
      </Stack>

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
          {rows.length === 0 && !loading && (
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

  // bibliotecas
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLibsLoading(true);
        const libs = await listMyLibraries();
        setLibraries(libs || []);
      } catch (e: any) {
        setLibraries([]);
        setLibsErr(e?.message || "Falha a carregar bibliotecas.");
      } finally {
        setLibsLoading(false);
      }
    })();
  }, [user?.id]);

  const [libraryId, setLibraryId] = useState<number | null>(null);
  useEffect(() => {
    setLibraryId((prev) =>
      prev && libraries.some((l) => l.id === prev)
        ? prev
        : libraries[0]?.id ?? null
    );
  }, [libraries]);

  // eventos
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtros principais
  const [q, setQ] = useState("");
  const [vf, setVf] = useState<ViewFilter>("upcoming");

  // filtros extra
  const [src, setSrc] = useState<"" | "FEED" | "MANUAL">(""); // fonte
  const [fromDate, setFromDate] = useState<string>(""); // yyyy-MM-dd
  const [toDate, setToDate] = useState<string>(""); // yyyy-MM-dd
  const [catSel, setCatSel] = useState<string>(""); // categoria (select)

  // categorias únicas para o select
  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events) {
      const c = (ev.category || "").trim();
      if (c) s.add(c);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // form adicionar
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState<string>("");
  const [evEnd, setEvEnd] = useState<string>("");
  const [evLoc, setEvLoc] = useState("");
  const [evDesc, setEvDesc] = useState("");

  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const list = await listLibraryEvents(libraryId);
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
  useEffect(() => {
    if (libraryId) void reload();
  }, [libraryId]);

  async function addEvent() {
    if (!libraryId || !evTitle || !evStart) return;
    try {
      await upsertEvent(libraryId, {
        title: evTitle,
        startDate: evStart,
        endDate: evEnd || undefined,
        location: evLoc || undefined,
        description: evDesc || undefined,
      } as any);
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

  // filtro completo
  const filtered = useMemo(() => {
    const now = Date.now();
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return events.filter((ev) => {
      const source = (ev as any).source as "FEED" | "MANUAL" | undefined;

      // texto (título/local)
      const inQuery =
        !q ||
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        (ev.location ?? "").toLowerCase().includes(q.toLowerCase());
      if (!inQuery) return false;

      // categoria (select)
      if (catSel && (ev.category || "") !== catSel) return false;

      // fonte
      if (src && source !== src) return false;

      // período
      const start = new Date(ev.startDate).getTime();
      const end = ev.endDate ? new Date(ev.endDate).getTime() : start;
      if (fromMs && end < fromMs) return false;
      if (toMs && start > toMs) return false;

      // janela rápida
      const ongoing = ev.endDate ? start <= now && end >= now : false;
      if (vf === "upcoming") return ongoing || start >= now;
      if (vf === "past") return end < now && !ongoing;
      return true;
    });
  }, [events, q, vf, src, fromDate, toDate, catSel]);

  function ensureStartPreset() {
    if (evStart) return;
    const d = new Date();
    d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30 || 30)));
    d.setSeconds(0, 0);
    setEvStart(toDateTimeLocalString(d));
  }

  // Drawer de inscritos (por baixo do header)
  const [drawer, setDrawer] = useState<{
    open: boolean;
    event: EventLite | null;
  }>({ open: false, event: null });

  return (
    <Container
      maxWidth="xl"                                       // <- mais largo
      sx={{ py: 4, maxWidth: 1600 }}                      // <- até 1600px
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2, gap: 1 }}
      >
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Eventos culturais
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Biblioteca"
            value={libraryId ?? ""}
            onChange={(e) => setLibraryId(Number(e.target.value))}
            sx={{ minWidth: 220 }}
            disabled={libsLoading || libraries.length === 0}
          >
            {libraries.map((lib) => (
              <MenuItem key={lib.id} value={lib.id}>
                {lib.name}
              </MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            size="small"
            value={vf}
            exclusive
            onChange={(_, v) => v && setVf(v)}
            aria-label="Filtro de período"
          >
            <ToggleButton value="upcoming">Próximos</ToggleButton>
            <ToggleButton value="past">Passados</ToggleButton>
            <ToggleButton value="all">Todos</ToggleButton>
          </ToggleButtonGroup>

          <IconButton
            onClick={() => void reload()}
            disabled={loading || !libraryId}
            aria-label="Recarregar"
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {libsErr && (
        <Typography color="error" sx={{ mb: 1 }}>
          {libsErr}
        </Typography>
      )}
      {!libsErr && libraries.length === 0 && (
        <Typography color="warning.main" sx={{ mb: 2 }}>
          {libsLoading
            ? "A carregar bibliotecas…"
            : "Não estás associado a nenhuma biblioteca. Pede a um administrador para te atribuir."}
        </Typography>
      )}
      {err && (
        <Typography color="error" sx={{ mb: 1 }}>
          {err}
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* Lista + filtros detalhados */}
        <Grid item xs={12} md={7}>
          <WhiteCard>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                <TextField
                  fullWidth
                  placeholder="Procurar por título ou local…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
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
                  label="Fonte"
                  value={src}
                  onChange={(e) => setSrc(e.target.value as any)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="FEED">Feed</MenuItem>
                  <MenuItem value="MANUAL">Manual</MenuItem>
                </TextField>
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
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="text"
                  onClick={() => {
                    setQ("");
                    setSrc("");
                    setFromDate("");
                    setToDate("");
                    setCatSel("");
                  }}
                >
                  Limpar filtros
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1.25} divider={<Divider />}>
                {filtered.map((ev) => {
                  const start = new Date(ev.startDate);
                  const end = ev.endDate ? new Date(ev.endDate) : null;
                  const now = Date.now();
                  const ongoing =
                    end && start.getTime() <= now && end.getTime() >= now;
                  const source = (ev as any).source as
                    | "FEED"
                    | "MANUAL"
                    | undefined;
                  const canDelete = source ? source !== "FEED" : true;

                  return (
                    <Stack
                      key={ev.id}
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                    >
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={900} noWrap title={ev.title}>
                            {ev.title}
                          </Typography>
                          {source && (
                            <Chip
                              size="small"
                              label={source === "FEED" ? "Feed" : "Manual"}
                            />
                          )}
                          {ongoing && (
                            <Chip
                              size="small"
                              color="success"
                              label="A decorrer"
                            />
                          )}
                          {ev.category && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={ev.category}
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {start.toLocaleString("pt-PT")}
                          {end ? ` — ${end.toLocaleString("pt-PT")}` : ""}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </Typography>
                        {!!ev.description && (
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.8 }}
                            noWrap
                            title={ev.description}
                          >
                            {ev.description}
                          </Typography>
                        )}
                      </Box>

                      {/* Botão de inscritos */}
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

                      {canDelete ? (
                        <Tooltip title="Remover evento">
                          <IconButton
                            color="error"
                            onClick={() =>
                              libraryId &&
                              deleteEvent(libraryId, ev.id).then(reload)
                            }
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

                {filtered.length === 0 && (
                  <Typography sx={{ opacity: 0.7 }}>
                    {loading ? "A carregar…" : "Sem eventos a apresentar."}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </WhiteCard>
        </Grid>

        {/* Adicionar manual */}
        <Grid item xs={12} md={5}>
          <WhiteCard>
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
              <TextField
                label="Início"
                type="datetime-local"
                value={evStart}
                onChange={(e) => setEvStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
              <TextField
                label="Fim (opcional)"
                type="datetime-local"
                value={evEnd}
                onChange={(e) => setEvEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
              <TextField
                label="Local (opcional)"
                value={evLoc}
                onChange={(e) => setEvLoc(e.target.value)}
              />
              <TextField
                label="Descrição (opcional)"
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                multiline
                minRows={3}
              />
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={addEvent}
                disabled={!evTitle || !evStart || !libraryId}
              >
                Adicionar
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Categoria será definida por defeito com o nome da biblioteca
                selecionada.
              </Typography>
            </Stack>
          </WhiteCard>
        </Grid>
      </Grid>

      {/* Drawer de gestão de inscritos — por baixo do header */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={() => setDrawer({ open: false, event: null })}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 860 },
            // abaixo do header (56/64px) e altura ajustada
            top: { xs: 56, sm: 64 },
            height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
          },
        }}
        // manter Drawer abaixo do AppBar
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

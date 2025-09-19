import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Container, Divider, IconButton, InputAdornment,
  MenuItem, Stack, TextField, Tooltip, Typography, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { deleteEvent, listLibraryEvents, upsertEvent, type EventLite } from "@/services/admin";
import { listMyLibraries } from "@/services/adminMetrics";

type ViewFilter = "upcoming" | "past" | "all";
type LibraryLite = { id: number; name: string };

/** garante string no formato yyyy-MM-ddTHH:mm (sem segundos) */
function toDateTimeLocalString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEvents() {
  const { user } = useUserSession() as any;

  // bibliotecas (usa o serviço já funcional do dashboard)
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
    setLibraryId(prev => (prev && libraries.some(l => l.id === prev)) ? prev : (libraries[0]?.id ?? null));
  }, [libraries]);

  // eventos
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState("");
  const [vf, setVf] = useState<ViewFilter>("upcoming");

  // form adicionar (nativo)
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState<string>(""); // yyyy-MM-ddTHH:mm
  const [evEnd, setEvEnd] = useState<string>("");     // yyyy-MM-ddTHH:mm
  const [evLoc, setEvLoc] = useState("");
  const [evDesc, setEvDesc] = useState("");

  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const list = await listLibraryEvents(libraryId);
      setEvents(
        [...list].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      );
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (libraryId) void reload(); }, [libraryId]);

  async function addEvent() {
    if (!libraryId || !evTitle || !evStart) return;
    try {
      await upsertEvent(libraryId, {
        title: evTitle,
        startDate: evStart,                  // já vem em local-time (sem segundos)
        endDate: evEnd || undefined,
        location: evLoc || undefined,
        description: evDesc || undefined,    // categoria default é tratada no backend
      } as any);
      setEvTitle(""); setEvStart(""); setEvEnd(""); setEvLoc(""); setEvDesc("");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Falha ao criar evento.");
    }
  }

  // filtro: inclui “a decorrer”
  const filtered = useMemo(() => {
    const now = Date.now();
    return events.filter((ev) => {
      const inQuery =
        !q ||
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        (ev.location ?? "").toLowerCase().includes(q.toLowerCase());
      if (!inQuery) return false;

      const start = new Date(ev.startDate).getTime();
      const end = ev.endDate ? new Date(ev.endDate).getTime() : null;
      const ongoing = end != null && start <= now && end >= now;

      if (vf === "upcoming") return ongoing || start >= now;
      if (vf === "past")     return (end != null ? end < now : start < now) && !ongoing;
      return true;
    });
  }, [events, q, vf]);

  // qualidade de vida: pré-preenche “Início” com próxima meia-hora quando o título recebe focus pela 1ª vez
  function ensureStartPreset() {
    if (evStart) return;
    const d = new Date();
    d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30 || 30)));
    d.setSeconds(0, 0);
    setEvStart(toDateTimeLocalString(d));
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 1 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>Eventos culturais</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select size="small" label="Biblioteca"
            value={libraryId ?? ""}
            onChange={(e) => setLibraryId(Number(e.target.value))}
            sx={{ minWidth: 220 }}
            disabled={libsLoading || libraries.length === 0}
          >
            {libraries.map(lib => (
              <MenuItem key={lib.id} value={lib.id}>{lib.name}</MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            size="small" value={vf} exclusive onChange={(_, v) => v && setVf(v)}
            aria-label="Filtro de período"
          >
            <ToggleButton value="upcoming">Próximos</ToggleButton>
            <ToggleButton value="past">Passados</ToggleButton>
            <ToggleButton value="all">Todos</ToggleButton>
          </ToggleButtonGroup>

          <IconButton onClick={() => void reload()} disabled={loading || !libraryId} aria-label="Recarregar">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {libsErr && <Typography color="error" sx={{ mb: 1 }}>{libsErr}</Typography>}
      {!libsErr && libraries.length === 0 && (
        <Typography color="warning.main" sx={{ mb: 2 }}>
          {libsLoading ? "A carregar bibliotecas…" : "Não estás associado a nenhuma biblioteca. Pede a um administrador para te atribuir."}
        </Typography>
      )}
      {err && <Typography color="error" sx={{ mb: 1 }}>{err}</Typography>}

      <Grid container spacing={2}>
        {/* Lista */}
        <Grid item xs={12} md={7}>
          <WhiteCard>
            <Stack spacing={1.25}>
              <TextField
                placeholder="Procurar por título ou local…"
                value={q} onChange={e => setQ(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                  ),
                }}
              />
              <Divider />

              <Stack spacing={1.25} divider={<Divider />}>
                {filtered.map(ev => {
                  const start = new Date(ev.startDate);
                  const end = ev.endDate ? new Date(ev.endDate) : null;
                  const now = Date.now();
                  const ongoing = end && start.getTime() <= now && end.getTime() >= now;
                  const source = (ev as any).source as ("FEED" | "MANUAL" | undefined);
                  const canDelete = source ? source !== "FEED" : true;

                  return (
                    <Stack key={ev.id} direction="row" spacing={1.25} alignItems="center">
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={900} noWrap title={ev.title}>{ev.title}</Typography>
                          {source && <Chip size="small" label={source === "FEED" ? "Feed" : "Manual"} />}
                          {ongoing && <Chip size="small" color="success" label="A decorrer" />}
                          {ev.category && <Chip size="small" variant="outlined" label={ev.category} />}
                        </Stack>
                        <Typography variant="body2" sx={{ opacity: .8 }}>
                          {start.toLocaleString("pt-PT")}
                          {end ? ` — ${end.toLocaleString("pt-PT")}` : ""}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </Typography>
                        {!!ev.description && (
                          <Typography variant="body2" sx={{ opacity: .8 }} noWrap title={ev.description}>
                            {ev.description}
                          </Typography>
                        )}
                      </Box>

                      {canDelete ? (
                        <Tooltip title="Remover evento">
                          <IconButton
                            color="error"
                            onClick={() => libraryId && deleteEvent(libraryId, ev.id).then(reload)}
                            aria-label="Remover"
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Eventos de feed não podem ser removidos aqui">
                          <span>
                            <IconButton color="error" disabled aria-label="Remover desativado">
                              <DeleteOutlineIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  );
                })}

                {filtered.length === 0 && (
                  <Typography sx={{ opacity: .7 }}>
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
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Adicionar evento (manual)</Typography>
            <Stack spacing={1.25} sx={{ mb: 1 }}>
              <TextField
                label="Título"
                value={evTitle}
                onChange={e => setEvTitle(e.target.value)}
                onFocus={ensureStartPreset}
              />
              <TextField
                label="Início"
                type="datetime-local"
                value={evStart}
                onChange={e => setEvStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min
              />
              <TextField
                label="Fim (opcional)"
                type="datetime-local"
                value={evEnd}
                onChange={e => setEvEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
              <TextField label="Local (opcional)" value={evLoc} onChange={e => setEvLoc(e.target.value)} />
              <TextField
                label="Descrição (opcional)"
                value={evDesc}
                onChange={e => setEvDesc(e.target.value)}
                multiline minRows={3}
              />
              <Button startIcon={<AddIcon />} variant="contained" onClick={addEvent} disabled={!evTitle || !evStart || !libraryId}>
                Adicionar
              </Button>
              <Typography variant="body2" sx={{ opacity: .7 }}>
                Categoria será definida por defeito com o nome da biblioteca selecionada.
              </Typography>
            </Stack>
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

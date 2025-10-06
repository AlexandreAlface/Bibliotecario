/**
 * =============================================================================
 *  Admin · Backlog de Consultas
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Backlog.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  O que foi reforçado (como combinado):
 *   • Comentários por todo o código (pt-PT).
 *   • Pequenos “métodos puros” sem side-effects para facilitar teste/manutenção.
 *   • Funções/componentes mantidos curtos (≲ 30 linhas) sempre que possível.
 *   • Mantida a estrutura e o estilho MUI + @bibliotecario/ui-web.
 * =============================================================================
 */

import { useEffect, useMemo, useState, type JSX } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  MenuItem,
  Pagination,
  InputAdornment,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import PersonOutline from "@mui/icons-material/PersonOutline";
import FamilyRestroomRounded from "@mui/icons-material/FamilyRestroomRounded";
import LocalLibraryRounded from "@mui/icons-material/LocalLibraryRounded";
import HourglassEmptyRounded from "@mui/icons-material/HourglassEmptyRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";

import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listLibraryConsultations,
  getMyLibrary,
  type LibraryLite,
  type ConsultationLite,
} from "@/services/admin/admin";

/* ============================================================================
 *  Tipos + Constantes (PURO)
 * ========================================================================== */

type Status = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

const ALL_STATUSES: Status[] = [
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
];

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
};

const STATUS_COLOR: Record<
  Status,
  "default" | "warning" | "success" | "error" | "info"
> = {
  PENDING: "warning",
  CONFIRMED: "success",
  DECLINED: "error",
  CANCELLED: "default",
  COMPLETED: "info",
};

const STATUS_ICON: Record<Status, JSX.Element> = {
  PENDING: <HourglassEmptyRounded />,
  CONFIRMED: <CheckCircleRounded />,
  DECLINED: <CancelRounded />,
  CANCELLED: <BlockRounded />,
  COMPLETED: <TaskAltRounded />,
};

/* ============================================================================
 *  Helpers PUROS (sem side-effects)
 * ========================================================================== */

/** Normaliza string para pesquisa textual (lowercase + trim). */
function norm(str: string): string {
  return str.trim().toLowerCase();
}

/** Devolve true se o termo “q” existir no “haystack”. */
function matches(haystack: string, q: string): boolean {
  return !q || haystack.toLowerCase().includes(q);
}

/** Fatia segura de resultados paginados (1-based page). */
function slicePage<T>(items: T[], page: number, perPage: number): T[] {
  const start = Math.max(0, (page - 1) * perPage);
  const end = Math.min(items.length, start + perPage);
  return items.slice(start, end);
}

/** Formata HH:MM range quando temos a e b (Date). */
function fmtTimeRange(a?: Date | null, b?: Date | null): string {
  if (!a) return "—";
  const from = a.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (!b) return from;
  const to = b.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${from} — ${to}`;
}

/* ============================================================================
 *  UI Atoms
 * ========================================================================== */

/** Chip de estado (com ícone/cor/label) — componente pequeno (≤30 linhas). */
function StatusChipUI({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      icon={STATUS_ICON[status]}
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
      variant="outlined"
      sx={{ borderRadius: 2 }}
    />
  );
}

/* ============================================================================
 *  Página: AdminBacklogConsultas
 * ========================================================================== */

export default function AdminBacklogConsultas() {
  const { user } = useUserSession() as any;

  // ---------- Biblioteca do admin (quem está autenticado) ----------
  const [library, setLibrary] = useState<LibraryLite | null>(null);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  useEffect(() => {
    // Carrega a biblioteca associada ao utilizador (admin)
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

  // ---------- Filtros (client-side) ----------
  const [statuses, setStatuses] = useState<Status[]>(["PENDING", "CONFIRMED"]);
  const [librarianId, setLibrarianId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  // ---------- Dados ----------
  const [rowsAll, setRowsAll] = useState<ConsultationLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Recarrega consultas da biblioteca (≤30 linhas). */
  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const res = await listLibraryConsultations(libraryId);
      setRowsAll(res);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar consultas.");
      setRowsAll([]);
    } finally {
      setLoading(false);
    }
  }

  // Primeira carga/sempre que a biblioteca muda
  useEffect(() => {
    if (libraryId) void reload();
  }, [libraryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Bibliotecários derivados a partir dos resultados ----------
  const librarians = useMemo(() => {
    const map = new Map<number, { id: number; fullName: string }>();
    for (const r of rowsAll) {
      const l = r.librarian;
      if (l?.id && !map.has(l.id)) map.set(l.id, { id: l.id, fullName: l.fullName });
    }
    // se o bibliotecário filtrado desaparecer, limpa seleção
    if (librarianId && !map.has(librarianId)) setLibrarianId(null);
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsAll]);

  // ---------- Aplicação dos filtros (client-side) ----------
  const filtered = useMemo(() => {
    const qNorm = norm(q);
    const hasStatus = statuses.length > 0;
    return rowsAll.filter((c) => {
      if (hasStatus && !statuses.includes(c.status as Status)) return false;
      if (librarianId && c.librarian?.id !== librarianId) return false;

      if (qNorm) {
        const hay =
          (c.child?.name || "") +
          " " +
          (c.family?.fullName || "") +
          " " +
          (c.librarian?.fullName || "");
        if (!matches(hay, qNorm)) return false;
      }
      return true;
    });
  }, [rowsAll, statuses, librarianId, q]);

  // ---------- Contagens por estado (dos resultados filtrados) ----------
  const countsByStatus = useMemo(() => {
    const counters: Record<Status, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      DECLINED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    for (const c of filtered) counters[c.status as Status] += 1;
    return counters;
  }, [filtered]);

  // ---------- Paginação (client-side) ----------
  const [page, setPage] = useState(1); // 1-based
  const [perPage, setPerPage] = useState(20);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  // Ajusta página atual quando muda o universo de resultados
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filtered.length, perPage, totalPages]);

  const pageRows = slicePage(filtered, page, perPage);
  const startIdx = (page - 1) * perPage;
  const endIdx = Math.min(filtered.length, startIdx + perPage);

  /* ==========================================================================
   *  Render
   * ======================================================================== */

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Cabeçalho */}
      <Stack direction="row" alignItems="center" sx={{ mb: 2, gap: 1.25, flexWrap: "wrap" }}>
        <LocalLibraryRounded />
        <Typography variant="h3" fontWeight={900}>
          Backlog de consultas
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
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void reload()} disabled={loading || !libraryId}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Alertas de erro (biblioteca/dados) */}
      {!!libsErr && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {libsErr}
        </Alert>
      )}
      {!!err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, opacity: 0.85 }}>
          <TuneRounded fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>
            Filtros
          </Typography>
        </Stack>

        <Grid container spacing={1.5}>
          {/* Pesquisa textual */}
          <Grid item xs={12} md={6}>
            <TextField
              size="small"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar por criança / família / bibliotecário…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              fullWidth
              label="Pesquisa"
            />
          </Grid>

          {/* Filtro por bibliotecário (derivado do dataset) */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              size="small"
              fullWidth
              label="Bibliotecário (opcional)"
              value={librarianId ?? ""}
              onChange={(e) => setLibrarianId(e.target.value === "" ? null : Number(e.target.value))}
            >
              <MenuItem value="">Todos</MenuItem>
              {librarians.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.fullName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Filtro por estado + presets rápidos */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Estados:
              </Typography>

              <ToggleButtonGroup
                value={statuses}
                onChange={(_, v) => setStatuses(v)}
                aria-label="Estados"
                size="small"
              >
                {ALL_STATUSES.map((s) => (
                  <ToggleButton key={s} value={s}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {STATUS_ICON[s]}
                      <span>{STATUS_LABEL[s]}</span>
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Presets */}
              <Chip label="Todos" onClick={() => setStatuses([...ALL_STATUSES])} size="small" />
              <Chip
                label="Pendentes + Confirmadas"
                onClick={() => setStatuses(["PENDING", "CONFIRMED"])}
                size="small"
              />
              <Chip label="Limpar" onClick={() => setStatuses([])} size="small" />
            </Stack>
          </Grid>

          {/* Resumo por estado (dos resultados já filtrados) */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {(ALL_STATUSES as Status[]).map((s) => (
                <Chip
                  key={s}
                  icon={STATUS_ICON[s]}
                  label={`${STATUS_LABEL[s]}: ${countsByStatus[s]}`}
                  variant="outlined"
                  color={STATUS_COLOR[s]}
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </WhiteCard>

      {/* Lista + paginação */}
      <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
        {/* Header de paginação */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {loading
              ? "A carregar…"
              : filtered.length === 0
              ? "Sem resultados."
              : `A mostrar ${filtered.length === 0 ? 0 : startIdx + 1}–${endIdx} de ${filtered.length}`}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              label="Por página"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              sx={{ width: 130 }}
            >
              {[10, 20, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
              color="primary"
              shape="rounded"
            />
          </Stack>
        </Stack>

        <Divider sx={{ mb: 1 }} />

        {/* Estados de carregamento/empty */}
        {libsLoading ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar biblioteca…</Typography>
        ) : !libraryId ? (
          <Typography sx={{ opacity: 0.7 }}>{libsErr ?? "Não há biblioteca associada ao teu utilizador."}</Typography>
        ) : loading && filtered.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
        ) : (
          // Lista de registos paginados
          <Stack spacing={1.25} divider={<Divider />}>
            {pageRows.map((c) => {
              const a = c.startAt ? new Date(c.startAt) : null;
              const b = c.endAt ? new Date(c.endAt) : null;

              return (
                <Box
                  key={c.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Box>
                    {/* Título + estado */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography fontWeight={900}>
                        {c.child?.name ? `Consulta de ${c.child.name}` : "Consulta"}
                      </Typography>
                      <StatusChipUI status={c.status as Status} />
                    </Stack>

                    {/* Metadados principais */}
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
                      {/* Pessoas */}
                      <Chip
                        size="small"
                        icon={<FamilyRestroomRounded />}
                        label={c.family?.fullName || "—"}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      />
                      {c.librarian && (
                        <Chip
                          size="small"
                          icon={<PersonOutline />}
                          label={c.librarian.fullName}
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        />
                      )}

                      {/* Data/hora */}
                      {a && (
                        <Chip
                          size="small"
                          icon={<CalendarMonthRounded />}
                          label={a.toLocaleDateString("pt-PT")}
                          sx={{ borderRadius: 2 }}
                        />
                      )}
                      {a && (
                        <Chip
                          size="small"
                          icon={<AccessTimeRounded />}
                          label={fmtTimeRange(a, b)}
                          sx={{ borderRadius: 2 }}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* (Reservado para ações futuras – p.ex. abrir gestão) */}
                  <Box />
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Footer de paginação */}
        {filtered.length > 0 && (
          <>
            <Divider sx={{ my: 1.25 }} />
            <Stack direction="row" justifyContent="flex-end" alignItems="center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
                shape="rounded"
              />
            </Stack>
          </>
        )}
      </WhiteCard>
    </Container>
  );
}

/* ============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * ========================================================================== */

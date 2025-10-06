// ========================== apps/web/src/pages/families/Events.tsx ==========================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Página: Eventos culturais (famílias)
 *
 * Princípios deste refactor:
 *  - Helpers PUROS (sem efeitos colaterais) e com < 30 linhas
 *  - Handlers curtos e nomeados
 *  - Componentes pequenos (memo sempre que possível)
 *  - Comentado de ponta a ponta
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from "@mui/material";
  // grid legacy para manter o layout utilizado no projeto
import Grid from "@mui/material/GridLegacy";
import {
  CalendarMonthRounded,
  AccessTimeRounded,
  PlaceRounded,
  GroupRounded,
  SearchRounded,
  RefreshRounded,
  LocalLibraryRounded,
  EventBusyRounded,
  CategoryRounded,
} from "@mui/icons-material";
import { WhiteCard, Paginator } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";

/* =====================================================================================
   Tipos
   ===================================================================================== */
type CulturalEvent = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  category?: string | null;
  capacity?: number | null;
  imageUrl?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  reserved?: boolean;
};

type ListResponse = { items: CulturalEvent[]; nextCursor?: number | null };

/* =====================================================================================
   API — funções simples e puras na construção do pedido (fetch com cookies)
   ===================================================================================== */

// Base de API: lê do .env e remove trailing slash
const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

/** PURE: monta URL e pede uma página de eventos (com cursor opcional) */
async function fetchCulturalEvents(params: {
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: number | null;
}): Promise<ListResponse> {
  const { q, from, to, limit = 24, cursor } = params || {};
  const url = new URL(`${API_BASE}/cultural-events`);
  url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (cursor != null) url.searchParams.set("cursor", String(cursor));
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST reserva num evento */
async function postReserve(eventId: number) {
  const res = await fetch(
    `${API_BASE}/cultural-events/${eventId}/reservations`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** DELETE reserva num evento */
async function delReserve(eventId: number) {
  const res = await fetch(
    `${API_BASE}/cultural-events/${eventId}/reservations`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* =====================================================================================
   Helpers (PUROS, <30 linhas)
   ===================================================================================== */

/** PURE: data local em "YYYY-MM-DD" (evita TZ-shift de toISOString().slice) */
function ymdLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** PURE: parse "YYYY-MM-DD" para Date em local time (00:00) */
function parseYMDLocal(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d, 0, 0, 0, 0);
}

/** PURE: valida "YYYY-MM-DD" */
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidYMD = (s?: string) => !!s && YMD_RE.test(s);

/** PURE: início do dia em ISO */
function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

/** PURE: fim do dia em ISO */
function endOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

/** PURE: normaliza texto (sem acentos, trimmed, lowercased) */
const norm = (s?: string | null) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** PURE: match de pesquisa contra vários campos do evento */
const matchesQuery = (ev: CulturalEvent, q: string) => {
  const nq = norm(q);
  if (!nq) return true;
  return [ev.title, ev.location, ev.category, ev.description, ev.libraryName].some(
    (v) => norm(v).includes(nq)
  );
};

/* =====================================================================================
   Formatadores (PUROS)
   ===================================================================================== */
const fDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

/* =====================================================================================
   Constantes de UI
   ===================================================================================== */
const PAGE_SIZE_OPTIONS = [12, 24, 36] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/* =====================================================================================
   UI: Cabeçalho de cartão (pequeno, memo)
   ===================================================================================== */
const CardHeader = memo(function CardHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactElement;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography variant="h6" fontWeight={900} component="h2">
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
});

/* =====================================================================================
   Página
   ===================================================================================== */
export default function FamilyEventsPage() {
  useUserSession(); // mantém sessão viva no cliente

  // Filtros
  const [q, setQ] = useState("");
  const [fromY, setFromY] = useState(ymdLocal(new Date()));
  const [toY, setToY] = useState(ymdLocal(new Date(Date.now() + 30 * 86400000)));
  const [onlyBiblioteca, setOnlyBiblioteca] = useState(true);

  // Paginação "cursor-based" com cache local por página
  const [pageSize, setPageSize] = useState<PageSize>(24);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState<CulturalEvent[][]>([]);
  const [pageCursors, setPageCursors] = useState<(number | null)[]>([null]); // cursor de entrada por página
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Anti-race: id de request ativo. Se mudar, respostas antigas são ignoradas
  const requestId = useRef(0);

  // Garantir consistência das datas
  const datesValid = isValidYMD(fromY) && isValidYMD(toY);
  useEffect(() => {
    if (!datesValid) return;
    const a = parseYMDLocal(fromY).getTime();
    const b = parseYMDLocal(toY).getTime();
    if (a > b) setToY(fromY); // auto-corrige "Até" < "De"
  }, [datesValid, fromY, toY]);

  // Página atual + existência de próxima (para Paginator visual)
  const items = pages[page - 1] || [];
  const hasNext = pageCursors[page] != null;
  const pageCountVisual = pages.length + (hasNext ? 1 : 0);

  /** Handler: limpa paginação e invalida requisições em voo */
  const resetAll = useCallback(() => {
    setPage(1);
    setPages([]);
    setPageCursors([null]);
    setErr(null);
    requestId.current++; // invalida respostas pendentes
  }, []);

  /**
   * Handler: busca (ou usa cache) de uma página 1-based.
   * - Usa cursor da página anterior
   * - Aplica filtros "Biblioteca" e pesquisa local
   */
  const fetchPage = useCallback(
    async (
      targetPage: number,
      opts: { cursorOverride?: number | null; force?: boolean } = {}
    ) => {
      const rid = ++requestId.current;

      // Usa cache se existir e não for "force"
      if (!opts.force && pages[targetPage - 1]) {
        setPage(targetPage);
        return;
      }

      // Cursor de entrada
      const cursorIn =
        opts.cursorOverride !== undefined
          ? opts.cursorOverride
          : targetPage === 1
          ? null
          : pageCursors[targetPage - 1] ?? null;

      // Datas seguras (local → ISO)
      const sendFrom = datesValid ? startOfDayISO(parseYMDLocal(fromY)) : undefined;
      const sendTo = datesValid ? endOfDayISO(parseYMDLocal(toY)) : undefined;

      setLoading(true);
      setErr(null);
      try {
        const res = await fetchCulturalEvents({
          q: q.trim() || undefined,
          from: sendFrom,
          to: sendTo,
          limit: pageSize,
          cursor: cursorIn,
        });

        // resposta antiga? ignora
        if (rid !== requestId.current) return;

        // filtros locais (robustos a backends diferentes)
        let arr = res.items || [];
        if (onlyBiblioteca) arr = arr.filter((ev) => norm(ev.category) === "biblioteca");
        if (q.trim()) arr = arr.filter((ev) => matchesQuery(ev, q));

        setPages((prev) => {
          const next = prev.slice();
          next[targetPage - 1] = arr;
          return next;
        });
        setPageCursors((prev) => {
          const next = prev.slice();
          next[targetPage] = res.nextCursor ?? null; // cursor da "próxima"
          return next;
        });
        setPage(targetPage);
      } catch (e: any) {
        if (rid !== requestId.current) return;
        setErr(e?.message || "Falha a carregar eventos.");
        if (targetPage === 1) {
          setPages([]);
          setPageCursors([null]);
        }
      } finally {
        if (rid === requestId.current) setLoading(false);
      }
    },
    [datesValid, fromY, toY, pageCursors, pageSize, pages, q, onlyBiblioteca]
  );

  // (ÚNICO) efeito para primeira carga e recargas quando filtros mudam
  useEffect(() => {
    resetAll();
    fetchPage(1, { force: true, cursorOverride: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fromY, toY, onlyBiblioteca, pageSize]);

  const fHasFilters =
    !!q ||
    onlyBiblioteca === false ||
    fromY !== ymdLocal(new Date()) ||
    toY !== ymdLocal(new Date(Date.now() + 30 * 86400000));

  /* ===================================================================================
     Card de Evento (memo, apenas UI + 2 handlers curtos)
     =================================================================================== */
  const EventCard = memo(function EventCard({ ev }: { ev: CulturalEvent }) {
    // Quando: "DD/MM/AAAA · HH:MM — HH:MM" (se houver fim)
    const A = new Date(ev.startDate);
    const B = ev.endDate ? new Date(ev.endDate) : null;
    const when =
      B && !isNaN(B.getTime())
        ? `${fDate.format(A)} · ${fTime.format(A)} — ${fTime.format(B)}`
        : `${fDate.format(A)} · ${fTime.format(A)}`;

    // Reservar
    const onReserve = async () => {
      try {
        await postReserve(ev.id);
        setPages((prev) =>
          prev.map((pg) =>
            pg.map((x) => (x.id === ev.id ? { ...x, reserved: true } : x))
          )
        );
      } catch (e: any) {
        const m = String(e?.message || "");
        if (m.includes("capacity")) alert("Capacidade esgotada.");
        else if (m.includes("already_reserved")) {
          // idempotente: marca como reservado no UI
          setPages((prev) =>
            prev.map((pg) =>
              pg.map((x) => (x.id === ev.id ? { ...x, reserved: true } : x))
            )
          );
        } else alert("Não foi possível reservar.");
      }
    };

    // Cancelar
    const onCancel = async () => {
      try {
        await delReserve(ev.id);
        setPages((prev) =>
          prev.map((pg) =>
            pg.map((x) => (x.id === ev.id ? { ...x, reserved: false } : x))
          )
        );
      } catch (e: any) {
        alert(e?.message || "Falha ao cancelar reserva.");
      }
    };

    return (
      <WhiteCard
        sx={{ p: 0, height: "100%", display: "flex", flexDirection: "column" }}
      >
        {/* Imagem (fallback para "banda" com ícone) */}
        {ev.imageUrl ? (
          <Box
            component="img"
            src={ev.imageUrl}
            alt={ev.title}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              // se falhar, esconde a imagem para não quebrar layout
              const img = e.currentTarget;
              img.style.display = "none";
            }}
            sx={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: 160,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <CalendarMonthRounded />
          </Box>
        )}

        <Box sx={{ p: 1.5, flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography
            variant="h6"
            fontWeight={900}
            sx={{ mb: 0.75 }}
            noWrap
            title={ev.title}
          >
            {ev.title}
          </Typography>

          {/* Metadados */}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: 1 }}
          >
            <Chip
              size="small"
              icon={<AccessTimeRounded fontSize="small" />}
              label={when}
            />
            {ev.location && (
              <Chip
                size="small"
                icon={<PlaceRounded fontSize="small" />}
                label={ev.location}
              />
            )}
            {typeof ev.capacity === "number" && (
              <Chip
                size="small"
                icon={<GroupRounded fontSize="small" />}
                label={`Cap.: ${ev.capacity}`}
              />
            )}
            {ev.category && (
              <Chip
                size="small"
                icon={<CategoryRounded fontSize="small" />}
                label={ev.category}
                variant="outlined"
              />
            )}
            {ev.libraryName && (
              <Chip
                size="small"
                icon={<LocalLibraryRounded fontSize="small" />}
                label={ev.libraryName}
                variant="outlined"
              />
            )}
          </Stack>

          {/* Descrição (uma linha) */}
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 1 }} noWrap>
            {ev.description || "—"}
          </Typography>

          {/* Ação */}
          <Box sx={{ mt: "auto", pt: 1 }}>
            {ev.reserved ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" color="success" label="Inscrito" />
                <Button
                  variant="text"
                  color="error"
                  onClick={onCancel}
                  aria-label={`Cancelar reserva em ${ev.title}`}
                >
                  Cancelar
                </Button>
              </Stack>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={onReserve}
                aria-label={`Reservar lugar em ${ev.title}`}
              >
                Reservar lugar
              </Button>
            )}
          </Box>
        </Box>
      </WhiteCard>
    );
  });

  /* ===================================================================================
     Render
     =================================================================================== */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Título */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Eventos culturais
        </Typography>
        <LocalLibraryRounded />
      </Stack>

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2 }}>
        <CardHeader
          title="Filtros"
          icon={<SearchRounded />}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Tamanho de página */}
              <TextField
                select
                size="small"
                label="Eventos/página"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                sx={{ minWidth: 160 }}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              {/* Atualizar */}
              <Tooltip title="Atualizar agora">
                <span>
                  <IconButton
                    onClick={() => {
                      resetAll();
                      fetchPage(1, { force: true, cursorOverride: null });
                    }}
                    disabled={loading}
                    aria-label="Atualizar eventos"
                  >
                    <RefreshRounded />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Limpar filtros (mostra apenas quando há filtros ativos) */}
              {fHasFilters && (
                <Button
                  variant="text"
                  onClick={() => {
                    setQ("");
                    setFromY(ymdLocal(new Date()));
                    setToY(ymdLocal(new Date(Date.now() + 30 * 86400000)));
                    setOnlyBiblioteca(true);
                  }}
                >
                  Limpar
                </Button>
              )}
            </Stack>
          }
        />

        {/* Linha de filtros básicos */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              placeholder="Pesquisar por título/local/categoria…"
              aria-label="Pesquisar eventos"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ minWidth: 260 }}
            />

            <TextField
              label="De"
              type="date"
              value={fromY}
              onChange={(e) => setFromY(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!isValidYMD(fromY)}
              helperText={!isValidYMD(fromY) ? "Data inválida" : " "}
              size="small"
              sx={{ minWidth: 170 }}
            />

            <TextField
              label="Até"
              type="date"
              value={toY}
              onChange={(e) => setToY(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={
                !isValidYMD(toY) ||
                (isValidYMD(fromY) &&
                  isValidYMD(toY) &&
                  parseYMDLocal(fromY) > parseYMDLocal(toY))
              }
              helperText={
                !isValidYMD(toY)
                  ? "Data inválida"
                  : parseYMDLocal(fromY) > parseYMDLocal(toY)
                  ? "Deve ser ≥ data inicial"
                  : " "
              }
              size="small"
              sx={{ minWidth: 170 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={onlyBiblioteca}
                  onChange={(e) => setOnlyBiblioteca(e.target.checked)}
                />
              }
              label='Só categoria "Biblioteca"'
            />
          </Stack>
        </Stack>
      </WhiteCard>

      {/* Erro */}
      {err && (
        <Typography color="error" sx={{ mb: 1 }} role="alert" aria-live="polite">
          {err}
        </Typography>
      )}

      {/* Grid de eventos */}
      <Grid container spacing={2}>
        {loading && pages.length === 0
          ? // Skeletons da carga inicial
            Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <WhiteCard sx={{ p: 0 }}>
                  <Skeleton variant="rectangular" height={160} />
                  <Box sx={{ p: 1.5 }}>
                    <Skeleton width="70%" />
                    <Skeleton width="40%" />
                    <Skeleton width="55%" />
                  </Box>
                </WhiteCard>
              </Grid>
            ))
          : // Eventos da página corrente
            items.map((ev) => (
              <Grid key={ev.id} item xs={12} sm={6} md={4}>
                <EventCard ev={ev} />
              </Grid>
            ))}
      </Grid>

      {/* Paginador visual (usa cache + cursor da próxima) */}
      {pageCountVisual > 1 && (
        <Paginator
          count={pageCountVisual}
          page={page}
          onChange={(_, p) => {
            if (p === pages.length + 1) {
              // pedir próxima página usando cursor já guardado
              fetchPage(p);
            } else {
              // navegar para página cacheada
              setPage(p);
            }
          }}
          showFirstButton
          showLastButton
          siblingCount={1}
          boundaryCount={1}
        />
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !err && (
        <WhiteCard sx={{ mt: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ opacity: 0.8 }}
          >
            <EventBusyRounded />
            <Typography>
              Não encontrámos eventos no período selecionado
              {onlyBiblioteca ? " para a categoria Biblioteca" : ""}.
            </Typography>
          </Stack>
        </WhiteCard>
      )}
    </Container>
  );
}

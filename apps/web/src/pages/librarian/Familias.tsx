/**
 * =============================================================================
 *  Famílias — Painel do Bibliotecário
 * -----------------------------------------------------------------------------
 *  Ficheiro: src/pages/librarian/Familias.tsx
 *  Autor:    Alexandre Brissos  (nº 21131)
 *  Nota:     Código reforçado com comentários, helpers "puros" e funções curtas
 *            (< 30 linhas) para facilitar manutenção e testes.
 * =============================================================================
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Button,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import SearchRounded from "@mui/icons-material/SearchRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import BookmarkAddedRounded from "@mui/icons-material/BookmarkAddedRounded";

import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "../../contexts/UserSession";
import {
  listFamilies,
  getFamilyDetail,
  type FamilyLite,
  type FamilyDetail,
} from "../../services/families";

/* =================================================================================
 *  Helpers "PUROS" (sem efeitos colaterais) — fáceis de testar e reutilizar
 * ================================================================================= */

/** Formata uma data para DD/MM/AAAA (pt-PT). */
const fDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formata uma hora para HH:mm (pt-PT). */
const fTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Devolve iniciais (2 letras) a partir do nome. */
function makeInitials(name?: string | null): string {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Config de estados para chips de consulta. */
const STATUS_CFG: Record<
  string,
  { label: string; color: "default" | "success" | "warning" | "error" }
> = {
  PENDING: { label: "Pendente", color: "warning" },
  CONFIRMED: { label: "Confirmada", color: "success" },
  DECLINED: { label: "Recusada", color: "error" },
  CANCELLED: { label: "Cancelada", color: "default" },
  COMPLETED: { label: "Concluída", color: "success" },
};

/** Estilo reutilizável para containers com scroll vertical. */
const SCROLL_Y_SX = {
  overflowY: "auto",
  pr: 1,
  "&::-webkit-scrollbar": { width: 8 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,.18)",
    borderRadius: 8,
  },
} as const;

/* ----------------------- filtros "puros" (client-side) ----------------------- */

/** Filtra próximas consultas por texto livre. */
function filterUpcoming(
  upcoming: FamilyDetail["upcomingConsultations"] | undefined,
  q: string
) {
  if (!upcoming) return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return upcoming;
  return upcoming.filter((c) => {
    const hay =
      (c.child?.name || "") +
      " " +
      (c.library?.name || "") +
      " " +
      (c.librarian?.fullName || "");
    return hay.toLowerCase().includes(needle);
  });
}

/** Filtra consultas recentes por texto + estados. */
function filterRecent(
  recent: FamilyDetail["recentConsultations"] | undefined,
  q: string,
  statuses: string[]
) {
  if (!recent) return [];
  const set = new Set(statuses);
  const needle = q.trim().toLowerCase();
  return recent.filter((c) => {
    if (set.size && !set.has(c.status)) return false;
    if (!needle) return true;
    const hay =
      (c.child?.name || "") +
      " " +
      (c.library?.name || "") +
      " " +
      (c.librarian?.fullName || "");
    return hay.toLowerCase().includes(needle);
  });
}

/** Filtra leituras por texto. */
function filterReadings(
  readings: FamilyDetail["readings"] | undefined,
  q: string
) {
  if (!readings) return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return readings;
  return readings.filter((r) =>
    `${r.book.title} ${r.book.author || ""}`.toLowerCase().includes(needle)
  );
}

/** Filtra reservas por texto. */
function filterReservations(
  reservations: FamilyDetail["reservations"] | undefined,
  q: string
) {
  if (!reservations) return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return reservations;
  return reservations.filter((r) =>
    `${r.book.title} ${r.book.author || ""}`.toLowerCase().includes(needle)
  );
}

/** Filtra avaliações por texto + mínimo de estrelas. */
function filterRatings(
  ratings: FamilyDetail["ratings"] | undefined,
  q: string,
  minStars: number
) {
  if (!ratings) return [];
  const needle = q.trim().toLowerCase();
  return ratings.filter((rt) => {
    if (minStars && rt.stars < minStars) return false;
    if (!needle) return true;
    const hay = `${rt.book.title} ${rt.book.author || ""} ${rt.comment || ""}`;
    return hay.toLowerCase().includes(needle);
  });
}

/* =================================================================================
 *  Pequenos "átomos" de UI (componentes curtos, reutilizáveis e comentados)
 * ================================================================================= */

/** Cabeçalho de secção simples. */
function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1 }}
    >
      <Typography variant="h6" fontWeight={900}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

/** Linha "Etiqueta: Valor" compacta. */
function LabeledValue({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ opacity: value ? 1 : 0.8 }}>
      <Typography variant="body2" sx={{ minWidth: 88, opacity: 0.8 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}

/** Cartão de família (item da lista esquerda). */
function FamilyListItem({
  f,
  active,
  onSelect,
}: {
  f: FamilyLite;
  active: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <Box
      onClick={() => onSelect(f.id)}
      sx={{
        p: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: active ? "primary.main" : "divider",
        bgcolor: active ? "action.selected" : "transparent",
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(f.id)}
      aria-label={`Selecionar família ${f.fullName}`}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar sx={{ width: 36, height: 36 }}>
          {makeInitials(f.fullName)}
        </Avatar>
        <Box minWidth={0}>
          <Typography fontWeight={900} noWrap title={f.fullName}>
            {f.fullName}
          </Typography>
          <Typography variant="body2" noWrap sx={{ opacity: 0.75 }}>
            {f.email}
          </Typography>
        </Box>
        <Chip
          size="small"
          sx={{ ml: "auto" }}
          label={`${f.childrenCount} filhos`}
        />
      </Stack>
    </Box>
  );
}

/* =================================================================================
 *  Página
 * ================================================================================= */

export default function LibrarianFamilias() {
  const { isLibrarian } = useUserSession() as any;

  // --------- Estado da LISTAGEM (coluna esquerda) ---------
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<FamilyLite[]>([]);
  const [famLoading, setFamLoading] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [errList, setErrList] = useState<string | null>(null);

  // --------- Estado de DETALHE (coluna direita) ----------
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);

  // --------- Filtros locais (coluna direita) -------------
  const [upcomingSearch, setUpcomingSearch] = useState("");
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState<string[]>([
    "COMPLETED",
    "CANCELLED",
    "DECLINED",
  ]);
  const [readingSearch, setReadingSearch] = useState("");
  const [reserveSearch, setReserveSearch] = useState("");
  const [ratingSearch, setRatingSearch] = useState("");
  const [minStars, setMinStars] = useState<number>(0);

  /* ------------------------------------------
   *  Efeitos: carga inicial de famílias
   * ------------------------------------------ */
  useEffect(() => {
    if (!isLibrarian) return;
    (async () => {
      try {
        setFamLoading(true);
        setErrList(null);
        const res = await listFamilies("", 25);
        setFamilies(res.items);
        setCursor(res.nextCursor);
        if (res.items.length && !selectedId) setSelectedId(res.items[0].id);
      } catch (e: any) {
        setErrList(e?.message || "Falha a carregar famílias");
      } finally {
        setFamLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLibrarian]);

  /* ------------------------------------------
   *  Ações: pesquisar e "ver mais"
   *  (useCallback para identidades estáveis)
   * ------------------------------------------ */
  const searchFamilies = useCallback(async () => {
    try {
      setFamLoading(true);
      setErrList(null);
      const res = await listFamilies(query, 25);
      setFamilies(res.items);
      setCursor(res.nextCursor);
      // se a família selecionada não está na nova lista, seleciona a 1ª
      if (!res.items.some((f) => f.id === selectedId)) {
        setSelectedId(res.items[0]?.id ?? null);
      }
    } catch (e: any) {
      setErrList(e?.message || "Falha na pesquisa");
    } finally {
      setFamLoading(false);
    }
  }, [query, selectedId]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    try {
      setFamLoading(true);
      const res = await listFamilies(query, 25, cursor);
      setFamilies((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e: any) {
      setErrList(e?.message || "Falha a carregar mais");
    } finally {
      setFamLoading(false);
    }
  }, [cursor, query]);

  /* ------------------------------------------
   *  Efeito: carregar detalhe quando muda o ID
   * ------------------------------------------ */
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    (async () => {
      try {
        setDetailLoading(true);
        setErrDetail(null);
        const d = await getFamilyDetail(selectedId);
        setDetail(d);
        // reset básico dos filtros ao trocar de família
        setUpcomingSearch("");
        setRecentSearch("");
        setRecentStatus(["COMPLETED", "CANCELLED", "DECLINED"]);
        setReadingSearch("");
        setReserveSearch("");
        setRatingSearch("");
        setMinStars(0);
      } catch (e: any) {
        setErrDetail(e?.message || "Falha a carregar detalhe");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedId]);

  /* ------------------------------------------
   *  Derivados memorizados: família ativa + listas filtradas
   * ------------------------------------------ */
  const selectedFamily = useMemo(
    () => families.find((f) => f.id === selectedId) || null,
    [families, selectedId]
  );

  const filteredUpcoming = useMemo(
    () => filterUpcoming(detail?.upcomingConsultations, upcomingSearch),
    [detail?.upcomingConsultations, upcomingSearch]
  );
  const filteredRecent = useMemo(
    () => filterRecent(detail?.recentConsultations, recentSearch, recentStatus),
    [detail?.recentConsultations, recentSearch, recentStatus]
  );
  const filteredReadings = useMemo(
    () => filterReadings(detail?.readings, readingSearch),
    [detail?.readings, readingSearch]
  );
  const filteredReservations = useMemo(
    () => filterReservations(detail?.reservations, reserveSearch),
    [detail?.reservations, reserveSearch]
  );
  const filteredRatings = useMemo(
    () => filterRatings(detail?.ratings, ratingSearch, minStars),
    [detail?.ratings, ratingSearch, minStars]
  );

  /* ------------------------------------------
   *  UI
   * ------------------------------------------ */
  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      {/* Cabeçalho da página */}
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        Famílias
      </Typography>

      <Grid container spacing={2}>
        {/* COLUNA ESQUERDA — listagem / pesquisa */}
        <Grid item xs={12} md={3} lg={3}>
          <WhiteCard
            sx={{
              display: "flex",
              flexDirection: "column",
              maxHeight: { xs: "unset", md: "calc(100vh - 160px)" },
            }}
          >
            <SectionHeader
              title="Pesquisar famílias"
              action={
                <Tooltip title="Atualizar">
                  <span>
                    <IconButton
                      onClick={() => searchFamilies()}
                      disabled={famLoading}
                    >
                      <RefreshRounded />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            />

            {/* Campo de pesquisa com Enter e botão "Buscar" */}
            <TextField
              fullWidth
              placeholder="Nome, email ou telefone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchFamilies()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {/* Button aqui está dentro de InputAdornment (div), NÃO um botão dentro de botão */}
                    <Button
                      size="small"
                      onClick={searchFamilies}
                      disabled={famLoading}
                    >
                      Buscar
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />

            {famLoading && <LinearProgress sx={{ mb: 1 }} />}
            {errList && (
              <Typography color="error" sx={{ mb: 1 }}>
                {errList}
              </Typography>
            )}

            {/* Lista com scroll */}
            <Box sx={{ ...SCROLL_Y_SX, flex: 1 }}>
              <Stack spacing={1}>
                {families.map((f) => (
                  <FamilyListItem
                    key={f.id}
                    f={f}
                    active={f.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </Stack>

              {!!cursor && (
                <Button
                  fullWidth
                  sx={{ mt: 1.5 }}
                  onClick={loadMore}
                  disabled={famLoading}
                >
                  Ver mais
                </Button>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* COLUNA DIREITA — detalhe */}
        <Grid item xs={12} md={9} lg={9}>
          {!selectedFamily ? (
            <WhiteCard>
              <Typography sx={{ opacity: 0.8 }}>
                Selecione uma família à esquerda.
              </Typography>
            </WhiteCard>
          ) : (
            <>
              {/* Cabeçalho família */}
              <WhiteCard sx={{ mb: 2 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Avatar sx={{ width: 48, height: 48 }}>
                    {makeInitials(selectedFamily.fullName)}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      noWrap
                      title={selectedFamily.fullName}
                    >
                      {selectedFamily.fullName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {selectedFamily.email} • {selectedFamily.phone || "—"}
                    </Typography>
                  </Box>
                  <RouteLink href="/consultas">Abrir consultas</RouteLink>
                </Stack>

                {detailLoading && <LinearProgress />}
                {errDetail && (
                  <Typography color="error" sx={{ mt: 1 }}>
                    {errDetail}
                  </Typography>
                )}
              </WhiteCard>

              {/* Grid de cartões */}
              <Grid container spacing={2}>
                {/* Filhos */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 360 },
                    }}
                  >
                    <SectionHeader
                      title={`Filhos (${detail?.children.length ?? 0})`}
                    />
                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {detail?.children?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {detail.children.map((c) => (
                            <Stack
                              key={c.id}
                              direction="row"
                              spacing={1.25}
                              alignItems="center"
                            >
                              <Avatar sx={{ width: 36, height: 36 }}>
                                {makeInitials(c.name)}
                              </Avatar>
                              <Box flex={1} minWidth={0}>
                                <Typography fontWeight={900} noWrap>
                                  {c.name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.8 }}
                                >
                                  Nasc.: {fDate.format(new Date(c.birthDate))}
                                </Typography>
                              </Box>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem filhos registados.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Conquistas */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 360 },
                    }}
                  >
                    <SectionHeader title="Conquistas" />
                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {detail?.badges?.length ? (
                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          flexWrap="wrap"
                        >
                          {detail.badges.slice(0, 200).map((b, idx) => (
                            <Chip
                              key={`${b.childId}-${b.badge.id}-${idx}`}
                              label={b.badge.name}
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem conquistas ainda.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Consultas — próximas */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 420 },
                    }}
                  >
                    <SectionHeader
                      title="Próximas consultas"
                      action={
                        <RouteLink href="/librarian/agenda">
                          Ver agenda
                        </RouteLink>
                      }
                    />
                    {/* toolbar */}
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Pesquisar por criança/biblioteca/bibliotecário…"
                      value={upcomingSearch}
                      onChange={(e) => setUpcomingSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {filteredUpcoming?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {filteredUpcoming.map((c) => {
                            const cfg = STATUS_CFG[c.status] || {
                              label: c.status,
                              color: "default",
                            };
                            const dt = c.startAt ? new Date(c.startAt) : null;
                            return (
                              <Stack
                                key={c.id}
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  color={cfg.color}
                                  label={cfg.label}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  icon={
                                    <CalendarMonthRounded fontSize="small" />
                                  }
                                  label={dt ? fDate.format(dt) : "—"}
                                />
                                <Chip
                                  size="small"
                                  icon={<AccessTimeRounded fontSize="small" />}
                                  label={dt ? fTime.format(dt) : "—"}
                                />
                                <Typography
                                  sx={{ ml: "auto", opacity: 0.85 }}
                                  variant="body2"
                                >
                                  {c.child?.name ? `de ${c.child.name}` : ""}
                                  {c.library?.name
                                    ? ` • ${c.library.name}`
                                    : ""}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem próximas consultas.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Consultas — recentes */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 420 },
                    }}
                  >
                    <SectionHeader title="Consultas recentes" />
                    {/* toolbar */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      sx={{ mb: 1 }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Pesquisar…"
                        value={recentSearch}
                        onChange={(e) => setRecentSearch(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRounded fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <ToggleButtonGroup
                        size="small"
                        value={recentStatus}
                        onChange={(_, v: string[]) => v && setRecentStatus(v)}
                        aria-label="filtro de estado"
                      >
                        {[
                          "COMPLETED",
                          "CANCELLED",
                          "DECLINED",
                          "CONFIRMED",
                          "PENDING",
                        ].map((s) => {
                          const cfg = STATUS_CFG[s] || {
                            label: s,
                            color: "default",
                          };
                          return (
                            <ToggleButton
                              key={s}
                              value={s}
                              aria-label={cfg.label}
                            >
                              {cfg.label}
                            </ToggleButton>
                          );
                        })}
                      </ToggleButtonGroup>
                    </Stack>

                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {filteredRecent?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {filteredRecent.map((c) => {
                            const cfg = STATUS_CFG[c.status] || {
                              label: c.status,
                              color: "default",
                            };
                            const dt = c.startAt
                              ? new Date(c.startAt)
                              : c.requestedAt
                              ? new Date(c.requestedAt)
                              : null;
                            return (
                              <Stack
                                key={c.id}
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  color={cfg.color}
                                  label={cfg.label}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  icon={
                                    <CalendarMonthRounded fontSize="small" />
                                  }
                                  label={dt ? fDate.format(dt) : "—"}
                                />
                                {dt && (
                                  <Chip
                                    size="small"
                                    icon={
                                      <AccessTimeRounded fontSize="small" />
                                    }
                                    label={fTime.format(dt)}
                                  />
                                )}
                                <Typography
                                  sx={{ ml: "auto", opacity: 0.85 }}
                                  variant="body2"
                                >
                                  {c.child?.name ? `de ${c.child.name}` : ""}
                                  {c.library?.name
                                    ? ` • ${c.library.name}`
                                    : ""}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem histórico recente.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Leituras em curso */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 420 },
                    }}
                  >
                    <SectionHeader title="A ler" />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Pesquisar por título/autor…"
                      value={readingSearch}
                      onChange={(e) => setReadingSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {filteredReadings?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {filteredReadings.map((r) => (
                            <Stack
                              key={r.id}
                              direction="row"
                              spacing={1.25}
                              alignItems="center"
                            >
                              <LibraryBooksRounded fontSize="small" />
                              <Box minWidth={0}>
                                <Typography
                                  fontWeight={900}
                                  noWrap
                                  title={r.book.title}
                                >
                                  {r.book.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.8 }}
                                >
                                  {r.book.author || "Autor desconhecido"}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ ml: "auto", opacity: 0.8 }}
                              >
                                {r.startedAt
                                  ? fDate.format(new Date(r.startedAt))
                                  : "—"}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem leituras em curso.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Reservas */}
                <Grid item xs={12} md={6}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 420 },
                    }}
                  >
                    <SectionHeader title="Reservas de livros" />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Pesquisar por título/autor…"
                      value={reserveSearch}
                      onChange={(e) => setReserveSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {filteredReservations?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {filteredReservations.map((r) => (
                            <Stack
                              key={r.id}
                              direction="row"
                              spacing={1.25}
                              alignItems="center"
                            >
                              <BookmarkAddedRounded fontSize="small" />
                              <Box minWidth={0}>
                                <Typography
                                  fontWeight={900}
                                  noWrap
                                  title={r.book.title}
                                >
                                  {r.book.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.8 }}
                                >
                                  {r.book.author || "Autor desconhecido"}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ ml: "auto", opacity: 0.8 }}
                              >
                                {fDate.format(new Date(r.reservedAt))}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem reservas ativas.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Avaliações */}
                <Grid item xs={12}>
                  <WhiteCard
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: { xs: "unset", md: 420 },
                    }}
                  >
                    <SectionHeader title="Avaliações de livros" />
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      sx={{ mb: 1 }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Pesquisar por título/autor/comentário…"
                        value={ratingSearch}
                        onChange={(e) => setRatingSearch(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRounded fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={minStars}
                        onChange={(_, v) =>
                          setMinStars(Number.isInteger(v) ? v : 0)
                        }
                        aria-label="mínimo de estrelas"
                      >
                        <ToggleButton value={0}>Todas</ToggleButton>
                        <ToggleButton value={3}>3★+</ToggleButton>
                        <ToggleButton value={4}>4★+</ToggleButton>
                        <ToggleButton value={5}>5★</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>

                    <Box sx={{ ...SCROLL_Y_SX }}>
                      {filteredRatings?.length ? (
                        <Stack spacing={1.25} divider={<Divider />}>
                          {filteredRatings.map((rt) => (
                            <Stack
                              key={rt.id}
                              direction="row"
                              spacing={1.25}
                              alignItems="center"
                            >
                              <StarRounded fontSize="small" />
                              <Box minWidth={0}>
                                <Typography
                                  fontWeight={900}
                                  noWrap
                                  title={rt.book.title}
                                >
                                  {rt.book.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ opacity: 0.8 }}
                                >
                                  {`${rt.stars}★`}{" "}
                                  {rt.comment ? `• “${rt.comment}”` : ""}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ ml: "auto", opacity: 0.8 }}
                              >
                                {fDate.format(new Date(rt.ratedAt))}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ opacity: 0.8 }}>
                          Sem avaliações.
                        </Typography>
                      )}
                    </Box>
                  </WhiteCard>
                </Grid>

                {/* Contactos / Info extra */}
                <Grid item xs={12}>
                  <WhiteCard>
                    <SectionHeader title="Contactos" />
                    <Stack
                      direction="row"
                      spacing={2}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <LabeledValue
                        label="Email"
                        value={detail?.family.email}
                      />
                      <LabeledValue
                        label="Telefone"
                        value={detail?.family.phone ?? "—"}
                      />
                      <LabeledValue
                        label="Morada"
                        value={detail?.family.address ?? "—"}
                      />
                    </Stack>
                  </WhiteCard>
                </Grid>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

/* =============================================================================
 *  Fim — Alexandre Brissos • nº 21131
 * =============================================================================
 */

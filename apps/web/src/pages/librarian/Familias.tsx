// apps/web/src/pages/librarian/Familias.tsx
import { useEffect, useMemo, useState } from "react";
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
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import BookmarkAddedRounded from "@mui/icons-material/BookmarkAddedRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import MilitaryTechRounded from "@mui/icons-material/MilitaryTechRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ContactPhoneRounded from "@mui/icons-material/ContactPhoneRounded";

import { RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "../../contexts/UserSession";
import {
  listFamilies,
  getFamilyDetail,
  type FamilyLite,
  type FamilyDetail,
} from "../../services/families";

/* ========= helpers ========= */
const fDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});
const initials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const statusCfg: Record<
  string,
  { label: string; color: "default" | "success" | "warning" | "error" }
> = {
  PENDING: { label: "Pendente", color: "warning" },
  CONFIRMED: { label: "Confirmada", color: "success" },
  DECLINED: { label: "Recusada", color: "error" },
  CANCELLED: { label: "Cancelada", color: "default" },
  COMPLETED: { label: "Concluída", color: "success" },
};

const scrollY = {
  overflowY: "auto",
  pr: 1,
  "&::-webkit-scrollbar": { width: 8 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,.18)",
    borderRadius: 8,
  },
} as const;

function Empty({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ opacity: 0.8, py: 0.5 }}>{children}</Typography>;
}

function StatTile({
  icon,
  label,
  value,
  color = "primary",
}: {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  color?: "primary" | "secondary" | "success" | "warning" | "info";
}) {
  const theme = useTheme();
  const c = (theme.palette as any)[color];
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          bgcolor: c?.light,
          color: c?.dark,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={900} lineHeight={1}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/* ========= Página ========= */
export default function LibrarianFamilias() {
  const { isLibrarian } = useUserSession() as any;

  // listagem
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<FamilyLite[]>([]);
  const [famLoading, setFamLoading] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [errList, setErrList] = useState<string | null>(null);

  // seleção + detalhe
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);

  // filtros (secções)
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

  async function searchFamilies() {
    try {
      setFamLoading(true);
      setErrList(null);
      const res = await listFamilies(query, 25);
      setFamilies(res.items);
      setCursor(res.nextCursor);
      if (!res.items.some((f) => f.id === selectedId)) {
        setSelectedId(res.items[0]?.id ?? null);
      }
    } catch (e: any) {
      setErrList(e?.message || "Falha na pesquisa");
    } finally {
      setFamLoading(false);
    }
  }
  async function loadMore() {
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
  }

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
        // reset filtros
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

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === selectedId) || null,
    [families, selectedId]
  );

  // filtros client-side
  const filteredUpcoming = useMemo(() => {
    if (!detail?.upcomingConsultations) return [];
    const q = upcomingSearch.trim().toLowerCase();
    return detail.upcomingConsultations.filter((c) => {
      if (!q) return true;
      const hay = `${c.child?.name || ""} ${c.library?.name || ""} ${
        c.librarian?.fullName || ""
      }`;
      return hay.toLowerCase().includes(q);
    });
  }, [detail?.upcomingConsultations, upcomingSearch]);

  const filteredRecent = useMemo(() => {
    if (!detail?.recentConsultations) return [];
    const q = recentSearch.trim().toLowerCase();
    const set = new Set(recentStatus);
    return detail.recentConsultations.filter((c) => {
      if (set.size && !set.has(c.status)) return false;
      if (!q) return true;
      const hay = `${c.child?.name || ""} ${c.library?.name || ""} ${
        c.librarian?.fullName || ""
      }`;
      return hay.toLowerCase().includes(q);
    });
  }, [detail?.recentConsultations, recentSearch, recentStatus]);

  const filteredReadings = useMemo(() => {
    if (!detail?.readings) return [];
    const q = readingSearch.trim().toLowerCase();
    return detail.readings.filter((r) => {
      if (!q) return true;
      const hay = `${r.book.title} ${r.book.author || ""}`;
      return hay.toLowerCase().includes(q);
    });
  }, [detail?.readings, readingSearch]);

  const filteredReservations = useMemo(() => {
    if (!detail?.reservations) return [];
    const q = reserveSearch.trim().toLowerCase();
    return detail.reservations.filter((r) => {
      if (!q) return true;
      const hay = `${r.book.title} ${r.book.author || ""}`;
      return hay.toLowerCase().includes(q);
    });
  }, [detail?.reservations, reserveSearch]);

  const filteredRatings = useMemo(() => {
    if (!detail?.ratings) return [];
    const q = ratingSearch.trim().toLowerCase();
    return detail.ratings.filter((rt) => {
      if (minStars && rt.stars < minStars) return false;
      if (!q) return true;
      const hay = `${rt.book.title} ${rt.book.author || ""} ${
        rt.comment || ""
      }`;
      return hay.toLowerCase().includes(q);
    });
  }, [detail?.ratings, ratingSearch, minStars]);

  // KPIs
  const kChildren = detail?.children?.length ?? 0;
  const kUpcoming = detail?.upcomingConsultations?.length ?? 0;
  const kReserves = detail?.reservations?.length ?? 0;
  const kRatings = detail?.ratings?.length ?? 0;
  const kAvgStars =
    kRatings > 0
      ? (
          detail!.ratings!.reduce((a, r) => a + (r.stars || 0), 0) / kRatings
        ).toFixed(1)
      : "—";

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        Famílias
      </Typography>

      <Stack spacing={2}>
        {/* Secção: Pesquisar famílias */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PeopleAltRounded />
              <Typography fontWeight={900}>Pesquisar famílias</Typography>
              <Chip size="small" variant="outlined" label={families.length} />
              <Box sx={{ ml: "auto" }}>
                <Tooltip title="Atualizar">
                  <span>
                    <IconButton onClick={searchFamilies} disabled={famLoading}>
                      <RefreshRounded />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
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
                    <Button
                      size="small"
                      onClick={searchFamilies}
                      disabled={famLoading}
                    >
                      Procurar
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
            <Box sx={{ ...scrollY, maxHeight: 380 }}>
              <Stack spacing={1}>
                {families.map((f) => {
                  const active = f.id === selectedId;
                  return (
                    <Box
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: active ? "primary.main" : "divider",
                        bgcolor: active ? "action.selected" : "transparent",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar sx={{ width: 36, height: 36 }}>
                          {initials(f.fullName)}
                        </Avatar>
                        <Box minWidth={0}>
                          <Typography
                            fontWeight={900}
                            noWrap
                            title={f.fullName}
                          >
                            {f.fullName}
                          </Typography>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ opacity: 0.75 }}
                          >
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
                })}
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
          </AccordionDetails>
        </Accordion>

        {/* Secções de detalhe */}
        {!selectedFamily ? (
          <Accordion disabled>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
              <Typography>Selecione uma família para ver detalhes</Typography>
            </AccordionSummary>
          </Accordion>
        ) : (
          <>
            {/* Resumo */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {initials(selectedFamily.fullName)}
                  </Avatar>
                  <Typography fontWeight={900} noWrap sx={{ flex: 1 }}>
                    {selectedFamily.fullName}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {detailLoading && <LinearProgress />}
                {errDetail && (
                  <Typography color="error" sx={{ mt: 1 }}>
                    {errDetail}
                  </Typography>
                )}

                {!detailLoading && detail && (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mt: 1 }}
                  >
                    <StatTile
                      icon={<PeopleAltRounded fontSize="small" />}
                      label="Filhos"
                      value={kChildren}
                      color="info"
                    />
                    <StatTile
                      icon={<EventAvailableRounded fontSize="small" />}
                      label="Próximas consultas"
                      value={kUpcoming}
                      color="success"
                    />
                    <StatTile
                      icon={<BookmarkAddedRounded fontSize="small" />}
                      label="Reservas ativas"
                      value={kReserves}
                      color="secondary"
                    />
                    <StatTile
                      icon={<StarRounded fontSize="small" />}
                      label="Média ★"
                      value={kAvgStars}
                      color="warning"
                    />
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Filhos */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PeopleAltRounded />
                  <Typography fontWeight={900}>Filhos</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.children.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ ...scrollY, maxHeight: 320 }}>
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
                            {initials(c.name)}
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <Typography fontWeight={900} noWrap>
                              {c.name}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              Nasc.: {fDate.format(new Date(c.birthDate))}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Empty>Sem filhos registados.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Conquistas */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MilitaryTechRounded />
                  <Typography fontWeight={900}>Conquistas</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.badges?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ ...scrollY, maxHeight: 320 }}>
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
                    <Empty>Sem conquistas ainda.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Próximas */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventAvailableRounded />
                  <Typography fontWeight={900}>Próximas consultas</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.upcomingConsultations?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
                <Box sx={{ ...scrollY, maxHeight: 360 }}>
                  {filteredUpcoming?.length ? (
                    <Stack spacing={1.25} divider={<Divider />}>
                      {filteredUpcoming.map((c) => {
                        const scfg = statusCfg[c.status] || {
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
                              color={scfg.color}
                              label={scfg.label}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              icon={<CalendarMonthRounded fontSize="small" />}
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
                              {c.library?.name ? ` • ${c.library.name}` : ""}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Empty>Sem próximas consultas.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Recentes */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <HistoryRounded />
                  <Typography fontWeight={900}>Consultas recentes</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.recentConsultations?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
                      const cfg = statusCfg[s] || {
                        label: s,
                        color: "default",
                      };
                      return (
                        <ToggleButton key={s} value={s} aria-label={cfg.label}>
                          {cfg.label}
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                </Stack>
                <Box sx={{ ...scrollY, maxHeight: 360 }}>
                  {filteredRecent?.length ? (
                    <Stack spacing={1.25} divider={<Divider />}>
                      {filteredRecent.map((c) => {
                        const scfg = statusCfg[c.status] || {
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
                              color={scfg.color}
                              label={scfg.label}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              icon={<CalendarMonthRounded fontSize="small" />}
                              label={dt ? fDate.format(dt) : "—"}
                            />
                            {dt && (
                              <Chip
                                size="small"
                                icon={<AccessTimeRounded fontSize="small" />}
                                label={fTime.format(dt)}
                              />
                            )}
                            <Typography
                              sx={{ ml: "auto", opacity: 0.85 }}
                              variant="body2"
                            >
                              {c.child?.name ? `de ${c.child.name}` : ""}
                              {c.library?.name ? ` • ${c.library.name}` : ""}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Empty>Sem histórico recente.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Leituras */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MenuBookRounded />
                  <Typography fontWeight={900}>A ler</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.readings?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
                <Box sx={{ ...scrollY, maxHeight: 360 }}>
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
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
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
                    <Empty>Sem leituras em curso.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Reservas */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BookmarkAddedRounded />
                  <Typography fontWeight={900}>Reservas de livros</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.reservations?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
                <Box sx={{ ...scrollY, maxHeight: 360 }}>
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
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
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
                    <Empty>Sem reservas ativas.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Avaliações */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StarRounded />
                  <Typography fontWeight={900}>Avaliações de livros</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={detail?.ratings?.length ?? 0}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
                <Box sx={{ ...scrollY, maxHeight: 360 }}>
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
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
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
                    <Empty>Sem avaliações.</Empty>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Contactos */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ContactPhoneRounded />
                  <Typography fontWeight={900}>Contactos</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                  <Typography variant="body2">
                    <b>Email:</b> {detail?.family.email || "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Telefone:</b> {detail?.family.phone || "—"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Morada:</b> {detail?.family.address || "—"}
                  </Typography>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Stack>
    </Container>
  );
}

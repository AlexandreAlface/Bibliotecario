import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  NotificationBell,
  PrimaryButton,
  RouteLink,
} from "@bibliotecario/ui-web";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  LinearProgress,
  useTheme,
  Tooltip,
  IconButton,
  Button,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useUserSession } from "../../contexts/UserSession";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import { StarRounded } from "@mui/icons-material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import LocalLibraryRounded from "@mui/icons-material/LocalLibraryRounded";
import TheaterComedyRounded from "@mui/icons-material/TheaterComedyRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import BookRounded from "@mui/icons-material/BookRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BookmarkAddRounded from "@mui/icons-material/BookmarkAddRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";

import { getLeiturasAtuais } from "../../services/readings";
import type { BookLite as ReadingBookLite } from "../../services/readings";

import { getProximosEventos } from "../../services/events";
import { getSugestoesPerfil } from "../../services/books";
import type { BookLite as SuggestionBookLite } from "../../services/books";
import {
  getNextConsultas,
  type ConsultaLite,
} from "../../services/consultations";
import { getBadgesRecent, type BadgeLite } from "../../services/badges";

// micro-conteúdos (dicas/biblioterapia)
import {
  listMicroContentsPublic,
  markMicroContentSeen,
} from "@/services/microcontent";
import type { MicroContentItem } from "@/services/microcontent";

// Placeholder para eventos sem imagem
import EVENT_PLACEHOLDER from "../../assets/placeholder-event.jpg";

const TOP_CARD_H = "clamp(360px, 50vh, 440px)";

/** ---------- helpers ---------- */

// Cache de sugestões (manual only — sem pedidos automáticos)
function sugKey(childId?: number) {
  return `sug:cache:${childId ?? "anon"}`;
}
function loadSugFromCache(
  childId?: number
): { items: any[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(sugKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.items || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveSugToCache(childId: number | undefined, items: any[]) {
  localStorage.setItem(
    sugKey(childId),
    JSON.stringify({ items, ts: Date.now() })
  );
}

const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  // EN do backend
  CONFIRMED: { label: "Confirmado", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusado", color: "error" },
  CANCELLED: { label: "Cancelado", color: "default" },
  COMPLETED: { label: "Concluída", color: "success" },
  // PT (legacy)
  CONFIRMADO: { label: "Confirmado", color: "success" },
  PENDENTE: { label: "Pendente", color: "warning" },
  RECUSADO: { label: "Recusado", color: "error" },
};

/**
 * Formata partes de uma data ISO para chips/etiquetas (pt-PT)
 */
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

// normalizador p/ comparar categorias/locais com espaços NBSP e acentos
const norm = (s: string) =>
  s
    ?.toString()
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "";

/** ---------- Cabeçalho de card (visível) ---------- */
const CardHeader = memo(function CardHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactElement;
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

/** ---------- KPI tile ---------- */
const StatTile = memo(function StatTile({
  label,
  value,
  sublabel,
  gradient,
  icon,
  loading = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  gradient: string;
  icon?: React.ReactElement;
  loading?: boolean;
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
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minHeight: 130,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {label}
        </Typography>
        <Box sx={{ opacity: 0.9 }}>{icon}</Box>
      </Stack>
      {loading ? (
        <Skeleton
          variant="text"
          width={80}
          height={42}
          sx={{ bgcolor: "rgba(255,255,255,.4)" }}
        />
      ) : (
        <Typography variant="h4" fontWeight={900} lineHeight={1}>
          {value}
        </Typography>
      )}
      {sublabel && (
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  );
});

const ROW_STROKE = "#00000026";
const ROW_GAP = 1.25;

/** ---------- Consultas ---------- */
const ConsultaRow = memo(function ConsultaRow({ c }: { c: ConsultaLite }) {
  const iso = c.scheduledAt || c.date;
  const { day, mon, time } = parts(iso);
  const cfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default" as const,
  };

  return (
    <Box
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: ROW_STROKE,
        borderRadius: 2.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* date pill */}
        <Box
          aria-label={`Consulta a ${day} ${mon}${time ? ` às ${time}` : ""}`}
          sx={{
            width: 68,
            height: 68,
            borderRadius: 3,
            border: "1px solid",
            borderColor: ROW_STROKE,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Box textAlign="center" sx={{ lineHeight: 1 }}>
            <Typography fontWeight={900}>{day}</Typography>
            <Typography
              variant="caption"
              sx={{ textTransform: "uppercase", opacity: 0.8 }}
            >
              {mon}
            </Typography>
            {!!time && (
              <Typography
                variant="caption"
                sx={{ display: "block", opacity: 0.8 }}
              >
                {time}
              </Typography>
            )}
          </Box>
        </Box>

        {/* conteúdo */}
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900} noWrap title={c.title} component="h3">
            {c.title}
          </Typography>
          {!!c.librarianName && (
            <Typography variant="body2" noWrap sx={{ opacity: 0.8 }}>
              com {c.librarianName}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.5 }}
            useFlexGap
            flexWrap="wrap"
          >
            <Chip
              size="small"
              icon={<CalendarMonthRounded fontSize="small" />}
              label={`${day} ${mon}`}
            />
            {!!time && (
              <Chip
                size="small"
                icon={<AccessTimeRounded fontSize="small" />}
                label={time}
              />
            )}
            {!!cfg.label && (
              <Chip
                size="small"
                color={cfg.color}
                label={cfg.label}
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <RouteLink href="/consultas">Ver</RouteLink>
      </Stack>
    </Box>
  );
});

/** ---------- Eventos ---------- */
type EventItem = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  imageUrl?: string | null;
  category?: string;
  location?: string | null;
  tags?: string[];
};

const EventSlide = memo(function EventSlide({ ev }: { ev: any }) {
  const poster = (ev.imageUrl && ev.imageUrl.trim()) || EVENT_PLACEHOLDER;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        p: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgColor: "background.paper",
      }}
    >
      <Box
        component="img"
        src={poster}
        alt={ev.title}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          const img = e.currentTarget;
          if (img.src !== EVENT_PLACEHOLDER) img.src = EVENT_PLACEHOLDER;
        }}
        sx={{
          width: "100%",
          height: 120,
          objectFit: "cover",
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          display: "block",
        }}
      />

      <Typography variant="subtitle1" fontWeight={900} noWrap title={ev.title}>
        {ev.title}
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ opacity: 0.8 }}
      >
        <Chip
          size="small"
          icon={<CalendarMonthRounded fontSize="small" />}
          label={ev.date || "—"}
        />
        {ev.time ? (
          <Chip
            size="small"
            icon={<AccessTimeRounded fontSize="small" />}
            label={ev.time}
          />
        ) : null}
        {ev.location ? (
          <Chip
            size="small"
            icon={<LocationOnRounded fontSize="small" />}
            label={ev.location}
          />
        ) : null}
      </Stack>

      <Box sx={{ mt: 0.25 }}>
        <RouteLink href="/eventos">Ver eventos</RouteLink>
      </Box>
    </Box>
  );
});

function EventCarousel({
  items,
  index,
  setIndex,
}: {
  items: EventItem[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>; // ⬅️ aqui
}) {
  const len = items.length;

  const next = useCallback(
    () => setIndex((i: number) => (i + 1) % Math.max(len, 1)),
    [len, setIndex]
  );

  const prev = useCallback(
    () =>
      setIndex((i: number) => (i - 1 + Math.max(len, 1)) % Math.max(len, 1)),
    [len, setIndex]
  );

  if (!len) {
    return (
      <Typography sx={{ opacity: 0.7 }}>Nenhum evento encontrado.</Typography>
    );
  }

  return (
    <Box
      sx={{ position: "relative", width: "100%", overflow: "hidden" }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Eventos em destaque"
    >
      <EventSlide ev={items[index]} />

      {/* setas */}
      <Tooltip title="Anterior">
        <span>
          <IconButton
            aria-label="Evento anterior"
            onClick={prev}
            size="small"
            sx={{
              position: "absolute",
              left: -8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            }}
          >
            <ChevronLeftRounded fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Seguinte">
        <span>
          <IconButton
            aria-label="Próximo evento"
            onClick={next}
            size="small"
            sx={{
              position: "absolute",
              right: -8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            }}
          >
            <ChevronRightRounded fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* dots */}
      <Stack
        direction="row"
        spacing={0.75}
        justifyContent="center"
        sx={{ mt: 1 }}
        role="tablist"
        aria-label="Selecionar slide de evento"
      >
        {items.map((_, i) => (
          <Box
            key={items[i]?.id ?? i}
            onClick={() => setIndex(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Ir para evento ${i + 1}`}
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: i === index ? "text.primary" : "divider",
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

/** ---------- Sugestões ---------- */
type SuggestionWithMeta = SuggestionBookLite & {
  author?: string | null;
  ageRange?: string | null;
  category?: string | null;
};

const SuggestionCard = memo(function SuggestionCard({
  book,
  onReserve,
}: {
  book: SuggestionWithMeta;
  onReserve: () => void;
}) {
  const cover = book.coverUrl || "/placeholder-book.jpg";

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        p: 1,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        columnGap: 1.25,
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <Box
        component="img"
        src={cover}
        alt={book.title}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          const img = e.currentTarget;
          if (!img.src.includes("placeholder-book.jpg"))
            img.src = "/placeholder-book.jpg";
        }}
        sx={{
          width: 64,
          height: 90,
          objectFit: "cover",
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      />

      <Box sx={{ minWidth: 0 }}>
        <Typography
          fontWeight={900}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.15,
          }}
          title={book.title}
        >
          {book.title}
        </Typography>

        {!!book.author && (
          <Typography
            variant="body2"
            sx={{
              opacity: 0.7,
              mt: 0.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={book.author || undefined}
          >
            de {book.author}
          </Typography>
        )}

        <Box
          sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.25 }}
          aria-label="Avaliação média 4 de 5"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <StarRounded
              key={i}
              fontSize="small"
              sx={{ opacity: i < 4 ? 1 : 0.35 }}
            />
          ))}
        </Box>
      </Box>

      <Tooltip title="Reservar este livro">
        <span>
          <PrimaryButton
            onClick={onReserve}
            size="small"
            sx={{ ml: 1, whiteSpace: "nowrap" }}
            startIcon={<BookmarkAddRounded />}
          >
            Reservar
          </PrimaryButton>
        </span>
      </Tooltip>
    </Box>
  );
});

/** ---------- Página ---------- */
export default function LandingPage() {
  const theme = useTheme();
  const { user, asChild, selectedChildId } = useUserSession();

  const [badges, setBadges] = useState<BadgeLite[]>([]);
  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [leituras, setLeituras] = useState<ReadingBookLite[]>([]);
  const [sugestoes, setSugestoes] = useState<SuggestionWithMeta[]>([]);
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);

  // micro-conteúdos em destaque
  const [tips, setTips] = useState<MicroContentItem[]>([]);
  const [tipsSeen, setTipsSeen] = useState<Record<number, boolean>>({});

  // estados de carregamento finos
  const [loading, setLoading] = useState({
    eventos: true,
    leituras: true,
    consultas: true,
    badges: true,
    tips: true,
  });

  // sugestões (manual only)
  const [sugLoading, setSugLoading] = useState(false);
  const [sugUpdatedAt, setSugUpdatedAt] = useState<number | null>(null);

  // carga geral (com consultas e leituras conforme o modo)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const childIdsAll =
        (user?.children || [])
          .map((c) => Number(c.id))
          .filter((n) => Number.isFinite(n)) ?? [];

      const currentChildId = asChild
        ? Number(user?.actingChild?.id)
        : Number(selectedChildId ?? NaN);

      const userIdNum = Number(user?.id);

      // Leituras
      const leiturasPromise = asChild
        ? getLeiturasAtuais(4, { childId: currentChildId })
        : (async () => {
            if (!childIdsAll.length) return [] as ReadingBookLite[];
            const perChild = await Promise.all(
              childIdsAll.map((cid) => getLeiturasAtuais(2, { childId: cid }))
            );
            // junta e corta às 4 mais recentes (se o serviço já vier ordenado, perfeito)
            return perChild.flat().slice(0, 4) as ReadingBookLite[];
          })();

      // Consultas (só família) — serviço já usa o utilizador autenticado
      const consultasPromise =
        asChild || !Number.isFinite(userIdNum)
          ? Promise.resolve([] as ConsultaLite[])
          : getNextConsultas(6, { familyId: userIdNum });

      const badgesPromise = asChild
        ? getBadgesRecent(12, { childId: currentChildId })
        : getBadgesRecent(12, { familyId: Number(user?.id) });

      const [ev, le, co, ba] = await Promise.allSettled([
        getProximosEventos(8),
        leiturasPromise,
        consultasPromise,
        badgesPromise,
      ]);

      if (!mounted) return;

      if (ev.status === "fulfilled") setEventos(ev.value as any);
      setLoading((s) => ({ ...s, eventos: false }));

      if (le.status === "fulfilled") setLeituras(le.value as any);
      setLoading((s) => ({ ...s, leituras: false }));

      if (co.status === "fulfilled") setConsultas(co.value as any);
      else if (asChild) setConsultas([]);
      setLoading((s) => ({ ...s, consultas: false }));

      if (ba.status === "fulfilled") setBadges(ba.value as any);
      setLoading((s) => ({ ...s, badges: false }));
    })();
    return () => {
      mounted = false;
    };
  }, [
    asChild,
    selectedChildId,
    user?.actingChild?.id,
    user?.children?.length,
    user?.id,
  ]);

  // carregar 3 micro-conteúdos (preferindo DICA/BIBLIOTERAPIA)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dica = await listMicroContentsPublic({
          type: "DICA",
          page: 1,
          limit: 3,
        });
        let items = Array.isArray(dica?.items) ? dica.items : [];
        if (items.length < 3) {
          const bib = await listMicroContentsPublic({
            type: "BIBLIOTERAPIA",
            page: 1,
            limit: 3 - items.length,
          });
          items = [...items, ...(Array.isArray(bib?.items) ? bib.items : [])];
        }
        if (mounted) setTips(items.slice(0, 3) as any);
      } catch {
        if (mounted) setTips([]);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, tips: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // gerar sugestões on-demand
  const generateSuggestions = useCallback(async () => {
    if (!asChild) return;

    const cid = asChild
      ? Number(user?.actingChild?.id)
      : Number(selectedChildId ?? NaN);

    if (!cid) return;

    setSugLoading(true);
    try {
      const res = await getSugestoesPerfil(6, { childId: cid });
      setSugestoes(res as any);
      setSugUpdatedAt(Date.now());
      saveSugToCache(cid, res as any);
    } finally {
      setSugLoading(false);
    }
  }, [asChild, selectedChildId, user?.actingChild?.id]);

  // carregar da cache (sem auto-fetch)
  useEffect(() => {
    const cid = Number(
      (user?.actingChild?.id as any) ?? (selectedChildId as any)
    );
    const cached = loadSugFromCache(cid);
    if (cached) {
      setSugestoes(cached.items as any);
      setSugUpdatedAt(cached.ts);
    } else {
      setSugestoes([]);
      setSugUpdatedAt(null);
    }
  }, [asChild, selectedChildId, user?.actingChild?.id]);

  const familyName = user?.fullName ?? "Família";

  const HeroTitle = useMemo(
    () => (
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ letterSpacing: 0.3, mb: 2, lineHeight: 1.1 }}
        component="h1"
      >
        {asChild
          ? "Bem vindo de volta!"
          : `Olá, ${user?.fullName?.split(" ")[0] ?? ""}`}
      </Typography>
    ),
    [asChild, user?.fullName]
  );

  const gPrimary = useMemo(
    () =>
      `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    [theme.palette.primary.light, theme.palette.primary.main]
  );
  const gSecondary = useMemo(
    () =>
      `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
    [theme.palette.secondary.light, theme.palette.secondary.main]
  );
  const gSuccess = useMemo(
    () =>
      `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
    [theme.palette.success.light, theme.palette.success.main]
  );

  const [evCat, setEvCat] = useState<
    "Biblioteca" | "Casa da Cultura" | "Centro UNESCO"
  >("Biblioteca");

  const eventosFiltrados = useMemo(
    () =>
      eventos.filter((e: any) => {
        const base = norm(e.category || e.location || "");
        const alvo = norm(evCat);
        return base.includes(alvo);
      }),
    [eventos, evCat]
  );

  const groupedBadges = useMemo(() => {
    if (asChild) return [] as Array<{ child: string; items: BadgeLite[] }>;

    const map = new Map<string, BadgeLite[]>();
    for (const b of badges) {
      const key = b.childName || "—";
      const arr = map.get(key) || [];
      arr.push(b);
      map.set(key, arr);
    }

    // ordenar cada grupo por data desc
    const groups = Array.from(map.entries()).map(([child, items]) => ({
      child,
      items: items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.assignedAt || 0).getTime() -
            new Date(a.assignedAt || 0).getTime()
        ),
    }));

    return groups.map((g) => ({ child: g.child, items: g.items.slice(0, 4) }));
  }, [asChild, badges]);

  useEffect(() => {
    setEventIndex(0);
  }, [evCat]);

  const kpiLoading = loading.leituras || loading.eventos; // simples

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>{HeroTitle}</Box>
        <Tooltip title="Abrir notificações">
          <NotificationBell
            onClick={() => {}}
            items={[]}
            aria-label="Abrir notificações"
          />
        </Tooltip>
      </Box>

      {/* KPI tiles */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Livros a ler"
            value={`${leituras.length}`}
            sublabel="no momento"
            gradient={gPrimary}
            icon={<BookRounded />}
            loading={loading.leituras}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Sugestões novas"
            value={`${sugestoes.length}`}
            sublabel="baseadas no teu perfil"
            gradient={gSecondary}
            icon={<AutoAwesomeRounded />}
            loading={sugLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Eventos este mês"
            value={`${eventos.length}`}
            sublabel="na tua biblioteca"
            gradient={gSuccess}
            icon={<EventAvailableRounded />}
            loading={loading.eventos}
          />
        </Grid>
      </Grid>

      {/* Secções principais */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {/* Sugestões / Consultas */}
        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader
              title={asChild ? "Sugestões para ti" : "Próximas Consultas"}
              icon={asChild ? <TipsAndUpdatesRounded /> : <VerifiedRounded />}
              action={
                asChild ? (
                  <Tooltip title="Gerar novas sugestões">
                    <span>
                      <IconButton
                        size="small"
                        onClick={generateSuggestions}
                        disabled={sugLoading}
                        aria-label="Gerar novas sugestões"
                      >
                        <RefreshRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null
              }
            />
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 1,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,.15)",
                  borderRadius: 8,
                },
              }}
              aria-busy={asChild ? sugLoading : loading.consultas}
            >
              {asChild ? (
                <Stack spacing={1.25}>
                  {sugLoading && (
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.7 }}
                      aria-live="polite"
                    >
                      A gerar sugestões…
                    </Typography>
                  )}

                  {!!sugUpdatedAt && (
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                      Última geração:{" "}
                      {new Date(sugUpdatedAt).toLocaleString("pt-PT")}
                    </Typography>
                  )}

                  {sugLoading && sugestoes.length === 0 ? (
                    <>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={98} />
                      ))}
                    </>
                  ) : (
                    sugestoes.map((b, i) => (
                      <Box key={(b as any).id ?? b.isbn}>
                        <SuggestionCard
                          book={b}
                          onReserve={() => {
                            /* reservar */
                          }}
                        />
                        {i < sugestoes.length - 1 && (
                          <Divider
                            sx={{ my: 1.25, mx: 0, borderColor: "divider" }}
                          />
                        )}
                      </Box>
                    ))
                  )}

                  {!sugLoading && sugestoes.length === 0 && (
                    <Typography sx={{ opacity: 0.6 }}>
                      Sem sugestões no momento. Clica em <b>↻</b> para gerar.
                    </Typography>
                  )}
                </Stack>
              ) : loading.consultas ? (
                <Stack spacing={ROW_GAP}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={96} />
                  ))}
                </Stack>
              ) : consultas.length ? (
                <Stack
                  spacing={ROW_GAP}
                  divider={<Divider sx={{ borderColor: "divider" }} />}
                >
                  {consultas.map((c) => (
                    <ConsultaRow key={c.id} c={c} />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ opacity: 0.6 }}>
                  Sem consultas agendadas.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Eventos em Destaque */}
        <Grid item xs={12} md={5} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader
              title="Eventos em Destaque"
              icon={<EventAvailableRounded />}
            />
            {/* filtros */}
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {(
                [
                  {
                    label: "Biblioteca",
                    icon: <LocalLibraryRounded fontSize="small" />,
                  },
                  {
                    label: "Casa da Cultura",
                    icon: <TheaterComedyRounded fontSize="small" />,
                  },
                  {
                    label: "Centro UNESCO",
                    icon: <PublicRounded fontSize="small" />,
                  },
                ] as const
              ).map((c) => (
                <Chip
                  key={c.label}
                  label={c.label}
                  icon={c.icon}
                  clickable
                  color={evCat === c.label ? "primary" : "default"}
                  onClick={() => setEvCat(c.label)}
                  variant={evCat === c.label ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            {/* contentor do carrossel */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                flex: 1,
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {loading.eventos ? (
                <Skeleton variant="rounded" height={220} />
              ) : eventosFiltrados.length ? (
                <Box sx={{ width: "min(100%, 420px)" }}>
                  <EventCarousel
                    items={eventosFiltrados}
                    index={eventIndex}
                    setIndex={setEventIndex}
                  />
                </Box>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem eventos nessa categoria.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Leituras */}
        <Grid item xs={12} md={3} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader title="Leituras" icon={<BookRounded />} />
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 1,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,.15)",
                  borderRadius: 8,
                },
              }}
            >
              {loading.leituras ? (
                <Stack spacing={1}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={76} />
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {leituras.map((b, idx) => (
                    <Box key={b.id}>
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        sx={{
                          px: 1,
                          py: 1,
                          borderRadius: 2,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <img
                          src={b.coverUrl || "/placeholder-book.jpg"}
                          alt=""
                          width={46}
                          height={62}
                          style={{ borderRadius: 8, objectFit: "cover" }}
                        />
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={800} noWrap title={b.title}>
                            {b.title}
                          </Typography>
                          {!asChild && (b as any).childName && (
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              de {(b as any).childName}
                            </Typography>
                          )}
                          {!asChild && (
                            <LinearProgress
                              variant="determinate"
                              value={35 + ((idx * 15) % 50)}
                              sx={{
                                height: 6,
                                borderRadius: 999,
                                mt: 0.5,
                                mr: 1,
                              }}
                              aria-label="Progresso de leitura"
                            />
                          )}
                        </Box>
                        <RouteLink href={asChild ? "/suggestions" : "/reading"}>
                          {asChild ? "Abrir" : "Abrir"}
                        </RouteLink>
                      </Stack>
                      {idx < leituras.length - 1 && (
                        <Divider
                          sx={{ my: 1.25, mx: 0, borderColor: "divider" }}
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Área inferior esquerda: Conquistas */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard sx={{ flex: 1, minHeight: 180 }}>
            <CardHeader
              title="Conquistas Recentes"
              icon={<VerifiedRounded />}
              action={<RouteLink href="/conquistas">Ver todas</RouteLink>}
            />

            {loading.badges ? (
              <Stack direction="row" spacing={1}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" width={96} height={28} />
                ))}
              </Stack>
            ) : badges.length === 0 ? (
              <Typography sx={{ opacity: 0.6 }}>
                Ainda não há conquistas… continua a ler! 📚
              </Typography>
            ) : asChild ? (
              // --- MODO CRIANÇA: lista simples ---
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {badges.map((b) => {
                  const isTrophy = (b.type || "")
                    .toUpperCase()
                    .includes("TROF");
                  const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;
                  return (
                    <Tooltip
                      key={`${b.id}-${b.assignedAt || ""}`}
                      title={
                        b.assignedAt
                          ? new Date(b.assignedAt).toLocaleString("pt-PT")
                          : ""
                      }
                    >
                      <Chip
                        size="small"
                        variant={isTrophy ? "filled" : "outlined"}
                        icon={<Icon fontSize="small" />}
                        label={b.name}
                        sx={{ borderRadius: 3 }}
                      />
                    </Tooltip>
                  );
                })}
              </Stack>
            ) : (
              // --- MODO FAMÍLIA: AGRUPADO POR CRIANÇA ---
              <Stack spacing={1.25}>
                {groupedBadges.map(({ child, items }) => (
                  <Box key={child}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={900}
                      sx={{ mb: 0.5, opacity: 0.9 }}
                    >
                      {child}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {items.map((b) => {
                        const isTrophy = (b.type || "")
                          .toUpperCase()
                          .includes("TROF");
                        const Icon = isTrophy
                          ? EmojiEventsRounded
                          : VerifiedRounded;
                        return (
                          <Tooltip
                            key={`${child}-${b.id}-${b.assignedAt || ""}`}
                            title={
                              b.assignedAt
                                ? new Date(b.assignedAt).toLocaleString("pt-PT")
                                : ""
                            }
                          >
                            <Chip
                              size="small"
                              variant={isTrophy ? "filled" : "outlined"}
                              icon={<Icon fontSize="small" />}
                              label={b.name}
                              sx={{ borderRadius: 3 }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </WhiteCard>
        </Grid>

        {/* Área inferior direita: Dicas & Biblioterapia */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: 400,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardHeader
              title="Dicas & Biblioterapia"
              icon={<TipsAndUpdatesRounded />}
              action={<RouteLink href="/contents">Ver mais</RouteLink>}
            />

            {/* 🔽 content area com scroll para não crescer o card */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 1,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,.15)",
                  borderRadius: 8,
                },
              }}
            >
              {loading.tips ? (
                <Stack spacing={1.25}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={88} />
                  ))}
                </Stack>
              ) : tips.length === 0 ? (
                <Typography sx={{ opacity: 0.6 }}>
                  Sem conteúdos no momento.
                </Typography>
              ) : (
                <Stack spacing={1.25} divider={<Divider />}>
                  {tips.map((mc) => {
                    const seen =
                      (mc as any).seen === true ||
                      Number((mc as any).interactionsCount || 0) > 0 ||
                      tipsSeen[mc.id];

                    return (
                      <Box key={mc.id}>
                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          flexWrap="wrap"
                          alignItems="center"
                          sx={{ mb: 0.5 }}
                        >
                          <Chip size="small" color="primary" label={mc.type} />
                          {mc.tags.slice(0, 3).map((t) => (
                            <Chip
                              key={t}
                              size="small"
                              label={t}
                              variant="outlined"
                            />
                          ))}
                          {mc.library ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Biblioteca: ${mc.library.name}`}
                            />
                          ) : null}
                          {seen ? (
                            <Chip size="small" color="success" label="Visto" />
                          ) : null}
                        </Stack>

                        <Typography
                          sx={{
                            whiteSpace: "pre-wrap",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {mc.text}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                          <Button
                            size="small"
                            onClick={async () => {
                              if (seen) return;
                              await markMicroContentSeen(mc.id);
                              setTipsSeen((m) => ({ ...m, [mc.id]: true }));
                            }}
                            disabled={seen}
                            startIcon={<VerifiedRounded />}
                          >
                            {seen ? "Visto" : "Marcar como visto"}
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

/**
 * Alexandre Brrissos 21131
 * Descrição: Landing page dividida em hooks e subcomponentes pequenos (<30 linhas).
 * - Carrega leituras, consultas, eventos, badges e micro-conteúdos
 * - Gera sugestões on-demand (com cache em localStorage)
 * - Acessibilidade básica em carrossel e labels
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  NotificationBell,
  PrimaryButton,
  RouteLink,
} from "@bibliotecario/ui-web";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  LinearProgress,
  Tooltip,
  IconButton,
  Button,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useUserSession } from "@/contexts/UserSession";
import { useTheme } from "@mui/material/styles";
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

import { getLeiturasAtuais } from "@/services/readings";
import type { BookLite as ReadingBookLite } from "@/services/readings";

import { getProximosEventos } from "@/services/events";
import { getSugestoesPerfil } from "@/services/books";
import type { BookLite as SuggestionBookLite } from "@/services/books";
import { getNextConsultas, type ConsultaLite } from "@/services/consultations";
import { getBadgesRecent, type BadgeLite } from "@/services/badges";

import {
  listMicroContentsPublic,
  markMicroContentSeen,
} from "@/services/microcontent";
import type { MicroContentItem } from "@/services/microcontent";

import EVENT_PLACEHOLDER from "@/assets/placeholder-event.jpg";

/* ---------- Constantes & helpers pequenos ---------- */

const TOP_CARD_H = "clamp(360px, 50vh, 440px)";
const ROW_STROKE = "#00000026";
const ROW_GAP = 1.25;

const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmado", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusado", color: "error" },
  CANCELLED: { label: "Cancelado", color: "default" },
  COMPLETED: { label: "Concluída", color: "success" },
  CONFIRMADO: { label: "Confirmado", color: "success" },
  PENDENTE: { label: "Pendente", color: "warning" },
  RECUSADO: { label: "Recusado", color: "error" },
};

function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

const norm = (s: string) =>
  s
    ?.toString()
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "";

// id válido (>0)
const validId = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* ---------- cache local para sugestões ---------- */
const sugKey = (childId?: number) => `sug:cache:${childId ?? "anon"}`;
function loadSugFromCache(
  childId?: number
): { items: any[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(sugKey(childId));
    const j = raw ? JSON.parse(raw) : null;
    return j?.items && Array.isArray(j.items) ? j : null;
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

/* =========================================================================
   Subcomponentes pequenos (UI)
   ========================================================================= */

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

const EventSlide = memo(function EventSlide({ ev }: { ev: EventItem }) {
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
  setIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const len = items.length;
  const next = useCallback(
    () => setIndex((i) => (i + 1) % Math.max(len, 1)),
    [len, setIndex]
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + Math.max(len, 1)) % Math.max(len, 1)),
    [len, setIndex]
  );

  if (!len)
    return (
      <Typography sx={{ opacity: 0.7 }}>Nenhum evento encontrado.</Typography>
    );

  return (
    <Box
      sx={{ position: "relative", width: "100%", overflow: "hidden" }}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Eventos em destaque"
    >
      <EventSlide ev={items[index]} />
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

/* =========================================================================
   Hooks pequenos (carregamentos)
   ========================================================================= */

function useLoadEvents() {
  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const arr = await getProximosEventos(8);
        if (alive) setEventos(Array.isArray(arr) ? (arr as EventItem[]) : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { eventos, loading };
}

/** ============== NOVO: leituras agrupadas por filho ============== */
type GroupedLeituras = {
  childId: number;
  childName: string;
  items: ReadingBookLite[];
};

function useLoadLeiturasGrouped(asChild: boolean, user?: any | null) {
  const [groups, setGroups] = useState<GroupedLeituras[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const actingChildId = validId(user?.actingChild?.id);
  const actingChildName =
    user?.actingChild?.name ||
    (user?.children || []).find((c: any) => Number(c.id) === actingChildId)
      ?.name ||
    "Criança";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (asChild) {
          const cid = actingChildId;
          if (!cid) {
            if (alive) {
              setGroups([]);
              setTotalCount(0);
            }
            return;
          }
          const arr = await getLeiturasAtuais(8, { childId: cid });
          const list = Array.isArray(arr) ? (arr as ReadingBookLite[]) : [];
          if (!alive) return;
          setGroups([{ childId: cid, childName: actingChildName, items: list }]);
          setTotalCount(list.length);
          return;
        }

        // família → por todos os filhos
        const kids: Array<{ id: number; name: string }> = (user?.children || [])
          .map((c: any) => ({
            id: Number(c.id),
            name: c?.name ?? "Criança",
          }))
         
        if (!kids.length) {
          if (alive) {
            setGroups([]);
            setTotalCount(0);
          }
          return;
        }

        const results = await Promise.allSettled(
          kids.map((k) => getLeiturasAtuais(8, { childId: k.id }))
        );

        if (!alive) return;

        const built: GroupedLeituras[] = [];
        let sum = 0;

        results.forEach((res, idx) => {
          const k = kids[idx];
          const list =
            res.status === "fulfilled" && Array.isArray(res.value)
              ? (res.value as ReadingBookLite[])
              : [];
          sum += list.length;
          built.push({ childId: k.id, childName: k.name, items: list });
        });

        setGroups(built);
        setTotalCount(sum);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [asChild, actingChildId, actingChildName, JSON.stringify(user?.children || [])]);

  return { groups, totalCount, loading };
}

/** ---------------- consultas (família só) ---------------- */
function useLoadConsultas(asChild: boolean, familyId?: number | null) {
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fid = validId(familyId);
        const data =
          !asChild && fid
            ? await getNextConsultas(6, { familyId: fid })
            : [];
        if (alive) setConsultas(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [asChild, familyId]);

  return { consultas, loading };
}

/** ---------------- badges ---------------- */
function useLoadBadges(
  asChild: boolean,
  familyId?: number | null,
  childId?: number | null
) {
  const [badges, setBadges] = useState<BadgeLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cid = validId(childId);
        const fid = validId(familyId);
        let data: BadgeLite[] = [];
        if (asChild && cid) {
          data = await getBadgesRecent(12, { childId: cid });
        } else if (!asChild && fid) {
          data = await getBadgesRecent(12, { familyId: fid });
        } else {
          data = [];
        }
        if (alive) setBadges(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [asChild, familyId, childId]);

  return { badges, loading };
}

/** ---------------- micro-conteúdos ---------------- */
function useLoadTips() {
  const [tips, setTips] = useState<MicroContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
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
        if (alive) setTips(items.slice(0, 3) as MicroContentItem[]);
      } catch {
        if (alive) setTips([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { tips, loading };
}

/** ---------------- sugestões (on-demand) ---------------- */
function useSuggestions(asChild: boolean, currentChildId?: number | null) {
  const [sugestoes, setSugestoes] = useState<SuggestionWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const cid = Number(currentChildId || NaN);
    const cached = loadSugFromCache(cid);
    if (cached) {
      setSugestoes(cached.items as any);
      setUpdatedAt(cached.ts);
    } else {
      setSugestoes([]);
      setUpdatedAt(null);
    }
  }, [asChild, currentChildId]);

  const generate = useCallback(async () => {
    if (!asChild || !currentChildId) return;
    setLoading(true);
    try {
      const res = await getSugestoesPerfil(6, { childId: currentChildId });
      const list = Array.isArray(res) ? res : (res as any)?.items ?? [];
      setSugestoes(list as any);
      setUpdatedAt(Date.now());
      saveSugToCache(currentChildId, list as any);
    } finally {
      setLoading(false);
    }
  }, [asChild, currentChildId]);

  return { sugestoes, loading, updatedAt, generate };
}

/* =========================================================================
   Secções (peças de layout)
   ========================================================================= */

function HeaderBar({ title }: { title: React.ReactNode }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Box>{title}</Box>
      <Tooltip title="Abrir notificações">
        <NotificationBell
          onClick={() => {}}
          items={[]}
          aria-label="Abrir notificações"
        />
      </Tooltip>
    </Box>
  );
}

function KpiTiles({
  leiturasCount,
  sugCount,
  eventosCount,
  loadingLeituras,
  loadingSugestoes,
  loadingEventos,
}: {
  leiturasCount: number;
  sugCount: number;
  eventosCount: number;
  loadingLeituras: boolean;
  loadingSugestoes: boolean;
  loadingEventos: boolean;
}) {
  const theme = useTheme();
  const g = (main: string, light: string) =>
    `linear-gradient(135deg, ${main} 0%, ${light} 100%)`;
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} md={4}>
        <StatTile
          label="Leituras concluidas"
          value={`${leiturasCount}`}
          sublabel="no momento"
          gradient={g(theme.palette.primary.main, theme.palette.primary.light)}
          icon={<BookRounded />}
          loading={loadingLeituras}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <StatTile
          label="Sugestões novas"
          value={`${sugCount}`}
          sublabel="baseadas no teu perfil"
          gradient={g(
            theme.palette.secondary.main,
            theme.palette.secondary.light
          )}
          icon={<AutoAwesomeRounded />}
          loading={loadingSugestoes}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <StatTile
          label="Eventos este mês"
          value={`${eventosCount}`}
          sublabel="na tua biblioteca"
          gradient={g(theme.palette.success.main, theme.palette.success.light)}
          icon={<EventAvailableRounded />}
          loading={loadingEventos}
        />
      </Grid>
    </Grid>
  );
}

function SuggestionsPanel({
  sugestoes,
  loading,
  updatedAt,
  onGenerate,
}: {
  sugestoes: SuggestionWithMeta[];
  loading: boolean;
  updatedAt: number | null;
  onGenerate: () => void;
}) {
  return (
    <>
      <CardHeader
        title="Sugestões para ti"
        icon={<TipsAndUpdatesRounded />}
        action={
          <Tooltip title="Gerar novas sugestões">
            <span>
              <IconButton
                size="small"
                onClick={onGenerate}
                disabled={loading}
                aria-label="Gerar novas sugestões"
              >
                <RefreshRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
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
        aria-busy={loading}
      >
        <Stack spacing={1.25}>
          {loading && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              A gerar sugestões…
            </Typography>
          )}
          {!!updatedAt && (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Última geração: {new Date(updatedAt).toLocaleString("pt-PT")}
            </Typography>
          )}
          {loading && !sugestoes.length
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={98} />
              ))
            : (sugestoes || []).map((b, i) => (
                <Box key={(b as any).isbn ?? (b as any).id ?? i}>
                  <SuggestionCard book={b as any} onReserve={() => {}} />
                  {i < (sugestoes?.length || 0) - 1 && (
                    <Divider sx={{ my: 1.25, mx: 0, borderColor: "divider" }} />
                  )}
                </Box>
              ))}
          {!loading && !sugestoes.length && (
            <Typography sx={{ opacity: 0.6 }}>
              Sem sugestões no momento. Clica em <b>↻</b> para gerar.
            </Typography>
          )}
        </Stack>
      </Box>
    </>
  );
}

function ConsultasPanel({
  consultas,
  loading,
}: {
  consultas: ConsultaLite[];
  loading: boolean;
}) {
  const list = Array.isArray(consultas) ? consultas : [];
  return (
    <>
      <CardHeader title="Próximas Consultas" icon={<VerifiedRounded />} />
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
        {loading ? (
          <Stack spacing={ROW_GAP}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={96} />
            ))}
          </Stack>
        ) : list.length ? (
          <Stack
            spacing={ROW_GAP}
            divider={<Divider sx={{ borderColor: "divider" }} />}
          >
            {list.map((c) => (
              <ConsultaRow key={c.id} c={c} />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ opacity: 0.6 }}>
            Sem consultas agendadas.
          </Typography>
        )}
      </Box>
    </>
  );
}

function EventosSection({
  eventos,
  loading,
}: {
  eventos: EventItem[];
  loading: boolean;
}) {
  const [evCat, setEvCat] = useState<
    "Biblioteca" | "Casa da Cultura" | "Centro UNESCO"
  >("Biblioteca");
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => setEventIndex(0), [evCat]);

  const filtrados = useMemo(
    () =>
      eventos.filter((e) =>
        norm(e.category || e.location || "").includes(norm(evCat))
      ),
    [eventos, evCat]
  );

  return (
    <>
      <CardHeader
        title="Eventos em Destaque"
        icon={<EventAvailableRounded />}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {[
          {
            label: "Biblioteca",
            icon: <LocalLibraryRounded fontSize="small" />,
          },
          {
            label: "Casa da Cultura",
            icon: <TheaterComedyRounded fontSize="small" />,
          },
          { label: "Centro UNESCO", icon: <PublicRounded fontSize="small" /> },
        ].map((c) => (
          <Chip
            key={c.label}
            label={c.label}
            icon={c.icon}
            clickable
            color={evCat === (c.label as any) ? "primary" : "default"}
            onClick={() => setEvCat(c.label as any)}
            variant={evCat === (c.label as any) ? "filled" : "outlined"}
          />
        ))}
      </Stack>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {loading ? (
          <Skeleton variant="rounded" height={220} />
        ) : filtrados.length ? (
          <Box sx={{ width: "min(100%, 420px)" }}>
            <EventCarousel
              items={filtrados}
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
    </>
  );
}

/** ============== SECÇÃO LEITURAS (agora agrupa por filho) ============== */
function LeiturasSection({
  asChild,
  groups,
  loading,
}: {
  asChild: boolean;
  groups: GroupedLeituras[];
  loading: boolean;
}) {
  const childGroups = Array.isArray(groups) ? groups : [];

  // modo criança → renderiza só o primeiro grupo (a criança ativa)
  const renderList = (list: ReadingBookLite[]) => (
    <Stack spacing={1}>
      {(Array.isArray(list) ? list : []).map((b, idx) => (
        <Box key={b.id ?? `${b.title}-${idx}`}>
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
            </Box>
            <RouteLink href={asChild ? "/suggestions" : "/reading"}>
              Abrir
            </RouteLink>
          </Stack>
          {idx < (list.length || 0) - 1 && (
            <Divider sx={{ my: 1.25, mx: 0, borderColor: "divider" }} />
          )}
        </Box>
      ))}
    </Stack>
  );

  return (
    <>
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
        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={76} />
            ))}
          </Stack>
        ) : asChild ? (
          renderList(childGroups[0]?.items || [])
        ) : (
          <>
            {childGroups.filter((g) => (g.items || []).length > 0).length ===
            0 ? (
              <Typography sx={{ opacity: 0.6 }}>
                Sem leituras ativas nos teus filhos.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {childGroups.map((g) =>
                  (g.items || []).length ? (
                    <Box key={g.childId}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={900}
                        sx={{ mb: 0.75, opacity: 0.9 }}
                      >
                        {g.childName}
                      </Typography>
                      {renderList(g.items)}
                    </Box>
                  ) : null
                )}
              </Stack>
            )}
          </>
        )}
      </Box>
    </>
  );
}

function ConquistasSection({
  badges,
  loading,
  asChild,
}: {
  badges: BadgeLite[];
  loading: boolean;
  asChild: boolean;
}) {
  const grouped = useMemo(() => {
    if (asChild) return [] as Array<{ child: string; items: BadgeLite[] }>;
    const map = new Map<string, BadgeLite[]>();
    for (const b of badges) {
      const key = b.childName || "—";
      const arr = map.get(key) || [];
      arr.push(b);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([child, items]) => ({
      child,
      items: items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.assignedAt || 0).getTime() -
            new Date(a.assignedAt || 0).getTime()
        )
        .slice(0, 4),
    }));
  }, [asChild, badges]);

  return (
    <WhiteCard sx={{ flex: 1, minHeight: 180 }}>
      <CardHeader
        title="Conquistas Recentes"
        icon={<VerifiedRounded />}
        action={<RouteLink href="/conquistas">Ver todas</RouteLink>}
      />
      {loading ? (
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
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {badges.map((b, i) => {
            const isTrophy = (b.type || "").toUpperCase().includes("TROF");
            const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;
            const safeKey = `badge-${b.childId ?? "self"}-${b.name ?? "?"}-${
              b.assignedAt ?? i
            }-${i}`;
            return (
              <Tooltip
                key={safeKey}
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
        <Stack spacing={1.25}>
          {grouped.map(({ child, items }) => (
            <Box key={child}>
              <Typography
                variant="subtitle2"
                fontWeight={900}
                sx={{ mb: 0.5, opacity: 0.9 }}
              >
                {child}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {items.map((b, i) => {
                  const isTrophy = (b.type || "")
                    .toUpperCase()
                    .includes("TROF");
                  const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;
                  const safeKey = `${child}-badge-${b.name ?? "?"}-${
                    b.assignedAt ?? i
                  }-${i}`;
                  return (
                    <Tooltip
                      key={safeKey}
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
  );
}

function TipsSection() {
  const { tips, loading } = useLoadTips();
  const [tipsSeen, setTipsSeen] = useState<Record<number, boolean>>({});

  return (
    <WhiteCard
      sx={{ flex: 1, height: 400, display: "flex", flexDirection: "column" }}
    >
      <CardHeader
        title="Dicas & Biblioterapia"
        icon={<TipsAndUpdatesRounded />}
        action={<RouteLink href="/contents">Ver mais</RouteLink>}
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
      >
        {loading ? (
          <Stack spacing={1.25}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={88} />
            ))}
          </Stack>
        ) : !tips.length ? (
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
                      <Chip key={t} size="small" label={t} variant="outlined" />
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
  );
}

/* =========================================================================
   Página principal (curta)
   ========================================================================= */

export default function LandingPage() {
  const { user, asChild } = useUserSession();

  const currentChildId = useMemo(
    () => (asChild ? Number(user?.actingChild?.id) || null : null),
    [asChild, user?.actingChild?.id]
  );

  const { eventos, loading: loadingEventos } = useLoadEvents();

  // 👉 leituras por filho
  const {
    groups: leituraGrupos,
    totalCount: leiturasTotal,
    loading: loadingLeituras,
  } = useLoadLeiturasGrouped(asChild, user);

  const { consultas, loading: loadingConsultas } = useLoadConsultas(
    asChild,
    user?.id
  );
  const { badges, loading: loadingBadges } = useLoadBadges(
    asChild,
    user?.id,
    currentChildId
  );
  const {
    sugestoes,
    loading: loadingSug,
    updatedAt,
    generate,
  } = useSuggestions(asChild, currentChildId);

  const hero = useMemo(
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

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <HeaderBar title={hero} />

      <KpiTiles
        leiturasCount={leiturasTotal}
        sugCount={sugestoes.length}
        eventosCount={eventos.length}
        loadingLeituras={loadingLeituras}
        loadingSugestoes={loadingSug}
        loadingEventos={loadingEventos}
      />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {asChild ? (
              <SuggestionsPanel
                sugestoes={sugestoes}
                loading={loadingSug}
                updatedAt={updatedAt}
                onGenerate={generate}
              />
            ) : (
              <ConsultasPanel
                consultas={consultas}
                loading={loadingConsultas}
              />
            )}
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={5} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <EventosSection eventos={eventos} loading={loadingEventos} />
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={3} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <LeiturasSection
              asChild={asChild}
              groups={leituraGrupos}
              loading={loadingLeituras}
            />
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <ConquistasSection
            badges={badges}
            loading={loadingBadges}
            asChild={asChild}
          />
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <TipsSection />
        </Grid>
      </Grid>
    </Container>
  );
}

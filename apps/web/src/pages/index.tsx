// apps/web/src/pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  NotificationBell,
  BookCard,
  SectionDivider,
  PrimaryButton,
  RouteLink,
  AvatarSelect,
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
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useUserSession } from "../contexts/UserSession";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import StarRounded from "@mui/icons-material/StarRounded";

import { getProximosEventos } from "../services/events";
import {
  getLeiturasAtuais,
  getSugestoes,
  type BookLite,
} from "../services/books";
import { getNextConsultas, type ConsultaLite } from "../services/consultations";

// Placeholder para eventos sem imagem
import EVENT_PLACEHOLDER from "../assets/placeholder-event.jpg";

const TOP_CARD_H = "clamp(360px, 50vh, 440px)";

/** ---------- helpers ---------- */

// config visual dos estados
const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMADO: { label: "Confirmado", color: "success" },
  PENDENTE: { label: "Pendente", color: "warning" },
  RECUSADO: { label: "Recusado", color: "error" },
};

// partir um ISO em partes legíveis
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** ---------- KPI tile ---------- */
function StatTile({
  label,
  value,
  sublabel,
  gradient,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  gradient: string;
  icon?: React.ReactNode;
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
      <Typography variant="h4" fontWeight={900} lineHeight={1}>
        {value}
      </Typography>
      {sublabel && (
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  );
}

const ROW_STROKE = "#00000026";
const ROW_GAP = 1.25;

/** ---------- Consultas (da API) ---------- */
function ConsultaRow({ c }: { c: ConsultaLite }) {
  const iso = c.scheduledAt || c.date;
  const { day, mon, time } = parts(iso);
  const cfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default",
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
          <Typography fontWeight={900} noWrap title={c.title}>
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
}

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

function EventSlide({ ev }: { ev: any }) {
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
          height: 120, // ↓ mais pequeno
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

      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        {ev.date || "—"}
        {ev.time ? ` · ${ev.time}` : ""}
      </Typography>

      <Box sx={{ mt: 0.25 }}>
        <RouteLink href="/eventos">Ver eventos</RouteLink>
      </Box>
    </Box>
  );
}

// Carrossel simples 1-slide com setas e dots
function EventCarousel({
  items,
  index,
  setIndex,
}: {
  items: EventItem[];
  index: number;
  setIndex: (n: number) => void;
}) {
  if (!items.length) {
    return (
      <Typography sx={{ opacity: 0.7 }}>Nenhum evento encontrado.</Typography>
    );
  }

  const next = () => setIndex((index + 1) % items.length);
  const prev = () => setIndex((index - 1 + items.length) % items.length);

  return (
    <Box sx={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <EventSlide ev={items[index]} />

      {/* setas */}
      <Box
        onClick={prev}
        sx={{
          position: "absolute",
          left: -8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          placeItems: "center",
          bgcolor: "background.paper",
          cursor: "pointer",
          userSelect: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,.12)",
          zIndex: 1,
        }}
      >
        ‹
      </Box>
      <Box
        onClick={next}
        sx={{
          position: "absolute",
          right: -8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          placeItems: "center",
          bgcolor: "background.paper",
          cursor: "pointer",
          userSelect: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,.12)",
          zIndex: 1,
        }}
      >
        ›
      </Box>

      {/* dots */}
      <Stack
        direction="row"
        spacing={0.75}
        justifyContent="center"
        sx={{ mt: 1 }}
      >
        {items.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
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

/** ---------- Página ---------- */
export default function LandingPage() {
  const theme = useTheme();
  const {
    user,
    asChild,
    selectedChildId,
    setSelectedChildId,
    actAsChild,
    exitChild,
  } = useUserSession();

  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [eventIndex, setEventIndex] = useState(0);

  const [leituras, setLeituras] = useState<BookLite[]>([]);
  const [sugestoes, setSugestoes] = useState<BookLite[]>([]);
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);

  useEffect(() => {
    (async () => {
      const [ev, le, su, co] = await Promise.allSettled([
        getProximosEventos(8),
        getLeiturasAtuais(4),
        getSugestoes(6),
        getNextConsultas(6),
      ]);

      if (ev.status === "fulfilled") setEventos(ev.value as EventItem[]);
      if (le.status === "fulfilled") setLeituras(le.value);
      if (su.status === "fulfilled") setSugestoes(su.value);
      if (co.status === "fulfilled") setConsultas(co.value);
    })();
  }, []);

  const familyName = user?.fullName ?? "Família";
  const roleLabel = (user?.roles?.[0] ?? "").toString();

  const childOptions = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name,
    avatar: c.avatarUrl || undefined,
  }));

  const HeroTitle = useMemo(
    () => (
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ letterSpacing: 0.3, mb: 2, lineHeight: 1.1 }}
      >
        {asChild
          ? "Bem vindo de volta!"
          : `Olá, ${user?.fullName?.split(" ")[0] ?? ""}`}
      </Typography>
    ),
    [asChild, user?.fullName]
  );

  // Gradients com as tuas cores
  const gPrimary = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`;
  const gSecondary = `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`;
  const gSuccess = `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`;

  const [evCat, setEvCat] = useState<
    "Biblioteca" | "Casa da Cultura" | "Centro UNESCO"
  >("Biblioteca");

  const norm = (s: string) =>
    s
      ?.toString()
      .replace(/\u00A0/g, " ") // NBSP -> espaço normal
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "") // tira acentos
      .replace(/\s+/g, " ") // colapsa espaços
      .trim()
      .toLowerCase() || "";

  const eventosFiltrados = useMemo(
    () =>
      eventos.filter((e: any) => {
        const base = norm(e.category || e.location || "");
        const alvo = norm(evCat);
        // aceita "biblioteca", "biblioteca municipal", etc.
        return base.includes(alvo);
      }),
    [eventos, evCat]
  );
  // quando mudas de categoria, volta ao 1º slide
  useEffect(() => {
    setEventIndex(0);
  }, [evCat]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>{HeroTitle}</Box>
        <NotificationBell onClick={() => {}} items={[]} />
      </Box>

      {/* Barra de contexto */}
      {!!user?.children?.length && (
        <WhiteCard sx={{ mt: 1.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar
                src={
                  asChild
                    ? user?.actingChild?.avatarUrl ?? undefined
                    : undefined
                }
                sx={{ width: 44, height: 44 }}
              />
              <Box>
                <Typography fontWeight={800}>
                  {asChild && user?.actingChild
                    ? user.actingChild.name
                    : `Família ${familyName}`}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {asChild ? "Modo criança" : roleLabel || "Família"}
                </Typography>
              </Box>
            </Stack>

            <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />

            <AvatarSelect
              label={asChild ? "A atuar como" : "Escolher criança"}
              options={childOptions}
              value={selectedChildId}
              onChange={async (id) => {
                setSelectedChildId(id);
                if (asChild) await actAsChild(id);
              }}
              minWidth={240}
            />

            <Box sx={{ flex: 1 }} />
            {asChild ? (
              <PrimaryButton onClick={exitChild}>
                Sair do modo criança
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={() => actAsChild(Number(selectedChildId))}
                disabled={!selectedChildId}
              >
                Entrar como criança
              </PrimaryButton>
            )}
          </Stack>
        </WhiteCard>
      )}

      {/* KPI tiles */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Livros a ler"
            value={`${leituras.length}`}
            sublabel="no momento"
            gradient={gPrimary}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Sugestões novas"
            value={`${sugestoes.length}`}
            sublabel="baseadas no teu perfil"
            gradient={gSecondary}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatTile
            label="Eventos este mês"
            value={`${eventos.length}`}
            sublabel="na tua biblioteca"
            gradient={gSuccess}
          />
        </Grid>
      </Grid>

      {/* Secções principais */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {/* Sugestões / Consultas */}
        <Grid item xs={12} md={4} sx={{ display: "flex" }}>
          <WhiteCard
            title={asChild ? "Sugestões para ti" : "Próximas Consultas"}
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              {asChild ? (
                <Stack spacing={1}>
                  {sugestoes.map((b, i) => (
                    <Box key={b.id}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          px: 1,
                          py: 1,
                          borderRadius: 2,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <BookCard
                          variant="reserve"
                          title={b.title}
                          coverImage={b.coverUrl || "/placeholder-book.jpg"}
                          rating={5}
                          onReserve={() => {}}
                        />
                        <RouteLink href="/suggestions">Reservar</RouteLink>
                      </Stack>
                      {i < sugestoes.length - 1 && <Divider sx={{ my: 0.5 }} />}
                    </Box>
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
            title="Eventos em Destaque"
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* filtros */}
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {(
                ["Biblioteca", "Casa da Cultura", "Centro UNESCO"] as const
              ).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  clickable
                  color={evCat === c ? "primary" : "default"}
                  onClick={() => setEvCat(c)}
                  variant={evCat === c ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            {/* contentor do carrossel - sempre dentro do pai */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                flex: 1,
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {eventosFiltrados.length ? (
                <Box
                  sx={{ width: "min(100%, 420px)" /* ↓ slide mais pequeno */ }}
                >
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
            title="Leituras"
            sx={{
              flex: 1,
              height: TOP_CARD_H,
              display: "flex",
              flexDirection: "column",
            }}
          >
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
                        {!asChild && (
                          <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {b.date || ""}
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
                          />
                        )}
                      </Box>
                      <RouteLink href={asChild ? "/suggestions" : "/leituras"}>
                        {asChild ? "Reservar" : "Abrir"}
                      </RouteLink>
                    </Stack>
                    {idx < leituras.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </Box>
                ))}
              </Stack>
            </Box>
          </WhiteCard>
        </Grid>

        {/* Área inferior */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard
            title="Conquistas Recentes"
            sx={{ flex: 1, minHeight: 180 }}
          >
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Primeira Leitura" />
              <Chip label="3 livros numa semana" />
              <Chip label="Streak todos os dias" />
            </Stack>
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard title="Atividade recente" sx={{ flex: 1, minHeight: 180 }}>
            <Stack spacing={1}>
              <Typography variant="body2">
                ✅ Reserva efetuada em{" "}
                <strong>“{sugestoes[0]?.title ?? "—"}”</strong>
              </Typography>
              <Divider />
              <Typography variant="body2">
                📚 Progresso atualizado em{" "}
                <strong>“{leituras[0]?.title ?? "—"}”</strong>
              </Typography>
              <Divider />
              <Typography variant="body2">
                📅 Confirmou presença no evento{" "}
                <strong>“{eventos[0]?.title ?? "—"}”</strong>
              </Typography>
            </Stack>
          </WhiteCard>
        </Grid>
      </Grid>

      <SectionDivider label="" sx={{ my: 4 }} />
    </Container>
  );
}

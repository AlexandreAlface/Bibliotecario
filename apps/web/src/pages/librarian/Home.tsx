import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  Skeleton,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import PendingActionsRounded from "@mui/icons-material/PendingActionsRounded";
import AvTimerRounded from "@mui/icons-material/AvTimerRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";

import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "../../contexts/UserSession";

import {
  getNextConsultas,
  getConsultationsHistory,
  listOpenSlots,
  type ConsultaLite,
  type SlotLite,
  type ConsultationFull,
} from "../../services/consultations";

/* ---------- helpers ---------- */
const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmada", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusada", color: "error" },
  CANCELLED: { label: "Cancelada", color: "default" },
  COMPLETED: { label: "Concluída", color: "success" },
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", hhmm: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    hhmm: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ---------- Header card ---------- */
function CardHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
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
        <Typography variant="h6" fontWeight={900}>
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
}

/* ---------- KPI tile ---------- */
function StatTile({
  label,
  value,
  sublabel,
  icon,
  gradient,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  gradient: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        color: "#fff",
        background: gradient,
        boxShadow: "0 12px 28px rgba(0,0,0,.18)",
        border: "1px solid rgba(255,255,255,.15)",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        gap: 1,
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

/* ---------- Skeletons ---------- */
function KPISkeleton() {
  return <Skeleton variant="rounded" height={120} />;
}
function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ p: 1, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={64} />
        </Box>
      ))}
    </Stack>
  );
}

/* ---------- linhas ---------- */
function ConsultaRow({ c }: { c: ConsultaLite }) {
  const iso = c.scheduledAt || c.date || undefined;
  const { day, mon, hhmm } = parts(iso);
  const cfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default",
  };

  return (
    <Box
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
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
            {!!hhmm && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {hhmm}
              </Typography>
            )}
          </Box>
        </Box>

        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900} noWrap title={c.title}>
            {c.title}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.5 }}
            useFlexGap
            flexWrap="wrap"
          >
            {!!(c as any).childName && (
              <Chip
                size="small"
                icon={<PersonRounded fontSize="small" />}
                label={`de ${(c as any).childName}`}
              />
            )}
            {!!(c as any).library?.name && (
              <Chip
                size="small"
                icon={<PlaceRounded fontSize="small" />}
                label={(c as any).library?.name}
                variant="outlined"
              />
            )}
            {!!iso && (
              <Chip
                size="small"
                icon={<CalendarMonthRounded fontSize="small" />}
                label={new Date(iso).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              />
            )}
            {!!hhmm && (
              <Chip
                size="small"
                icon={<AccessTimeRounded fontSize="small" />}
                label={hhmm}
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

        <Button
          size="small"
          variant="outlined"
          component={RouteLink as any}
          href="/librarian/agenda"
        >
          Abrir
        </Button>
      </Stack>
    </Box>
  );
}

function PendingRow({ c }: { c: ConsultationFull }) {
  const when = c.startAt || c.requestedAt || null;
  const dt = when ? new Date(when) : null;
  const scfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default",
  };
  return (
    <Box
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          variant="outlined"
          color={scfg.color}
          label={scfg.label}
          icon={<PendingActionsRounded fontSize="small" />}
        />
        <Chip
          size="small"
          icon={<CalendarMonthRounded fontSize="small" />}
          label={dt ? dt.toLocaleDateString("pt-PT") : "—"}
        />
        {dt && (
          <Chip
            size="small"
            icon={<AccessTimeRounded fontSize="small" />}
            label={dt.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}
        {c.child?.name && (
          <Chip
            size="small"
            icon={<PersonRounded fontSize="small" />}
            label={`de ${c.child.name}`}
            variant="outlined"
          />
        )}
        {c.library?.name && (
          <Chip
            size="small"
            icon={<PlaceRounded fontSize="small" />}
            label={c.library.name}
            variant="outlined"
          />
        )}
      </Stack>
    </Box>
  );
}

function SlotRow({
  s,
  librariesMap,
}: {
  s: SlotLite;
  librariesMap: Map<number, string>;
}) {
  const a = new Date(s.startAt);
  const b = new Date(s.endAt);

  const libName =
    s.libraryId != null
      ? librariesMap.get(s.libraryId) ?? `Biblioteca #${s.libraryId}`
      : undefined;

  return (
    <Box
      sx={{
        p: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
      >
        <Chip
          size="small"
          icon={<CalendarMonthRounded fontSize="small" />}
          label={a.toLocaleDateString("pt-PT")}
        />
        <Chip
          size="small"
          icon={<AccessTimeRounded fontSize="small" />}
          label={`${a.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })} — ${b.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}`}
        />
        {!!libName && <Chip size="small" variant="outlined" label={libName} />}
      </Stack>
    </Box>
  );
}

/* =================== Página =================== */
const VISIBLE_UPCOMING = 8;
const VISIBLE_PENDING = 8;
const VISIBLE_SLOTS = 8;

export default function LibrarianHome() {
  const theme = useTheme();
  const { user } = useUserSession();
  const librarianId = Number(user?.id) || 0;

  // datasets
  const [upcoming, setUpcoming] = useState<ConsultaLite[]>([]);
  const [pending, setPending] = useState<ConsultationFull[]>([]);
  const [openSlots, setOpenSlots] = useState<SlotLite[]>([]);
  const [loading, setLoading] = useState(false);

  // KPI counts
  const today = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(today, 7));

  const kpiToday = useMemo(
    () =>
      upcoming.filter((c) => fmtYMD(c.scheduledAt || c.date) === fmtYMD(today))
        .length,
    [upcoming]
  );
  const kpiWeek = useMemo(
    () =>
      upcoming.filter((c) => {
        const iso = c.scheduledAt || c.date;
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return t >= today.getTime() && t <= weekEnd.getTime();
      }).length,
    [upcoming] // eslint-disable-line
  );

  // mapper: libraryId -> name (derivado das consultas carregadas)
  const librariesMap = useMemo(() => {
    const m = new Map<number, string>();

    const collect = (arr: Array<ConsultaLite | ConsultationFull>) => {
      for (const c of arr || []) {
        const lid = Number(
          ((c as any)?.library?.id ?? (c as any)?.libraryId ?? NaN) as number
        );
        const lname = (c as any)?.library?.name as string | undefined;

        if (Number.isFinite(lid) && lname) m.set(lid, lname);
      }
    };

    collect(upcoming as any);
    collect(pending as any);

    return m;
  }, [upcoming, pending]);

  const gPrimary = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`;
  const gWarning = `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`;
  const gSuccess = `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`;

  async function loadAll() {
    if (!librarianId) return;

    try {
      setLoading(true);

      const now = new Date();
      const twoWeeks = addDays(now, 14);

      const [co, pend, slots] = await Promise.allSettled([
        getNextConsultas(24, { librarianId }), // traz mais, mostramos parte
        getConsultationsHistory({
          librarianId,
          status: ["PENDING"],
          limit: 24,
          order: "asc",
          from: startOfDay(addDays(now, -30)).toISOString(),
          to: endOfDay(addDays(now, 30)).toISOString(),
        }),
        listOpenSlots({
          librarianId,
          from: startOfDay(now).toISOString(),
          to: endOfDay(twoWeeks).toISOString(),
        }),
      ]);

      if (co.status === "fulfilled") setUpcoming(co.value || []);
      else setUpcoming([]);

      if (pend.status === "fulfilled") setPending((pend.value as any) || []);
      else setPending([]);

      if (slots.status === "fulfilled") setOpenSlots(slots.value || []);
      else setOpenSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId]);

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Olá{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void loadAll()}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          {loading ? (
            <KPISkeleton />
          ) : (
            <StatTile
              label="Consultas hoje"
              value={kpiToday}
              sublabel="na sua agenda"
              gradient={gPrimary}
              icon={<TodayRounded />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <KPISkeleton />
          ) : (
            <StatTile
              label="Consultas (7 dias)"
              value={kpiWeek}
              sublabel="confirmadas e pendentes"
              gradient={gSuccess}
              icon={<EventAvailableRounded />}
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? (
            <KPISkeleton />
          ) : (
            <StatTile
              label="Pendências"
              value={pending.length}
              sublabel="a aguardar decisão"
              gradient={gWarning}
              icon={<PendingActionsRounded />}
            />
          )}
        </Grid>
      </Grid>

      {/* conteúdo */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {/* Próximos compromissos */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 240,
            }}
          >
            <CardHeader
              title="Próximas consultas"
              icon={<EventAvailableRounded fontSize="small" />}
              action={
                <Button
                  size="small"
                  variant="text"
                  component={RouteLink as any}
                  href="/librarian/agenda"
                >
                  Ver agenda
                </Button>
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
            >
              {loading ? (
                <ListSkeleton rows={4} />
              ) : upcoming.length ? (
                <>
                  <Stack
                    spacing={1.25}
                    divider={<Divider sx={{ borderColor: "divider" }} />}
                  >
                    {upcoming.slice(0, VISIBLE_UPCOMING).map((c) => (
                      <ConsultaRow key={c.id} c={c} />
                    ))}
                  </Stack>
                  {upcoming.length > VISIBLE_UPCOMING && (
                    <Box sx={{ mt: 1.25, textAlign: "right" }}>
                      <Button
                        size="small"
                        component={RouteLink as any}
                        href="/librarian/agenda"
                      >
                        Ver todas ({upcoming.length})
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem consultas agendadas.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Pendentes */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 240,
            }}
          >
            <CardHeader
              title="Consultas pendentes"
              icon={<PendingActionsRounded fontSize="small" />}
              action={
                <Button
                  size="small"
                  variant="text"
                  component={RouteLink as any}
                  href="/librarian/consultas/pendentes"
                >
                  Gerir
                </Button>
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
            >
              {loading ? (
                <ListSkeleton rows={4} />
              ) : pending.length ? (
                <>
                  <Stack
                    spacing={1.25}
                    divider={<Divider sx={{ borderColor: "divider" }} />}
                  >
                    {pending.slice(0, VISIBLE_PENDING).map((c) => (
                      <PendingRow key={c.id} c={c} />
                    ))}
                  </Stack>
                  {pending.length > VISIBLE_PENDING && (
                    <Box sx={{ mt: 1.25, textAlign: "right" }}>
                      <Button
                        size="small"
                        component={RouteLink as any}
                        href="/librarian/consultas/pendentes"
                      >
                        Ver todas ({pending.length})
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem pendências no momento.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Slots abertos (14 dias) */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
          <WhiteCard
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 220,
            }}
          >
            <CardHeader
              title="Slots abertos (14 dias)"
              icon={<AvTimerRounded fontSize="small" />}
              action={
                <Button
                  size="small"
                  variant="text"
                  component={RouteLink as any}
                  href="/librarian/slots"
                >
                  Gerir slots
                </Button>
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
            >
              {loading ? (
                <ListSkeleton rows={4} />
              ) : openSlots.length ? (
                <>
                  <Stack
                    spacing={1.25}
                    divider={<Divider sx={{ borderColor: "divider" }} />}
                  >
                    {openSlots.slice(0, VISIBLE_SLOTS).map((s) => (
                      <SlotRow
                        key={`${s.id}-${s.startAt}`}
                        s={s}
                        librariesMap={librariesMap}
                      />
                    ))}
                  </Stack>
                  {openSlots.length > VISIBLE_SLOTS && (
                    <Box sx={{ mt: 1.25, textAlign: "right" }}>
                      <Button
                        size="small"
                        component={RouteLink as any}
                        href="/librarian/slots"
                      >
                        Ver mais slots ({openSlots.length - VISIBLE_SLOTS})
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Não há slots abertos nos próximos 14 dias.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

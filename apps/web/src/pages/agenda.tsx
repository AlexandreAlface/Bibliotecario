// apps/web/src/pages/agenda.tsx
import { useEffect, useMemo, useState } from "react";
import { WhiteCard, RouteLink, AvatarSelect } from "@bibliotecario/ui-web";
import type { AvatarOption } from "@bibliotecario/ui-web";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";

import { useUserSession } from "../contexts/UserSession";
import { getNextConsultas, type ConsultaLite } from "../services/consultations";

const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmado", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusado", color: "error" },
  CANCELLED: { label: "Cancelado", color: "default" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ---------- Header util ---------- */
function CardHeader({
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
      sx={{ mb: 1.25 }}
    >
      <Typography variant="h6" fontWeight={900}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

/* ---------- Linha de consulta ---------- */
function ConsultaRow({ c, onClick }: { c: ConsultaLite; onClick: () => void }) {
  const iso = c.scheduledAt || c.date;
  const { day, mon, time } = parts(iso);
  const cfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default",
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
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

/* =================== Página =================== */
export default function AgendasPage() {
  const theme = useTheme();
  // ⚠️ Não usamos selectedChildId/setSelectedChildId aqui.
  const { user, asChild } = useUserSession();

  // filtro LOCAL (modo família): não altera contexto global
  const [localChildId, setLocalChildId] = useState<string | undefined>(undefined);

  const [monthRef, setMonthRef] = useState(startOfDay(new Date()));
  const [consultasRaw, setConsultasRaw] = useState<ConsultaLite[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(fmtYMD(new Date()));
  const [focused, setFocused] = useState<ConsultaLite | null>(null);

  // opções base (usado só em modo família) — garantir sempre nome:string e avatar?:string
  const childBaseOptions: AvatarOption[] = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name ?? "",
    avatar: (c as any).avatarUrl ?? undefined,
  }));
  const selectOptions: AvatarOption[] = [
    { id: "", nome: "Todos os filhos", avatar: undefined },
    ...childBaseOptions,
  ];

  // Carregar consultas:
  // - Modo criança → por actingChild
  // - Modo família → por família; opcionalmente filtrar por localChildId
  useEffect(() => {
    (async () => {
      try {
        let items: ConsultaLite[] = [];
        if (asChild) {
          const cid = Number((user?.actingChild?.id as any) ?? NaN);
          if (!Number.isFinite(cid)) {
            setConsultasRaw([]);
            return;
          }
          items = await getNextConsultas(60, { childId: cid });
        } else {
          const famId = Number(user?.id);
          if (!Number.isFinite(famId)) {
            setConsultasRaw([]);
            return;
          }
          const opts: { familyId: number; childId?: number } = { familyId: famId };
          if (localChildId && localChildId !== "") {
            const cid = Number(localChildId);
            if (Number.isFinite(cid)) opts.childId = cid;
          }
          items = await getNextConsultas(60, opts);
        }
        setConsultasRaw(items);
      } catch (e) {
        console.error("Falha a carregar consultas:", e);
        setConsultasRaw([]);
      }
    })();
  }, [asChild, user?.actingChild?.id, user?.id, localChildId]);

  // Agrupar por dia (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = new Map<string, ConsultaLite[]>();
    for (const c of consultasRaw) {
      const k = fmtYMD(c.scheduledAt || c.date);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(c);
      map.set(k, arr);
    }
    return map;
  }, [consultasRaw]);

  // Se o dia atual estiver vazio, salta para a 1ª consulta
  useEffect(() => {
    if (!consultasRaw.length) return;
    const sorted = [...consultasRaw].sort(
      (a, b) =>
        new Date(a.scheduledAt || a.date || 0).getTime() -
        new Date(b.scheduledAt || b.date || 0).getTime()
    );
    const firstISO = sorted[0]?.scheduledAt || sorted[0]?.date;
    if (!firstISO) return;
    const ymd = fmtYMD(firstISO);
    const hasTodayItems = (byDay.get(selectedDate) || []).length > 0;
    if (!hasTodayItems) {
      setSelectedDate(ymd);
      setMonthRef(startOfDay(new Date(ymd)));
    }
  }, [consultasRaw, byDay, selectedDate]);

  // cor da “bolinha” por estado
  const dotColor = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "CONFIRMED") return theme.palette.success.main;
    if (s === "PENDING") return theme.palette.warning.main;
    if (s === "DECLINED") return theme.palette.error.main;
    if (s === "CANCELLED") return theme.palette.grey[400];
    return theme.palette.divider;
  };

  // dias do mês
  const month = useMemo(() => {
    const d0 = new Date(monthRef);
    d0.setDate(1);
    const firstWeekday = (d0.getDay() + 6) % 7; // 0=Mon
    const dEnd = new Date(d0);
    dEnd.setMonth(dEnd.getMonth() + 1);
    dEnd.setDate(0);
    const total = dEnd.getDate();

    const cells: { ymd: string; inMonth: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ ymd: "", inMonth: false });
    for (let day = 1; day <= total; day++) {
      const d = new Date(d0);
      d.setDate(day);
      cells.push({ ymd: fmtYMD(d), inMonth: true });
    }
    while (cells.length % 7) cells.push({ ymd: "", inMonth: false });

    return {
      title: d0.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }),
      cells,
    };
  }, [monthRef]);

  const dayList = useMemo(
    () => byDay.get(selectedDate) || [],
    [byDay, selectedDate]
  );

  useEffect(() => {
    setFocused(dayList[0] ?? null);
  }, [selectedDate, dayList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = () => {
    const d = new Date(monthRef);
    d.setMonth(d.getMonth() - 1);
    setMonthRef(startOfDay(d));
  };
  const goNext = () => {
    const d = new Date(monthRef);
    d.setMonth(d.getMonth() + 1);
    setMonthRef(startOfDay(d));
  };
  const goToday = () => {
    const today = startOfDay(new Date());
    setMonthRef(today);
    setSelectedDate(fmtYMD(today));
  };

  const titleLeft = "Agenda";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Título */}
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2, letterSpacing: 0.3 }}>
        {titleLeft}
      </Typography>

      {/* -------- Topo: criança -------- */}
      {/* Modo FAMÍLIA → seletor local (não muda active user) */}
      {!asChild && !!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="Escolher criança" />
          <AvatarSelect
            label="Filtrar por criança"
            options={selectOptions}
            value={localChildId ?? ""}           // "" = todos
            onChange={(id?: string) => setLocalChildId(id)}
            minWidth={320}
          />
        </WhiteCard>
      )}

      {/* Modo CRIANÇA → apenas mostra quem está ativo (sem escolher) */}
      {asChild && user?.actingChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="A atuar como" />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              src={(user.actingChild as any).avatarUrl || undefined}
              sx={{ width: 36, height: 36 }}
            />
            <Typography fontWeight={900}>{user.actingChild.name}</Typography>
          </Stack>
        </WhiteCard>
      )}

      <Grid container spacing={2}>
        {/* Coluna 1: Calendário */}
        <Grid item xs={12} md={6}>
          <WhiteCard>
            <CardHeader
              title={month.title.charAt(0).toUpperCase() + month.title.slice(1)}
              action={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={goPrev} aria-label="Mês anterior">
                    <ChevronLeftRounded />
                  </IconButton>
                  <IconButton onClick={goNext} aria-label="Mês seguinte">
                    <ChevronRightRounded />
                  </IconButton>
                  <IconButton onClick={goToday} aria-label="Hoje">
                    <TodayRounded />
                  </IconButton>
                </Stack>
              }
            />

            {/* grelha */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
              }}
            >
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((h) => (
                <Box key={h} sx={{ px: 1, py: 0.5, opacity: 0.7, fontWeight: 700 }}>
                  {h}
                </Box>
              ))}

              {month.cells.map((c, i) => {
                const items = c.ymd ? byDay.get(c.ymd) ?? [] : [];
                const isSelected = c.ymd === selectedDate;
                const dayNum = c.ymd ? Number(c.ymd.split("-")[2]) : "";
                const extra = Math.max(0, items.length - 2);

                return (
                  <Box
                    key={i}
                    onClick={() => c.inMonth && c.ymd && setSelectedDate(c.ymd)}
                    sx={{
                      p: 1,
                      minHeight: 84,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      opacity: c.inMonth ? 1 : 0.3,
                      cursor: c.inMonth ? "pointer" : "default",
                    }}
                  >
                    <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                      {dayNum}
                    </Typography>

                    {/* bolinhas coloridas por estado */}
                    {items.slice(0, 2).map((it, idx) => {
                      const ccor = dotColor(it.status);
                      return (
                        <Box
                          key={idx}
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: "2px solid",
                            borderColor: ccor,
                            bgcolor: ccor,
                            display: "inline-block",
                            mr: 0.5,
                            opacity: 0.9,
                          }}
                          title={`${it.title} — ${
                            STATUS_CFG[(it.status || "").toUpperCase()]?.label ?? it.status
                          }`}
                        />
                      );
                    })}

                    {items.length === 0 && (
                      <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        — livre
                      </Typography>
                    )}

                    {extra > 0 && (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ ml: 0.25, opacity: 0.7 }}
                        title={`${items.length} consultas`}
                      >
                        +{extra}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Coluna 2: Lista do dia */}
        <Grid item xs={12} md={3}>
          <WhiteCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardHeader
              title={new Date(selectedDate).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
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
              {dayList.length ? (
                <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {dayList.map((c) => (
                    <ConsultaRow key={c.id} c={c} onClick={() => setFocused(c)} />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>Sem consultas neste dia.</Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>

        {/* Coluna 3: Detalhe */}
        <Grid item xs={12} md={3}>
          <WhiteCard>
            <CardHeader title="Detalhe" />
            {focused ? (
              <>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
                  {focused.title}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
                  <Chip
                    icon={<CalendarMonthRounded fontSize="small" />}
                    label={new Date(focused.scheduledAt || focused.date || "").toLocaleDateString(
                      "pt-PT",
                      { day: "2-digit", month: "2-digit", year: "numeric" }
                    )}
                  />
                  <Chip
                    icon={<AccessTimeRounded fontSize="small" />}
                    label={new Date(focused.scheduledAt || focused.date || "").toLocaleTimeString(
                      "pt-PT",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  />
                  {!!focused.status && (
                    <Chip
                      label={
                        STATUS_CFG[(focused.status || "").toUpperCase()]?.label || focused.status
                      }
                      color={
                        STATUS_CFG[(focused.status || "").toUpperCase()]?.color || "default"
                      }
                      variant="outlined"
                    />
                  )}
                </Stack>

                {!!focused.librarianName && (
                  <Typography sx={{ mb: 1.5 }}>
                    Bibliotecário: <b>{focused.librarianName}</b>
                  </Typography>
                )}

                <RouteLink href="/consultas">Abrir página de consultas</RouteLink>
              </>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>Selecione uma consulta.</Typography>
            )}
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

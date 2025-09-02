// apps/web/src/pages/agenda.tsx
import { useEffect, useMemo, useState } from "react";
import { WhiteCard, RouteLink, AvatarSelect } from "@bibliotecario/ui-web";
import {
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
  const { user, asChild, selectedChildId, setSelectedChildId, actAsChild } =
    useUserSession();

  const [monthRef, setMonthRef] = useState(startOfDay(new Date())); // âncora do mês
  const [consultasRaw, setConsultasRaw] = useState<ConsultaLite[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(fmtYMD(new Date()));
  const [focused, setFocused] = useState<ConsultaLite | null>(null);

  // opções do seletor
  const childBaseOptions = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name,
    avatar: (c as any).avatarUrl || undefined,
  }));

  // em modo família adicionamos a opção "Todos os filhos"
  const selectOptions = asChild
    ? childBaseOptions
    : [{ id: "", nome: "Todos os filhos" }, ...childBaseOptions];

  const valueForSelect = asChild ? selectedChildId : selectedChildId ?? "";

  // Carregar consultas (família; filtra por criança somente se houver filtro)
  useEffect(() => {
    (async () => {
      const famIdNum = Number(user?.id);
      if (!Number.isFinite(famIdNum)) return; // espera por sessão

      // child ativo: em modo criança é o actingChild; em família é o filtro opcional
      const rawId =
        (asChild ? (user?.actingChild?.id as any) : undefined) ??
        (selectedChildId as any);
      const hasChild =
        rawId !== undefined && rawId !== null && String(rawId) !== "";
      const activeChildId = hasChild ? Number(rawId) : NaN;

      const opts: { familyId?: number; childId?: number } = {
        familyId: famIdNum,
      };
      if (Number.isFinite(activeChildId)) opts.childId = activeChildId;

      try {
        const items = await getNextConsultas(60, opts);
        setConsultasRaw(items);
      } catch (e) {
        console.error("Falha a carregar consultas:", e);
        setConsultasRaw([]);
      }
    })();
  }, [asChild, user?.actingChild?.id, selectedChildId, user?.id]);

  // filtragem por criança quando em MODO FAMÍLIA (opcional)
  const consultas = useMemo(() => {
    if (asChild) return consultasRaw;
    const cid = selectedChildId ? Number(selectedChildId) : NaN;
    if (Number.isFinite(cid)) {
      return consultasRaw.filter((c) => Number((c as any).childId) === cid);
    }
    return consultasRaw;
  }, [asChild, consultasRaw, selectedChildId]);

  // Agrupar por dia (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = new Map<string, ConsultaLite[]>();
    for (const c of consultas) {
      const k = fmtYMD(c.scheduledAt || c.date);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(c);
      map.set(k, arr);
    }
    return map;
  }, [consultas]);

  // Assim que houver consultas, salta para o mês/dia da 1ª (se o dia atual estiver vazio)
  useEffect(() => {
    if (!consultas.length) return;
    const sorted = [...consultas].sort(
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
  }, [consultas, byDay, selectedDate]);

  // cor da “bolinha” por estado
  const dotColor = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "CONFIRMED") return theme.palette.success.main;
    if (s === "PENDING") return theme.palette.warning.main;
    if (s === "DECLINED") return theme.palette.error.main;
    if (s === "CANCELLED") return theme.palette.grey[400];
    return theme.palette.divider;
  };

  // dias do mês corrente (inclui “vazios” para quadrícula)
  const month = useMemo(() => {
    const d0 = new Date(monthRef);
    d0.setDate(1);
    const firstWeekday = (d0.getDay() + 6) % 7; // 0=Mon
    const dEnd = new Date(d0);
    dEnd.setMonth(dEnd.getMonth() + 1);
    dEnd.setDate(0);
    const total = dEnd.getDate();

    const cells: { ymd: string; inMonth: boolean }[] = [];

    // blanks antes
    for (let i = 0; i < firstWeekday; i++)
      cells.push({ ymd: "", inMonth: false });
    // dias
    for (let day = 1; day <= total; day++) {
      const d = new Date(d0);
      d.setDate(day);
      cells.push({ ymd: fmtYMD(d), inMonth: true });
    }
    // pad múltiplo de 7
    while (cells.length % 7) cells.push({ ymd: "", inMonth: false });

    return {
      title: d0.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }),
      cells,
    };
  }, [monthRef]);

  // lista do painel do meio
  const dayList = useMemo(
    () => byDay.get(selectedDate) || [],
    [byDay, selectedDate]
  );

  // quando muda o dia, focar a primeira
  useEffect(() => {
    setFocused(dayList[0] ?? null);
  }, [selectedDate, dayList.length]);

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
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        {titleLeft}
      </Typography>

      {/* -------- Seletor de criança em WhiteCard -------- */}
      {!!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title={asChild ? "A atuar como" : "Escolher criança"} />
          <AvatarSelect
            label={asChild ? "A atuar como" : "Filtrar por criança"}
            options={selectOptions}
            value={valueForSelect ?? ""} // <- força string
            onChange={async (id: string) => {
              // <- tipa como string
              const eff = id && String(id).length ? String(id) : ""; // '' = todos os filhos

              if (asChild && eff) {
                // se o teu actAsChild espera número, usa Number(eff)
                await actAsChild(eff as any);
              }
              // em modo família apenas filtra; '' mantém "todos"
              setSelectedChildId(eff); // <- agora é sempre string
            }}
            minWidth={320}
          />
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
                <Box
                  key={h}
                  sx={{ px: 1, py: 0.5, opacity: 0.7, fontWeight: 700 }}
                >
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
                            STATUS_CFG[(it.status || "").toUpperCase()]
                              ?.label ?? it.status
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
          <WhiteCard
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
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
                <Stack
                  spacing={1.25}
                  divider={<Divider sx={{ borderColor: "divider" }} />}
                >
                  {dayList.map((c) => (
                    <ConsultaRow
                      key={c.id}
                      c={c}
                      onClick={() => setFocused(c)}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem consultas neste dia.
                </Typography>
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

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 1.5 }}
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Chip
                    icon={<CalendarMonthRounded fontSize="small" />}
                    label={new Date(
                      focused.scheduledAt || focused.date || ""
                    ).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  />
                  <Chip
                    icon={<AccessTimeRounded fontSize="small" />}
                    label={new Date(
                      focused.scheduledAt || focused.date || ""
                    ).toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                  {!!focused.status && (
                    <Chip
                      label={
                        STATUS_CFG[(focused.status || "").toUpperCase()]
                          ?.label || focused.status
                      }
                      color={
                        STATUS_CFG[(focused.status || "").toUpperCase()]
                          ?.color || "default"
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

                <RouteLink href="/consultas">
                  Abrir página de consultas
                </RouteLink>
              </>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>
                Selecione uma consulta.
              </Typography>
            )}
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

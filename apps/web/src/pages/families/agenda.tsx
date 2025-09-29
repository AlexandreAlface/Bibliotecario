// apps/web/src/pages/agendas.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { flushSync } from "react-dom";
import {
  WhiteCard,
  RouteLink,
  AvatarSelect,
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-web";
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
  Skeleton,
  Tooltip,
  Dialog,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";

import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import EventNoteRounded from "@mui/icons-material/EventNoteRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import EditCalendarRounded from "@mui/icons-material/EditCalendarRounded";
import LaunchRounded from "@mui/icons-material/LaunchRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";

import { useUserSession } from "../../contexts/UserSession";
import {
  getNextConsultas,
  type ConsultaLite,
  listFamilyProposals,
  acceptProposal,
  declineProposal,
  listOpenSlots,
  createProposalForConsultation,
  cancelConsultation,
  getConsultation,
} from "../../services/consultations";
import type { SlotLite } from "../../services/consultations";

/* ---------- Status config com ícones ---------- */
type StatusCfg = {
  label: string;
  color: "success" | "warning" | "error" | "default";
  Icon?: React.ElementType;
};
const STATUS_CFG: Record<string, StatusCfg> = {
  CONFIRMED: {
    label: "Confirmado",
    color: "success",
    Icon: CheckCircleRounded,
  },
  PENDING: { label: "Pendente", color: "warning", Icon: ScheduleRounded },
  DECLINED: { label: "Recusado", color: "error", Icon: CancelRounded },
  CANCELLED: { label: "Cancelado", color: "default", Icon: BlockRounded },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/* ---------- helpers de UI ---------- */
function CardHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Typography
        variant="h6"
        fontWeight={900}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        {icon}
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
  const raw = (c.status || "").toUpperCase();
  const cfg = STATUS_CFG[raw] || { label: c.status || "", color: "default" };
  const Ico = (cfg as any).Icon as React.ElementType | undefined;

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
                icon={Ico ? <Ico fontSize="small" /> : undefined}
                color={cfg.color}
                label={cfg.label}
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <RouteLink href="/consultas">
          Ver{" "}
          <LaunchRounded style={{ verticalAlign: "middle", marginLeft: 4 }} />
        </RouteLink>
      </Stack>
    </Box>
  );
}

/* =================== Página =================== */
export default function AgendasPage() {
  const theme = useTheme();
  const { user, asChild } = useUserSession();

  // filtro LOCAL (modo família)
  const [localChildId, setLocalChildId] = useState<string | undefined>();
  const [monthRef, setMonthRef] = useState(startOfDay(new Date()));
  const [consultasRaw, setConsultasRaw] = useState<ConsultaLite[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(fmtYMD(new Date()));
  const [focused, setFocused] = useState<ConsultaLite | null>(null);

  // ---- propostas de reagendamento (família) ----
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [errProps, setErrProps] = useState<string | null>(null);

  // diálogo de contra-proposta (controlado)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<{
    consultationId: number;
    librarianId: number;
    declineProposalId?: number;
  } | null>(null);

  const [busyProposal, setBusyProposal] = useState<number | null>(null);
  const [busyDetail, setBusyDetail] = useState<"reschedule" | "cancel" | null>(
    null
  );

  // diálogo de cancelamento (custom)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ConsultaLite | null>(null);

  const openRescheduleDialog = useCallback(
    (
      consultationId: number,
      librarianId: number,
      declineProposalId?: number
    ) => {
      flushSync(() => {
        setDialogData({ consultationId, librarianId, declineProposalId });
        setDialogOpen(true);
      });
    },
    []
  );

  async function reloadFamilyProposals() {
    if (asChild) return setProposals([]);
    const famId = Number(user?.id);
    if (!Number.isFinite(famId)) return setProposals([]);
    const res = await listFamilyProposals(famId, {
      status: "PENDING",
      limit: 50,
    });
    setProposals(res?.items || []);
  }

  // recarregar calendário/lista
  async function reloadConsultas() {
    try {
      let items: ConsultaLite[] = [];
      if (asChild) {
        const cid = Number((user?.actingChild?.id as any) ?? NaN);
        if (!Number.isFinite(cid)) return setConsultasRaw([]);
        items = await getNextConsultas(60, { childId: cid });
      } else {
        const famId = Number(user?.id);
        if (!Number.isFinite(famId)) return setConsultasRaw([]);
        const opts: { familyId: number; childId?: number } = {
          familyId: famId,
        };
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
  }

  const fDate = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const fTime = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const fmtRange = (a?: string, b?: string) => {
    if (!a || !b) return "Sem horário";
    const A = new Date(a),
      B = new Date(b);
    return `${fDate.format(A)}, ${fTime.format(A)} — ${fTime.format(B)}`;
  };

  useEffect(() => {
    (async () => {
      const famId = Number(user?.id);
      if (!Number.isFinite(famId)) return;
      try {
        setLoadingProps(true);
        const res = await listFamilyProposals(famId, {
          status: "PENDING",
          limit: 50,
        });
        setProposals(res?.items || []);
        setErrProps(null);
      } catch (e: any) {
        setErrProps(e?.message || "Falha a carregar propostas");
        setProposals([]);
      } finally {
        setLoadingProps(false);
      }
    })();
  }, [user?.id, asChild]);

  useEffect(() => {
    if (asChild) {
      setProposals([]);
      setErrProps(null);
      setLoadingProps(false);
    }
  }, [asChild]);

  const childBaseOptions: AvatarOption[] = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name ?? "",
    avatar: (c as any).avatarUrl ?? undefined,
  }));
  const selectOptions: AvatarOption[] = [
    { id: "", nome: "Todos os filhos", avatar: undefined },
    ...childBaseOptions,
  ];

  useEffect(() => {
    reloadConsultas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asChild, user?.actingChild?.id, user?.id, localChildId]);

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

  const dotColor = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "CONFIRMED") return theme.palette.success.main;
    if (s === "PENDING") return theme.palette.warning.main;
    if (s === "DECLINED") return theme.palette.error.main;
    if (s === "CANCELLED") return theme.palette.grey[400];
    return theme.palette.divider;
  };

  const month = useMemo(() => {
    const d0 = new Date(monthRef);
    d0.setDate(1);
    const firstWeekday = (d0.getDay() + 6) % 7; // 0=Mon
    const dEnd = new Date(d0);
    dEnd.setMonth(dEnd.getMonth() + 1);
    dEnd.setDate(0);
    const total = dEnd.getDate();

    const cells: { ymd: string; inMonth: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++)
      cells.push({ ymd: "", inMonth: false });
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

  async function handleConfirmCancel(reason?: string) {
    if (!cancelTarget) return;
    try {
      setBusyDetail("cancel");
      await cancelConsultation(cancelTarget.id, reason);
      await reloadConsultas();
      await reloadFamilyProposals();
      setCancelOpen(false);
      setCancelTarget(null);
      alert("Consulta cancelada.");
    } catch (e: any) {
      alert(e?.message || "Não foi possível cancelar a consulta.");
    } finally {
      setBusyDetail(null);
    }
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{
          mb: 2,
          letterSpacing: 0.3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <EventNoteRounded fontSize="large" />
        {titleLeft}
      </Typography>

      {/* ---- Pedidos de reagendamento (família) ---- */
      /* Barra extra com ícone e tooltips */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader
            title="Pedidos de reagendamento"
            icon={<EventRepeatRounded />}
            action={
              <Tooltip title="Atualizar pedidos">
                <span>
                  <IconButton
                    onClick={() => void reloadFamilyProposals()}
                    disabled={loadingProps}
                  >
                    <EventRepeatRounded />
                  </IconButton>
                </span>
              </Tooltip>
            }
          />
          {errProps && (
            <Typography color="error" sx={{ mb: 1 }}>
              {errProps}
            </Typography>
          )}
          {loadingProps && (
            <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
          )}
          {!loadingProps && proposals.length === 0 && (
            <Typography sx={{ opacity: 0.7 }}>
              Sem propostas pendentes.
            </Typography>
          )}

          <Stack spacing={1.25}>
            {proposals.map((p) => {
              const who =
                p.proposedBy === "LIBRARIAN"
                  ? "Proposta do bibliotecário"
                  : p.proposedBy === "FAMILY"
                  ? "Proposta da família"
                  : "Proposta do sistema";

              const title = p.consultation?.child?.name
                ? `Consulta de ${p.consultation.child.name}`
                : `Consulta com ${
                    p.consultation?.librarian?.fullName ?? "bibliotecário"
                  }`;

              const cId = p.consultation?.id;
              const libId = p.consultation?.librarian?.id;

              return (
                <Box
                  key={p.id}
                  sx={{
                    p: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box minWidth={220}>
                    <Typography fontWeight={900}>{title}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {who}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {fmtRange(p.toStartAt, p.toEndAt)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {p.proposedBy === "LIBRARIAN" ? (
                      <>
                        <PrimaryButton
                          onClick={async () => {
                            try {
                              setBusyProposal(p.id);
                              await acceptProposal(p.id);
                              await reloadFamilyProposals();
                              await reloadConsultas();
                              alert("Proposta aceite.");
                            } catch (e: any) {
                              alert(e?.message || "Falha ao aceitar.");
                            } finally {
                              setBusyProposal(null);
                            }
                          }}
                          startIcon={<CheckCircleRounded />}
                          disabled={busyProposal === p.id}
                        >
                          Aceitar
                        </PrimaryButton>

                        <SecondaryButton
                          onClick={() => {
                            if (!cId || !libId) {
                              alert(
                                "Não foi possível identificar a consulta/bibliotecário."
                              );
                              return;
                            }
                            openRescheduleDialog(cId, Number(libId), p.id);
                          }}
                          startIcon={<EditCalendarRounded />}
                          disabled={busyProposal === p.id}
                        >
                          Propor outro horário
                        </SecondaryButton>

                        <SecondaryButton
                          onClick={async () => {
                            try {
                              setBusyProposal(p.id);
                              await declineProposal(p.id);
                              await reloadFamilyProposals();
                              alert("Proposta recusada.");
                            } catch (e: any) {
                              alert(e?.message || "Falha ao recusar.");
                            } finally {
                              setBusyProposal(null);
                            }
                          }}
                          startIcon={<CancelRounded />}
                          variant="outlined"
                          disabled={busyProposal === p.id}
                        >
                          Recusar
                        </SecondaryButton>
                      </>
                    ) : (
                      <>
                        <SecondaryButton
                          onClick={() => {
                            if (!cId || !libId) {
                              alert(
                                "Não foi possível identificar a consulta/bibliotecário."
                              );
                              return;
                            }
                            openRescheduleDialog(cId, Number(libId), p.id);
                          }}
                          startIcon={<EditCalendarRounded />}
                          disabled={busyProposal === p.id}
                        >
                          Editar horário
                        </SecondaryButton>

                        <SecondaryButton
                          onClick={async () => {
                            try {
                              setBusyProposal(p.id);
                              await declineProposal(p.id);
                              await reloadFamilyProposals();
                              alert("Proposta cancelada.");
                            } catch (e: any) {
                              alert(
                                e?.message || "Falha ao cancelar proposta."
                              );
                            } finally {
                              setBusyProposal(null);
                            }
                          }}
                          startIcon={<CancelRounded />}
                          variant="outlined"
                          disabled={busyProposal === p.id}
                        >
                          Cancelar proposta
                        </SecondaryButton>
                      </>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </WhiteCard>
      )}

      {/* -------- Dialog para contra-proposta -------- */}
      <SlotPickerDialog
        open={dialogOpen}
        librarianId={dialogData?.librarianId ?? 0}
        onClose={() => {
          setDialogOpen(false);
          setDialogData(null);
        }}
        onPick={async (slot) => {
          try {
            if (dialogData?.declineProposalId) {
              await declineProposal(dialogData.declineProposalId);
            }
            if (dialogData?.consultationId) {
              await createProposalForConsultation(dialogData.consultationId, {
                toStartAt: slot.startAt,
                toEndAt: slot.endAt,
                proposedBy: "FAMILY",
              });
            }
            setDialogOpen(false);
            setDialogData(null);
            await reloadFamilyProposals();
            alert("Proposta enviada.");
          } catch (e: any) {
            const m = String(e?.message || "");
            if (m.includes("pending_proposal")) {
              alert(
                "Já existe uma proposta pendente. Cancele-a antes de propor outra."
              );
            } else if (m.includes("invalid_state")) {
              alert("Esta consulta não pode ser reagendada.");
            } else if (m.includes("invalid_dates")) {
              alert("Intervalo inválido.");
            } else {
              alert("Não foi possível propor. Tente novamente.");
            }
          }
        }}
      />

      {/* -------- Topo: criança -------- */}
      {!asChild && !!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="Escolher criança" icon={<PeopleAltRounded />} />
          <AvatarSelect
            label="Filtrar por criança"
            options={selectOptions}
            value={localChildId ?? ""} // "" = todos
            onChange={(id?: string) => setLocalChildId(id)}
            minWidth={320}
          />
        </WhiteCard>
      )}

      {/* Modo CRIANÇA → apenas mostra quem está ativo (sem escolher) */}
      {asChild && user?.actingChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <CardHeader title="A atuar como" icon={<PersonRounded />} />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              src={(user.actingChild as any).avatarUrl || undefined}
              sx={{ width: 36, height: 36 }}
            />
            <Typography fontWeight={900}>{user.actingChild.name}</Typography>
            <Chip size="small" label="Modo criança" variant="outlined" />
          </Stack>
        </WhiteCard>
      )}

      <Grid container spacing={2}>
        {/* Coluna 1: Calendário */}
        <Grid item xs={12} md={6}>
          <WhiteCard>
            <CardHeader
              title={month.title.charAt(0).toUpperCase() + month.title.slice(1)}
              icon={<CalendarMonthRounded />}
              action={
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Mês anterior">
                    <span>
                      <IconButton onClick={goPrev} aria-label="Mês anterior">
                        <ChevronLeftRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Mês seguinte">
                    <span>
                      <IconButton onClick={goNext} aria-label="Mês seguinte">
                        <ChevronRightRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hoje">
                    <span>
                      <IconButton onClick={goToday} aria-label="Hoje">
                        <TodayRounded />
                      </IconButton>
                    </span>
                  </Tooltip>
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
              icon={<TodayRounded />}
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
            <CardHeader title="Detalhe" icon={<InfoRounded />} />
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
                  {!!focused.status &&
                    (() => {
                      const raw = (focused.status || "").toUpperCase();
                      const cfg = STATUS_CFG[raw];
                      const Ico = cfg?.Icon;
                      return (
                        <Chip
                          icon={Ico ? <Ico fontSize="small" /> : undefined}
                          label={cfg?.label || focused.status}
                          color={cfg?.color || "default"}
                          variant="outlined"
                        />
                      );
                    })()}
                </Stack>

                {!!(focused as any)?.librarianName && (
                  <Typography sx={{ mb: 1.5 }}>
                    Bibliotecário: <b>{(focused as any).librarianName}</b>
                  </Typography>
                )}

                {["CONFIRMED", "PENDING"].includes(
                  String(focused.status || "").toUpperCase()
                ) && (
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Button
                      type="button"
                      variant="contained"
                      startIcon={<EditCalendarRounded />}
                      onClick={async () => {
                        const hasPending = proposals.some(
                          (p) =>
                            p.consultation?.id === focused!.id &&
                            String(p.status || "").toUpperCase() === "PENDING"
                        );
                        if (hasPending) {
                          alert(
                            "Já existe uma proposta pendente para esta consulta. Use a secção de 'Pedidos de reagendamento' acima para a editar ou cancelar."
                          );
                          return;
                        }

                        let libId =
                          (focused as any).librarianId ??
                          (focused as any)?.librarian?.id ??
                          null;

                        if (!libId) {
                          try {
                            setBusyDetail("reschedule");
                            const full = await getConsultation(focused!.id);
                            libId =
                              full?.librarianId ?? full?.librarian?.id ?? null;
                          } catch (e: any) {
                            console.warn(
                              "Falha a obter consulta completa:",
                              e?.message || e
                            );
                          } finally {
                            setBusyDetail(null);
                          }
                        }

                        if (!libId) {
                          alert(
                            "Não foi possível identificar o bibliotecário desta consulta."
                          );
                          return;
                        }

                        openRescheduleDialog(focused!.id, Number(libId));
                      }}
                      disabled={busyDetail === "reschedule"}
                    >
                      Reagendar
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelRounded />}
                      onClick={() => {
                        setCancelTarget(focused);
                        setCancelOpen(true);
                      }}
                      disabled={busyDetail === "cancel"}
                    >
                      Cancelar consulta
                    </Button>
                  </Stack>
                )}

                <RouteLink href="/consultas">
                  Abrir página de consultas{" "}
                  <LaunchRounded
                    fontSize="small"
                    style={{ verticalAlign: "middle" }}
                  />
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

      {/* ------- Dialog custom: confirmar cancelamento ------- */}
      <ConfirmCancelDialog
        open={cancelOpen}
        title={cancelTarget?.title ?? "Consulta"}
        whenISO={cancelTarget?.scheduledAt || cancelTarget?.date}
        busy={busyDetail === "cancel"}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason?: string) => handleConfirmCancel(reason)}
      />
    </Container>
  );
}

/* --------- Dialog: selector de slots (família propõe novo) --------- */
function SlotPickerDialog({
  open,
  onClose,
  librarianId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  librarianId: number;
  onPick: (slot: { id: number; startAt: string; endAt: string }) => void;
}) {
  const [slots, setSlots] = useState<SlotLite[]>([]);
  const [selected, setSelected] = useState<SlotLite | null>(null);

  const [initialLoading, setInitialLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [windowEnd, setWindowEnd] = useState<Date | null>(null);
  const [noMore, setNoMore] = useState(false);

  useEffect(() => {
    if (!open || !librarianId) return;
    (async () => {
      setInitialLoading(true);
      setSelected(null);
      setNoMore(false);
      const start = new Date();
      const end = addDays(start, 14);
      try {
        const data = await listOpenSlots({
          from: start.toISOString(),
          to: end.toISOString(),
          librarianId,
        });
        setSlots(data);
        setWindowEnd(end);
        setNoMore(data.length === 0);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [open, librarianId]);

  function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  async function handleShowMore() {
    if (!windowEnd || initialLoading || moreLoading || noMore) return;
    setMoreLoading(true);
    const from = new Date(windowEnd);
    const to = addDays(from, 14);
    try {
      const more = await listOpenSlots({
        from: from.toISOString(),
        to: to.toISOString(),
        librarianId,
      });
      setSlots((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        for (const s of more) map.set(s.id, s);
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
      });
      setWindowEnd(to);
      setNoMore(more.length === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SlotLite[]>();
    for (const s of slots) {
      const key = new Date(s.startAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([key, arr]) => ({
      key,
      label: new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(arr[0].startAt)),
      items: arr.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      ),
    }));
  }, [slots]);

  const fmtTime = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      keepMounted
      sx={{
        "& .MuiBackdrop-root": { zIndex: (t) => t.zIndex.modal },
        "& .MuiPaper-root": { zIndex: (t) => t.zIndex.modal + 1 },
      }}
    >
      <Typography variant="h6" sx={{ px: 3, pt: 2, pb: 1 }}>
        Escolher horário
      </Typography>
      <Box sx={{ px: 3, pb: 2 }}>
        {initialLoading && (
          <Stack spacing={1}>
            <Skeleton height={20} width="40%" />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Stack>
        )}

        {!initialLoading && grouped.length === 0 && (
          <Typography sx={{ opacity: 0.8 }}>
            Sem slots abertos nos próximos 14 dias.
          </Typography>
        )}

        <Stack spacing={2}>
          {grouped.map((g) => (
            <WhiteCard key={g.key} sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {g.label}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {g.items.map((s) => {
                  const a = new Date(s.startAt);
                  const b = new Date(s.endAt);
                  const active = selected?.id === s.id;
                  return (
                    <Chip
                      key={s.id}
                      clickable
                      onClick={() =>
                        setSelected((prev) => (prev?.id === s.id ? null : s))
                      }
                      label={`${fmtTime.format(a)} — ${fmtTime.format(b)}`}
                      variant={active ? "filled" : "outlined"}
                      color={active ? "primary" : "default"}
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </Stack>
            </WhiteCard>
          ))}
        </Stack>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Tooltip
            title={noMore ? "Sem mais resultados" : "Mostrar mais 14 dias"}
          >
            <span>
              <IconButton
                onClick={() => void handleShowMore()}
                disabled={moreLoading || initialLoading || noMore}
                aria-label="Mostrar mais 14 dias"
              >
                <CalendarMonthRounded />
              </IconButton>
            </span>
          </Tooltip>

          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {selected
              ? `Selecionado: ${new Intl.DateTimeFormat("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(selected.startAt))} — ${fmtTime.format(
                  new Date(selected.endAt)
                )}`
              : "Selecione um horário"}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2, justifyContent: "flex-end" }}
        >
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton
            onClick={() => selected && onPick(selected)}
            disabled={!selected}
          >
            Confirmar
          </PrimaryButton>
        </Stack>
      </Box>
    </Dialog>
  );
}

/* --------- Dialog: confirmar cancelamento (custom) --------- */
function ConfirmCancelDialog({
  open,
  onClose,
  onConfirm,
  busy,
  title,
  whenISO,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  busy?: boolean;
  title: string;
  whenISO?: string;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Cancelar consulta</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography sx={{ mb: 1.5 }}>
          Tem a certeza que quer cancelar <b>{title}</b>
          {whenISO
            ? ` em ${new Date(whenISO).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })} às ${new Date(whenISO).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : ""}
          ?
        </Typography>
        <TextField
          label="Motivo (opcional)"
          fullWidth
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: Impossibilidade de comparecer"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={!!busy}>
          Voltar
        </Button>
        <Button
          onClick={() => onConfirm(reason?.trim() || undefined)}
          color="error"
          variant="contained"
          disabled={!!busy}
          startIcon={<CancelRounded />}
        >
          {busy ? "A cancelar…" : "Confirmar cancelamento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

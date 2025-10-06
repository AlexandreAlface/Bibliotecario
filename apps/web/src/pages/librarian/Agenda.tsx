// ====================== apps/web/src/pages/librarian/Agenda.tsx ======================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Página: Agenda do Bibliotecário
 *
 * Objetivos deste refactor:
 * - Comentários claros por secções (layout, estado, efeitos, handlers)
 * - Helpers PUROS (sem efeitos colaterais) e com máx. 30 linhas
 * - Preserva a funcionalidade/UX original
 */

import { useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-web";
import {
  Box,
  Chip,
  Container,
  Dialog,
  Divider,
  IconButton,
  Stack,
  Typography,
  Skeleton,
  TextField,
  useTheme,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";

import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import PendingActionsRounded from "@mui/icons-material/PendingActionsRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";

import { useUserSession } from "../../contexts/UserSession";
import {
  getNextConsultas,
  type ConsultaLite,
  listLibrarianSlots,
  type SlotLite,
  confirmConsultation,
  declineConsultation,
  cancelConsultation,
  updateSlotStatus,
} from "../../services/consultations";

/* =========================================================================================
   Utils/format — Helpers PUROS (≤ 30 linhas)
   ========================================================================================= */

/** Normaliza para início do dia (local). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** YYYY-MM-DD (local). */
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Partes amigáveis para chips/pílulas. */
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Compõe o intervalo [from, to] (mês inteiro) a partir de um “monthRef”. */
function monthRange(ref: Date) {
  const from = new Date(ref);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);
  to.setDate(0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** Grelha do mês (células com ymd + flag inMonth). */
function buildMonthGrid(ref: Date) {
  const d0 = new Date(ref);
  d0.setDate(1);
  const firstWeekday = (d0.getDay() + 6) % 7; // 0 = Mon
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
}

/* =========================================================================================
   Tipos e constantes
   ========================================================================================= */

const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmado", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusado", color: "error" },
  CANCELLED: { label: "Cancelado", color: "default" },
};

type DayItem =
  | {
      kind: "CONSULTA";
      id: number;
      title: string;
      startAt: string;
      endAt?: string;
      status: string;
      familyId?: number;
      childId?: number;
      librarianId?: number;
      librarianName?: string;
    }
  | {
      kind: "SLOT";
      id: number;
      startAt: string;
      endAt: string;
      status: "OPEN" | "BLOCKED" | "BOOKED";
      librarianId: number;
      libraryId?: number;
      libraryName?: string;
    };

/* =========================================================================================
   Helpers de UI (PUROS)
   ========================================================================================= */

/** Cabeçalho de cartão (título + ação à direita). */
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

/** Bolinha colorida com tooltip. */
function Dot({ color, title }: { color: string; title?: string }) {
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "2px solid",
        borderColor: color,
        bgcolor: color,
        display: "inline-block",
        mr: 0.5,
        opacity: 0.9,
      }}
      title={title}
    />
  );
}

/** Chip “toggle” (filled/outlined) com tooltip (opcional). */
function ToggleChip({
  active,
  onToggle,
  label,
  color = "default",
  icon,
  tooltip,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "info"
    | "error";
  icon?: React.ReactElement;
  tooltip?: string;
}) {
  const chip = (
    <Chip
      clickable
      size="small"
      variant={active ? "filled" : "outlined"}
      color={color}
      onClick={onToggle}
      label={label}
      icon={icon}
    />
  );
  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
}

/* =========================================================================================
   Dialogs
   ========================================================================================= */

/** Dialog de cancelamento (custom) — controlado a partir do parent. */
function CancelDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
          Cancelar consulta
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
          Tem a certeza que quer cancelar esta consulta? Pode indicar um motivo
          (opcional).
        </Typography>

        <TextField
          label="Motivo (opcional)"
          fullWidth
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <SecondaryButton onClick={onClose} disabled={!!busy}>
            Voltar
          </SecondaryButton>
          <PrimaryButton
            color="error"
            onClick={() => onConfirm(reason || undefined)}
            disabled={!!busy}
            startIcon={<CancelRounded />}
          >
            Confirmar cancelamento
          </PrimaryButton>
        </Stack>
      </Box>
    </Dialog>
  );
}

/* =========================================================================================
   Linha de item (consulta/slot)
   ========================================================================================= */

function DayItemRow({
  item,
  onConfirm,
  onDecline,
  onAskCancel,
  onToggleSlot,
  busyId,
}: {
  item: DayItem;
  onConfirm: (id: number) => void;
  onDecline: (id: number) => void;
  onAskCancel: (id: number) => void;
  onToggleSlot: (id: number, next: "OPEN" | "BLOCKED") => void;
  busyId: number | null;
}) {
  const iso = item.startAt;
  const { day, mon, time: timeStr } = parts(iso);

  // --------- Consulta ----------
  if (item.kind === "CONSULTA") {
    const cfg = STATUS_CFG[(item.status || "").toUpperCase()] || {
      label: item.status,
      color: "default",
    };
    const isBusy = busyId === item.id;

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
          {/* Data */}
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
              {!!timeStr && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", opacity: 0.8 }}
                >
                  {timeStr}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Conteúdo */}
          <Box flex={1} minWidth={0}>
            <Typography fontWeight={900} noWrap title={item.title}>
              {item.title}
            </Typography>
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
              {!!timeStr && (
                <Chip
                  size="small"
                  icon={<AccessTimeRounded fontSize="small" />}
                  label={timeStr}
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

          {/* Ações por estado */}
          {["PENDING"].includes((item.status || "").toUpperCase()) ? (
            <Stack direction="row" spacing={1}>
              <PrimaryButton
                startIcon={<CheckCircleRounded />}
                onClick={() => onConfirm(item.id)}
                disabled={isBusy}
              >
                Confirmar
              </PrimaryButton>
              <SecondaryButton
                startIcon={<CancelRounded />}
                variant="outlined"
                onClick={() => onDecline(item.id)}
                disabled={isBusy}
              >
                Recusar
              </SecondaryButton>
            </Stack>
          ) : ["CONFIRMED", "PENDING"].includes(
              (item.status || "").toUpperCase()
            ) ? (
            <Stack direction="row" spacing={1}>
              <SecondaryButton
                startIcon={<CancelRounded />}
                variant="outlined"
                onClick={() => onAskCancel(item.id)}
                disabled={isBusy}
              >
                Cancelar
              </SecondaryButton>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    );
  }

  // --------- Slot ----------
  const a = new Date(item.startAt);
  const b = new Date(item.endAt);
  const timeRange = `${a.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  })} — ${b.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const isOpen = item.status === "OPEN";
  const isBusy = busyId === item.id;

  return (
    <Box
      sx={{
        p: 1.25,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2.5,
        bgcolor: isOpen ? "action.hover" : "transparent",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Chip
          size="small"
          label={`Slot ${
            item.status === "BLOCKED" ? "bloqueado" : item.status.toLowerCase()
          }`}
          color={
            item.status === "OPEN"
              ? "info"
              : item.status === "BLOCKED"
              ? "default"
              : "warning"
          }
          variant="outlined"
        />
        <Typography fontWeight={700} sx={{ mr: "auto" }}>
          {timeRange} {!!item.libraryName && <>— {item.libraryName}</>}
        </Typography>

        {item.status !== "BOOKED" && (
          <Stack direction="row" spacing={1}>
            {isOpen ? (
              <SecondaryButton
                startIcon={<BlockRounded />}
                variant="outlined"
                onClick={() => onToggleSlot(item.id, "BLOCKED")}
                disabled={isBusy}
              >
                Bloquear
              </SecondaryButton>
            ) : (
              <PrimaryButton
                startIcon={<LockOpenRounded />}
                onClick={() => onToggleSlot(item.id, "OPEN")}
                disabled={isBusy}
              >
                Abrir
              </PrimaryButton>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

/* =========================================================================================
   Página
   ========================================================================================= */

export default function LibrarianAgenda() {
  const theme = useTheme();
  const { user } = useUserSession();
  const librarianId = Number(user?.id);

  // Estado principal de navegação/seleção
  const [monthRef, setMonthRef] = useState(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(fmtYMD(new Date()));

  // Dados carregados
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);
  const [slots, setSlots] = useState<SlotLite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Busy (desativa ações por item)
  const [busyId, setBusyId] = useState<number | null>(null);

  // Dialog de cancelamento
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelBusy, setCancelBusy] = useState<boolean>(false);

  // Filtros de lista do dia
  const [query, setQuery] = useState("");
  const [showPending, setShowPending] = useState(true);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [showSlotsOpen, setShowSlotsOpen] = useState(true);
  const [showSlotsBlocked, setShowSlotsBlocked] = useState(false);
  const [showSlotsBooked, setShowSlotsBooked] = useState(false);

  /* -------------------------- Navegação temporal -------------------------- */
  const goPrev = () =>
    setMonthRef(
      startOfDay(new Date(monthRef.setMonth(monthRef.getMonth() - 1)))
    );
  const goNext = () =>
    setMonthRef(
      startOfDay(new Date(monthRef.setMonth(monthRef.getMonth() + 1)))
    );
  const goToday = () => {
    const today = startOfDay(new Date());
    setMonthRef(today);
    setSelectedDate(fmtYMD(today));
  };

  /* -------------------------- Load (consultas + slots) -------------------------- */
  async function reloadAll() {
    if (!Number.isFinite(librarianId)) return;
    setLoading(true);
    try {
      // Consultas futuras
      const cons = await getNextConsultas(120, { librarianId });

      // Slots do mês corrente
      const { from, to } = monthRange(monthRef);
      const rawSlots = await listLibrarianSlots(librarianId, {
        from: from.toISOString(),
        to: to.toISOString(),
      });

      setConsultas(cons || []);
      setSlots(Array.isArray(rawSlots) ? rawSlots : []);
    } catch (e) {
      console.error("Falha a carregar agenda do bibliotecário:", e);
      setConsultas([]);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId, monthRef]);

  /* -------------------------- Mapear dados do dia (PURO) -------------------------- */
  const dayItems = useMemo(() => {
    const map = new Map<string, DayItem[]>();

    // consultas -> DayItem
    for (const c of consultas) {
      const key = fmtYMD(c.scheduledAt || c.date);
      if (!key) continue;
      const it: DayItem = {
        kind: "CONSULTA",
        id: c.id,
        title: c.title,
        startAt: String(c.scheduledAt || c.date),
        status: String(c.status || ""),
        familyId: typeof c.familyId === "number" ? c.familyId : undefined,
        childId: typeof c.childId === "number" ? c.childId : undefined,
        librarianId:
          typeof c.librarianId === "number" ? c.librarianId : undefined,
        librarianName: (c as any).librarianName,
      };
      map.set(key, [...(map.get(key) || []), it]);
    }

    // slots -> DayItem
    for (const s of slots) {
      const key = fmtYMD(s.startAt);
      if (!key) continue;
      const it: DayItem = {
        kind: "SLOT",
        id: s.id,
        startAt: String(s.startAt),
        endAt: String(s.endAt),
        status: s.status,
        librarianId: s.librarianId,
        libraryId: s.libraryId,
        libraryName: (s as any).libraryName,
      };
      map.set(key, [...(map.get(key) || []), it]);
    }

    // ordenar por hora
    for (const [k, arr] of map.entries()) {
      arr.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
      map.set(k, arr);
    }
    return map;
  }, [consultas, slots]);

  /* -------------------------- Grelha do mês (PURO) -------------------------- */
  const month = useMemo(() => buildMonthGrid(monthRef), [monthRef]);

  /* -------------------------- Seleção do dia “melhor” -------------------------- */
  const todayFirstWithItems = useMemo(() => {
    const todayKey = fmtYMD(new Date());
    if ((dayItems.get(todayKey) || []).length > 0) return todayKey;
    for (const c of month.cells) {
      if (c.inMonth && (dayItems.get(c.ymd) || []).length > 0) return c.ymd;
    }
    return selectedDate;
  }, [dayItems, month.cells, selectedDate]);

  useEffect(() => {
    if ((dayItems.get(selectedDate) || []).length === 0) {
      setSelectedDate(todayFirstWithItems);
    }
  }, [dayItems, todayFirstWithItems]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------- Lista do dia + cores -------------------------- */
  const itemsForSelected = useMemo(
    () => dayItems.get(selectedDate) || [],
    [dayItems, selectedDate]
  );

  /** Cor do “dot” consoante tipo/estado (puro). */
  const dotColor = (it: DayItem) => {
    if (it.kind === "CONSULTA") {
      const s = (it.status || "").toUpperCase();
      if (s === "CONFIRMED") return theme.palette.success.main;
      if (s === "PENDING") return theme.palette.warning.main;
      if (s === "DECLINED") return theme.palette.error.main;
      if (s === "CANCELLED") return theme.palette.grey[400];
      return theme.palette.divider;
    }
    if (it.status === "OPEN") return theme.palette.info.main;
    if (it.status === "BLOCKED") return theme.palette.grey[500];
    if (it.status === "BOOKED") return theme.palette.text.secondary;
    return theme.palette.divider;
  };

  /* -------------------------- Filtros da lista do dia (PUROS) -------------------------- */

  /** Verifica se item “bate” com a query livre. */
  function matchQuery(it: DayItem, q: string): boolean {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    if (it.kind === "CONSULTA") {
      return (
        it.title?.toLowerCase().includes(s) ||
        (it.librarianName || "").toLowerCase().includes(s)
      );
    }
    const a = new Date(it.startAt);
    const b = new Date((it as any).endAt);
    const tr = `${a.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })} — ${b.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    return (
      (it.libraryName || "").toLowerCase().includes(s) ||
      tr.toLowerCase().includes(s)
    );
  }

  /** Aplica os toggles de filtros à lista. */
  function applyToggles(
    arr: DayItem[],
    toggles: {
      pending: boolean;
      confirmed: boolean;
      open: boolean;
      blocked: boolean;
      booked: boolean;
    }
  ): DayItem[] {
    return arr.filter((it) => {
      if (it.kind === "CONSULTA") {
        const s = (it.status || "").toUpperCase();
        if (s === "PENDING" && !toggles.pending) return false;
        if (s === "CONFIRMED" && !toggles.confirmed) return false;
        if (!["PENDING", "CONFIRMED", "DECLINED", "CANCELLED"].includes(s))
          return false;
        return true;
      }
      if (it.status === "OPEN" && !toggles.open) return false;
      if (it.status === "BLOCKED" && !toggles.blocked) return false;
      if (it.status === "BOOKED" && !toggles.booked) return false;
      return true;
    });
  }

  const filteredItemsForSelected = useMemo(() => {
    const toggles = {
      pending: showPending,
      confirmed: showConfirmed,
      open: showSlotsOpen,
      blocked: showSlotsBlocked,
      booked: showSlotsBooked,
    };
    return applyToggles(
      itemsForSelected.filter((it) => matchQuery(it, query)),
      toggles
    );
  }, [
    itemsForSelected,
    query,
    showPending,
    showConfirmed,
    showSlotsOpen,
    showSlotsBlocked,
    showSlotsBooked,
  ]);

  /* -------------------------- Contadores rápidos -------------------------- */
  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, open: 0, blocked: 0, booked: 0 };
    for (const it of itemsForSelected) {
      if (it.kind === "CONSULTA") {
        const s = (it.status || "").toUpperCase();
        if (s === "PENDING") c.pending++;
        else if (s === "CONFIRMED") c.confirmed++;
      } else {
        if (it.status === "OPEN") c.open++;
        else if (it.status === "BLOCKED") c.blocked++;
        else if (it.status === "BOOKED") c.booked++;
      }
    }
    return c;
  }, [itemsForSelected]);

  /* -------------------------- Handlers (ações) -------------------------- */
  const handleConfirm = async (id: number) => {
    try {
      setBusyId(id);
      await confirmConsultation(id);
      await reloadAll();
    } catch (e: any) {
      alert(e?.message || "Falha ao confirmar.");
    } finally {
      setBusyId(null);
    }
  };
  const handleDecline = async (id: number) => {
    try {
      setBusyId(id);
      await declineConsultation(id);
      await reloadAll();
    } catch (e: any) {
      alert(e?.message || "Falha ao recusar.");
    } finally {
      setBusyId(null);
    }
  };
  const handleAskCancel = (id: number) => {
    setCancelId(id);
    setCancelOpen(true);
  };
  const handleDoCancel = async (reason?: string) => {
    if (!cancelId) return;
    try {
      setCancelBusy(true);
      await cancelConsultation(cancelId, reason);
      setCancelOpen(false);
      setCancelId(null);
      await reloadAll();
    } catch (e: any) {
      alert(e?.message || "Não foi possível cancelar a consulta.");
    } finally {
      setCancelBusy(false);
    }
  };
  const handleToggleSlot = async (slotId: number, next: "OPEN" | "BLOCKED") => {
    try {
      setBusyId(slotId);
      await updateSlotStatus(slotId, next);
      await reloadAll();
    } catch (e: any) {
      alert(e?.message || "Falha ao atualizar slot.");
    } finally {
      setBusyId(null);
    }
  };

  /* --------------------------------- Render --------------------------------- */

  if (!Number.isFinite(librarianId)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 2 }}>
          Agenda do bibliotecário
        </Typography>
        <WhiteCard>
          <Typography>Sem utilizador válido.</Typography>
        </WhiteCard>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Topo */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Agenda do bibliotecário
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={reloadAll} disabled={loading}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

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

            {/* Legenda */}
            <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label="Consulta confirmada"
                color="success"
                variant="outlined"
                icon={<CheckCircleRounded fontSize="small" />}
              />
              <Chip
                size="small"
                label="Consulta pendente"
                color="warning"
                variant="outlined"
                icon={<PendingActionsRounded fontSize="small" />}
              />
              <Chip
                size="small"
                label="Slot aberto"
                color="info"
                variant="outlined"
                icon={<LockOpenRounded fontSize="small" />}
              />
              <Chip
                size="small"
                label="Slot bloqueado"
                variant="outlined"
                icon={<BlockRounded fontSize="small" />}
              />
            </Stack>

            {/* Grelha */}
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
                const items = c.ymd ? dayItems.get(c.ymd) ?? [] : [];
                const isSelected = c.ymd === selectedDate;
                const dayNum = c.ymd ? Number(c.ymd.split("-")[2]) : "";
                const extra = Math.max(0, items.length - 3);

                return (
                  <Box
                    key={i}
                    onClick={() => c.inMonth && c.ymd && setSelectedDate(c.ymd)}
                    sx={{
                      p: 1,
                      minHeight: 90,
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

                    {/* “Dots” de estado */}
                    {items.slice(0, 3).map((it, idx) => (
                      <Dot
                        key={idx}
                        color={dotColor(it)}
                        title={
                          it.kind === "CONSULTA"
                            ? `${it.title} — ${
                                STATUS_CFG[(it.status || "").toUpperCase()]
                                  ?.label ?? it.status
                              }`
                            : `Slot ${it.status.toLowerCase()}`
                        }
                      />
                    ))}

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
        <Grid item xs={12} md={6}>
          <WhiteCard
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardHeader
              title={new Date(selectedDate).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
              action={
                loading ? (
                  <Skeleton width={120} />
                ) : (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    {itemsForSelected.length} itens
                  </Typography>
                )
              }
            />

            {/* Toolbar: pesquisa + toggles */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1 }}
              useFlexGap
              flexWrap="wrap"
            >
              <TextField
                placeholder="Procurar (título, biblioteca, hora)…"
                size="small"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ minWidth: 260 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  label="Filtros"
                  variant="outlined"
                  icon={<FilterListRounded fontSize="small" />}
                  sx={{ mr: 0.5 }}
                />
                <ToggleChip
                  active={showPending}
                  onToggle={() => setShowPending((v) => !v)}
                  label={`Pendentes (${counts.pending})`}
                  color="warning"
                  icon={<PendingActionsRounded fontSize="small" />}
                />
                <ToggleChip
                  active={showConfirmed}
                  onToggle={() => setShowConfirmed((v) => !v)}
                  label={`Confirmadas (${counts.confirmed})`}
                  color="success"
                  icon={<CheckCircleRounded fontSize="small" />}
                />
                <ToggleChip
                  active={showSlotsOpen}
                  onToggle={() => setShowSlotsOpen((v) => !v)}
                  label={`Slots abertos (${counts.open})`}
                  color="info"
                  icon={<LockOpenRounded fontSize="small" />}
                />
                <ToggleChip
                  active={showSlotsBlocked}
                  onToggle={() => setShowSlotsBlocked((v) => !v)}
                  label={`Bloqueados (${counts.blocked})`}
                  icon={<BlockRounded fontSize="small" />}
                />
                <ToggleChip
                  active={showSlotsBooked}
                  onToggle={() => setShowSlotsBooked((v) => !v)}
                  label={`Reservados (${counts.booked})`}
                  color="secondary"
                  icon={<CalendarMonthRounded fontSize="small" />}
                />
              </Stack>
            </Stack>

            {/* Lista / loading */}
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
                  <Skeleton height={86} />
                  <Skeleton height={86} />
                </Stack>
              ) : filteredItemsForSelected.length ? (
                <Stack
                  spacing={1.25}
                  divider={<Divider sx={{ borderColor: "divider" }} />}
                >
                  {filteredItemsForSelected.map((it) => (
                    <DayItemRow
                      key={`${it.kind}-${it.id}`}
                      item={it}
                      onConfirm={handleConfirm}
                      onDecline={handleDecline}
                      onAskCancel={handleAskCancel}
                      onToggleSlot={handleToggleSlot}
                      busyId={busyId}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ opacity: 0.7 }}>
                  Sem itens com os filtros atuais.
                </Typography>
              )}
            </Box>
          </WhiteCard>
        </Grid>
      </Grid>

      {/* Dialog de Cancelamento */}
      <CancelDialog
        open={cancelOpen}
        onClose={() => {
          if (!cancelBusy) {
            setCancelOpen(false);
            setCancelId(null);
          }
        }}
        onConfirm={handleDoCancel}
        busy={cancelBusy}
      />
    </Container>
  );
}

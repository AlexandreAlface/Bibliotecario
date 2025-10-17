// ====================== apps/web/src/pages/librarian/Agenda.tsx ======================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Página: Agenda do Bibliotecário
 *
 * Objetivos deste refactor:
 * - Comentários claros por secções (layout, estado, efeitos, handlers)
 * - Helpers PUROS (sem efeitos colaterais) e com máx. 30 linhas
 * - Preserva a funcionalidade/UX original
 * - ✨ Integra ConsultationWizard para marcar consultas a partir de slots OPEN
 * - ✨ Seleção de família por NOME (select), não por ID
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
  MenuItem,
} from "@mui/material";

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
import PersonRounded from "@mui/icons-material/PersonRounded";
import AddTaskRounded from "@mui/icons-material/AddTaskRounded";

import { useUserSession } from "../../contexts/UserSession";
import {
  getConsultationsHistory,
  listLibrarianSlots,
  type SlotLite,
  confirmConsultation,
  declineConsultation,
  cancelConsultation,
  updateSlotStatus,
} from "../../services/consultations";

// ✨ Wizard
import ConsultationWizard from "@/components/consultations/ConsultationWizard";

// ✨ Serviço simples para listar famílias (id + nome)
import { listFamiliesLite } from "@/services/families";
import ConsultationRoom from "@/components/consultations/ConsultationRoom";

/* =========================================================================================
   Utils/format — Helpers PUROS (≤ 30 linhas)
   ========================================================================================= */

/** Normaliza para início do dia (local). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function deriveStatus(it: DayItem): string {
  if (it.kind !== "CONSULTA") return it.status;
  const s = String(it.status || "").toUpperCase();
  if (["COMPLETED", "CANCELLED", "DECLINED"].includes(s)) return s;
  const start = new Date(it.startAt).getTime();
  if (Number.isFinite(start) && start < Date.now()) return "OVERDUE";
  return s; // PENDING / CONFIRMED (futuras)
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
  COMPLETED: { label: "Concluída", color: "default" },
  OVERDUE: { label: "Por concluir", color: "error" }, // derivado
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
  onStartWizard, // ✨
  canStartWizard, // ✨
  busyId,
  onOpenRoom,
}: {
  item: DayItem;
  onConfirm: (id: number) => void;
  onDecline: (id: number) => void;
  onAskCancel: (id: number) => void;
  onToggleSlot: (id: number, next: "OPEN" | "BLOCKED") => void;
  onStartWizard?: (slotId: number) => void;

  canStartWizard?: boolean;
  busyId: number | null;
  onOpenRoom?: (it: DayItem) => void;
}) {
  const iso = item.startAt;
  const { day, mon, time: timeStr } = parts(iso);

  const derived = item.kind === "CONSULTA" ? deriveStatus(item) : item.status;
  const isConsultClickable =
    item.kind === "CONSULTA" &&
    ["CONFIRMED", "OVERDUE", "COMPLETED"].includes(derived);

  // --------- Consulta ----------
  if (item.kind === "CONSULTA") {
    const cfg = STATUS_CFG[derived] || { label: item.status, color: "default" };
    const isBusy = busyId === item.id;

    return (
      <Box
        onClick={isConsultClickable ? () => onOpenRoom?.(item) : undefined}
        sx={{
          p: 1.25,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2.5,
          cursor: isConsultClickable ? "pointer" : "default",
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

  const marcarBtn = (
    <PrimaryButton
      startIcon={<AddTaskRounded />}
      onClick={() => onStartWizard?.(item.id)}
      disabled={isBusy || !canStartWizard}
    >
      Marcar
    </PrimaryButton>
  );

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
      <Stack direction="row" alignItems="center" spacing={1.25}>
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
        <Typography fontWeight={700} sx={{ mr: "auto", minWidth: 0 }}>
          {timeRange} {!!item.libraryName && <>— {item.libraryName}</>}
        </Typography>

        {isOpen &&
          (canStartWizard ? (
            marcarBtn
          ) : (
            <Tooltip title="Escolhe a família acima para marcar">
              <span>{marcarBtn}</span>
            </Tooltip>
          ))}

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
  const [consultas, setConsultas] = useState<
    Array<{
      id: number;
      title: string;
      scheduledAt?: string;
      status: string;
      familyId?: number;
      childId?: number;
      librarianId?: number;
      librarianName?: string;
      libraryId?: number;
      libraryName?: string;
    }>
  >([]);
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
  const [showCompleted, setShowCompleted] = useState(true);
  const [showSlotsOpen, setShowSlotsOpen] = useState(true);
  const [showSlotsBlocked, setShowSlotsBlocked] = useState(false);
  const [showSlotsBooked, setShowSlotsBooked] = useState(false);

  // ✨ Wizard (família alvo + slot selecionado)
  type FamilyOption = { id: number; fullName: string };
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSlotId, setWizardSlotId] = useState<number | null>(null);

  const [roomOpen, setRoomOpen] = useState(false);
  const [roomConsultationId, setRoomConsultationId] = useState<number | null>(
    null
  );

  function handleOpenRoom(it: DayItem) {
    if (it.kind !== "CONSULTA") return;
    const s = deriveStatus(it);
    if (["CONFIRMED", "OVERDUE", "COMPLETED"].includes(s)) {
      setRoomConsultationId(it.id);
      setRoomOpen(true);
    }
  }

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

    const { from, to } = monthRange(monthRef);
    try {
      const hist = await getConsultationsHistory({
        limit: 500,
        order: "asc",
        from: from.toISOString(),
        to: to.toISOString(),
        status: ["PENDING", "CONFIRMED", "COMPLETED"],
        librarianId,
      });
      const cons =
        (hist || []).map((c) => ({
          id: c.id,
          title: c.title || "Consulta",
          scheduledAt: c.startAt || undefined,
          status: c.status,
          familyId: c.family?.id,
          childId: c.child?.id,
          librarianId: c.librarian?.id,
          librarianName: c.librarian?.fullName,
          libraryId: c.library?.id,
          libraryName: c.library?.name,
        })) || [];

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

  // ✨ Carregar famílias (uma vez)
  useEffect(() => {
    (async () => {
      const rows = await listFamiliesLite();
      setFamilies(rows);
    })();
  }, []);

  useEffect(() => {
    reloadAll();
  }, [librarianId, monthRef]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------- Mapear dados do dia (PURO) -------------------------- */
  const dayItems = useMemo(() => {
    const map = new Map<string, DayItem[]>();

    // consultas -> DayItem
    for (const c of consultas) {
      const key = fmtYMD(c.scheduledAt);
      if (!key) continue;
      const it: DayItem = {
        kind: "CONSULTA",
        id: c.id,
        title: c.title,
        startAt: String(c.scheduledAt),
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
      const s = deriveStatus(it);
      if (s === "CONFIRMED") return theme.palette.success.main;
      if (s === "PENDING") return theme.palette.warning.main;
      if (s === "OVERDUE") return theme.palette.error.main;
      if (s === "COMPLETED") return theme.palette.grey[400];
      if (s === "DECLINED" || s === "CANCELLED") return theme.palette.grey[400];
      return theme.palette.divider;
    }
    if (it.status === "OPEN") return theme.palette.info.main;
    if (it.status === "BLOCKED") return theme.palette.grey[500];
    if (it.status === "BOOKED") return theme.palette.text.secondary;
    return theme.palette.divider;
  };

  /* -------------------------- Filtros da lista do dia (PUROS) -------------------------- */
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

  function applyToggles(
    arr: DayItem[],
    toggles: {
      pending: boolean;
      confirmed: boolean;
      completed: boolean;
      open: boolean;
      blocked: boolean;
      booked: boolean;
    }
  ): DayItem[] {
    return arr.filter((it) => {
      if (it.kind === "CONSULTA") {
        const s = deriveStatus(it);
        if (s === "PENDING" && !toggles.pending) return false;
        if ((s === "CONFIRMED" || s === "OVERDUE") && !toggles.confirmed)
          return false;
        if (s === "COMPLETED" && !toggles.completed) return false;
        if (["DECLINED", "CANCELLED"].includes(s)) return false;
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
      completed: showCompleted,
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
    showCompleted,
    showConfirmed,
    showSlotsOpen,
    showSlotsBlocked,
    showSlotsBooked,
  ]);

  /* -------------------------- Contadores rápidos -------------------------- */
  const counts = useMemo(() => {
    const c = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      open: 0,
      blocked: 0,
      booked: 0,
    };
    for (const it of itemsForSelected) {
      if (it.kind === "CONSULTA") {
        const s = deriveStatus(it);
        if (s === "PENDING") c.pending++;
        else if (s === "CONFIRMED" || s === "OVERDUE") c.confirmed++;
        else if (s === "COMPLETED") c.completed++;
      } else {
        if (it.status === "OPEN") c.open++;
        else if (it.status === "BLOCKED") c.blocked++;
        else if (it.status === "BOOKED") c.booked++;
      }
    }
    return c;
  }, [itemsForSelected]);

  /* -------------------------- Bibliotecas p/ Wizard -------------------------- */
  const wizardLibraries = useMemo(() => {
    const seen = new Set<number>();
    const arr: Array<{ id: number; name: string }> = [];
    for (const s of slots) {
      if (!s.libraryId || seen.has(s.libraryId)) continue;
      seen.add(s.libraryId);
      arr.push({ id: s.libraryId, name: s.libraryName || "Biblioteca" });
    }
    return arr;
  }, [slots]);

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

  // ✨ começar marcação via Wizard a partir de um slot OPEN
  const handleStartWizard = (slotId: number) => {
    const fid = Number(selectedFamilyId);
    if (!Number.isFinite(fid) || fid <= 0) {
      alert("Escolhe a família para quem vais marcar.");
      return;
    }
    setWizardSlotId(slotId);
    setWizardOpen(true);
  };

  /* --------------------------------- Render --------------------------------- */

  if (!Number.isFinite(librarianId)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={900} sx={{ mb: 2 }}>
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100dvh - 68px)",
        }}
      >
        {/* Header */}
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

        {/* LINHA 1: Calendário (largura total) */}
        <Box sx={{ mb: 2 }}>
          <WhiteCard sx={{ display: "flex", flexDirection: "column" }}>
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
                label="Consulta concluída"
                variant="outlined"
              />
              <Chip
                size="small"
                label="Por concluir"
                color="error"
                variant="outlined"
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

            {/* Grelha do calendário */}
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
                      minHeight: 88,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      opacity: c.inMonth ? 1 : 0.3,
                      cursor: c.inMonth ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                      {dayNum}
                    </Typography>

                    {items.slice(0, 3).map((it, idx) => (
                      <Dot
                        key={idx}
                        color={dotColor(it)}
                        title={
                          it.kind === "CONSULTA"
                            ? `${it.title} — ${
                                STATUS_CFG[deriveStatus(it)]?.label ??
                                deriveStatus(it)
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
        </Box>

        {/* LINHA 2 + LINHA 3: agora em LINHAS (lista em cima, detalhe em baixo) */}
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Linha 2: Lista do Dia (expande e scrolla) */}
          <WhiteCard
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
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

            {/* Toolbar filtros */}
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
                  active={showCompleted}
                  onToggle={() => setShowCompleted((v) => !v)}
                  label={`Concluídas (${counts.completed})`}
                  color="default"
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

              <TextField
                select
                label="Família para marcar"
                size="small"
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                sx={{ width: { xs: "100%", md: 280 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">— Escolher família —</MenuItem>
                {families.map((f) => (
                  <MenuItem key={f.id} value={String(f.id)}>
                    {f.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Lista SCROLLÁVEL — EXPANDE PARA BAIXO */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
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
                <Stack spacing={1.5}>
                  <Skeleton height={120} />
                  <Skeleton height={120} />
                </Stack>
              ) : filteredItemsForSelected.length ? (
                <Stack spacing={1.5}>
                  {filteredItemsForSelected.map((it) => (
                    <DayItemRow
                      key={`${it.kind}-${it.id}`}
                      item={it}
                      onConfirm={handleConfirm}
                      onDecline={handleDecline}
                      onAskCancel={handleAskCancel}
                      onToggleSlot={handleToggleSlot}
                      onStartWizard={
                        it.kind === "SLOT" && it.status === "OPEN"
                          ? handleStartWizard
                          : undefined
                      }
                      canStartWizard={Number(selectedFamilyId) > 0}
                      busyId={busyId}
                      onOpenRoom={handleOpenRoom}
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
{/* 
          Linha 3: Painel de Detalhes (altura ao conteúdo)
          <WhiteCard sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Detalhe
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Seleciona uma consulta ou slot para ver detalhes.
            </Typography>
          </WhiteCard> */}
        </Stack>

        {/* Dialogs */}
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

        <ConsultationWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          defaultFamilyId={
            Number(selectedFamilyId) > 0 ? Number(selectedFamilyId) : 0
          }
          defaultLibrarianId={librarianId}
          defaultSlotId={wizardSlotId ?? undefined}
          libraries={wizardLibraries}
          onCreated={async () => {
            setWizardOpen(false);
            setWizardSlotId(null);
            await reloadAll();
          }}
        />

        <ConsultationRoom
          open={roomOpen}
          onClose={() => {
            setRoomOpen(false);
            reloadAll();
          }}
          consultationId={roomConsultationId ?? 0}
        />
      </Box>
    </Container>
  );
}

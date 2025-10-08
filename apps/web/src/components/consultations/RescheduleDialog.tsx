// apps/web/src/components/consultations/RescheduleDialog.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Button, Typography, Chip, IconButton, Tooltip, Skeleton
} from "@mui/material";
import TodayRounded from "@mui/icons-material/TodayRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import { listOpenSlots, type SlotLite,
  rescheduleConsultation, createProposalForConsultation } from "@/services/consultations";
import { rescheduleErrorMessage } from "@/utils/errorMessages";

function startOfDay(d: Date){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
function timeLabel(iso?: string){ if(!iso) return "—"; const d=new Date(iso);
  return d.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"}); }

export type RescheduleDialogProps = {
  open: boolean;
  onClose: () => void;
  consultation: {
    id: number;
    status: "PENDING"|"CONFIRMED"|"DECLINED"|"CANCELLED"|"COMPLETED";
    startAt?: string|null;
    endAt?: string|null;
    librarianId?: number|null;
  };
  onDone?: () => void; // refresh/close externo
  notify?: (text: string, variant?: "success"|"error"|"info") => void; // injeta o teu toast
};

export default function RescheduleDialog({ open, onClose, consultation, onDone, notify }: RescheduleDialogProps) {
  const [dayRef, setDayRef] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<SlotLite[]>([]);
  const [selected, setSelected] = useState<SlotLite|undefined>(undefined);

  const isPending = consultation.status === "PENDING";
  const sameLibrarian = consultation.librarianId ?? undefined;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true); setSelected(undefined);
      try {
        const from = startOfDay(dayRef).toISOString();
        const to = endOfDay(dayRef).toISOString();
        const list = await listOpenSlots({
          from, to,
          librarianId: sameLibrarian, // 👈 manter o mesmo bibliotecário
          // Se quiseres permitir trocar de bibliotecário, remove esta linha.
        });
        setSlots(list);
      } finally { setLoading(false); }
    })();
  }, [open, dayRef, sameLibrarian]);

  async function doConfirm() {
    if (!selected) return;
    try {
      if (isPending) {
        await rescheduleConsultation(consultation.id, selected.id);
        notify?.("Consulta reagendada.", "success");
      } else {
        await createProposalForConsultation(consultation.id, {
          proposedBy: "FAMILY",
          toStartAt: selected.startAt,
          toEndAt: selected.endAt,
          fromStartAt: consultation.startAt ?? undefined,
          fromEndAt: consultation.endAt ?? undefined,
          message: "Pedido de alteração de horário",
        });
        notify?.("Pedido de alteração enviado ao bibliotecário.", "success");
      }
      onDone?.();
      onClose();
    } catch (e: any) {
      notify?.(rescheduleErrorMessage(e), "error");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isPending ? "Reagendar consulta" : "Pedir alteração de horário"}</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            {new Date(dayRef).toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Dia anterior">
              <span><IconButton onClick={() => setDayRef(startOfDay(new Date(dayRef.getTime()-86400000)))}><ChevronLeftRounded/></IconButton></span>
            </Tooltip>
            <Tooltip title="Hoje">
              <span><IconButton onClick={() => setDayRef(startOfDay(new Date()))}><TodayRounded/></IconButton></span>
            </Tooltip>
            <Tooltip title="Dia seguinte">
              <span><IconButton onClick={() => setDayRef(startOfDay(new Date(dayRef.getTime()+86400000)))}><ChevronRightRounded/></IconButton></span>
            </Tooltip>
          </Stack>
        </Stack>

        {loading ? (
          <Stack spacing={1}>{Array.from({length:6}).map((_,i)=><Skeleton key={i} variant="rounded" height={34}/>)}</Stack>
        ) : slots.length ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
            {slots.map(s => {
              const label = `${timeLabel(s.startAt)}–${timeLabel(s.endAt)}`;
              const selectedFlag = selected?.id === s.id;
              return (
                <Chip key={s.id}
                  clickable icon={<AccessTimeRounded fontSize="small" />}
                  label={label}
                  variant={selectedFlag ? "filled" : "outlined"}
                  onClick={()=> setSelected(s)}
                  sx={{ borderRadius: 2 }}
                />
              );
            })}
          </Stack>
        ) : (
          <Typography sx={{opacity:.75}}>Sem slots disponíveis neste dia.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={doConfirm} variant="contained" disabled={!selected}>
          {isPending ? "Reagendar" : "Enviar pedido"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

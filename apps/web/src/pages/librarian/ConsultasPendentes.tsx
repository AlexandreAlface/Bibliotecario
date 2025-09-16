import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  WhiteCard,
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listPendingConsultationsForLibrarian,
  confirmConsultation,
  declineConsultation,
  listOpenSlots,
  createProposalForConsultation,
  listLibrarianProposals,
  acceptProposal,
  declineProposal,
  checkLibrarianConflict,
} from "@/services/consultations";
import {
  CalendarClock,
  Clock3,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* -------------------- helpers -------------------- */
const fmtDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

function fmtRange(start?: string | Date | null, end?: string | Date | null) {
  if (!start || !end) return "Sem horário";
  const a = new Date(start);
  const b = new Date(end);
  return `${fmtDate.format(a)}, ${fmtTime.format(a)} — ${fmtTime.format(b)}`;
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Typography variant="subtitle1">{title}</Typography>
      <Chip
        size="small"
        label={count}
        sx={{ fontWeight: 600 }}
        color="default"
        variant="outlined"
      />
    </Stack>
  );
}

function LineCard({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "success";
}) {
  // usa uma chave tipada do palette (nada de string dinâmica)
  const paletteKey: "primary" | "warning" | "success" =
    tone === "warn" ? "warning" : tone === "success" ? "success" : "primary";

  return (
    <WhiteCard
      sx={{
        borderLeft: (t) => `4px solid ${t.palette[paletteKey].main}`,
        pl: 2,
      }}
    >
      {children}
    </WhiteCard>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <WhiteCard>
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        {children}
      </Typography>
    </WhiteCard>
  );
}

/* -------------------- página -------------------- */
export default function LibrarianConsultasPendentes() {
  const { user } = useUserSession();
  const librarianId = user!.id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [cs, ps] = await Promise.all([
        listPendingConsultationsForLibrarian(librarianId),
        listLibrarianProposals(librarianId, { status: "PENDING", limit: 50 }),
      ]);
      setConsultas(cs || []);
      setPropostas(ps?.items || []);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar pedidos/propostas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [librarianId]);

  const consultasComSlot = useMemo(
    () => consultas.filter((c) => c.startAt && c.endAt),
    [consultas]
  );
  const consultasSemSlot = useMemo(
    () => consultas.filter((c) => !c.startAt || !c.endAt),
    [consultas]
  );

  return (
    <Box sx={{ py: 3, display: "grid", gap: 3 }}>
      <Typography variant="h5">Pedidos de consulta</Typography>

      {err && (
        <Alert severity="error" variant="outlined">
          {err}
        </Alert>
      )}
      {loading && (
        <WhiteCard>
          <Stack spacing={1}>
            <Skeleton height={28} width="40%" />
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </Stack>
        </WhiteCard>
      )}

      {/* 1) Pedidos sem horário → propor slot */}
      <section>
        <SectionHeader
          title="Novas solicitações (sem horário)"
          count={consultasSemSlot.length}
        />
        {consultasSemSlot.length === 0 && !loading && (
          <Empty>Sem pedidos por agendar.</Empty>
        )}
        <Stack spacing={2}>
          {consultasSemSlot.map((c) => (
            <PedidoSemSlotCard
              key={c.id}
              c={c}
              librarianId={librarianId}
              onChanged={load}
            />
          ))}
        </Stack>
      </section>

      {/* 2) Pedidos com slot (família escolheu) → aceitar/recusar/reagendar */}
      <section>
        <SectionHeader
          title="Solicitações com proposta de horário"
          count={consultasComSlot.length}
        />
        {consultasComSlot.length === 0 && !loading && (
          <Empty>Sem pedidos com horário.</Empty>
        )}
        <Stack spacing={2}>
          {consultasComSlot.map((c) => (
            <PedidoComSlotCard
              key={c.id}
              c={c}
              librarianId={librarianId}
              onChanged={load}
            />
          ))}
        </Stack>
      </section>

      {/* 3) Propostas de reagendamento pendentes */}
      <section>
        <SectionHeader
          title="Propostas de reagendamento"
          count={propostas.length}
        />
        {propostas.length === 0 && !loading && (
          <Empty>Sem propostas pendentes.</Empty>
        )}
        <Stack spacing={2}>
          {propostas.map((p: any) => (
            <PropostaRow
              key={p.id}
              p={p}
              librarianId={librarianId}
              onChanged={load}
            />
          ))}
        </Stack>
      </section>
    </Box>
  );
}

/* --------- Card: pedido SEM slot → propor horário --------- */
function PedidoSemSlotCard({
  c,
  librarianId,
  onChanged,
}: {
  c: any;
  librarianId: number;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <LineCard>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={18} />
            <Typography variant="subtitle1">
              {c.family?.fullName ?? `Família #${c.familyId}`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarClock size={16} />
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Sem horário •{" "}
              {c.library?.name
                ? `Biblioteca ${c.library.name}`
                : "Biblioteca não definida"}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <PrimaryButton onClick={() => setOpen(true)}>
            Propor horário
          </PrimaryButton>
          <SecondaryButton
            variant="outlined"
            onClick={async () => {
              await declineConsultation(c.id);
              onChanged();
            }}
          >
            Recusar
          </SecondaryButton>
        </Stack>
      </Stack>

      <SlotPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        librarianId={librarianId}
        onPick={async (slot) => {
          await createProposalForConsultation(c.id, {
            toStartAt: slot.startAt,
            toEndAt: slot.endAt,
            proposedBy: "LIBRARIAN",
          });
          setOpen(false);
          onChanged();
        }}
      />
    </LineCard>
  );
}

/* --------- Card: pedido COM slot → aceitar/recusar/reagendar --------- */
function PedidoComSlotCard({
  c,
  librarianId,
  onChanged,
}: {
  c: any;
  librarianId: number;
  onChanged: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [openReschedule, setOpenReschedule] = useState(false); // NOVO: dialog reagendar

  const start = c.startAt ? new Date(c.startAt) : null;
  const end = c.endAt ? new Date(c.endAt) : null;

  useEffect(() => {
    if (!start || !end) return;
    checkLibrarianConflict(librarianId, {
      startAt: start,
      endAt: end,
      excludeConsultationId: c.id,
    })
      .then(
        ({ conflict }) =>
          conflict && setMsg("Conflito com outra consulta confirmada")
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId, c.id, c.startAt, c.endAt]);

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={18} />
            <Typography variant="subtitle1">
              {c.family?.fullName ?? `Família #${c.familyId}`}
            </Typography>
            <Chip size="small" label="Pendente" variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Clock3 size={16} />
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {fmtRange(c.startAt, c.endAt)}
            </Typography>
            {msg && (
              <Chip
                size="small"
                color="warning"
                icon={<AlertTriangle size={16} />}
                label={msg}
              />
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <PrimaryButton
            onClick={async () => {
              try {
                setMsg(null);
                await confirmConsultation(c.id);
                onChanged();
              } catch (e: any) {
                const m =
                  e?.message?.includes("conflict")
                    ? "Conflito com outra consulta confirmada"
                    : e?.message || "Erro";
                setMsg(m);
              }
            }}
            startIcon={<CheckCircle2 size={18} />}
          >
            Aceitar
          </PrimaryButton>

          {/* NOVO: Reagendar → abre selector de slots e cria proposal */}
          <SecondaryButton
            onClick={() => setOpenReschedule(true)}
            startIcon={<CalendarClock size={18} />}
          >
            Reagendar
          </SecondaryButton>

          <SecondaryButton
            variant="outlined"
            onClick={async () => {
              await declineConsultation(c.id);
              onChanged();
            }}
            startIcon={<XCircle size={18} />}
          >
            Recusar
          </SecondaryButton>
        </Stack>
      </Stack>

      {/* Dialog de reagendamento */}
      <SlotPickerDialog
        open={openReschedule}
        onClose={() => setOpenReschedule(false)}
        librarianId={librarianId}
        onPick={async (slot) => {
          try {
            await createProposalForConsultation(c.id, {
              toStartAt: slot.startAt,
              toEndAt: slot.endAt,
              proposedBy: "LIBRARIAN",
            });
            setOpenReschedule(false);
            onChanged();
          } catch (e: any) {
            setMsg(e?.message || "Erro ao propor novo horário");
          }
        }}
      />
    </LineCard>
  );
}

/* --------- Row: proposta de reagendamento --------- */
function PropostaRow({
  p,
  librarianId,
  onChanged,
}: {
  p: any;
  librarianId: number;
  onChanged: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const start = new Date(p.toStartAt),
    end = new Date(p.toEndAt);

  useEffect(() => {
    checkLibrarianConflict(librarianId, {
      startAt: start,
      endAt: end,
      excludeConsultationId: p.consultation.id,
    })
      .then(
        ({ conflict }) =>
          conflict && setMsg("Conflito com outra consulta confirmada")
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId, p?.id]);

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={18} />
            <Typography variant="subtitle1">
              {p.consultation.family?.fullName}
            </Typography>
            <Chip
              size="small"
              label={
                p.proposedBy === "FAMILY"
                  ? "Proposta da família"
                  : "Proposta do bibliotecário"
              }
              variant="outlined"
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Clock3 size={16} />
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {fmtRange(start, end)}
            </Typography>
            {msg && (
              <Chip
                size="small"
                color="warning"
                icon={<AlertTriangle size={16} />}
                label={msg}
              />
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <PrimaryButton
            onClick={async () => {
              try {
                await acceptProposal(p.id);
                onChanged();
              } catch (e: any) {
                setMsg(e?.message || "Erro");
              }
            }}
            startIcon={<CheckCircle2 size={18} />}
          >
            Aceitar
          </PrimaryButton>
          <SecondaryButton
            variant="outlined"
            onClick={async () => {
              await declineProposal(p.id);
              onChanged();
            }}
            startIcon={<XCircle size={18} />}
          >
            Recusar
          </SecondaryButton>
        </Stack>
      </Stack>
    </LineCard>
  );
}

/* --------- Dialog: selector de slots (agrupado por dia) --------- */
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
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // janela de 14 dias (com “ver +14”)
  const [days, setDays] = useState(14);

  useEffect(() => {
    async function run() {
      if (!open) return;
      setLoading(true);
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + days);
      try {
        const data = await listOpenSlots({
          from: from.toISOString(),
          to: to.toISOString(),
          librarianId,
        });
        setSlots(data);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [open, librarianId, days]);

  // agrupar por dia
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of slots) {
      const d = new Date(s.startAt);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([key, arr]) => ({
        key,
        label: fmtDate.format(new Date(arr[0].startAt)),
        items: arr.sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      }))
      .sort(
        (a, b) =>
          new Date(a.items[0].startAt).getTime() -
          new Date(b.items[0].startAt).getTime()
      );
  }, [slots]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Escolher horário</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Stack spacing={1}>
            <Skeleton height={20} width="40%" />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Stack>
        )}

        {!loading && grouped.length === 0 && (
          <Typography>Sem slots abertos nos próximos {days} dias.</Typography>
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
                  return (
                    <Chip
                      key={s.id}
                      clickable
                      onClick={() => onPick(s)}
                      label={`${fmtTime.format(a)} — ${fmtTime.format(b)}`}
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </Stack>
            </WhiteCard>
          ))}
        </Stack>

        {!loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Tooltip title="Mostrar mais 14 dias">
              <IconButton onClick={() => setDays((d) => d + 14)}>
                <CalendarClock />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
      </DialogActions>
    </Dialog>
  );
}

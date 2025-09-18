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
import type { SlotLite } from "@/services/consultations";

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

function SectionHeader({ title, count }: { title: string; count: number }) {
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

  // 1) PENDING com horário (família propôs)…
  const consultasComSlot = useMemo(
    () => consultas.filter((c) => c.startAt && c.endAt),
    [consultas]
  );

  // …mas se o bibliotecário já propôs reagendamento para essa consulta,
  // ela sai desta lista e vai somente para “Propostas de reagendamento”.
  const librarianPendingSet = useMemo(() => {
    const set = new Set<number>();
    for (const p of propostas) {
      if (p?.proposedBy === "LIBRARIAN" && p?.consultation?.id) {
        set.add(Number(p.consultation.id));
      }
    }
    return set;
  }, [propostas]);

  const consultasComSlotSemPropDoBibliotecario = useMemo(
    () =>
      consultasComSlot.filter((c) => !librarianPendingSet.has(Number(c.id))),
    [consultasComSlot, librarianPendingSet]
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

      {/* ✅ Só esta secção fica: pedidos com slot, EXCLUINDO os que já têm proposta do bibliotecário */}
      <section>
        <SectionHeader
          title="Solicitações com proposta de horário"
          count={consultasComSlotSemPropDoBibliotecario.length}
        />
        {consultasComSlotSemPropDoBibliotecario.length === 0 && !loading && (
          <Empty>Sem pedidos com horário.</Empty>
        )}
        <Stack spacing={2}>
          {consultasComSlotSemPropDoBibliotecario.map((c) => (
            <PedidoComSlotCard
              key={c.id}
              c={c}
              librarianId={librarianId}
              onChanged={load}
            />
          ))}
        </Stack>
      </section>

      {/* ✅ Todas as propostas pendentes (família e bibliotecário) */}
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
  const [openReschedule, setOpenReschedule] = useState(false);

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
                const m = e?.message?.includes("conflict")
                  ? "Conflito com outra consulta confirmada"
                  : e?.message || "Erro";
                setMsg(m);
              }
            }}
            startIcon={<CheckCircle2 size={18} />}
          >
            Aceitar
          </PrimaryButton>

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
            onChanged(); // refaz fetch → consulta sai desta lista e aparece em “Propostas…”
          } catch (e: any) {
            const m = String(e?.message || "");
            if (m.includes("pending_proposal_other_actor")) {
              setMsg(
                "Já existe proposta pendente da família. Aguarde a decisão ou peça para a recusarem."
              );
            } else if (m.includes("invalid_state")) {
              setMsg(
                "Esta consulta não pode ser reagendada (estado inválido)."
              );
            } else if (m.includes("invalid_dates")) {
              setMsg("Intervalo inválido.");
            } else {
              setMsg("Erro ao propor novo horário");
            }
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

  const fromStart = p.fromStartAt ? new Date(p.fromStartAt) : null;
  const fromEnd = p.fromEndAt ? new Date(p.fromEndAt) : null;
  const start = new Date(p.toStartAt);
  const end = new Date(p.toEndAt);

  const isFromFamily = p.proposedBy === "FAMILY";

  // Nesta página, quem usa é o bibliotecário → só pode aceitar quando a proposta veio da família
  const canAccept = isFromFamily;
  const canDecline = true; // Ambos podem recusar/cancelar

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
              label={isFromFamily ? "Proposta da família" : "Proposta do bibliotecário"}
              variant="outlined"
            />
            {!canAccept && (
              <Chip
                size="small"
                color="default"
                variant="outlined"
                label="A aguardar resposta da família"
              />
            )}
          </Stack>

          {/* Horário antigo e novo */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            useFlexGap
            flexWrap="wrap"
          >
            {fromStart && fromEnd && (
              <Chip
                size="small"
                variant="outlined"
                icon={<Clock3 size={16} />}
                label={`Antigo: ${fmtRange(fromStart, fromEnd)}`}
              />
            )}
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              icon={<CalendarClock size={16} />}
              label={`Proposto: ${fmtRange(start, end)}`}
            />
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
          {canAccept && (
            <PrimaryButton
              onClick={async () => {
                try {
                  await acceptProposal(p.id);
                  onChanged();
                } catch (e: any) {
                  // 403 vem do backend quando quem propôs tenta aceitar
                  const m = String(e?.message || "");
                  if (m.includes("forbidden")) {
                    setMsg("Não pode aceitar a própria proposta.");
                  } else if (m.includes("conflict")) {
                    setMsg("Conflito com outra consulta confirmada");
                  } else {
                    setMsg(e?.message || "Erro");
                  }
                }
              }}
              startIcon={<CheckCircle2 size={18} />}
            >
              Aceitar
            </PrimaryButton>
          )}

          {canDecline && (
            <SecondaryButton
              variant="outlined"
              onClick={async () => {
                try {
                  await declineProposal(p.id);
                  onChanged();
                } catch (e: any) {
                  setMsg(e?.message || "Erro ao cancelar/recusar");
                }
              }}
              startIcon={<XCircle size={18} />}
            >
              {isFromFamily ? "Recusar" : "Cancelar proposta"}
            </SecondaryButton>
          )}
        </Stack>
      </Stack>
    </LineCard>
  );
}


/* --------- Dialog: selector de slots (com seleção + confirmar) --------- */
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
  const [windowStart, setWindowStart] = useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = useState<Date | null>(null);
  const [noMore, setNoMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlots([]);
    setSelected(null);
    setNoMore(false);

    (async () => {
      setInitialLoading(true);
      const start = new Date();
      const end = addDays(start, 14);
      try {
        const data = await listOpenSlots({
          from: start.toISOString(),
          to: end.toISOString(),
          librarianId,
        });
        setSlots(dedupMerge([], data));
        setWindowStart(start);
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
  function dedupMerge(prev: SlotLite[], next: SlotLite[]) {
    const map = new Map<number, SlotLite>();
    for (const s of prev) map.set(Number(s.id), s);
    for (const s of next) map.set(Number(s.id), s);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }
  async function handleShowMore() {
    if (!windowEnd || moreLoading || initialLoading || noMore) return;
    setMoreLoading(true);
    const from = new Date(windowEnd);
    const to = addDays(from, 14);
    try {
      const data = await listOpenSlots({
        from: from.toISOString(),
        to: to.toISOString(),
        librarianId,
      });
      setSlots((prev: SlotLite[]) => dedupMerge(prev, data));
      setWindowEnd(to);
      setNoMore(data.length === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SlotLite[]>();
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
        {initialLoading && slots.length === 0 && (
          <Stack spacing={1}>
            <Skeleton height={20} width="40%" />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Stack>
        )}

        {!initialLoading && grouped.length === 0 && (
          <Typography>
            Sem slots abertos{" "}
            {windowStart && windowEnd
              ? `entre ${fmtDate.format(windowStart)} e ${fmtDate.format(
                  windowEnd
                )}`
              : "nos próximos 14 dias"}
            .
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
                  const isSelected = selected?.id === s.id;
                  const a = new Date(s.startAt);
                  const b = new Date(s.endAt);
                  return (
                    <Chip
                      key={s.id}
                      clickable
                      onClick={() =>
                        setSelected((prev: SlotLite | null) =>
                          prev?.id === s.id ? null : s
                        )
                      }
                      label={`${fmtTime.format(a)} — ${fmtTime.format(b)}`}
                      variant={isSelected ? "filled" : "outlined"}
                      color={isSelected ? "primary" : "default"}
                      sx={{ mb: 1 }}
                    />
                  );
                })}
              </Stack>
            </WhiteCard>
          ))}
        </Stack>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Tooltip
            title={noMore ? "Sem mais resultados" : "Mostrar mais 14 dias"}
          >
            <span>
              <IconButton
                onClick={handleShowMore}
                disabled={moreLoading || initialLoading || noMore}
                aria-label="Mostrar mais 14 dias"
              >
                <CalendarClock />
              </IconButton>
            </span>
          </Tooltip>

          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {selected
              ? `Selecionado: ${fmtRange(selected.startAt, selected.endAt)}`
              : "Selecione um horário"}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
        <PrimaryButton
          onClick={() => selected && onPick(selected)}
          disabled={!selected || initialLoading || moreLoading}
        >
          Confirmar
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}

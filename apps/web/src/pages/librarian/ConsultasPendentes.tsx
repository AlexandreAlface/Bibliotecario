/**
 * ============================================================
 *  Pedidos de consulta (versão Bibliotecário)
 *  Refatorado e comentado — com helpers PUROS e funções pequenas
 *
 *  Autor do trabalho (aluno): <O TEU NOME AQUI> — Nº <O TEU NÚMERO AQUI>
 *  👉 Substitui a linha acima pelos teus dados.
 * ============================================================
 */

import { useEffect, useMemo, useState, useCallback } from "react";
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
  RefreshCw,
  Building2,
  User2,
  MapPin,
  ArrowRightLeft,
} from "lucide-react";
import type { SlotLite } from "@/services/consultations";

/* ============================================================
 * Helpers PUROS (sem efeitos colaterais) — fáceis de testar
 * ============================================================ */

/** [PURO] formatadores de data/hora (memoizáveis no módulo) */
const fmtDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

/** [PURO] String do intervalo “DD/MM/AAAA, HH:MM — HH:MM” ou fallback */
function fmtRange(
  start?: string | Date | null,
  end?: string | Date | null
): string {
  if (!start || !end) return "Sem horário";
  const a = new Date(start);
  const b = new Date(end);
  return `${fmtDate.format(a)}, ${fmtTime.format(a)} — ${fmtTime.format(b)}`;
}

/** [PURO] devolve as consultas com horário proposto (startAt & endAt) */
function computeConsultasComSlot(consultas: any[]): any[] {
  return (consultas || []).filter((c) => c.startAt && c.endAt);
}

/** [PURO] devolve um Set com ids de consultas que já têm proposta do bibliotecário */
function buildLibrarianPendingSet(propostas: any[]): Set<number> {
  const set = new Set<number>();
  for (const p of propostas || []) {
    if (p?.proposedBy === "LIBRARIAN" && p?.consultation?.id) {
      set.add(Number(p.consultation.id));
    }
  }
  return set;
}

/** [PURO] utilidade para deduplicar slots por id e ordenar por hora */
function dedupMergeSlots(prev: SlotLite[], next: SlotLite[]): SlotLite[] {
  const map = new Map<number, SlotLite>();
  for (const s of prev) map.set(Number(s.id), s);
  for (const s of next) map.set(Number(s.id), s);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

/** [PURO] somar dias a uma data (não muta o original) */
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ============================================================
 * Subcomponentes de UI pequenos e reaproveitáveis
 * ============================================================ */

function PageHeader({
  title,
  onRefresh,
  loading,
}: {
  title: string;
  onRefresh: () => void;
  loading?: boolean;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1 }}
    >
      <Typography variant="h5" fontWeight={900}>
        {title}
      </Typography>
      <Tooltip title="Atualizar">
        <span>
          <IconButton onClick={onRefresh} disabled={!!loading}>
            <RefreshCw size={18} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function SectionHeader({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      {!!icon && <Box sx={{ lineHeight: 0 }}>{icon}</Box>}
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
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

/* ============================================================
 * Hook para carregar dados (mantido curto e focado)
 * ============================================================ */

function usePendingData(librarianId: number) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);

  const load = useCallback(async () => {
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
  }, [librarianId]);

  useEffect(() => {
    if (Number.isFinite(librarianId)) load();
  }, [librarianId, load]);

  return { loading, err, consultas, propostas, reload: load };
}

/* ============================================================
 * Página (container) — pequena, delega render a sub-secções
 * ============================================================ */

export default function LibrarianConsultasPendentes() {
  const { user } = useUserSession();
  const librarianId = Number(user?.id);

  const { loading, err, consultas, propostas, reload } =
    usePendingData(librarianId);

  // 1) PENDING com horário (família propôs)…
  const consultasComSlot = useMemo(
    () => computeConsultasComSlot(consultas),
    [consultas]
  );
  // 2) Remover as que já têm proposta pendente do bibliotecário
  const anyPendingSet = useMemo(() => {
    const s = new Set<number>();
    for (const p of propostas || []) {
      if (p?.consultation?.id) s.add(Number(p.consultation.id));
    }
    return s;
  }, [propostas]);
  const consultasComSlotSemProposta = useMemo(
    () => consultasComSlot.filter((c) => !anyPendingSet.has(Number(c.id))),
    [consultasComSlot, anyPendingSet]
  );

  return (
    <Box sx={{ py: 3, display: "grid", gap: 3 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
        Pedidos de consulta
      </Typography>

      <PageHeader title="Resumo" onRefresh={reload} loading={loading} />

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

      {/* ✅ Secção: pedidos com slot (excluindo os com proposta do bibliotecário) */}
      <PedidosComSlotSection
        items={consultasComSlotSemProposta}
        librarianId={librarianId}
        onChanged={reload}
        loading={loading}
      />

      {/* ✅ Secção: propostas pendentes (família + bibliotecário) */}
      <PropostasSection
        propostas={propostas}
        librarianId={librarianId}
        onChanged={reload}
        loading={loading}
      />
    </Box>
  );
}

/* ============================================================
 * Secção: Pedidos com slot
 * ============================================================ */

function PedidosComSlotSection({
  items,
  librarianId,
  onChanged,
  loading,
}: {
  items: any[];
  librarianId: number;
  onChanged: () => void;
  loading?: boolean;
}) {
  return (
    <section>
      <SectionHeader
        title="Solicitações com proposta de horário"
        count={items.length}
        icon={<CalendarClock size={18} />}
      />
      {items.length === 0 && !loading && (
        <Empty>Sem pedidos com horário.</Empty>
      )}
      <Stack spacing={2}>
        {items.map((c) => (
          <PedidoComSlotCard
            key={c.id}
            c={c}
            librarianId={librarianId}
            onChanged={onChanged}
          />
        ))}
      </Stack>
    </section>
  );
}

/* ============================================================
 * Secção: Propostas pendentes
 * ============================================================ */

function PropostasSection({
  propostas,
  librarianId,
  onChanged,
  loading,
}: {
  propostas: any[];
  librarianId: number;
  onChanged: () => void;
  loading?: boolean;
}) {
  return (
    <section>
      <SectionHeader
        title="Propostas de reagendamento"
        count={propostas.length}
        icon={<ArrowRightLeft size={18} />}
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
            onChanged={onChanged}
          />
        ))}
      </Stack>
    </section>
  );
}

/* ============================================================
 * Card: pedido COM slot → aceitar / recusar / reagendar
 * ============================================================ */

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

  // Validação de conflito ao montar/atualizar o horário proposto
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

  const hasChild = !!c.child?.name;
  const hasLib = !!c.library?.name;

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        {/* Meta do pedido */}
        <Stack spacing={0.75}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={18} />
            <Typography variant="subtitle1" fontWeight={700}>
              {c.family?.fullName ?? `Família #${c.familyId}`}
            </Typography>
            <Chip
              size="small"
              label="Pendente"
              variant="outlined"
              icon={<AlertTriangle size={14} />}
            />
          </Stack>

          {/* Metadados com ícones */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              size="small"
              variant="outlined"
              icon={<Clock3 size={14} />}
              label={fmtRange(c.startAt, c.endAt)}
            />
            {hasChild && (
              <Chip
                size="small"
                variant="outlined"
                icon={<User2 size={14} />}
                label={c.child.name}
              />
            )}
            {hasLib && (
              <Chip
                size="small"
                variant="outlined"
                icon={<Building2 size={14} />}
                label={c.library.name}
              />
            )}
            {c.location && (
              <Chip
                size="small"
                variant="outlined"
                icon={<MapPin size={14} />}
                label={String(c.location)}
              />
            )}
            {msg && (
              <Chip
                size="small"
                color="warning"
                icon={<AlertTriangle size={14} />}
                label={msg}
              />
            )}
          </Stack>
        </Stack>

        {/* Ações */}
        <Stack direction="row" spacing={1}>
          <Tooltip title="Aceitar e confirmar este horário">
            <span>
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
            </span>
          </Tooltip>

          <Tooltip title="Propor novo horário">
            <span>
              <SecondaryButton
                onClick={() => setOpenReschedule(true)}
                startIcon={<CalendarClock size={18} />}
              >
                Reagendar
              </SecondaryButton>
            </span>
          </Tooltip>

          <Tooltip title="Recusar pedido">
            <span>
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
            </span>
          </Tooltip>
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
            onChanged(); // sai desta lista e aparece em “Propostas…”
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

/* ============================================================
 * Row: proposta de reagendamento (aceitar/recusar/cancelar)
 * ============================================================ */

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
  const canAccept = isFromFamily; // bibliotecário só aceita quando veio da família
  const canDecline = true; // ambos podem recusar/cancelar

  // Validação de conflito para a janela proposta
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

  const hasChild = !!p.consultation?.child?.name;
  const hasLib = !!p.consultation?.library?.name;

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack spacing={0.75}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={18} />
            <Typography variant="subtitle1" fontWeight={700}>
              {p.consultation.family?.fullName}
            </Typography>
            <Chip
              size="small"
              label={
                isFromFamily
                  ? "Proposta da família"
                  : "Proposta do bibliotecário"
              }
              variant="outlined"
              icon={<ArrowRightLeft size={14} />}
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

          {/* Horário antigo e novo + metadados */}
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
                icon={<Clock3 size={14} />}
                label={`Antigo: ${fmtRange(fromStart, fromEnd)}`}
              />
            )}
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              icon={<CalendarClock size={14} />}
              label={`Proposto: ${fmtRange(start, end)}`}
            />
            {hasChild && (
              <Chip
                size="small"
                variant="outlined"
                icon={<User2 size={14} />}
                label={p.consultation.child.name}
              />
            )}
            {hasLib && (
              <Chip
                size="small"
                variant="outlined"
                icon={<Building2 size={14} />}
                label={p.consultation.library.name}
              />
            )}
            {p.consultation?.location && (
              <Chip
                size="small"
                variant="outlined"
                icon={<MapPin size={14} />}
                label={String(p.consultation.location)}
              />
            )}
            {msg && (
              <Chip
                size="small"
                color="warning"
                icon={<AlertTriangle size={14} />}
                label={msg}
              />
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          {canAccept && (
            <Tooltip title="Aceitar a proposta da família">
              <span>
                <PrimaryButton
                  onClick={async () => {
                    try {
                      await acceptProposal(p.id);
                      onChanged();
                    } catch (e: any) {
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
              </span>
            </Tooltip>
          )}

          {canDecline && (
            <Tooltip
              title={
                isFromFamily
                  ? "Recusar proposta da família"
                  : "Cancelar a sua proposta"
              }
            >
              <span>
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
                  {isFromFamily ? "Recusar" : "Cancelar"}
                </SecondaryButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </LineCard>
  );
}

/* ============================================================
 * Dialog: selector de slots (com seleção + confirmar)
 * ============================================================ */

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

  // Carregar janela inicial (14 dias)
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
        setSlots(dedupMergeSlots([], data));
        setWindowStart(start);
        setWindowEnd(end);
        setNoMore(data.length === 0);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [open, librarianId]);

  // Mostrar +14 dias
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
      setSlots((prev: SlotLite[]) => dedupMergeSlots(prev, data));
      setWindowEnd(to);
      setNoMore(data.length === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  // Group por dia (PURO + memo)
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
                      icon={<Clock3 size={14} />}
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

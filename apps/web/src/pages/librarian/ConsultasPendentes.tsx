/**
 * ============================================================
 *  Pedidos de consulta (versão Bibliotecário)
 *  Refatorado e comentado — helpers PUROS + funções pequenas
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
  Container,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
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
import { alpha } from "@mui/material/styles";

/* ============================================================
 * Helpers PUROS
 * ============================================================ */

const fmtDate = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

function fmtRange(
  start?: string | Date | null,
  end?: string | Date | null
): string {
  if (!start || !end) return "Sem horário";
  const a = new Date(start);
  const b = new Date(end);
  return `${fmtDate.format(a)}, ${fmtTime.format(a)} — ${fmtTime.format(b)}`;
}

function computeConsultasComSlot(consultas: any[]): any[] {
  return (consultas || []).filter((c) => c.startAt && c.endAt);
}

function dedupMergeSlots(prev: SlotLite[], next: SlotLite[]): SlotLite[] {
  const map = new Map<number, SlotLite>();
  for (const s of prev) map.set(Number(s.id), s);
  for (const s of next) map.set(Number(s.id), s);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ============================================================
 * UI pequena e sólida (sem glass)
 * ============================================================ */

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
    <Stack sx={{ mb: 0.75 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {!!icon && <Box sx={{ lineHeight: 0 }}>{icon}</Box>}
        <Typography variant="subtitle1" fontWeight={800}>
          {title}
        </Typography>
        <Chip size="small" label={count} sx={{ fontWeight: 800 }} />
      </Stack>
      <Divider sx={{ mt: 1 }} />
    </Stack>
  );
}

function DatePill({
  start,
  end,
}: {
  start?: string | Date | null;
  end?: string | Date | null;
}) {
  const a = start ? new Date(start) : null;
  const b = end ? new Date(end) : null;
  const day = a ? a.toLocaleDateString("pt-PT", { day: "2-digit" }) : "—";
  const mon = a ? a.toLocaleDateString("pt-PT", { month: "short" }) : "";
  const time =
    a && b ? `${fmtTime.format(a)} — ${fmtTime.format(b)}` : undefined;

  return (
    <Box
      sx={(t) => ({
        width: 88,
        borderRadius: 2,
        border: `1px solid ${t.palette.divider}`,
        backgroundColor: alpha(t.palette.primary.main, 0.06),
        p: 1,
        textAlign: "center",
      })}
    >
      <Typography fontWeight={900} lineHeight={1}>
        {day}
      </Typography>
      <Typography
        variant="caption"
        sx={{ textTransform: "uppercase", opacity: 0.7, lineHeight: 1 }}
      >
        {mon}
      </Typography>
      {time && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
          {time}
        </Typography>
      )}
    </Box>
  );
}

function Meta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ lineHeight: 0, opacity: 0.8 }}>{icon}</Box>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {children}
      </Typography>
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
  return (
    <WhiteCard
      sx={(t) => ({
        p: 1.5,
        borderRadius: 3,
        border: `1px solid ${t.palette.divider}`,
        backgroundColor: t.palette.background.paper,
        backgroundImage: "none",
        boxShadow: "0 2px 10px rgba(0,0,0,.05)",
        borderLeft: `4px solid ${
          tone === "warn"
            ? t.palette.warning.main
            : tone === "success"
            ? t.palette.success.main
            : t.palette.primary.main
        }`,
      })}
    >
      {children}
    </WhiteCard>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <WhiteCard
      sx={(t) => ({
        py: 3,
        borderRadius: 3,
        border: `1px dashed ${t.palette.divider}`,
        backgroundColor: t.palette.background.paper,
        backgroundImage: "none",
        textAlign: "center",
      })}
    >
      <Stack spacing={1} alignItems="center">
        <CalendarClock size={18} />
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          {children}
        </Typography>
      </Stack>
    </WhiteCard>
  );
}

/* ============================================================
 * Hook de dados
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
 * Página
 * ============================================================ */

export default function LibrarianConsultasPendentes() {
  const { user } = useUserSession();
  const librarianId = Number(user?.id);

  const { loading, err, consultas, propostas, reload } =
    usePendingData(librarianId);

  const consultasComSlot = useMemo(
    () => computeConsultasComSlot(consultas),
    [consultas]
  );

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
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h4" fontWeight={900}>
            Pedidos de consulta
          </Typography>
          <Tooltip title="Atualizar">
            <span>
              <IconButton onClick={reload} disabled={!!loading}>
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {err && (
          <Alert severity="error" variant="outlined">
            {err}
          </Alert>
        )}

        {loading && !consultas.length && !propostas.length ? (
          <WhiteCard>
            <Stack spacing={1}>
              <Skeleton height={24} width="40%" />
              <Skeleton height={72} />
              <Skeleton height={72} />
            </Stack>
          </WhiteCard>
        ) : (
          /* >>> SURFACE DE FUNDO (o “background” pedido) <<< */
          <WhiteCard
            sx={(t) => ({
              p: { xs: 2, md: 3 },
              borderRadius: 4,
              border: `1px solid ${t.palette.divider}`,
              backgroundColor: t.palette.background.paper,
              backgroundImage: "none",
              boxShadow: "0 6px 20px rgba(0,0,0,.06)",
            })}
          >
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <PedidosComSlotSection
                  items={consultasComSlotSemProposta}
                  librarianId={librarianId}
                  onChanged={reload}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PropostasSection
                  propostas={propostas}
                  librarianId={librarianId}
                  onChanged={reload}
                  loading={loading}
                />
              </Grid>
            </Grid>
          </WhiteCard>
        )}
      </Stack>
    </Container>
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
      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
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
      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
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
 * Card: pedido COM slot
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
  }, [librarianId, c.id, c.startAt, c.endAt]);

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "104px 1fr auto" },
          gap: 16,
          alignItems: "center",
        }}
      >
        <DatePill start={c.startAt} end={c.endAt} />

        <Stack spacing={0.5} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Users size={18} />
            <Typography
              variant="subtitle2"
              fontWeight={800}
              noWrap
              title={c.family?.fullName ?? `Família #${c.familyId}`}
            >
              {c.family?.fullName ?? `Família #${c.familyId}`}
            </Typography>
            <Chip
              size="small"
              label="Pendente"
              variant="outlined"
              icon={<AlertTriangle size={14} />}
            />
            {msg && (
              <Chip
                size="small"
                color="warning"
                label={msg}
                icon={<AlertTriangle size={14} />}
              />
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            useFlexGap
            sx={{ color: "text.secondary" }}
          >
            <Meta icon={<Clock3 size={16} />}>{fmtRange(c.startAt, c.endAt)}</Meta>
            {c.child?.name && (
              <Meta icon={<User2 size={16} />}>{c.child.name}</Meta>
            )}
            {c.library?.name && (
              <Meta icon={<Building2 size={16} />}>{c.library.name}</Meta>
            )}
            {c.location && (
              <Meta icon={<MapPin size={16} />}>{String(c.location)}</Meta>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ justifySelf: "end" }}>
          <PrimaryButton
            size="small"
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
            size="small"
            onClick={() => setOpenReschedule(true)}
            startIcon={<CalendarClock size={18} />}
          >
            Reagendar
          </SecondaryButton>

          <SecondaryButton
            size="small"
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
      </Box>

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
            const m = String(e?.message || "");
            if (m.includes("pending_proposal_other_actor")) {
              setMsg("Já existe proposta pendente da família.");
            } else if (m.includes("invalid_state")) {
              setMsg("Estado inválido para reagendar.");
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
 * Row: proposta de reagendamento
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
  const canAccept = isFromFamily;

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
  }, [librarianId, p?.id]);

  return (
    <LineCard tone={msg ? "warn" : "default"}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "104px 1fr auto" },
          gap: 16,
          alignItems: "center",
        }}
      >
        <DatePill start={start} end={end} />

        <Stack spacing={0.5} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Users size={18} />
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              {p.consultation.family?.fullName}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              icon={<ArrowRightLeft size={14} />}
              label={
                isFromFamily
                  ? "Proposta da família"
                  : "Proposta do bibliotecário"
              }
            />
            {!canAccept && (
              <Chip
                size="small"
                variant="outlined"
                label="A aguardar resposta da família"
              />
            )}
            {msg && (
              <Chip
                size="small"
                color="warning"
                label={msg}
                icon={<AlertTriangle size={14} />}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {fromStart && fromEnd && (
              <Meta icon={<Clock3 size={16} />}>
                Antigo: {fmtRange(fromStart, fromEnd)}
              </Meta>
            )}
            <Meta icon={<CalendarClock size={16} />}>
              Proposto: {fmtRange(start, end)}
            </Meta>
            {p.consultation?.child?.name && (
              <Meta icon={<User2 size={16} />}>
                {p.consultation.child.name}
              </Meta>
            )}
            {p.consultation?.library?.name && (
              <Meta icon={<Building2 size={16} />}>
                {p.consultation.library.name}
              </Meta>
            )}
            {p.consultation?.location && (
              <Meta icon={<MapPin size={16} />}>
                {String(p.consultation.location)}
              </Meta>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ justifySelf: "end" }}>
          {canAccept && (
            <PrimaryButton
              size="small"
              onClick={async () => {
                try {
                  await acceptProposal(p.id);
                  onChanged();
                } catch (e: any) {
                  const m = String(e?.message || "");
                  if (m.includes("forbidden"))
                    setMsg("Não pode aceitar a própria proposta.");
                  else if (m.includes("conflict"))
                    setMsg("Conflito com outra consulta confirmada");
                  else setMsg(m || "Erro");
                }
              }}
              startIcon={<CheckCircle2 size={18} />}
            >
              Aceitar
            </PrimaryButton>
          )}
          <SecondaryButton
            size="small"
            variant="outlined"
            onClick={async () => {
              try {
                await declineProposal(p.id);
                onChanged();
              } catch (e: any) {
                setMsg(e?.message || "Erro");
              }
            }}
            startIcon={<XCircle size={18} />}
          >
            {isFromFamily ? "Recusar" : "Cancelar"}
          </SecondaryButton>
        </Stack>
      </Box>
    </LineCard>
  );
}

/* ============================================================
 * Dialog: selector de slots
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
            <WhiteCard
              key={g.key}
              sx={(t) => ({
                p: 1.5,
                border: `1px solid ${t.palette.divider}`,
                backgroundColor: t.palette.background.paper,
                backgroundImage: "none",
              })}
            >
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

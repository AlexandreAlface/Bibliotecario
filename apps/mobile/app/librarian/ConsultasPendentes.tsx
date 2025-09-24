import * as React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import { API_URL } from "src/services/api";

import {
  listOpenSlots,
  createProposalForConsultation,
  listLibrarianProposals,
  acceptProposal,
  declineProposal,
  checkLibrarianConflict,
} from "src/services/librarian/consultations";

/* ---------------- helpers de data ---------------- */
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate()+days); return x; }
function fmtRange(a?: string | Date | null, b?: string | Date | null) {
  if (!a || !b) return "";
  const A = typeof a === "string" ? new Date(a) : a;
  const B = typeof b === "string" ? new Date(b) : b;
  const day = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(A);
  const t1 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(A);
  const t2 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(B);
  return `${day} • ${t1} — ${t2}`;
}

/* ---------------- tipos ---------------- */
type Status = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
type ConsultationLite = {
  id: number | string;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: Status | null;
  family?: { id: number; fullName?: string | null } | null;
  familyId?: number | null;
  librarian?: { id: number; fullName?: string | null } | null;
  librarianName?: string | null;
  library?: { id: number; name?: string | null } | null;
  child?: { id: number; name?: string | null } | null;
};

type SlotLite = { id: number; startAt: string; endAt: string };

/* ---------------- UI: pill filtro (estilo antigo) ---------------- */
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.secondaryContainer,
          borderColor: theme.colors.outlineVariant,
          borderWidth: active ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
      activeOpacity={0.85}
    >
      <Text
        style={{
          color: active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------------- CollapsibleSection ---------------- */
function CollapsibleSection({
  title,
  right,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <FlexibleCard
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={12}
      style={{ borderRadius: 12 }}
    >
      <TouchableOpacity
        onPress={() => setCollapsed((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expandir" : "Colapsar"} ${title}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Text
            style={{ fontWeight: "800", fontSize: 16, color: theme.colors.onSurface, flexShrink: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!right && <View>{right}</View>}
        </View>
        <Text style={{ color: theme.colors.onSurface, opacity: 0.7 }}>
          {collapsed ? "▼" : "▲"}
        </Text>
      </TouchableOpacity>

      {!collapsed && <View style={{ marginTop: 8 }}>{children}</View>}
    </FlexibleCard>
  );
}

/* ---------------- Selector de slots (modal) ---------------- */
function SlotPickerModal({
  visible,
  onClose,
  librarianId,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  librarianId: number;
  onPick: (slot: SlotLite) => void;
}) {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [moreLoading, setMoreLoading] = React.useState(false);
  const [noMore, setNoMore] = React.useState(false);
  const [windowStart, setWindowStart] = React.useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = React.useState<Date | null>(null);
  const [slots, setSlots] = React.useState<SlotLite[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      setNoMore(false);
      setSelectedId(null);
      try {
        const from = new Date();
        const to = addDays(from, 14);
        const data = await listOpenSlots({ from: from.toISOString(), to: to.toISOString(), librarianId });
        setSlots(Array.isArray(data) ? data : []);
        setWindowStart(from);
        setWindowEnd(to);
        setNoMore((data?.length ?? 0) === 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, librarianId]);

  async function loadMore() {
    if (!windowEnd || moreLoading || loading || noMore) return;
    setMoreLoading(true);
    try {
      const from = new Date(windowEnd);
      const to = addDays(from, 14);
      const data = await listOpenSlots({ from: from.toISOString(), to: to.toISOString(), librarianId });
      setSlots((prev) => {
        const map = new Map<number, SlotLite>();
        for (const s of prev) map.set(s.id, s);
        for (const s of (Array.isArray(data) ? data : [])) map.set(s.id, s);
        return Array.from(map.values()).sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
      });
      setWindowEnd(to);
      setNoMore((data?.length ?? 0) === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  const grouped = React.useMemo(() => {
    const byDay = new Map<string, SlotLite[]>();
    for (const s of slots) {
      const key = new Date(s.startAt).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s);
    }
    return Array.from(byDay.entries())
      .map(([key, arr]) => ({
        key,
        label: new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(arr[0].startAt)),
        items: arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      }))
      .sort((a, b) => new Date(a.items[0].startAt).getTime() - new Date(b.items[0].startAt).getTime());
  }, [slots]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: useTheme().colors.surface,
            borderWidth: 1,
            borderColor: useTheme().colors.outlineVariant,
            maxHeight: "80%",
          }}
        >
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: useTheme().colors.outlineVariant }}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: useTheme().colors.onSurface }}>Escolher horário</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
            {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

            {!loading && grouped.length === 0 && (
              <Text style={{ color: useTheme().colors.onSurfaceVariant }}>
                Sem slots abertos nos próximos 14 dias.
              </Text>
            )}

            {grouped.map((g) => (
              <View key={g.key} style={{ borderWidth: 1, borderColor: useTheme().colors.outlineVariant, borderRadius: 12, padding: 10, gap: 6 }}>
                <Text style={{ fontWeight: "700" }}>{g.label}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {g.items.map((s) => {
                    const isSel = selectedId === s.id;
                    const label = fmtRange(s.startAt, s.endAt).split(" • ")[1] || "";
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedId((prev) => (prev === s.id ? null : s.id))}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: useTheme().colors.outlineVariant,
                          backgroundColor: isSel ? useTheme().colors.primary : useTheme().colors.surface,
                        }}
                      >
                        <Text style={{ color: isSel ? useTheme().colors.onPrimary : useTheme().colors.onSurface, fontWeight: "700" }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <SecondaryButton
                label={noMore ? "Sem mais resultados" : "Ver +14 dias"}
                onPress={loadMore}
                disabled={moreLoading || loading || noMore}
              />
              {(moreLoading || loading) && <ActivityIndicator />}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: useTheme().colors.outlineVariant }}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton
              label="Confirmar"
              onPress={() => {
                const chosen = slots.find((s) => s.id === selectedId);
                if (chosen) onPick(chosen);
              }}
              disabled={!selectedId || loading || moreLoading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------------- Cartão: pedido COM slot (aceitar / reagendar / recusar) ---------------- */
function PedidoComSlotCard({
  c,
  librarianId,
  onChanged,
}: {
  c: ConsultationLite;
  librarianId: number;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [busy, setBusy] = React.useState<"confirm" | "decline" | null>(null);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [showPicker, setShowPicker] = React.useState(false);

  React.useEffect(() => {
    if (!c.startAt || !c.endAt) return;
    checkLibrarianConflict(librarianId, {
      startAt: c.startAt,
      endAt: c.endAt,
      excludeConsultationId: Number(c.id),
    })
      .then((r: any) => r?.conflict && setConflict("⚠ Conflito com outra consulta"))
      .catch(() => {});
  }, [c.id, c.startAt, c.endAt, librarianId]);

  async function confirm() {
    setBusy("confirm");
    try {
      try {
        const r = await fetch(`${API_URL}/consultations/${c.id}/confirm`, { method: "POST", credentials: "include" });
        if (!r.ok) throw new Error(await r.text());
      } catch {
        const r = await fetch(`${API_URL}/consultations/${c.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" }),
        });
        if (!r.ok) throw new Error(await r.text());
      }
      onChanged();
    } catch (e: any) {
      Alert.alert("Erro ao confirmar", e?.message || "Falha.");
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    setBusy("decline");
    try {
      try {
        const r = await fetch(`${API_URL}/consultations/${c.id}/decline`, { method: "POST", credentials: "include" });
        if (!r.ok) throw new Error(await r.text());
      } catch {
        const r = await fetch(`${API_URL}/consultations/${c.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DECLINED" }),
        });
        if (!r.ok) throw new Error(await r.text());
      }
      onChanged();
    } catch (e: any) {
      Alert.alert("Erro ao recusar", e?.message || "Falha.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800", fontSize: 16 }}>
          {c.family?.fullName ?? `Família #${c.familyId ?? "—"}`} • <Text style={{ fontWeight: "400" }}>Pendente</Text>
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{fmtRange(c.startAt, c.endAt)}</Text>
        {!!conflict && <Text style={{ color: "#9A3412" }}>{conflict}</Text>}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignSelf: "flex-start" }}>
          <PrimaryButton label="✅ Aceitar" onPress={confirm} disabled={busy === "confirm"} />
          <SecondaryButton label="📅 Reagendar" onPress={() => setShowPicker(true)} />
          <SecondaryButton label="❌ Recusar" onPress={decline} disabled={busy === "decline"} />
        </View>
      </View>

      <SlotPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        librarianId={librarianId}
        onPick={async (slot) => {
          try {
            await createProposalForConsultation(Number(c.id), {
              toStartAt: slot.startAt,
              toEndAt: slot.endAt,
              proposedBy: "LIBRARIAN",
            } as any);
            setShowPicker(false);
            onChanged();
          } catch (e: any) {
            Alert.alert("Erro ao propor horário", e?.message || "Falha.");
          }
        }}
      />
    </View>
  );
}

/* ---------------- Row: proposta de reagendamento ---------------- */
function PropostaRow({
  p,
  librarianId,
  onChanged,
}: {
  p: any;
  librarianId: number;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [busy, setBusy] = React.useState<"accept" | "decline" | null>(null);
  const [conflict, setConflict] = React.useState<string | null>(null);

  const isFromFamily = String(p?.proposedBy || "").toUpperCase() === "FAMILY";
  const canAccept = isFromFamily;
  const canDecline = true;

  React.useEffect(() => {
    if (!p?.toStartAt || !p?.toEndAt) return;
    checkLibrarianConflict(librarianId, {
      startAt: p.toStartAt,
      endAt: p.toEndAt,
      excludeConsultationId: p?.consultation?.id,
    })
      .then((r: any) => r?.conflict && setConflict("⚠ Conflito com outra consulta"))
      .catch(() => {});
  }, [p?.id, p?.toStartAt, p?.toEndAt, p?.consultation?.id, librarianId]);

  async function doAccept() {
    setBusy("accept");
    try {
      await acceptProposal(p.id);
      onChanged();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao aceitar.");
    } finally {
      setBusy(null);
    }
  }
  async function doDecline() {
    setBusy("decline");
    try {
      await declineProposal(p.id);
      onChanged();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao cancelar/recusar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800", fontSize: 16 }}>
          {p?.consultation?.family?.fullName ?? "Família"} •{" "}
          <Text style={{ fontWeight: "400" }}>
            {isFromFamily ? "Proposta da família" : "Proposta do bibliotecário"}
          </Text>
        </Text>

        <View style={{ rowGap: 4 }}>
          {!!p?.fromStartAt && !!p?.fromEndAt && (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Antigo: {fmtRange(p.fromStartAt, p.fromEndAt)}
            </Text>
          )}
          <Text style={{ color: theme.colors.onSurface }}>
            Proposto: {fmtRange(p.toStartAt, p.toEndAt)}
          </Text>
          {!!conflict && <Text style={{ color: "#9A3412" }}>{conflict}</Text>}
          {!canAccept && (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              A aguardar resposta da família
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignSelf: "flex-start" }}>
          {canAccept && (
            <PrimaryButton label="✅ Aceitar" onPress={doAccept} disabled={busy === "accept"} />
          )}
          {canDecline && (
            <SecondaryButton
              label={isFromFamily ? "❌ Recusar" : "❌ Cancelar proposta"}
              onPress={doDecline}
              disabled={busy === "decline"}
            />
          )}
        </View>
      </View>
    </View>
  );
}

/* ---------------- Página ---------------- */
export default function ConsultasPendentesComReagendamento() {
  const theme = useTheme();
  const { user } = useAuth();
  const librarianId = Number(user?.id);

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [consultas, setConsultas] = React.useState<ConsultationLite[]>([]);
  const [propostas, setPropostas] = React.useState<any[]>([]);

  type RangeKey = "today" | "tomorrow" | "next3" | "next7" | "all";
  const [range, setRange] = React.useState<RangeKey>("today");

  const { fromIso, toIso } = React.useMemo(() => {
    const now = new Date();
    if (range === "today") return { fromIso: now.toISOString(), toIso: endOfDay(now).toISOString() };
    if (range === "tomorrow") {
      const t = addDays(startOfDay(now), 1);
      return { fromIso: t.toISOString(), toIso: endOfDay(t).toISOString() };
    }
    if (range === "next3") return { fromIso: now.toISOString(), toIso: endOfDay(addDays(now, 3)).toISOString() };
    if (range === "next7") return { fromIso: now.toISOString(), toIso: endOfDay(addDays(now, 7)).toISOString() };
    return { fromIso: now.toISOString(), toIso: endOfDay(addDays(now, 180)).toISOString() };
  }, [range]);

  const load = React.useCallback(async () => {
    if (!librarianId) { setConsultas([]); setPropostas([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        librarianId: String(librarianId),
        status: "PENDING",
        from: fromIso,
        order: "asc",
        limit: "500",
      });
      if (toIso) params.set("to", toIso);
      const url = `${API_URL}/consultations/all?${params.toString()}`;
      const list = (await fetch(url, { credentials: "include" }).then((r) => r.json())) as ConsultationLite[];

      const ps = await listLibrarianProposals(librarianId, { status: "PENDING", limit: 100 }).catch(() => ({ items: [] as any[] }));
      setConsultas(Array.isArray(list) ? list : []);
      setPropostas(Array.isArray(ps?.items) ? ps.items : []);
    } catch {
      setConsultas([]);
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  }, [librarianId, fromIso, toIso]);

  React.useEffect(() => { load(); }, [load]);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const consultasComSlot = React.useMemo(
    () => (consultas || []).filter((c) => c.startAt && c.endAt),
    [consultas]
  );

  const librarianPendingSet = React.useMemo(() => {
    const set = new Set<number>();
    for (const p of propostas) {
      if (String(p?.proposedBy || "").toUpperCase() === "LIBRARIAN" && p?.consultation?.id) {
        set.add(Number(p.consultation.id));
      }
    }
    return set;
  }, [propostas]);

  const pedidosComSlotSemPropDoBibliotecario = React.useMemo(
    () => consultasComSlot.filter((c) => !librarianPendingSet.has(Number(c.id))),
    [consultasComSlot, librarianPendingSet]
  );

  return (
    <Background>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header + filtros */}
          <FlexibleCard backgroundColor={theme.colors.surface} elevation={1} padding={14} style={{ borderRadius: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "800" }}>Pedidos de consulta</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <Pill label="Hoje" active={range === "today"} onPress={() => setRange("today")} />
              <Pill label="Amanhã" active={range === "tomorrow"} onPress={() => setRange("tomorrow")} />
              <Pill label="Próx. 3 dias" active={range === "next3"} onPress={() => setRange("next3")} />
              <Pill label="Próx. 7 dias" active={range === "next7"} onPress={() => setRange("next7")} />
              <Pill label="Todos" active={range === "all"} onPress={() => setRange("all")} />
            </View>
          </FlexibleCard>

          {/* Secção: Solicitações com proposta de horário (COLAPSÁVEL) */}
          <CollapsibleSection
            title="Solicitações com proposta de horário"
            right={
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: theme.colors.secondaryContainer,
                }}
              >
                <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                  {pedidosComSlotSemPropDoBibliotecario.length}
                </Text>
              </View>
            }
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 8 }} />
            ) : pedidosComSlotSemPropDoBibliotecario.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Sem pedidos com horário.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {pedidosComSlotSemPropDoBibliotecario.map((c) => (
                  <PedidoComSlotCard key={String(c.id)} c={c} librarianId={librarianId} onChanged={load} />
                ))}
              </View>
            )}
          </CollapsibleSection>

          {/* Secção: Propostas de reagendamento (COLAPSÁVEL) */}
          <CollapsibleSection
            title="Propostas de reagendamento"
            right={
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: theme.colors.secondaryContainer,
                }}
              >
                <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                  {propostas.length}
                </Text>
              </View>
            }
            defaultCollapsed
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 8 }} />
            ) : propostas.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Sem propostas pendentes.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {propostas.map((p) => (
                  <PropostaRow key={String(p.id)} p={p} librarianId={librarianId} onChanged={load} />
                ))}
              </View>
            )}
          </CollapsibleSection>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
});

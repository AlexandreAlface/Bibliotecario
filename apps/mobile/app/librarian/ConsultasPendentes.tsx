/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/librarian/consultas-pendentes.tsx (ecrã pendentes)
 * Funcionalidade: Pedidos de consulta (aceitar/recusar) e reagendamentos
 * Autor: Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços conforme combinado:
 *  • Comentários em PT-PT em TODO o ficheiro.
 *  • Helpers PUROS (sem efeitos) e curtos (≤ 30 linhas).
 *  • Manter componentes e UI estáveis, com pequenas melhorias de UX/A11y.
 *  • Não quebrar contratos de serviços já existentes.
 * ============================================================================
 */

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

import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

/* =============================================================================
 * Helpers de data — PUROS e curtos
 * ========================================================================== */

/** startOfDay — devolve data no início do dia local (00:00). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** endOfDay — devolve data no fim do dia local (23:59:59.999). */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** addDays — devolve nova data com +N dias (não muta o original). */
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * fmtRange — formata intervalo legível "dia • h1 — h2".
 * Aceita ISO string ou Date e devolve "" se incompleto.
 */
function fmtRange(a?: string | Date | null, b?: string | Date | null) {
  if (!a || !b) return "";
  const A = typeof a === "string" ? new Date(a) : a;
  const B = typeof b === "string" ? new Date(b) : b;
  const day = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
    A
  );
  const t1 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(A);
  const t2 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(B);
  return `${day} • ${t1} — ${t2}`;
}

/* =============================================================================
 * Tipos
 * ========================================================================== */

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

/* =============================================================================
 * UI: “Pílula” (chip) de filtro — simples e reutilizável
 * ========================================================================== */
function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.pill,
        {
          backgroundColor: active
            ? theme.colors.primary
            : theme.colors.secondaryContainer,
          borderColor: theme.colors.outlineVariant,
          borderWidth: active ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
      activeOpacity={0.85}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text
        style={{
          color: active
            ? theme.colors.onPrimary
            : theme.colors.onSecondaryContainer,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =============================================================================
 * Secção colapsável genérica — para agrupar listas
 * ========================================================================== */
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
      {/* Cabeçalho clicável: alterna colapso/expansão */}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: 16,
              color: theme.colors.onSurface,
              flexShrink: 1,
            }}
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

/* =============================================================================
 * Modal: Seletor de Slots (para reagendar) — carrega slots abertos por janelas
 * ========================================================================== */
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

  // Estado de carregamento/paginação em janelas de 14 dias
  const [loading, setLoading] = React.useState(false);
  const [moreLoading, setMoreLoading] = React.useState(false);
  const [noMore, setNoMore] = React.useState(false);

  // Janela temporal atualmente carregada
  const [windowStart, setWindowStart] = React.useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = React.useState<Date | null>(null);

  // Dados e seleção
  const [slots, setSlots] = React.useState<SlotLite[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  // Ao abrir, buscar próximos 14 dias
  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      setNoMore(false);
      setSelectedId(null);
      try {
        const from = new Date();
        const to = addDays(from, 14);
        const data = await listOpenSlots({
          from: from.toISOString(),
          to: to.toISOString(),
          librarianId,
        });
        setSlots(Array.isArray(data) ? data : []);
        setWindowStart(from);
        setWindowEnd(to);
        setNoMore((data?.length ?? 0) === 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, librarianId]);

  /** loadMore — estende a janela +14 dias e junta resultados sem duplicar. */
  async function loadMore() {
    if (!windowEnd || moreLoading || loading || noMore) return;
    setMoreLoading(true);
    try {
      const from = new Date(windowEnd);
      const to = addDays(from, 14);
      const data = await listOpenSlots({
        from: from.toISOString(),
        to: to.toISOString(),
        librarianId,
      });
      // dedupe por ID e ordena cronologicamente
      setSlots((prev) => {
        const map = new Map<number, SlotLite>();
        for (const s of prev) map.set(s.id, s);
        for (const s of Array.isArray(data) ? data : []) map.set(s.id, s);
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
      });
      setWindowEnd(to);
      setNoMore((data?.length ?? 0) === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  /** Agrupa slots por dia, mantendo ordem por hora. */
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
        label: new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
          new Date(arr[0].startAt)
        ),
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop com fecho ao toque fora */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Cartão do modal (toque dentro não fecha) */}
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            maxHeight: "80%",
          }}
          accessibilityViewIsModal
          accessibilityLabel="Escolher horário"
        >
          {/* Cabeçalho */}
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                color: theme.colors.onSurface,
              }}
            >
              Escolher horário
            </Text>
          </View>

          {/* Lista de dias/slots */}
          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
            {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

            {!loading && grouped.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Sem slots abertos nos próximos 14 dias.
              </Text>
            )}

            {grouped.map((g) => (
              <View
                key={g.key}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{g.label}</Text>

                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {g.items.map((s) => {
                    const isSel = selectedId === s.id;
                    const label =
                      fmtRange(s.startAt, s.endAt).split(" • ")[1] || "";
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() =>
                          setSelectedId((prev) => (prev === s.id ? null : s.id))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Escolher ${label}`}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: isSel
                            ? theme.colors.primary
                            : theme.colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            color: isSel
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                            fontWeight: "700",
                          }}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Paginação incremental (+14 dias) */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SecondaryButton
                label={noMore ? "Sem mais resultados" : "Ver +14 dias"}
                onPress={loadMore}
                disabled={moreLoading || loading || noMore}
              />
              {(moreLoading || loading) && <ActivityIndicator />}
            </View>
          </ScrollView>

          {/* Footer: ações do modal */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
            }}
          >
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

/* =============================================================================
 * Cartão: Pedido COM slot — aceitar, reagendar (via modal) ou recusar
 * ========================================================================== */
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

  // Verifica conflito com outras consultas do bibliotecário
  React.useEffect(() => {
    if (!c.startAt || !c.endAt) return;
    checkLibrarianConflict(librarianId, {
      startAt: c.startAt,
      endAt: c.endAt,
      excludeConsultationId: Number(c.id),
    })
      .then(
        (r: any) => r?.conflict && setConflict("⚠ Conflito com outra consulta")
      )
      .catch(() => {});
  }, [c.id, c.startAt, c.endAt, librarianId]);

  /** Confirmar pedido (endpoint específico, fallback para PATCH). */
  async function confirm() {
    setBusy("confirm");
    try {
      try {
        const r = await fetch(`${API_URL}/consultations/${c.id}/confirm`, {
          method: "POST",
          credentials: "include",
        });
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

  /** Recusar pedido (endpoint específico, fallback para PATCH). */
  async function decline() {
    setBusy("decline");
    try {
      try {
        const r = await fetch(`${API_URL}/consultations/${c.id}/decline`, {
          method: "POST",
          credentials: "include",
        });
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
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ padding: 12, gap: 6 }}>
        {/* Título: Família + estado pendente */}
        <Text style={{ fontWeight: "800", fontSize: 16 }}>
          {c.family?.fullName ?? `Família #${c.familyId ?? "—"}`} •{" "}
          <Text style={{ fontWeight: "400" }}>Pendente</Text>
        </Text>

        {/* Intervalo do slot sugerido */}
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {fmtRange(c.startAt, c.endAt)}
        </Text>

        {/* Aviso de conflito (se existir) */}
        {!!conflict && <Text style={{ color: "#9A3412" }}>{conflict}</Text>}

        {/* Ações: aceitar / reagendar / recusar */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 8,
            alignSelf: "flex-start",
          }}
        >
          <PrimaryButton
            label="✅ Aceitar"
            onPress={confirm}
            disabled={busy === "confirm"}
          />
          <SecondaryButton
            label="📅 Reagendar"
            onPress={() => setShowPicker(true)}
          />
          <SecondaryButton
            label="❌ Recusar"
            onPress={decline}
            disabled={busy === "decline"}
          />
        </View>
      </View>

      {/* Modal de seleção de slot para reagendamento */}
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

/* =============================================================================
 * Linha: Proposta de reagendamento — aceitar (se família propôs) / cancelar
 * ========================================================================== */
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

  // Regra: bibliotecário só pode aceitar se a proposta vier da família
  const isFromFamily = String(p?.proposedBy || "").toUpperCase() === "FAMILY";
  const canAccept = isFromFamily;
  const canDecline = true;

  // Verifica conflito na data proposta
  React.useEffect(() => {
    if (!p?.toStartAt || !p?.toEndAt) return;
    checkLibrarianConflict(librarianId, {
      startAt: p.toStartAt,
      endAt: p.toEndAt,
      excludeConsultationId: p?.consultation?.id,
    })
      .then(
        (r: any) => r?.conflict && setConflict("⚠ Conflito com outra consulta")
      )
      .catch(() => {});
  }, [p?.id, p?.toStartAt, p?.toEndAt, p?.consultation?.id, librarianId]);

  /** Aceitar proposta (da família). */
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

  /** Recusar/cancelar proposta. */
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
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ padding: 12, gap: 6 }}>
        {/* Cabeçalho: família + origem da proposta */}
        <Text style={{ fontWeight: "800", fontSize: 16 }}>
          {p?.consultation?.family?.fullName ?? "Família"} •{" "}
          <Text style={{ fontWeight: "400" }}>
            {isFromFamily ? "Proposta da família" : "Proposta do bibliotecário"}
          </Text>
        </Text>

        {/* Detalhes dos intervalos antigo vs proposto */}
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

        {/* Ações dependentes da origem */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 8,
            alignSelf: "flex-start",
          }}
        >
          {canAccept && (
            <PrimaryButton
              label="✅ Aceitar"
              onPress={doAccept}
              disabled={busy === "accept"}
            />
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

/* =============================================================================
 * Página: Consultas Pendentes c/ reagendamento
 *  - Filtro temporal (“Hoje”, “Amanhã”, “+3”, “+7”, “Todos”)
 *  - Lista pedidos pendentes com slot (aceitar/recusar/reagendar)
 *  - Lista propostas pendentes (aceitar/cancelar)
 * ========================================================================== */
export default function ConsultasPendentesComReagendamento() {
  const theme = useTheme();
  const { user } = useAuth();
  const librarianId = Number(user?.id);

  // Estado principal
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [consultas, setConsultas] = React.useState<ConsultationLite[]>([]);
  const [propostas, setPropostas] = React.useState<any[]>([]);

  // Filtro de intervalo
  type RangeKey = "today" | "tomorrow" | "next3" | "next7" | "all";
  const [range, setRange] = React.useState<RangeKey>("today");

  /** Calcula [fromIso, toIso] com base no filtro escolhido. */
  const { fromIso, toIso } = React.useMemo(() => {
    const now = new Date();
    if (range === "today")
      return { fromIso: now.toISOString(), toIso: endOfDay(now).toISOString() };
    if (range === "tomorrow") {
      const t = addDays(startOfDay(now), 1);
      return { fromIso: t.toISOString(), toIso: endOfDay(t).toISOString() };
    }
    if (range === "next3")
      return {
        fromIso: now.toISOString(),
        toIso: endOfDay(addDays(now, 3)).toISOString(),
      };
    if (range === "next7")
      return {
        fromIso: now.toISOString(),
        toIso: endOfDay(addDays(now, 7)).toISOString(),
      };
    return {
      fromIso: now.toISOString(),
      toIso: endOfDay(addDays(now, 180)).toISOString(),
    };
  }, [range]);

  /**
   * load — busca pedidos PENDING e propostas PENDING.
   * Mantém chamadas separadas e normaliza arrays vazios.
   */
  const load = React.useCallback(async () => {
    if (!librarianId) {
      setConsultas([]);
      setPropostas([]);
      return;
    }
    setLoading(true);
    try {
      // Pedidos de consulta pendentes no intervalo
      const params = new URLSearchParams({
        librarianId: String(librarianId),
        status: "PENDING",
        from: fromIso,
        order: "asc",
        limit: "500",
      });
      if (toIso) params.set("to", toIso);
      const url = `${API_URL}/consultations/all?${params.toString()}`;

      const list = (await fetch(url, {
        credentials: "include",
      }).then((r) => r.json())) as ConsultationLite[];

      // Propostas pendentes (ambas as origens)
      const ps = await listLibrarianProposals(librarianId, {
        status: "PENDING",
        limit: 100,
      }).catch(() => ({ items: [] as any[] }));

      setConsultas(Array.isArray(list) ? list : []);
      setPropostas(Array.isArray(ps?.items) ? ps.items : []);
    } catch {
      setConsultas([]);
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  }, [librarianId, fromIso, toIso]);

  // Carregar ao montar/alterar range
  React.useEffect(() => {
    load();
  }, [load]);

  // Recarrega quando volta ao foco
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  // Pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Derivados úteis
  const consultasComSlot = React.useMemo(
    () => (consultas || []).filter((c) => c.startAt && c.endAt),
    [consultas]
  );

  // Conjunto de consultas com proposta PENDING feita pelo bibliotecário
  const librarianPendingSet = React.useMemo(() => {
    const set = new Set<number>();
    for (const p of propostas) {
      if (
        String(p?.proposedBy || "").toUpperCase() === "LIBRARIAN" &&
        p?.consultation?.id
      ) {
        set.add(Number(p.consultation.id));
      }
    }
    return set;
  }, [propostas]);

  // Pedidos com slot mas ainda sem proposta “do bibliotecário” pendente
  const pedidosComSlotSemPropDoBibliotecario = React.useMemo(
    () =>
      consultasComSlot.filter((c) => !librarianPendingSet.has(Number(c.id))),
    [consultasComSlot, librarianPendingSet]
  );

  /* ============================== Render ============================== */

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* HEADER TOP — Pedidos de consulta */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={16}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.primaryContainer,
                }}
              >
                <Icon
                  name="calendar-clock"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  lineHeight: 28,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
              >
                Pedidos de consulta
              </Text>
            </View>
          </FlexibleCard>

          {/* Filtros rápidos (intervalos) */}
          <FlexibleCard
            title="Filtros"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pill
                label="Hoje"
                active={range === "today"}
                onPress={() => setRange("today")}
              />
              <Pill
                label="Amanhã"
                active={range === "tomorrow"}
                onPress={() => setRange("tomorrow")}
              />
              <Pill
                label="Próx. 3 dias"
                active={range === "next3"}
                onPress={() => setRange("next3")}
              />
              <Pill
                label="Próx. 7 dias"
                active={range === "next7"}
                onPress={() => setRange("next7")}
              />
              <Pill
                label="Todos"
                active={range === "all"}
                onPress={() => setRange("all")}
              />
            </View>
          </FlexibleCard>

          {/* Secção: pedidos com slot e sem proposta PENDING do bibliotecário */}
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
                <Text
                  style={{
                    color: theme.colors.onSecondaryContainer,
                    fontSize: 12,
                  }}
                >
                  {pedidosComSlotSemPropDoBibliotecario.length}
                </Text>
              </View>
            }
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 8 }} />
            ) : pedidosComSlotSemPropDoBibliotecario.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Sem pedidos com horário.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {pedidosComSlotSemPropDoBibliotecario.map((c) => (
                  <PedidoComSlotCard
                    key={String(c.id)}
                    c={c}
                    librarianId={librarianId}
                    onChanged={load}
                  />
                ))}
              </View>
            )}
          </CollapsibleSection>

          {/* Secção: propostas PENDING (da família ou do bibliotecário) */}
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
                <Text
                  style={{
                    color: theme.colors.onSecondaryContainer,
                    fontSize: 12,
                  }}
                >
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
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Sem propostas pendentes.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {propostas.map((p) => (
                  <PropostaRow
                    key={String(p.id)}
                    p={p}
                    librarianId={librarianId}
                    onChanged={load}
                  />
                ))}
              </View>
            )}
          </CollapsibleSection>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

/* =============================================================================
 * Estilos locais
 * ========================================================================== */
const styles = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
});

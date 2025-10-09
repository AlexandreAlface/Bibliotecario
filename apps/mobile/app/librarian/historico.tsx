/**
 * =====================================================================
 * Ficheiro: apps/mobile/app/librarian/historico.tsx
 * Módulo: Histórico de consultas (bibliotecário) com filtros e paginação
 * Autor: Alexandre Brissos – Nº 21131
 * ---------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * =====================================================================
 */

import * as React from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text, IconButton } from "react-native-paper";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { SecondaryButton } from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import { API_URL } from "src/services/api";
import type { ConsultationLite } from "src/services/consultations";

/** =========================================================================
 * Utils de Data (PUROS)
 * -------------------------------------------------------------------------
 * Nota: helpers determinísticos e sem efeitos. Sempre criam novos Date().
 * =========================================================================
 */

/** Retorna o início (00:00) do dia da data fornecida. */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Retorna o final (23:59:59.999) do dia da data fornecida. */
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Soma N dias à data fornecida (pode ser negativo). */
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Formata data/hora em pt-PT; devolve string vazia se falsy. */
function fmtDateTime(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

/** =========================================================================
 * Estados e estilos do estado (PURO)
 * =========================================================================
 */

type Status = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

type StatusStyle = {
  label: string;
  bg: string;
  fg: string;
  accent: string;
  icon: string;
};

const STATUS_STYLE: Record<Status, StatusStyle> = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
    icon: "check-circle-outline",
  },
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    accent: "#F59E0B",
    icon: "clock-outline",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
    icon: "close-circle-outline",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    accent: "#9CA3AF",
    icon: "cancel",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    accent: "#3B82F6",
    icon: "check-decagram-outline",
  },
};

/** Devolve a “meta” (labels/cores/ícone) para um estado; por defeito PENDING. */
function statusMeta(status?: Status): StatusStyle {
  const key = (status ?? "PENDING") as Status;
  return STATUS_STYLE[key];
}

/** =========================================================================
 * UI: Pílula de estado (PURO)
 * =========================================================================
 */

/**
 * Pílula de estado seleccionável.
 * @param props.status  Estado representado.
 * @param props.active  Se está activo/seleccionado.
 * @param props.onPress Callback de clique.
 */
function StatusPill({
  status,
  active,
  onPress,
}: {
  status: Status;
  active: boolean;
  onPress: () => void;
}) {
  const s = STATUS_STYLE[status];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: active ? s.bg : "#FFFFFF",
        borderWidth: 1,
        borderColor: s.accent,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Estado ${s.label}`}
    >
      <Icon name={s.icon as any} size={14} color={active ? s.fg : s.accent} />
      <Text style={{ fontWeight: "700", color: active ? s.fg : s.accent }}>
        {s.label}
      </Text>
    </TouchableOpacity>
  );
}

/** =========================================================================
 * UI: Modal de selecção de data (controlado pelo pai)
 * =========================================================================
 */

/**
 * Modal para escolher uma data única (modo date).
 * Controlado externamente via `visible`/`value`.
 */
function DatePickerModal({
  visible,
  title,
  value,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const theme = useTheme();
  const [temp, setTemp] = React.useState<Date>(value);

  // Sempre que o modal abre, alinha o valor temporário ao valor de entrada.
  React.useEffect(() => {
    if (visible) setTemp(value);
  }, [visible, value]);

  /** Handler do DateTimePicker (ignora eventos sem data). */
  const handleChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setTemp(d);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        {/* Content */}
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon
              name="calendar-month-outline"
              size={18}
              color={theme.colors.onSurface}
            />
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{title}</Text>
          </View>

          {/* Picker */}
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: Platform.OS === "ios" ? 8 : 0,
            }}
          >
            <DateTimePicker
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              value={temp}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          </View>

          {/* Ações */}
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
            <TouchableOpacity
              onPress={onCancel}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar seleção de data"
            >
              <Text style={{ color: theme.colors.onSurface }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(temp)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: theme.colors.primary,
              }}
              accessibilityRole="button"
              accessibilityLabel="Confirmar seleção de data"
            >
              <Text
                style={{ color: theme.colors.onPrimary, fontWeight: "700" }}
              >
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** =========================================================================
 * UI: Card de cada Consulta (PURO)
 * =========================================================================
 */

/** Gera uma chave estável para listas quando não existe `id`. */
function getItemKey(it: ConsultationLite): string {
  const anyIt = it as any;
  return String(
    anyIt?.id ??
      `${anyIt?.startAt ?? "na"}-${anyIt?.title ?? ""}-${
        anyIt?.childName ?? ""
      }`
  );
}

/**
 * Cartão “branco” com metadados resumidos da consulta.
 * Aceita o shape mínimo (ConsultationLite + alguns campos opcionais dens).
 */
function ConsultationCard({ item }: { item: ConsultationLite }) {
  const theme = useTheme();

  // Dados auxiliares com fallback defensivo (não quebra UI).
  const anyItem = item as any;
  const librarianName: string =
    anyItem?.librarianName ?? anyItem?.librarian?.fullName ?? "";
  const libraryName: string =
    anyItem?.libraryName ?? anyItem?.library?.name ?? "";
  const childName: string = anyItem?.childName ?? anyItem?.child?.name ?? "";
  const title: string =
    item.title ?? (childName ? `Consulta de ${childName}` : "Consulta");
  const meta = statusMeta(item.status as Status);

  return (
    <FlexibleCard
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={12}
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      {/* Título + Estado */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
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
          <Icon
            name="clipboard-text-clock-outline"
            size={18}
            color={theme.colors.onSurface}
          />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.onSurface,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        <View
          style={{
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: meta.bg,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name={meta.icon as any} size={14} color={meta.fg} />
          <Text style={{ color: meta.fg, fontSize: 12 }}>{meta.label}</Text>
        </View>
      </View>

      {/* Metadados */}
      <View style={{ marginTop: 8, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon
            name="calendar-month-outline"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {fmtDateTime(item.startAt)}
          </Text>
        </View>

        {(librarianName || libraryName) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon
              name="office-building"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {[librarianName, libraryName].filter(Boolean).join(" • ")}
            </Text>
          </View>
        )}

        {!!childName && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon
              name="account-child-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Criança: {childName}
            </Text>
          </View>
        )}
      </View>
    </FlexibleCard>
  );
}

/** =========================================================================
 * Página: Histórico de Consultas
 * =========================================================================
 */

/**
 * Página de histórico do bibliotecário com filtros (estado + datas),
 * paginação client-side e listagem em cartões. Mantém comportamento.
 */
export default function HistoricoPage() {
  const theme = useTheme();
  const { user } = useAuth();

  /** ------------------------- Estado de filtros ------------------------- */
  const [filtersCollapsed, setFiltersCollapsed] =
    React.useState<boolean>(false);

  // Estados por defeito para histórico.
  const HIST_STATUSES: Status[] = ["COMPLETED", "CANCELLED", "DECLINED"];
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<Status>>(
    new Set(HIST_STATUSES)
  );

  // Datas: últimos 30 dias → hoje.
  const [fromDate, setFromDate] = React.useState<Date>(
    startOfDay(addDays(new Date(), -30))
  );
  const [toDate, setToDate] = React.useState<Date>(endOfDay(new Date()));

  // Modais de datas.
  const [showFrom, setShowFrom] = React.useState<boolean>(false);
  const [showTo, setShowTo] = React.useState<boolean>(false);

  /** Abertura dos modais (garante apenas um aberto). */
  const openFrom = React.useCallback(() => {
    setShowTo(false);
    setShowFrom(true);
  }, []);
  const openTo = React.useCallback(() => {
    setShowFrom(false);
    setShowTo(true);
  }, []);

  /** ---------------------------- Dados/API ----------------------------- */
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [items, setItems] = React.useState<ConsultationLite[]>([]);

  // Paginação client-side com limite fixo.
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState<number>(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;

  const pageItems = React.useMemo(
    () => items.slice(startIdx, endIdx),
    [items, startIdx, endIdx]
  );

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Contador de filtros activos (para badge visual).
  const activeFiltersCount =
    (selectedStatuses.size || 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  /**
   * Fetch principal, com parâmetros defensivos.
   * Mantém limite alto e pagina no cliente para simplificar.
   */
  const fetchData = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setPage(1);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        librarianId: String(user.id),
        status:
          selectedStatuses.size > 0
            ? Array.from(selectedStatuses).join(",")
            : "",
        from: startOfDay(fromDate).toISOString(),
        to: endOfDay(toDate).toISOString(),
        order: "desc",
        limit: "200",
      });

      const url = `${API_URL}/consultations/all?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      const data = (await res.json()) as unknown;

      setItems(Array.isArray(data) ? (data as ConsultationLite[]) : []);
      setPage(1); // Reset de página quando filtros mudam.
    } catch {
      // Fail-safe: limpar dados em caso de erro para evitar estados incoerentes.
      setItems([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStatuses, fromDate, toDate]);

  // Carregar em montagem/alteração de dependências.
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recarregar quando o ecrã ganha foco.
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /** Pull-to-refresh controlado. */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  /** Alterna um estado nos filtros. */
  function toggleStatus(s: Status) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  /** Preset rápido de datas (últimos N dias até hoje). */
  function quickPreset(days: number) {
    const now = new Date();
    setFromDate(startOfDay(addDays(now, -days)));
    setToDate(endOfDay(now));
  }

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* -------------------- Header (ícone + título) -------------------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
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
                  name="history"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
              >
                Histórico de consultas
              </Text>
            </View>
          </FlexibleCard>

          {/* ------------------------------ Filtros ------------------------------ */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Header dos filtros */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="filter-variant"
                  size={18}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.onSurface,
                  }}
                >
                  Filtros
                </Text>
                {!!activeFiltersCount && (
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
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {activeFiltersCount}
                    </Text>
                  </View>
                )}
              </View>
              <IconButton
                icon={filtersCollapsed ? "chevron-down" : "chevron-up"}
                onPress={() => setFiltersCollapsed((v) => !v)}
                accessibilityLabel={
                  filtersCollapsed ? "Expandir filtros" : "Recolher filtros"
                }
              />
            </View>

            {/* Corpo dos filtros (condicional) */}
            {!filtersCollapsed && (
              <View style={{ marginTop: 10 }}>
                {/* Estados */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Icon
                    name="checkbox-marked-circle-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Estados
                  </Text>
                </View>

                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(["COMPLETED", "CANCELLED", "DECLINED"] as Status[]).map(
                    (s) => (
                      <StatusPill
                        key={s}
                        status={s}
                        active={selectedStatuses.has(s)}
                        onPress={() => toggleStatus(s)}
                      />
                    )
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <SecondaryButton
                    label="Limpar estados"
                    onPress={() => setSelectedStatuses(new Set())}
                  />
                  <SecondaryButton
                    label="Selecionar todos"
                    onPress={() => setSelectedStatuses(new Set(HIST_STATUSES))}
                  />
                </View>

                {/* Divider visual */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.colors.outlineVariant,
                    opacity: 0.6,
                    marginVertical: 12,
                  }}
                />

                {/* Datas */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Icon
                    name="calendar-range"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Intervalo de datas
                  </Text>
                </View>

                {/* Selecção de datas (From/To) */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {/* FROM */}
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={openFrom}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar data inicial"
                    >
                      <Icon
                        name="calendar-start"
                        size={18}
                        color={theme.colors.onSurface}
                      />
                      <Text style={{ color: theme.colors.onSurface }}>
                        {new Intl.DateTimeFormat("pt-PT", {
                          dateStyle: "medium",
                        }).format(fromDate)}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                        fontSize: 12,
                      }}
                    >
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "medium",
                      }).format(fromDate)}
                    </Text>

                    <DatePickerModal
                      visible={showFrom}
                      title="Selecionar data inicial"
                      value={fromDate}
                      maximumDate={toDate}
                      onCancel={() => setShowFrom(false)}
                      onConfirm={(d) => {
                        const v = startOfDay(d);
                        setFromDate(v);
                        if (v > toDate) setToDate(endOfDay(v)); // Guard: mantém coerência.
                        setShowFrom(false);
                      }}
                    />
                  </View>

                  {/* TO */}
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={openTo}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar data final"
                    >
                      <Icon
                        name="calendar-end"
                        size={18}
                        color={theme.colors.onSurface}
                      />
                      <Text style={{ color: theme.colors.onSurface }}>
                        {new Intl.DateTimeFormat("pt-PT", {
                          dateStyle: "medium",
                        }).format(toDate)}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                        fontSize: 12,
                      }}
                    >
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "medium",
                      }).format(toDate)}
                    </Text>

                    <DatePickerModal
                      visible={showTo}
                      title="Selecionar data final"
                      value={toDate}
                      minimumDate={fromDate}
                      onCancel={() => setShowTo(false)}
                      onConfirm={(d) => {
                        const v = endOfDay(d);
                        setToDate(v < fromDate ? endOfDay(fromDate) : v); // Guard: nunca antes do FROM.
                        setShowTo(false);
                      }}
                    />
                  </View>
                </View>

                {/* Presets rápidos */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <SecondaryButton
                    label="Hoje"
                    onPress={() => {
                      const now = new Date();
                      setFromDate(startOfDay(now));
                      setToDate(endOfDay(now));
                    }}
                  />
                  <SecondaryButton
                    label="Última semana"
                    onPress={() => quickPreset(7)}
                  />
                  <SecondaryButton
                    label="Último mês"
                    onPress={() => quickPreset(30)}
                  />
                  <SecondaryButton
                    label="Últimos 3 meses"
                    onPress={() => quickPreset(90)}
                  />
                </View>
              </View>
            )}
          </FlexibleCard>

          {/* -------------------- Resultados + Paginação -------------------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="clipboard-list-outline"
                  size={18}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.onSurface,
                  }}
                >
                  Resultados
                </Text>
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
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {items.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Lista / estados de carregamento */}
            {loading ? (
              <ActivityIndicator style={{ marginTop: 12 }} />
            ) : items.length === 0 ? (
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Sem resultados para os filtros aplicados.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {pageItems.map((it) => (
                  <ConsultationCard key={getItemKey(it)} item={it} />
                ))}

                {/* Paginador */}
                <View style={{ marginTop: 6, alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconButton
                      icon="chevron-left"
                      disabled={!canPrev}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      accessibilityLabel="Página anterior"
                    />
                    <Text style={{ marginHorizontal: 6 }}>
                      Página {page} de {totalPages}
                    </Text>
                    <IconButton
                      icon="chevron-right"
                      disabled={!canNext}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      accessibilityLabel="Página seguinte"
                    />
                  </View>
                </View>
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/family/consultas.tsx
 * Módulo: Ecrã de Consultas (Próximas/Anteriores) — filtros, datas e paginação
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis (≤ 30 linhas) sem efeitos.
 * • Guards/edge-cases “fail-safe”, sem alterar o comportamento.
 * • Tipagem explícita em estruturas e retornos.
 * ============================================================================
 */

import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  LayoutAnimation,
  UIManager,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";

import { useAuth } from "src/contexts/AuthContext";
import { ConsultationLite } from "src/services/consultations";

/* =============================================================================
 * Tipos e Constantes
 * ===========================================================================*/

type TabKey = "next" | "past";
export type Status =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED"
  | undefined;

/* =============================================================================
 * Helpers PUROS (determinísticos, sem efeitos)
 * ===========================================================================*/

/**
 * Formata um ISO datetime para "pt-PT" (data+hora curtas). Vazio se não existir.
 */
function fmtDateTime(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

/**
 * Constrói um querystring a partir de um objeto, ignorando `undefined`, `null` e "".
 */
function encodeQuery(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
}

/**
 * Calcula os limites efetivos de datas consoante a tab ativa.
 * - Próximas: `from = now` por omissão.
 * - Anteriores: `to = now` por omissão.
 */
function getEffectiveRange(
  tab: TabKey,
  fromDate: Date | null,
  toDate: Date | null
): { from?: string; to?: string } {
  const nowIso = new Date().toISOString();
  const from = fromDate
    ? fromDate.toISOString()
    : tab === "next"
    ? nowIso
    : undefined;
  const to = toDate
    ? toDate.toISOString()
    : tab === "past"
    ? nowIso
    : undefined;
  return { from, to };
}

/**
 * Conta filtros ativos (nº de estados + existência de datas).
 */
function countActiveFilters(
  statuses: Set<Exclude<Status, undefined>>,
  fromDate: Date | null,
  toDate: Date | null
): number {
  return (statuses.size || 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);
}

/* =============================================================================
 * UI — Chips e Pílulas
 * ===========================================================================*/

/**
 * Chip “pill” simples para tabs/filtros.
 */
function PillChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: active
          ? theme.colors.primary
          : theme.colors.secondaryContainer,
        borderWidth: active ? 0 : 1,
        borderColor: theme.colors.outlineVariant,
      }}
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

/* ---------- Cores/etiquetas por estado ---------- */

const STATUS_STYLE: Record<
  Exclude<Status, undefined>,
  { label: string; bg: string; fg: string; accent: string }
> = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
  },
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    accent: "#F59E0B",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    accent: "#9CA3AF",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    accent: "#3B82F6",
  },
};

/**
 * Retorna metadados de apresentação para um estado (default = PENDING).
 */
function statusMeta(status?: Status | null) {
  const key = (status ?? "PENDING") as Exclude<Status, undefined>;
  return STATUS_STYLE[key];
}

/**
 * Pílula com rótulo de estado (usa as cores do mapping).
 */
function StatusPill({
  status,
  active,
  onPress,
}: {
  status: Exclude<Status, undefined>;
  active: boolean;
  onPress: () => void;
}) {
  const s = STATUS_STYLE[status];
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={s.label}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: active ? s.bg : "#FFFFFF",
        borderWidth: 1,
        borderColor: s.accent,
      }}
    >
      <Text style={{ fontWeight: "700", color: active ? s.fg : s.accent }}>
        {s.label}
      </Text>
    </TouchableOpacity>
  );
}

/* =============================================================================
 * DatePickerModal — componente isolado
 * ===========================================================================*/

/**
 * Modal de seleção de data (reutilizável, controlado por `visible`).
 */
function DatePickerModal({
  visible,
  value,
  minimumDate,
  maximumDate,
  title,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  title: string;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}) {
  const theme = useTheme();
  const [tempDate, setTempDate] = React.useState<Date>(value);

  React.useEffect(() => {
    if (visible) setTempDate(value);
  }, [visible, value]);

  const handleChange = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) setTempDate(d);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* backdrop */}
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        {/* content card */}
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
          {/* header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                color: theme.colors.onSurface,
              }}
            >
              {title}
            </Text>
          </View>

          {/* picker */}
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: Platform.OS === "ios" ? 8 : 0,
              alignItems: "center",
            }}
          >
            <DateTimePicker
              mode="date"
              value={tempDate}
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          </View>

          {/* footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
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
            >
              <Text style={{ color: theme.colors.onSurface }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(tempDate)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: theme.colors.primary,
              }}
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

/* =============================================================================
 * Screen
 * ===========================================================================*/

/**
 * Ecrã: Consultas — lista de marcações (próximas/anteriores) com filtros.
 * Mantém o comportamento original; reforça acessibilidade, comentários e guards.
 */

// 👇 Novo: presets para tabs fininhas
type Preset = "pendentes" | "agenda" | "historico";

export default function ConsultasScreen({ preset }: { preset?: Preset } = {}) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  // Ativar animações de layout no Android (guard idempotente)
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const isActingChild = !!user?.actingChild;
  const actingChildId = user?.actingChild?.id ?? null;

  // Tab ativa
  const [tab, setTab] = React.useState<TabKey>("next");

  // Colapso dos filtros
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);

  // Estados seleccionáveis
  const STATUS_OPTIONS: { key: Exclude<Status, undefined>; label: string }[] = [
    { key: "PENDING", label: STATUS_STYLE.PENDING.label },
    { key: "CONFIRMED", label: STATUS_STYLE.CONFIRMED.label },
    { key: "COMPLETED", label: STATUS_STYLE.COMPLETED.label },
    { key: "CANCELLED", label: STATUS_STYLE.CANCELLED.label },
    { key: "DECLINED", label: STATUS_STYLE.DECLINED.label },
  ];
  const defaultNext = new Set<Exclude<Status, undefined>>([
    "PENDING",
    "CONFIRMED",
  ]);
  const defaultPast = new Set<Exclude<Status, undefined>>([
    "COMPLETED",
    "CANCELLED",
    "DECLINED",
  ]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    Set<Exclude<Status, undefined>>
  >(new Set(defaultNext));

  // Datas + modais
  const [fromDate, setFromDate] = React.useState<Date | null>(new Date());
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [showFromModal, setShowFromModal] = React.useState(false);
  const [showToModal, setShowToModal] = React.useState(false);

  const openFrom = () => {
    setShowToModal(false);
    setShowFromModal(true);
  };
  const openTo = () => {
    setShowFromModal(false);
    setShowToModal(true);
  };

  // Expande/colapsa o bloco de filtros com animação
  const toggleFilters = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!filtersCollapsed) {
      setShowFromModal(false);
      setShowToModal(false);
    }
    setFiltersCollapsed((v) => !v);
  }, [filtersCollapsed]);

  // Dados remotos
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<ConsultationLite[]>([]);

  // ---------------------------------------------------------------------------
  // PRESET: aplicar 1x no arranque (e não ser atropelado pelo efeito da tab)
  // ---------------------------------------------------------------------------
  const firstMount = React.useRef(true);
  const presetApplied = React.useRef(false);

  React.useEffect(() => {
    if (!preset || presetApplied.current) return;

    if (preset === "pendentes") {
      setTab("next");
      setSelectedStatuses(new Set(["PENDING"]));
      setFromDate(new Date());
      setToDate(null);
    } else if (preset === "agenda") {
      setTab("next");
      setSelectedStatuses(new Set(["CONFIRMED"]));
      setFromDate(new Date());
      setToDate(null);
    } else if (preset === "historico") {
      setTab("past");
      setSelectedStatuses(new Set(["COMPLETED", "CANCELLED", "DECLINED"]));
      setFromDate(null);
      setToDate(new Date());
    }

    presetApplied.current = true;
  }, [preset]);

  // Quando muda a tab, aplica presets padrão dessa tab
  // (mas ignora o 1º render para não sobrepor o preset acima)
  React.useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    if (tab === "next") {
      setSelectedStatuses(new Set(defaultNext));
      setFromDate(new Date());
      setToDate(null);
    } else {
      setSelectedStatuses(new Set(defaultPast));
      setFromDate(null);
      setToDate(new Date());
    }
    setShowFromModal(false);
    setShowToModal(false);
  }, [tab]);

  /**
   * Constrói o URL da query para a API (usa helpers puros).
   */
  const buildQueryUrl = React.useCallback(
    async (extra?: Record<string, unknown>) => {
      const { from, to } = getEffectiveRange(tab, fromDate, toDate);
      const statusParam =
        selectedStatuses.size > 0
          ? Array.from(selectedStatuses).join(",")
          : undefined;
      const effectiveChildId = actingChildId ?? undefined;

      const params = {
        familyId: user?.id,
        childId: effectiveChildId,
        status: statusParam,
        from,
        to,
        order: tab === "next" ? "asc" : "desc",
        limit: 100,
        ...(extra ?? {}),
      };

      const q = encodeQuery(params);
      const { API_URL } = await import("src/services/api");
      return `${API_URL}/consultations/all?${q}`;
    },
    [user?.id, actingChildId, selectedStatuses, fromDate, toDate, tab]
  );

  /**
   * Carrega as consultas conforme filtros atuais.
   */
  const load = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const url = await buildQueryUrl();
      const data = (await fetch(url, { credentials: "include" }).then((r) =>
        r.json()
      )) as ConsultationLite[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, buildQueryUrl]);

  // Carrega ao montar/atualizar dependências
  React.useEffect(() => {
    load();
  }, [load]);

  // Pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Alterna um estado no filtro
  function toggleStatus(s: Exclude<Status, undefined>) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  // Limpar datas
  function clearDates() {
    setFromDate(null);
    setToDate(null);
    setShowFromModal(false);
    setShowToModal(false);
  }

  // Intervalo “Hoje”
  function setTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setFromDate(start);
    setToDate(end);
  }

  // Nº de filtros ativos (estados + datas)
  const activeFiltersCount = countActiveFilters(
    selectedStatuses,
    fromDate,
    toDate
  );

  /* ===== Paginação local (lista já paginada pela UI) ===== */
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const visibleItems = items.slice(pageStart, pageStart + PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Sempre que muda o conjunto de itens, volta à página 1
  React.useEffect(() => {
    setPage(1);
  }, [items.length]);

  // Auto-aplicar filtros (debounce 150ms)
  React.useEffect(() => {
    const t = setTimeout(() => {
      load();
      setPage(1);
    }, 150);
    return () => clearTimeout(t);
  }, [tab, selectedStatuses, fromDate, toDate, load]);

  /* -------------------------------- Render -------------------------------- */
  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HEADER TOP — Consultas */}
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
          {/* Row 1: ícone + título + contador */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
                name="calendar-account"
                size={22}
                color={theme.colors.onPrimaryContainer}
              />
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 0 /* permite encolher sem quebrar por letra */,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  lineHeight: 28,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Consultas
              </Text>
              <Text style={{ opacity: 0.7, marginTop: 4 }} numberOfLines={2}>
                Próximas e anteriores marcações com os bibliotecários.
              </Text>
            </View>

            {/* contador ao lado do título */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: theme.colors.secondaryContainer,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  color: theme.colors.onSecondaryContainer,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                {items.length}
              </Text>
            </View>
          </View>
        </FlexibleCard>

        {/* ---------- Filtros (COLAPSÁVEL) ---------- */}
        <FlexibleCard
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          {/* Header */}
          <TouchableOpacity
            onPress={toggleFilters}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            accessibilityRole="button"
            accessibilityLabel={
              filtersCollapsed ? "Expandir filtros" : "Colapsar filtros"
            }
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
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
            <Icon
              name={filtersCollapsed ? "chevron-down" : "chevron-up"}
              size={24}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>

          {/* Conteúdo */}
          {!filtersCollapsed && (
            <View style={{ marginTop: 12 }}>
              {/* Tabs */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <PillChip
                  label="Próximas"
                  active={tab === "next"}
                  onPress={() => setTab("next")}
                />
                <PillChip
                  label="Anteriores"
                  active={tab === "past"}
                  onPress={() => setTab("past")}
                />
              </View>

              {/* Estados */}
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Estados
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STATUS_OPTIONS.map((opt) => (
                  <StatusPill
                    key={opt.key}
                    status={opt.key}
                    active={selectedStatuses.has(opt.key)}
                    onPress={() => toggleStatus(opt.key)}
                  />
                ))}
              </View>

              {/* Ações dos estados */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button
                  mode="outlined"
                  icon="filter-remove"
                  onPress={() => setSelectedStatuses(new Set())}
                >
                  Limpar estados
                </Button>
                <Button
                  mode="outlined"
                  icon="select-all"
                  onPress={() =>
                    setSelectedStatuses(
                      new Set(STATUS_OPTIONS.map((o) => o.key))
                    )
                  }
                >
                  Selecionar todos
                </Button>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.outlineVariant,
                  opacity: 0.6,
                  marginVertical: 12,
                }}
              />

              {/* Datas */}
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Intervalo de datas
              </Text>

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
                  >
                    <Icon
                      name="calendar-start"
                      size={18}
                      color={theme.colors.onSurface}
                    />
                    <Text style={{ color: theme.colors.onSurface }}>
                      {fromDate
                        ? fmtDateTime(fromDate.toISOString())
                        : "Sem início"}
                    </Text>
                  </TouchableOpacity>
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
                  >
                    <Icon
                      name="calendar-end"
                      size={18}
                      color={theme.colors.onSurface}
                    />
                    <Text style={{ color: theme.colors.onSurface }}>
                      {toDate ? fmtDateTime(toDate.toISOString()) : "Sem fim"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Modais de Data */}
              <DatePickerModal
                visible={showFromModal}
                title="Selecionar data inicial"
                value={fromDate ?? new Date()}
                onCancel={() => setShowFromModal(false)}
                onConfirm={(picked) => {
                  const nf = new Date(picked);
                  setFromDate(nf);
                  if (toDate && nf > toDate) setToDate(nf);
                  setShowFromModal(false);
                }}
              />
              <DatePickerModal
                visible={showToModal}
                title="Selecionar data final"
                value={toDate ?? new Date()}
                minimumDate={fromDate ?? undefined}
                onCancel={() => setShowToModal(false)}
                onConfirm={(picked) => {
                  const nt = new Date(picked);
                  setToDate(fromDate && nt < fromDate ? fromDate : nt);
                  setShowToModal(false);
                }}
              />

              {/* Ações de datas */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button
                  mode="outlined"
                  icon="calendar-remove"
                  onPress={clearDates}
                >
                  Limpar datas
                </Button>
                <Button
                  mode="outlined"
                  icon="calendar-today"
                  onPress={setTodayRange}
                >
                  Hoje
                </Button>
              </View>
            </View>
          )}
        </FlexibleCard>

        {/* ---------- Lista ---------- */}
        <FlexibleCard
          title={tab === "next" ? "Próximas" : "Anteriores"}
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={12}
          style={{ borderRadius: 12 }}
        >
          {/* topo da secção: contador + refresh */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Icon
                name="calendar-clock"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {loading
                  ? "A carregar…"
                  : `${items.length} resultado${items.length === 1 ? "" : "s"}`}
              </Text>
            </View>
            <Button
              mode="text"
              icon="refresh"
              onPress={load}
              disabled={loading}
              compact
            >
              Atualizar
            </Button>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                {tab === "next"
                  ? "Sem consultas marcadas."
                  : "Sem histórico de consultas."}
              </Text>
              {!isActingChild && (
                <Button
                  mode="contained"
                  icon="calendar-plus"
                  onPress={() => router.push("/family/agenda")}
                >
                  Agendar Consulta
                </Button>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {/* Página atual */}
              {visibleItems.map((item) => {
                const librarianName =
                  (item as any)?.librarianName ??
                  (item as any)?.librarian?.fullName ??
                  "";
                const libraryName =
                  (item as any)?.libraryName ??
                  (item as any)?.library?.name ??
                  "";
                const childName =
                  (item as any)?.childName ?? (item as any)?.child?.name ?? "";
                const title =
                  item.title ??
                  (childName ? `Consulta de ${childName}` : "Consulta");
                const meta = statusMeta(item.status);

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    onPress={() => router.push(`/family/consultas/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir detalhes da consulta"
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                      overflow: "hidden",
                      minHeight: 96, // reserva espaço para o texto
                    }}
                  >
                    <View style={{ height: 4, backgroundColor: meta.accent }} />
                    <View style={{ padding: 14 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.onSurface,
                            flex: 1,
                          }}
                        >
                          {title}
                        </Text>
                        <View
                          style={{
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            backgroundColor: meta.bg,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Text style={{ color: meta.fg, fontSize: 12 }}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          marginTop: 6,
                          color: theme.colors.onSurfaceVariant,
                        }}
                      >
                        {fmtDateTime(item.startAt)}
                        {librarianName ? ` • ${librarianName}` : ""}
                        {libraryName ? ` • ${libraryName}` : ""}
                      </Text>

                      {!!childName && (
                        <Text
                          style={{
                            marginTop: 2,
                            color: theme.colors.onSurfaceVariant,
                          }}
                        >
                          Criança: {childName}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Paginador */}
              {items.length > PAGE_SIZE && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    gap: 10,
                  }}
                >
                  <Button
                    mode="outlined"
                    icon="chevron-left"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canPrev}
                    style={{ flex: 1 }}
                  >
                    Anterior
                  </Button>

                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      minWidth: 110,
                      textAlign: "center",
                    }}
                  >
                    Página {page} de {totalPages}
                  </Text>

                  <Button
                    mode="contained"
                    icon="chevron-right"
                    contentStyle={{ flexDirection: "row-reverse" }}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!canNext}
                    style={{ flex: 1 }}
                  >
                    Seguinte
                  </Button>
                </View>
              )}
            </View>
          )}
        </FlexibleCard>
      </ScrollView>
    </Background>
  );
}

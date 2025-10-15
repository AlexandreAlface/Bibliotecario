/**
 * ============================================================================
 *  Ficheiro: apps/mobile/app/family/agenda.tsx
 *  Módulo:  Agenda de Consultas (família)
 *  Autor:   Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários claros (PT-PT) e JSDoc em helpers/props.
 *   • Helpers **PUROS** (sem efeitos, determinísticos) e curtos (≤ 30 linhas).
 *   • Secções bem delimitadas (validação, helpers, UI).
 *   • Tratamento de erros/edge-cases com mensagens amigáveis.
 *   • Mantido o comportamento original (sem regressões).
 * ============================================================================
 */

import * as React from "react";
import type { SubmitHandler } from "react-hook-form";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  LayoutAnimation,
  UIManager,
  StyleSheet,
} from "react-native";
import { useTheme, IconButton } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "src/contexts/AuthContext";
import { consultationsApi, Slot } from "src/services/consultations";
import { usersApi, SimpleUser } from "src/services/users";
import ConsultationWizard from "src/features/consultations/ConsultationWizard";

import { useRouter } from "expo-router";

/* ============================== Validação =============================== */
/** Schema: valida os filtros/inputs do formulário de agendamento. */
const schema = z
  .object({
    childId: z.coerce.number().gt(0, { message: "Selecione a criança" }),
    librarianId: z.coerce.number().optional(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    slotId: z.coerce.number().optional(),
  })
  .refine((v) => v.from <= v.to, {
    message: "Data inicial não pode ser depois da final",
    path: ["to"],
  });
type FormData = z.infer<typeof schema>;

/* ============================== Helpers PUROS =============================== */
/** Formatter pt-PT de data+hora (PURO). */
const dtMedium = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
});
/** Formata um Date para string legível (PURO). */
function fmt(d: Date) {
  return dtMedium.format(d);
}
/** Início do dia (00:00:00.000) — não muta o original (PURO). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** Fim do dia (23:59:59.999) — não muta o original (PURO). */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
/** Máximo entre duas datas (PURO). */
function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

/* ========================= Chip “pill” reutilizável ========================= */
/**
 * Pequeno botão “pastilha” para filtros.
 * Mantido curto, sem efeitos laterais (PURO no output dado o input).
 */
function PillChip({
  active,
  onPress,
  label,
  icon,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  icon?: string;
}) {
  const theme = useTheme();
  const bg = active ? theme.colors.primary : theme.colors.secondaryContainer;
  const fg = active
    ? theme.colors.onPrimary
    : theme.colors.onSecondaryContainer;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: active ? 0 : 1,
        borderColor: theme.colors.outlineVariant,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon ? <Icon name={icon as any} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: active ? "700" : "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ======================= Modal de Date Picker reutilizável ======================= */
/**
 * Modal simples para seleção de data (iOS/Android), com cabeçalho/rodapé.
 * Nota: componente UI (não é “método” de lógica); mantido intacto.
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

/* =================================== Screen =================================== */
/**
 * Ecrã de agendamento de consulta:
 *  - Filtros: criança, bibliotecário (com slots), intervalo.
 *  - Procura de slots com paginação local.
 *  - Criação de consulta no backend.
 */
export default function AgendaScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const router = useRouter();
  const [pending, setPending] = React.useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = React.useState(false);

  const loadProposals = React.useCallback(async () => {
    if (!user?.id) return;
    setLoadingProposals(true);
    try {
      const res = await consultationsApi.proposalsByFamily(user.id);
      setPending(Array.isArray(res?.items) ? res.items : []);
    } finally {
      setLoadingProposals(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Android: ativa animação de layout para o colapso/expansão
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Form RHF + Zod
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      childId: user?.children?.[0]?.id ?? 0,
      librarianId: undefined,
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      slotId: undefined,
    },
  });

  // Campos observados (para auto-refresh)
  const from = watch("from");
  const to = watch("to");
  const childId = watch("childId");
  const librarianFilter = watch("librarianId");

  // Estado local
  const [librarians, setLibrarians] = React.useState<SimpleUser[]>([]);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardSlot, setWizardSlot] = React.useState<Slot | null>(null);

  // Collapse dos filtros
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);
  const toggleFilters = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // fecha modais quando colapsa
    if (!filtersCollapsed) {
      setShowFromModal(false);
      setShowToModal(false);
    }
    setFiltersCollapsed((v) => !v);
  }, [filtersCollapsed]);

  // Estado dos modais (datas)
  const [showFromModal, setShowFromModal] = React.useState(false);
  const [showToModal, setShowToModal] = React.useState(false);
  const openFrom = React.useCallback(() => {
    setShowToModal(false);
    setShowFromModal(true);
  }, []);
  const openTo = React.useCallback(() => {
    setShowFromModal(false);
    setShowToModal(true);
  }, []);

  // Quick range (today, +7, +14)
  type Quick = "today" | "7" | "14" | "custom";
  const [quick, setQuick] = React.useState<Quick>("7");
  const setQuickRange = React.useCallback(
    (q: Quick) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const base = startOfDay(new Date());
      if (q === "today") {
        setValue("from", base, { shouldValidate: true });
        setValue("to", endOfDay(base), { shouldValidate: true });
      } else if (q === "7") {
        setValue("from", base, { shouldValidate: true });
        setValue("to", endOfDay(new Date(base.getTime() + 6 * 86400000)), {
          shouldValidate: true,
        });
      } else if (q === "14") {
        setValue("from", base, { shouldValidate: true });
        setValue("to", endOfDay(new Date(base.getTime() + 13 * 86400000)), {
          shouldValidate: true,
        });
      }
      setQuick(q);
    },
    [setValue]
  );

  /** Carrega bibliotecários com slots OPEN no intervalo atual. */
  async function refreshLibrarians() {
    try {
      const now = new Date();
      const fromIso = maxDate(startOfDay(getValues("from")), now).toISOString();
      const toIso = endOfDay(getValues("to")).toISOString();
      const list = await usersApi.listLibrariansWithOpenSlots({
        from: fromIso,
        to: toIso,
      });
      setLibrarians(list);
      // limpa seleção se deixou de existir
      const current = getValues("librarianId");
      if (current && !list.some((l) => l.id === current)) {
        setValue("librarianId", undefined, { shouldValidate: true });
      }
    } catch {
      setLibrarians([]);
    }
  }

  async function accept(p: any) {
    try {
      await consultationsApi.acceptProposal(p.id);
      Alert.alert("Sucesso", "Reagendamento aceite.");
      loadProposals();
    } catch {
      Alert.alert("Erro", "Falha ao aceitar.");
    }
  }

  async function decline(p: any) {
    try {
      await consultationsApi.declineProposal(p.id);
      Alert.alert("Proposta recusada");
      loadProposals();
      // leva a família para a sala da consulta para propor um novo horário
      router.push(`/family/consultas/${p.consultation.id}`);
    } catch {
      Alert.alert("Erro", "Falha ao recusar.");
    }
  }

  // Mount + quando datas mudam → atualiza bibliotecários disponíveis
  React.useEffect(() => {
    refreshLibrarians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    refreshLibrarians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  /** Procura de slots (auto-dispara quando filtros mudam). */
  const loadSlots = React.useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const fromIso = maxDate(startOfDay(getValues("from")), now).toISOString();
      const toIso = endOfDay(getValues("to")).toISOString();
      const data = await consultationsApi.searchSlots({
        from: fromIso,
        to: toIso,
        librarianId: getValues("librarianId") || undefined,
      });
      setSlots(data);
      // limpa slotId se deixou de existir
      const chosen = getValues("slotId");
      if (chosen && !data.some((s: Slot) => s.id === chosen)) {
        setValue("slotId", undefined, { shouldValidate: true });
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha a procurar horários");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [getValues, setValue]);

  // Debounce simples (150ms) para auto-search
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (alive) loadSlots();
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [from, to, librarianFilter, loadSlots]);

  /** Submissão: cria a consulta para a família selecionada. */
  const onSubmit: SubmitHandler<FormData> = async (v) => {
    if (!v.slotId) {
      Alert.alert("Escolha um horário");
      return;
    }
    if (!user?.id) {
      Alert.alert("Sessão inválida");
      return;
    }
    const slot = slots.find((s) => s.id === v.slotId);
    if (!slot) {
      Alert.alert("Horário inválido");
      return;
    }

    try {
      await consultationsApi.create({
        familyId: user.id,
        childId: v.childId,
        slotId: v.slotId,
        librarianId: slot.librarianId,
      });
      Alert.alert("Sucesso", "Consulta criada.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao criar consulta");
    }
  };

  // Limites de data dos pickers
  const today = startOfDay(new Date());
  const minFrom = today;
  const minTo = startOfDay(from > today ? from : today);

  const BORDER = theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)";

  /* ============== Paginação local de slots (UI, sem pedidos) ============== */
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 8; // 8 cartões por página
  const totalPages = Math.max(1, Math.ceil(slots.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const visibleSlots = slots.slice(pageStart, pageEnd);

  // Sempre que o dataset muda, voltar à página 1
  React.useEffect(() => {
    setPage(1);
  }, [slots.length]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  /* ================================== Render ================================== */
  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Título página */}
        <FlexibleCard
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={16}
          style={{
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: BORDER,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* ícone + título */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
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
                  name="calendar-plus"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 24,
                    lineHeight: 28,
                    fontWeight: "900",
                    color: theme.colors.onSurface,
                  }}
                >
                  Agendar Consulta
                </Text>
                <Text style={{ opacity: 0.7, marginTop: 4 }}>
                  Escolhe a criança, intervalo e bibliotecário disponível.
                </Text>
              </View>
            </View>
          </View>
        </FlexibleCard>

        {pending.length > 0 && (
          <FlexibleCard
            title="Reagendamentos pendentes"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: BORDER,
            }}
          >
            {loadingProposals ? (
              <ActivityIndicator />
            ) : (
              <View style={{ gap: 10 }}>
                {pending.map((p) => (
                  <View
                    key={p.id}
                    style={{
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: BORDER,
                      borderRadius: 10,
                      padding: 10,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                        color: theme.colors.onSurface,
                      }}
                    >
                      Consulta #{p.consultation?.id} •{" "}
                      {p.consultation?.child?.name ?? "Criança"}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      Proposto: {fmt(new Date(p.toStartAt))} —{" "}
                      {fmt(new Date(p.toEndAt))}
                      {"  "}• Bibliotecário:{" "}
                      {p.consultation?.librarian?.fullName}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <PrimaryButton
                        label="Aceitar"
                        onPress={() => accept(p)}
                      />
                      <SecondaryButton
                        label="Recusar"
                        onPress={() => decline(p)}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          router.push(`/family/consultas/${p.consultation.id}`)
                        }
                        style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                      >
                        <Text style={{ color: theme.colors.primary }}>
                          Ver consulta
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </FlexibleCard>
        )}

        {/* Filtros (colapsáveis) */}
        <FlexibleCard
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: BORDER,
          }}
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
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: theme.colors.onSurface,
              }}
            >
              Filtros
            </Text>
            <IconButton
              icon={filtersCollapsed ? "chevron-down" : "chevron-up"}
              size={22}
            />
          </TouchableOpacity>

          {!filtersCollapsed && (
            <>
              {/* Criança */}
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 6,
                  marginBottom: 6,
                }}
              >
                Criança
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(user?.children ?? []).map((ch) => (
                  <PillChip
                    key={ch.id}
                    label={ch.name}
                    icon="face-man-profile"
                    active={ch.id === childId}
                    onPress={() =>
                      setValue("childId", ch.id, { shouldValidate: true })
                    }
                  />
                ))}
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: BORDER,
                  opacity: 0.6,
                  marginVertical: 12,
                }}
              />

              {/* Bibliotecário */}
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Bibliotecário
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {librarians.map((lb) => (
                  <PillChip
                    key={lb.id}
                    label={lb.name}
                    icon="account"
                    active={lb.id === librarianFilter}
                    onPress={() =>
                      setValue(
                        "librarianId",
                        lb.id === librarianFilter ? undefined : lb.id,
                        {
                          shouldValidate: true,
                        }
                      )
                    }
                  />
                ))}
                {librarians.length === 0 && (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem bibliotecários com disponibilidade no intervalo.
                  </Text>
                )}
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: BORDER,
                  opacity: 0.6,
                  marginVertical: 12,
                }}
              />

              {/* Intervalo + quick chips (modais) */}
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Procurar horários entre
              </Text>

              {/* quick */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <PillChip
                  active={quick === "today"}
                  onPress={() => setQuickRange("today")}
                  label="Hoje"
                  icon="calendar-today"
                />
                <PillChip
                  active={quick === "7"}
                  onPress={() => setQuickRange("7")}
                  label="+7 dias"
                  icon="calendar-week"
                />
                <PillChip
                  active={quick === "14"}
                  onPress={() => setQuickRange("14")}
                  label="+14 dias"
                  icon="calendar-range"
                />
                <PillChip
                  active={quick === "custom"}
                  onPress={() => setQuick("custom")}
                  label="Personalizar"
                  icon="tune-variant"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {/* FROM */}
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="from"
                    render={({ field: { value, onChange } }) => (
                      <>
                        <TouchableOpacity
                          onPress={openFrom}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: BORDER,
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
                            {fmt(maxDate(startOfDay(value), today))}
                          </Text>
                        </TouchableOpacity>

                        <DatePickerModal
                          visible={showFromModal}
                          value={value}
                          minimumDate={minFrom}
                          title="Selecionar data inicial"
                          onCancel={() => setShowFromModal(false)}
                          onConfirm={(picked) => {
                            const newFrom = startOfDay(picked);
                            onChange(newFrom);
                            if (newFrom > to) {
                              setValue("to", endOfDay(newFrom), {
                                shouldValidate: true,
                              });
                            }
                            setQuick("custom");
                            setShowFromModal(false);
                          }}
                        />
                      </>
                    )}
                  />
                </View>

                {/* TO */}
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="to"
                    render={({ field: { value, onChange } }) => (
                      <>
                        <TouchableOpacity
                          onPress={openTo}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: BORDER,
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
                            {fmt(endOfDay(value))}
                          </Text>
                        </TouchableOpacity>

                        <DatePickerModal
                          visible={showToModal}
                          value={value}
                          minimumDate={minTo}
                          title="Selecionar data final"
                          onCancel={() => setShowToModal(false)}
                          onConfirm={(picked) => {
                            const newTo = endOfDay(picked);
                            const safeTo =
                              newTo < from ? endOfDay(from) : newTo;
                            onChange(safeTo);
                            setQuick("custom");
                            setShowToModal(false);
                          }}
                        />
                      </>
                    )}
                  />
                </View>
              </View>
            </>
          )}
        </FlexibleCard>

        {/* Lista de slots (paginada localmente) */}
        <FlexibleCard
          title="Horários disponíveis"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: BORDER,
          }}
        >
          {/* topo: contador + refresh */}
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
                name="clock-outline"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {loading
                  ? "A procurar…"
                  : `${slots.length} resultado${slots.length === 1 ? "" : "s"}`}
              </Text>
            </View>
            <IconButton icon="refresh" onPress={loadSlots} disabled={loading} />
          </View>

          {loading ? (
            <ActivityIndicator />
          ) : (
            <View style={{ gap: 10 }}>
              {slots.length === 0 && (
                <View
                  style={{ alignItems: "center", paddingVertical: 8, gap: 6 }}
                >
                  <Icon
                    name="calendar-clock"
                    size={28}
                    color={theme.colors.onSurfaceDisabled}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem horários no intervalo selecionado.
                  </Text>
                </View>
              )}

              {/* Página atual */}
              {visibleSlots.map((s: Slot) => {
                const active = s.id === (watch("slotId") ?? 0);
                const accent = active ? theme.colors.primary : BORDER;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() =>
                      setValue("slotId", s.id, { shouldValidate: true })
                    }
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: BORDER,
                      backgroundColor: theme.colors.surface,
                      borderLeftWidth: 6,
                      borderLeftColor: accent,
                      minHeight: 96, // altura maior para acomodar texto
                      justifyContent: "center",
                    }}
                  >
                    {/* linha 1: horário */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon
                        name="clock-time-four-outline"
                        size={18}
                        color={theme.colors.onSurface}
                      />
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "700",
                          flexShrink: 1,
                        }}
                      >
                        {fmt(new Date(s.startAt))} — {fmt(new Date(s.endAt))}
                      </Text>
                    </View>

                    {/* linha 2: quem/onde */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        marginTop: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon
                          name="account"
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          {s.librarianName}
                        </Text>
                      </View>

                      {!!s.libraryName && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Icon
                            name="library"
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {s.libraryName}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Paginador local */}
              {slots.length > PAGE_SIZE && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <SecondaryButton
                      label="Anterior"
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!canPrev}
                    />
                  </View>
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      minWidth: 110,
                      textAlign: "center",
                    }}
                  >
                    Página {page} de {totalPages}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Seguinte"
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={!canNext}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label="Agendar"
              onPress={() => {
                const chosenId = getValues("slotId");
                if (!chosenId) return Alert.alert("Escolha um horário");
                const s = slots.find((x) => x.id === chosenId);
                if (!s) return Alert.alert("Horário inválido");
                setWizardSlot(s);
                setWizardOpen(true);
              }}
              disabled={isSubmitting}
            />
          </View>
        </FlexibleCard>

        {wizardOpen && wizardSlot && user?.id ? (
          <ConsultationWizard
            visible
            onDismiss={() => setWizardOpen(false)}
            defaultFamilyId={user.id}
            defaultLibrarianId={wizardSlot.librarianId}
            defaultSlotId={wizardSlot.id}
            // passa as bibliotecas conhecidas (se tiveres só a do slot, passa essa)
            libraries={
              wizardSlot.libraryId
                ? [
                    {
                      id: wizardSlot.libraryId,
                      name: wizardSlot.libraryName ?? "Biblioteca",
                    },
                  ]
                : undefined
            }
            hideFamilySelect
            initialMode={wizardSlot.libraryId ? "IN_PERSON" : "ONLINE"} // apenas valor inicial
            // lockMode — REMOVIDO (a família pode alternar livremente)
            allowOnlineWithoutMeetingLink
            onCreated={() => {
              setWizardOpen(false);
              Alert.alert("Sucesso", "Consulta criada.");
              loadSlots();
            }}
          />
        ) : null}
      </ScrollView>
    </Background>
  );
}

/* ============================================================================ *
 *  Fim — Alexandre Brissos — Nº 21131
 * ============================================================================ */

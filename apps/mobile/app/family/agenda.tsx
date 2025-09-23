// apps/mobile/app/family/agenda.tsx
import * as React from "react";
import type { Resolver, SubmitHandler } from "react-hook-form";
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
} from "react-native";
import { useTheme, IconButton } from "react-native-paper";
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

/* ------------ validação ------------ */
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

/* ------------ helpers ------------ */
function fmt(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function PillChip({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
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
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------ Modal reutilizável de Date Picker ------------ */
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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
            <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.onSurface }}>
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
              <Text style={{ color: theme.colors.onPrimary, fontWeight: "700" }}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------ Screen ------------ */
export default function AgendaScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  // Enable LayoutAnimation on Android
  React.useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      childId: user?.children?.[0]?.id ?? 0,
      librarianId: undefined,
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      slotId: undefined,
    },
  });

  const from = watch("from");
  const to = watch("to");
  const childId = watch("childId");
  const librarianFilter = watch("librarianId");

  const [librarians, setLibrarians] = React.useState<SimpleUser[]>([]);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Filtros colapsáveis
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);
  const toggleFilters = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // fechar modais ao colapsar
    if (!filtersCollapsed) {
      setShowFromModal(false);
      setShowToModal(false);
    }
    setFiltersCollapsed((v) => !v);
  }, [filtersCollapsed]);

  // MODAIS DE DATA (só um aberto)
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

  // Carregar bibliotecários com OPEN slots
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
      // limpar seleção se deixou de estar disponível
      const current = getValues("librarianId");
      if (current && !list.some((l) => l.id === current)) {
        setValue("librarianId", undefined, { shouldValidate: true });
      }
    } catch {
      setLibrarians([]);
    }
  }

  React.useEffect(() => {
    refreshLibrarians(); // mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    refreshLibrarians(); // quando datas mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Procurar horários — automático sempre que filtros relevantes mudem
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
      const chosen = getValues("slotId");
      if (chosen && !data.some((s) => s.id === chosen)) {
        setValue("slotId", undefined, { shouldValidate: true });
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha a procurar horários");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [getValues, setValue]);

  // dispara auto-search (com pequeno debounce)
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

  // limites de data
  const today = startOfDay(new Date());
  const minFrom = today;
  const minTo = startOfDay(from > today ? from : today);

  return (
    <Background>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.colors.onBackground,
            }}
          >
            Agendar Consulta
          </Text>

          {/* WhiteCard: Filtros (COLAPSÁVEL + auto-search) */}
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
              accessibilityLabel={filtersCollapsed ? "Expandir filtros" : "Colapsar filtros"}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.onSurface }}>
                Filtros
              </Text>
              <IconButton icon={filtersCollapsed ? "chevron-down" : "chevron-up"} size={22} />
            </TouchableOpacity>

            {!filtersCollapsed && (
              <>
                {/* Criança */}
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  Criança
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(user?.children ?? []).map((ch) => (
                    <PillChip
                      key={ch.id}
                      label={ch.name}
                      active={ch.id === childId}
                      onPress={() => setValue("childId", ch.id, { shouldValidate: true })}
                    />
                  ))}
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.colors.outlineVariant,
                    opacity: 0.6,
                    marginVertical: 12,
                  }}
                />

                {/* Bibliotecário */}
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  Bibliotecário
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {librarians.map((lb) => (
                    <PillChip
                      key={lb.id}
                      label={lb.name}
                      active={lb.id === librarianFilter}
                      onPress={() =>
                        setValue("librarianId", lb.id === librarianFilter ? undefined : lb.id, {
                          shouldValidate: true,
                        })
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
                    backgroundColor: theme.colors.outlineVariant,
                    opacity: 0.6,
                    marginVertical: 12,
                  }}
                />

                {/* Datas com MODAL */}
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  Procurar horários entre
                </Text>
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
                              borderColor: theme.colors.outlineVariant,
                              backgroundColor: theme.colors.surface,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Selecionar data inicial"
                          >
                            <Text style={{ color: theme.colors.onSurface }}>
                              {fmt(maxDate(startOfDay(value), today))}
                            </Text>
                          </TouchableOpacity>

                          <Text
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 4,
                              fontSize: 12,
                            }}
                          >
                            {fmt(maxDate(startOfDay(from), today))}
                          </Text>

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
                                setValue("to", endOfDay(newFrom), { shouldValidate: true });
                              }
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
                              borderColor: theme.colors.outlineVariant,
                              backgroundColor: theme.colors.surface,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Selecionar data final"
                          >
                            <Text style={{ color: theme.colors.onSurface }}>
                              {fmt(endOfDay(value))}
                            </Text>
                          </TouchableOpacity>

                          <Text
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 4,
                              fontSize: 12,
                            }}
                          >
                            {fmt(endOfDay(to))}
                          </Text>

                          <DatePickerModal
                            visible={showToModal}
                            value={value}
                            minimumDate={minTo}
                            title="Selecionar data final"
                            onCancel={() => setShowToModal(false)}
                            onConfirm={(picked) => {
                              const newTo = endOfDay(picked);
                              const safeTo = newTo < from ? endOfDay(from) : newTo;
                              onChange(safeTo);
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

          {/* WhiteCard: Slots */}
          <FlexibleCard
            title="Horários disponíveis"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <View style={{ gap: 8 }}>
                {slots.length === 0 && (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Sem horários.</Text>
                )}
                {slots.map((s) => {
                  const active = s.id === (watch("slotId") ?? 0);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setValue("slotId", s.id, { shouldValidate: true })}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Text style={{ color: theme.colors.onSurface }}>
                        {fmt(new Date(s.startAt))} — {fmt(new Date(s.endAt))}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {s.librarianName}
                        {s.libraryName ? ` • ${s.libraryName}` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label={isSubmitting ? "A enviar…" : "Agendar"}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              />
            </View>
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

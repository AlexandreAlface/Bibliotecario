import * as React from "react";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "src/contexts/AuthContext";
import { consultationsApi, Slot } from "src/services/consultations";
import { usersApi, SimpleUser } from "src/services/users";

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

export default function AgendaScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
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

  // Carregar bibliotecários com OPEN slots no intervalo (roleId=2)
  async function refreshLibrarians() {
    try {
      const now = new Date();
      const fromIso = maxDate(startOfDay(from), now).toISOString();
      const toIso = endOfDay(to).toISOString();
      const list = await usersApi.listLibrariansWithOpenSlots({
        from: fromIso,
        to: toIso,
      });
      setLibrarians(list);
      // limpar seleção se deixou de estar disponível
      const current = watch("librarianId");
      if (current && !list.some((l) => l.id === current)) {
        setValue("librarianId", undefined, { shouldValidate: true });
      }
    } catch (e) {
      setLibrarians([]);
    }
  }

  React.useEffect(() => {
    refreshLibrarians(); /* on mount */
  }, []);
  React.useEffect(() => {
    refreshLibrarians(); /* quando mudam datas */
  }, [from, to]);

  async function loadSlots() {
    setLoading(true);
    try {
      const now = new Date();
      const fromIso = maxDate(startOfDay(from), now).toISOString(); // ⬅️ nunca no passado
      const toIso = endOfDay(to).toISOString();
      const data = await consultationsApi.searchSlots({
        from: fromIso,
        to: toIso,
        librarianId: librarianFilter || undefined,
      });
      setSlots(data);
      const chosen = watch("slotId");
      if (chosen && !data.some((s) => s.id === chosen)) {
        setValue("slotId", undefined, { shouldValidate: true });
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha a procurar horários");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

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
        librarianId: slot.librarianId, // backend exige
      });
      Alert.alert("Sucesso", "Consulta criada.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao criar consulta");
    }
  };

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
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

          {/* WhiteCard: Filtros */}
          <FlexibleCard
            title="Filtros"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Criança */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Criança
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(user?.children ?? []).map((ch) => (
                <PillChip
                  key={ch.id}
                  label={ch.name}
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
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />

            {/* Bibliotecário (dinâmico; roleId=2; só com slots OPEN no intervalo) */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Bibliotecário
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {librarians.map((lb) => (
                <PillChip
                  key={lb.id}
                  label={lb.name}
                  active={lb.id === librarianFilter}
                  onPress={() =>
                    setValue(
                      "librarianId",
                      lb.id === librarianFilter ? undefined : lb.id,
                      { shouldValidate: true }
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
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />

            {/* Datas lado-a-lado */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Procurar horários entre
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="from"
                  render={({ field: { value, onChange } }) => (
                    <DateTimePicker
                      mode="date"
                      value={value}
                      onChange={(_, d) => d && onChange(d)}
                    />
                  )}
                />
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontSize: 12,
                  }}
                >
                  {fmt(maxDate(startOfDay(from), new Date()))}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="to"
                  render={({ field: { value, onChange } }) => (
                    <DateTimePicker
                      mode="date"
                      value={value}
                      onChange={(_, d) => d && onChange(d)}
                    />
                  )}
                />
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontSize: 12,
                  }}
                >
                  {fmt(endOfDay(to))}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
              <SecondaryButton
                label={loading ? "A procurar…" : "Procurar horários"}
                onPress={loadSlots}
              />
            </View>
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
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem horários.
                  </Text>
                )}
                {slots.map((s) => {
                  const active = s.id === (watch("slotId") ?? 0);
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
                        borderColor: active
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Text style={{ color: theme.colors.onSurface }}>
                        {fmt(new Date(s.startAt))} — {fmt(new Date(s.endAt))}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 2,
                        }}
                      >
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

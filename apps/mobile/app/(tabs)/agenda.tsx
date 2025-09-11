// pontos-chave: 1) zodResolver<FormData>(schema)
//               2) useForm<FormData, any, FormData>(...)
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
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "src/contexts/AuthContext";
import { consultationsApi, Slot } from "src/services/consultations";

const schema = z.object({
  childId: z.coerce.number().gt(0, { message: "Selecione a criança" }),
  librarianId: z.coerce
    .number()
    .gt(0, { message: "Selecione o bibliotecário" }),
  from: z.coerce.date(),
  to: z.coerce.date(),
  slotId: z.coerce.number().optional(),
});
type FormData = z.infer<typeof schema>;

function fmt(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
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
      librarianId: 0,
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      slotId: undefined,
    },
  });

  const from = watch("from");
  const to = watch("to");
  const childId = watch("childId");
  const librarianId = watch("librarianId");

  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function loadSlots() {
    if (!librarianId) {
      Alert.alert("Selecione o bibliotecário");
      return;
    }
    setLoading(true);
    try {
      const data = await consultationsApi.slotsByLibrarian(librarianId, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setSlots(data.filter((s) => s.status === "OPEN"));
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha a carregar horários");
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
    try {
      await consultationsApi.create({
        familyId: user.id,
        childId: v.childId,
        slotId: v.slotId,
      });
      Alert.alert("Sucesso", "Consulta criada.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao criar consulta");
    }
  };

  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "600",
            color: theme.colors.onBackground,
          }}
        >
          Agendar Consulta
        </Text>

        {/* Criança */}
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Criança</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(user?.children ?? []).map((ch) => {
            const active = ch.id === childId;
            return (
              <TouchableOpacity
                key={ch.id}
                onPress={() =>
                  setValue("childId", ch.id, { shouldValidate: true })
                }
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.secondaryContainer,
                }}
              >
                <Text
                  style={{
                    color: active
                      ? theme.colors.onPrimary
                      : theme.colors.onSecondaryContainer,
                  }}
                >
                  {ch.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bibliotecário (mínimo viável) */}
        <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          Bibliotecário
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { id: 1, name: "Bibliotecário 1" },
            { id: 2, name: "Bibliotecário 2" },
          ].map((lb) => {
            const active = lb.id === librarianId;
            return (
              <TouchableOpacity
                key={lb.id}
                onPress={() =>
                  setValue("librarianId", lb.id, { shouldValidate: true })
                }
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.secondaryContainer,
                }}
              >
                <Text
                  style={{
                    color: active
                      ? theme.colors.onPrimary
                      : theme.colors.onSecondaryContainer,
                  }}
                >
                  {lb.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Intervalo de datas */}
        <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          Procurar horários entre
        </Text>
        <View style={{ gap: 8 }}>
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
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: -6 }}>
            {fmt(from)}
          </Text>

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
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: -6 }}>
            {fmt(to)}
          </Text>
        </View>

        <SecondaryButton
          label={loading ? "A procurar…" : "Procurar horários"}
          onPress={loadSlots}
          children={undefined}
        />

        {/* Slots */}
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

        <PrimaryButton
          label={isSubmitting ? "A enviar…" : "Agendar"}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          children={undefined}
        />
      </ScrollView>
    </Background>
  );
}

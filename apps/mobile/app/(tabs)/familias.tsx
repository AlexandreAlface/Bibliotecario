// pontos-chave: 1) zodResolver<ChildForm>(childSchema)
//               2) useForm<ChildForm, any, ChildForm>(...)
import * as React from "react";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
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
import type { Child, UserMe } from "src/types";
import { familiesApi } from "src/services/families";

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome demasiado curto"),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const childSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  birthDate: z.coerce.date(),
  gender: z.enum(["M", "F"]).optional().nullable(),
  readerProfile: z.string().optional().nullable(),
});
type ChildForm = z.infer<typeof childSchema>;

function fmt(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(dt);
}

export default function FamiliasScreen() {
  const theme = useTheme();
  const { user, refresh } = useAuth();

  const [me, setMe] = React.useState<UserMe | null>(null);
  const [showBirth, setShowBirth] = React.useState(false);
  const [editingChild, setEditingChild] = React.useState<Child | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileForm>,
    defaultValues: { fullName: user?.fullName ?? "", phone: "", address: "" },
  });

  const {
    control: cCtrl,
    handleSubmit: cSubmit,
    reset: cReset,
    setValue: cSet,
    watch: cWatch,
    formState: { isSubmitting: cSaving },
  } = useForm<ChildForm>({
    resolver: zodResolver(childSchema) as Resolver<ChildForm>,
    defaultValues: {
      name: "",
      birthDate: new Date(new Date().getFullYear() - 6, 0, 1),
      gender: null,
      readerProfile: null,
    },
  });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await familiesApi.me();
        if (!alive) return;
        setMe(data);
        reset({
          fullName: data.fullName,
          phone: data.phone ?? "",
          address: data.address ?? "",
        });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [reset]);

  const onSaveProfile: SubmitHandler<ProfileForm> = async (values) => {
    try {
      await familiesApi.updateMe(values);
      Alert.alert("Sucesso", "Perfil atualizado.");
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao atualizar.");
    }
  };

  const createChildSubmit: SubmitHandler<ChildForm> = async (values) => {
    try {
      await familiesApi.createChild({
        name: values.name,
        birthDate: values.birthDate.toISOString(),
        gender: values.gender ?? null,
        readerProfile: values.readerProfile ?? null,
      });
      Alert.alert("Sucesso", "Criança criada.");
      cReset();
      const data = await familiesApi.me();
      setMe(data);
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao criar criança.");
    }
  };

  const updateChildSubmit: SubmitHandler<ChildForm> = async (values) => {
    if (!editingChild) return;
    try {
      await familiesApi.updateChild(editingChild.id, {
        name: values.name,
        birthDate: values.birthDate.toISOString(),
        gender: values.gender ?? null,
        readerProfile: values.readerProfile ?? null,
      });
      Alert.alert("Sucesso", "Criança atualizada.");
      setEditingChild(null);
      cReset();
      const data = await familiesApi.me();
      setMe(data);
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao atualizar criança.");
    }
  };

  async function deleteChild(childId: number) {
    try {
      await familiesApi.deleteChild(childId);
      const data = await familiesApi.me();
      setMe(data);
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao remover.");
    }
  }

  const birthDateValue = cWatch("birthDate");
  const detailedChildren: Child[] = me?.children ?? [];

  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "600",
            color: theme.colors.onBackground,
          }}
        >
          Família
        </Text>

        {/* Perfil */}
        <View
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              marginBottom: 8,
              color: theme.colors.onSurface,
            }}
          >
            Os meus dados
          </Text>

          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
            Nome
          </Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Nome completo"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.colors.onSurface,
                }}
              />
            )}
          />

          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Telefone
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
                placeholder="Contacto"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.colors.onSurface,
                }}
              />
            )}
          />

          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Morada
          </Text>
          <Controller
            control={control}
            name="address"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Morada"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.colors.onSurface,
                }}
              />
            )}
          />

          <PrimaryButton
            label={isSubmitting ? "A guardar…" : "Guardar"}
            onPress={handleSubmit(onSaveProfile)}
            disabled={isSubmitting}
            children={undefined}
          />
        </View>

        {/* Crianças */}
        <View
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: theme.colors.onSurface }}>
            As minhas crianças
          </Text>

          {detailedChildren.map((c) => (
            <View
              key={c.id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.onSurface }}>
                {c.name}
              </Text>
              <Text
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                {fmt(c.birthDate)} {c.gender ? `• ${c.gender}` : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <SecondaryButton
                  label="Editar"
                  onPress={() => {
                    setEditingChild(c);
                    cReset({
                      name: c.name,
                      birthDate: c.birthDate
                        ? new Date(c.birthDate)
                        : new Date(new Date().getFullYear() - 6, 0, 1),
                      gender: (c.gender as any) ?? null,
                      readerProfile: c.readerProfile ?? null,
                    });
                  }}
                  children={undefined}
                />
                <SecondaryButton
                  label="Remover"
                  onPress={() => deleteChild(c.id)}
                  children={undefined}
                />
              </View>
            </View>
          ))}

          {/* Form criar/editar */}
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 8,
                color: theme.colors.onSurface,
              }}
            >
              {editingChild ? "Editar criança" : "Adicionar criança"}
            </Text>

            <Text style={{ color: theme.colors.onSurfaceVariant }}>Nome</Text>
            <Controller
              control={cCtrl}
              name="name"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Nome"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.colors.onSurface,
                  }}
                />
              )}
            />

            <Text
              style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}
            >
              Data de nascimento
            </Text>
            <TouchableOpacity
              onPress={() => setShowBirth(true)}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.colors.onSurface }}>
                {birthDateValue
                  ? new Intl.DateTimeFormat("pt-PT", {
                      dateStyle: "medium",
                    }).format(birthDateValue)
                  : "Selecionar…"}
              </Text>
            </TouchableOpacity>

            {showBirth && (
              <DateTimePicker
                mode="date"
                value={birthDateValue || new Date()}
                onChange={(_, date) => {
                  if (!date) return;
                  cSet("birthDate", date);
                  if (Platform.OS !== "ios") setShowBirth(false);
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <SecondaryButton
                label="Masculino"
                onPress={() => cSet("gender", "M" as any)}
                children={undefined}
              />
              <SecondaryButton
                label="Feminino"
                onPress={() => cSet("gender", "F" as any)}
                children={undefined}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {editingChild ? (
                <>
                  <PrimaryButton
                    label={cSaving ? "A guardar…" : "Guardar alterações"}
                    onPress={cSubmit(updateChildSubmit)}
                    disabled={cSaving}
                    children={undefined}
                  />
                  <SecondaryButton
                    label="Cancelar"
                    onPress={() => {
                      setEditingChild(null);
                      cReset();
                    }}
                    children={undefined}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={cSaving ? "A criar…" : "Adicionar criança"}
                  onPress={cSubmit(createChildSubmit)}
                  disabled={cSaving}
                  children={undefined}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Background>
  );
}

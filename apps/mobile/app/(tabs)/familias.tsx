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
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, useTheme } from "react-native-paper";
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
// ⬇️ Usa os tipos do serviço para evitar mismatch (roles)
import type { Child as SChild, UserMe as SUserMe } from "src/services/families";
import { familiesApi } from "src/services/families";

/** ---------- Schemas ---------- */
const profileSchema = z.object({
  fullName: z.string().min(3, "Nome demasiado curto"),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const childSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  birthDate: z.coerce.date(),
  gender: z.enum(["M", "F", "O"]).optional().nullable(),
  readerProfile: z.string().optional().nullable(),
});
type ChildForm = z.infer<typeof childSchema>;

/** ---------- Helpers ---------- */
function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(dt);
}
function ageFrom(d?: string | null) {
  if (!d) return "";
  const birth = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} ${age === 1 ? "ano" : "anos"}`;
}
function genderLabel(g?: string | null) {
  if (g === "M") return "Masculino";
  if (g === "F") return "Feminino";
  if (g === "O") return "Outro";
  return "—";
}

/** ---------- Small UI chip ---------- */
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

/** ---------- Screen ---------- */
export default function FamiliasScreen() {
  const theme = useTheme();
  const { user, refresh } = useAuth();

  // ⬇️ Tipar com o UserMe do serviço
  const [me, setMe] = React.useState<SUserMe | null>(null);

  // Seleção/edição
  const [selectedChildId, setSelectedChildId] = React.useState<number | null>(
    null
  );
  const [isEditingOrCreating, setIsEditingOrCreating] = React.useState(false);
  const [editingChild, setEditingChild] = React.useState<SChild | null>(null);
  const [showBirth, setShowBirth] = React.useState(false);

  // ---- Form Perfil ----
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileForm>,
    defaultValues: { fullName: user?.fullName ?? "", phone: "", address: "" },
  });

  // ---- Form Criança ----
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

  // Load /auth/me
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
        if ((data.children?.length ?? 0) > 0) {
          setSelectedChildId(data.children![0].id);
        }
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
      const newest = [...(data.children ?? [])].sort((a, b) => b.id - a.id)[0];
      setSelectedChildId(newest?.id ?? null);
      setIsEditingOrCreating(false);
      setEditingChild(null);
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
      setIsEditingOrCreating(false);
      setEditingChild(null);
      cReset();
      const data = await familiesApi.me();
      setMe(data);
      setSelectedChildId(editingChild.id);
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao atualizar criança.");
    }
  };

  async function deleteChild(childId: number) {
    Alert.alert(
      "Remover criança",
      "Tens a certeza que queres remover esta criança? Esta ação não pode ser anulada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await familiesApi.deleteChild(childId);
              const data = await familiesApi.me();
              setMe(data);
              if (selectedChildId === childId) {
                setSelectedChildId(data.children?.[0]?.id ?? null);
              }
              setIsEditingOrCreating(false);
              setEditingChild(null);
              await refresh();
            } catch (e: any) {
              Alert.alert("Erro", e?.message || "Falha ao remover.");
            }
          },
        },
      ]
    );
  }

  const birthDateValue = cWatch("birthDate");
  const detailedChildren: SChild[] = me?.children ?? [];
  const selectedChild = detailedChildren.find((c) => c.id === selectedChildId);

  /** ---------- UI ---------- */
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
            Família
          </Text>

          {/* WhiteCard: Perfil */}
          <FlexibleCard
            title="Os meus dados"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <Text
              style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
            >
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

            <Text
              style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}
            >
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

            <Text
              style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}
            >
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

            <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
              <PrimaryButton
                label={isSubmitting ? "A guardar…" : "Guardar"}
                onPress={handleSubmit(onSaveProfile)}
                disabled={isSubmitting}
              />
            </View>
          </FlexibleCard>

          {/* WhiteCard: Gestão de crianças */}
          <FlexibleCard
            title="As minhas crianças"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Seletor de crianças + adicionar nova */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Seleciona uma criança
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {detailedChildren.length === 0 && (
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginRight: 8,
                  }}
                >
                  Sem crianças registadas.
                </Text>
              )}
              {detailedChildren.map((c) => (
                <PillChip
                  key={c.id}
                  label={c.name}
                  active={selectedChildId === c.id}
                  onPress={() => {
                    setSelectedChildId(c.id);
                    setIsEditingOrCreating(false);
                    setEditingChild(null);
                  }}
                />
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <PrimaryButton
                label="Adicionar criança"
                onPress={() => {
                  setIsEditingOrCreating(true);
                  setEditingChild(null);
                  cReset({
                    name: "",
                    birthDate: new Date(new Date().getFullYear() - 6, 0, 1),
                    gender: null,
                    readerProfile: null,
                  });
                }}
              />
              {!!selectedChild && (
                <>
                  <SecondaryButton
                    label="Editar"
                    onPress={() => {
                      setIsEditingOrCreating(true);
                      setEditingChild(selectedChild);
                      cReset({
                        name: selectedChild.name,
                        birthDate: selectedChild.birthDate
                          ? new Date(selectedChild.birthDate)
                          : new Date(new Date().getFullYear() - 6, 0, 1),
                        gender: (selectedChild.gender as any) ?? null,
                        readerProfile: selectedChild.readerProfile ?? null,
                      });
                    }}
                  />
                  <SecondaryButton
                    label="Remover"
                    onPress={() => deleteChild(selectedChild.id)}
                  />
                </>
              )}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />

            {/* Cartão de detalhes da criança selecionada */}
            {selectedChild ? (
              <FlexibleCard
                backgroundColor={theme.colors.surface}
                elevation={0}
                padding={12}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
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
                    {selectedChild.name}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => {
                        setIsEditingOrCreating(true);
                        setEditingChild(selectedChild);
                        cReset({
                          name: selectedChild.name,
                          birthDate: selectedChild.birthDate
                            ? new Date(selectedChild.birthDate)
                            : new Date(new Date().getFullYear() - 6, 0, 1),
                          gender: (selectedChild.gender as any) ?? null,
                          readerProfile: selectedChild.readerProfile ?? null,
                        });
                      }}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => deleteChild(selectedChild.id)}
                    />
                  </View>
                </View>

                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  Idade: {ageFrom(selectedChild.birthDate)}
                </Text>
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                >
                  Nascimento: {fmtDate(selectedChild.birthDate)}
                </Text>
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                >
                  Género: {genderLabel(selectedChild.gender)}
                </Text>

                {!!selectedChild.readerProfile && (
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 6,
                    }}
                  >
                    Perfil de Leitor: {selectedChild.readerProfile}
                  </Text>
                )}
              </FlexibleCard>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Nenhuma criança selecionada.
              </Text>
            )}

            {/* Form criar/editar (mostrado só quando ativo) */}
            {isEditingOrCreating && (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.colors.outlineVariant,
                    opacity: 0.6,
                    marginVertical: 12,
                  }}
                />
                <FlexibleCard
                  title={editingChild ? "Editar criança" : "Adicionar criança"}
                  backgroundColor={theme.colors.surface}
                  elevation={0}
                  padding={12}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Nome
                  </Text>
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
                    style={{
                      marginTop: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
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

                  {/* Género como chips M/F/O */}
                  <Text
                    style={{
                      marginTop: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Género
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <PillChip
                      label="Masculino"
                      active={cWatch("gender") === "M"}
                      onPress={() => cSet("gender", "M" as any)}
                    />
                    <PillChip
                      label="Feminino"
                      active={cWatch("gender") === "F"}
                      onPress={() => cSet("gender", "F" as any)}
                    />
                    <PillChip
                      label="Outro"
                      active={cWatch("gender") === "O"}
                      onPress={() => cSet("gender", "O" as any)}
                    />
                  </View>

                  <Text
                    style={{
                      marginTop: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Perfil de Leitor (opcional)
                  </Text>
                  <Controller
                    control={cCtrl}
                    name="readerProfile"
                    render={({ field: { value, onChange } }) => (
                      <TextInput
                        value={value ?? ""}
                        onChangeText={onChange}
                        placeholder="Notas/observações do perfil"
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

                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.outlineVariant,
                      opacity: 0.6,
                      marginVertical: 12,
                    }}
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {editingChild ? (
                      <>
                        <PrimaryButton
                          label={cSaving ? "A guardar…" : "Guardar alterações"}
                          onPress={cSubmit(updateChildSubmit)}
                          disabled={cSaving}
                        />
                        <SecondaryButton
                          label="Cancelar"
                          onPress={() => {
                            setIsEditingOrCreating(false);
                            setEditingChild(null);
                            cReset();
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <PrimaryButton
                          label={cSaving ? "A criar…" : "Adicionar criança"}
                          onPress={cSubmit(createChildSubmit)}
                          disabled={cSaving}
                        />
                        <SecondaryButton
                          label="Cancelar"
                          onPress={() => {
                            setIsEditingOrCreating(false);
                            setEditingChild(null);
                            cReset();
                          }}
                        />
                      </>
                    )}
                  </View>
                </FlexibleCard>
              </>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

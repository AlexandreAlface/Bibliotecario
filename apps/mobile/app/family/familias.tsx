/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/family/familias.tsx
 * Módulo: Gestão da Família (perfil + crianças) — React Native / Expo
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e guards/edge-cases “fail-safe” sem alterar comportamentos.
 * ============================================================================
 */

import * as React from "react";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  IconButton,
  useTheme,
  TextInput as PaperInput,
} from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

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
import type { Child as SChild, UserMe as SUserMe } from "src/services/families";
import { familiesApi } from "src/services/families";

/* =============================================================================
 * Schemas de validação (Zod)
 * ===========================================================================*/

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

/* =============================================================================
 * Helpers PUROS (determinísticos, sem efeitos)
 * ===========================================================================*/

/**
 * Formata uma data ISO para "pt-PT" (apenas data). Devolve string vazia se nula.
 */
function fmtDate(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(dt);
}

/**
 * Calcula idade a partir de uma data de nascimento ISO. Vazio se nula.
 */
function ageFrom(d?: string | null): string {
  if (!d) return "";
  const birth = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} ${age === 1 ? "ano" : "anos"}`;
}

/**
 * Mapeia código de género → rótulo legível.
 */
function genderLabel(g?: string | null): string {
  if (g === "M") return "Masculino";
  if (g === "F") return "Feminino";
  if (g === "O") return "Outro";
  return "—";
}

/* =============================================================================
 * Animações pequenas: FadeIn + SlideUp
 * ===========================================================================*/

/**
 * Pequeno wrapper animado para entrada em fade + slide up.
 */
function FadeIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* =============================================================================
 * UI: Chip “pill” reutilizável
 * ===========================================================================*/

/**
 * Chip simples com estado ativo/inativo.
 */
function PillChip({
  active,
  label,
  onPress,
  icon,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  icon?: string;
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
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon ? (
        <Icon
          name={icon as any}
          size={16}
          color={
            active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer
          }
        />
      ) : null}
      <Text
        style={{
          color: active
            ? theme.colors.onPrimary
            : theme.colors.onSecondaryContainer,
          fontWeight: active ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =============================================================================
 * Screen
 * ===========================================================================*/

/**
 * Ecrã: “Famílias” — atualizar perfil do encarregado e gerir crianças.
 * Mantém exatamente o comportamento existente com reforço de comentários/guards.
 */
export default function FamiliasScreen() {
  const theme = useTheme();
  const { user, refresh } = useAuth();

  // Ativa LayoutAnimation no Android
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Estados de colapso
  const [profileCollapsed, setProfileCollapsed] = React.useState(false);
  const [childrenCollapsed, setChildrenCollapsed] = React.useState(false);

  const toggleProfile = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProfileCollapsed((v) => !v);
  }, []);
  const toggleChildren = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Fecha o date picker ao colapsar
    if (!childrenCollapsed) setShowBirth(false);
    setChildrenCollapsed((v) => !v);
  }, [childrenCollapsed]);

  // Modelo remoto (/families/me)
  const [me, setMe] = React.useState<SUserMe | null>(null);

  // Seleção/edição de criança
  const [selectedChildId, setSelectedChildId] = React.useState<number | null>(
    null
  );
  const [isEditingOrCreating, setIsEditingOrCreating] = React.useState(false);
  const [editingChild, setEditingChild] = React.useState<SChild | null>(null);
  const [showBirth, setShowBirth] = React.useState(false);

  /* ------------------------- Formulário Perfil ------------------------- */
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileForm>,
    defaultValues: { fullName: user?.fullName ?? "", phone: "", address: "" },
  });

  /* ------------------------- Formulário Criança ------------------------ */
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

  // Carregar /auth/me (e popular forms/seleção)
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
      } catch {
        // silencioso (mantém UI utilizável)
      }
    })();
    return () => {
      alive = false;
    };
  }, [reset]);

  /**
   * Guardar perfil do encarregado.
   */
  const onSaveProfile: SubmitHandler<ProfileForm> = async (values) => {
    try {
      await familiesApi.updateMe(values);
      Alert.alert("Sucesso", "Perfil atualizado.");
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao atualizar.");
    }
  };

  /**
   * Criar nova criança.
   */
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

  /**
   * Atualizar criança existente.
   */
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

  /**
   * Remover criança (com confirmação de ação destrutiva).
   */
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

  // Valores derivados para UI
  const birthDateValue = cWatch("birthDate");
  const detailedChildren: SChild[] = me?.children ?? [];
  const selectedChild = detailedChildren.find((c) => c.id === selectedChildId);

  const BORDER = theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)";

  /* -------------------------------- Render -------------------------------- */
  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Título com ícone */}
          <FadeIn>
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
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
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
                    name="account-group-outline"
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
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Família
                </Text>
              </View>
            </FlexibleCard>
          </FadeIn>

          {/* WhiteCard: Perfil (COLAPSÁVEL) */}
          <FadeIn delay={50}>
            <FlexibleCard
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={14}
              style={{ borderRadius: 12, borderWidth: 1, borderColor: BORDER }}
            >
              {/* Header do card */}
              <TouchableOpacity
                onPress={toggleProfile}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  profileCollapsed
                    ? "Expandir os meus dados"
                    : "Colapsar os meus dados"
                }
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon
                    name="account-circle-outline"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: theme.colors.onSurface,
                    }}
                  >
                    Os meus dados
                  </Text>
                </View>
                <IconButton
                  icon={profileCollapsed ? "chevron-down" : "chevron-up"}
                  size={22}
                />
              </TouchableOpacity>

              {!profileCollapsed && (
                <View>
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Nome
                  </Text>
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { value, onChange } }) => (
                      <PaperInput
                        mode="outlined"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Nome completo"
                        left={<PaperInput.Icon icon="account" />}
                      />
                    )}
                  />

                  <Text
                    style={{
                      marginTop: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Telefone
                  </Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { value, onChange } }) => (
                      <PaperInput
                        mode="outlined"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="phone-pad"
                        placeholder="Contacto"
                        left={<PaperInput.Icon icon="phone" />}
                      />
                    )}
                  />

                  <Text
                    style={{
                      marginTop: 12,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Morada
                  </Text>
                  <Controller
                    control={control}
                    name="address"
                    render={({ field: { value, onChange } }) => (
                      <PaperInput
                        mode="outlined"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Morada"
                        left={<PaperInput.Icon icon="home-outline" />}
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
                </View>
              )}
            </FlexibleCard>
          </FadeIn>

          {/* WhiteCard: Gestão de crianças (COLAPSÁVEL) */}
          <FadeIn delay={100}>
            <FlexibleCard
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={14}
              style={{ borderRadius: 12, borderWidth: 1, borderColor: BORDER }}
            >
              {/* Header do card */}
              <TouchableOpacity
                onPress={toggleChildren}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  childrenCollapsed
                    ? "Expandir as minhas crianças"
                    : "Colapsar as minhas crianças"
                }
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon
                    name="account-child-outline"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: theme.colors.onSurface,
                    }}
                  >
                    As minhas crianças
                  </Text>
                  {!!(me?.children?.length ?? 0) && (
                    <View
                      style={{
                        marginLeft: 6,
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
                        {me?.children?.length}
                      </Text>
                    </View>
                  )}
                </View>
                <IconButton
                  icon={childrenCollapsed ? "chevron-down" : "chevron-up"}
                  size={22}
                />
              </TouchableOpacity>

              {!childrenCollapsed && (
                <>
                  {/* Seletor de crianças + adicionar nova */}
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 6,
                    }}
                  >
                    Seleciona uma criança
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {(me?.children?.length ?? 0) === 0 && (
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginRight: 8,
                        }}
                      >
                        Sem crianças registadas.
                      </Text>
                    )}
                    {(me?.children ?? []).map((c) => (
                      <PillChip
                        key={c.id}
                        label={c.name}
                        active={selectedChildId === c.id}
                        onPress={() => {
                          setSelectedChildId(c.id);
                          setIsEditingOrCreating(false);
                          setEditingChild(null);
                        }}
                        icon="account"
                      />
                    ))}
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <PrimaryButton
                      label="Adicionar criança"
                      onPress={() => {
                        setIsEditingOrCreating(true);
                        setEditingChild(null);
                        setShowBirth(false);
                        cReset({
                          name: "",
                          birthDate: new Date(
                            new Date().getFullYear() - 6,
                            0,
                            1
                          ),
                          gender: null,
                          readerProfile: null,
                        });
                      }}
                    />
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: BORDER,
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
                        borderColor: BORDER,
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
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            flex: 1,
                          }}
                        >
                          <Icon
                            name="account"
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
                          >
                            {selectedChild.name}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row" }}>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => {
                              setIsEditingOrCreating(true);
                              setEditingChild(selectedChild);
                              setShowBirth(false);
                              cReset({
                                name: selectedChild.name,
                                birthDate: selectedChild.birthDate
                                  ? new Date(selectedChild.birthDate)
                                  : new Date(
                                      new Date().getFullYear() - 6,
                                      0,
                                      1
                                    ),
                                gender: (selectedChild.gender as any) ?? null,
                                readerProfile:
                                  selectedChild.readerProfile ?? null,
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

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <Icon
                          name="cake-variant-outline"
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          Nascimento: {fmtDate(selectedChild.birthDate)}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <Icon
                          name="baby-face-outline"
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          Idade: {ageFrom(selectedChild.birthDate)}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <Icon
                          name="gender-male-female-variant"
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          Género: {genderLabel(selectedChild.gender)}
                        </Text>
                      </View>

                      {!!selectedChild.readerProfile && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          <Icon
                            name="book-open-outline"
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Perfil de Leitor: {selectedChild.readerProfile}
                          </Text>
                        </View>
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
                          backgroundColor: BORDER,
                          opacity: 0.6,
                          marginVertical: 12,
                        }}
                      />
                      <FlexibleCard
                        title={
                          editingChild ? "Editar criança" : "Adicionar criança"
                        }
                        backgroundColor={theme.colors.surface}
                        elevation={0}
                        padding={12}
                        style={{
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: BORDER,
                        }}
                      >
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          Nome
                        </Text>
                        <Controller
                          control={cCtrl}
                          name="name"
                          render={({ field: { value, onChange } }) => (
                            <PaperInput
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              placeholder="Nome"
                              left={<PaperInput.Icon icon="account-child" />}
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
                            borderColor: BORDER,
                            borderRadius: 8,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Icon
                            name="calendar"
                            size={18}
                            color={theme.colors.onSurface}
                          />
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
                            icon="gender-male"
                          />
                          <PillChip
                            label="Feminino"
                            active={cWatch("gender") === "F"}
                            onPress={() => cSet("gender", "F" as any)}
                            icon="gender-female"
                          />
                          <PillChip
                            label="Outro"
                            active={cWatch("gender") === "O"}
                            onPress={() => cSet("gender", "O" as any)}
                            icon="gender-non-binary"
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
                            <PaperInput
                              mode="outlined"
                              value={value ?? ""}
                              onChangeText={onChange}
                              placeholder="Notas/observações do perfil"
                              left={<PaperInput.Icon icon="book-outline" />}
                              multiline
                            />
                          )}
                        />

                        <View
                          style={{
                            height: 1,
                            backgroundColor: BORDER,
                            opacity: 0.6,
                            marginVertical: 12,
                          }}
                        />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {editingChild ? (
                            <>
                              <PrimaryButton
                                label={
                                  cSaving ? "A guardar…" : "Guardar alterações"
                                }
                                onPress={cSubmit(updateChildSubmit)}
                                disabled={cSaving}
                              />
                              <SecondaryButton
                                label="Cancelar"
                                onPress={() => {
                                  setIsEditingOrCreating(false);
                                  setEditingChild(null);
                                  setShowBirth(false);
                                  cReset();
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <PrimaryButton
                                label={
                                  cSaving ? "A criar…" : "Adicionar criança"
                                }
                                onPress={cSubmit(createChildSubmit)}
                                disabled={cSaving}
                              />
                              <SecondaryButton
                                label="Cancelar"
                                onPress={() => {
                                  setIsEditingOrCreating(false);
                                  setEditingChild(null);
                                  setShowBirth(false);
                                  cReset();
                                }}
                              />
                            </>
                          )}
                        </View>
                      </FlexibleCard>
                    </>
                  )}
                </>
              )}
            </FlexibleCard>
          </FadeIn>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

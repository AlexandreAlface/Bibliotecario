/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/librarian/familias/[id].tsx
 * Ecrã: Perfil de Família (bibliotecário) — detalhe completo
 * Autor: Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços conforme combinado:
 *  • Comentários claros em TODO o código (PT-PT).
 *  • Helpers/métodos PUROS e curtos (≤ 30 linhas).
 *  • Secções colapsáveis com animação suave (Android + iOS).
 *  • Sem alterar contratos de serviços externos.
 * ============================================================================
 */

import * as React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text, IconButton, Chip } from "react-native-paper";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  getFamilyDetail,
  type FamilyDetail,
} from "src/services/librarianFamilies";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

/* =============================================================================
 * Helpers PUROS (sem efeitos colaterais) — curtos
 * ========================================================================== */

/** fmtDate — formata carimbo de data ISO -> “dd Mmm yyyy, HH:mm” (PT). */
const fmtDate = (d?: string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(d))
    : "";

/** useAndroidLayoutAnim — ativa LayoutAnimation no Android apenas 1x. */
function useAndroidLayoutAnim() {
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
}

/* =============================================================================
 * Linhas de informação simples (label + valor) — componente leve
 * ========================================================================== */

const InfoRow = React.memo(function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
      }}
    >
      {icon ? (
        <Icon name={icon} size={16} color={theme.colors.onSurfaceVariant} />
      ) : null}
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        <Text style={{ fontWeight: "700", color: theme.colors.onSurface }}>
          {label}:{" "}
        </Text>
        {value}
      </Text>
    </View>
  );
});

/* =============================================================================
 * “Pílula” de estado da consulta — mapeamento + chip simples
 * ========================================================================== */

const STATUS_STYLE: Record<
  string,
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

const StatusPill = React.memo(function StatusPill({
  status,
}: {
  status?: string | null;
}) {
  const s = STATUS_STYLE[(status ?? "").toUpperCase()] ?? STATUS_STYLE.PENDING;
  return (
    <View
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: s.bg,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: s.fg, fontSize: 12, fontWeight: "700" }}>
        {s.label}
      </Text>
    </View>
  );
});

/* =============================================================================
 * Secção colapsável — cabeçalho e corpo separados p/ manter funções curtas
 * ========================================================================== */

function SectionHeader({
  title,
  icon,
  collapsed,
  onToggle,
  right,
  count,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  collapsed: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
  count?: number;
}) {
  const theme = useTheme();
  const showCount = collapsed && Number.isFinite(count);
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
      accessibilityRole="button"
      accessibilityLabel={`${collapsed ? "Expandir" : "Colapsar"} ${title}`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        {icon ? (
          <Icon name={icon} size={20} color={theme.colors.onSurface} />
        ) : null}
        <Text
          style={{
            fontWeight: "800",
            fontSize: 18,
            color: theme.colors.onSurface,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {showCount ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: theme.colors.secondaryContainer,
          }}
        >
          <Text
            style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}
          >
            {count}
          </Text>
        </View>
      ) : !!right ? (
        <View>{right}</View>
      ) : null}

      <Icon
        name={collapsed ? "chevron-down" : "chevron-up"}
        size={22}
        color={theme.colors.onSurface}
      />
    </TouchableOpacity>
  );
}

/** CollapsibleSection — contentor com header clicável e corpo colapsável. */
function CollapsibleSection({
  title,
  right,
  count,
  icon,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  right?: React.ReactNode;
  count?: number;
  icon?: React.ComponentProps<typeof Icon>["name"];
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const theme = useTheme();
  useAndroidLayoutAnim(); // ativa animações no Android

  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const toggle = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((v) => !v);
  }, []);

  return (
    <FlexibleCard
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={14}
      style={{ borderRadius: 12 }}
    >
      <SectionHeader
        title={title}
        icon={icon}
        collapsed={collapsed}
        onToggle={toggle}
        right={right}
        count={count}
      />
      {!collapsed && <View style={{ marginTop: 10 }}>{children}</View>}
    </FlexibleCard>
  );
}

/* =============================================================================
 * Ecrã principal — Perfil da Família
 * ========================================================================== */

export default function FamilyProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const famId = Number(id);

  // Estado de dados e carregamento
  const [data, setData] = React.useState<FamilyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  /** load — busca detalhe da família e atualiza estado (curto e robusto). */
  const load = React.useCallback(async () => {
    if (!Number.isFinite(famId)) return;
    setLoading(true);
    try {
      const res = await getFamilyDetail(famId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [famId]);

  // Carrega ao montar/alterar famId
  React.useEffect(() => {
    load();
  }, [load]);

  /** onRefresh — usado no Pull-to-Refresh. */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  /** goBackToFamilies — navega para a listagem de famílias. */
  const goBackToFamilies = React.useCallback(() => {
    router.navigate("/librarian/Familias");
  }, [router]);

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* -------- Header compacto: voltar, ícone e identificação -------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <IconButton
                icon="arrow-left"
                onPress={goBackToFamilies}
                accessibilityLabel="Voltar"
              />
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

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontWeight: "900",
                    fontSize: 20,
                    color: theme.colors.onSurface,
                  }}
                  numberOfLines={1}
                >
                  {data?.family?.fullName ?? "Família"}
                </Text>

                {/* Email */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <Icon
                    name="email-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={{ opacity: 0.75 }} numberOfLines={1}>
                    {data?.family?.email ?? "—"}
                  </Text>
                </View>

                {/* Telefone/Morada */}
                {!!data && (
                  <View style={{ marginTop: 6 }}>
                    <InfoRow
                      label="Telefone"
                      value={data.family.phone ?? ""}
                      icon="phone"
                    />
                    <InfoRow
                      label="Morada"
                      value={data.family.address ?? ""}
                      icon="home-outline"
                    />
                  </View>
                )}
              </View>
            </View>
          </FlexibleCard>

          {/* -------- Zona de loading/erro -------- */}
          {loading ? (
            <FlexibleCard
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={20}
              style={{ borderRadius: 12, alignItems: "center" }}
            >
              <ActivityIndicator />
            </FlexibleCard>
          ) : !data ? (
            <FlexibleCard
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={20}
              style={{ borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Não foi possível carregar o perfil.
              </Text>
            </FlexibleCard>
          ) : (
            <>
              {/* -------- Crianças -------- */}
              <CollapsibleSection
                title="Crianças"
                icon="account-child-outline"
                count={data.children.length}
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
                      {data.children.length}
                    </Text>
                  </View>
                }
              >
                {data.children.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem crianças.
                  </Text>
                ) : (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {data.children.map((c) => (
                      <Chip key={c.id} compact icon="account-child">
                        {c.name}
                      </Chip>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* -------- Conquistas -------- */}
              <CollapsibleSection
                title="Conquistas"
                icon="trophy-outline"
                count={data.badges.length}
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
                      {data.badges.length}
                    </Text>
                  </View>
                }
                defaultCollapsed
              >
                {data.badges.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem conquistas atribuídas.
                  </Text>
                ) : (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {data.badges.map((b, i) => (
                      <Chip
                        key={`${b.badge.id}-${i}`}
                        mode="outlined"
                        icon={
                          b.badge.type.toLowerCase().includes("trof")
                            ? "trophy"
                            : "star"
                        }
                      >
                        {b.badge.name}
                      </Chip>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* -------- Leituras (em curso + reservas) -------- */}
              <CollapsibleSection
                title="Leituras"
                icon="book-open-variant"
                count={data.readings.length + data.reservations.length}
                right={
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Chip compact icon="book-open-variant">
                      {data.readings.length} a ler
                    </Chip>
                    <Chip compact mode="outlined" icon="bookmark-outline">
                      {data.reservations.length} reservas
                    </Chip>
                  </View>
                }
                defaultCollapsed
              >
                {data.readings.length === 0 &&
                data.reservations.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem leituras em curso nem reservas.
                  </Text>
                ) : (
                  <View style={{ rowGap: 10 }}>
                    {/* Leituras em curso */}
                    {data.readings.map((r) => (
                      <View
                        key={`reading-${r.id}`}
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          borderRadius: 10,
                          padding: 10,
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={{ uri: r.book.coverUrl ?? undefined }}
                          style={{
                            width: 48,
                            height: 72,
                            borderRadius: 6,
                            backgroundColor: theme.colors.surfaceVariant,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700" }}>
                            {r.book.title}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <Icon
                              name="calendar-start"
                              size={14}
                              color={theme.colors.onSurfaceVariant}
                            />
                            <Text style={{ opacity: 0.7 }}>
                              A ler desde {fmtDate(r.startedAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {/* Reservas */}
                    {data.reservations.map((r) => (
                      <View
                        key={`res-${r.id}`}
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          borderRadius: 10,
                          padding: 10,
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={{ uri: r.book.coverUrl ?? undefined }}
                          style={{
                            width: 48,
                            height: 72,
                            borderRadius: 6,
                            backgroundColor: theme.colors.surfaceVariant,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700" }}>
                            {r.book.title}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 2,
                            }}
                          >
                            <Icon
                              name="bookmark-outline"
                              size={14}
                              color={theme.colors.onSurfaceVariant}
                            />
                            <Text style={{ opacity: 0.7 }}>
                              Reservado em {fmtDate(r.reservedAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* -------- Avaliações -------- */}
              <CollapsibleSection
                title="Avaliações"
                icon="star-outline"
                count={data.ratings.length}
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
                      {data.ratings.length}
                    </Text>
                  </View>
                }
                defaultCollapsed
              >
                {data.ratings.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Ainda sem avaliações.
                  </Text>
                ) : (
                  <View style={{ rowGap: 10 }}>
                    {data.ratings.map((r) => (
                      <View
                        key={`rat-${r.id}`}
                        style={{
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          padding: 10,
                        }}
                      >
                        <Text style={{ fontWeight: "700" }}>
                          {r.book.title}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <Icon
                            name="star"
                            size={14}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text>
                            {" "}
                            {r.stars}/5 • {fmtDate(r.ratedAt)}
                          </Text>
                        </View>
                        {!!r.comment && (
                          <Text style={{ marginTop: 4, opacity: 0.85 }}>
                            “{r.comment}”
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* -------- Consultas (próximas + recentes) -------- */}
              <CollapsibleSection
                title="Consultas"
                icon="calendar-clock"
                count={
                  data.upcomingConsultations.length +
                  data.recentConsultations.length
                }
                defaultCollapsed
              >
                {data.upcomingConsultations.length === 0 &&
                data.recentConsultations.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem consultas registadas.
                  </Text>
                ) : (
                  <View style={{ rowGap: 12 }}>
                    {/* Próximas */}
                    {data.upcomingConsultations.length > 0 && (
                      <View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 6,
                          }}
                        >
                          <Icon
                            name="calendar-arrow-right"
                            size={16}
                            color={theme.colors.onSurface}
                          />
                          <Text style={{ fontWeight: "800" }}>Próximas</Text>
                        </View>
                        <View style={{ rowGap: 8 }}>
                          {data.upcomingConsultations.map((c) => {
                            const childName =
                              (c as any)?.childName ??
                              (c as any)?.child?.name ??
                              "";
                            return (
                              <View
                                key={`upc-${c.id}`}
                                style={{
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  borderColor: theme.colors.outlineVariant,
                                  padding: 10,
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    gap: 8,
                                  }}
                                >
                                  <Text style={{ fontWeight: "700", flex: 1 }}>
                                    {c.title || "Consulta"}
                                  </Text>
                                  <StatusPill status={(c as any)?.status} />
                                </View>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 2,
                                  }}
                                >
                                  <Icon
                                    name="calendar"
                                    size={14}
                                    color={theme.colors.onSurfaceVariant}
                                  />
                                  <Text style={{ opacity: 0.8 }}>
                                    {fmtDate(c.startAt)}
                                    {c.library?.name
                                      ? ` • ${c.library?.name}`
                                      : ""}
                                  </Text>
                                </View>
                                {!!childName && (
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 2,
                                    }}
                                  >
                                    <Icon
                                      name="account-child-outline"
                                      size={14}
                                      color={theme.colors.onSurfaceVariant}
                                    />
                                    <Text style={{ opacity: 0.8 }}>
                                      Criança: {childName}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Recentes (apenas desta família) */}
                    {(() => {
                      const recent =
                        data.recentConsultations?.filter((c: any) =>
                          typeof c?.familyId === "number"
                            ? c.familyId === data.family.id
                            : true
                        ) ?? [];
                      if (recent.length === 0) return null;
                      return (
                        <View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Icon
                              name="history"
                              size={16}
                              color={theme.colors.onSurface}
                            />
                            <Text style={{ fontWeight: "800" }}>Recentes</Text>
                          </View>
                          <View style={{ rowGap: 8 }}>
                            {recent.map((c: any) => {
                              const childName =
                                c?.childName ?? c?.child?.name ?? "";
                              const status = c?.status;
                              return (
                                <View
                                  key={`rec-${c.id}`}
                                  style={{
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: theme.colors.outlineVariant,
                                    padding: 10,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      gap: 8,
                                    }}
                                  >
                                    <Text
                                      style={{ fontWeight: "700", flex: 1 }}
                                    >
                                      {c.title || "Consulta"}
                                    </Text>
                                    <StatusPill status={status} />
                                  </View>

                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 2,
                                    }}
                                  >
                                    <Icon
                                      name="calendar"
                                      size={14}
                                      color={theme.colors.onSurfaceVariant}
                                    />
                                    <Text style={{ opacity: 0.8 }}>
                                      {fmtDate(c.startAt)}
                                      {c.library?.name
                                        ? ` • ${c.library?.name}`
                                        : ""}
                                    </Text>
                                  </View>

                                  {!!childName && (
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 6,
                                        marginTop: 2,
                                      }}
                                    >
                                      <Icon
                                        name="account-child-outline"
                                        size={14}
                                        color={theme.colors.onSurfaceVariant}
                                      />
                                      <Text style={{ opacity: 0.8 }}>
                                        Criança: {childName}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </CollapsibleSection>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

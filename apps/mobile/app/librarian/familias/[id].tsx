// apps/mobile/app/librarian/familias/[id].tsx
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

/* ---------- helpers ---------- */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
      <Text style={{ fontWeight: "700", color: theme.colors.onSurface }}>
        {label}:{" "}
      </Text>
      {value}
    </Text>
  );
}
const fmtDate = (d?: string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(d))
    : "";

/* ---------- status pill ---------- */
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
function StatusPill({ status }: { status?: string | null }) {
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
}

/* ---------- Card colapsável ---------- */
function CollapsibleSection({
  title,
  right,
  count,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  right?: React.ReactNode; // conteúdo rico mostrado quando EXPANDIDO
  count?: number; // número de itens mostrado quando COLAPSADO
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggle = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((v) => !v);
  }, []);

  const showCollapsedCount =
    collapsed && typeof count === "number" && Number.isFinite(count);

  return (
    <FlexibleCard
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={14}
      style={{ borderRadius: 12 }}
    >
      <TouchableOpacity
        onPress={toggle}
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
        <Text
          style={{
            fontWeight: "800",
            fontSize: 18,
            color: theme.colors.onSurface,
            flexShrink: 1,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Header-right:
            - quando colapsado → mostra count
            - quando expandido → mostra 'right' rico (se existir) */}
        {showCollapsedCount ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: theme.colors.secondaryContainer,
            }}
          >
            <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
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

      {!collapsed && <View style={{ marginTop: 10 }}>{children}</View>}
    </FlexibleCard>
  );
}

/* ---------- Screen ---------- */
export default function FamilyProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const famId = Number(id);

  const [data, setData] = React.useState<FamilyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

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

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const goBackToFamilies = React.useCallback(() => {
    // força SEMPRE a lista de famílias
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
          {/* Header: voltar + nome/email */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <IconButton
                icon="arrow-left"
                onPress={goBackToFamilies}
                accessibilityLabel="Voltar"
              />
              <View style={{ flex: 1 }}>
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
                <Text style={{ opacity: 0.75 }} numberOfLines={1}>
                  {data?.family?.email ?? "—"}
                </Text>
                {!!data && (
                  <View style={{ marginTop: 6 }}>
                    <InfoRow label="Telefone" value={data.family.phone ?? ""} />
                    <InfoRow label="Morada" value={data.family.address ?? ""} />
                  </View>
                )}
              </View>
            </View>
          </FlexibleCard>

          {/* Loading / erro */}
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
              {/* Crianças */}
              <CollapsibleSection
                title="Crianças"
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
                      <Chip key={c.id} compact>
                        {c.name}
                      </Chip>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* Conquistas */}
              <CollapsibleSection
                title="Conquistas"
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

              {/* Leituras (em curso + reservas) */}
              <CollapsibleSection
                title="Leituras"
                count={data.readings.length + data.reservations.length}
                right={
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Chip compact>{data.readings.length} a ler</Chip>
                    <Chip compact mode="outlined">
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
                          <Text style={{ opacity: 0.7, marginTop: 2 }}>
                            A ler desde {fmtDate(r.startedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}

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
                          <Text style={{ opacity: 0.7, marginTop: 2 }}>
                            Reservado em {fmtDate(r.reservedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </CollapsibleSection>

              {/* Avaliações */}
              <CollapsibleSection
                title="Avaliações"
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
                        <Text style={{ marginTop: 2 }}>
                          ⭐ {r.stars}/5 • {fmtDate(r.ratedAt)}
                        </Text>
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

              {/* Consultas (próximas + recentes) */}
              <CollapsibleSection
                title="Consultas"
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
                        <Text style={{ fontWeight: "800", marginBottom: 6 }}>
                          Próximas
                        </Text>
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
                                <Text style={{ marginTop: 2, opacity: 0.8 }}>
                                  {fmtDate(c.startAt)}
                                  {c.library?.name
                                    ? ` • ${c.library?.name}`
                                    : ""}
                                </Text>
                                {!!childName && (
                                  <Text style={{ marginTop: 2, opacity: 0.8 }}>
                                    Criança: {childName}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Recentes — apenas desta família, com criança + estado */}
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
                          <Text style={{ fontWeight: "800", marginBottom: 6 }}>
                            Recentes
                          </Text>
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

                                  <Text style={{ marginTop: 2, opacity: 0.8 }}>
                                    {fmtDate(c.startAt)}
                                    {c.library?.name
                                      ? ` • ${c.library?.name}`
                                      : ""}
                                  </Text>

                                  {!!childName && (
                                    <Text
                                      style={{ marginTop: 2, opacity: 0.8 }}
                                    >
                                      Criança: {childName}
                                    </Text>
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

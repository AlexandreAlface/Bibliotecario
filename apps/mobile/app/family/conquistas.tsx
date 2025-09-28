// apps/mobile/app/family/conquistas.tsx
import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, IconButton, Button } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { useAuth } from "src/contexts/AuthContext";
import { badgesApi, type Badge } from "src/services/badges";

/** ------ helpers ------ */
function isTrophy(t?: string | null) {
  const v = (t ?? "").toUpperCase();
  return v.includes("TROF");
}
function isSeal(t?: string | null) {
  const v = (t ?? "").toUpperCase();
  return !isTrophy(v); // tudo o resto cai em “Selos”
}
function plural(n: number, a: string, b: string) {
  return `${n} ${n === 1 ? a : b}`;
}

/** Chip pill reutilizável com ícone (usa o tema) */
function PillChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
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
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: bg,
        borderWidth: active ? 0 : 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      {icon ? <Icon name={icon as any} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: active ? "700" : "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Tile de Badge (conquistado vs. por conquistar) — com ícones e tipo */
function BadgeTile({
  name,
  achieved,
  criteria,
  kind, // 'trophy' | 'seal'
  onPress,
}: {
  name: string;
  achieved: boolean;
  criteria?: string | null;
  kind: "trophy" | "seal";
  onPress: () => void;
}) {
  const theme = useTheme();
  const iconAchieved = kind === "trophy" ? "trophy" : "star";
  const iconPending = kind === "trophy" ? "trophy-outline" : "star-outline";

  if (achieved) {
    // Conquistado → chip sólido com ícone
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: theme.colors.primary,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.onPrimary,
          }}
        >
          <Icon
            name={iconAchieved as any}
            size={14}
            color={theme.colors.primary}
          />
        </View>

        <Text
          numberOfLines={1}
          style={{
            maxWidth: 220,
            fontWeight: "700",
            color: theme.colors.onPrimary,
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  // Não conquistado → outline dashed com ícone
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.2,
        borderColor: theme.colors.outlineVariant,
        borderStyle: "dashed",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        <Icon
          name={iconPending as any}
          size={14}
          color={theme.colors.onSurfaceVariant}
        />
      </View>

      <Text
        numberOfLines={1}
        style={{
          maxWidth: 180,
          fontWeight: "600",
          color: theme.colors.onSurface,
        }}
      >
        {name}
      </Text>

      {!!criteria && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon
            name="help-circle-outline"
            size={14}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              textDecorationLine: "underline",
            }}
          >
            ver critério
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** ------ Screen ------ */
export default function ConquistasScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const actingChildId = user?.actingChild?.id ?? null;

  // seleção da criança
  const [childId, setChildId] = React.useState<number | null>(
    actingChildId || user?.children?.[0]?.id || null
  );

  // dados
  const [catalog, setCatalog] = React.useState<Badge[]>([]);
  const [achieved, setAchieved] = React.useState<Set<number>>(new Set());
  const [selectedBadge, setSelectedBadge] = React.useState<Badge | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // colapso dos cards
  const [sealsCollapsed, setSealsCollapsed] = React.useState(false);
  const [trophiesCollapsed, setTrophiesCollapsed] = React.useState(false);

  const toggleSeals = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSealsCollapsed((v) => !v);
  }, []);
  const toggleTrophies = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTrophiesCollapsed((v) => !v);
  }, []);

  const childrenChips = React.useMemo(
    () => (user?.children ?? []).map((c) => ({ id: c.id, name: c.name })),
    [user?.children]
  );

  // carregar catálogo (uma vez)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await badgesApi.listCatalog();
        if (!alive) return;
        setCatalog(items);
        if (!selectedBadge && items.length) setSelectedBadge(items[0]);
      } catch {
        setCatalog([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // carregar conquistas
  const loadAssignments = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await badgesApi.assignments(
        childId ? { childId } : { familyId: user.id, limit: 200 }
      );
      const set = new Set<number>();
      data.forEach((a) => set.add(a.badgeId));
      setAchieved(set);
    } catch {
      setAchieved(new Set());
    } finally {
      setLoading(false);
    }
  }, [user?.id, childId]);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAssignments();
    } finally {
      setRefreshing(false);
    }
  }, [loadAssignments]);

  // grupos + contagens
  const seals = React.useMemo(
    () => catalog.filter((b) => isSeal(b.type)),
    [catalog]
  );
  const trophies = React.useMemo(
    () => catalog.filter((b) => isTrophy(b.type)),
    [catalog]
  );

  const sealsWon = seals.filter((b) => achieved.has(b.id)).length;
  const trophiesWon = trophies.filter((b) => achieved.has(b.id)).length;

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Título com ícone */}
          {/* HEADER TOP — Conquistas (compacto: ícone + título) */}
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
                {/* Podes trocar por "medal-outline" se preferires */}
                <Icon
                  name="trophy-outline"
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
                Conquistas
              </Text>
            </View>
          </FlexibleCard>

          {/* Escolher criança (esconde se a sessão estiver em modo criança) */}
          {!actingChildId && (
            <FlexibleCard
              title="Escolher criança"
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={14}
              style={{ borderRadius: 12 }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {childrenChips.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Sem crianças registadas.
                  </Text>
                ) : (
                  childrenChips.map((ch) => (
                    <PillChip
                      key={ch.id}
                      label={ch.name}
                      active={childId === ch.id}
                      icon="account"
                      onPress={() => setChildId(ch.id)}
                    />
                  ))
                )}
                {childId && (
                  <Button
                    mode="outlined"
                    icon="account-group"
                    onPress={() => setChildId(null)}
                  >
                    Ver todas
                  </Button>
                )}
              </ScrollView>
            </FlexibleCard>
          )}

          {/* Resumo com ícones */}
          <FlexibleCard
            title="Resumo"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: theme.colors.secondaryContainer,
                }}
              >
                <Icon
                  name="star-four-points"
                  size={16}
                  color={theme.colors.onSecondaryContainer}
                />
                <Text
                  style={{
                    color: theme.colors.onSecondaryContainer,
                    fontWeight: "600",
                  }}
                >
                  Selos: {sealsWon} / {seals.length}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: theme.colors.secondaryContainer,
                }}
              >
                <Icon
                  name="trophy-variant"
                  size={16}
                  color={theme.colors.onSecondaryContainer}
                />
                <Text
                  style={{
                    color: theme.colors.onSecondaryContainer,
                    fontWeight: "600",
                  }}
                >
                  Troféus: {trophiesWon} / {trophies.length}
                </Text>
              </View>
            </View>
          </FlexibleCard>

          {/* Selos (colapsável) */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Header clicável */}
            <TouchableOpacity
              onPress={toggleSeals}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="star-four-points-outline"
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
                  Selos
                </Text>
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
                    {sealsWon}/{seals.length}
                  </Text>
                </View>
              </View>
              <Icon
                name={sealsCollapsed ? "chevron-down" : "chevron-up"}
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>

            {!sealsCollapsed && (
              <View style={{ marginTop: 12 }}>
                {loading && seals.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    A carregar…
                  </Text>
                ) : (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                  >
                    {seals.map((b) => (
                      <BadgeTile
                        key={b.id}
                        name={b.name}
                        achieved={achieved.has(b.id)}
                        criteria={b.criteria}
                        kind="seal"
                        onPress={() => setSelectedBadge(b)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </FlexibleCard>

          {/* Troféus (colapsável) */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Header clicável */}
            <TouchableOpacity
              onPress={toggleTrophies}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="trophy-outline"
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
                  Troféus
                </Text>
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
                    {trophiesWon}/{trophies.length}
                  </Text>
                </View>
              </View>
              <Icon
                name={trophiesCollapsed ? "chevron-down" : "chevron-up"}
                size={24}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>

            {!trophiesCollapsed && (
              <View style={{ marginTop: 12 }}>
                {loading && trophies.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    A carregar…
                  </Text>
                ) : (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                  >
                    {trophies.map((b) => (
                      <BadgeTile
                        key={b.id}
                        name={b.name}
                        achieved={achieved.has(b.id)}
                        criteria={b.criteria}
                        kind="trophy"
                        onPress={() => setSelectedBadge(b)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </FlexibleCard>

          {/* Detalhe da conquista */}
          {selectedBadge && (
            <FlexibleCard
              title="Detalhe da conquista"
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={14}
              style={{ borderRadius: 12 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                    name={
                      isTrophy(selectedBadge.type)
                        ? "trophy"
                        : "star-four-points"
                    }
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: theme.colors.onSurface,
                      flex: 1,
                    }}
                  >
                    {selectedBadge.name}
                  </Text>
                </View>
                <IconButton
                  icon={isTrophy(selectedBadge.type) ? "trophy" : "star"}
                  size={22}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.secondaryContainer,
                  }}
                >
                  <Icon
                    name={
                      isTrophy(selectedBadge.type)
                        ? "trophy-outline"
                        : "star-four-points-outline"
                    }
                    size={14}
                    color={theme.colors.onSecondaryContainer}
                  />
                  <Text
                    style={{
                      color: theme.colors.onSecondaryContainer,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {isTrophy(selectedBadge.type) ? "TROFÉU" : "SELO"}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: achieved.has(selectedBadge.id)
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderWidth: achieved.has(selectedBadge.id) ? 0 : 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Icon
                    name={
                      achieved.has(selectedBadge.id) ? "check" : "clock-outline"
                    }
                    size={14}
                    color={
                      achieved.has(selectedBadge.id)
                        ? theme.colors.onPrimary
                        : theme.colors.onSurface
                    }
                  />
                  <Text
                    style={{
                      color: achieved.has(selectedBadge.id)
                        ? theme.colors.onPrimary
                        : theme.colors.onSurface,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {achieved.has(selectedBadge.id)
                      ? "Conquistado"
                      : "Por conquistar"}
                  </Text>
                </View>
              </View>

              {!!selectedBadge.criteria && (
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 10,
                  }}
                >
                  {selectedBadge.criteria}
                </Text>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Button mode="contained" icon="refresh" onPress={onRefresh}>
                  Atualizar
                </Button>
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={() => setSelectedBadge(null)}
                >
                  Limpar seleção
                </Button>
              </View>
            </FlexibleCard>
          )}

          {!selectedBadge && seals.length + trophies.length > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                }}
              >
                Toca num selo/troféu para veres os detalhes.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, IconButton } from "react-native-paper";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import { useAuth } from "src/contexts/AuthContext";
import {
  badgesApi,
  type Badge,
  type BadgeAssignment,
} from "src/services/badges";

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

/** Chips reutilizáveis (tema) */
function PillChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
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

/** Tile de Badge (conquistado vs. por conquistar) — versão refinada */
function BadgeTile({
  name,
  achieved,
  criteria,
  onPress,
}: {
  name: string;
  achieved: boolean;
  criteria?: string | null;
  onPress: () => void;
}) {
  const theme = useTheme();

  if (achieved) {
    // Conquistado → chip sólido
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
          backgroundColor: "#16A34A", // verde sólido
        }}
      >
        {/* bolha branca com ✓ */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Text style={{ color: "#16A34A", fontWeight: "800" }}>✓</Text>
        </View>

        <Text
          numberOfLines={1}
          style={{
            maxWidth: 220,
            fontWeight: "700",
            color: "#FFFFFF",
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  // Não conquistado → outline cinza com traço, texto discreto e "ver critério"
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
        borderColor: "#D1D5DB", // cinza médio
        borderStyle: "dashed",
      }}
    >
      {/* bolha cinza clara “vazia” */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3F4F6", // cinza claro
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Text style={{ color: "#9CA3AF", fontWeight: "800" }}>•</Text>
      </View>

      <Text
        numberOfLines={1}
        style={{
          maxWidth: 180,
          fontWeight: "600",
          color: "#374151", // cinza-800
        }}
      >
        {name}
      </Text>

      {!!criteria && (
        <Text
          numberOfLines={1}
          style={{
            marginLeft: 6,
            fontSize: 12,
            color: "#6B7280", // cinza-500
            textDecorationLine: "underline",
          }}
        >
          ver critério
        </Text>
      )}
    </TouchableOpacity>
  );
}

/** ------ Screen ------ */
export default function ConquistasScreen() {
  const theme = useTheme();
  const { user } = useAuth();

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

  // carregar conquistas da criança selecionada (ou da família se não houver seleção)
  const loadAssignments = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await badgesApi.assignments(
        childId ? { childId } : { familyId: user.id, limit: 200 }
      );
      // se viewing por criança, queremos só os badgeIds dessa criança
      const set = new Set<number>();
      if (childId) {
        data.forEach((a) => set.add(a.badgeId));
      } else {
        // família → agregar todos
        data.forEach((a) => set.add(a.badgeId));
      }
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
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.colors.onBackground,
            }}
          >
            Conquistas
          </Text>

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
                      onPress={() => setChildId(ch.id)}
                    />
                  ))
                )}
                {childId && (
                  <SecondaryButton
                    label="Ver todas"
                    onPress={() => setChildId(null)}
                  />
                )}
              </ScrollView>
            </FlexibleCard>
          )}

          {/* Resumo */}
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

          {/* Selos */}
          <FlexibleCard
            title="Selos"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {loading && seals.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                A carregar…
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {seals.map((b) => (
                  <BadgeTile
                    key={b.id}
                    name={b.name}
                    achieved={achieved.has(b.id)}
                    criteria={b.criteria} // ⬅️ acrescenta isto
                    onPress={() => setSelectedBadge(b)}
                  />
                ))}
              </View>
            )}
          </FlexibleCard>

          {/* Troféus */}
          <FlexibleCard
            title="Troféus"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {loading && trophies.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                A carregar…
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {trophies.map((b) => (
                  <BadgeTile
                    key={b.id}
                    name={b.name}
                    achieved={achieved.has(b.id)}
                    criteria={b.criteria} // ⬅️ acrescenta isto
                    onPress={() => setSelectedBadge(b)}
                  />
                ))}
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
                <IconButton
                  icon={isTrophy(selectedBadge.type) ? "trophy" : "star"}
                  size={22}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.secondaryContainer,
                  }}
                >
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
                <PrimaryButton label="Atualizar" onPress={onRefresh} />
                <SecondaryButton
                  label="Limpar seleção"
                  onPress={() => setSelectedBadge(null)}
                />
              </View>
            </FlexibleCard>
          )}

          {/* CTA opcional quando não há seleção */}
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

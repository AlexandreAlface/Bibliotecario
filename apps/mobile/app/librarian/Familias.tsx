// apps/mobile/app/librarian/Familias.tsx
import * as React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, Text, TextInput, IconButton } from "react-native-paper";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { useFocusEffect } from "@react-navigation/native";
import { FamilyLite, listFamilies } from "src/services/librarianFamilies";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

/* ---------- hook: debounce ---------- */
function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LibrarianFamiliesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 350);

  const [families, setFamilies] = React.useState<FamilyLite[]>([]);
  const [cursor, setCursor] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const loadFirstPage = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items, nextCursor } = await listFamilies({
        search: debouncedQuery,
        limit: 25,
      });
      setFamilies(Array.isArray(items) ? items : []);
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.warn("[families] loadFirstPage error:", e);
      setFamilies([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  const loadMore = React.useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await listFamilies({
        search: debouncedQuery,
        limit: 25,
        cursor,
      });
      setFamilies((prev) => [...prev, ...(Array.isArray(items) ? items : [])]);
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.warn("[families] loadMore error:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, debouncedQuery, loadingMore]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [loadFirstPage]);

  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  useFocusEffect(
    React.useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

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
          {/* Header + pesquisa */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.onSurface,
                marginBottom: 8,
              }}
            >
              Famílias
            </Text>

            <TextInput
              mode="outlined"
              placeholder="Pesquisar por nome/email/telefone…"
              value={query}
              onChangeText={setQuery}
              left={<TextInput.Icon icon="magnify" />}
              style={{ backgroundColor: theme.colors.surface }}
              autoCorrect={false}
              autoCapitalize="none"
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <Text style={{ opacity: 0.6 }}>
                {loading ? "A procurar…" : `${families.length} resultados`}
              </Text>
              <IconButton
                icon="refresh"
                onPress={loadFirstPage}
                disabled={loading}
              />
            </View>
          </FlexibleCard>

          {/* Lista */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={12}
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <ActivityIndicator />
            ) : families.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Sem resultados para a pesquisa.
                </Text>
              </View>
            ) : (
              <View style={{ rowGap: 8 }}>
                {families.map((f) => (
                  <View
                    key={f.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: theme.colors.onSurface,
                      }}
                      numberOfLines={1}
                    >
                      {f.fullName}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {f.email}
                      {f.phone ? ` • ${f.phone}` : ""}
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        alignSelf: "flex-start",
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: theme.colors.secondaryContainer,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.onSecondaryContainer }}
                      >
                        {f.childrenCount} criança
                        {f.childrenCount === 1 ? "" : "s"}
                      </Text>
                    </View>

                    {/* ação explícita: Abrir perfil */}
                    <TouchableOpacity
                      onPress={() => router.push(`/librarian/familias/${f.id}`)}
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-start",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Icon
                        name="account-arrow-right-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text style={{ color: theme.colors.primary }}>
                        Abrir perfil
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {cursor && (
                  <TouchableOpacity
                    onPress={loadMore}
                    disabled={loadingMore}
                    style={{
                      marginTop: 6,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                    }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator />
                    ) : (
                      <Text>Carregar mais</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

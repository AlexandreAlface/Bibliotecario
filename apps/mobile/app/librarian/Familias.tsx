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
          {/* -------- Header com ícone + título -------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
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
                  fontSize: 22,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
              >
                Famílias
              </Text>
            </View>
          </FlexibleCard>

          {/* -------- Pesquisa -------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Icon name="magnify" size={18} color={theme.colors.onSurface} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: theme.colors.onSurface,
                }}
              >
                Pesquisa
              </Text>
            </View>

            <TextInput
              mode="outlined"
              placeholder="Pesquisar por nome, email ou telefone…"
              value={query}
              onChangeText={setQuery}
              left={<TextInput.Icon icon="magnify" />}
              style={{ backgroundColor: theme.colors.surface }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon
                  name={loading ? "progress-clock" : "database-search"}
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={{ opacity: 0.7 }}>
                  {loading
                    ? "A procurar…"
                    : `${families.length} resultado${
                        families.length === 1 ? "" : "s"
                      }`}
                </Text>
              </View>
              <IconButton
                icon="refresh"
                onPress={loadFirstPage}
                disabled={loading}
              />
            </View>
          </FlexibleCard>

          {/* -------- Resultados -------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* header do bloco */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="account-group"
                  size={18}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.onSurface,
                  }}
                >
                  Resultados
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
                    {families.length}
                  </Text>
                </View>
              </View>
            </View>

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
                    {/* Nome (com ícone) */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon
                        name="account-circle-outline"
                        size={18}
                        color={theme.colors.onSurface}
                      />
                      <Text
                        style={{
                          fontWeight: "700",
                          color: theme.colors.onSurface,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {f.fullName}
                      </Text>
                    </View>

                    {/* Email / Telefone */}
                    <View style={{ marginTop: 6, gap: 4 }}>
                      {!!f.email && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Icon
                            name="email-outline"
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                            numberOfLines={1}
                          >
                            {f.email}
                          </Text>
                        </View>
                      )}
                      {!!f.phone && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Icon
                            name="phone"
                            size={16}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                            numberOfLines={1}
                          >
                            {f.phone}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Chip de crianças */}
                    <View
                      style={{
                        marginTop: 8,
                        alignSelf: "flex-start",
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        backgroundColor: theme.colors.secondaryContainer,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon
                        name="account-child-outline"
                        size={14}
                        color={theme.colors.onSecondaryContainer}
                      />
                      <Text
                        style={{
                          color: theme.colors.onSecondaryContainer,
                          fontWeight: "600",
                        }}
                      >
                        {f.childrenCount} criança
                        {f.childrenCount === 1 ? "" : "s"}
                      </Text>
                    </View>

                    {/* ação: Abrir perfil */}
                    <TouchableOpacity
                      onPress={() => router.push(`/librarian/familias/${f.id}`)}
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-start",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir perfil da família ${f.fullName}`}
                    >
                      <Icon
                        name="open-in-new"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "700",
                        }}
                      >
                        Abrir perfil
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* paginação incremental */}
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
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Carregar mais resultados"
                  >
                    {loadingMore ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <Icon
                          name="download"
                          size={16}
                          color={theme.colors.onSurface}
                        />
                        <Text>Carregar mais</Text>
                      </>
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

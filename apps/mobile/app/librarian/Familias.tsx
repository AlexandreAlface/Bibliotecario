/**
 * =====================================================================
 * Ficheiro: apps/mobile/app/librarian/Familias.tsx
 * Módulo: Ecrã de listagem de famílias (bibliotecário)
 * Autor: Alexandre Brissos – Nº 21131
 * ---------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * =====================================================================
 */

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

/* =============================================================================
 * Constantes & Helpers PUROS
 * ========================================================================== */

/** Tamanho de página para paginação incremental. */
const PAGE_SIZE = 25;

/**
 * Garante um array seguro (evita `undefined`/`null`).
 * @param maybe - Valor possivelmente indefinido.
 * @returns Array válido.
 */
const asArray = <T,>(maybe: T[] | null | undefined): T[] =>
  Array.isArray(maybe) ? maybe : [];

/**
 * Texto amigável para o estado de resultados.
 * @param loading - Se está a carregar.
 * @param count - Número de resultados.
 */
const resultsText = (loading: boolean, count: number): string =>
  loading ? "A procurar…" : `${count} resultado${count === 1 ? "" : "s"}`;

/* =============================================================================
 * Hook: debounce
 * ========================================================================== */

/**
 * Devolve o valor após um atraso (debounce).
 * Útil para pesquisas, evitando chamadas sucessivas.
 *
 * @template T Tipo do valor a debouçar.
 * @param value Valor de entrada.
 * @param delay Atraso em ms (default: 400).
 * @returns Valor estável após o atraso.
 */
function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = React.useState<T>(value);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* =============================================================================
 * Componente: Ecrã de Famílias (Bibliotecário)
 * ========================================================================== */

/**
 * Ecrã com pesquisa e listagem paginada de Famílias.
 * - Pesquisa debounced por nome/email/telefone.
 * - Paginação incremental por cursor.
 * - Pull-to-refresh.
 */
export default function LibrarianFamiliesScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Estado de pesquisa com debounce para evitar spam de requisições.
  const [query, setQuery] = React.useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 350);

  // Estado remoto: items, cursor e flags de carregamento.
  const [families, setFamilies] = React.useState<FamilyLite[]>([]);
  const [cursor, setCursor] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);

  /**
   * Carrega a primeira página (reseta items/cursor).
   * - Fail-safe: em erro limpa estado para evitar lixo visual.
   */
  const loadFirstPage = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items, nextCursor } = await listFamilies({
        search: debouncedQuery,
        limit: PAGE_SIZE,
      });
      setFamilies(asArray(items));
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.warn("[families] loadFirstPage error:", e);
      setFamilies([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  /**
   * Carrega página seguinte (se existir cursor e não estiver ocupado).
   */
  const loadMore = React.useCallback(async () => {
    if (!cursor || loadingMore) return; // guard clause
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await listFamilies({
        search: debouncedQuery,
        limit: PAGE_SIZE,
        cursor,
      });
      setFamilies((prev) => [...prev, ...asArray(items)]);
      setCursor(nextCursor ?? null);
    } catch (e) {
      console.warn("[families] loadMore error:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, debouncedQuery, loadingMore]);

  /**
   * Handler do gesto de "puxar para atualizar".
   */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [loadFirstPage]);

  // Carrega à entrada e sempre que a query (debounced) muda.
  React.useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // Recarrega ao focar o ecrã (ex.: regressos da navegação).
  useFocusEffect(
    React.useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  /* -----------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------- */
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
          {/* -------- Cabeçalho com ícone + título -------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ gap: 8 }}>
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
                    accessibilityLabel="Ícone de famílias"
                  />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "900",
                    color: theme.colors.onSurface,
                  }}
                  accessibilityRole="header"
                >
                  Famílias
                </Text>
              </View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  lineHeight: 18,
                }}
                numberOfLines={3}
              >
                Explora e pesquisa famílias associadas. Usa a barra de pesquisa
                para filtrar por nome, email ou telefone. Toca numa família para
                abrir o perfil e ver mais detalhes.
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

            {/* Estado da pesquisa (contador + botão de refresh) */}
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
                  {resultsText(loading, families.length)}
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

            {/* Lista / estados vazios e carregamento */}
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

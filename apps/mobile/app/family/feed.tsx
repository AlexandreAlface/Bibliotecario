/**
 * ============================================================================
 * Ficheiro: (mantém o caminho do teu projeto)
 * Módulo: Feed de Micro-Conteúdos (conteúdos & biblioterapia)
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços pedidos:
 * • Comentários PT-PT em todo o código.
 * • Helpers/métodos PUROS (determinísticos) e funções pequenas (≤ 30 linhas).
 * • Sem alterar o comportamento existente.
 * ============================================================================
 */

import { Background } from "@bibliotecario/ui-mobile";
import * as React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
  Divider,
  IconButton,
} from "react-native-paper";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { TABBAR_HEIGHT } from "src/constants/layout";
import {
  listMicroContentsPublic,
  markMicroContentSeen,
  type MicroContentItem,
  type MicroContentType,
} from "src/services/microcontent";
import type { MD3Theme } from "react-native-paper";

/** Tipos suportados no filtro rápido */
const TYPES: MicroContentType[] = ["BIBLIOTERAPIA", "DICA", "FACTO", "OUTRO"];

/* =============================================================================
 * Animações
 * ===========================================================================*/

/**
 * Pequena animação de entrada (fade + slide up).
 * ⚙️ PURO (sem efeitos colaterais fora do React).
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
 * Helpers PUROS (determinísticos, ≤ 30 linhas)
 * ===========================================================================*/

/**
 * Divide o conteúdo em título (1ª linha ou 1ª frase) e corpo restante.
 * ⚙️ PURO
 */
function splitContent(raw: string): { title: string; body: string } {
  const text = (raw || "").trim();
  if (!text) return { title: "", body: "" };
  const byLine = text.split(/\n+/);
  let title = byLine[0].trim();
  let body = byLine.slice(1).join("\n").trim();
  if (!body && title.length > 80) {
    const m = title.match(/(.+?[.!?])\s+(.*)$/);
    if (m) {
      title = m[1].trim();
      body = m[2].trim();
    }
  }
  return { title, body };
}

/**
 * Gera iconografia/cores por tipo, com fallback.
 * ⚙️ PURO
 */
function typeVisuals(theme: MD3Theme, t?: MicroContentType) {
  switch (t) {
    case "BIBLIOTERAPIA":
      return {
        icon: "book-heart",
        bg: theme.colors.primaryContainer,
        fg: theme.colors.onPrimaryContainer,
        accent: theme.colors.primary,
      };
    case "DICA":
      return {
        icon: "lightbulb-on-outline",
        bg: theme.colors.tertiaryContainer ?? theme.colors.tertiary,
        fg: theme.colors.onTertiaryContainer ?? theme.colors.onTertiary,
        accent: theme.colors.tertiary,
      };
    case "FACTO":
      return {
        icon: "information-outline",
        bg: theme.colors.surfaceVariant,
        fg: theme.colors.onSurface,
        accent: theme.colors.onSurfaceVariant,
      };
    default:
      return {
        icon: "comment-quote-outline",
        bg: theme.colors.surfaceVariant,
        fg: theme.colors.onSurface,
        accent: theme.colors.outline,
      };
  }
}

/**
 * Calcula o nº de páginas (mínimo 1).
 * ⚙️ PURO
 */
function pagesCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil((total || 0) / Math.max(1, limit || 1)));
}

/* =============================================================================
 * Screen
 * ===========================================================================*/

export default function FeedScreen() {
  const theme = useTheme<MD3Theme>();
  const insets = useSafeAreaInsets();

  // Lista/paginação
  const [items, setItems] = React.useState<MicroContentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(12);

  // Filtros
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [tag, setTag] = React.useState<string>("");
  const [libraryId, setLibraryId] = React.useState<number | undefined>();

  // Facetas (recebidas da API)
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [allLibraries, setAllLibraries] = React.useState<
    { id: number; name: string }[]
  >([]);

  // Estado UI
  const [loading, setLoading] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Expand/collapse por item (guarda IDs abertos)
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Visual e tokens do tema
  const pages = pagesCount(total, limit);
  const BORDER = theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)";
  const SURFACE = theme.colors.surface;
  const SEL_BG = theme.colors.primaryContainer;
  const SEL_FG = theme.colors.onPrimaryContainer;
  const SEL_BORDER = theme.colors.primary;

  /**
   * Carrega uma página de resultados com os filtros atuais.
   * Mantém comportamento e atualiza facetas quando presentes.
   */
  async function load(p = page) {
    setLoading(true);
    try {
      const res = await listMicroContentsPublic({
        q: q || undefined,
        type: type || undefined,
        tag: tag || undefined,
        libraryId,
        page: p,
        limit,
      });
      setItems(res.items);
      setTotal(res.total);
      if (Array.isArray(res.tags)) setAllTags(res.tags);
      if (Array.isArray(res.libraries)) setAllLibraries(res.libraries);
    } finally {
      setLoading(false);
    }
  }

  // Carregamentos reativos aos filtros “discretos”
  React.useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, tag, libraryId]);

  // Debounce da pesquisa textual
  React.useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  /**
   * Marca um conteúdo como visto (UI otimista, com rollback em caso de erro).
   */
  const handleMarkSeen = async (id: number) => {
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, seen: true } : it))
    );
    try {
      await markMicroContentSeen(id);
    } catch {
      setItems((arr) =>
        arr.map((it) => (it.id === id ? { ...it, seen: false } : it))
      );
    }
  };

  // Ativar LayoutAnimation no Android
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Header colapsável
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
  const toggleHeader = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHeaderCollapsed((v) => !v);
  }, []);

  // Visuais do header (inspiração: biblioterapia)
  const headerVis = typeVisuals(theme, "BIBLIOTERAPIA");

  /** Chip “Filter” com branding do tema (PURO em termos de render) */
  const FilterChip: React.FC<{
    selected: boolean;
    onPress: () => void;
    children: React.ReactNode;
    icon?: string;
  }> = ({ selected, onPress, children, icon }) => (
    <Chip
      mode="outlined"
      selected={selected}
      onPress={onPress}
      style={{
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? SEL_BG : undefined,
        borderColor: selected ? SEL_BORDER : BORDER,
      }}
      textStyle={{
        color: selected ? SEL_FG : theme.colors.onSurface,
        fontWeight: (selected ? "700" : "400") as any,
      }}
      selectedColor={selected ? SEL_FG : theme.colors.onSurface}
      icon={icon as any}
    >
      {children}
    </Chip>
  );

  return (
    <Portal.Host>
      <Background>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "transparent" }}
          edges={["top"]}
        >
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => load()} />
            }
            contentContainerStyle={{
              padding: 16,
              gap: 16,
              paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
            }}
          >
            {/* ========================= HEADER / FILTROS ========================= */}
            <FadeIn>
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: BORDER,
                  elevation: 1,
                }}
              >
                {/* Linha do título (tap para colapsar/expandir) */}
                <Pressable
                  onPress={toggleHeader}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    headerCollapsed ? "Expandir filtros" : "Colapsar filtros"
                  }
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: headerVis.bg,
                    }}
                  >
                    <Icon
                      name="text-box-multiple-outline"
                      size={20}
                      color={headerVis.fg}
                    />
                  </View>

                  <Text
                    variant="headlineSmall"
                    style={{ fontWeight: "900", flexShrink: 1 }}
                    numberOfLines={2}
                  >
                    Conteúdos & Biblioterapia
                  </Text>

                  {/* Contador junto ao título */}
                  {total > 0 && (
                    <View
                      style={{
                        marginLeft: 8,
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
                        {total}
                      </Text>
                    </View>
                  )}

                  {/* Ações e chevron à direita */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: "auto",
                    }}
                  >
                    <IconButton
                      icon="filter-variant"
                      onPress={() => setFiltersOpen(true)}
                      onPressIn={(e) => e.stopPropagation()}
                    />
                    <IconButton
                      icon="refresh"
                      onPress={() => {
                        setPage(1);
                        load(1);
                      }}
                      onPressIn={(e) => e.stopPropagation()}
                    />
                    <Icon
                      name={headerCollapsed ? "chevron-down" : "chevron-up"}
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                      style={{ marginLeft: -6 }}
                    />
                  </View>
                </Pressable>

                {/* Subtítulo */}
                <Text style={{ opacity: 0.7, marginTop: 6 }}>
                  Dicas, biblioterapia e conteúdos associados a livros.
                </Text>

                {/* Corpo colapsável: pesquisa + chips + preview de filtros */}
                {!headerCollapsed && (
                  <>
                    {/* Pesquisa textual */}
                    <View
                      style={{
                        marginTop: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <TextInput
                        mode="outlined"
                        placeholder="Pesquisar…"
                        value={q}
                        onChangeText={setQ}
                        style={{ flex: 1 }}
                        left={<TextInput.Icon icon="magnify" />}
                      />
                    </View>

                    {/* Filtros rápidos: Tipo */}
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      <FilterChip selected={!type} onPress={() => setType("")}>
                        Todos
                      </FilterChip>
                      {TYPES.map((t) => (
                        <FilterChip
                          key={t}
                          selected={type === t}
                          onPress={() => {
                            setPage(1);
                            setType(type === t ? "" : t);
                          }}
                        >
                          {t}
                        </FilterChip>
                      ))}
                    </View>

                    {/* Preview de filtros ativos */}
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginTop: 4,
                        gap: 8,
                      }}
                    >
                      {!!tag && (
                        <Chip
                          mode="outlined"
                          icon="tag"
                          style={{
                            borderColor: SEL_BORDER,
                            backgroundColor: SEL_BG,
                          }}
                        >
                          <Text style={{ color: SEL_FG }}>{tag}</Text>
                        </Chip>
                      )}
                      {!!libraryId && (
                        <Chip
                          mode="outlined"
                          icon="library"
                          style={{
                            borderColor: SEL_BORDER,
                            backgroundColor: SEL_BG,
                          }}
                        >
                          <Text style={{ color: SEL_FG }}>
                            {allLibraries.find((l) => l.id === libraryId)
                              ?.name ?? `Biblioteca #${libraryId}`}
                          </Text>
                        </Chip>
                      )}
                    </View>
                  </>
                )}
              </View>
            </FadeIn>

            {/* ============================ LISTA ============================ */}
            <FadeIn delay={60}>
              <View
                style={{
                  backgroundColor: SURFACE,
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: BORDER,
                  elevation: 1,
                }}
              >
                {items.length === 0 ? (
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ opacity: 0.7 }}>
                      {loading
                        ? "A carregar…"
                        : "Sem resultados para estes filtros."}
                    </Text>
                  </View>
                ) : (
                  items.map((mc, idx) => {
                    const visuals = typeVisuals(
                      theme,
                      mc.type as MicroContentType
                    );
                    const { title, body } = splitContent(mc.text);
                    const isOpen = expanded.has(mc.id);

                    return (
                      <FadeIn key={mc.id} delay={90 + idx * 40}>
                        <View>
                          <Card
                            style={{
                              overflow: "hidden",
                              backgroundColor: theme.colors.surface,
                              borderLeftWidth: 4,
                              borderLeftColor: visuals.accent,
                            }}
                          >
                            <Card.Content>
                              {/* Cabeçalho colapsável */}
                              <Pressable
                                onPress={() => toggleExpanded(mc.id)}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                  marginBottom: 8,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  isOpen
                                    ? "Recolher conteúdo"
                                    : "Expandir conteúdo"
                                }
                              >
                                <View
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: visuals.bg,
                                  }}
                                >
                                  <Icon
                                    name={visuals.icon as any}
                                    size={22}
                                    color={visuals.fg}
                                  />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text
                                    variant="titleMedium"
                                    style={{ fontWeight: "800" }}
                                    numberOfLines={2}
                                  >
                                    {title || mc.type}
                                  </Text>
                                </View>

                                <Icon
                                  name="chevron-down"
                                  size={24}
                                  color={theme.colors.onSurfaceVariant}
                                  style={{
                                    transform: [
                                      { rotate: isOpen ? "180deg" : "0deg" },
                                    ],
                                  }}
                                />
                              </Pressable>

                              {/* Metadados */}
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  marginBottom: 8,
                                }}
                              >
                                <Chip
                                  compact
                                  mode="outlined"
                                  style={{ borderColor: BORDER }}
                                >
                                  {mc.type}
                                </Chip>
                                {mc.tags.map((t) => (
                                  <Chip
                                    key={t}
                                    compact
                                    mode="outlined"
                                    style={{ borderColor: BORDER }}
                                  >
                                    {t}
                                  </Chip>
                                ))}
                                {mc.library?.name ? (
                                  <Chip
                                    compact
                                    mode="outlined"
                                    icon="library"
                                    style={{ borderColor: BORDER }}
                                  >
                                    {mc.library.name}
                                  </Chip>
                                ) : null}
                                {mc.seen ? (
                                  <Chip
                                    compact
                                    mode="outlined"
                                    icon="check"
                                    style={{
                                      borderColor: BORDER,
                                      backgroundColor: "#e8f5e9",
                                    }}
                                    textStyle={{ fontWeight: "700" as any }}
                                  >
                                    Visto
                                  </Chip>
                                ) : null}
                              </View>

                              {/* Corpo (colapsável) */}
                              {!!body && (
                                <>
                                  <Text
                                    numberOfLines={isOpen ? undefined : 3}
                                    style={{ marginTop: 2, lineHeight: 20 }}
                                  >
                                    {body}
                                  </Text>

                                  {!isOpen && (
                                    <Text
                                      onPress={() => toggleExpanded(mc.id)}
                                      style={{
                                        marginTop: 6,
                                        fontWeight: "700",
                                        color: theme.colors.primary,
                                      }}
                                    >
                                      Ver mais…
                                    </Text>
                                  )}
                                </>
                              )}

                              {/* Livros (só quando aberto) */}
                              {isOpen && mc.books?.length ? (
                                <View style={{ marginTop: 10 }}>
                                  <Text
                                    variant="titleSmall"
                                    style={{
                                      marginBottom: 6,
                                      fontWeight: "700",
                                    }}
                                  >
                                    Livros relacionados
                                  </Text>
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 10 }}
                                  >
                                    {mc.books.map((b) => (
                                      <TouchableOpacity
                                        key={b.isbn}
                                        activeOpacity={0.85}
                                        style={{ width: 120 }}
                                      >
                                        {b.coverUrl ? (
                                          <Image
                                            source={{ uri: b.coverUrl }}
                                            style={{
                                              width: 120,
                                              height: 160,
                                              borderRadius: 8,
                                              borderWidth: 1,
                                              borderColor: BORDER,
                                            }}
                                            resizeMode="cover"
                                          />
                                        ) : null}
                                        <Text
                                          numberOfLines={2}
                                          style={{
                                            fontWeight: "700",
                                            marginTop: 6,
                                          }}
                                        >
                                          {b.title}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              ) : null}
                            </Card.Content>

                            {/* Ações do cartão */}
                            <Card.Actions
                              style={{
                                justifyContent: "space-between",
                                paddingTop: 4,
                              }}
                            >
                              <Button
                                mode="text"
                                onPress={() => toggleExpanded(mc.id)}
                                icon={isOpen ? "chevron-up" : "chevron-down"}
                              >
                                {isOpen ? "Ver menos" : "Ver mais"}
                              </Button>

                              <Button
                                mode="outlined"
                                onPress={() => handleMarkSeen(mc.id)}
                                disabled={!!mc.seen}
                                icon={mc.seen ? "check" : "eye-check-outline"}
                              >
                                {mc.seen ? "Marcado" : "Marcar como visto"}
                              </Button>
                            </Card.Actions>
                          </Card>

                          {idx < items.length - 1 && (
                            <Divider style={{ marginVertical: 10 }} />
                          )}
                        </View>
                      </FadeIn>
                    );
                  })
                )}

                {/* Paginação inferior */}
                {items.length > 0 && page < pages && (
                  <View style={{ alignItems: "center", marginTop: 8 }}>
                    <Button
                      mode="outlined"
                      onPress={() => setPage((p) => Math.min(p + 1, pages))}
                      icon="chevron-down"
                    >
                      Ver mais
                    </Button>
                    <Text style={{ opacity: 0.6, marginTop: 4 }}>
                      Página {page} de {pages}
                    </Text>
                  </View>
                )}
              </View>
            </FadeIn>
          </ScrollView>

          {/* ============================ MODAL FILTROS ============================ */}
          <Portal>
            <Modal
              visible={filtersOpen}
              onDismiss={() => setFiltersOpen(false)}
              contentContainerStyle={{
                backgroundColor: SURFACE,
                margin: 16,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 10 }}
              >
                Filtros
              </Text>

              {/* Tags */}
              <Text variant="labelLarge" style={{ marginBottom: 6 }}>
                Tags
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                style={{ marginBottom: 12 }}
              >
                <FilterChip selected={!tag} onPress={() => setTag("")}>
                  (todas)
                </FilterChip>
                {allTags.map((t) => (
                  <FilterChip
                    key={t}
                    selected={tag === t}
                    onPress={() => setTag(tag === t ? "" : t)}
                  >
                    {t}
                  </FilterChip>
                ))}
              </ScrollView>

              {/* Bibliotecas */}
              <Text variant="labelLarge" style={{ marginBottom: 6 }}>
                Biblioteca
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <FilterChip
                  selected={!libraryId}
                  onPress={() => setLibraryId(undefined)}
                >
                  (todas)
                </FilterChip>
                {allLibraries.map((lib) => (
                  <FilterChip
                    key={lib.id}
                    selected={libraryId === lib.id}
                    onPress={() =>
                      setLibraryId(libraryId === lib.id ? undefined : lib.id)
                    }
                  >
                    {lib.name}
                  </FilterChip>
                ))}
              </ScrollView>

              {/* Ações do modal */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 16,
                  gap: 8,
                }}
              >
                <Button
                  mode="text"
                  onPress={() => {
                    setTag("");
                    setLibraryId(undefined);
                  }}
                >
                  Limpar
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setPage(1);
                    load(1);
                    setFiltersOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </View>
            </Modal>
          </Portal>
        </SafeAreaView>
      </Background>
    </Portal.Host>
  );
}

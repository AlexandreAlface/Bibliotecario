// apps/mobile/app/(tabs)/feed.tsx
import { Background } from "@bibliotecario/ui-mobile";
import * as React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
  Divider,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABBAR_HEIGHT } from "src/constants/layout";
import {
  listMicroContentsPublic,
  markMicroContentSeen,
  type MicroContentItem,
  type MicroContentType,
} from "src/services/microcontent";

import { SafeAreaView } from "react-native-safe-area-context";

const TYPES: MicroContentType[] = ["BIBLIOTERAPIA", "DICA", "FACTO", "OUTRO"];

export default function FeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [items, setItems] = React.useState<MicroContentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(12);

  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [tag, setTag] = React.useState<string>("");
  const [libraryId, setLibraryId] = React.useState<number | undefined>();

  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [allLibraries, setAllLibraries] = React.useState<
    { id: number; name: string }[]
  >([]);

  const [loading, setLoading] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const pages = Math.max(1, Math.ceil(total / limit));

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

  // primeira carga + quando muda página/tipo/tag/library
  React.useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, tag, libraryId]);

  // debounce para q
  React.useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleMarkSeen = async (id: number) => {
    // optimista
    setItems((arr) =>
      arr.map((it) => (it.id === id ? { ...it, seen: true } : it))
    );
    try {
      await markMicroContentSeen(id);
    } catch {
      // reverte em caso de falha
      setItems((arr) =>
        arr.map((it) => (it.id === id ? { ...it, seen: false } : it))
      );
    }
  };

  const FilterChip: React.FC<{
    selected: boolean;
    onPress: () => void;
    children: React.ReactNode;
  }> = ({ selected, onPress, children }) => (
    <Chip
      mode={selected ? "flat" : "outlined"}
      selected={selected}
      onPress={onPress}
      style={{ marginRight: 8, marginBottom: 8 }}
    >
      {children}
    </Chip>
  );

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: (theme as any).colors?.outlineVariant ?? "#e6e6e6",
              elevation: 1,
            }}
          >
            <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
              Conteúdos & Biblioterapia
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>
              Dicas, biblioterapia e conteúdos associados a livros.
            </Text>

            {/* Barra de pesquisa + botão filtros */}
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
              <Button
                mode="contained-tonal"
                onPress={() => setFiltersOpen(true)}
              >
                Filtros
              </Button>
            </View>

            {/* Filtros rápidos: tipo (chips) */}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
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

            {/* Tags selecionadas / biblioteca ativa (preview) */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 4,
                gap: 8,
              }}
            >
              {!!tag && <Chip icon="tag">{tag}</Chip>}
              {!!libraryId && (
                <Chip icon="library">
                  {allLibraries.find((l) => l.id === libraryId)?.name ??
                    `Biblioteca #${libraryId}`}
                </Chip>
              )}
            </View>
          </View>

          {/* Lista */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: (theme as any).colors?.outlineVariant ?? "#e6e6e6",
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
              items.map((mc, idx) => (
                <View key={mc.id}>
                  <Card style={{ overflow: "hidden" }}>
                    <Card.Content>
                      {/* chips topo */}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Chip compact>{mc.type}</Chip>
                        {mc.tags.map((t) => (
                          <Chip key={t} compact mode="outlined">
                            {t}
                          </Chip>
                        ))}
                        {mc.library?.name ? (
                          <Chip compact mode="outlined" icon="library">
                            {mc.library.name}
                          </Chip>
                        ) : null}
                        {mc.seen ? (
                          <Chip
                            compact
                            icon="check"
                            style={{ backgroundColor: "#e8f5e9" }}
                          >
                            Visto
                          </Chip>
                        ) : null}
                      </View>

                      {/* texto */}
                      <Text>
                        {mc.text.split("\n").map((line, i, arr) => (
                          <Text key={i}>
                            {line}
                            {i < arr.length - 1 ? "\n" : ""}
                          </Text>
                        ))}
                      </Text>

                      {/* livros associados */}
                      {mc.books?.length ? (
                        <View style={{ marginTop: 8 }}>
                          <Text
                            variant="titleSmall"
                            style={{ marginBottom: 6 }}
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
                                activeOpacity={0.8}
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
                                      borderColor:
                                        (theme as any).colors?.outlineVariant ??
                                        "#e6e6e6",
                                    }}
                                    resizeMode="cover"
                                  />
                                ) : null}
                                <Text
                                  numberOfLines={2}
                                  style={{ fontWeight: "700", marginTop: 6 }}
                                >
                                  {b.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </Card.Content>

                    <Card.Actions>
                      <Button
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
              ))
            )}

            {/* Paginação simples */}
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
        </ScrollView>

        {/* Modal de Filtros (Tag + Biblioteca) */}
        <Portal>
          <Modal
            visible={filtersOpen}
            onDismiss={() => setFiltersOpen(false)}
            contentContainerStyle={{
              backgroundColor: theme.colors.background,
              margin: 16,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              variant="titleMedium"
              style={{ fontWeight: "bold", marginBottom: 10 }}
            >
              Filtros
            </Text>

            {/* TAGS */}
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

            {/* BIBLIOTECA */}
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

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 16,
                gap: 8,
              }}
            >
              <Button
                onPress={() => {
                  setTag("");
                  setLibraryId(undefined);
                }}
              >
                Limpar
              </Button>
              <Button
                mode="contained"
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
  );
}

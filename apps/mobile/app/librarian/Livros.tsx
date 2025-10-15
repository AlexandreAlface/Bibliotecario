/**
 * ============================================================
 *  Pesquisar livros (versão Bibliotecário) — Mobile
 *  Refatorado e comentado — funções pequenas (< 30 linhas)
 *  Autor do trabalho (aluno): <O TEU NOME AQUI> — Nº <O TEU NÚMERO AQUI>
 *  Nota: substitui o nome e nº acima pelos teus dados 👍
 * ============================================================
 */

import * as React from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";

import {
  searchBooksLibrarian,
  getBookDetailLibrarian,
  type BookLiteLibrarian,
  type BookDetailLibrarian,
} from "src/services/books";
import { useAuth } from "src/contexts/AuthContext";

type MdiIconName = React.ComponentProps<typeof Icon>["name"];

/* ============================================================================
 * Helpers PUROS (determinísticos, ≤ 30 linhas)
 * ========================================================================== */

/** Capa válida (fallback para placeholder local) */
function coverOrFallback(url?: string | null) {
  return url && url.trim()
    ? { uri: url }
    : require("../../assets/placeholder-book.png");
}

/** '' | string numérica → number | undefined (para payloads de pesquisa) */
function numOrUndef(v: string): number | undefined {
  return v.trim() ? Number(v) : undefined;
}

/** Constrói texto “X resultados” (pequeno utilitário) */
function resultsText(loading: boolean, total: number) {
  return loading ? "A procurar…" : `${total} resultado${total === 1 ? "" : "s"}`;
}

/** Debounce simples de um valor genérico. */
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ============================================================================
 * Sub-componentes pequenos (≤ 30 linhas)
 * ========================================================================== */

/** “Pílula” de seleção genérica (chips grandes clicáveis) */
function Pill({
  label,
  active,
  onPress,
}: { label: string; active: boolean; onPress: () => void }) {
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
        borderWidth: active ? 0 : StyleSheet.hairlineWidth,
        borderColor: theme.colors.outlineVariant,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon
        name={active ? "check-circle-outline" : "checkbox-blank-circle-outline"}
        size={14}
        color={
          active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer
        }
      />
      <Text
        style={{
          color: active
            ? theme.colors.onPrimary
            : theme.colors.onSecondaryContainer,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Card compacto de livro (sem ações de reserva aqui) */
function BookCard({
  item,
  onOpen,
}: {
  item: BookLiteLibrarian;
  onOpen: (isbn: string) => void;
}) {
  const theme = useTheme();
  return (
    <Card style={{ width: "48%", marginBottom: 12, overflow: "hidden" }}>
      <Card.Cover source={coverOrFallback(item.coverUrl)} style={{ height: 200 }} />
      <View style={{ padding: 10 }}>
        <Text variant="titleSmall" numberOfLines={2} style={{ fontWeight: "800" }}>
          {item.title}
        </Text>
        {!!item.summary && (
          <Text
            variant="bodySmall"
            numberOfLines={3}
            style={{ opacity: 0.8, marginTop: 4 }}
          >
            {item.summary}
          </Text>
        )}
        <Button
          mode="text"
          icon="information-outline"
          onPress={() => onOpen(item.isbn)}
          style={{ marginTop: 4, alignSelf: "flex-start" }}
          textColor={theme.colors.primary}
        >
          Ver mais
        </Button>
      </View>
    </Card>
  );
}

/** Linha simples de “label: valor” */
function Line({
  icon,
  label,
  value,
}: {
  icon: MdiIconName;   
  label: string;
  value?: string | number | null;
}) {
  if (!value && value !== 0) return null;
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon name={icon} size={16} color={theme.colors.onSurfaceVariant} />
      <Text style={{ opacity: 0.85 }}>
        <Text style={{ fontWeight: "700" }}>{label}: </Text>
        {String(value)}
      </Text>
    </View>
  );
}

/* ============================================================================
 * Detalhe (modal) — fetch isolado e render em blocos
 * ========================================================================== */

function BookDetailsModal({
  openIsbn,
  onClose,
}: {
  openIsbn: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<BookDetailLibrarian | null>(null);

  React.useEffect(() => {
    if (!openIsbn) return;
    (async () => {
      setLoading(true);
      try {
        const d = await getBookDetailLibrarian(openIsbn);
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [openIsbn]);

  return (
    <Portal>
      <Modal
        visible={!!openIsbn}
        onDismiss={onClose}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: 16,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {!data ? (
          <ActivityIndicator />
        ) : (
          <View style={{ gap: 10 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="book-open-page-variant" size={20} color={theme.colors.onSurface} />
              <Text variant="titleMedium" style={{ fontWeight: "900", flex: 1 }}>
                {data.title}
              </Text>
              <IconButton icon="close" onPress={onClose} accessibilityLabel="Fechar" />
            </View>

            {/* Capa + meta */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Card.Cover
                source={coverOrFallback(data.coverUrl)}
                style={{ width: 140, height: 200, borderRadius: 8 }}
              />
              <View style={{ gap: 6, flex: 1 }}>
                {!!(data.authors?.length) && (
                  <Line
                    icon="account-outline"
                    label="Autor(es)"
                    value={data.authors!.join(", ")}
                  />
                )}
                {!!(data.categories?.length) && (
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon
                        name="shape-outline"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text style={{ fontWeight: "700" }}>Categorias</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {data.categories!.slice(0, 10).map((c, i) => (
                        <Chip key={i} compact>
                          {c}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}
                <Line icon="calendar-outline" label="Ano" value={data.publicationYear ?? undefined} />
                <Line icon="account-child-outline" label="Faixa etária" value={data.ageRange ?? undefined} />
              </View>
            </View>

            {/* Resumo */}
            <View>
              <Text variant="titleSmall" style={{ fontWeight: "800", marginTop: 6 }}>
                Resumo
              </Text>
              <Text style={{ opacity: 0.9 }}>
                {data.summary || "Sem resumo disponível."}
              </Text>
            </View>

            {/* Holdings
            <View>
              <Text variant="titleSmall" style={{ fontWeight: "800", marginBottom: 6 }}>
                Exemplares por biblioteca
              </Text>
              {!data.holdings?.length ? (
                <Text style={{ opacity: 0.7 }}>Sem registos.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {data.holdings!.map((h, i) => (
                    <View
                      key={i}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <Text style={{ fontWeight: "800" }}>{h.libraryName}</Text>
                      <Text style={{ opacity: 0.85 }}>
                        Quantidade: {h.quantity ?? "—"} • Prateleira: {h.shelfCode ?? "—"} • Registo:{" "}
                        {h.accessionNo ?? "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View> */}

            {/* Fechar */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <Button onPress={onClose}>Fechar</Button>
            </View>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

/* ============================================================================
 * Página principal
 * ========================================================================== */

export default function LibrarianBooksSearchMobile() {
  const theme = useTheme();
  const { user } = useAuth();

  // Bibliotecas do bibliotecário (se vierem no user)
  const myLibraries =
    (user as any)?.userLibraries?.map?.((ul: any) => ({
      id: Number(ul.libraryId ?? ul.library?.id),
      name: ul.library?.name ?? `Biblioteca ${ul.libraryId}`,
    })) ?? [];
  const defaultLibraryId = React.useMemo(() => {
    if (!myLibraries.length) return undefined;
    return myLibraries.length === 1 ? myLibraries[0].id : undefined;
  }, [myLibraries]);

  /* ---------------- Filtros controlados ---------------- */
  const [q, setQ] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [yearFrom, setYearFrom] = React.useState("");
  const [yearTo, setYearTo] = React.useState("");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");

  // Debounced values (evita spam de requisições)
  const dq = useDebouncedValue(q, 400);
  const dauthor = useDebouncedValue(author, 400);
  const dcategory = useDebouncedValue(category, 400);
  const dyFrom = useDebouncedValue(yearFrom, 400);
  const dyTo = useDebouncedValue(yearTo, 400);
  const dAgeMin = useDebouncedValue(ageMin, 400);
  const dAgeMax = useDebouncedValue(ageMax, 400);

  /* ---------------- Paginação e estado remoto ---------------- */
  const [perPage, setPerPage] = React.useState(12);
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [items, setItems] = React.useState<BookLiteLibrarian[]>([]);
  const [total, setTotal] = React.useState(0);

  const [openIsbn, setOpenIsbn] = React.useState<string | null>(null);
  const [snack, setSnack] = React.useState<string | null>(null);

  /** Fetch da página indicada (append controla se faz merge/replace). */
  const doSearch = React.useCallback(
    async (targetPage = 1, append = false) => {
      const params = {
        q: dq || undefined,
        author: dauthor || undefined,
        category: dcategory || undefined,
        yearFrom: numOrUndef(dyFrom),
        yearTo: numOrUndef(dyTo),
        ageMin: numOrUndef(dAgeMin),
        ageMax: numOrUndef(dAgeMax),
        libraryId: defaultLibraryId,
        page: targetPage,
        perPage,
      };

      if (!append) setLoading(true);
      try {
        const res = await searchBooksLibrarian(params);
        setTotal(Number(res.total || 0));
        setPage(res.page || targetPage);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      } catch (e: any) {
        setSnack(typeof e?.message === "string" ? e.message : "Falha na pesquisa");
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!append) setLoading(false);
      }
    },
    [
      dq,
      dauthor,
      dcategory,
      dyFrom,
      dyTo,
      dAgeMin,
      dAgeMax,
      defaultLibraryId,
      perPage,
    ]
  );

  // 1) Primeira carga / quando muda a biblioteca default
  React.useEffect(() => {
    doSearch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLibraryId, perPage]);

  // 2) Debounce de filtros — volta sempre à página 1
  React.useEffect(() => {
    const t = setTimeout(() => doSearch(1, false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, dauthor, dcategory, dyFrom, dyTo, dAgeMin, dAgeMax]);

  const hasMore = items.length < total;

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await doSearch(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }

  /* -------------------------------- Render -------------------------------- */

  return (
    <Background>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => doSearch(page, false)} />
          }
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
        >
          {/* ---------- Cabeçalho ---------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
                  name="library-shelves"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "900" }}>
                Pesquisar livros
              </Text>
              <View style={{ flex: 1 }} />
              <IconButton
                icon="refresh"
                onPress={() => doSearch(1, false)}
                disabled={loading}
                accessibilityLabel="Atualizar resultados"
              />
            </View>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>
              {resultsText(loading, total)}
            </Text>
          </FlexibleCard>

          {/* ---------- Filtros ---------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="filter-variant" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={{ fontWeight: "800" }}>Filtros</Text>
              <View style={{ flex: 1 }} />
              <Chip compact icon="information-outline">
                {myLibraries.length === 1
                  ? `Biblioteca: ${myLibraries[0].name}`
                  : "Pesquisa global"}
              </Chip>
            </View>

            {/* Linha 1: pesquisa + autor */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                mode="outlined"
                placeholder="título, autor, resumo…"
                value={q}
                onChangeText={setQ}
                left={<TextInput.Icon icon="magnify" />}
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
                autoCapitalize="none"
              />
              <TextInput
                mode="outlined"
                placeholder="Autor"
                value={author}
                onChangeText={setAuthor}
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
                autoCapitalize="none"
              />
            </View>

            {/* Linha 2: categoria */}
            {/* <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                mode="outlined"
                placeholder="Categoria"
                value={category}
                onChangeText={setCategory}
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
                autoCapitalize="none"
              />
            </View> */}

            {/* Linha 3: ano de/até + idade min/máx */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                mode="outlined"
                label="Ano de"
                value={yearFrom}
                onChangeText={setYearFrom}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
              />
              <TextInput
                mode="outlined"
                label="Ano até"
                value={yearTo}
                onChangeText={setYearTo}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
              />
              <TextInput
                mode="outlined"
                label="Idade min"
                value={ageMin}
                onChangeText={setAgeMin}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
              />
              <TextInput
                mode="outlined"
                label="Idade máx"
                value={ageMax}
                onChangeText={setAgeMax}
                keyboardType="number-pad"
                style={{ flex: 1, backgroundColor: theme.colors.surface }}
              />
            </View>

            {/* Por página */}
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="page-layout-header" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={{ opacity: 0.8 }}>Por página</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[8, 12, 16, 20, 24].map((n) => (
                  <Pill
                    key={n}
                    label={`${n}`}
                    active={perPage === n}
                    onPress={() => {
                      setPerPage(n);
                      setPage(1);
                    }}
                  />
                ))}
              </View>
            </View>
          </FlexibleCard>

          {/* ---------- Resultados ---------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {loading && <ActivityIndicator />}

            {!loading && items.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <Icon
                  name="book-off-outline"
                  size={32}
                  color={theme.colors.onSurfaceDisabled}
                />
                <Text style={{ opacity: 0.7, marginTop: 6 }}>Sem resultados.</Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  {items.map((it) => (
                    <BookCard key={it.isbn} item={it} onOpen={(isbn) => setOpenIsbn(isbn)} />
                  ))}
                </View>

                {/* Paginação incremental */}
                {hasMore && (
                  <View style={{ alignItems: "center", marginTop: 8 }}>
                    <Button
                      mode="outlined"
                      onPress={loadMore}
                      disabled={loadingMore}
                      icon={loadingMore ? undefined : "chevron-down"}
                    >
                      {loadingMore ? <ActivityIndicator animating size="small" /> : "Carregar mais"}
                    </Button>
                  </View>
                )}
              </>
            )}
          </FlexibleCard>
        </ScrollView>

        {/* Detalhe */}
        <BookDetailsModal openIsbn={openIsbn} onClose={() => setOpenIsbn(null)} />

        {/* Snackbar */}
        <Portal>
          <Snackbar
            visible={!!snack}
            onDismiss={() => setSnack(null)}
            duration={2500}
            action={{ label: "Fechar", onPress: () => setSnack(null) }}
          >
            {snack}
          </Snackbar>
        </Portal>
      </SafeAreaView>
    </Background>
  );
}

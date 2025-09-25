import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import {
  Button,
  Card,
  Chip,
  Portal,
  Snackbar,
  Text,
  useTheme,
  IconButton,
  ActivityIndicator,
  List,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { Background, LinkText } from "@bibliotecario/ui-mobile";
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import { useAuth } from "src/contexts/AuthContext";
import {
  getSugestoesPerfil,
  getSugestoesQuiz,
  type QuizAnswer,
} from "src/services/recommendations";
import { reserveBook } from "src/services/reservations";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TABBAR_HEIGHT } from "src/constants/layout";

/* ---------- Tipos ---------- */
type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null; // <- NEW: mostrar resumo quando existir
  score?: number;
  why?: string[];
  status?: "none" | "reserved" | "reading" | "finished";
};

type Filters = {
  ageRange?: string;
  genres: string[];
  format: string[];
  goals: string[];
  moment?: string;
};

/* ---------- Constantes ---------- */
const LS_KEY = "mobile.categoryFilters";
const AGE_OPTS = ["0-2", "3-5", "6-8", "9-12", "12-15"];
const GENRE_OPTS = [
  "Aventura",
  "Fantasia",
  "Mistério",
  "Humor",
  "Ciência",
  "Animais",
  "Clássicos",
];
const FORMAT_OPTS = [
  { k: "ilustrado", label: "Ilustrações" },
  { k: "curto", label: "Texto equilibrado" },
  { k: "imagens", label: "Imagens" },
  { k: "serie", label: "Série/Coleção" },
];
const GOAL_OPTS = ["divertir", "aprender", "emocionar", "explorar"];
const MOMENT_OPTS = [
  { k: "antes-de-dormir", label: "Antes de dormir" },
  { k: "pequeno-almoco", label: "Pequeno-almoço" },
  { k: "viagens", label: "Viagens" },
  { k: "lazer-familiar", label: "Lazer familiar" },
];

/* ---------- Helpers ---------- */
function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
function momentToMood(m?: string) {
  if (!m) return undefined;
  return m === "antes-de-dormir" ? "antes-de-dormir" : "tempo-livre";
}
function normalizeBooks(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}
function dedupeByIsbn(list: BookLite[]) {
  const seen = new Set<string>();
  const out: BookLite[] = [];
  for (const it of list) {
    if (!it?.isbn || seen.has(it.isbn)) continue;
    seen.add(it.isbn);
    out.push(it);
  }
  return out;
}

/* Pequeno “cartão branco” reutilizável */
function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: (theme as any).colors?.outlineVariant ?? "#e6e6e6",
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------- Componente ---------- */
export default function SugestoesCategoriasTab() {
  const { user } = useAuth();
  const pathname = usePathname();
  const onQuiz =
    pathname?.includes("/sugestoes") && !pathname.includes("categorias");
  const onCategorias = pathname?.includes("sugestoes-categorias");

  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const childId =
    actingChildId ?? (selectedChildId ? Number(selectedChildId) : undefined);

  const [filters, setFilters] = useState<Filters>({
    ageRange: undefined,
    genres: [],
    format: [],
    goals: [],
    moment: undefined,
  });

  // estado dos filtros colapsáveis
  const [open, setOpen] = useState({
    age: true,
    genres: true,
    format: false,
    goals: false,
    moment: false,
  });
  const toggleOpen = (k: keyof typeof open) =>
    setOpen((s) => ({ ...s, [k]: !s[k] }));

  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // paginação (sem mexer no backend: pedimos limit cumulativo)
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  const [statusByIsbn, setStatusByIsbn] = useState<
    Record<string, "reserved" | "reading">
  >({});

  const disableActions = !childId;
  const subtitle = useMemo(
    () => "Escolhe categorias para afinar as sugestões",
    []
  );
  const insets = useSafeAreaInsets();

  // carregar filtros guardados
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LS_KEY);
        if (raw) setFilters((f) => ({ ...f, ...JSON.parse(raw) }));
      } catch {}
    })();
  }, []);

  // grelha inicial via perfil
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoading(true);
      try {
        setPage(1);
        const raw = await getSugestoesPerfil(perPage, { childId });
        const list = dedupeByIsbn(normalizeBooks(raw));
        setItems(list);
        setHasMore(list.length >= perPage);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  function answersFromFilters(): QuizAnswer[] {
    return [
      { id: "ageRange", value: filters.ageRange },
      { id: "genres", value: filters.genres },
      { id: "format", value: filters.format },
      { id: "mood", value: momentToMood(filters.moment) },
      { id: "goals", value: filters.goals },
    ];
  }

  async function applyFilters() {
    if (!childId) return;
    await AsyncStorage.setItem(LS_KEY, JSON.stringify(filters));

    setLoading(true);
    setPage(1);
    try {
      const answers = answersFromFilters();
      const raw = await getSugestoesQuiz(answers, perPage, { childId });
      const list = dedupeByIsbn(normalizeBooks(raw));
      setItems(list);
      setHasMore(list.length >= perPage);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!childId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      const answers = answersFromFilters();
      const limit = perPage * next;
      const raw = await getSugestoesQuiz(answers, limit, { childId });
      const list = dedupeByIsbn(normalizeBooks(raw));
      setItems(list);
      setHasMore(list.length >= limit);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }

  async function onReserve(isbn: string) {
    try {
      if (!childId) {
        setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
        return;
      }
      setBusyByIsbn((m) => ({ ...m, [isbn]: true }));
      await reserveBook(childId, isbn);
      setStatusByIsbn((m) => ({ ...m, [isbn]: "reserved" }));
      setSnack({
        msg: "Reserva criada! Vai a Leituras › Reservado.",
        type: "success",
      });
    } catch (e: any) {
      const code = e?.response?.data?.error;
      if (code === "already_reading") {
        setStatusByIsbn((m) => ({ ...m, [isbn]: "reading" }));
        setSnack({ msg: "Já estás a ler este livro.", type: "error" });
      } else if (code === "already_reserved") {
        setStatusByIsbn((m) => ({ ...m, [isbn]: "reserved" }));
        setSnack({
          msg: "Este livro já está reservado para esta criança.",
          type: "error",
        });
      } else if (typeof e?.message === "string" && e.message) {
        setSnack({ msg: e.message, type: "error" });
      } else {
        setSnack({ msg: "Falha ao reservar.", type: "error" });
      }
      console.error(e);
    } finally {
      setBusyByIsbn((m) => ({ ...m, [isbn]: false }));
    }
  }

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={applyFilters}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* CARD 1 — Header compacto (2 linhas) + tabs + seletor */}
          <SectionCard>
            <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
              Sugestões de Leitura
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4,
              }}
            >
              <Text
                style={{ opacity: 0.7, flex: 1, marginRight: 8 }}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <IconButton
                  icon="refresh"
                  disabled={loading || disableActions}
                  onPress={applyFilters}
                />
                <Button
                  mode="contained"
                  onPress={applyFilters}
                  disabled={loading || disableActions}
                >
                  Ver resultados
                </Button>
              </View>
            </View>

            {/* Links sublinhados Quiz/Categorias */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                columnGap: 8,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <LinkText
                underline
                size="sm"
                onPress={() => router.push("/family/sugestoes")}
                style={onQuiz ? { fontWeight: "700" } : { opacity: 0.85 }}
              >
                Quiz
              </LinkText>
              <Text>·</Text>
              <LinkText
                underline
                size="sm"
                onPress={() => router.push("/family/sugestoes-categorias")}
                style={onCategorias ? { fontWeight: "700" } : { opacity: 0.85 }}
              >
                Categorias
              </LinkText>
            </View>

            {/* Seletor de criança (obrigatório se não há actingChild) */}
            {!actingChildId && (
              <View style={{ rowGap: 10, marginBottom: 8 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                  Escolhe a criança
                </Text>
                <SelectChild
                  label="Selecionar criança"
                  placeholder="Escolhe um perfil"
                  options={(user?.children ?? []).map((c: any) => ({
                    id: String(c.id),
                    name: c.name,
                    avatarUri: c.avatarUrl || undefined,
                  }))}
                  value={selectedChildId}
                  onChange={(id?: string) => setSelectedChildId(id)}
                  clearable
                  disabled={!user?.children?.length}
                  menuMaxHeight={360}
                />
                {!childId && (
                  <Text style={{ opacity: 0.7 }}>
                    Seleciona uma criança para veres sugestões e poderes
                    reservar.
                  </Text>
                )}
              </View>
            )}
          </SectionCard>

          {/* CARD 2 — Filtros (colapsáveis por grupo) */}
          <SectionCard>
            <View style={{ rowGap: 4 }}>
              {/* Ações gerais colapsáveis */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                <Button
                  onPress={() =>
                    setOpen({ age: true, genres: true, format: true, goals: true, moment: true })
                  }
                >
                  Expandir tudo
                </Button>
                <Button
                  onPress={() =>
                    setOpen({ age: false, genres: false, format: false, goals: false, moment: false })
                  }
                >
                  Fechar tudo
                </Button>
              </View>

              <List.Section style={{ margin: 0, padding: 0 }}>
                {/* Faixa Etária */}
                <List.Accordion
                  title="Faixa Etária"
                  expanded={open.age}
                  onPress={() => toggleOpen("age")}
                  left={(props) => <List.Icon {...props} icon="baby-face-outline" />}
                  style={{ backgroundColor: "transparent" }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 6 }}>
                    {AGE_OPTS.map((a) => (
                      <Chip
                        key={a}
                        style={{ marginRight: 8, marginBottom: 8 }}
                        selected={filters.ageRange === a}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            ageRange: f.ageRange === a ? undefined : a,
                          }))
                        }
                      >
                        {a}
                      </Chip>
                    ))}
                  </View>
                </List.Accordion>

                {/* Géneros */}
                <List.Accordion
                  title="Géneros"
                  expanded={open.genres}
                  onPress={() => toggleOpen("genres")}
                  left={(props) => <List.Icon {...props} icon="book-open-variant" />}
                  style={{ backgroundColor: "transparent" }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 6 }}>
                    {GENRE_OPTS.map((g) => (
                      <Chip
                        key={g}
                        style={{ marginRight: 8, marginBottom: 8 }}
                        selected={filters.genres.includes(g)}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            genres: toggle(f.genres, g),
                          }))
                        }
                      >
                        {g}
                      </Chip>
                    ))}
                  </View>
                </List.Accordion>

                {/* Formato */}
                <List.Accordion
                  title="Formato"
                  expanded={open.format}
                  onPress={() => toggleOpen("format")}
                  left={(props) => <List.Icon {...props} icon="image-multiple-outline" />}
                  style={{ backgroundColor: "transparent" }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 6 }}>
                    {FORMAT_OPTS.map(({ k, label }) => (
                      <Chip
                        key={k}
                        style={{ marginRight: 8, marginBottom: 8 }}
                        selected={filters.format.includes(k)}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            format: toggle(f.format, k),
                          }))
                        }
                      >
                        {label}
                      </Chip>
                    ))}
                  </View>
                </List.Accordion>

                {/* Objetivos */}
                <List.Accordion
                  title="Objetivos"
                  expanded={open.goals}
                  onPress={() => toggleOpen("goals")}
                  left={(props) => <List.Icon {...props} icon="target" />}
                  style={{ backgroundColor: "transparent" }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 6 }}>
                    {GOAL_OPTS.map((o) => (
                      <Chip
                        key={o}
                        style={{ marginRight: 8, marginBottom: 8 }}
                        selected={filters.goals.includes(o)}
                        onPress={() =>
                          setFilters((f) => ({ ...f, goals: toggle(f.goals, o) }))
                        }
                      >
                        {o[0].toUpperCase() + o.slice(1)}
                      </Chip>
                    ))}
                  </View>
                </List.Accordion>

                {/* Momento de leitura */}
                <List.Accordion
                  title="Momento de leitura"
                  expanded={open.moment}
                  onPress={() => toggleOpen("moment")}
                  left={(props) => <List.Icon {...props} icon="clock-outline" />}
                  style={{ backgroundColor: "transparent" }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 6 }}>
                    {MOMENT_OPTS.map(({ k, label }) => (
                      <Chip
                        key={k}
                        style={{ marginRight: 8, marginBottom: 8 }}
                        selected={filters.moment === k}
                        onPress={() =>
                          setFilters((f) => ({
                            ...f,
                            moment: f.moment === k ? undefined : k,
                          }))
                        }
                      >
                        {label}
                      </Chip>
                    ))}
                  </View>
                </List.Accordion>
              </List.Section>

              {/* Ações dos filtros */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <Button
                  onPress={async () => {
                    const reset: Filters = {
                      ageRange: undefined,
                      genres: [],
                      format: [],
                      goals: [],
                      moment: undefined,
                    };
                    setFilters(reset);
                    await AsyncStorage.setItem(LS_KEY, JSON.stringify(reset));
                  }}
                >
                  Limpar filtros
                </Button>
                <Button
                  mode="contained"
                  onPress={applyFilters}
                  disabled={loading || disableActions}
                >
                  Ver resultados
                </Button>
              </View>
            </View>
          </SectionCard>

          {/* CARD 3 — Resultados (com resumo + paginação “Carregar mais”) */}
          <SectionCard>
            {items.length === 0 ? (
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ opacity: 0.7 }}>
                  {childId
                    ? "Sem resultados. Ajusta os filtros e tenta novamente."
                    : "Seleciona uma criança para começar."}
                </Text>
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
                  {items.map((item) => {
                    const btnBusy = !!busyByIsbn[item.isbn];
                    const serverStatus = (item as any).status as
                      | "reserved"
                      | "reading"
                      | "finished"
                      | "none"
                      | undefined;
                    const localOverride = statusByIsbn[item.isbn];
                    const effectiveStatus = (localOverride || serverStatus) as
                      | "reserved"
                      | "reading"
                      | "finished"
                      | "none"
                      | undefined;

                    const disabled =
                      !childId ||
                      btnBusy ||
                      effectiveStatus === "reserved" ||
                      effectiveStatus === "reading";
                    const label =
                      effectiveStatus === "reserved"
                        ? "Reservado"
                        : effectiveStatus === "reading"
                        ? "A ler"
                        : effectiveStatus === "finished"
                        ? "Reservar de novo"
                        : "Reservar";

                    return (
                      <Card key={item.isbn} style={{ width: "48%", marginBottom: 12 }}>
                        <Card.Cover
                          source={
                            item.coverUrl
                              ? { uri: item.coverUrl }
                              : require("../../assets/placeholder-book.png")
                          }
                          resizeMode="cover"
                          style={{ height: 200 }}
                        />
                        <Card.Content>
                          <Text
                            variant="titleSmall"
                            numberOfLines={2}
                            style={{ marginTop: 8 }}
                          >
                            {item.title}
                          </Text>

                          {/* resumo/descrição quando existir */}
                          {item.summary ? (
                            <Text
                              variant="bodySmall"
                              numberOfLines={3}
                              style={{ opacity: 0.85, marginTop: 4 }}
                            >
                              {item.summary}
                            </Text>
                          ) : null}

                          {typeof item.score === "number" ? (
                            <Text variant="labelSmall" style={{ opacity: 0.6, marginTop: 4 }}>
                              score {item.score.toFixed(3)}
                            </Text>
                          ) : null}

                          {serverStatus === "finished" && (
                            <Chip compact style={{ marginTop: 6 }} icon="check">
                              Já lido
                            </Chip>
                          )}
                        </Card.Content>
                        <Card.Actions>
                          <Button
                            onPress={() => onReserve(item.isbn)}
                            disabled={disabled}
                            loading={btnBusy}
                          >
                            {label}
                          </Button>
                        </Card.Actions>
                      </Card>
                    );
                  })}
                </View>

                {/* Paginação */}
                {hasMore ? (
                  <View style={{ alignItems: "center", marginTop: 8 }}>
                    <Button
                      mode="outlined"
                      onPress={loadMore}
                      disabled={loadingMore}
                      icon={loadingMore ? undefined : "chevron-down"}
                    >
                      {loadingMore ? (
                        <ActivityIndicator animating size="small" />
                      ) : (
                        "Carregar mais"
                      )}
                    </Button>
                  </View>
                ) : null}
              </>
            )}

            <Portal>
              <Snackbar
                visible={!!snack}
                onDismiss={() => setSnack(null)}
                duration={2500}
                action={{ label: "Fechar", onPress: () => setSnack(null) }}
                style={
                  snack?.type === "success"
                    ? { backgroundColor: "#2e7d32" }
                    : snack?.type === "error"
                    ? { backgroundColor: "#c62828" }
                    : undefined
                }
              >
                {snack?.msg}
              </Snackbar>
            </Portal>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

/**
 * ============================================================================
 * Ficheiro: src/app/family/SugestoesCategoriasTab.tsx
 * Ecrã: Sugestões por Categorias (família)
 * Autor: Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 * Melhorias aplicadas (como combinado):
 * • Comentários detalhados (PT-PT) em todo o código.
 * • Helpers “PUROS” (determinísticos) extraídos e documentados (≤ 30 linhas).
 * • Funções curtas e legíveis; sem alterar comportamentos existentes.
 * • UI polida: animações, acessibilidade e consistência de tema.
 * ============================================================================
 */

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  Easing,
} from "react-native";
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
  Modal,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TABBAR_HEIGHT } from "src/constants/layout";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

/* ============================================================================
 * Tipos de dados
 * ========================================================================== */

type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
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

/* ============================================================================
 * Constantes
 * ========================================================================== */

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

/* ============================================================================
 * Helpers PUROS (determinísticos) — ≤ 30 linhas
 * ========================================================================== */

/** Alterna a presença de um valor numa lista (imutável). */
function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Converte um “momento” selecionado para o equivalente “mood” do quiz. */
function momentToMood(m?: string): string | undefined {
  if (!m) return undefined;
  return m === "antes-de-dormir" ? "antes-de-dormir" : "tempo-livre";
}

/** Aceita várias formas de payload e devolve um array normalizado de livros. */
function normalizeBooks(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload as BookLite[];
  if (Array.isArray(payload?.data)) return payload.data as BookLite[];
  if (Array.isArray(payload?.items)) return payload.items as BookLite[];
  return [];
}

/** Remove duplicados por ISBN preservando a 1.ª ocorrência. */
function dedupeByIsbn(list: BookLite[]): BookLite[] {
  const seen = new Set<string>();
  const out: BookLite[] = [];
  for (const it of list) {
    if (!it?.isbn || seen.has(it.isbn)) continue;
    seen.add(it.isbn);
    out.push(it);
  }
  return out;
}

/** Mapeia chaves → ícones para chips (tema-agnóstico). */
const chipIconFor: Record<string, string> = {
  // géneros
  Aventura: "map-marker-path",
  Fantasia: "magic-staff",
  Mistério: "magnify",
  Humor: "emoticon-happy-outline",
  Ciência: "flask-outline",
  Animais: "paw",
  Clássicos: "book-outline",
  // formato
  ilustrado: "image-multiple-outline",
  curto: "flash-outline",
  imagens: "image-outline",
  serie: "bookmark-multiple-outline",
  // objetivos
  divertir: "emoticon-outline",
  aprender: "school-outline",
  emocionar: "heart-outline",
  explorar: "compass-outline",
  // idades
  "0-2": "baby-face-outline",
  "3-5": "numeric-3-circle-outline",
  "6-8": "numeric-6-circle-outline",
  "9-12": "numeric-9-circle-outline",
  "12-15": "numeric-1-circle-outline",
  // momentos
  "antes-de-dormir": "sleep",
  "pequeno-almoco": "coffee-outline",
  viagens: "airplane",
  "lazer-familiar": "home-heart",
};

/* ============================================================================
 * Micro-componentes / UI utilitária
 * ========================================================================== */

/** Animação de entrada (fade + slide) simples e reutilizável. */
function FadeIn({
  children,
  delay = 0,
  translateY = 10,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  translateY?: number;
  style?: any;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [translateY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Cartão de secção “branco” com moldura suave e sombra leve. */
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

/* ============================================================================
 * Ecrã principal
 * ========================================================================== */

export default function SugestoesCategoriasTab() {
  const { user } = useAuth();
  const theme = useTheme();
  const pathname = usePathname();
  const onQuiz = pathname?.includes("/sugestoes") && !pathname.includes("categorias");
  const onCategorias = pathname?.includes("sugestoes-categorias");
  const insets = useSafeAreaInsets();

  // Android: habilita LayoutAnimation (para colapsáveis fluidos).
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Contexto de criança ativa (modo criança tem prioridade).
  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const childId = actingChildId ?? (selectedChildId ? Number(selectedChildId) : undefined);

  // Estado dos filtros (e colapsáveis).
  const [filters, setFilters] = useState<Filters>({
    ageRange: undefined,
    genres: [],
    format: [],
    goals: [],
    moment: undefined,
  });
  const [open, setOpen] = useState({
    age: true,
    genres: true,
    format: false,
    goals: false,
    moment: false,
  });
  const toggleOpen = (k: keyof typeof open) =>
    setOpen((s) => ({ ...s, [k]: !s[k] }));

  // Dados/paginação.
  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reserva (UI).
  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  const [statusByIsbn, setStatusByIsbn] = useState<Record<string, "reserved" | "reading">>({});

  // Modal de detalhe.
  const [detailItem, setDetailItem] = useState<BookLite | null>(null);

  const disableActions = !childId;
  const subtitle = useMemo(
    () => "Escolhe categorias para afinar as sugestões",
    []
  );

  /* -------------------- Inicialização / Persistência -------------------- */

  // Recupera filtros guardados localmente (AsyncStorage).
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LS_KEY);
        if (raw) setFilters((f) => ({ ...f, ...JSON.parse(raw) }));
      } catch {
        // silencioso — filtros default continuam válidos
      }
    })();
  }, []);

  // Carrega grelha inicial com base no perfil (sem filtros manuais).
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

  /* --------------------------- Construção do quiz --------------------------- */

  /** Converte o estado de filtros nas respostas esperadas pelo endpoint do quiz. */
  function answersFromFilters(): QuizAnswer[] {
    return [
      { id: "ageRange", value: filters.ageRange },
      { id: "genres", value: filters.genres },
      { id: "format", value: filters.format },
      { id: "mood", value: momentToMood(filters.moment) },
      { id: "goals", value: filters.goals },
    ];
  }

  /* ------------------------- Ações de consulta/paging ------------------------ */

  /** Aplica filtros (guarda no LS) e atualiza os resultados. */
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

  /** Página seguinte (cumulativa no limite para simplificar o merge). */
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ------------------------------ Ação: reservar ----------------------------- */

  /** Tenta reservar um livro para a criança selecionada (feedback robusto). */
  async function onReserve(isbn: string) {
    try {
      if (!childId) {
        setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
        return;
      }
      setBusyByIsbn((m) => ({ ...m, [isbn]: true }));
      await reserveBook(childId, isbn);
      setStatusByIsbn((m) => ({ ...m, [isbn]: "reserved" }));
      setSnack({ msg: "Reserva criada! Vai a Leituras › Reservado.", type: "success" });
    } catch (e: any) {
      const code = e?.response?.data?.error;
      if (code === "already_reading") {
        setStatusByIsbn((m) => ({ ...m, [isbn]: "reading" }));
        setSnack({ msg: "Já estás a ler este livro.", type: "error" });
      } else if (code === "already_reserved") {
        setStatusByIsbn((m) => ({ ...m, [isbn]: "reserved" }));
        setSnack({ msg: "Este livro já está reservado para esta criança.", type: "error" });
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

  /* ------------------------------- Render UI -------------------------------- */

  const headerIcon = (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primaryContainer,
        marginRight: 10,
      }}
    >
      <Icon name="lightbulb-on-outline" size={20} color={theme.colors.onPrimaryContainer} />
    </View>
  );

  return (
    <Background>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={applyFilters}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* -------------------- CARD 1 — Header + tabs + seletor -------------------- */}
          <FadeIn>
            <SectionCard>
              {/* Cabeçalho com ícone + título + refresh */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                {headerIcon}
                <Text variant="headlineSmall" style={{ fontWeight: "900", flex: 1 }}>
                  Sugestões de Leitura
                </Text>
                <IconButton
                  icon="refresh"
                  disabled={loading || !childId}
                  onPress={applyFilters}
                  accessibilityLabel="Atualizar sugestões"
                />
              </View>

              {/* Subtítulo + CTA rápido */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text style={{ opacity: 0.7, flex: 1, marginRight: 8 }} numberOfLines={2}>
                  {subtitle}
                </Text>
                <Button
                  mode="contained-tonal"
                  icon="magnify"
                  onPress={applyFilters}
                  disabled={loading || !childId}
                >
                  Ver resultados
                </Button>
              </View>

              {/* Tabs “Quiz” / “Categorias” */}
              <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 8, marginBottom: 8 }}>
                <Icon name="compass-outline" size={16} color={theme.colors.onSurfaceVariant} />
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

              {/* Seletor de criança (invisível em modo criança) */}
              {!actingChildId && (
                <View style={{ rowGap: 10, marginBottom: 8 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                    <Icon name="account-child-outline" size={18} color={theme.colors.onSurface} />{" "}
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
                      Seleciona uma criança para veres sugestões e poderes reservar.
                    </Text>
                  )}
                </View>
              )}
            </SectionCard>
          </FadeIn>

          {/* --------------------------- CARD 2 — Filtros --------------------------- */}
          <FadeIn delay={50}>
            <SectionCard>
              <View style={{ rowGap: 4 }}>
                {/* Ações globais dos colapsáveis */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                  <Button
                    onPress={() =>
                      setOpen({ age: true, genres: true, format: true, goals: true, moment: true })
                    }
                    icon="chevron-down"
                  >
                    Expandir tudo
                  </Button>
                  <Button
                    onPress={() =>
                      setOpen({ age: false, genres: false, format: false, goals: false, moment: false })
                    }
                    icon="chevron-up"
                  >
                    Fechar tudo
                  </Button>
                </View>

                {/* Grupos de filtros colapsáveis */}
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
                          icon={chipIconFor[a]}
                          onPress={() =>
                            setFilters((f) => ({ ...f, ageRange: f.ageRange === a ? undefined : a }))
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
                          icon={chipIconFor[g]}
                          onPress={() => setFilters((f) => ({ ...f, genres: toggle(f.genres, g) }))}
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
                          icon={chipIconFor[k]}
                          onPress={() => setFilters((f) => ({ ...f, format: toggle(f.format, k) }))}
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
                          icon={chipIconFor[o]}
                          onPress={() => setFilters((f) => ({ ...f, goals: toggle(f.goals, o) }))}
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
                          icon={chipIconFor[k]}
                          onPress={() =>
                            setFilters((f) => ({ ...f, moment: f.moment === k ? undefined : k }))
                          }
                        >
                          {label}
                        </Chip>
                      ))}
                    </View>
                  </List.Accordion>
                </List.Section>

                {/* Ações de filtros */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                  <Button
                    icon="filter-off-outline"
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
                    icon="magnify"
                    onPress={applyFilters}
                    disabled={loading || !childId}
                  >
                    Ver resultados
                  </Button>
                </View>
              </View>
            </SectionCard>
          </FadeIn>

          {/* --------------------------- CARD 3 — Resultados --------------------------- */}
          <FadeIn delay={100}>
            <SectionCard>
              {/* Estado vazio / carregamento */}
              {items.length === 0 ? (
                <View style={{ paddingVertical: 8, alignItems: "center" }}>
                  <Icon name="book-off-outline" size={32} color={theme.colors.onSurfaceDisabled} />
                  <Text style={{ opacity: 0.7, marginTop: 6, textAlign: "center" }}>
                    {childId
                      ? "Sem resultados. Ajusta os filtros e tenta novamente."
                      : "Seleciona uma criança para começar."}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Grelha 2 colunas com FadeIn por item */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                    }}
                  >
                    {items.map((item, idx) => {
                      const btnBusy = !!busyByIsbn[item.isbn];
                      const serverStatus = (item as any)
                        .status as "reserved" | "reading" | "finished" | "none" | undefined;
                      const localOverride = statusByIsbn[item.isbn];
                      const effectiveStatus =
                        (localOverride || serverStatus) as
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

                      const iconForBtn =
                        effectiveStatus === "reserved"
                          ? "bookmark-check"
                          : effectiveStatus === "reading"
                          ? "book-open-page-variant"
                          : effectiveStatus === "finished"
                          ? "bookmark-plus-outline"
                          : "bookmark-plus";

                      return (
                        <FadeIn
                          key={item.isbn}
                          delay={80 + idx * 20}
                          translateY={14}
                          style={{
                            width: "48%",
                            flexBasis: "48%",
                            flexGrow: 0,
                            flexShrink: 0,
                            marginBottom: 12,
                          }}
                        >
                          <Card style={{ overflow: "hidden" }}>
                            {/* Capa com “badge” de estado */}
                            <View>
                              <Card.Cover
                                source={
                                  item.coverUrl
                                    ? { uri: item.coverUrl }
                                    : require("../../assets/placeholder-book.png")
                                }
                                resizeMode="cover"
                                style={{ height: 200 }}
                              />
                              {(effectiveStatus === "reserved" ||
                                effectiveStatus === "reading") && (
                                <View
                                  style={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: 999,
                                    paddingVertical: 4,
                                    paddingHorizontal: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: theme.colors.onPrimary,
                                      fontWeight: "700",
                                      fontSize: 10,
                                    }}
                                  >
                                    {effectiveStatus === "reserved" ? "RESERVADO" : "A LER"}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Corpo: título + resumo + meta (score/lido) */}
                            <View style={{ paddingHorizontal: 12, paddingTop: 8, flex: 1 }}>
                              <Text variant="titleSmall" numberOfLines={2} style={{ fontWeight: "700" }}>
                                {item.title}
                              </Text>

                              {item.summary ? (
                                <Text variant="bodySmall" numberOfLines={3} style={{ opacity: 0.85, marginTop: 4 }}>
                                  {item.summary}
                                </Text>
                              ) : null}

                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 8,
                                  marginTop: 6,
                                }}
                              >
                                {typeof item.score === "number" && (
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 4,
                                      opacity: 0.7,
                                    }}
                                  >
                                    <Icon
                                      name="chart-line"
                                      size={14}
                                      color={theme.colors.onSurfaceVariant}
                                    />
                                    <Text variant="labelSmall">
                                      {item.score.toFixed(3)}
                                    </Text>
                                  </View>
                                )}
                                {serverStatus === "finished" && (
                                  <Chip compact icon="check" style={{ height: 26 }}>
                                    Já lido
                                  </Chip>
                                )}
                              </View>

                              {/* push flex para rodapé */}
                              <View style={{ flex: 1 }} />
                            </View>

                            {/* Rodapé: “Ver mais” + ação de reserva */}
                            <View
                              style={{
                                paddingHorizontal: 12,
                                paddingBottom: 12,
                                paddingTop: 2,
                              }}
                            >
                              <Button
                                compact
                                mode="text"
                                icon="information-outline"
                                onPress={() => setDetailItem(item)}
                                style={{ alignSelf: "flex-start" }}
                                contentStyle={{ justifyContent: "flex-start" }}
                              >
                                Ver mais
                              </Button>

                              <Button
                                mode="contained"
                                onPress={() => onReserve(item.isbn)}
                                disabled={disabled}
                                loading={btnBusy}
                                icon={btnBusy ? undefined : iconForBtn}
                                style={{ marginTop: 8 }}
                              >
                                {label}
                              </Button>
                            </View>
                          </Card>
                        </FadeIn>
                      );
                    })}
                  </View>

                  {/* Paginação cumulativa */}
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

              {/* Snackbar com feedback das ações */}
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
          </FadeIn>
        </ScrollView>
      </SafeAreaView>

      {/* ------------------------------ Modal Detalhe ----------------------------- */}
      <Portal>
        <Modal
          visible={!!detailItem}
          onDismiss={() => setDetailItem(null)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            margin: 16,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          {detailItem && (
            <View style={{ gap: 10 }}>
              {/* Header do modal */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="book-open-page-variant" size={20} color={theme.colors.onSurface} />
                <Text variant="titleMedium" style={{ fontWeight: "800", flex: 1 }}>
                  {detailItem.title}
                </Text>
                <IconButton icon="close" onPress={() => setDetailItem(null)} />
              </View>

              {/* Capa */}
              <Card.Cover
                source={
                  detailItem.coverUrl
                    ? { uri: detailItem.coverUrl }
                    : require("../../assets/placeholder-book.png")
                }
                style={{ height: 220, borderRadius: 10 }}
              />

              {/* Meta (score) */}
              {typeof (detailItem as any).score === "number" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="chart-line" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ opacity: 0.7 }}>
                    score {(detailItem as any).score.toFixed(3)}
                  </Text>
                </View>
              )}

              {/* Resumo */}
              {!!detailItem.summary && (
                <Text style={{ opacity: 0.9 }}>{detailItem.summary}</Text>
              )}

              {/* Ações */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                <Button onPress={() => setDetailItem(null)}>Fechar</Button>
                <Button
                  mode="contained"
                  icon="bookmark-plus"
                  onPress={() => {
                    setDetailItem(null);
                    onReserve(detailItem.isbn);
                  }}
                >
                  Reservar
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </Background>
  );
}

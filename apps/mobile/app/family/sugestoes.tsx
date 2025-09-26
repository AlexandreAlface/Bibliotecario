// src/app/family/SugestoesTab.tsx
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ScrollView,
  View,
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
  Modal,
  Portal,
  Snackbar,
  Text,
  useTheme,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useAuth } from "src/contexts/AuthContext";
import {
  getSugestoesPerfil,
  getSugestoesQuiz,
  type QuizAnswer,
  type BookLite,
} from "src/services/recommendations";
import { reserveBook } from "src/services/reservations";
import { router, usePathname } from "expo-router";
import { Background, LinkText } from "@bibliotecario/ui-mobile";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TABBAR_HEIGHT } from "src/constants/layout";

/* ---------------- Anim helpers ---------------- */
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

/* ---------------- Quiz steps ---------------- */
const QUIZ_STEPS = [
  {
    id: "genres",
    title: "Que género de livro preferes?",
    multi: true,
    items: [
      "Aventura",
      "Fantasia",
      "Mistério",
      "Humor",
      "Ciências",
      "Animais",
      "Clássicos",
    ],
  },
  {
    id: "mood",
    title: "Qual o contexto de leitura?",
    multi: false,
    items: ["antes-de-dormir", "tempo-livre", "aventura"],
  },
  {
    id: "format",
    title: "Preferes algum formato?",
    multi: true,
    items: ["curto", "ilustrado", "serie"],
  },
  {
    id: "ageRange",
    title: "Faixa etária",
    multi: false,
    items: ["0-2", "3-5", "6-8", "9-12", "12-15"],
  },
] as const;

/* Mini mapeamento de ícones para chips do quiz */
const chipIconFor: Record<string, string> = {
  Aventura: "map-marker-path",
  Fantasia: "magic-staff",
  Mistério: "magnify",
  Humor: "emoticon-happy-outline",
  Ciências: "flask-outline",
  Animais: "paw",
  Clássicos: "book-outline",
  "antes-de-dormir": "sleep",
  "tempo-livre": "weather-sunny",
  aventura: "compass-outline",
  curto: "flash-outline",
  ilustrado: "image-multiple-outline",
  serie: "bookmark-multiple-outline",
  "0-2": "baby-face-outline",
  "3-5": "numeric-3-circle-outline",
  "6-8": "numeric-6-circle-outline",
  "9-12": "numeric-9-circle-outline",
  "12-15": "numeric-1-circle-outline",
};

/* ---------------- Component ---------------- */
export default function SugestoesTab() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // enable LayoutAnimation no Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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

  // dados
  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"perfil" | "quiz">("perfil");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  const [lastAnswers, setLastAnswers] = useState<QuizAnswer[] | null>(null);

  // paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI
  const [snack, setSnack] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  const [statusByIsbn, setStatusByIsbn] = useState<Record<string, "reserved" | "reading">>({});

  // detalhe (modal expandir)
  const [detailItem, setDetailItem] = useState<BookLite | null>(null);

  const dedupedItems = useMemo<BookLite[]>(() => {
    const seen = new Set<string>();
    const out: BookLite[] = [];
    for (const it of items) {
      if (!it?.isbn) continue;
      if (seen.has(it.isbn)) continue;
      seen.add(it.isbn);
      out.push(it);
    }
    return out;
  }, [items]);

  const subtitle = useMemo(
    () =>
      mode === "perfil"
        ? "Baseadas no teu perfil (idade/leitura)"
        : "Baseadas nas tuas respostas ao quiz",
    [mode]
  );

  // ====== fetch helpers (sem OFFSET) ======
  async function fetchPerfilPaged(nextPage = 1) {
    if (!childId) return;
    const limit = perPage * nextPage;
    const data = await getSugestoesPerfil(limit, { childId });
    const newList = dedupe(data);
    setItems(newList);
    setHasMore(data.length >= limit);
  }

  async function fetchQuizPaged(answers: QuizAnswer[], nextPage = 1) {
    if (!childId) return;
    const limit = perPage * nextPage;
    const data = await getSugestoesQuiz(answers, limit, { childId });
    const newList = dedupe(data);
    setItems(newList);
    setHasMore(data.length >= limit);
  }

  // chamadas públicas
  async function loadPerfil() {
    if (!childId) return;
    setMode("perfil");
    setLastAnswers(null);
    setPage(1);
    setLoading(true);
    try {
      await fetchPerfilPaged(1);
    } finally {
      setLoading(false);
    }
  }

  async function runQuiz(answers: QuizAnswer[]) {
    if (!childId) return;
    setMode("quiz");
    setLastAnswers(answers);
    setPage(1);
    setLoading(true);
    try {
      await fetchQuizPaged(answers, 1);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      if (mode === "perfil") await fetchPerfilPaged(next);
      else if (lastAnswers) await fetchQuizPaged(lastAnswers, next);
      setPage(next);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } finally {
      setLoadingMore(false);
    }
  }

  // ====== reservar ======
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

  // ====== lifecycle ======
  useEffect(() => {
    if (childId) loadPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // ====== UI infra ======
  const CardContainer: React.FC<{ children: React.ReactNode; style?: any }> = ({
    children,
    style,
  }) => (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  function quizReady(state: Record<string, any>) {
    return (
      Array.isArray(state.genres) &&
      state.genres.length > 0 &&
      typeof state.mood === "string" &&
      Array.isArray(state.format) &&
      state.format.length > 0 &&
      typeof state.ageRange === "string"
    );
  }

  function handleQuizFinish() {
    if (!quizReady(quizState)) {
      if (mode === "quiz" && lastAnswers) {
        runQuiz(lastAnswers);
      }
      return;
    }
    const answers: QuizAnswer[] = [
      { id: "genres", value: quizState.genres },
      { id: "mood", value: quizState.mood },
      { id: "format", value: quizState.format },
      { id: "ageRange", value: quizState.ageRange },
    ];
    setQuizOpen(false);
    runQuiz(answers);
  }

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
              onRefresh={() =>
                mode === "perfil"
                  ? loadPerfil()
                  : lastAnswers
                  ? runQuiz(lastAnswers)
                  : handleQuizFinish()
              }
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* CARD #1 — Header compacto + links + seletor */}
          <FadeIn>
            <CardContainer>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                {headerIcon}
                <Text variant="headlineSmall" style={{ fontWeight: "900", flex: 1 }}>
                  Sugestões de Leitura
                </Text>
                <IconButton
                  icon="refresh"
                  disabled={loading || !childId}
                  onPress={() =>
                    mode === "perfil"
                      ? loadPerfil()
                      : lastAnswers
                      ? runQuiz(lastAnswers)
                      : handleQuizFinish()
                  }
                />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ opacity: 0.7, flex: 1, marginRight: 8 }} numberOfLines={2}>
                  {subtitle}
                </Text>
                <Button mode="contained-tonal" icon="clipboard-text-outline" onPress={() => setQuizOpen(true)} disabled={!childId}>
                  Fazer quiz
                </Button>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 8 }}>
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

              {!actingChildId && (
                <View style={{ rowGap: 10, marginTop: 12 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                    <Icon name="account-child-outline" size={18} color={theme.colors.onSurface} /> Escolhe a criança
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
                  {!childId && <Text style={{ opacity: 0.7 }}>Seleciona uma criança para veres sugestões e poderes reservar.</Text>}
                </View>
              )}
            </CardContainer>
          </FadeIn>

          {/* CARD #2 — Grelha de sugestões */}
          <FadeIn delay={60}>
            <CardContainer>
              {dedupedItems.length === 0 ? (
                <View style={{ paddingVertical: 12, alignItems: "center" }}>
                  <Icon name="book-off-outline" size={32} color={theme.colors.onSurfaceDisabled} />
                  <Text style={{ opacity: 0.7, marginTop: 6, textAlign: "center" }}>
                    {childId ? "Sem resultados. Experimenta o quiz para explorar novos livros." : "Seleciona uma criança para começar."}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {dedupedItems.map((item, idx) => {
                      const btnBusy = !!busyByIsbn[item.isbn];
                      const serverStatus = (item as any).status as "reserved" | "reading" | "finished" | "none" | undefined;
                      const localOverride = statusByIsbn[item.isbn];
                      const effectiveStatus = (localOverride || serverStatus) as "reserved" | "reading" | "finished" | "none" | undefined;

                      const disabled =
                        !childId || btnBusy || effectiveStatus === "reserved" || effectiveStatus === "reading";
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
                            {/* Capa */}
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
                              {(effectiveStatus === "reserved" || effectiveStatus === "reading") && (
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
                                  <Text style={{ color: theme.colors.onPrimary, fontWeight: "700", fontSize: 10 }}>
                                    {effectiveStatus === "reserved" ? "RESERVADO" : "A LER"}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Conteúdo (flex:1 para manter altura) */}
                            <View style={{ paddingHorizontal: 12, paddingTop: 8, flex: 1 }}>
                              <Text variant="titleSmall" numberOfLines={2} style={{ fontWeight: "700" }}>
                                {item.title}
                              </Text>

                              {item.summary ? (
                                <Text variant="bodySmall" numberOfLines={3} style={{ opacity: 0.85, marginTop: 4 }}>
                                  {item.summary}
                                </Text>
                              ) : null}

                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                                {typeof item.score === "number" && (
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: 0.7 }}>
                                    <Icon name="chart-line" size={14} color={theme.colors.onSurfaceVariant} />
                                    <Text variant="labelSmall">{item.score.toFixed(3)}</Text>
                                  </View>
                                )}
                                {serverStatus === "finished" && (
                                  <Chip compact icon="check" style={{ height: 26 }}>
                                    Já lido
                                  </Chip>
                                )}
                              </View>

                              {/* empurra o rodapé para o fim */}
                              <View style={{ flex: 1 }} />
                            </View>

                            {/* Rodapé: “Ver mais” em cima, “Reservar” por baixo */}
                            <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 }}>
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

                  {/* Load more */}
                  {hasMore ? (
                    <View style={{ alignItems: "center", marginTop: 8 }}>
                      <Button mode="outlined" onPress={loadMore} disabled={loadingMore} icon={loadingMore ? undefined : "chevron-down"}>
                        {loadingMore ? <ActivityIndicator animating size="small" /> : "Carregar mais"}
                      </Button>
                    </View>
                  ) : null}
                </>
              )}
            </CardContainer>
          </FadeIn>
        </ScrollView>

        {/* Snackbar */}
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
      </SafeAreaView>

      {/* Quiz modal */}
      <Portal>
        <Modal
          visible={quizOpen}
          onDismiss={() => setQuizOpen(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            margin: 16,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="clipboard-text-outline" size={18} color={theme.colors.onSurface} />
            <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
              Sugestões — Quiz
            </Text>
          </View>

          {QUIZ_STEPS.map((step) => (
            <View key={step.id} style={{ marginBottom: 12 }}>
              <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: "700" }}>
                {step.title}
              </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {step.items.map((it) => {
                    const selected = step.multi
                      ? Array.isArray(quizState[step.id]) && quizState[step.id]?.includes(it)
                      : quizState[step.id] === it;
                    return (
                      <Chip
                        key={it}
                        mode={selected ? "flat" : "outlined"}
                        selected={selected}
                        icon={chipIconFor[it]}
                        onPress={() => {
                          setQuizState((s) => {
                            if (step.multi) {
                              const prev = Array.isArray(s[step.id]) ? s[step.id] : [];
                              return {
                                ...s,
                                [step.id]: prev.includes(it) ? prev.filter((x: string) => x !== it) : [...prev, it],
                              };
                            } else {
                              return { ...s, [step.id]: s[step.id] === it ? undefined : it };
                            }
                          });
                        }}
                      >
                        {it}
                      </Chip>
                    );
                  })}
                </View>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button icon="close" onPress={() => { setQuizState({}); setQuizOpen(false); }}>
              Cancelar
            </Button>
            <Button mode="contained" icon="eye-outline" onPress={handleQuizFinish} disabled={!quizReady(quizState) || !childId}>
              Ver sugestões
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Detalhe da sugestão (expansão) */}
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="book-open-page-variant" size={20} color={theme.colors.onSurface} />
                <Text variant="titleMedium" style={{ fontWeight: "800", flex: 1 }}>
                  {detailItem.title}
                </Text>
                <IconButton icon="close" onPress={() => setDetailItem(null)} />
              </View>

              <Card.Cover
                source={
                  detailItem.coverUrl
                    ? { uri: detailItem.coverUrl }
                    : require("../../assets/placeholder-book.png")
                }
                style={{ height: 220, borderRadius: 10 }}
              />

              {typeof (detailItem as any).score === "number" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="chart-line" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ opacity: 0.7 }}>
                    score {(detailItem as any).score.toFixed(3)}
                  </Text>
                </View>
              )}

              {!!detailItem.summary && (
                <Text style={{ opacity: 0.9 }}>{detailItem.summary}</Text>
              )}

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

// utils locais
function dedupe(list: BookLite[]) {
  const seen = new Set<string>();
  const out: BookLite[] = [];
  for (const it of list) {
    if (!it?.isbn || seen.has(it.isbn)) continue;
    seen.add(it.isbn);
    out.push(it);
  }
  return out;
}

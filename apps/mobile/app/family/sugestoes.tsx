// src/app/family/SugestoesTab.tsx
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
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
];

export default function SugestoesTab() {
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

  // estado de dados
  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"perfil" | "quiz">("perfil");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  const [lastAnswers, setLastAnswers] = useState<QuizAnswer[] | null>(null);

  // paginação (compatível com backend atual: limit apenas)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI
  const [snack, setSnack] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  const [statusByIsbn, setStatusByIsbn] = useState<Record<string, "reserved" | "reading">>({});

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

  // ====== fetch helpers (compatíveis com backend sem OFFSET) ======
  async function fetchPerfilPaged(nextPage = 1) {
    if (!childId) return;
    const limit = perPage * nextPage;
    const data = await getSugestoesPerfil(limit, { childId });
    const newList = dedupe(data);
    setItems(newList);
    setHasMore(data.length >= limit); // heurística: se veio "cheio", pode haver mais
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
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const CardContainer: React.FC<{ children: React.ReactNode; style?: any }> = ({
    children,
    style,
  }) => (
    <View
      style={[
        {
          backgroundColor: theme.colors.background,
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
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
        // refresh mantendo últimas respostas
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
              onRefresh={() =>
                mode === "perfil"
                  ? loadPerfil()
                  : lastAnswers
                  ? runQuiz(lastAnswers)
                  : handleQuizFinish()
              }
            />
          }
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* CARD #1 — Header compacto (2 linhas) + links + seletor */}
          <CardContainer>
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
              <Text style={{ opacity: 0.7, flex: 1, marginRight: 8 }} numberOfLines={2}>
                {subtitle}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
                <Button mode="contained" icon="help-circle-outline" onPress={() => setQuizOpen(true)} disabled={!childId}>
                  Fazer quiz
                </Button>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 8 }}>
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
          </CardContainer>

          {/* CARD #2 — Grelha de sugestões (com resumo + load more) */}
          <CardContainer>
            {dedupedItems.length === 0 ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ opacity: 0.7 }}>
                  {childId
                    ? "Sem resultados. Experimenta o quiz para explorar novos livros."
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
                  {dedupedItems.map((item) => {
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
                          <Text variant="titleSmall" numberOfLines={2} style={{ marginTop: 8 }}>
                            {item.title}
                          </Text>

                          {/* resumo/descrição se existir */}
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
                          <Button onPress={() => onReserve(item.isbn)} disabled={disabled} loading={btnBusy}>
                            {label}
                          </Button>
                        </Card.Actions>
                      </Card>
                    );
                  })}
                </View>

                {/* Load more */}
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
          </CardContainer>
        </ScrollView>

        {/* Snackbar em Portal */}
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
            backgroundColor: "white",
            margin: 16,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: "bold", marginBottom: 8 }}>
            Sugestões — Quiz
          </Text>

          {QUIZ_STEPS.map((step) => (
            <View key={step.id} style={{ marginBottom: 12 }}>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                {step.title}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {step.items.map((it) => {
                  const selected = step.multi
                    ? Array.isArray(quizState[step.id]) &&
                      quizState[step.id]?.includes(it)
                    : quizState[step.id] === it;
                  return (
                    <Chip
                      key={it}
                      mode={selected ? "flat" : "outlined"}
                      selected={selected}
                      onPress={() => {
                        setQuizState((s) => {
                          if (step.multi) {
                            const prev = Array.isArray(s[step.id]) ? s[step.id] : [];
                            return {
                              ...s,
                              [step.id]: prev.includes(it)
                                ? prev.filter((x: string) => x !== it)
                                : [...prev, it],
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

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Button
              onPress={() => {
                setQuizState({});
                setQuizOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleQuizFinish}
              disabled={!quizReady(quizState) || !childId}
            >
              Ver sugestões
            </Button>
          </View>
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

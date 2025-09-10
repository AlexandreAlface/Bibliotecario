// apps/mobile/app/(tabs)/sugestoes.tsx
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Modal,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "src/contexts/AuthContext";
import {
  getSugestoesPerfil,
  getSugestoesQuiz,
  type QuizAnswer,
} from "src/services/recommendations";
import { reserveBook } from "src/services/reservations";
import { router, usePathname } from "expo-router";
import { Background, LinkText } from "@bibliotecario/ui-mobile";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABBAR_HEIGHT } from "./_layout";

type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  score?: number;
  why?: string[];
  // ⬇️ novo: estado vindo do servidor (opcional) e última data terminada
  status?: "none" | "reserved" | "reading" | "finished";
  lastFinished?: string | null;
};

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

  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"perfil" | "quiz">("perfil");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  const [snack, setSnack] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // loading por ISBN para evitar duplo-clique
  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  // estado deduzido localmente após reservar: 'reserved' | 'reading'
  const [statusByIsbn, setStatusByIsbn] = useState<
    Record<string, "reserved" | "reading">
  >({});

  const dedupedItems = React.useMemo<BookLite[]>(() => {
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

  async function loadPerfil() {
    if (!childId) return;
    setLoading(true);
    try {
      // se o service já suporta options extra como { excludeOpen: true }, podes passar aqui.
      const data = await getSugestoesPerfil(12, { childId });
      setItems(data as any);
      setMode("perfil");
    } finally {
      setLoading(false);
    }
  }

  async function runQuiz(answers: QuizAnswer[]) {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await getSugestoesQuiz(answers, 12, { childId });
      setItems(data as any);
      setMode("quiz");
    } finally {
      setLoading(false);
    }
  }

  async function onReserve(isbn: string) {
    try {
      if (!childId) {
        setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
        return;
      }
      // evitar cliques múltiplos
      setBusyByIsbn((m) => ({ ...m, [isbn]: true }));
      // assinatura correta: (childId: number, isbn: string)
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

  useEffect(() => {
    if (childId) loadPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

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
          // sombra iOS
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          // elevação Android
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <Background>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() =>
              mode === "perfil" ? loadPerfil() : handleQuizFinish()
            }
          />
        }
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 8),
          paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          paddingHorizontal: 16,
          rowGap: 16,
        }}
      >
        {/* WHITE CARD #1 — Header + links + seletor */}
        <CardContainer>
          <Appbar.Header
            mode="small"
            style={{
              backgroundColor: "transparent",
              elevation: 0,
              paddingHorizontal: 0,
            }}
          >
            <Appbar.Content title="Sugestões de Leitura" subtitle={subtitle} />
            <Appbar.Action
              icon="refresh"
              disabled={loading || !childId}
              onPress={() =>
                mode === "perfil" ? loadPerfil() : handleQuizFinish()
              }
            />
            <Button
              mode="contained"
              icon="help-circle-outline"
              onPress={() => setQuizOpen(true)}
              disabled={!childId}
            >
              Fazer quiz
            </Button>
          </Appbar.Header>

          {/* Links sublinhados */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              columnGap: 8,
              marginTop: 4,
            }}
          >
            <LinkText
              underline
              size="sm"
              onPress={() => router.push("/(tabs)/sugestoes")}
              style={onQuiz ? { fontWeight: "700" } : { opacity: 0.85 }}
            >
              Quiz
            </LinkText>
            <Text>·</Text>
            <LinkText
              underline
              size="sm"
              onPress={() => router.push("/(tabs)/sugestoes-categorias")}
              style={onCategorias ? { fontWeight: "700" } : { opacity: 0.85 }}
            >
              Categorias
            </LinkText>
          </View>

          {/* Seletor de criança (obrigatório se não há actingChild) */}
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

        {/* WHITE CARD #2 — Grelha de sugestões */}
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
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {dedupedItems.map((item) => {
                const btnBusy = !!busyByIsbn[item.isbn];
                // ⬇️ estado vindo do servidor (se o service devolver), com fallback ao override local
                const serverStatus = (item as any).status as
                  | "reserved"
                  | "reading"
                  | "finished"
                  | "none"
                  | undefined;
                const localOverride = statusByIsbn[item.isbn]; // 'reserved' | 'reading' | undefined
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
                  <Card
                    key={item.isbn}
                    style={{ width: "48%", marginBottom: 12 }}
                  >
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
                      {typeof item.score === "number" ? (
                        <Text variant="labelSmall" style={{ opacity: 0.6 }}>
                          score {item.score.toFixed(3)}
                        </Text>
                      ) : null}

                      {/* motivo (reco) */}
                      {item.why?.length ? (
                        <Chip
                          compact
                          style={{ marginTop: 6 }}
                          icon="information-outline"
                        >
                          {item.why[0]}
                        </Chip>
                      ) : null}

                      {/* marcador "Já lido" quando o servidor indicar finished */}
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
          )}
        </CardContainer>

        <Portal>
          {/* Snackbar */}
          <Snackbar
            visible={!!snack}
            onDismiss={() => setSnack(null)}
            duration={2500}
            action={{
              label: "Fechar",
              onPress: () => setSnack(null),
            }}
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
      </ScrollView>

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
          <Text
            variant="titleMedium"
            style={{ fontWeight: "bold", marginBottom: 8 }}
          >
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
                            const prev = Array.isArray(s[step.id])
                              ? s[step.id]
                              : [];
                            return {
                              ...s,
                              [step.id]: prev.includes(it)
                                ? prev.filter((x: string) => x !== it)
                                : [...prev, it],
                            };
                          } else {
                            return {
                              ...s,
                              [step.id]: s[step.id] === it ? undefined : it,
                            };
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
      if (mode === "quiz") return;
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
}

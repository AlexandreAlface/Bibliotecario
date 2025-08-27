// apps/mobile/app/(tabs)/leituras.tsx
import * as React from "react";
import { ScrollView, View, Image, StyleSheet } from "react-native";
import {
  Appbar,
  Button,
  Chip,
  ActivityIndicator,
  Text,
  useTheme,
  Snackbar,
  IconButton,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@bibliotecario/ui-mobile";
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";

import { useAuth } from "src/contexts/AuthContext";
import {
  startReading,
  finishReading,
  getLeiturasAtuais,
  listPendingRatings,
  type PendingRatingRow,
  type ReadingLite,
} from "src/services/readings";
import { TABBAR_HEIGHT } from "./_layout";

type PendingStatus = "reserved" | "reading";

/* ---------- WhiteCard consistente ---------- */
const WhiteCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface ?? "#fff",
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* ---------- helpers ---------- */
function toChildId(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof val === "object") {
    // @ts-ignore
    const anyId = val.id ?? val.value ?? val.key;
    return toChildId(anyId);
  }
  return undefined;
}

type HistoryRow = {
  id: number;
  title: string;
  coverUrl?: string | null;
  date?: string | null;
  childId?: number;
  childName?: string | null;
  stars?: number | null;
  comment?: string | null;
};

function isPendingStatus(s: PendingRatingRow["status"]): s is PendingStatus {
  return s === "reserved" || s === "reading";
}
export default function LeiturasTab() {
  const { user, actAsChild } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // actingChild se existir
  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  // pré-seleção (primeiro filho) se não houver actingChild
  const firstChildId =
    !actingChildId && user?.children?.length
      ? Number(user.children[0].id)
      : undefined;

  const [selectedChildId, setSelectedChildId] = React.useState<
    string | undefined
  >(firstChildId ? String(firstChildId) : undefined);

  // 👇 a seleção manda; se não houver, cai para actingChild
  const childId = selectedChildId ? Number(selectedChildId) : actingChildId;

  const [pending, setPending] = React.useState<PendingRatingRow[]>([]);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);
  const [busyIsbn, setBusyIsbn] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [snack, setSnack] = React.useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // filtros (como no web)
  const [pendingFilter, setPendingFilter] = React.useState<PendingStatus[]>([]);
  const [historyFilter, setHistoryFilter] = React.useState<
    ("rated" | "unrated")[]
  >([]);
  type PendingRow = PendingRatingRow & { status: PendingStatus };

  const pendingOnly = React.useMemo<PendingRow[]>(
    () => pending.filter((r): r is PendingRow => isPendingStatus(r.status)),
    [pending]
  );

  const mustPickChild = !childId;

  const filteredPending = React.useMemo(
    () =>
      pendingFilter.length
        ? pendingOnly.filter((p) => pendingFilter.includes(p.status)) // p.status agora é PendingStatus
        : pendingOnly,
    [pendingOnly, pendingFilter]
  );

  async function loadAll() {
    if (!childId) {
      setPending([]);
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      // pendentes (reservado / a ler)
      const pRows = await listPendingRatings({
        childId,
        limit: 80,
        userId: (user as any)?.id, // permite trazer as estrelas do utilizador
      });
      setPending(
        pRows.filter((r) => r.status === "reserved" || r.status === "reading")
      );

      // histórico (tudo o que veio de /readings)
      const hRaw = await getLeiturasAtuais(200, { childId });
      const hRows: HistoryRow[] = hRaw.map((r: ReadingLite & any) => ({
        id: Number(r.id ?? 0),
        title: r.title ?? "Livro",
        coverUrl: r.coverUrl ?? null,
        date: r.date ?? r.finishedAt ?? r.startedAt ?? null,
        childId: r.childId,
        childName: r.childName ?? null,
        stars: typeof r.stars === "number" ? r.stars : undefined,
        comment: r.comment ?? undefined,
      }));
      setHistory(hRows);
    } catch (e) {
      console.error(e);
      setSnack({ msg: "Falha ao carregar leituras.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // ações
  const onStart = async (isbn: string) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }
    setBusyIsbn(isbn);
    try {
      await startReading(isbn, { childId });
      await loadAll();
      setSnack({ msg: "Leitura iniciada.", type: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ msg: "Não foi possível iniciar.", type: "error" });
    } finally {
      setBusyIsbn(null);
    }
  };

  const onFinish = async (isbn: string) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }
    setBusyIsbn(isbn);
    try {
      await finishReading(isbn, { childId });
      await loadAll();
      setSnack({ msg: "Leitura terminada.", type: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ msg: "Não foi possível terminar.", type: "error" });
    } finally {
      setBusyIsbn(null);
    }
  };

  // Sem crianças — igual à web: orientar
  if (!user?.children?.length) {
    return (
      <Background>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingTop: Math.max(insets.top + 8),
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
            paddingHorizontal: 16,
            rowGap: 16,
          }}
        >
          <WhiteCard>
            <Text>
              Para usar as leituras, adiciona uma criança à tua família.
            </Text>
            <Button
              mode="contained"
              style={{ marginTop: 12 }}
              onPress={() => router.push("/familias")}
            >
              Gerir família
            </Button>
          </WhiteCard>
        </ScrollView>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 8),
          paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          paddingHorizontal: 16,
          rowGap: 16,
        }}
      >
        {/* WHITE CARD #1 — Header + seletor */}
        <WhiteCard>
          <Appbar.Header
            mode="small"
            style={{
              backgroundColor: "transparent",
              elevation: 0,
              paddingHorizontal: 0,
            }}
          >
            <Appbar.Content
              title="Leituras"
              subtitle="Reservas, leituras em curso e histórico"
            />
            <Appbar.Action
              icon="refresh"
              disabled={loading || !childId}
              onPress={loadAll}
            />
          </Appbar.Header>

          {/* SelectChild (só se não há actingChild) */}
          {!actingChildId && (
            <View style={{ rowGap: 10, marginTop: 8 }}>
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
                onChange={(val: any) => {
                  const id = toChildId(val);
                  setSelectedChildId(id ? String(id) : undefined);
                  if (
                    id &&
                    id !== actingChildId &&
                    typeof actAsChild === "function"
                  ) {
                    actAsChild(id).catch((e: any) =>
                      console.warn("actAsChild:", e?.message || e)
                    );
                  }
                }}
                clearable
                disabled={!user?.children?.length}
                menuMaxHeight={360}
              />
              {!childId && (
                <Text style={{ opacity: 0.7 }}>
                  Seleciona uma criança para veres leituras e reservas.
                </Text>
              )}
            </View>
          )}
        </WhiteCard>

        {/* WHITE CARD #2 — Leituras em curso (pendentes) */}
        <WhiteCard>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="titleLarge" style={{ fontWeight: "900" }}>
              Leituras em Curso
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {/* Filtro Estado */}
              <Chip
                mode={pendingFilter.includes("reserved") ? "flat" : "outlined"}
                selected={pendingFilter.includes("reserved")}
                onPress={() =>
                  setPendingFilter((s) =>
                    s.includes("reserved")
                      ? s.filter((x) => x !== "reserved")
                      : [...s, "reserved"]
                  )
                }
                icon="bookmark-outline"
              >
                Reservado
              </Chip>
              <Chip
                mode={pendingFilter.includes("reading") ? "flat" : "outlined"}
                selected={pendingFilter.includes("reading")}
                onPress={() =>
                  setPendingFilter((s) =>
                    s.includes("reading")
                      ? s.filter((x) => x !== "reading")
                      : [...s, "reading"]
                  )
                }
                icon="book-open-page-variant"
              >
                A ler
              </Chip>
            </View>
          </View>

          <View style={{ height: 8 }} />

          {mustPickChild ? (
            <Text style={{ opacity: 0.75 }}>
              Escolhe a criança para veres reservas e leituras em curso.
            </Text>
          ) : loading ? (
            <ActivityIndicator />
          ) : filteredPending.length === 0 ? (
            <Text style={{ opacity: 0.75 }}>
              Não há reservas por iniciar nem leituras por terminar.
            </Text>
          ) : (
            filteredPending.map((r) => (
              <View
                key={r.isbn}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                }}
              >
                <Image
                  source={{ uri: r.coverUrl ?? undefined }}
                  style={{
                    width: 56,
                    height: 80,
                    borderRadius: 6,
                    marginRight: 12,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontWeight: "700" }}>
                    {r.title}
                  </Text>
                  <Text style={{ opacity: 0.75, marginTop: 2 }}>
                    {r.status === "reserved"
                      ? "Reservado"
                      : r.status === "reading"
                      ? "A ler"
                      : "Terminado"}
                  </Text>
                </View>
                {r.status === "reserved" ? (
                  <Button
                    mode="contained"
                    compact
                    onPress={() => onStart(r.isbn)}
                    loading={busyIsbn === r.isbn}
                    disabled={!!busyIsbn}
                  >
                    Começar
                  </Button>
                ) : r.status === "reading" ? (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => onFinish(r.isbn)}
                    loading={busyIsbn === r.isbn}
                    disabled={!!busyIsbn}
                  >
                    Terminar
                  </Button>
                ) : null}
              </View>
            ))
          )}
        </WhiteCard>

        {/* WHITE CARD #3 — Histórico */}
        <WhiteCard>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="titleLarge" style={{ fontWeight: "900" }}>
              Histórico de leituras
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Chip
                mode={historyFilter.includes("rated") ? "flat" : "outlined"}
                selected={historyFilter.includes("rated")}
                onPress={() =>
                  setHistoryFilter((s) =>
                    s.includes("rated")
                      ? s.filter((x) => x !== "rated")
                      : [...s, "rated"]
                  )
                }
                icon="star"
              >
                Com avaliação
              </Chip>
              <Chip
                mode={historyFilter.includes("unrated") ? "flat" : "outlined"}
                selected={historyFilter.includes("unrated")}
                onPress={() =>
                  setHistoryFilter((s) =>
                    s.includes("unrated")
                      ? s.filter((x) => x !== "unrated")
                      : [...s, "unrated"]
                  )
                }
                icon="star-outline"
              >
                Sem avaliação
              </Chip>
            </View>
          </View>

          <View style={{ height: 8 }} />

          {loading ? (
            <ActivityIndicator />
          ) : (historyFilter.length
              ? history.filter((h) =>
                  historyFilter.includes(
                    typeof h.stars === "number" ? "rated" : "unrated"
                  )
                )
              : history
            ).length === 0 ? (
            <Text style={{ opacity: 0.75 }}>
              {childId
                ? "Sem resultados para os filtros aplicados."
                : "Escolhe uma criança para ver o histórico."}
            </Text>
          ) : (
            (historyFilter.length
              ? history.filter((h) =>
                  historyFilter.includes(
                    typeof h.stars === "number" ? "rated" : "unrated"
                  )
                )
              : history
            ).map((row) => (
              <View
                key={row.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                }}
              >
                <Image
                  source={{ uri: row.coverUrl ?? undefined }}
                  style={{
                    width: 56,
                    height: 80,
                    borderRadius: 6,
                    marginRight: 12,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontWeight: "700" }}>
                    {row.title}
                  </Text>
                  <Text style={{ opacity: 0.7 }}>
                    {row.date
                      ? new Date(row.date).toLocaleDateString("pt-PT")
                      : row.childName ?? ""}
                  </Text>
                  {typeof row.stars === "number" && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <IconButton icon="star" size={16} disabled />
                      <Text style={{ opacity: 0.8 }}>{row.stars}/5</Text>
                    </View>
                  )}
                  {row.comment && (
                    <Text
                      style={{ opacity: 0.8, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      “{row.comment}”
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </WhiteCard>
      </ScrollView>

      {/* Snackbar */}
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
    </Background>
  );
}

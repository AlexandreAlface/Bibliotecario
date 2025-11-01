/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/family/leituras.tsx
 * Ecrã: Leituras — reservas, leituras em curso e histórico
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços aplicados:
 * • Comentários detalhados (PT-PT) e JSDoc nos helpers.
 * • Helpers PUROS (determinísticos) extraídos para claridade e reutilização.
 * • Funções auxiliares ≤ 30 linhas (sempre que aplicável).
 * • Sem alterações de comportamento — apenas organização e comentários.
 * • 🪵 Logs de debug para perceber pedidos e respostas.
 * ============================================================================
 */

import * as React from "react";
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import {
  Button,
  Chip,
  ActivityIndicator,
  Text,
  useTheme,
  Snackbar,
  IconButton,
  TouchableRipple,
  Divider,
} from "react-native-paper";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

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
import { TABBAR_HEIGHT } from "src/constants/layout";
import type { MD3Theme } from "react-native-paper";

/* =============================================================================
 * Tipos
 * ========================================================================== */

type PendingStatus = "reserved" | "reading";
type HistoryStatus = "reserved" | "reading" | "finished";

type HistoryRow = {
  id: number;
  title: string;
  coverUrl?: string | null;
  date?: string | null;
  childId?: number;
  childName?: string | null;
  stars?: number | null;
  comment?: string | null;
  status: HistoryStatus;
};

/* =============================================================================
 * Helpers PUROS (determinísticos, ≤ 30 linhas)
 * ========================================================================== */

function toChildId(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof val === "object") {
    // @ts-ignore
    const anyId = (val as any).id ?? (val as any).value ?? (val as any).key;
    return toChildId(anyId);
  }
  return undefined;
}

function formatDatePT(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("pt-PT");
}

function isPendingStatus(s: PendingRatingRow["status"]): s is PendingStatus {
  return s === "reserved" || s === "reading";
}

function mapReadingsToHistoryRows(raw: (ReadingLite & any)[]): HistoryRow[] {
  return raw
    .map((r) => {
      const status: HistoryStatus = r.finishedAt
        ? "finished"
        : r.startedAt
        ? "reading"
        : "reserved";
      return {
        id: Number(r.id ?? 0),
        title: r.title ?? "Livro",
        coverUrl: r.coverUrl ?? null,
        date: r.date ?? r.finishedAt ?? r.startedAt ?? null,
        childId: r.childId,
        childName: r.childName ?? null,
        stars: r.stars ?? null,
        comment: r.comment ?? null,
        status,
      };
    })
    .filter((row) => row.status !== "reserved"); // histórico não mostra “reservado”
}

function statusVisuals(theme: MD3Theme, s: HistoryStatus) {
  switch (s) {
    case "reserved":
      return {
        icon: "bookmark-outline",
        bar: theme.colors.tertiary,
        chipBg: theme.colors.tertiaryContainer,
        chipFg: theme.colors.onTertiaryContainer,
      };
    case "reading":
      return {
        icon: "book-open-page-variant",
        bar: theme.colors.primary,
        chipBg: theme.colors.primaryContainer,
        chipFg: theme.colors.onPrimaryContainer,
      };
    case "finished":
    default:
      return {
        icon: "check",
        bar: theme.colors.secondary,
        chipBg: theme.colors.secondaryContainer,
        chipFg: theme.colors.onSecondaryContainer,
      };
  }
}

/* =============================================================================
 * Ecrã principal
 * ========================================================================== */

export default function LeiturasTab() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme<MD3Theme>();

  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Contexto: criança ativa / seleção manual
  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;
  const childFromProfile = (user as any)?.child?.id
    ? Number((user as any).child.id)
    : undefined;

  const firstChildId =
    !actingChildId && user?.children?.length
      ? Number(user.children[0].id)
      : undefined;

  const [selectedChildId, setSelectedChildId] = React.useState<
    string | undefined
  >(firstChildId ? String(firstChildId) : undefined);

  const childId = selectedChildId
    ? Number(selectedChildId)
    : actingChildId ?? childFromProfile;

  // ⚠️ Id do agregado (para cruzar ratings do utilizador) — não cair para user.id de perfil-criança
  const parentFamilyId =
    Number((user as any)?.family?.id) ||
    Number((user as any)?.families?.[0]?.id) ||
    undefined;

  // 🪵 debug contexto
  if (__DEV__) {
    console.debug("[LeiturasTab] ctx", {
      actingChildId,
      childFromProfile,
      selectedChildId,
      childId,
      parentFamilyId,
      hasChildren: !!user?.children?.length,
    });
  }

  // Estado de dados
  const [pending, setPending] = React.useState<PendingRatingRow[]>([]);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);
  const [busyIsbn, setBusyIsbn] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [snack, setSnack] = React.useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Filtros
  const [pendingFilter, setPendingFilter] = React.useState<PendingStatus[]>([]);
  const [historyFilter, setHistoryFilter] = React.useState<
    ("rated" | "unrated")[]
  >([]);

  // Colapsar/expandir cartões
  const [pendingCollapsed, setPendingCollapsed] = React.useState(false);
  const [historyCollapsed, setHistoryCollapsed] = React.useState(false);
  const togglePending = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingCollapsed((v) => !v);
  }, []);
  const toggleHistory = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryCollapsed((v) => !v);
  }, []);

  // Pré-filtragem de pendentes: só “reserved | reading”
  type PendingRow = PendingRatingRow & { status: PendingStatus };
  const pendingOnly = React.useMemo<PendingRow[]>(
    () => pending.filter((r): r is PendingRow => isPendingStatus(r.status)),
    [pending]
  );

  const mustPickChild = !childId;

  // Aplicar filtros de UI (pendentes)
  const filteredPending = React.useMemo(
    () =>
      pendingFilter.length
        ? pendingOnly.filter((p) => pendingFilter.includes(p.status))
        : pendingOnly,
    [pendingOnly, pendingFilter]
  );

  /**
   * Carrega pendentes e histórico para a criança selecionada.
   * Mantém UX responsivo (mensagens e erro genérico).
   */
  async function loadAll() {
    if (!childId) {
      setPending([]);
      setHistory([]);
      if (__DEV__) console.warn("[LeiturasTab] loadAll: sem childId → skip");
      return;
    }
    setLoading(true);
    try {
      // Pendentes (apenas estados úteis)
      const pRows = await listPendingRatings({
        childId,
        familyId: parentFamilyId, // útil para cruzar estrelas do utilizador
        limit: 80,
        userId: parentFamilyId,
      });

      const normalized = pRows.map((r) => ({
        ...r,
        status: String(r.status).toLowerCase() as
          | "reserved"
          | "reading"
          | "finished",
      }));

      setPending(
        normalized.filter(
          (r) => r.status === "reserved" || r.status === "reading"
        )
      );

      // Histórico (⚠️ passamos ambos se existirem)
      const hRaw = await getLeiturasAtuais(200, {
        childId,
        familyId: parentFamilyId,
      });

      const mapped = mapReadingsToHistoryRows(hRaw as (ReadingLite & any)[]);
      setHistory(mapped);

      // 🪵 debug
      if (__DEV__) {
        console.debug("[LeiturasTab] pending:", {
          total: normalized.length,
          filtered: filteredPending.length,
        });
        console.debug("[LeiturasTab] history raw/mapped:", {
          raw: hRaw.length,
          mapped: mapped.length,
          sample: hRaw[0],
        });
      }
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

  /** Inicia leitura (a partir de “reservado”). */
  const onStart = async (isbn: string) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }
    setBusyIsbn(isbn);
    try {
      // já tens childId -> familyId opcional
      await startReading(childId, parentFamilyId, isbn);
      await loadAll();
      setSnack({ msg: "Leitura iniciada.", type: "success" });
    } catch (e: any) {
      console.error(e);
      setSnack({
        msg: e?.message || "Não foi possível iniciar.",
        type: "error",
      });
    } finally {
      setBusyIsbn(null);
    }
  };

  /** Termina leitura (move para “finished”). */
  const onFinish = async (isbn: string) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }
    setBusyIsbn(isbn);
    try {
      await finishReading(childId, parentFamilyId, isbn);
      await loadAll();
      setSnack({ msg: "Leitura terminada.", type: "success" });
    } catch (e: any) {
      console.error(e);
      setSnack({
        msg: e?.message || "Não foi possível terminar.",
        type: "error",
      });
    } finally {
      setBusyIsbn(null);
    }
  };

  const statusLabel: Record<HistoryStatus, string> = {
    reserved: "Reservado",
    reading: "A ler",
    finished: "Terminado",
  };

  const pendingCount = filteredPending.length;
  const historyFiltered = React.useMemo(
    () =>
      historyFilter.length
        ? history.filter((h) =>
            historyFilter.includes(
              typeof h.stars === "number" ? "rated" : "unrated"
            )
          )
        : history,
    [history, historyFilter]
  );
  const historyCount = historyFiltered.length;

  /* ======================== Caso sem crianças registadas ===================== */
  if (!actingChildId && !childFromProfile && !user?.children?.length) {
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
            <WhiteCard>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Icon name="book-plus" size={22} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Sem crianças na família
                </Text>
              </View>
              <Text>
                Para usar as leituras, adiciona uma criança à tua família.
              </Text>
              <Button
                mode="contained"
                style={{ marginTop: 12 }}
                onPress={() => router.push("/familias")}
                icon="account-child"
              >
                Gerir família
              </Button>
            </WhiteCard>
          </ScrollView>
        </SafeAreaView>

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

  /* ================================ Render ================================== */

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
          {/* ---------- Header compacto + seletor de criança ---------- */}
          <WhiteCard>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.primaryContainer,
                  }}
                >
                  <Icon
                    name="book-multiple"
                    size={20}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                    Leituras
                  </Text>
                  <Text style={{ opacity: 0.7, marginTop: 2 }}>
                    Reservas, leituras em curso e histórico
                  </Text>
                </View>
              </View>

              <IconButton
                icon="refresh"
                disabled={loading || !childId}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  loadAll();
                }}
                accessibilityLabel="Atualizar leituras"
              />
            </View>

            {/* SelectChild — oculto em modo criança */}
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
                  onChange={(val: any) => {
                    const id = toChildId(val);
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setSelectedChildId(id ? String(id) : undefined);
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

          {/* ---------- Leituras em curso (colapsável) ---------- */}
          <WhiteCard>
            <TouchableRipple
              onPress={togglePending}
              role="button"
              borderless
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon
                    name="book-open-variant"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                    Leituras em Curso
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
                      {pendingCount}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={pendingCollapsed ? "chevron-down" : "chevron-up"}
                  onPress={togglePending}
                  accessibilityLabel={
                    pendingCollapsed ? "Expandir" : "Colapsar"
                  }
                />
              </>
            </TouchableRipple>

            {!pendingCollapsed && (
              <View>
                {/* Filtros rápidos */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  <FilterChip
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
                  </FilterChip>
                  <FilterChip
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
                  </FilterChip>
                </View>

                {/* Listagem */}
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
                  <View style={{ rowGap: 10 }}>
                    {filteredPending.map((r, idx) => {
                      const vis = statusVisuals(theme, r.status);
                      return (
                        <View key={r.isbn}>
                          <RowCard accentColor={vis.bar}>
                            <BookCover uri={r.coverUrl} />
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Text
                                  numberOfLines={2}
                                  style={{ fontWeight: "700", flex: 1 }}
                                >
                                  {r.title}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    backgroundColor: vis.chipBg,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 999,
                                  }}
                                >
                                  <Icon
                                    name={vis.icon as any}
                                    size={14}
                                    color={vis.chipFg}
                                  />
                                  <Text
                                    style={{
                                      color: vis.chipFg,
                                      fontWeight: "700",
                                      fontSize: 12,
                                    }}
                                  >
                                    {r.status === "reserved"
                                      ? "Reservado"
                                      : "A ler"}
                                  </Text>
                                </View>
                              </View>

                              <StarsDisplay value={r.stars} />

                              <View
                                style={{
                                  flexDirection: "row",
                                  gap: 8,
                                  marginTop: 8,
                                }}
                              >
                                {r.status === "reserved" ? (
                                  <Button
                                    mode="contained"
                                    compact
                                    onPress={() => onStart(r.isbn)}
                                    loading={busyIsbn === r.isbn}
                                    disabled={!!busyIsbn}
                                    icon="play-circle-outline"
                                  >
                                    Começar
                                  </Button>
                                ) : (
                                  <Button
                                    mode="outlined"
                                    compact
                                    onPress={() => onFinish(r.isbn)}
                                    loading={busyIsbn === r.isbn}
                                    disabled={!!busyIsbn}
                                    icon="check-circle-outline"
                                  >
                                    Terminar
                                  </Button>
                                )}
                              </View>
                            </View>
                          </RowCard>

                          {idx < filteredPending.length - 1 && (
                            <Divider
                              style={{
                                marginHorizontal: 4,
                                marginTop: 10,
                                opacity: 0.15,
                              }}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </WhiteCard>

          {/* ---------- Histórico (colapsável) ---------- */}
          <WhiteCard>
            <TouchableRipple
              onPress={toggleHistory}
              role="button"
              borderless
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon name="history" size={20} color={theme.colors.primary} />
                  <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                    Histórico de leituras
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
                      {historyCount}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={historyCollapsed ? "chevron-down" : "chevron-up"}
                  onPress={toggleHistory}
                  accessibilityLabel={
                    historyCollapsed ? "Expandir" : "Colapsar"
                  }
                />
              </>
            </TouchableRipple>

            {!historyCollapsed && (
              <View>
                {/* Filtros de avaliação */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  <FilterChip
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
                  </FilterChip>
                  <FilterChip
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
                  </FilterChip>
                </View>

                {/* Lista do histórico */}
                {loading ? (
                  <ActivityIndicator />
                ) : historyFiltered.length === 0 ? (
                  <Text style={{ opacity: 0.75 }}>
                    {childId
                      ? "Sem resultados para os filtros aplicados."
                      : "Escolhe uma criança para ver o histórico."}
                  </Text>
                ) : (
                  <View style={{ rowGap: 10 }}>
                    {historyFiltered.map((row, idx, arr) => {
                      const vis = statusVisuals(theme, row.status);
                      return (
                        <View key={row.id}>
                          <RowCard accentColor={vis.bar}>
                            <BookCover uri={row.coverUrl} />
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Text
                                  numberOfLines={2}
                                  style={{ fontWeight: "700", flex: 1 }}
                                >
                                  {row.title}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    backgroundColor: vis.chipBg,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 999,
                                  }}
                                >
                                  <Icon
                                    name={vis.icon as any}
                                    size={14}
                                    color={vis.chipFg}
                                  />
                                  <Text
                                    style={{
                                      color: vis.chipFg,
                                      fontWeight: "700",
                                      fontSize: 12,
                                    }}
                                  >
                                    {row.status === "finished"
                                      ? "Terminado"
                                      : row.status === "reading"
                                      ? "A ler"
                                      : "Reservado"}
                                  </Text>
                                </View>
                              </View>

                              <Text style={{ opacity: 0.7, marginTop: 2 }}>
                                {row.date
                                  ? formatDatePT(row.date)
                                  : row.childName ?? ""}
                              </Text>

                              <StarsDisplay value={row.stars} />

                              {!!row.comment && (
                                <Text
                                  style={{ opacity: 0.85, marginTop: 4 }}
                                  numberOfLines={2}
                                >
                                  “{row.comment}”
                                </Text>
                              )}
                            </View>
                          </RowCard>

                          {idx < arr.length - 1 && (
                            <Divider
                              style={{
                                marginHorizontal: 4,
                                marginTop: 10,
                                opacity: 0.15,
                              }}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </WhiteCard>
        </ScrollView>
      </SafeAreaView>

      {/* Snackbar (feedback de ações) */}
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

/** UI reutilizável (mesmo ficheiro) */

const WhiteCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  const theme = useTheme<MD3Theme>();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant,
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

const RowCard: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  accentColor?: string;
}> = ({ children, onPress, style, accentColor }) => {
  const theme = useTheme<MD3Theme>();
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={theme.colors.primary}
      style={[
        {
          backgroundColor: theme.colors.background,
          borderRadius: 12,
          padding: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant,
          borderLeftWidth: 4,
          borderLeftColor: accentColor ?? theme.colors.outlineVariant,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {children}
      </View>
    </TouchableRipple>
  );
};

const StarsDisplay: React.FC<{ value?: number | null }> = ({ value }) => {
  const theme = useTheme<MD3Theme>();
  if (typeof value !== "number") return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
      }}
    >
      <Icon name="star" size={16} color={theme.colors.tertiary} />
      <Text style={{ opacity: 0.8 }}>{value}/5</Text>
    </View>
  );
};

const BookCover: React.FC<{ uri?: string | null }> = ({ uri }) => {
  const theme = useTheme<MD3Theme>();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: 64,
          height: 96,
          borderRadius: 8,
          marginRight: 12,
          backgroundColor: theme.colors.surfaceVariant,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 64,
        height: 96,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: theme.colors.surfaceVariant,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name="book-outline"
        size={28}
        color={theme.colors.onSurfaceVariant}
      />
    </View>
  );
};

const FilterChip: React.FC<{
  selected: boolean;
  onPress: () => void;
  icon?: string;
  children: React.ReactNode;
}> = ({ selected, onPress, icon, children }) => {
  const theme = useTheme<MD3Theme>();
  const BORDER = theme.colors.outlineVariant;
  const selBg = theme.colors.primaryContainer;
  const selFg = theme.colors.onPrimaryContainer;
  const selBorder = theme.colors.primary;

  return (
    <Chip
      mode="outlined"
      selected={selected}
      onPress={onPress}
      style={{
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? selBg : undefined,
        borderColor: selected ? selBorder : BORDER,
      }}
      textStyle={{
        color: selected ? selFg : theme.colors.onSurface,
        fontWeight: (selected ? "700" : "400") as any,
      }}
      selectedColor={selected ? selFg : theme.colors.onSurface}
      icon={icon as any}
    >
      {children}
    </Chip>
  );
};

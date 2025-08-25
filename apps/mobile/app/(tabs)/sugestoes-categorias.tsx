// apps/mobile/app/(tabs)/sugestoes-categorias.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Snackbar,
  Text,
  useTheme,
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
import { TABBAR_HEIGHT } from "./_layout";

/* ---------- Tipos ---------- */
type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  score?: number;
  why?: string[];
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
  if (m === "antes-de-dormir") return "antes-de-dormir";
  return "tempo-livre";
}
function normalizeBooks(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload as BookLite[];
  if (Array.isArray(payload?.data)) return payload.data as BookLite[];
  if (Array.isArray(payload?.items)) return payload.items as BookLite[];
  return [];
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

  // actingChild vindo do backend (me())
  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  // seleção local obrigatória quando não há actingChild
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(
    undefined
  );
  const childId =
    actingChildId ?? (selectedChildId ? Number(selectedChildId) : undefined);

  const [filters, setFilters] = useState<Filters>({
    ageRange: undefined,
    genres: [],
    format: [],
    goals: [],
    moment: undefined,
  });

  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

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
        const raw = await getSugestoesPerfil(12, { childId });
        setItems(normalizeBooks(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  async function applyFilters() {
    if (!childId) return;

    await AsyncStorage.setItem(LS_KEY, JSON.stringify(filters));

    const answers: QuizAnswer[] = [
      { id: "ageRange", value: filters.ageRange },
      { id: "genres", value: filters.genres },
      { id: "format", value: filters.format },
      { id: "mood", value: momentToMood(filters.moment) },
      { id: "goals", value: filters.goals },
    ];

    setLoading(true);
    try {
      const raw = await getSugestoesQuiz(answers, 12, { childId });
      setItems(normalizeBooks(raw));
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
      await reserveBook(isbn, { childId });
      setSnack({ msg: "Reserva efetuada!", type: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ msg: "Falha ao reservar.", type: "error" });
    }
  }

  return (
    <Background>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={applyFilters} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8, // SafeArea já protege do notch/status bar
          paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          rowGap: 16,
        }}
      >
        {/* CARD 1 — Header + tabs + seletor + filtros */}
        <SectionCard>
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
          </Appbar.Header>

          {/* Links sublinhados Quiz/Categorias */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              columnGap: 8,
              marginBottom: 8,
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
                onChange={(id) => setSelectedChildId(id)} // ← id pode vir undefined ao limpar
                clearable // ← mostra o “✕” para limpar (opcional)
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
        <SectionCard>
          {/* Filtros */}
          <View style={{ rowGap: 16 }}>
            {/* Faixa Etária */}
            <View>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 8 }}
              >
                Faixa Etária
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
            </View>

            {/* Géneros */}
            <View>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 8 }}
              >
                Géneros
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {GENRE_OPTS.map((g) => (
                  <Chip
                    key={g}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    selected={filters.genres.includes(g)}
                    onPress={() =>
                      setFilters((f) => ({ ...f, genres: toggle(f.genres, g) }))
                    }
                  >
                    {g}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Formato */}
            <View>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 8 }}
              >
                Formato
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {FORMAT_OPTS.map(({ k, label }) => (
                  <Chip
                    key={k}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    selected={filters.format.includes(k)}
                    onPress={() =>
                      setFilters((f) => ({ ...f, format: toggle(f.format, k) }))
                    }
                  >
                    {label}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Objetivos */}
            <View>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 8 }}
              >
                Objetivos
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
            </View>

            {/* Momento de leitura */}
            <View>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 8 }}
              >
                Momento de leitura
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
            </View>

            {/* Ações dos filtros */}
            <View style={{ flexDirection: "row", gap: 10 }}>
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

        {/* CARD 2 — Resultados */}
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
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {items.map((item) => (
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
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      onPress={() => onReserve(item.isbn)}
                      disabled={!childId}
                    >
                      Reservar
                    </Button>
                  </Card.Actions>
                </Card>
              ))}
            </View>
          )}
        </SectionCard>

        <Snackbar
          visible={!!snack}
          onDismiss={() => setSnack(null)}
          duration={3000}
          action={
            snack?.type === "error"
              ? { label: "Fechar", onPress: () => setSnack(null) }
              : undefined
          }
        >
          {snack?.msg}
        </Snackbar>
      </ScrollView>
    </Background>
  );
}

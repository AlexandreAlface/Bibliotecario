import * as React from "react";
import {
  View,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
} from "react-native";
import {
  Checkbox,
  Text,
  useTheme,
  TextInput,
  Chip,
  ActivityIndicator,
  Snackbar,
  Badge,
  IconButton,
} from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import DateTimeField from "@bibliotecario/ui-mobile/components/DateTimeField/DateTimeField";
import TextField from "@bibliotecario/ui-mobile/components/TextField/TextField";

import {
  CulturalEvent,
  listCulturalEvents,
  reserveEvent,
  cancelEventReservation,
} from "src/services/culturalEvents";
import { TABBAR_HEIGHT } from "src/constants/layout";

/* ---------- helpers ---------- */
const YMD = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const fDate = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" });
const fTime = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});
const norm = (s?: string | null) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const matchesQuery = (ev: CulturalEvent, q: string) =>
  [ev.title, ev.location, ev.category, ev.libraryName].some((v) =>
    norm(String(v || "")).includes(norm(q))
  );

function nextWeekendRange(today = new Date()) {
  const d = new Date(today);
  const day = d.getDay();
  const toSaturday = (6 - day + 7) % 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() + toSaturday);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { from: YMD(sat), to: YMD(sun) };
}

const FEED_MAX_WIDTH = 560;

/* ---------- WhiteCard ---------- */
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

/* ---------- FilterChip (usa cores do tema, sem rosa) ---------- */
const useChipTheme = () => {
  const theme = useTheme<MD3Theme>();
  return {
    BORDER: theme.colors.outlineVariant,
    SEL_BG: theme.colors.primaryContainer,
    SEL_FG: theme.colors.onPrimaryContainer,
    SEL_BORDER: theme.colors.primary,
  };
};
const FilterChip: React.FC<{
  selected: boolean;
  onPress: () => void;
  icon?: string;
  children: React.ReactNode;
  compact?: boolean;
}> = ({ selected, onPress, icon, children, compact }) => {
  const theme = useTheme<MD3Theme>();
  const { BORDER, SEL_BG, SEL_FG, SEL_BORDER } = useChipTheme();
  return (
    <Chip
      mode="outlined"
      selected={selected}
      compact={compact}
      onPress={onPress}
      icon={icon as any}
      style={{
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? SEL_BG : undefined,
        borderColor: selected ? SEL_BORDER : BORDER,
      }}
      textStyle={{
        color: selected ? SEL_FG : theme.colors.onSurface,
        fontWeight: (selected ? "700" : "400") as any,
      }}
      selectedColor={selected ? SEL_FG : theme.colors.onSurface}
    >
      {children}
    </Chip>
  );
};

/* ---------- EventCard (com outline e faixa de acento) ---------- */
const EventCard: React.FC<{
  ev: CulturalEvent;
  onReserve: () => void;
  onCancel: () => void;
}> = ({ ev, onReserve, onCancel }) => {
  const theme = useTheme<MD3Theme>();
  const A = new Date(ev.startDate);
  const B = ev.endDate ? new Date(ev.endDate) : null;
  const when =
    B && !isNaN(B.getTime())
      ? `${fDate.format(A)} · ${fTime.format(A)} — ${fTime.format(B)}`
      : `${fDate.format(A)} · ${fTime.format(A)}`;

  const accent = ev.reserved
    ? theme.colors.primary
    : theme.colors.outlineVariant;
  const borderColor = theme.colors.outlineVariant;

  return (
    <FlexibleCard
      title={ev.title} // 👈 title tem de ser string
      subtitle={when + (ev.location ? ` · ${ev.location}` : "")}
      images={ev.imageUrl ? [ev.imageUrl] : undefined}
      imageRadius={16}
      backgroundColor={theme.colors.surface}
      elevation={0}
      padding={14}
      style={{
        marginTop: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor,
        alignSelf: "center",
        width: "100%",
        maxWidth: FEED_MAX_WIDTH,
        borderLeftWidth: 4,
        borderLeftColor: accent, // faixa de acento mantém-se
      }}
      footer={
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {!!ev.category && (
              <Chip compact mode="outlined" icon="tag" style={{ borderColor }}>
                {ev.category}
              </Chip>
            )}
            {!!ev.libraryName && (
              <Chip
                compact
                mode="outlined"
                icon="library"
                style={{ borderColor }}
              >
                {ev.libraryName}
              </Chip>
            )}
            {!!ev.capacity && (
              <Chip
                compact
                mode="outlined"
                icon="account-multiple"
                style={{ borderColor }}
              >
                Capacidade: {ev.capacity}
              </Chip>
            )}
            {ev.reserved && (
              <Badge
                style={{
                  alignSelf: "center",
                  backgroundColor: theme.colors.primaryContainer,
                  color: theme.colors.onPrimaryContainer,
                }}
              >
                Reservado
              </Badge>
            )}
          </View>

          {!!ev.description && (
            <Text numberOfLines={3} style={{ marginTop: 6, opacity: 0.9 }}>
              {ev.description}
            </Text>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            {ev.reserved ? (
              <SecondaryButton label="Cancelar" onPress={onCancel} />
            ) : (
              <PrimaryButton label="Reservar" onPress={onReserve} />
            )}
          </View>
        </View>
      }
    />
  );
};

export default function EventosTab() {
  const theme = useTheme<MD3Theme>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 400;

  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // filtros
  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState<string>(YMD(new Date()));
  const [to, setTo] = React.useState<string>(
    YMD(new Date(Date.now() + 30 * 86400000))
  );
  const [onlyBiblioteca, setOnlyBiblioteca] = React.useState(true);
  const [quick, setQuick] = React.useState<"hoje" | "fds" | "30" | "custom">(
    "30"
  );

  const [collapsed, setCollapsed] = React.useState(false);
  const toggleCollapsed = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((v) => !v);
  };

  // dados
  const [items, setItems] = React.useState<CulturalEvent[]>([]);
  const [nextCursor, setNextCursor] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [snack, setSnack] = React.useState<string | null>(null);
  const reqIdRef = React.useRef(0);

  const applyClientFilters = React.useCallback(
    (arr: CulturalEvent[]) => {
      let out = arr;
      if (onlyBiblioteca)
        out = out.filter((ev) => norm(ev.category) === "biblioteca");
      if (q.trim()) out = out.filter((ev) => matchesQuery(ev, q));
      return out;
    },
    [q, onlyBiblioteca]
  );

  function setQuickRange(kind: "hoje" | "fds" | "30") {
    const today = new Date();
    if (kind === "hoje") {
      const ymd = YMD(today);
      setFrom(ymd);
      setTo(ymd);
      setQuick("hoje");
    } else if (kind === "fds") {
      const r = nextWeekendRange(today);
      setFrom(r.from);
      setTo(r.to);
      setQuick("fds");
    } else {
      setFrom(YMD(today));
      setTo(YMD(new Date(Date.now() + 30 * 86400000)));
      setQuick("30");
    }
  }

  async function loadFirstPage() {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    const myReq = ++reqIdRef.current;
    try {
      const res = await listCulturalEvents({
        from,
        to,
        limit: 24,
        cursor: null,
      });
      if (reqIdRef.current !== myReq) return;
      setItems(applyClientFilters(res.items));
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      setSnack(e?.message || "Falha a obter eventos.");
    } finally {
      if (reqIdRef.current === myReq) setLoading(false);
    }
  }

  async function loadMore() {
    if (loading || nextCursor == null) return;
    setLoading(true);
    const myReq = ++reqIdRef.current;
    try {
      const res = await listCulturalEvents({
        from,
        to,
        limit: 24,
        cursor: nextCursor,
      });
      if (reqIdRef.current !== myReq) return;
      setItems((prev) => [...prev, ...applyClientFilters(res.items)]);
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      setSnack(e?.message || "Falha ao carregar mais.");
    } finally {
      if (reqIdRef.current === myReq) setLoading(false);
    }
  }

  React.useEffect(() => {
    loadFirstPage();
  }, [from, to, q, onlyBiblioteca]); // eslint-disable-line

  async function onReserve(ev: CulturalEvent) {
    try {
      await reserveEvent(ev.id);
      setItems((prev) =>
        prev.map((x) => (x.id === ev.id ? { ...x, reserved: true } : x))
      );
      setSnack("Reserva confirmada ✅");
    } catch (e: any) {
      const m = String(e?.message || "");
      if (m.includes("capacity")) setSnack("Capacidade esgotada.");
      else if (m.includes("already_reserved")) {
        setItems((prev) =>
          prev.map((x) => (x.id === ev.id ? { ...x, reserved: true } : x))
        );
        setSnack("Já tinhas reserva ativa.");
      } else setSnack(m || "Falha ao reservar.");
    }
  }

  async function onCancel(ev: CulturalEvent) {
    try {
      await cancelEventReservation(ev.id);
      setItems((prev) =>
        prev.map((x) => (x.id === ev.id ? { ...x, reserved: false } : x))
      );
      setSnack("Reserva cancelada.");
    } catch (e: any) {
      setSnack(e?.message || "Falha ao cancelar reserva.");
    }
  }

  const bottomInset = insets.bottom + TABBAR_HEIGHT + 16;

  return (
    <Background>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "transparent",
          paddingHorizontal: 16,
        }}
        edges={["top"]}
      >
        {/* HEADER com possibilidade de colapsar */}
        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          <WhiteCard>
            {/* barra do cabeçalho (toque para colapsar/expandir) */}
            <Pressable
              onPress={toggleCollapsed}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              accessibilityRole="button"
              accessibilityLabel="Expandir/colapsar filtros"
            >
              <View
                style={{
                  flex: 1,
                  paddingRight: 8,
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
                    name="calendar-star"
                    size={20}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                    Eventos culturais
                  </Text>
                  {!collapsed && (
                    <Text style={{ opacity: 0.7, marginTop: -2 }}>
                      Filtra e reserva atividades culturais
                    </Text>
                  )}
                </View>
                {/* contador de resultados */}
                <Chip
                  compact
                  mode="outlined"
                  style={{ borderColor: theme.colors.outlineVariant }}
                >
                  {items.length}
                </Chip>
              </View>
              <IconButton
                icon={collapsed ? "chevron-down" : "chevron-up"}
                onPress={toggleCollapsed}
                accessibilityLabel={collapsed ? "Expandir" : "Colapsar"}
              />
            </Pressable>

            {/* conteúdo dos filtros (esconde quando está colapsado) */}
            {!collapsed && (
              <View style={{ gap: 10, marginTop: 8 }}>
                <TextField
                  placeholder="Pesquisar por título/local/categoria…"
                  value={q}
                  onChangeText={setQ}
                  left={<TextInput.Icon icon="magnify" />}
                />

                {/* Quick range chips com cores do tema */}
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  <FilterChip
                    selected={quick === "hoje"}
                    onPress={() => setQuickRange("hoje")}
                    icon="calendar-today"
                    compact
                  >
                    Hoje
                  </FilterChip>
                  <FilterChip
                    selected={quick === "fds"}
                    onPress={() => setQuickRange("fds")}
                    icon="calendar-weekend"
                    compact
                  >
                    Fim-de-semana
                  </FilterChip>
                  <FilterChip
                    selected={quick === "30"}
                    onPress={() => setQuickRange("30")}
                    icon="calendar-month"
                    compact
                  >
                    30 dias
                  </FilterChip>
                  <FilterChip
                    selected={quick === "custom"}
                    onPress={() => setQuick("custom")}
                    icon="tune-variant"
                    compact
                  >
                    Personalizar
                  </FilterChip>
                </View>

                {quick === "custom" && (
                  <View
                    style={{
                      flexDirection: narrow ? "column" : "row",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <DateTimeField
                        label="De"
                        value={from ? new Date(from + "T00:00:00") : null}
                        onChange={(d) => setFrom(d ? YMD(d) : from)}
                        maximumDate={
                          to ? new Date(to + "T23:59:59") : undefined
                        }
                        style={{ height: 56 }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DateTimeField
                        label="Até"
                        value={to ? new Date(to + "T00:00:00") : null}
                        onChange={(d) => setTo(d ? YMD(d) : to)}
                        minimumDate={
                          from ? new Date(from + "T00:00:00") : undefined
                        }
                        style={{ height: 56 }}
                      />
                    </View>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Checkbox
                    status={onlyBiblioteca ? "checked" : "unchecked"}
                    onPress={() => setOnlyBiblioteca((v) => !v)}
                  />
                  <Text> Só categoria “Biblioteca” </Text>
                </View>
              </View>
            )}
          </WhiteCard>
        </View>

        {/* CONTAINER SCROLLABLE dos eventos (centrado) */}
        <WhiteCard style={{ flex: 1, padding: 12, marginBottom: 8 }}>
          <FlatList
            nestedScrollEnabled
            data={items}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{
              alignItems: "center",
              paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadFirstPage();
                  setRefreshing(false);
                }}
                tintColor={theme.colors.primary}
              />
            }
            renderItem={({ item: ev }) => (
              <EventCard
                ev={ev}
                onReserve={() => onReserve(ev)}
                onCancel={() => onCancel(ev)}
              />
            )}
            ListEmptyComponent={
              loading ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View
                  style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}
                >
                  <Icon
                    name="calendar-search"
                    size={36}
                    color={theme.colors.onSurfaceDisabled}
                  />
                  <Text style={{ opacity: 0.8, textAlign: "center" }}>
                    Não encontrámos eventos no período selecionado
                    {onlyBiblioteca ? " para a categoria Biblioteca" : ""}.
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              nextCursor != null ? (
                <View style={{ paddingTop: 10, alignItems: "center" }}>
                  <View style={{ width: "100%", maxWidth: FEED_MAX_WIDTH }}>
                    <PrimaryButton
                      label={loading ? "A carregar…" : "Carregar mais"}
                      onPress={loadMore}
                      disabled={loading}
                    />
                  </View>
                </View>
              ) : items.length > 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    opacity: 0.6,
                    paddingVertical: 8,
                  }}
                >
                  Fim da lista
                </Text>
              ) : null
            }
            onEndReachedThreshold={0.2}
            onEndReached={() => {
              if (!loading && nextCursor != null) loadMore();
            }}
          />
        </WhiteCard>

        <Snackbar
          visible={!!snack}
          onDismiss={() => setSnack(null)}
          duration={2500}
          action={
            snack?.includes("Falha")
              ? { label: "Tentar de novo", onPress: () => loadFirstPage() }
              : undefined
          }
          style={{ marginBottom: insets.bottom + TABBAR_HEIGHT }}
        >
          {snack}
        </Snackbar>
      </SafeAreaView>
    </Background>
  );
}

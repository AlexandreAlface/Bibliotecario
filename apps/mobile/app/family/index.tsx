/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/family/index.tsx
 * Módulo: Landing da Família — hub de navegação e resumos
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços pedidos:
 * • Comentários completos (PT-PT) e JSDoc nos helpers.
 * • Helpers PUROS (determinísticos) e funções coesas (≤ 30 linhas sempre que possível).
 * • Sem alterações de comportamento: apenas estrutura, comentários e pequenos guards.
 * ============================================================================
 */

import * as React from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { PrimaryButton } from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import {
  EventLite,
  getNextConsultas,
  getProximosEventos,
} from "src/services/events";
import { BookLite, getSugestoes } from "src/services/books";
import { ReadingLite, getLeiturasAtuais } from "src/services/readings";
import { TABBAR_HEIGHT } from "src/constants/layout";

/* =============================================================================
 * Helpers PUROS (determinísticos, sem efeitos colaterais)
 * ========================================================================== */

/**
 * Extrai o “acting child” a partir de várias formas comuns de sessão.
 * Mantém compatibilidade com payloads diferentes do backend.
 */
function resolveActingChild(u: any) {
  if (!u) return null;
  if (u.actingChild) return u.actingChild;
  if (u.acting_child) return u.acting_child;
  if (u.childMode && typeof u.childMode === "object") return u.childMode;

  const id =
    u?.actingChildId ??
    u?.acting_child_id ??
    u?.childModeId ??
    u?.child_mode_id ??
    u?.activeChildId ??
    u?.active_child_id ??
    (typeof u?.childMode === "number" ? u.childMode : null);

  if (id != null && Array.isArray(u?.children)) {
    return u.children.find((c: any) => Number(c?.id) === Number(id)) || { id };
  }
  return null;
}

/** Devolve a primeira palavra (ou string vazia) — útil para headers curtos. */
const firstWord = (s?: string) => (s || "").trim().split(/\s+/)[0] || "";

/** Concatena data e hora opcionais para subtítulos (PURO). */
function joinDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return undefined;
  if (date && time) return `${date} • ${time}`;
  return (date || time || undefined) as string | undefined;
}

/** Constrói subtítulo “evento/consulta” a partir do primeiro item (PURO). */
function firstItemDateSubtitle(
  arr?: { date?: string | null; time?: string | null }[] | null
) {
  const first = Array.isArray(arr) && arr.length ? arr[0] : null;
  return first ? joinDateTime(first.date, first.time) : undefined;
}

/** Título do “hero” (livro em destaque / leitura atual) (PURO). */
function heroTitleFrom(
  isChildMode: boolean,
  sugestoes?: BookLite[] | null,
  leituras?: ReadingLite[] | null
) {
  return isChildMode ? sugestoes?.[0]?.title : leituras?.[0]?.title;
}

/* =============================================================================
 * Secção genérica (título + conteúdo)
 * ========================================================================== */

function Section({
  title,
  children,
  mb = 18,
}: React.PropsWithChildren<{ title: string; mb?: number }>) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: mb }}>
      <Text
        variant="titleMedium"
        style={{
          fontWeight: "700",
          marginBottom: 10,
          color: theme.colors.onSurface,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/* =============================================================================
 * Tile com ícone (quadrícula “Explorar”)
 * ========================================================================== */

function IconTile({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  onPress?: () => void;
}) {
  const theme = useTheme();
  const outline = (theme as any).colors?.outlineVariant ?? "#e6e6e6";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={({ pressed }) => ({
        width: "48%",
        aspectRatio: 1.1,
        borderRadius: 16,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: outline,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Icon name={icon} size={32} color={theme.colors.primary} />
      <Text
        style={{
          marginTop: 10,
          color: theme.colors.onSurface,
          fontWeight: "800",
          fontSize: 16,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={{
            marginTop: 2,
            color: theme.colors.onSurface,
            opacity: 0.7,
            fontSize: 12,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

/* =============================================================================
 * Cartão horizontal informativo (“Para ti”)
 * ========================================================================== */

function InfoCard({
  title,
  subtitle,
  icon,
  cta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  cta?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const outline = (theme as any).colors?.outlineVariant ?? "#e6e6e6";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        width: "100%",
        borderRadius: 16,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: outline,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <Icon name={icon} size={28} color={theme.colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.onSurface,
            fontWeight: "800",
            fontSize: 18,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={{
              color: theme.colors.onSurface,
              opacity: 0.7,
              marginTop: 6,
              fontSize: 13,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
        {!!cta && (
          <Text
            style={{
              color: theme.colors.primary,
              fontWeight: "700",
              marginTop: 10,
              fontSize: 13,
            }}
          >
            {cta} ▸
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/* =============================================================================
 * Página: Landing da Família
 * ========================================================================== */

export default function FamilyLanding() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Sessão: modo criança?
  const actingChild = React.useMemo(() => resolveActingChild(user), [user]);
  const isActingChild = !!actingChild;

  // Etiquetas (fallbacks defensivos)
  const familyLabel =
    (user as any)?.family?.name ||
    (user as any)?.familyName ||
    (user as any)?.householdName ||
    user?.fullName ||
    "Família";

  const childLabel =
    (actingChild as any)?.name ||
    (actingChild as any)?.fullName ||
    (actingChild as any)?.firstName ||
    "Criança";

  // Nome curto no header (não usado mais abaixo mas útil para evoluções)
  const headerName = isActingChild
    ? firstWord(childLabel)
    : firstWord(familyLabel);

  // Dados de “cards” (carregados no efeito)
  const [consultas, setConsultas] = React.useState<EventLite[] | null>(null);
  const [eventos, setEventos] = React.useState<EventLite[] | null>(null);
  const [leituras, setLeituras] = React.useState<ReadingLite[] | null>(null);
  const [sugestoes, setSugestoes] = React.useState<BookLite[] | null>(null);

  // Navegação auxiliar (mantém /family/…)
  const go = React.useCallback(
    (slug: string) => router.push(`/family/${slug}`),
    [router]
  );
  const goToConsultas = React.useCallback(() => go("consultas"), [go]);
  const goToEventos = React.useCallback(() => go("eventos"), [go]);
  const goToLeituras = React.useCallback(() => go("leituras"), [go]);
  const goToSugestoes = React.useCallback(() => go("sugestoes"), [go]);
  const goToConquistas = React.useCallback(() => go("conquistas"), [go]);
  const goToFeed = React.useCallback(() => go("feed"), [go]);

  // Efeito de carregamento dos resumos (com fallbacks “array vazio”)
  React.useEffect(() => {
    (async () => {
      try {
        setConsultas(await getNextConsultas(3));
      } catch {
        setConsultas([]);
      }
      try {
        setEventos(await getProximosEventos(2));
      } catch {
        setEventos([]);
      }
      try {
        if (isActingChild) {
          setSugestoes(await getSugestoes(2));
          setLeituras(null);
        } else {
          const childIdsAll =
            (user?.children || [])
              .map((c: any) => Number(c.id))
              .filter((n: number) => Number.isFinite(n)) || [];
          setLeituras(await getLeiturasAtuais(2, { childIds: childIdsAll }));
          setSugestoes(null);
        }
      } catch {
        if (isActingChild) {
          setSugestoes([]);
          setLeituras(null);
        } else {
          setLeituras([]);
          setSugestoes(null);
        }
      }
    })();
  }, [isActingChild, user?.actingChild?.id, user?.children?.length]);

  // Estilo dos botões (reutilizado)
  const btnStyle = {
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
  } as const;
  const btnLabel = {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  } as const;

  // “Hero” dinâmico: título do primeiro item relevante
  const heroTitle = heroTitleFrom(isActingChild, sugestoes, leituras);

  /** Confirmação de logout (sem alterar fluxo do AuthGate). */
  function confirmLogout() {
    Alert.alert("Terminar sessão", "Queres mesmo sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout?.();
          // AuthGate trata do redirect para /auth/login
        },
      },
    ]);
  }

  // Data “amigável” (ex.: Segunda-feira, 06 de maio)
  const todayStr = React.useMemo(
    () =>
      new Intl.DateTimeFormat("pt-PT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date()),
    []
  );

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: useSafeAreaInsets().bottom + TABBAR_HEIGHT + 12,
            gap: 18,
          }}
        >
          {/* ============================= HEADER ============================= */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                {/* Cumprimento + contexto (família / criança) */}
                <Text
                  variant="titleLarge"
                  style={{ fontWeight: "900", color: theme.colors.onSurface }}
                  numberOfLines={1}
                >
                  Olá, {isActingChild ? childLabel : familyLabel} 👋
                </Text>

                {/* Data actual em PT-PT */}
                <Text style={{ opacity: 0.7, marginTop: 2 }}>
                  {todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}
                </Text>

                {/* Chips de contexto (família + criança quando aplicável) */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {/* Família */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: theme.colors.secondaryContainer,
                    }}
                  >
                    <Icon
                      name="home-account"
                      size={14}
                      color={theme.colors.onSecondaryContainer}
                    />
                    <Text
                      style={{
                        color: theme.colors.onSecondaryContainer,
                        fontWeight: "700",
                      }}
                      numberOfLines={1}
                    >
                      {familyLabel}
                    </Text>
                  </View>

                  {/* Criança (apenas em modo criança) */}
                  {isActingChild && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        backgroundColor: theme.colors.secondaryContainer,
                      }}
                    >
                      <Icon
                        name="account-child"
                        size={14}
                        color={theme.colors.onSecondaryContainer}
                      />
                      <Text
                        style={{
                          color: theme.colors.onSecondaryContainer,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        {childLabel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Ação rápida: terminar sessão */}
              <IconButton
                icon="logout"
                onPress={confirmLogout}
                accessibilityLabel="Terminar sessão"
              />
            </View>
          </FlexibleCard>

          {/* ============================= EXPLORAR ============================= */}
          <Section title="Explorar" mb={0}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                rowGap: 12,
                flexWrap: "wrap",
              }}
            >
              <IconTile
                title="Consultas"
                subtitle={firstItemDateSubtitle(consultas)}
                icon="stethoscope"
                onPress={goToConsultas}
              />

              <IconTile
                title="Eventos"
                subtitle={firstItemDateSubtitle(eventos)}
                icon="ticket-confirmation"
                onPress={goToEventos}
              />

              <IconTile
                title={isActingChild ? "Sugestões" : "Leituras atuais"}
                subtitle={
                  isActingChild ? sugestoes?.[0]?.title : leituras?.[0]?.title
                }
                icon={
                  isActingChild ? "lightbulb-on-outline" : "book-open-variant"
                }
                onPress={isActingChild ? goToSugestoes : goToLeituras}
              />

              <IconTile
                title="Conquistas"
                subtitle="Metas e medalhas"
                icon="star-circle"
                onPress={goToConquistas}
              />
            </View>
          </Section>

          {/* ============================== PARA TI ============================== */}
          <Section title="Para ti" mb={0}>
            <View style={{ gap: 12 }}>
              <InfoCard
                title={
                  isActingChild ? "Livro em destaque" : "Leitura em progresso"
                }
                subtitle={heroTitle}
                icon={isActingChild ? "book-heart" : "book-open-variant"}
                cta={isActingChild ? "Ver sugestões" : "Ver leituras"}
                onPress={isActingChild ? goToSugestoes : goToLeituras}
              />
              <InfoCard
                title="Próximo evento"
                subtitle={
                  // Mostra o 2º evento se existir (mantém a tua lógica original)
                  eventos && eventos[1]
                    ? [eventos[1].title, eventos[1].date, eventos[1].time]
                        .filter(Boolean)
                        .join(" • ")
                    : undefined
                }
                icon="calendar-star"
                cta="Ver evento"
                onPress={goToEventos}
              />
            </View>
          </Section>

          {/* =========================== CONQUISTAS/FEED ========================== */}
          <Section title="Conquistas Recentes">
            <FlexibleCard
              title="Primeira Leitura"
              subtitle="Streak diário"
              backgroundColor="#fff"
              footer={
                <PrimaryButton
                  label="Ver conquistas"
                  fullWidth
                  style={btnStyle}
                  labelStyle={btnLabel}
                  onPress={goToConquistas}
                />
              }
            />
          </Section>

          <Section title="Feed de Notícias & Dicas">
            <FlexibleCard
              title="Biblioterapia"
              subtitle="Descobre ideias e dicas de leitura"
              backgroundColor="#fff"
              footer={
                <PrimaryButton
                  label="Abrir feed"
                  fullWidth
                  style={btnStyle}
                  labelStyle={btnLabel}
                  onPress={goToFeed}
                />
              }
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

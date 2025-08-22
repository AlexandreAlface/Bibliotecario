import * as React from "react";
import { View, ScrollView, Image, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  ReadingLite,
  getLeiturasAtuais,
} from "src/services/readings"; // <-- usa o service de leituras
import { TABBAR_HEIGHT } from "./_layout";

const PLACEHOLDER = "https://picsum.photos/seed/placeholder/800/600";

// perto do topo, junto ao PLACEHOLDER
const IMG_CHILD_MODE =
  "https://resources.finalsite.net/images/v1629226818/usmk12org/sxtynkrkjkr4xi3tpdir/boy-reading.png"; // criança a ler
const IMG_CONSULTAS =
  "https://thumbs.dreamstime.com/b/kid-his-mother-consulting-doctor-hospital-46164214.jpg"; // calendário/agenda


/* ---------------- helpers ---------------- */
function extractRoles(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles
      .map((ur: any) => ur?.role?.name)
      .filter(Boolean) as string[];
  }
  return [];
}

function Section({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
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

/** Tile simples com overlay */
function CategoryTile({
  title,
  subtitle,
  imageUrl,
  onPress,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48%",
        aspectRatio: 1.35,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: theme.colors.secondaryContainer,
        elevation: 2,
      }}
    >
      <Image
        source={{ uri: imageUrl || PLACEHOLDER }}
        resizeMode="cover"
        style={{ width: "100%", height: "100%" }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 10,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              marginTop: 2,
              fontSize: 12,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Card horizontal “para ti” (texto + imagem) */
function ProgramCard({
  title,
  subtitle,
  imageUrl,
  cta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  cta?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: theme.colors.secondaryContainer,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        elevation: 2,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.onSecondaryContainer,
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
              color: theme.colors.onSecondaryContainer,
              opacity: 0.8,
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

      <Image
        source={{ uri: imageUrl || PLACEHOLDER }}
        resizeMode="cover"
        style={{ width: 110, height: 90, borderRadius: 12 }}
      />
    </Pressable>
  );
}

/** Banner “a atuar como criança” — compacto e bonito */
function ActingChildBanner({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: 10,
        borderRadius: 14,
        backgroundColor: theme.colors.secondaryContainer,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primaryContainer,
        }}
      >
        <Icon
          name="account-child-circle"
          size={22}
          color={theme.colors.primary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, opacity: 0.8 }}>A atuar como</Text>
        <Text style={{ fontWeight: "800" }}>{name}</Text>
      </View>

      <Pressable
        onPress={onClear}
        style={{
          paddingHorizontal: 12,
          height: 32,
          borderRadius: 999,
          backgroundColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: "700" }}>
          Modo família
        </Text>
      </Pressable>
    </View>
  );
}

/* ---------------- page ---------------- */
export default function Landing() {
  const theme = useTheme();
  const router = useRouter();
  const { user, clearChild } = useAuth();
  const insets = useSafeAreaInsets();

  const firstName = user?.fullName?.split(" ")[0] ?? "Leitor";

  const roles = React.useMemo(() => extractRoles(user), [user]);
  const role = user?.actingChild ? "CRIANÇA" : roles[0] ?? "FAMÍLIA";

  const [consultas, setConsultas] = React.useState<EventLite[] | null>(null);
  const [eventos, setEventos] = React.useState<EventLite[] | null>(null);
  const [leituras, setLeituras] = React.useState<ReadingLite[] | null>(null);
  const [sugestoes, setSugestoes] = React.useState<BookLite[] | null>(null);

  React.useEffect(() => {
    (async () => {
      // Próximas consultas
      try {
        setConsultas(await getNextConsultas(3));
      } catch {
        setConsultas([
          { id: 1, title: "Consulta 1", date: "15/07", time: "11:00" },
          { id: 2, title: "Consulta 2", date: "15/07", time: "15:00" },
          { id: 3, title: "Consulta 3", date: "15/07", time: "17:00" },
        ]);
      }

      // Eventos
      try {
        setEventos(await getProximosEventos(2));
      } catch {
        setEventos([
          { id: 99, title: "Hora do conto", date: "Hoje", time: "11:00" },
          {
            id: 100,
            title: "Oficina de Leitura",
            date: "Amanhã",
            time: "15:00",
          },
        ]);
      }

      // Sugestões (modo criança) OU Leituras atuais (modo família)
      try {
        if (role === "CRIANÇA") {
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
        if (role === "CRIANÇA") {
          setSugestoes([
            { id: "1", title: "Harry Potter" },
            { id: "2", title: "O Pequeno Príncipe" },
          ]);
          setLeituras(null);
        } else {
          setLeituras([
            { id: 1, childId: 1, isbn: "x", title: "O Pequeno Príncipe" },
            {
              id: 2,
              childId: 2,
              isbn: "y",
              title: "Diário de um Banana",
              date: "10/07",
            },
          ]);
          setSugestoes(null);
        }
      }
    })();
    // refaz quando muda o modo/child selecionado
  }, [role, user?.actingChild?.id, user?.children?.length]);

  // botões compactos
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

  const canActAsChild =
    !user?.actingChild &&
    Array.isArray(user?.children) &&
    user!.children!.length > 0;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 10, 18),
          paddingBottom: insets.bottom + TABBAR_HEIGHT + 12,
          gap: 18,
        }}
      >
        {/* Banner de “a atuar como criança” */}
        {user?.actingChild && (
          <ActingChildBanner
            name={user.actingChild.name}
            onClear={clearChild}
          />
        )}

        {/* Header */}
        <View>
          <Text
            variant="titleLarge"
            style={{
              color: theme.colors.onSurface,
              fontWeight: "800",
            }}
          >
            Olá, {firstName}
          </Text>
        </View>

        {/* Explorar */}
        <Section title="Explorar">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              rowGap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* família -> escolher criança */}
            {canActAsChild && (
              <CategoryTile
                title="Entrar como criança"
                subtitle="Escolher perfil"
                imageUrl={IMG_CHILD_MODE}
                onPress={() => router.push("/choose-child")}
              />
            )}

            <CategoryTile
              title="Consultas"
              subtitle={
                consultas?.[0]
                  ? `${consultas[0].date}${
                      consultas[0].time ? " • " + consultas[0].time : ""
                    }`
                  : "Próximas marcações"
              }
              imageUrl={IMG_CONSULTAS}
              onPress={() => {}}
            />

            <CategoryTile
              title={eventos?.[0]?.title || "Eventos"}
              subtitle={`${eventos?.[0]?.date || ""}${
                eventos?.[0]?.time ? " • " + eventos[0].time : ""
              }`}
              imageUrl={eventos?.[0]?.imageUrl || PLACEHOLDER}
              onPress={() => {}}
            />

            <CategoryTile
              title={role === "CRIANÇA" ? "Sugestões" : "Leituras atuais"}
              subtitle={
                role === "CRIANÇA"
                  ? sugestoes?.[0]?.title || ""
                  : leituras?.[0]?.title || ""
              }
              imageUrl={
                role === "CRIANÇA"
                  ? sugestoes?.[0]?.coverUrl || PLACEHOLDER
                  : leituras?.[0]?.coverUrl || PLACEHOLDER
              }
              onPress={() => {}}
            />
          </View>
        </Section>

        {/* Para ti */}
        <Section title="Para ti">
          <View style={{ gap: 12 }}>
            <ProgramCard
              title={
                role === "CRIANÇA"
                  ? "Livro em destaque"
                  : "Leitura em progresso"
              }
              subtitle={
                role === "CRIANÇA"
                  ? sugestoes?.[0]?.title ?? "Descobre novas aventuras"
                  : leituras?.[0]?.title ?? "Continua a tua leitura"
              }
              imageUrl={
                role === "CRIANÇA"
                  ? sugestoes?.[0]?.coverUrl
                  : leituras?.[0]?.coverUrl
              }
              cta={role === "CRIANÇA" ? "Reservar" : "Ver detalhes"}
              onPress={() => {}}
            />
            <ProgramCard
              title={eventos?.[1]?.title || "Próximo evento"}
              subtitle={`${eventos?.[1]?.date || ""}${
                eventos?.[1]?.time ? " • " + eventos[1].time : ""
              }`}
              imageUrl={eventos?.[1]?.imageUrl}
              cta="Ver evento"
              onPress={() => {}}
            />
          </View>
        </Section>

        {/* Blocos finais */}
        <Section title="Conquistas Recentes">
          <FlexibleCard
            title="Primeira Leitura"
            subtitle="3 livros numa semana · Streak diário"
            backgroundColor={theme.colors.secondaryContainer}
            footer={
              <PrimaryButton
                fullWidth
                style={btnStyle}
                labelStyle={btnLabel}
                onPress={() => {}}
              >
                Ver conquistas
              </PrimaryButton>
            }
          />
        </Section>

        <Section title="Feed de Notícias & Dicas">
          <FlexibleCard
            title="Biblioterapia"
            subtitle="Ler antes de dormir ajuda a acalmar a mente…"
            backgroundColor={theme.colors.secondaryContainer}
            footer={
              <PrimaryButton
                fullWidth
                style={btnStyle}
                labelStyle={btnLabel}
                onPress={() => {}}
              >
                Abrir feed
              </PrimaryButton>
            }
          />
        </Section>
      </ScrollView>
    </Background>
  );
}

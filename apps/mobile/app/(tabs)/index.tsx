import * as React from "react";
import { View, ScrollView, Image, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { PrimaryButton } from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import {
  EventLite,
  getNextConsultas,
  getProximosEventos,
} from "src/services/events";
import { BookLite, getLeiturasAtuais, getSugestoes } from "src/services/books";

import { TABBAR_HEIGHT } from "./_layout";

const PLACEHOLDER = "https://picsum.photos/seed/placeholder/800/600";

// ------- helpers -------
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
          textShadowColor: "transparent",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Tile de categoria com imagem e overlay (estilo “Aaptiv”) */
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
      {/* overlay gradiente simples sem deps: um véu escuro no fundo */}
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

export default function Landing() {
  const theme = useTheme();
  const { user, clearChild } = useAuth();
  const insets = useSafeAreaInsets();

  const firstName = user?.fullName?.split(" ")[0] ?? "Leitor";

  // roles podem vir como user.roles: string[] OU user.userRoles: [{role: {name}}]
  const roles = React.useMemo(() => extractRoles(user), [user]);
  // se estiver a atuar como criança, força "CRIANÇA"
  const role = user?.actingChild ? "CRIANÇA" : (roles[0] ?? "FAMÍLIA");

  console.log("Rendering Landing with roles:", roles, "actingChild:", user?.actingChild?.name);

  const [consultas, setConsultas] = React.useState<EventLite[] | null>(null);
  const [eventos, setEventos] = React.useState<EventLite[] | null>(null);
  const [leituras, setLeituras] = React.useState<BookLite[] | null>(null);
  const [sugestoes, setSugestoes] = React.useState<BookLite[] | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setConsultas(await getNextConsultas(3));
      } catch {
        setConsultas([
          { id: 1, title: "Consulta 1", date: "15/07", time: "11:00" },
          { id: 2, title: "Consulta 2", date: "15/07", time: "15:00" },
          { id: 3, title: "Consulta 3", date: "15/07", time: "17:00" },
        ]);
      }

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

      try {
        if (role === "CRIANÇA") setSugestoes(await getSugestoes(2));
        else setLeituras(await getLeiturasAtuais(2));
      } catch {
        if (role === "CRIANÇA")
          setSugestoes([
            { id: "1", title: "Harry Potter" },
            { id: "2", title: "O Pequeno Príncipe" },
          ]);
        else
          setLeituras([
            { id: "1", title: "O Pequeno Príncipe" },
            { id: "2", title: "Diário de um Banana", date: "10/07" },
          ]);
      }
    })();
  }, [role]);

  // estilos compactos para botões (aplicados nos FlexibleCard do fim)
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
        {user?.actingChild && (
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: theme.colors.secondaryContainer,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text>
              Ativo como{" "}
              <Text style={{ fontWeight: "800" }}>{user.actingChild.name}</Text>
            </Text>
            <PrimaryButton compact onPress={clearChild}>
              Modo família
            </PrimaryButton>
          </View>
        )}

        {/* Header simples */}
        <View>
          <Text
            variant="titleLarge"
            style={{
              color: theme.colors.onSurface,
              textShadowColor: "transparent",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 0,
              fontWeight: "800",
            }}
          >
            Olá, {firstName}
          </Text>
        </View>

        {/* Grelha de categorias */}
        <Section title="Explorar">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              rowGap: 12,
              flexWrap: "wrap",
            }}
          >
            <CategoryTile
              title="Consultas"
              subtitle={
                consultas?.[0]
                  ? `${consultas[0].date}${
                      consultas[0].time ? " • " + consultas[0].time : ""
                    }`
                  : "Próximas marcações"
              }
              imageUrl={PLACEHOLDER}
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
            <CategoryTile
              title={
                role === "CRIANÇA"
                  ? sugestoes?.[1]?.title || "Ver mais"
                  : leituras?.[1]?.title || "Ver mais"
              }
              subtitle={
                role === "CRIANÇA"
                  ? undefined
                  : leituras?.[1]?.date || undefined
              }
              imageUrl={
                role === "CRIANÇA"
                  ? sugestoes?.[1]?.coverUrl || PLACEHOLDER
                  : leituras?.[1]?.coverUrl || PLACEHOLDER
              }
              onPress={() => {}}
            />
          </View>
        </Section>

        {/* Programas / Para ti */}
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

        {/* Blocos finais (reutiliza FlexibleCard com botões compactos) */}
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

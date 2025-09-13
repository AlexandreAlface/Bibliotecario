// apps/mobile/app/(tabs)/consultas.tsx
// - WhiteCard: um para filtros/ação + cada item da lista em card
// - Botões compactos: compact
// - Mantém children={undefined}

import * as React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { useTheme } from "react-native-paper";
import { useAuth } from "src/contexts/AuthContext";
import { consultationsApi, ConsultationLite } from "src/services/consultations";

type TabKey = "next" | "past";
type Chip = { id: number | null; name: string };

function fmt(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

export default function ConsultasScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [tab, setTab] = React.useState<TabKey>("next");
  const [childId, setChildId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<ConsultationLite[]>([]);

  const chips: Chip[] = [
    { id: null, name: "Todos" },
    ...(user?.children ?? []).map((c) => ({ id: c.id, name: c.name })),
  ];

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const params =
          tab === "next"
            ? {
                familyId: user.id,
                childId: childId ?? undefined,
                status: "PENDING,CONFIRMED",
                from: nowIso,
                order: "asc",
                limit: 100,
              }
            : {
                familyId: user.id,
                childId: childId ?? undefined,
                to: nowIso,
                order: "desc",
                limit: 100,
              };

        const q = Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
          )
          .join("&");
        const url = `/consultations/all?${q}`;
        const { API_URL } = await import("src/services/api");
        const data = (await fetch(API_URL + url, {
          credentials: "include",
        }).then((r) => r.json())) as ConsultationLite[];

        if (alive) setItems(data);
      } catch (e) {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, childId, user?.id]);

  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "600",
            color: theme.colors.onBackground,
          }}
        >
          Consultas
        </Text>

        {/* WhiteCard: filtros e ações */}
        <FlexibleCard
          title="Filtros"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <SecondaryButton
              compact
              label="Próximas"
              onPress={() => setTab("next")}
              children={undefined}
            />
            <SecondaryButton
              compact
              label="Anteriores"
              onPress={() => setTab("past")}
              children={undefined}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {chips.map((ch) => {
              const active = (ch.id ?? null) === childId;
              return (
                <TouchableOpacity
                  key={String(ch.id ?? "all")}
                  onPress={() => setChildId(ch.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.secondaryContainer,
                  }}
                >
                  <Text
                    style={{
                      color: active
                        ? theme.colors.onPrimary
                        : theme.colors.onSecondaryContainer,
                    }}
                  >
                    {ch.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              compact
              label="Agendar Consulta"
              onPress={() => {
                /* navegação para Agenda se necessário */
              }}
              children={undefined}
            />
          </View>
        </FlexibleCard>

        {/* WhiteCard: lista de consultas */}
        <FlexibleCard
          title={tab === "next" ? "Próximas" : "Anteriores"}
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={12}
          style={{ borderRadius: 12 }}
        >
          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => String(it.id)}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <FlexibleCard
                  backgroundColor={theme.colors.surface}
                  elevation={0}
                  padding={14}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.colors.onSurface,
                    }}
                  >
                    {item.title || "Consulta"}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    {fmt(item.startAt)}{" "}
                    {item.librarianName ? `• ${item.librarianName}` : ""}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Estado: {item.status}
                  </Text>
                </FlexibleCard>
              )}
            />
          )}
        </FlexibleCard>
      </ScrollView>
    </Background>
  );
}

/**
 * ============================================================================
 *  Ecrã: apps/mobile/app/profiles/index.tsx
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Objetivo:
 *   - Permitir à família escolher atuar como "Família" ou como uma das crianças.
 *
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos em PT-PT.
 *   • Helpers **puros**, curtos e testáveis (ex.: geração da lista, initials).
 *   • Funções e componentes ≤ 30 linhas, focados e coesos.
 *   • Tipagem explícita e defensiva.
 * ============================================================================
 */

import * as React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Image,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  useTheme,
  Avatar,
  Badge,
  Snackbar,
  Button,
} from "react-native-paper";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import { useAuth } from "src/contexts/AuthContext";

/* ============================ Tipos & UI ============================ */

/** Item do grid de seleção de perfil. */
type Item =
  | { kind: "FAMILY" }
  | {
      kind: "CHILD";
      id: number;
      name?: string | null;
      avatarUrl?: string | null;
    };

/** Cartão branco reutilizável (apenas UI). */
const WhiteCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor:
            (theme as any).colors.outlineVariant ?? "rgba(0,0,0,0.12)",
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

/* ============================ Helpers PUROS ============================ */

/** Constrói a lista de itens a partir do utilizador. (PURO) */
function buildItems(user: any | null | undefined): Item[] {
  const kids = Array.isArray(user?.children) ? user!.children : [];
  const childItems: Item[] = kids.map((c: any) => ({
    kind: "CHILD",
    id: Number(c.id),
    name: c.name ?? null,
    avatarUrl: c.avatarUrl ?? null,
  }));
  return [{ kind: "FAMILY" } as Item].concat(childItems);
}

/** Devolve a key de seleção atual (PURO). */
function selectedKeyFromUser(user: any | null | undefined): string {
  return user?.actingChild?.id != null
    ? `child:${user.actingChild.id}`
    : "family";
}

/** Key estável por item (PURO). */
function keyForItem(it: Item): string {
  return it.kind === "FAMILY" ? "family" : `child:${it.id}`;
}

/** Inicials a partir do nome (PURO). */
function initialsFromName(name?: string | null): string {
  const parts = String(name || "C")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/* ======================= Tiles (componentes pequenos) ======================= */

type FamilyTileProps = {
  selected: boolean;
  busy: boolean;
  onPress: () => void;
};
const FamilyTile: React.FC<FamilyTileProps> = ({ selected, busy, onPress }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48%",
        borderRadius: 16,
        backgroundColor: theme.colors.secondaryContainer,
        alignItems: "center",
        paddingVertical: 18,
        gap: 8,
      }}
    >
      <Avatar.Icon size={76} icon="account-heart" />
      <Text style={{ fontWeight: "700" }}>Família</Text>
      {selected && (
        <Badge style={{ position: "absolute", top: 10, right: 10 }}>
          Atual
        </Badge>
      )}
      {busy && <ActivityIndicator style={{ marginTop: 6 }} />}
    </Pressable>
  );
};

type ChildTileProps = {
  id: number;
  name?: string | null;
  avatarUrl?: string | null;
  selected: boolean;
  busy: boolean;
  onPress: () => void;
};
const ChildTile: React.FC<ChildTileProps> = ({
  id,
  name,
  avatarUrl,
  selected,
  busy,
  onPress,
}) => {
  const theme = useTheme();
  const initials = initialsFromName(name);
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48%",
        borderRadius: 16,
        backgroundColor: theme.colors.secondaryContainer,
        alignItems: "center",
        paddingVertical: 18,
        gap: 8,
      }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 76, height: 76, borderRadius: 38 }}
        />
      ) : (
        <Avatar.Text size={76} label={initials} />
      )}
      <Text style={{ fontWeight: "700" }} numberOfLines={1}>
        {name || "Criança"}
      </Text>
      {selected && (
        <Badge style={{ position: "absolute", top: 10, right: 10 }}>
          Atual
        </Badge>
      )}
      {busy && <ActivityIndicator style={{ marginTop: 6 }} />}
    </Pressable>
  );
};

/* ============================== Ecrã principal ============================== */

function ProfilesScreen() {
  const { user, actAsChild, clearChild, refresh } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [busyId, setBusyId] = React.useState<string | number | null>(null);
  const [snack, setSnack] = React.useState<string | null>(null);

  // Lista derivada (PURO) + chave selecionada atual
  const items = React.useMemo(() => buildItems(user), [user]);
  const selectedKey = React.useMemo(() => selectedKeyFromUser(user), [user]);

  /** Trocar para perfil Família (curto e com feedback visual). */
  async function pickFamily() {
    try {
      setBusyId("family");
      await clearChild();
      await refresh();
      router.replace("/family");
    } catch (e: any) {
      setSnack(e?.message || "Não foi possível mudar para Família.");
    } finally {
      setBusyId(null);
    }
  }

  /** Trocar para uma criança (curto e com feedback visual). */
  async function pickChild(id: number) {
    try {
      setBusyId(id);
      await actAsChild(id);
      await refresh();
      router.replace("/family");
    } catch (e: any) {
      setSnack(e?.message || "Não foi possível mudar para este perfil.");
    } finally {
      setBusyId(null);
    }
  }

  /** Render de cada item (Family/Child) — delega para tiles pequenos. */
  const renderItem = ({ item }: { item: Item }) => {
    const isSelected =
      item.kind === "FAMILY"
        ? selectedKey === "family"
        : selectedKey === keyForItem(item);

    if (item.kind === "FAMILY") {
      return (
        <FamilyTile
          selected={isSelected}
          busy={busyId === "family"}
          onPress={pickFamily}
        />
      );
    }

    return (
      <ChildTile
        id={item.id}
        name={item.name}
        avatarUrl={item.avatarUrl ?? undefined}
        selected={isSelected}
        busy={busyId === item.id}
        onPress={() => pickChild(item.id)}
      />
    );
  };

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 12 }}>
          <WhiteCard>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: "900", marginBottom: 8 }}
            >
              Escolhe o teu perfil
            </Text>
            <Text style={{ opacity: 0.7 }}>
              Atua como <Text style={{ fontWeight: "700" }}>Família</Text> ou
              como uma das tuas{" "}
              <Text style={{ fontWeight: "700" }}>crianças</Text>.
            </Text>
          </WhiteCard>

          <WhiteCard>
            <FlatList
              data={items}
              keyExtractor={keyForItem}
              columnWrapperStyle={{
                justifyContent: "space-between",
                marginBottom: 12,
              }}
              numColumns={2}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text style={{ opacity: 0.7, textAlign: "center" }}>
                  Ainda não tens crianças associadas.
                </Text>
              }
            />
            <Button
              mode="text"
              icon="account-plus"
              onPress={() => {}}
              style={{ alignSelf: "center", marginTop: 4 }}
            >
              Gerir crianças
            </Button>
          </WhiteCard>
        </View>

        <Snackbar
          visible={!!snack}
          onDismiss={() => setSnack(null)}
          duration={2500}
        >
          {snack}
        </Snackbar>
      </SafeAreaView>
    </Background>
  );
}

export default ProfilesScreen;

/* ============================== Fim do ficheiro =============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */

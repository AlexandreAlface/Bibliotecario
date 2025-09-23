// apps/mobile/app/profiles/index.tsx
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

type Item =
  | { kind: "FAMILY" }
  | {
      kind: "CHILD";
      id: number;
      name?: string | null;
      avatarUrl?: string | null;
    };

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

function ProfilesScreen() {
  const { user, actAsChild, clearChild, refresh } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [busyId, setBusyId] = React.useState<string | number | null>(null);
  const [snack, setSnack] = React.useState<string | null>(null);

  const items: Item[] = React.useMemo(() => {
    const children = user?.children ?? [];
    return [{ kind: "FAMILY" } as Item].concat(
      children.map((c) => ({
        kind: "CHILD",
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
      }))
    );
  }, [user]);

  const selectedKey =
    user?.actingChild?.id != null ? `child:${user.actingChild.id}` : "family";

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

  const renderItem = ({ item }: { item: Item }) => {
    const isSelected =
      item.kind === "FAMILY"
        ? selectedKey === "family"
        : selectedKey === `child:${item.id}`;

    if (item.kind === "FAMILY") {
      return (
        <Pressable
          onPress={pickFamily}
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
          {isSelected && (
            <Badge style={{ position: "absolute", top: 10, right: 10 }}>
              Atual
            </Badge>
          )}
          {busyId === "family" && (
            <ActivityIndicator style={{ marginTop: 6 }} />
          )}
        </Pressable>
      );
    }

    const initials = (item.name || "C")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("");
    return (
      <Pressable
        onPress={() => pickChild(item.id)}
        style={{
          width: "48%",
          borderRadius: 16,
          backgroundColor: theme.colors.secondaryContainer,
          alignItems: "center",
          paddingVertical: 18,
          gap: 8,
        }}
      >
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={{ width: 76, height: 76, borderRadius: 38 }}
          />
        ) : (
          <Avatar.Text size={76} label={initials} />
        )}
        <Text style={{ fontWeight: "700" }} numberOfLines={1}>
          {item.name || "Criança"}
        </Text>
        {isSelected && (
          <Badge style={{ position: "absolute", top: 10, right: 10 }}>
            Atual
          </Badge>
        )}
        {busyId === item.id && <ActivityIndicator style={{ marginTop: 6 }} />}
      </Pressable>
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
              keyExtractor={(it) =>
                it.kind === "FAMILY" ? "family" : `child:${it.id}`
              }
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

import * as React from "react";
import { View, Image, Pressable, FlatList } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import { useAuth } from "src/contexts/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

const avatar = (id: number) => `https://i.pravatar.cc/160?u=${id}`;

export default function ChooseChild() {
  const { user, actAsChild } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const children = user?.children ?? [];

  return (
    <SafeAreaProvider>
      <Background>
        <View style={{ padding: 16, paddingTop: 28, marginTop: 32 }}>
          <Text
            variant="titleLarge"
            style={{ fontWeight: "800", marginBottom: 12 }}
          >
            Escolhe a criança
          </Text>

          <FlatList
            data={children}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={{
              justifyContent: "space-between",
              marginBottom: 12,
            }}
            renderItem={({ item }) => (
              <Pressable
                onPress={async () => {
                  await actAsChild(item.id);
                  router.replace("/(tabs)");
                }}
                style={{
                  width: "48%",
                  borderRadius: 16,
                  backgroundColor: theme.colors.secondaryContainer,
                  alignItems: "center",
                  paddingVertical: 18,
                  gap: 8,
                }}
              >
                <Image
                  source={{ uri: item.avatarUrl || avatar(item.id) }}
                  style={{ width: 76, height: 76, borderRadius: 38 }}
                />
                <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: "700" }}
                >
                  Entrar ▸
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ opacity: 0.7, marginTop: 8 }}>
                Esta família ainda não tem crianças associadas.
              </Text>
            }
          />
        </View>
      </Background>
    </SafeAreaProvider>
  );
}

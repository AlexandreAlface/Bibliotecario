/**
 * =============================================================================
 *  Módulo: apps/mobile/app/profiles/index.tsx  (ChooseChild)
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Objetivo:
 *   - Ecrã de seleção de criança para ativar o “Child Mode”.
 *
 *  Reforços aplicados:
 *   • Comentários/JSDoc em PT-PT.
 *   • Métodos **puros** utilitários (ex.: avatarUrl).
 *   • Funções curtas (≤ 30 linhas) e coesas.
 *   • Estilos memoizados via StyleSheet (evita objetos inline a cada render).
 *   • Tipagem explícita dos dados da criança.
 * =============================================================================
 */

import * as React from "react";
import { View, Image, Pressable, FlatList, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import { useAuth } from "src/contexts/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { JSX } from "react";

/** Representa o mínimo necessário para renderizar a criança. */
type ChildLite = { id: number; name: string; avatarUrl?: string | null };

/**
 * Gera um avatar estável (seed por id) quando não existe `avatarUrl`.
 * Função **pura**: não tem efeitos, mesmo input → mesmo output.
 */
function avatarUrl(id: number): string {
  return `https://i.pravatar.cc/160?u=${id}`;
}

/**
 * Cartão “tocável” de criança (puro, sem efeitos).
 * Mantém-se curto e focado em UI; comportamentos vêm por props.
 */
function ChildCard({
  child,
  onPress,
}: {
  child: ChildLite;
  onPress: (id: number) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onPress(child.id)} style={[S.card, { backgroundColor: theme.colors.secondaryContainer }]}>
      <Image
        source={{ uri: child.avatarUrl || avatarUrl(child.id) }}
        style={S.avatar}
      />
      <Text style={S.name}>{child.name}</Text>
      <Text style={[S.cta, { color: theme.colors.primary }]}>Entrar ▸</Text>
    </Pressable>
  );
}

/**
 * Ecrã de seleção de criança:
 * - Lê as crianças do utilizador autenticado.
 * - Ao tocar, ativa o Child Mode e redireciona para /family.
 */
function ChooseChild(): JSX.Element {
  const { user, actAsChild } = useAuth();
  const router = useRouter();
  const children: ChildLite[] = user?.children ?? [];

  // handler curto e direto (efeito controlado)
  const handleSelect = React.useCallback(
    async (childId: number) => {
      await actAsChild(childId);
      router.replace("/family");
    },
    [actAsChild, router]
  );

  return (
    <SafeAreaProvider>
      <Background>
        <View style={S.container}>
          <Text variant="titleLarge" style={S.title}>
            Escolhe a criança
          </Text>

          <FlatList
            data={children}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={S.row}
            renderItem={({ item }) => (
              <ChildCard child={item} onPress={handleSelect} />
            )}
            ListEmptyComponent={
              <Text style={S.empty}>
                Esta família ainda não tem crianças associadas.
              </Text>
            }
            contentContainerStyle={children.length ? undefined : S.listEmpty}
          />
        </View>
      </Background>
    </SafeAreaProvider>
  );
}

/* --------------------------- Estilos memoizados --------------------------- */
const S = StyleSheet.create({
  container: { padding: 16, paddingTop: 28, marginTop: 32 },
  title: { fontWeight: "800", marginBottom: 12 },
  row: { justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: "48%",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 18,
    gap: 8,
  },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  name: { fontWeight: "700", textAlign: "center" },
  cta: { fontWeight: "700" },
  empty: { opacity: 0.7, marginTop: 8, textAlign: "center" },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
});

export default React.memo(ChooseChild);

/* ============================== Fim do ficheiro =============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */

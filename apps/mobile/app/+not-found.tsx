/**
 * =============================================================================
 *  Módulo: apps/mobile/app/(routes)/_not-found.tsx  (ou app/+not-found.tsx)
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Objetivo:
 *   - Ecrã simples para rotas inexistentes no Expo Router.
 *
 *  Reforços aplicados:
 *   • Comentários e JSDoc em PT-PT.
 *   • Função **pura** e curta (≤ 30 linhas) — apenas render UI.
 *   • Estilos memoizados via StyleSheet (evita objetos inline a cada render).
 * =============================================================================
 */

import * as React from "react";
import { Link } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { JSX } from "react";

/**
 * Componente “NotFound”
 * - Mostra uma mensagem clara e um atalho para o ecrã de login.
 * - Não tem efeitos laterais: **puro** (apenas renderiza).
 */
function NotFound(): JSX.Element {
  return (
    <View style={S.root}>
      <Text style={S.title}>Rota não encontrada</Text>
      {/* Link do Expo Router — navega para a rota de login */}
      <Link href="/auth/login" style={S.link}>
        Ir para Login
      </Link>
    </View>
  );
}

/* Estilos memoizados — evita recriar objetos a cada render */
const S = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  link: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default React.memo(NotFound);

/* ============================== Fim do ficheiro =============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */

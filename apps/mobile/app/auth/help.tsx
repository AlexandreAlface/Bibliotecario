/**
 * =====================================================================
 * Ficheiro: app/how-it-works.tsx
 * Módulo: Ecrã “Como funciona?” com passos e CTAs
 * Autor: Alexandre Brissos – Nº 21131
 * ---------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * =====================================================================
 */

import * as React from "react";
import { ScrollView, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text, IconButton, useTheme, Surface, Button } from "react-native-paper";
import { Background } from "@bibliotecario/ui-mobile";

/** =====================================================================
 * Helpers PUROS (sem efeitos)
 * ===================================================================== */

/** Testa se o valor é uma string não vazia. */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Normaliza o parâmetro `next` oriundo da querystring. */
function normalizeNextParam(next: unknown): string | undefined {
  return isNonEmptyString(next) ? next : undefined;
}

/** Label do CTA principal em função da existência de `next`. */
function getPrimaryCtaLabel(hasNext: boolean): string {
  return hasNext ? "Continuar" : "Voltar";
}

/** Navegação do CTA principal (mantém comportamento). */
function handlePrimaryPress(router: ReturnType<typeof useRouter>, next?: string): void {
  if (isNonEmptyString(next)) router.replace(next);
  else router.back();
}

/** =====================================================================
 * UI: Cartão de passo (número + título + descrição)
 * ===================================================================== */

/**
 * Cartão visual de um passo do fluxo.
 * @param props.step        Número do passo (1-based).
 * @param props.title       Título conciso do passo.
 * @param props.description Descrição breve do passo.
 */
function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      <Surface
        elevation={1}
        style={{
          borderRadius: 24,
          paddingTop: 28,
          paddingBottom: 20,
          paddingHorizontal: 16,
          backgroundColor: theme.colors.surface,
        }}
      >
        {/* Badge circular do número do passo (sobreposto) */}
        <View
          style={{
            position: "absolute",
            top: -22,
            alignSelf: "center",
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 4,
            borderColor: theme.colors.surface,
          }}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onPrimary, fontWeight: "700" }}>
            {step}
          </Text>
        </View>

        {/* Sub-cartão interior suave (conforme Figma) */}
        <Surface
          elevation={0}
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 18,
            padding: 16,
            marginTop: 12, // espaço entre badge e card
          }}
        >
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: "700",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: "center" }}>
            {description}
          </Text>
        </Surface>
      </Surface>
    </View>
  );
}

/** =====================================================================
 * Página: “Como funciona?”
 * ===================================================================== */

type HowItWorksParams = { next?: string };

/**
 * Ecrã explicativo com 2 passos e CTAs de continuidade/retorno.
 * Mantém navegação original, com guards para o parâmetro `next`.
 */
export default function HowItWorks() {
  const router = useRouter();
  const theme = useTheme();

  // Se vieres de algum fluxo (ex.: signup), podes passar ?next=/auth/signup
  const { next } = useLocalSearchParams<HowItWorksParams>();
  const normalizedNext = normalizeNextParam(next);
  const hasNext = isNonEmptyString(normalizedNext);

  return (
    <Background center={0.72}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 20,
          marginTop: 16,
        }}
      >
        {/* Topo: Back + espaçador (título fora) */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={{ marginLeft: -8 }}
            iconColor={theme.colors.onPrimary} // seta branca
            accessibilityLabel="Voltar"
          />
          <View style={{ flex: 1 }} />
        </View>

        {/* Título do ecrã */}
        <Text
          variant="headlineLarge"
          style={{
            color: theme.colors.onPrimary,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: 18,
            marginTop: 6,
          }}
        >
          Como funciona?
        </Text>

        {/* Passos */}
        <StepCard
          step={1}
          title="Dados da Família"
          description="Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos."
        />
        <StepCard
          step={2}
          title="Perfil das Crianças"
          description="Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receberes sugestões perfeitas."
        />

        {/* CTAs em baixo */}
        <View style={{ marginTop: 12 }}>
          <Button
            mode="contained"
            onPress={() => handlePrimaryPress(router, normalizedNext)}
            style={{ borderRadius: 24 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            {getPrimaryCtaLabel(hasNext)}
          </Button>

          <Button onPress={() => router.push("/auth/signup")} style={{ marginTop: 8 }} textColor={theme.colors.onPrimary}>
            Criar conta
          </Button>
        </View>
      </ScrollView>
    </Background>
  );
}

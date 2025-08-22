import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";

/**
 * Cartão de passo (Step) com um círculo destacado no topo a mostrar o número do passo.
 * Ideal para onboarding/explicações de fluxo.
 *
 * Acessibilidade:
 * - O container tem role="summary" e label com "Passo X: Título".
 */
export type StepCardProps = {
  /** Número do passo exibido no círculo. */
  step: number;
  /** Título do passo. */
  title: string;
  /** Descrição opcional por baixo do título. */
  description?: string;

  /** Cor do círculo/acento (default: theme.colors.primary). */
  accentColor?: string;
  /** Cor de fundo suave do cartão (default: tonalidade do tema). */
  backgroundColor?: string;

  /** Diâmetro do círculo (default: 64). */
  circleSize?: number;
  /** Elevação do cartão (0–5, default: 1). */
  elevation?: MD3Elevation;

  /** Estilo extra do wrapper externo. */
  style?: ViewStyle;
  /** Accessibility label opcional. */
  accessibilityLabel?: string;
};

const StepCard: React.FC<StepCardProps> = ({
  step,
  title,
  description,
  accentColor,
  backgroundColor,
  circleSize = 64,
  elevation = 1 as MD3Elevation,
  style,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const circleBg = accentColor ?? theme.colors.primary;
  const cardBg =
    backgroundColor ??
    // tom clarinho a partir do secondaryContainer (fica “lavanda” na maioria dos temas)
    (theme.colors.secondaryContainer ?? theme.colors.surface);

  return (
    <View
      style={[styles.wrapper, style]}
      accessibilityRole="summary"
      accessibilityLabel={
        accessibilityLabel ?? `Passo ${step}: ${title}${description ? ". " + description : ""}`
      }
    >
      {/* Círculo que “morde” o cartão */}
      <View
        style={[
          styles.badge,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: circleBg,
            // “borda” branca para dar recorte do cartão (como nas tuas prints)
            borderWidth: 6,
            borderColor: "#fff",
          },
        ]}
        accessible={false}
      >
        <Text
          variant="headlineSmall"
          style={{ color: "#fff", fontWeight: "700" }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {step}
        </Text>
      </View>

      {/* Cartão */}
      <Surface
        elevation={elevation}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
          },
        ]}
      >
        <Text
          variant="titleMedium"
          style={{ textAlign: "center", color: theme.colors.primary, fontWeight: "700" }}
        >
          {title}
        </Text>

        {Boolean(description) && (
          <Text
            variant="bodyMedium"
            style={{
              marginTop: 8,
              textAlign: "center",
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {description}
          </Text>
        )}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    // posicionado por cima do cartão:
    marginBottom: -20,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
});

export default StepCard;

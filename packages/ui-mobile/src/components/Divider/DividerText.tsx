import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Divider as PaperDivider, Text, useTheme } from "react-native-paper";

/**
 * Um divisor horizontal que pode opcionalmente exibir um texto centralizado.
 * Útil para separar secções visuais ou indicar alternativas (ex.: "Ou").
 */
export type DividerTextProps = {
  /** Texto opcional a mostrar no centro do divisor */
  label?: string;
  /** Espaço vertical (em px) acima/abaixo do divisor */
  spacing?: number;
  /** Cor do divisor (default: theme.colors.outlineVariant) */
  color?: string;
  /** Estilo extra para o container */
  style?: ViewStyle;
};

const DividerText: React.FC<DividerTextProps> = ({
  label,
  spacing = 8,
  color,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { marginVertical: spacing }, style]}>
      <View style={styles.line}>
        <PaperDivider
          style={{ flex: 1, backgroundColor: color ?? theme.colors.outlineVariant }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      {label ? (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          accessibilityLabel={label}
        >
          {label}
        </Text>
      ) : null}

      {label ? (
        <View style={styles.line}>
          <PaperDivider
            style={{ flex: 1, backgroundColor: color ?? theme.colors.outlineVariant }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    flex: 1,
  },
  label: {
    marginHorizontal: 12,
  },
});

export default DividerText;

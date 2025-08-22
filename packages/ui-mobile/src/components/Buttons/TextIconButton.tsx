import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { TouchableRipple, Text, useTheme, Icon } from "react-native-paper";

export type TextIconButtonProps = {
  /** Texto a mostrar */
  label: string;
  /** Nome do ícone do Paper (ex.: "account-plus") */
  icon: string;
  /** Callback ao clicar */
  onPress?: () => void;

  /** Variante visual: 'solid' (com fundo) ou 'ghost' (sem fundo) */
  variant?: "solid" | "ghost";

  /** Cor de fundo quando variant = 'solid' (default: theme.colors.primary) */
  backgroundColor?: string;
  /** Cor do texto/ícone (default: onPrimary em 'solid' e primary em 'ghost') */
  color?: string;

  /** Tamanho do ícone (default: 20) */
  iconSize?: number;
  /** Posição do ícone */
  iconPosition?: "left" | "right";

  /** Desativado */
  disabled?: boolean;

  /** Estilo extra para o container */
  style?: ViewStyle;
  /** Accessibility label opcional */
  accessibilityLabel?: string;
};

const TextIconButton: React.FC<TextIconButtonProps> = ({
  label,
  icon,
  onPress,
  variant = "solid",
  backgroundColor,
  color,
  iconSize = 20,
  iconPosition = "right",
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  const isSolid = variant === "solid";
  const bg = isSolid ? backgroundColor ?? theme.colors.primary : "transparent";
  const fg =
    color ??
    (isSolid ? theme.colors.onPrimary : theme.colors.primary);

  const ripple = isSolid ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)";

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        isSolid ? styles.solidPadding : styles.ghostPadding,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      rippleColor={ripple}
    >
      <View style={styles.content}>
        {iconPosition === "left" && (
          <Icon source={icon} size={iconSize} color={fg} />
        )}
        <Text variant="labelLarge" style={[styles.label, { color: fg }]}>
          {label}
        </Text>
        {iconPosition === "right" && (
          <Icon source={icon} size={iconSize} color={fg} />
        )}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  solidPadding: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostPadding: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontWeight: "500",
  },
});

export default TextIconButton;

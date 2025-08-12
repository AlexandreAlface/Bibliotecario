// packages/ui-mobile/src/components/TextField.tsx
import * as React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

export type TextFieldProps = React.ComponentProps<typeof TextInput> & {
  /** ocupa 100% da largura do container */
  fullWidth?: boolean;
  /** estilo extra do input */
  style?: ViewStyle | ViewStyle[];
};

export function TextField({
  fullWidth = true,
  style,
  outlineColor,
  activeOutlineColor,
  ...props
}: TextFieldProps) {
  const theme = useTheme();

  return (
    <TextInput
      mode="outlined"
      outlineColor={outlineColor ?? theme.colors.outline /* visível parado */}
      activeOutlineColor={activeOutlineColor ?? theme.colors.primary /* focado */}
      style={[styles.input, fullWidth && styles.fullWidth, style]}
      // em RN Paper 5 dá para controlar a borda diretamente:
      outlineStyle={{ borderRadius: 16, borderWidth: 2 }}
      theme={{ roundness: 16 }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  input: {
    backgroundColor: "#fff", // destaca no gradient
  },
});

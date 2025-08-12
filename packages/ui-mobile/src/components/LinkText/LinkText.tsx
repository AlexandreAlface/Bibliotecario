import * as React from "react";
import { Linking, Pressable, StyleSheet } from "react-native";
import { Text as PaperText, useTheme } from "react-native-paper";

// Podes usar o tipo do RN ou do Paper. Aqui uso o do Paper via ComponentProps:
type PaperTextProps = React.ComponentProps<typeof PaperText>;

type Size = "xs" | "sm" | "md" | "lg";

export type LinkTextProps = Omit<PaperTextProps, "onPress"> & {
  href?: string;                       // URL externa (opcional)
  onPress?: () => void;                // navegação interna (opcional)
  underline?: boolean;
  align?: "left" | "center" | "right";
  size?: Size;
};

const mapSize: Record<Size, number> = { xs: 12, sm: 14, md: 16, lg: 18 };

export function LinkText({
  href,
  onPress,
  underline = true,
  align = "left",
  size = "md",
  style,
  children,
  ...rest
}: LinkTextProps) {
  const theme = useTheme();

  const handlePress = async () => {
    if (onPress) return onPress();
    if (!href) return;
    const ok = await Linking.canOpenURL(href);
    if (ok) Linking.openURL(href);
  };

  return (
    <Pressable onPress={handlePress}>
      <PaperText
        {...rest}
        style={[
          { color: theme.colors.primary, textAlign: align, textDecorationLine: underline ? "underline" : "none" },
          { fontSize: mapSize[size] },
          style,
        ]}
      >
        {children}
      </PaperText>
    </Pressable>
  );
}

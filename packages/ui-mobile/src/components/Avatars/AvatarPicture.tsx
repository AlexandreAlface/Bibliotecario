import * as React from "react";
import { View, StyleSheet, ViewStyle, Pressable } from "react-native";
import { Avatar, Icon, Text, useTheme, Surface } from "react-native-paper";

/**
 * Avatar simples para exibir uma fotografia, iniciais ou ícone de fallback.
 * Não depende de APIs de upload. Pode ser "clicável" se passar onPress.
 */
export type AvatarPictureProps = {
  /** URL da imagem do avatar */
  uri?: string;
  /** Iniciais a mostrar quando não existe imagem (ex.: "CB") */
  initials?: string;
  /** Ícone de fallback quando não há imagem nem iniciais (ex.: "account") */
  fallbackIcon?: string;
  /** Diâmetro do avatar (px) */
  size?: number;
  /** Borda circular */
  rounded?: boolean;
  /** Mostra contorno (borda) */
  showBorder?: boolean;
  /** Cor do contorno (default: outlineVariant) */
  borderColor?: string;

  /** Ação ao tocar (torna o avatar um "botão") */
  onPress?: () => void;
  /** Label de acessibilidade */
  accessibilityLabel?: string;

  /** Estilo extra do contentor */
  style?: ViewStyle;
};

const AvatarPicture: React.FC<AvatarPictureProps> = ({
  uri,
  initials,
  fallbackIcon = "account",
  size = 96,
  rounded = true,
  showBorder = false,
  borderColor,
  onPress,
  accessibilityLabel,
  style,
}) => {
  const theme = useTheme();

  const radius = rounded ? size / 2 : theme.roundness;
  const borderStyle = showBorder
    ? { borderWidth: 1, borderColor: borderColor ?? theme.colors.outlineVariant }
    : null;

  const content = (() => {
    if (uri) {
      return <Avatar.Image size={size} source={{ uri }} />;
    }
    if (initials) {
      return <Avatar.Text size={size} label={initials} />;
    }
    return (
      <Surface
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.surfaceVariant },
        ]}
        elevation={0}
      >
        <Icon source={fallbackIcon} size={Math.max(20, size * 0.35)} color={theme.colors.onSurfaceVariant} />
      </Surface>
    );
  })();

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={accessibilityLabel ?? "Avatar"}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
        },
        borderStyle,
        style,
      ]}
    >
      {content}
    </Container>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AvatarPicture;

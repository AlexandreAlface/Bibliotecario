import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import {
  IconButton,
  Surface,
  HelperText,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import AvatarPicture, { AvatarPictureProps } from "./AvatarPicture";

/**
 * Avatar com ação de upload: mostra um botão flutuante (câmara por default)
 * no canto do avatar. Não implementa o picker: expõe `onPick` para integrares
 * com expo-image-picker ou outro.
 */
export type AvatarUploadProps = AvatarPictureProps & {
  /** Callback para iniciar o fluxo de seleção/captura de foto */
  onPick?: () => void;
  /** Ícone do botão de ação (ex.: "camera", "pencil") */
  actionIcon?: string;
  /** Tamanho do ícone do botão de ação (px). Default: 24 */
  actionSize?: number;
  /** Posição do botão flutuante relativamente ao avatar */
  actionPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /**
   * Distância do botão em relação à borda do avatar (px).
   * Pode ser NEGATIVO para “sair” para fora do avatar.
   * Default: 8% do tamanho do avatar (aprox. dentro da borda).
   */
  actionOffset?: number;

  /** Desativa interações */
  disabled?: boolean;
  /** Mostra spinner de loading por cima do avatar */
  loading?: boolean;
  /** Mensagem de erro/ajuda por baixo do avatar */
  helperText?: string;
  /** Estilo extra do wrapper externo */
  containerStyle?: ViewStyle;
};

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  onPick,
  actionIcon = "camera",
  actionSize = 24,
  actionPosition = "bottom-right",
  actionOffset, // novo
  disabled = false,
  loading = false,
  helperText,
  containerStyle,
  size = 96,
  ...avatarProps
}) => {
  const theme = useTheme();

  // offset padrão proporcional ao tamanho; permite override (incl. negativo)
  const offset = actionOffset ?? Math.round(size * 0.08);
  const posStyle = positionToStyle(actionPosition, offset);

  return (
    <View style={[{ alignItems: "center" }, containerStyle]}>
      <View style={{ width: size, height: size }}>
        <AvatarPicture size={size} {...avatarProps} />

        {loading && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator accessibilityLabel="A carregar avatar" />
          </View>
        )}

        <Surface
          elevation={2}
          style={[
            styles.fab,
            posStyle,
            {
              borderRadius: 999,
              backgroundColor: theme.colors.surface,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
          pointerEvents="box-none"
        >
          <IconButton
            icon={actionIcon}
            size={actionSize}
            onPress={onPick}
            disabled={disabled || loading}
            accessibilityLabel="Alterar fotografia"
          />
        </Surface>
      </View>

      {!!helperText && (
        <HelperText type="info" visible style={{ marginTop: 6 }}>
          {helperText}
        </HelperText>
      )}
    </View>
  );
};

function positionToStyle(
  position: AvatarUploadProps["actionPosition"],
  offset: number
) {
  const base: ViewStyle = { position: "absolute" };

  // suporta offset negativo (para “sair” do avatar)
  switch (position) {
    case "bottom-right":
      return { ...base, right: offset, bottom: offset };
    case "bottom-left":
      return { ...base, left: offset, bottom: offset };
    case "top-right":
      return { ...base, right: offset, top: offset };
    case "top-left":
      return { ...base, left: offset, top: offset };
    default:
      return { ...base, right: offset, bottom: offset };
  }
}

const styles = StyleSheet.create({
  fab: { position: "absolute" },
  center: { alignItems: "center", justifyContent: "center" },
});

export default AvatarUpload;

import * as React from "react";
import { ViewStyle } from "react-native";
import { AvatarPictureProps } from "./AvatarPicture";
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
declare const AvatarUpload: React.FC<AvatarUploadProps>;
export default AvatarUpload;

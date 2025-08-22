import * as React from "react";
import { ViewStyle } from "react-native";
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
declare const AvatarPicture: React.FC<AvatarPictureProps>;
export default AvatarPicture;

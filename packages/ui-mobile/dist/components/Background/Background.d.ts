import * as React from "react";
import { StyleProp, ViewStyle } from "react-native";
type BackgroundProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    hideShapes?: boolean;
    /** onde ocorre a transição principal do gradiente (0..1). Ex.: 0.6 ≈ meio */
    center?: number;
};
export declare function Background({ children, style, hideShapes, center }: BackgroundProps): import("react/jsx-runtime").JSX.Element;
export default Background;

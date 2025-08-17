// packages/ui-mobile/src/components/Background/Background.tsx
import * as React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, ColorValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";

type BackgroundProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hideShapes?: boolean;
  /** onde ocorre a transição principal do gradiente (0..1). Ex.: 0.6 ≈ meio */
  center?: number;
};

export function Background({ children, style, hideShapes, center = 0.6 }: BackgroundProps) {
  const theme = useTheme();
  const c1: ColorValue = theme.colors.primary;
  const c2: ColorValue = theme.colors.secondary ?? "#66BB6A";
  const c3: ColorValue = (theme.colors as any).tertiary ?? "#7E5AA6";
  const gradientColors = [c1, c2, c3] as const;

  // clamp para evitar warnings
  const mid = Math.min(0.9, Math.max(0.1, center));
  const locations = [0, mid, 1] as const;

  return (
    <LinearGradient
      colors={gradientColors}
      locations={locations}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {!hideShapes && (
        <>
          <View style={[styles.shape, { top: 58, left: 36 }]} />
          <View style={[styles.shape, { top: 120, right: 58, transform: [{ rotate: "35deg" }] }]} />
          <View style={[styles.shape, { bottom: 120, left: 76, transform: [{ rotate: "12deg" }] }]} />
          <View style={[styles.shape, { bottom: 36, right: 32, transform: [{ rotate: "25deg" }] }]} />
        </>
      )}
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  shape: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});

export default Background;

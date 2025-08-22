import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

export interface ProgressBarProps {
  /** Valor entre 0 e 1 */
  progress: number;
  /** Cor da barra (por padrão usa `theme.colors.primary`) */
  color?: string;
  /** Altura da barra */
  height?: number;
  /** Cor de fundo da barra */
  backgroundColor?: string;
  /** Bordas arredondadas */
  borderRadius?: number;
  /** Estilo adicional do container */
  style?: ViewStyle;
  /** Duração da animação (ms) */
  animationDuration?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  backgroundColor,
  borderRadius = 4,
  style,
  animationDuration = 300,
}) => {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: animationDuration,
      useNativeDriver: false, // largura não pode usar native driver
    }).start();
  }, [progress, animationDuration, animatedValue]);

  const barColor = color || theme.colors.primary;
  const bgColor = backgroundColor || theme.colors.surfaceVariant;

  const widthInterpolated = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.container,
        { height, borderRadius, backgroundColor: bgColor },
        style,
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
    >
      <Animated.View
        style={{
          width: widthInterpolated,
          height: "100%",
          backgroundColor: barColor,
          borderRadius,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});

export default ProgressBar;

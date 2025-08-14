import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";
import StepCard, { StepCardProps } from "./StepCard";

/**
 * Agrupa vários Steps verticalmente com espaçamento e padding.
 */
export type StepsListItem = Omit<StepCardProps, "elevation"> & {
  elevation?: StepCardProps["elevation"];
};

export type StepsListProps = {
  steps: StepsListItem[];
  spacing?: number;
  horizontalPadding?: number;
  maxWidth?: number;
  style?: ViewStyle;
};

const StepsList: React.FC<StepsListProps> = ({
  steps,
  spacing = 24,
  horizontalPadding = 16,
  maxWidth = 720,
  style,
}) => {
  useTheme(); // mantém compatibilidade de tema; sem leituras diretas aqui

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: horizontalPadding,
          rowGap: spacing,
          alignSelf: "center",
          width: "100%",
          maxWidth,
        },
        style,
      ]}
      // alguns RN não suportam "list" — deixa sem role
      // accessibilityRole="list"
      accessibilityLabel="Como funciona"
    >
      {steps.map((s) => (
        <View
          key={s.step}
          // "listitem" não é suportado em várias versões; usa "text" (ou remove)
          accessibilityRole="text"
        >
          <StepCard {...s} elevation={s.elevation ?? 1} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});

export default StepsList;
export type { StepCardProps } from "./StepCard";

import React from "react";
import { View, StyleSheet, ViewStyle, AccessibilityRole, Pressable, Platform } from "react-native";
import {
  Text,
  useTheme,
  RadioButton,
  HelperText,
  ActivityIndicator,
  Surface,
} from "react-native-paper";

/**
 * Grupo de botões de rádio com Paper, com opção de indicador "circle" (bolinha)
 * para harmonizar o visual no iOS.
 */
export type RadioOption = {
  label: string;
  value: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export type RadioOptionGroupProps = {
  label?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (newValue: string) => void;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  elevated?: boolean;
  /** Tipo de indicador do rádio. "paper" usa <RadioButton /> do Paper; "circle" usa bolinha custom. */
  indicator?: "paper" | "circle";
  testID?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export const RadioOptionGroup: React.FC<RadioOptionGroupProps> = ({
  label,
  options,
  value,
  onChange,
  orientation = "horizontal",
  disabled = false,
  loading = false,
  required = false,
  helperText,
  errorText,
  elevated = false,
  indicator = "paper",
  testID,
  accessibilityLabel,
  style,
}) => {
  const theme = useTheme();

  const Wrapper = elevated ? Surface : View;
  const accessibilityRole: AccessibilityRole = "radiogroup";

  const renderIndicator = (checked: boolean, isDisabled: boolean) => {
    if (indicator === "paper") {
      return (
        <RadioButton
          value={checked ? "checked" : "unchecked"}
          disabled={isDisabled}
          status={checked ? "checked" : "unchecked"}
        />
      );
    }

    // indicador "circle" (bolinha)
    const size = 22;
    const inner = 12;

    const borderColor = isDisabled
      ? theme.colors.outline
      : checked
      ? theme.colors.primary
      : theme.colors.outline;

    const fill = isDisabled
      ? theme.colors.surfaceVariant
      : theme.colors.primary;

    return (
      <View
        style={[
          styles.circleOuter,
          { width: size, height: size, borderRadius: size / 2, borderColor },
          isDisabled && { opacity: 0.6 },
        ]}
        pointerEvents="none"
      >
        {checked && (
          <View
            style={[
              styles.circleInner,
              {
                width: inner,
                height: inner,
                borderRadius: inner / 2,
                backgroundColor: fill,
              },
            ]}
          />
        )}
      </View>
    );
  };

  return (
    <Wrapper
      style={[
        styles.wrapper,
        elevated && { borderRadius: theme.roundness, padding: 12, elevation: 1 },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {!!label && (
        <Text
          variant="titleSmall"
          style={[
            styles.label,
            { color: theme.colors.onSurface },
            errorText ? { color: theme.colors.error } : null,
          ]}
          accessibilityLabel={label + (required ? " (obrigatório)" : "")}
        >
          {label}
          {required ? " *" : ""}
        </Text>
      )}

      {loading ? (
        <View style={[styles.loader, orientation === "horizontal" && { alignSelf: "flex-start" }]}>
          <ActivityIndicator accessibilityLabel="A carregar opções" />
        </View>
      ) : (
        <View
          style={[
            styles.optionsContainer,
            orientation === "horizontal" ? styles.row : styles.column,
          ]}
          accessibilityRole="radiogroup"
        >
          {options.map((opt) => {
            const checked = value === opt.value;
            const isDisabled = disabled || !!opt.disabled;

            return (
              <Pressable
                key={opt.value}
                onPress={() => !isDisabled && onChange?.(opt.value)}
                style={[
                  styles.option,
                  orientation === "horizontal" ? styles.optionRow : styles.optionColumn,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={opt.accessibilityLabel ?? opt.label}
                accessibilityState={{ checked, disabled: isDisabled }}
                disabled={isDisabled}
                hitSlop={8}
              >
                {renderIndicator(checked, isDisabled)}
                <Text
                  variant="titleSmall"
                  style={[styles.optionLabel, isDisabled && { opacity: 0.5 }]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!!helperText && !errorText && (
        <HelperText type="info" visible style={styles.helper}>
          {helperText}
        </HelperText>
      )}

      {!!errorText && (
        <HelperText type="error" visible style={styles.helper}>
          {errorText}
        </HelperText>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  label: { marginBottom: 8, fontWeight: "600" },
  optionsContainer: { gap: 24, flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center" },
  column: { flexDirection: "column" },
  option: { alignItems: "center" },
  optionRow: { flexDirection: "row", gap: 8 },
  optionColumn: { flexDirection: "row", gap: 8, marginBottom: 4 },
  optionLabel: { alignSelf: "center" },
  loader: { paddingVertical: 8 },
  helper: { marginTop: 6 },
  circleOuter: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {},
});

export default RadioOptionGroup;

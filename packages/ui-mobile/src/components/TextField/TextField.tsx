// packages/ui-mobile/src/components/TextField/TextField.tsx
import * as React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

export type TextFieldVariant = "default" | "email" | "number" | "password";

export type TextFieldProps = React.ComponentProps<typeof TextInput> & {
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  helperText?: string;
  variant?: TextFieldVariant;
};

export function TextField({
  fullWidth = true,
  style,
  secureTextEntry,
  right,
  left,
  onFocus,
  onBlur,
  helperText,
  variant = "default",
  autoCapitalize,
  keyboardType,
  error,
  ...props
}: TextFieldProps) {
  const theme = useTheme();

  // anima foco para sombra/borda
  const focused = useSharedValue(0);
  const containerAStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focused.value,
      [0, 1],
      [theme.colors.outline, error ? theme.colors.error : theme.colors.primary]
    );
    const shadow = focused.value ? 0.15 : 0;
    return {
      borderColor,
      shadowOpacity: withTiming(shadow, { duration: 120 }),
      shadowRadius: withTiming(focused.value ? 8 : 0, { duration: 120 }),
      elevation: focused.value ? 2 : 0,
    };
  });

  const [hide, setHide] = React.useState<boolean>(
    variant === "password" ? true : !!secureTextEntry
  );

  // presets por variante
  const preset = React.useMemo(() => {
    switch (variant) {
      case "email":
        return {
          autoCapitalize: "none" as const,
          keyboardType: "email-address" as const,
          left: <TextInput.Icon icon="email-outline" />,
        };
      case "number":
        return {
          keyboardType: "numeric" as const,
          left: <TextInput.Icon icon="numeric" />,
        };
      case "password":
        return {
          autoCapitalize: "none" as const,
          secureTextEntry: hide,
          left: <TextInput.Icon icon="lock-outline" />,
          right: (
            <TextInput.Icon
              icon={hide ? "eye-off-outline" : "eye-outline"}
              onPress={() => setHide((v) => !v)}
              forceTextInputFocus={false}
              accessibilityLabel={
                hide ? "Mostrar palavra-passe" : "Esconder palavra-passe"
              }
            />
          ),
        };
      default:
        return {};
    }
  }, [variant, hide]);

  return (
    <>
      {/* CONTÉM a cor de fundo e a borda → não há bleed do gradiente */}
      <Animated.View
        style={[
          styles.container,
          fullWidth && styles.fullWidth,
          containerAStyle,
          style,
          error && { borderColor: theme.colors.error },
        ]}
      >
        <TextInput
          mode="flat"                       // 👈 sem borda própria
          style={styles.input}              // 👈 fundo branco sólido
          underlineColor="transparent"
          selectionColor={theme.colors.primary}
          autoCapitalize={autoCapitalize ?? (preset as any).autoCapitalize}
          keyboardType={keyboardType ?? (preset as any).keyboardType}
          secureTextEntry={(preset as any).secureTextEntry ?? secureTextEntry}
          left={left ?? (preset as any).left}
          right={right ?? (preset as any).right}
          onFocus={(e) => {
            focused.value = 1;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focused.value = 0;
            onBlur?.(e);
          }}
          {...props}
        />
      </Animated.View>

      {!!helperText && (
        <Text
          variant="bodySmall"
          style={[
            styles.helper,
            error ? { color: theme.colors.error } : { color: theme.colors.outline },
          ]}
        >
          {helperText}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  container: {
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: "#fff",    // 👈 “corta” qualquer coisa por baixo
    overflow: "hidden",
  },
  input: {
    backgroundColor: "#fff",    // reforço (Android)
  },
  helper: { marginTop: 6, marginLeft: 12 },
});

export default TextField;

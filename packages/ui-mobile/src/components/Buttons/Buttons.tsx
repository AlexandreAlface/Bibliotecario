import * as React from "react";
import { StyleSheet } from "react-native";
import { Button as PaperButton, useTheme } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type PaperBtnProps = React.ComponentProps<typeof PaperButton>;
type CommonProps = Omit<PaperBtnProps, "mode"> & {
  /** texto opcional se não quiseres usar children */
  label?: string;
  /** ocupa 100% da largura do container */
  fullWidth?: boolean;
};

function ScaleOnPress({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.98 : 1, { duration: 90 }) }],
  }));

  return (
    <Animated.View
      style={anim}
      onTouchStart={() => !disabled && (pressed.value = 1)}
      onTouchEnd={() => (pressed.value = 0)}
      onTouchCancel={() => (pressed.value = 0)}
    >
      {children}
    </Animated.View>
  );
}

export const PrimaryButton: React.FC<CommonProps> = ({
  children,
  label,
  style,
  contentStyle,
  labelStyle,
  fullWidth = true,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <ScaleOnPress disabled={rest.disabled}>
      <PaperButton
        mode="contained"
        uppercase={false}
        {...rest}
        style={[fullWidth && styles.fullWidth, styles.button, style]}
        contentStyle={[styles.content, contentStyle]}
        labelStyle={[
          styles.label,
          { color: theme.colors.onPrimary },
          labelStyle,
        ]}
      >
        {children ?? label}
      </PaperButton>
    </ScaleOnPress>
  );
};

export const SecondaryButton: React.FC<CommonProps> = ({
  children,
  label,
  style,
  contentStyle,
  labelStyle,
  fullWidth = true,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <ScaleOnPress disabled={rest.disabled}>
      <PaperButton
        mode="outlined"
        uppercase={false}
        textColor={theme.colors.primary}
        // alguns temas precisam disto para a cor da borda
        theme={{ colors: { outline: theme.colors.primary } }}
        {...rest}
        style={[
          fullWidth && styles.fullWidth,
          styles.button,
          { borderColor: theme.colors.primary, borderWidth: 2 },
          style,
        ]}
        contentStyle={[styles.content, contentStyle]}
        labelStyle={[styles.label, { color: theme.colors.primary }, labelStyle]}
      >
        {children ?? label}
      </PaperButton>
    </ScaleOnPress>
  );
};

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  button: { borderRadius: 28 },
  content: { height: 56, borderRadius: 28 },
  label: { fontFamily: "Poppins_600SemiBold", fontSize: 16, letterSpacing: 0.3 },
});

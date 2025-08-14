import * as React from "react";
import { View, StyleSheet, ViewStyle, Animated } from "react-native";
import { Surface, TouchableRipple, Icon, useTheme, Badge } from "react-native-paper";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";

/**
 * Barra de tabs baseada em ícones com duas variantes:
 * - "ig"  : estilo Instagram (sem pill, bounce no press, linha superior)
 * - "pill": estilo iOS com pill por trás do item ativo
 */

export type IconTabItem<TKey extends string = string> = {
  key: TKey;
  icon: string;
  accessibilityLabel?: string;
  badgeCount?: number;
  disabled?: boolean;
  onLongPress?: () => void;
};

export type IconTabBarProps<TKey extends string = string> = {
  items: IconTabItem<TKey>[];
  activeKey: TKey;
  onChange: (key: TKey) => void;

  variant?: "ig" | "pill";

  backgroundColor?: string;
  activePillColor?: string; // só em variant="pill"
  activeIconColor?: string;
  inactiveIconColor?: string;

  iconSize?: number;
  pillSize?: number; // só em variant="pill"

  elevation?: MD3Elevation;
  showTopBorder?: boolean; // útil na IG bar
  style?: ViewStyle;

  accessibilityLabel?: string;
};

export function IconTabBar<TKey extends string = string>({
  items,
  activeKey,
  onChange,
  variant = "ig",
  backgroundColor,
  activePillColor,
  activeIconColor,
  inactiveIconColor,
  iconSize = 26,
  pillSize = 40,
  elevation = 1 as MD3Elevation,
  showTopBorder = variant === "ig",
  style,
  accessibilityLabel = "Menu de navegação",
}: IconTabBarProps<TKey>) {
  const theme = useTheme();

  const bg = backgroundColor ?? (variant === "ig" ? "#fff" : theme.colors.surface);
  const pill = activePillColor ?? theme.colors.secondaryContainer;
  const activeIcon = activeIconColor ?? (variant === "ig" ? "#000000" : theme.colors.onSecondaryContainer);
  const inactiveIcon = inactiveIconColor ?? (variant === "ig" ? "#262626" : theme.colors.onSurfaceVariant);

  // 1 animador por item (0 = inativo, 1 = ativo)
  const animsRef = React.useRef<Record<string, Animated.Value>>({});
  if (Object.keys(animsRef.current).length !== items.length) {
    const map: Record<string, Animated.Value> = {};
    for (const it of items) map[String(it.key)] = new Animated.Value(it.key === activeKey ? 1 : 0);
    animsRef.current = map;
  }

  // anima a transição quando activeKey muda
  React.useEffect(() => {
    const animations = items.map((it) =>
      Animated.timing(animsRef.current[String(it.key)], {
        toValue: it.key === activeKey ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, [activeKey, items]);

  return (
    <Surface
      elevation={elevation}
      style={[
        styles.container,
        variant === "ig" && styles.igContainer,
        {
          backgroundColor: bg,
          borderTopWidth: showTopBorder ? StyleSheet.hairlineWidth : 0,
          borderTopColor: showTopBorder ? "#e3e3e3" : "transparent",
          borderRadius: variant === "pill" ? 16 : 0,
        },
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {items.map((item) => {
        const selected = item.key === activeKey;
        const isDisabled = !!item.disabled;

        // valores animados
        const a = animsRef.current[String(item.key)];
        const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
        const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

        // bounce no press
        const pressScale = new Animated.Value(1);
        const onPressIn = () =>
          Animated.spring(pressScale, { toValue: 0.9, speed: 40, bounciness: 0, useNativeDriver: true }).start();
        const onPressOut = () => {
          Animated.spring(pressScale, { toValue: 1, speed: 30, useNativeDriver: true }).start();
          !isDisabled && onChange(item.key);
        };

        return (
          <TouchableRipple
            key={String(item.key)}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onLongPress={item.onLongPress}
            disabled={isDisabled}
            borderless
            rippleColor="rgba(0,0,0,0.08)"
            accessibilityRole="tab"
            accessibilityLabel={item.accessibilityLabel}
            accessibilityState={{ selected, disabled: isDisabled }}
            style={styles.tabTouchable}
          >
            <View style={styles.tabInner}>
              {/* Pill só na variante "pill" */}
              {variant === "pill" && selected && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.pill,
                    { width: pillSize, height: pillSize, borderRadius: pillSize / 2, backgroundColor: pill },
                  ]}
                />
              )}

              <Animated.View style={{ transform: [{ scale }, { scale: pressScale }], opacity }}>
                <Icon source={item.icon} size={iconSize} color={selected ? activeIcon : inactiveIcon} />
              </Animated.View>

              {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                <View style={styles.badgeWrapper} pointerEvents="none">
                  <Badge>{item.badgeCount}</Badge>
                </View>
              )}
            </View>
          </TouchableRipple>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  igContainer: {
    borderRadius: 0,
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabInner: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    opacity: 0.35,
  },
  badgeWrapper: {
    position: "absolute",
    right: 2,
    top: 0,
  },
});

export default IconTabBar;

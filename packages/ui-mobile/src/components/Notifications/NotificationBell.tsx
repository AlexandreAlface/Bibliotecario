import * as React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { TouchableRipple, Icon, Text, useTheme } from "react-native-paper";

export type NotificationBellProps = {
  /** Número de notificações não lidas. */
  count?: number;
  /** Se true, mostra o badge mesmo quando count = 0 (com “0”). Default: false */
  showZero?: boolean;
  /** Limite visual do badge (ex.: 99+). Default: 99 */
  maxCount?: number;

  /** Ícone do sino (MaterialCommunity). Default: 'bell-outline' */
  icon?: string;
  /** Tamanho do ícone. Default: 24 */
  size?: number;

  /** Cor do badge. Default: theme.colors.error */
  badgeColor?: string;
  /** Cor do texto do badge. Default: theme.colors.onError */
  badgeTextColor?: string;

  /** Callback ao pressionar. */
  onPress?: () => void;
  /** Desativa interações. */
  disabled?: boolean;

  /** Estilo extra do wrapper. */
  style?: ViewStyle;

  /** A11y label personalizado. */
  accessibilityLabel?: string;
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  count = 0,
  showZero = false,
  maxCount = 99,
  icon = "bell-outline",
  size = 24,
  badgeColor,
  badgeTextColor,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  const hasBadge = showZero ? true : count > 0;
  const badgeValue = count > maxCount ? `${maxCount}+` : String(count);

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      style={[styles.touchable, style]}
      rippleColor="rgba(0,0,0,0.15)"
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (count > 0 ? `Abrir notificações. ${count} novas.` : "Abrir notificações")
      }
    >
      <View style={styles.iconWrapper}>
        <Icon
          source={icon}
          size={size}
          color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
        />

        {hasBadge && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor ?? theme.colors.error,
                minWidth: size * 0.75,
                height: size * 0.75,
                borderRadius: (size * 0.75) / 2,
              },
            ]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text
              variant="labelSmall"
              style={{
                color: badgeTextColor ?? theme.colors.onError,
                fontWeight: "700",
              }}
            >
              {badgeValue}
            </Text>
          </View>
        )}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 999,
    padding: 6, // área de toque confortável
    alignSelf: "flex-start",
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});

export default NotificationBell;

import * as React from "react";
import { View, StyleSheet, Dimensions, LayoutChangeEvent, ViewStyle } from "react-native";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBell, { NotificationBellProps } from "./NotificationBell";
import NotificationsCard, { NotificationItem, NotificationsCardProps } from "./NotificationsCard";

type PopoverPlacement = "auto" | "left" | "right";

export type NotificationsPopoverProps = {
  items: NotificationItem[];
  count?: number;
  onItemPress?: NotificationsCardProps["onItemPress"];
  onItemDelete?: NotificationsCardProps["onItemDelete"];
  onClearAll?: NotificationsCardProps["onClearAll"];
  width?: number;
  screenMargin?: number;
  anchorGap?: number;
  placement?: PopoverPlacement;
  bellProps?: Omit<NotificationBellProps, "count" | "onPress">;
  style?: ViewStyle;

  /** Ativa swipe para apagar dentro do cartão */
  swipeToDelete?: boolean;
};

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  items,
  count = 0,
  onItemPress,
  onItemDelete,
  onClearAll,
  width = 320,
  screenMargin = 8,
  anchorGap = 6,
  placement = "auto",
  bellProps,
  style,
  swipeToDelete = false,
}) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const anchorRef = React.useRef<View>(null);

  const computePosition = React.useCallback(() => {
    const win = Dimensions.get("window");
    const safeLeft = screenMargin + insets.left;
    const safeRight = win.width - screenMargin - insets.right;

    anchorRef.current?.measureInWindow((ax, ay, aw, ah) => {
      const top = ay + ah + anchorGap;
      let desiredLeft =
        placement === "left" ? ax : placement === "right" ? ax + aw - width : ax + aw - width;

      desiredLeft = Math.max(safeLeft, Math.min(desiredLeft, safeRight - width));
      setPos({ top, left: desiredLeft });
    });
  }, [anchorGap, insets.left, insets.right, screenMargin, width, placement]);

  const toggle = () => {
    if (!open) computePosition();
    setOpen((v) => !v);
  };
  const close = () => setOpen(false);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", () => {
      if (open) computePosition();
    });
    return () => sub.remove();
  }, [open, computePosition]);

  const onAnchorLayout = (_e: LayoutChangeEvent) => {
    if (open) computePosition();
  };

  return (
    <View style={[styles.inline, style]} ref={anchorRef} onLayout={onAnchorLayout}>
      <NotificationBell count={count} onPress={toggle} accessibilityLabel="Abrir notificações" {...bellProps} />

      {open && pos && (
        <Portal>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View
              style={styles.backdrop}
              pointerEvents="auto"
              onStartShouldSetResponder={() => {
                close();
                return true;
              }}
            />
            <View style={[styles.popover, { top: pos.top, left: pos.left, width }]} pointerEvents="box-none">
              <NotificationsCard
                items={items}
                onItemPress={(it) => onItemPress?.(it)}
                onItemDelete={(it) => onItemDelete?.(it)}
                onClearAll={() => {
                  onClearAll?.();
                  close();
                }}
                swipeToDelete={swipeToDelete} // 👈 passa o gesto para o cartão
                elevation={3}
              />
            </View>
          </View>
        </Portal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inline: { alignSelf: "flex-start" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  popover: {
    position: "absolute",
  },
});

export default NotificationsPopover;

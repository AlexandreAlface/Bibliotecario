import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBell from "./NotificationBell";
import NotificationsCard from "./NotificationsCard";
const NotificationsPopover = ({ items, count = 0, onItemPress, onItemDelete, onClearAll, width = 320, screenMargin = 8, anchorGap = 6, placement = "auto", bellProps, style, swipeToDelete = false, }) => {
    const insets = useSafeAreaInsets();
    const [open, setOpen] = React.useState(false);
    const [pos, setPos] = React.useState(null);
    const anchorRef = React.useRef(null);
    const computePosition = React.useCallback(() => {
        var _a;
        const win = Dimensions.get("window");
        const safeLeft = screenMargin + insets.left;
        const safeRight = win.width - screenMargin - insets.right;
        (_a = anchorRef.current) === null || _a === void 0 ? void 0 : _a.measureInWindow((ax, ay, aw, ah) => {
            const top = ay + ah + anchorGap;
            let desiredLeft = placement === "left" ? ax : placement === "right" ? ax + aw - width : ax + aw - width;
            desiredLeft = Math.max(safeLeft, Math.min(desiredLeft, safeRight - width));
            setPos({ top, left: desiredLeft });
        });
    }, [anchorGap, insets.left, insets.right, screenMargin, width, placement]);
    const toggle = () => {
        if (!open)
            computePosition();
        setOpen((v) => !v);
    };
    const close = () => setOpen(false);
    React.useEffect(() => {
        const sub = Dimensions.addEventListener("change", () => {
            if (open)
                computePosition();
        });
        return () => sub.remove();
    }, [open, computePosition]);
    const onAnchorLayout = (_e) => {
        if (open)
            computePosition();
    };
    return (_jsxs(View, { style: [styles.inline, style], ref: anchorRef, onLayout: onAnchorLayout, children: [_jsx(NotificationBell, { count: count, onPress: toggle, accessibilityLabel: "Abrir notifica\u00E7\u00F5es", ...bellProps }), open && pos && (_jsx(Portal, { children: _jsxs(View, { style: StyleSheet.absoluteFill, pointerEvents: "box-none", children: [_jsx(View, { style: styles.backdrop, pointerEvents: "auto", onStartShouldSetResponder: () => {
                                close();
                                return true;
                            } }), _jsx(View, { style: [styles.popover, { top: pos.top, left: pos.left, width }], pointerEvents: "box-none", children: _jsx(NotificationsCard, { items: items, onItemPress: (it) => onItemPress === null || onItemPress === void 0 ? void 0 : onItemPress(it), onItemDelete: (it) => onItemDelete === null || onItemDelete === void 0 ? void 0 : onItemDelete(it), onClearAll: () => {
                                    onClearAll === null || onClearAll === void 0 ? void 0 : onClearAll();
                                    close();
                                }, swipeToDelete: swipeToDelete, elevation: 3 }) })] }) }))] }));
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
//# sourceMappingURL=NotificationsPopover.js.map
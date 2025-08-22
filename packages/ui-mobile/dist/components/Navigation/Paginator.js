import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
function range(start, end) {
    if (end < start)
        return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
/** Gera tokens com ids estáveis para as reticências */
function buildTokens(page, total, sibling, boundary, withArrows) {
    const first = 1;
    const last = total;
    const start = range(first, Math.min(boundary, last));
    const end = range(Math.max(last - boundary + 1, first), last);
    const left = Math.max(page - sibling, boundary + 1);
    const right = Math.min(page + sibling, last - boundary);
    const body = range(left, right);
    const tokens = [];
    if (withArrows)
        tokens.push({ type: "prev" });
    start.forEach((n) => tokens.push({ type: "num", n }));
    if (left > boundary + 1)
        tokens.push({ type: "dots", id: "left" });
    body.forEach((n) => tokens.push({ type: "num", n }));
    if (right < last - boundary)
        tokens.push({ type: "dots", id: "right" });
    end.forEach((n) => {
        if (!tokens.find((t) => t.type === "num" && t.n === n)) {
            tokens.push({ type: "num", n });
        }
    });
    if (withArrows)
        tokens.push({ type: "next" });
    return tokens;
}
const Slot = ({ width, height, marginRight, children }) => {
    return (_jsx(View, { style: {
            width,
            height,
            marginRight,
            alignItems: "center",
            justifyContent: "center",
        }, children: children }));
};
const Paginator = ({ page, totalPages, onPageChange, siblingCount = 1, boundaryCount = 1, showArrows = true, style, activeSize = 28, hitSize = 36, gap = 16, variant = "minimal", accessibilityLabel = "Paginação", }) => {
    const theme = useTheme();
    const safePage = clamp(page, 1, Math.max(totalPages, 1));
    const disabledPrev = safePage <= 1;
    const disabledNext = safePage >= totalPages;
    const data = useMemo(() => buildTokens(safePage, totalPages, siblingCount, boundaryCount, showArrows), [safePage, totalPages, siblingCount, boundaryCount, showArrows]);
    const keyExtractor = (item) => {
        if (item.type === "num")
            return `n-${item.n}`;
        if (item.type === "dots")
            return `dots-${item.id}`;
        return item.type; // "prev" | "next"
    };
    const go = (p) => {
        const next = clamp(p, 1, totalPages);
        if (next !== safePage)
            onPageChange(next);
    };
    const renderNumber = (n) => {
        const active = n === safePage;
        if (variant === "minimal") {
            return (_jsx(TouchableRipple, { onPress: () => go(n), borderless: true, style: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }, accessibilityRole: "button", accessibilityLabel: `Página ${n}${active ? " (ativa)" : ""}`, children: _jsxs(View, { style: { width: activeSize, height: activeSize, alignItems: "center", justifyContent: "center" }, children: [_jsx(View, { style: [
                                StyleSheet.absoluteFillObject,
                                {
                                    borderRadius: activeSize / 2,
                                    backgroundColor: active ? theme.colors.primary : "transparent",
                                },
                            ] }), _jsx(Text, { style: {
                                color: active ? theme.colors.onPrimary : theme.colors.onSurface,
                                fontWeight: active ? "800" : "600",
                            }, children: n })] }) }));
        }
        // variante "boxed"
        return (_jsx(TouchableRipple, { onPress: () => go(n), borderless: true, style: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }, accessibilityRole: "button", accessibilityLabel: `Página ${n}${active ? " (ativa)" : ""}`, children: _jsx(View, { style: {
                    minWidth: activeSize,
                    height: activeSize,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? theme.colors.secondaryContainer : "transparent",
                }, children: _jsx(Text, { style: { color: active ? theme.colors.primary : theme.colors.onSurface, fontWeight: "700" }, children: n }) }) }));
    };
    const renderDots = () => (_jsx(View, { accessible: false, style: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }, children: _jsx(Text, { style: { color: theme.colors.onSurfaceVariant, fontWeight: "700" }, children: "\u2026" }) }));
    const renderArrow = (type) => {
        const isPrev = type === "prev";
        const disabled = isPrev ? disabledPrev : disabledNext;
        const target = isPrev ? safePage - 1 : safePage + 1;
        return (_jsx(TouchableRipple, { onPress: () => go(target), disabled: disabled, borderless: true, style: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }, accessibilityRole: "button", accessibilityLabel: isPrev ? "Anterior" : "Seguinte", accessibilityState: { disabled }, children: _jsx(Text, { style: { color: theme.colors.onSurface, fontSize: 18, opacity: disabled ? 0.35 : 1 }, children: isPrev ? "‹" : "›" }) }));
    };
    const itemWidth = hitSize + gap; // slot previsível
    const renderItem = ({ item, index }) => {
        const isLast = index === data.length - 1;
        return (_jsx(Slot, { width: isLast ? hitSize : itemWidth, height: hitSize, marginRight: isLast ? 0 : 0, children: item.type === "num"
                ? renderNumber(item.n)
                : item.type === "dots"
                    ? renderDots()
                    : renderArrow(item.type) }));
    };
    // FlatList evita “pulos” de layout do ScrollView e mantém reuso de células
    const listRef = useRef(null);
    return (_jsx(FlatList, { ref: listRef, horizontal: true, showsHorizontalScrollIndicator: false, style: style, contentContainerStyle: styles.row, data: data, keyExtractor: keyExtractor, renderItem: renderItem, 
        // todos os itens têm o mesmo layout (opcionalmente otimiza scroll)
        getItemLayout: (_, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
        }), accessible: true, accessibilityRole: "adjustable", accessibilityLabel: accessibilityLabel, accessibilityHint: "Deslize para ver mais p\u00E1ginas ou toque para navegar" }));
};
const styles = StyleSheet.create({
    row: {
        alignItems: "center",
        paddingHorizontal: 6,
    },
});
export default Paginator;
//# sourceMappingURL=Paginator.js.map
import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
function range(start, end) {
    if (end < start)
        return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
/** Gera a sequência com reticências e setas, com ids estáveis para os dots */
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
const Hit = ({ onPress, disabled, size, a11yLabel, children }) => {
    return (_jsx(TouchableRipple, { onPress: onPress, disabled: disabled, borderless: true, style: {
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
        }, accessibilityRole: "button", accessibilityLabel: a11yLabel, accessibilityState: { disabled }, children: _jsx(View, { style: { alignItems: "center", justifyContent: "center" }, children: children }) }));
};
const Paginator = ({ page, totalPages, onPageChange, siblingCount = 1, boundaryCount = 1, showArrows = true, style, activeSize = 28, hitSize = 34, gap = 16, variant = "minimal", accessibilityLabel = "Paginação", }) => {
    const theme = useTheme();
    const safePage = clamp(page, 1, Math.max(totalPages, 1));
    const disabledPrev = safePage <= 1;
    const disabledNext = safePage >= totalPages;
    const tokens = useMemo(() => buildTokens(safePage, totalPages, siblingCount, boundaryCount, showArrows), [safePage, totalPages, siblingCount, boundaryCount, showArrows]);
    const go = (p) => {
        const next = clamp(p, 1, totalPages);
        if (next !== safePage)
            onPageChange(next);
    };
    const renderNumber = (n) => {
        const active = n === safePage;
        if (variant === "minimal") {
            return (_jsx(Hit, { onPress: () => go(n), size: hitSize, a11yLabel: `Página ${n}${active ? " (ativa)" : ""}`, children: _jsx(View, { style: {
                        width: activeSize,
                        height: activeSize,
                        borderRadius: activeSize / 2,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? theme.colors.primary : "transparent",
                    }, children: _jsx(Text, { style: {
                            color: active ? theme.colors.onPrimary : theme.colors.onSurface,
                            fontWeight: active ? "800" : "600",
                        }, children: n }) }) }, `n-${n}`));
        }
        // variante "boxed"
        return (_jsx(Hit, { onPress: () => go(n), size: hitSize, a11yLabel: `Página ${n}${active ? " (ativa)" : ""}`, children: _jsx(View, { style: {
                    minWidth: activeSize,
                    height: activeSize,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? theme.colors.secondaryContainer : "transparent",
                }, children: _jsx(Text, { style: {
                        color: active ? theme.colors.primary : theme.colors.onSurface,
                        fontWeight: "700",
                    }, children: n }) }) }, `n-${n}`));
    };
    const renderDots = (id) => (_jsx(View, { style: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }, accessibilityElementsHidden: true, importantForAccessibility: "no", children: _jsx(Text, { style: { color: theme.colors.onSurfaceVariant, fontWeight: "700" }, children: "\u2026" }) }, `dots-${id}`));
    const renderArrow = (type) => {
        const isPrev = type === "prev";
        const disabled = isPrev ? disabledPrev : disabledNext;
        const label = isPrev ? "Anterior" : "Seguinte";
        const target = isPrev ? safePage - 1 : safePage + 1;
        return (_jsx(Hit, { onPress: () => go(target), size: hitSize, a11yLabel: label, disabled: disabled, children: _jsx(Text, { style: { color: theme.colors.onSurface, fontSize: 18, opacity: disabled ? 0.35 : 1 }, children: isPrev ? "‹" : "›" }) }, type));
    };
    // Envolve cada token num wrapper com marginRight = gap (exceto o último)
    const items = tokens.map((t, idx) => {
        var _a, _b;
        const isLast = idx === tokens.length - 1;
        let node;
        switch (t.type) {
            case "num":
                node = renderNumber(t.n);
                break;
            case "dots":
                node = renderDots(t.id);
                break;
            case "prev":
                node = renderArrow("prev");
                break;
            case "next":
                node = renderArrow("next");
                break;
        }
        return (_jsx(View, { style: { marginRight: isLast ? 0 : gap }, children: node }, `wrap-${(_b = (_a = t.n) !== null && _a !== void 0 ? _a : t.type) !== null && _b !== void 0 ? _b : t}`));
    });
    return (_jsx(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.row, style: style, accessibilityLabel: accessibilityLabel, accessibilityRole: "adjustable", accessibilityHint: "Deslize para ver mais p\u00E1ginas ou toque para navegar", children: items }));
};
const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
    },
});
export default Paginator;
//# sourceMappingURL=Paginator.js.map
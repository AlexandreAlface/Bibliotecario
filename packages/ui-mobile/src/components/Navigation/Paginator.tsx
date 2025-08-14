import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, ViewStyle } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

type PageToken =
  | { type: "num"; n: number }
  | { type: "dots"; id: "left" | "right" }
  | { type: "prev" }
  | { type: "next" };

export interface PaginatorProps {
  /** Página atual (1-based) */
  page: number;
  /** Total de páginas (>= 1) */
  totalPages: number;
  /** Callback ao mudar de página */
  onPageChange: (nextPage: number) => void;

  /** Vizinhos ao redor da atual (default 1) */
  siblingCount?: number;
  /** Itens fixos nas pontas (default 1) */
  boundaryCount?: number;

  /** Mostrar setas (default true) */
  showArrows?: boolean;

  /** Estilo do container */
  style?: ViewStyle;

  /** Diâmetro do círculo ativo */
  activeSize?: number;
  /** Tamanho do hit-area de todos os itens (largura/altura) */
  hitSize?: number;
  /** Espaço horizontal entre itens */
  gap?: number;

  /** "minimal" = círculo no ativo, números soltos */
  variant?: "minimal" | "boxed";

  accessibilityLabel?: string;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Gera a sequência com reticências e setas, com ids estáveis para os dots */
function buildTokens(
  page: number,
  total: number,
  sibling: number,
  boundary: number,
  withArrows: boolean
): PageToken[] {
  const first = 1;
  const last = total;

  const start = range(first, Math.min(boundary, last));
  const end = range(Math.max(last - boundary + 1, first), last);

  const left = Math.max(page - sibling, boundary + 1);
  const right = Math.min(page + sibling, last - boundary);

  const body = range(left, right);

  const tokens: PageToken[] = [];
  if (withArrows) tokens.push({ type: "prev" });

  start.forEach((n) => tokens.push({ type: "num", n }));

  if (left > boundary + 1) tokens.push({ type: "dots", id: "left" });
  body.forEach((n) => tokens.push({ type: "num", n }));
  if (right < last - boundary) tokens.push({ type: "dots", id: "right" });

  end.forEach((n) => {
    if (!tokens.find((t) => t.type === "num" && t.n === n)) {
      tokens.push({ type: "num", n });
    }
  });

  if (withArrows) tokens.push({ type: "next" });
  return tokens;
}

const Hit: React.FC<{
  onPress?: () => void;
  disabled?: boolean;
  size: number;
  a11yLabel?: string;
  children: React.ReactNode;
}> = ({ onPress, disabled, size, a11yLabel, children }) => {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </TouchableRipple>
  );
};

const Paginator: React.FC<PaginatorProps> = ({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  showArrows = true,
  style,
  activeSize = 28,
  hitSize = 34,
  gap = 16,
  variant = "minimal",
  accessibilityLabel = "Paginação",
}) => {
  const theme = useTheme();

  const safePage = clamp(page, 1, Math.max(totalPages, 1));
  const disabledPrev = safePage <= 1;
  const disabledNext = safePage >= totalPages;

  const tokens = useMemo(
    () => buildTokens(safePage, totalPages, siblingCount, boundaryCount, showArrows),
    [safePage, totalPages, siblingCount, boundaryCount, showArrows]
  );

  const go = (p: number) => {
    const next = clamp(p, 1, totalPages);
    if (next !== safePage) onPageChange(next);
  };

  const renderNumber = (n: number) => {
    const active = n === safePage;

    if (variant === "minimal") {
      return (
        <Hit
          key={`n-${n}`}
          onPress={() => go(n)}
          size={hitSize}
          a11yLabel={`Página ${n}${active ? " (ativa)" : ""}`}
        >
          <View
            style={{
              width: activeSize,
              height: activeSize,
              borderRadius: activeSize / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? theme.colors.onPrimary : theme.colors.onSurface,
                fontWeight: active ? "800" : "600",
              }}
            >
              {n}
            </Text>
          </View>
        </Hit>
      );
    }

    // variante "boxed"
    return (
      <Hit
        key={`n-${n}`}
        onPress={() => go(n)}
        size={hitSize}
        a11yLabel={`Página ${n}${active ? " (ativa)" : ""}`}
      >
        <View
          style={{
            minWidth: activeSize,
            height: activeSize,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? theme.colors.secondaryContainer : "transparent",
          }}
        >
          <Text
            style={{
              color: active ? theme.colors.primary : theme.colors.onSurface,
              fontWeight: "700",
            }}
          >
            {n}
          </Text>
        </View>
      </Hit>
    );
  };

  const renderDots = (id: "left" | "right") => (
    <View
      key={`dots-${id}`}
      style={{ width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: "700" }}>…</Text>
    </View>
  );

  const renderArrow = (type: "prev" | "next") => {
    const isPrev = type === "prev";
    const disabled = isPrev ? disabledPrev : disabledNext;
    const label = isPrev ? "Anterior" : "Seguinte";
    const target = isPrev ? safePage - 1 : safePage + 1;

    return (
      <Hit
        key={type} // <- chave estável
        onPress={() => go(target)}
        size={hitSize}
        a11yLabel={label}
        disabled={disabled}
      >
        <Text style={{ color: theme.colors.onSurface, fontSize: 18, opacity: disabled ? 0.35 : 1 }}>
          {isPrev ? "‹" : "›"}
        </Text>
      </Hit>
    );
  };

  // Envolve cada token num wrapper com marginRight = gap (exceto o último)
  const items = tokens.map((t, idx) => {
    const isLast = idx === tokens.length - 1;
    let node: React.ReactNode;

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

    return (
      <View key={`wrap-${(t as any).n ?? t.type ?? t}`} style={{ marginRight: isLast ? 0 : gap }}>
        {node}
      </View>
    );
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityHint="Deslize para ver mais páginas ou toque para navegar"
    >
      {items}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
});

export default Paginator;

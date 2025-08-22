import React, { useMemo, useRef } from "react";
import { View, StyleSheet, FlatList, ViewStyle, ListRenderItemInfo } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

type TokenNum = { type: "num"; n: number };
type TokenDots = { type: "dots"; id: "left" | "right" };
type TokenArrow = { type: "prev" | "next" };
type Token = TokenNum | TokenDots | TokenArrow;

export interface PaginatorProps {
  /** Página atual (1-based) */
  page: number;
  /** Total de páginas (>= 1) */
  totalPages: number;
  /** Callback ao mudar de página */
  onPageChange: (nextPage: number) => void;

  /** Vizinhos ao redor da atual */
  siblingCount?: number; // default 1
  /** Itens fixos nas pontas (1 mantém 1 e último sempre visíveis) */
  boundaryCount?: number; // default 1
  /** Mostrar setas anterior/seguinte */
  showArrows?: boolean; // default true

  /** Estilo do container */
  style?: ViewStyle;

  /** Diâmetro do círculo ativo (o slot visual do número) */
  activeSize?: number;  // default 28
  /** Largura/altura do “hit area” de cada item (todos iguais) */
  hitSize?: number;     // default 36
  /** Espaço horizontal entre itens */
  gap?: number;         // default 16

  /** Variante: "minimal" (círculo no ativo) ou "boxed" */
  variant?: "minimal" | "boxed";

  accessibilityLabel?: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Gera tokens com ids estáveis para as reticências */
function buildTokens(
  page: number,
  total: number,
  sibling: number,
  boundary: number,
  withArrows: boolean
): Token[] {
  const first = 1;
  const last = total;

  const start = range(first, Math.min(boundary, last));
  const end = range(Math.max(last - boundary + 1, first), last);

  const left = Math.max(page - sibling, boundary + 1);
  const right = Math.min(page + sibling, last - boundary);

  const body = range(left, right);

  const tokens: Token[] = [];
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

const Slot: React.FC<{
  width: number;
  height: number;
  marginRight: number;
  children: React.ReactNode;
}> = ({ width, height, marginRight, children }) => {
  return (
    <View
      style={{
        width,
        height,
        marginRight,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
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
  hitSize = 36,
  gap = 16,
  variant = "minimal",
  accessibilityLabel = "Paginação",
}) => {
  const theme = useTheme();
  const safePage = clamp(page, 1, Math.max(totalPages, 1));

  const disabledPrev = safePage <= 1;
  const disabledNext = safePage >= totalPages;

  const data = useMemo(
    () => buildTokens(safePage, totalPages, siblingCount, boundaryCount, showArrows),
    [safePage, totalPages, siblingCount, boundaryCount, showArrows]
  );

  const keyExtractor = (item: Token) => {
    if (item.type === "num") return `n-${item.n}`;
    if (item.type === "dots") return `dots-${item.id}`;
    return item.type; // "prev" | "next"
  };

  const go = (p: number) => {
    const next = clamp(p, 1, totalPages);
    if (next !== safePage) onPageChange(next);
  };

  const renderNumber = (n: number) => {
    const active = n === safePage;

    if (variant === "minimal") {
      return (
        <TouchableRipple
          onPress={() => go(n)}
          borderless
          style={{ width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel={`Página ${n}${active ? " (ativa)" : ""}`}
        >
          <View style={{ width: activeSize, height: activeSize, alignItems: "center", justifyContent: "center" }}>
            {/* Círculo de fundo absoluto – não mexe layout */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: activeSize / 2,
                  backgroundColor: active ? theme.colors.primary : "transparent",
                },
              ]}
            />
            <Text
              style={{
                color: active ? theme.colors.onPrimary : theme.colors.onSurface,
                fontWeight: active ? "800" : "600",
              }}
            >
              {n}
            </Text>
          </View>
        </TouchableRipple>
      );
    }

    // variante "boxed"
    return (
      <TouchableRipple
        onPress={() => go(n)}
        borderless
        style={{ width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }}
        accessibilityRole="button"
        accessibilityLabel={`Página ${n}${active ? " (ativa)" : ""}`}
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
          <Text style={{ color: active ? theme.colors.primary : theme.colors.onSurface, fontWeight: "700" }}>
            {n}
          </Text>
        </View>
      </TouchableRipple>
    );
  };

  const renderDots = () => (
    <View
      accessible={false}
      style={{ width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: "700" }}>…</Text>
    </View>
  );

  const renderArrow = (type: "prev" | "next") => {
    const isPrev = type === "prev";
    const disabled = isPrev ? disabledPrev : disabledNext;
    const target = isPrev ? safePage - 1 : safePage + 1;

    return (
      <TouchableRipple
        onPress={() => go(target)}
        disabled={disabled}
        borderless
        style={{ width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" }}
        accessibilityRole="button"
        accessibilityLabel={isPrev ? "Anterior" : "Seguinte"}
        accessibilityState={{ disabled }}
      >
        <Text style={{ color: theme.colors.onSurface, fontSize: 18, opacity: disabled ? 0.35 : 1 }}>
          {isPrev ? "‹" : "›"}
        </Text>
      </TouchableRipple>
    );
  };

  const itemWidth = hitSize + gap; // slot previsível

  const renderItem = ({ item, index }: ListRenderItemInfo<Token>) => {
    const isLast = index === data.length - 1;

    return (
      <Slot width={isLast ? hitSize : itemWidth} height={hitSize} marginRight={isLast ? 0 : 0}>
        {item.type === "num"
          ? renderNumber(item.n)
          : item.type === "dots"
          ? renderDots()
          : renderArrow(item.type)}
      </Slot>
    );
  };

  // FlatList evita “pulos” de layout do ScrollView e mantém reuso de células
  const listRef = useRef<FlatList<Token>>(null);

  return (
    <FlatList
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.row}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      // todos os itens têm o mesmo layout (opcionalmente otimiza scroll)
      getItemLayout={(_, index) => ({
        length: itemWidth,
        offset: itemWidth * index,
        index,
      })}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Deslize para ver mais páginas ou toque para navegar"
    />
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingHorizontal: 6,
  },
});

export default Paginator;

import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Animated,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
  Dimensions,
} from "react-native";
import {
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

export type QuestionChoice = {
  id: string;
  label: string;
  image?: ImageSourcePropType;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export interface QuestionChoicesProps {
  question: string;
  options: QuestionChoice[];
  visibleCount?: number;
  multiple?: boolean;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  columns?: number;
  itemMinHeight?: number;
  gap?: number;
  style?: ViewStyle;
  itemStyle?: ViewStyle;
  itemTextStyle?: TextStyle;
  itemRadius?: number;
}

const AnimatedRipple: React.FC<{
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  selected?: boolean;
}> = ({ onPress, disabled, children, style, accessibilityLabel, selected }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableRipple
        onPress={onPress}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, selected }}
        borderless={false}
        style={{ borderRadius: (style as any)?.borderRadius ?? 16 }}
      >
        <View>{children}</View>
      </TouchableRipple>
    </Animated.View>
  );
};

const defaultCols = () => {
  const w = Dimensions.get("window").width;
  if (w >= 900) return 5;
  if (w >= 700) return 4;
  if (w >= 480) return 3;
  return 2;
};

const QuestionChoices: React.FC<QuestionChoicesProps> = ({
  question,
  options,
  visibleCount,
  multiple = false,
  value,
  onChange,
  columns,
  itemMinHeight = 84,
  gap = 16,
  style,
  itemStyle,
  itemTextStyle,
  itemRadius = 16,
}) => {
  const theme = useTheme();

  const colCount = columns ?? defaultCols();
  const data = useMemo(
    () => (typeof visibleCount === "number" ? options.slice(0, visibleCount) : options),
    [options, visibleCount]
  );

  const isSelected = (id: string) => {
    if (multiple) return Array.isArray(value) && value.includes(id);
    return value === id;
  };

  const toggle = (id: string) => {
    if (!onChange) return;
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      onChange(next);
    } else {
      onChange(id);
    }
  };

  // largura por coluna em %, tipada corretamente como template literal
  const pct = 100 / colCount;
  const itemWidth: `${number}%` = `${pct}%`;

  return (
    <View style={style}>
      {/* Cabeçalho/pergunta estilo "pill" */}
      <Surface
        elevation={2}
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.surfaceVariant,
            shadowColor: "#000",
          },
        ]}
        accessibilityRole="header"
        accessibilityLabel={question}
      >
        <Text
          variant="titleMedium"
          style={[styles.pillText, { color: theme.colors.primary }]}
        >
          {question}
        </Text>
      </Surface>

      {/* Grade de opções */}
      <View
        style={[
          styles.grid,
          { gap, marginTop: gap, rowGap: gap },
        ]}
      >
        {data.map((opt) => {
          const selected = isSelected(opt.id);
          return (
            <Surface
              key={opt.id}
              elevation={selected ? 4 : 2}
              style={[
                styles.item,
                {
                  minHeight: itemMinHeight,
                  borderRadius: itemRadius,
                  width: itemWidth, // <-- agora tipado como `${number}%`
                  backgroundColor: selected
                    ? theme.colors.secondaryContainer
                    : theme.colors.surface,
                },
                itemStyle,
              ]}
            >
              <AnimatedRipple
                onPress={() => toggle(opt.id)}
                disabled={opt.disabled}
                selected={selected}
                accessibilityLabel={
                  opt.accessibilityLabel ??
                  `${opt.label}. ${selected ? "Selecionado" : "Não selecionado"}`
                }
                style={{ borderRadius: itemRadius }}
              >
                <View style={styles.itemContent}>
                  {opt.image ? (
                    <Image
                      source={opt.image}
                      style={[
                        styles.image,
                        { borderRadius: itemRadius - 6 },
                      ]}
                      resizeMode="cover"
                      accessible={false}
                    />
                  ) : null}

                  <Text
                    variant="titleSmall"
                    numberOfLines={2}
                    style={[
                      styles.itemLabel,
                      itemTextStyle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
              </AnimatedRipple>
            </Surface>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    // sem overflow: hidden para manter sombra no Android
  },
  pillText: {
    fontWeight: "700",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  item: {
    // elevation no Surface já cria sombra
  },
  itemContent: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
  },
  itemLabel: {
    textAlign: "center",
  },
});

export default QuestionChoices;

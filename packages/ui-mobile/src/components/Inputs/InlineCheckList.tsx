import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import {
  Text,
  TouchableRipple,
  useTheme,
  Surface,
} from "react-native-paper";

export type InlineCheckOption = {
  id: string;
  label: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export interface InlineCheckListProps {
  /** Título acima das opções (ex.: "Géneros") */
  title?: string;
  /** Opções listadas */
  options: InlineCheckOption[];
  /** Valor selecionado (múltipla seleção) */
  value?: string[];
  /** Callback de alteração */
  onChange?: (next: string[]) => void;
  /** Cor do “badge” de check quando selecionado */
  checkColor?: string;
  /** Tamanho do badge (largura/altura) */
  checkSize?: number;
  /** Espaço entre itens */
  gap?: number;
  /** Estilos extras */
  style?: ViewStyle;
  titleStyle?: TextStyle;
  itemTextStyle?: TextStyle;
}

const InlineItem: React.FC<{
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  checkColor: string;
  checkSize: number;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}> = ({
  label,
  selected,
  disabled,
  onPress,
  checkColor,
  checkSize,
  textStyle,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected, disabled }}
      style={styles.touchHit}
      rippleColor={theme.colors.primary}
      borderless
    >
      <View style={styles.inlineRow}>
        <Text
          variant="titleSmall"
          style={[
            { color: theme.colors.onSurface },
            textStyle,
            disabled && { opacity: 0.6 },
          ]}
        >
          {label}
        </Text>

        <Surface
          elevation={selected ? 1 : 0}
          style={[
            styles.check,
            {
              width: checkSize,
              height: checkSize,
              borderRadius: 6,
              marginLeft: 6,
              borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: selected ? checkColor : theme.colors.surface,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {selected ? (
            <Text style={styles.tick}>✓</Text>
          ) : null}
        </Surface>
      </View>
    </TouchableRipple>
  );
};

const InlineCheckList: React.FC<InlineCheckListProps> = ({
  title,
  options,
  value = [],
  onChange,
  checkColor = "#7AC943", // verde semelhante ao do print
  checkSize = 18,
  gap = 14,
  style,
  titleStyle,
  itemTextStyle,
}) => {
  const theme = useTheme();

  const toggle = (id: string) => {
    if (!onChange) return;
    const next = value.includes(id)
      ? value.filter((x) => x !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <View style={style}>
      {title ? (
        <Text
          variant="titleSmall"
          style={[{ marginBottom: 6, fontWeight: "600" }, titleStyle]}
          accessibilityRole="header"
          accessibilityLabel={title}
        >
          {title}
        </Text>
      ) : null}

      <View style={[styles.wrap, { gap, rowGap: gap }]}>
        {options.map((opt) => (
          <InlineItem
            key={opt.id}
            label={opt.label}
            selected={value.includes(opt.id)}
            disabled={opt.disabled}
            onPress={() => toggle(opt.id)}
            checkColor={checkColor}
            checkSize={checkSize}
            textStyle={itemTextStyle}
            accessibilityLabel={opt.accessibilityLabel}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  touchHit: {
    paddingVertical: 4,
    paddingRight: 2,
  },
  check: {
    alignItems: "center",
    justifyContent: "center",
  },
  tick: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 12,
  },
});

export default InlineCheckList;

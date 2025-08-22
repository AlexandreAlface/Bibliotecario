import React from "react";
import { View, StyleSheet, ImageSourcePropType, ViewStyle, TextStyle } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";

export type ChipOption = {
  id: string;
  label: string;
  /** opcional: ícone do Paper (ex.: "baby") ou imagem */
  icon?: string | ImageSourcePropType;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export interface ChoiceChipsProps {
  /** Título acima dos chips (ex.: "Faixa Etária") */
  title?: string;
  /** Opções */
  options: ChipOption[];
  /** Seleção atual (string para simples, string[] para múltipla) */
  value?: string | string[];
  /** Controla se é múltipla escolha */
  multiple?: boolean;
  /** Callback ao mudar */
  onChange?: (value: string | string[]) => void;
  /** Densidade/altura do chip */
  size?: "sm" | "md" | "lg";
  /** Espaçamento entre chips */
  gap?: number;
  /** Estilo extra */
  style?: ViewStyle;
  titleStyle?: TextStyle;
  /** Desabilitar tudo */
  disabled?: boolean;
}

const ChoiceChips: React.FC<ChoiceChipsProps> = ({
  title,
  options,
  value,
  multiple = false,
  onChange,
  size = "md",
  gap = 8,
  style,
  titleStyle,
  disabled,
}) => {
  const theme = useTheme();

  const isSelected = (id: string) =>
    multiple ? Array.isArray(value) && value.includes(id) : value === id;

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

  const heights: Record<NonNullable<ChoiceChipsProps["size"]>, number> = {
    sm: 28,
    md: 34,
    lg: 40,
  };
  const paddings: Record<NonNullable<ChoiceChipsProps["size"]>, number> = {
    sm: 6,
    md: 8,
    lg: 10,
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

      <View style={[styles.row, { gap, rowGap: gap }]}>
        {options.map((opt) => {
          const selected = isSelected(opt.id);

          return (
            <Chip
              key={opt.id}
              icon={opt.icon}
              selected={selected}
              onPress={() => toggle(opt.id)}
              compact
              disabled={disabled || opt.disabled}
              accessibilityLabel={opt.accessibilityLabel ?? opt.label}
              mode="outlined"
              style={[
                {
                  height: heights[size],
                  borderRadius: 12,
                  borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                },
              ]}
              textStyle={{
                fontSize: size === "sm" ? 12 : size === "md" ? 14 : 15,
                fontWeight: "600",
                color: theme.colors.onSurface,
              }}
              selectedColor={theme.colors.onPrimaryContainer}
              showSelectedCheck={false}
              rippleColor={theme.colors.primary}
              // background quando selecionado
              elevated={false}
              theme={{
                colors: {
                  // @ts-ignore
                  surfaceDisabled: theme.colors.surfaceDisabled,
                  // quando selected=true, Paper usa 'secondaryContainer' como fundo do Chip (v3)
                  secondaryContainer: theme.colors.secondaryContainer,
                },
              }}
            >
              {opt.label}
            </Chip>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
});

export default ChoiceChips;

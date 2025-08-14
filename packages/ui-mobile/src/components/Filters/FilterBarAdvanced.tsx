import React, { useMemo, useState } from "react";
import { View, StyleSheet, ViewStyle, Text } from "react-native";
import {
  Chip,
  Divider,
  Menu,
  useTheme,
  TouchableRipple,
} from "react-native-paper";

export type FilterOption = {
  id: string;
  label: string;
};

export type FilterConfig = {
  /** chave única do filtro (ex.: "age" | "theme") */
  key: string;
  /** texto no chip do filtro */
  label: string;
  /** opções do dropdown */
  options: FilterOption[];
  /** se true permite múltipla seleção */
  multiple?: boolean;
};

export type SelectedMap = Record<string, string[] | string | undefined>;

export interface FilterBarAdvancedProps {
  /** filtros que aparecem como chips no topo */
  filters: FilterConfig[];
  /** valores selecionados controlados (por chave) */
  value: SelectedMap;
  /** callback quando algum filtro muda */
  onChange: (next: SelectedMap) => void;
  /** estilos */
  style?: ViewStyle;
  chipsRowStyle?: ViewStyle;
  tagsRowStyle?: ViewStyle;
  /** mostra/oculta a linha de tags selecionadas */
  showSelectedTags?: boolean;
  /** rótulo de acessibilidade para a área de filtros */
  accessibilityLabel?: string;
}

/**
 * Barra de filtros com chips que abrem menus.
 * Mostra os itens selecionados como chips com X, e um Divider separando.
 */
const FilterBarAdvanced: React.FC<FilterBarAdvancedProps> = ({
  filters,
  value,
  onChange,
  style,
  chipsRowStyle,
  tagsRowStyle,
  showSelectedTags = true,
  accessibilityLabel = "Barra de filtros",
}) => {
  const theme = useTheme();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const setFor = (key: string, next: string[] | string | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const toggleOption = (key: string, optId: string, multiple?: boolean) => {
    const current = value[key];

    if (multiple) {
      const arr = Array.isArray(current) ? current : [];
      const next = arr.includes(optId)
        ? arr.filter((x) => x !== optId)
        : [...arr, optId];
      setFor(key, next);
    } else {
      const next = current === optId ? undefined : optId;
      setFor(key, next);
      setOpenKey(null); // fecha em seleção simples
    }
  };

  const clearTag = (key: string, id: string) => {
    const current = value[key];
    if (Array.isArray(current)) {
      setFor(key, current.filter((x) => x !== id));
    } else if (current === id) {
      setFor(key, undefined);
    }
  };

  // gera tags selecionadas para exibir abaixo
  const selectedTags = useMemo(() => {
    const tags: { key: string; id: string; label: string }[] = [];
    for (const f of filters) {
      const sel = value[f.key];
      if (!sel) continue;
      if (Array.isArray(sel)) {
        sel.forEach((id) => {
          const opt = f.options.find((o) => o.id === id);
          if (opt) tags.push({ key: f.key, id, label: opt.label });
        });
      } else {
        const opt = f.options.find((o) => o.id === sel);
        if (opt) tags.push({ key: f.key, id: sel, label: opt.label });
      }
    }
    return tags;
  }, [filters, value]);

  return (
    <View
      style={style}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {/* linha de chips principais */}
      <View style={[styles.row, styles.wrap, chipsRowStyle]}>
        {filters.map((f) => {
          const isOpen = openKey === f.key;
          const selected = value[f.key];
          // título compacto do chip quando há algo selecionado
          const chipLabel =
            Array.isArray(selected) && selected.length > 0
              ? `${f.label}`
              : typeof selected === "string"
              ? `${f.label}`
              : f.label;

          return (
            <Menu
              key={f.key}
              visible={isOpen}
              onDismiss={() => setOpenKey(null)}
              anchor={
                <Chip
                  mode="flat"
                  onPress={() => setOpenKey(isOpen ? null : f.key)}
                  icon={f.key.includes("date") ? "calendar" : undefined}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  textStyle={{ color: theme.colors.onPrimary, fontWeight: "600" }}
                  accessibilityLabel={`Abrir filtro ${f.label}`}
                  selectedColor={theme.colors.onPrimary}
                >
                  {chipLabel} {"  ▾"}
                </Chip>
              }
              contentStyle={[
                styles.menuContent,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {f.options.map((opt, idx) => {
                const isSelected = Array.isArray(selected)
                  ? selected.includes(opt.id)
                  : selected === opt.id;

                return (
                  <TouchableRipple
                    key={opt.id}
                    onPress={() => toggleOption(f.key, opt.id, f.multiple)}
                    accessibilityLabel={`${opt.label}${isSelected ? " (selecionado)" : ""}`}
                    accessibilityRole="menuitem"
                    style={[
                      styles.menuItem,
                      isSelected && {
                        backgroundColor: theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <View style={styles.menuItemRow}>
                      <Text style={[styles.menuItemText, { color: theme.colors.onSurface }]}>
                        {opt.label}
                      </Text>
                      {/* X à direita quando já selecionado */}
                      {isSelected ? (
                        <Text
                          style={styles.menuX}
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                        >
                          ×
                        </Text>
                      ) : null}
                    </View>
                  </TouchableRipple>
                );
              })}
            </Menu>
          );
        })}
      </View>

      {/* Divider */}
      <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

      {/* tags selecionadas */}
      {showSelectedTags ? (
        <View style={[styles.row, styles.wrap, styles.tagsRow, tagsRowStyle]}>
          {selectedTags.map((t) => (
            <Chip
              key={`${t.key}:${t.id}`}
              mode="flat"
              onClose={() => clearTag(t.key, t.id)}
              style={[
                styles.tagChip,
                { backgroundColor: theme.colors.secondary },
              ]}
              textStyle={{ color: theme.colors.onSecondary, fontWeight: "600" }}
              accessibilityLabel={`${t.label}. Remover filtro`}
            >
              {t.label}
            </Chip>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexWrap: "wrap", gap: 10, rowGap: 10 },
  filterChip: {
    borderRadius: 999,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    width: "100%",
  },
  tagsRow: { paddingTop: 2 },
  tagChip: { borderRadius: 999 },
  menuContent: {
    borderRadius: 12,
    elevation: 6,
    paddingVertical: 6,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  menuItemText: { fontSize: 16, fontWeight: "600" },
  menuX: { fontSize: 18, fontWeight: "800", opacity: 0.8 },
});

export default FilterBarAdvanced;

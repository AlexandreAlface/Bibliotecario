import React, { useMemo, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent, Image, Pressable, Dimensions } from "react-native";
import {
  Text,
  Menu,
  Divider,
  TouchableRipple,
  useTheme,
  MenuProps,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ChildOption = {
  id: string;
  name: string;
  avatarUri?: string;
};

export interface SelectChildProps {
  label?: string;
  placeholder?: string;
  value?: string;                 // id selecionado
  options: ChildOption[];
  onChange: (id: string | undefined) => void; // permite limpar (undefined)
  disabled?: boolean;
  menuMaxHeight?: number;         // se não passar, calculo com safe area
  anchorTestID?: string;
  accessibilityLabel?: string;
  /** Ajusta o posicionamento relativo ao anchor */
  anchorPosition?: MenuProps["anchorPosition"];
  /** Mostra um “✕” para limpar a seleção rapidamente */
  clearable?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AvatarBubble = ({
  size = 28,
  uri,
  initials,
}: {
  size?: number;
  uri?: string;
  initials: string;
}) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#D1D5DB",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#424242" }}>
        {initials}
      </Text>
    </View>
  );
};

const SelectChild: React.FC<SelectChildProps> = ({
  label = "Selecionar criança",
  placeholder = "Selecionar criança",
  value,
  options,
  onChange,
  disabled,
  menuMaxHeight,
  anchorTestID,
  accessibilityLabel,
  anchorPosition = "bottom",
  clearable = false,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [anchorWidth, setAnchorWidth] = useState<number | undefined>();

  const selected = useMemo(
    () => options.find((o) => o.id === value),
    [options, value]
  );

  const onAnchorLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (!anchorWidth || Math.abs(anchorWidth - w) > 1) setAnchorWidth(w);
  };

  const selectedInitials = selected ? getInitials(selected.name) : undefined;

  // altura segura (fallback) quando o dev não define menuMaxHeight
  const fallbackMaxH =
    Dimensions.get("window").height - (insets.top + insets.bottom) - 48;

  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? label}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchorPosition={anchorPosition}
        anchor={
          <TouchableRipple
            disabled={disabled}
            onLayout={onAnchorLayout}
            onPress={() => setOpen((v) => !v)}
            testID={anchorTestID}
            accessibilityRole="button"
            accessibilityLabel={
              selected
                ? `${label}. Selecionado: ${selected.name}. Tocar para alterar.`
                : `${label}. Nenhum selecionado. Tocar para abrir.`
            }
            style={[
              styles.anchor,
              {
                borderBottomColor: disabled
                  ? theme.colors.surfaceVariant
                  : theme.colors.primary,
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.anchorRow}>
              {/* Avatar + nome quando selecionado; senão, placeholder */}
              {selected ? (
                <>
                  <AvatarBubble
                    size={28}
                    uri={selected.avatarUri}
                    initials={selectedInitials!}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.anchorText, { color: theme.colors.onSurface }]}
                  >
                    {selected.name}
                  </Text>

                  {/* Botão limpar (opcional) */}
                  {clearable && !disabled ? (
                    <Pressable
                      onPress={() => onChange(undefined)}
                      accessibilityRole="button"
                      accessibilityLabel="Limpar seleção"
                      hitSlop={8}
                    >
                      <Text style={styles.clearX}>✕</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <Text
                  numberOfLines={1}
                  style={[styles.anchorText, { color: theme.colors.primary }]}
                >
                  {placeholder}
                </Text>
              )}

              {/* Chevron simples (pode trocar por ícone do Paper) */}
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.chevron}
              >
                ▾
              </Text>
            </View>
          </TouchableRipple>
        }
        contentStyle={[
          styles.menuContent,
          {
            width: anchorWidth,
            maxHeight: menuMaxHeight ?? fallbackMaxH,
            backgroundColor: theme.colors.background,
          },
        ]}
        style={styles.menuOuter}
      >
        {options.map((opt, idx) => {
          const initials = getInitials(opt.name);
          const isLast = idx === options.length - 1;

          return (
            <React.Fragment key={opt.id}>
              <Menu.Item
                accessibilityLabel={`Selecionar ${opt.name}`}
                leadingIcon={() => (
                  <AvatarBubble size={32} uri={opt.avatarUri} initials={initials} />
                )}
                title={opt.name}
                onPress={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                titleStyle={styles.itemTitle}
                style={styles.menuItem}
              />
              {!isLast && <Divider />}
            </React.Fragment>
          );
        })}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#1B5E20",
  },
  anchor: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
  },
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  anchorText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
    fontSize: 16,
    opacity: 0.7,
  },
  clearX: {
    marginLeft: 6,
    fontSize: 14,
    opacity: 0.6,
  },
  menuOuter: {},
  menuContent: {
    borderRadius: 14,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 10,
  },
  itemTitle: {
    fontSize: 16,
  },
});

export default SelectChild;
export type { SelectChildProps as ISelectChildProps };

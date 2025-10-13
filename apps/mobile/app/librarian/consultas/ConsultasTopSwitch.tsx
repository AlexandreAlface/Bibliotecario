import * as React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Text, useTheme } from "react-native-paper";

type Item = { label: string; href: string; key: "agenda"|"pendentes"|"slots"|"historico" };

const ITEMS: Item[] = [
  { key: "agenda",    label: "Agenda",    href: "/librarian/consultas/agenda" },
  { key: "pendentes", label: "Pendentes", href: "/librarian/consultas/pendentes" },
  { key: "slots",     label: "Slots",     href: "/librarian/consultas/slots" },
  { key: "historico", label: "Histórico", href: "/librarian/consultas/historico" },
];

export default function ConsultasTopSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  // deteta ativo pelo segmento final
  const activeKey = React.useMemo(() => {
    const seg = pathname?.split("/").pop() ?? "";
    if (["agenda","pendentes","slots","historico"].includes(seg)) return seg as Item["key"];
    return "agenda";
  }, [pathname]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, gap: 8, alignItems: "center" }}
    >
      {ITEMS.map((it) => {
        const active = activeKey === it.key;
        return (
          <TouchableOpacity
            key={it.key}
            onPress={() => router.navigate(it.href)}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? theme.colors.primary : theme.colors.secondaryContainer,
              borderWidth: active ? 0 : 1,
              borderColor: theme.colors.outlineVariant,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer, fontWeight: "800" }}>
              {it.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {/* pequeno spacer para não colar à borda em iOS */}
      <View style={{ width: 4 }} />
    </ScrollView>
  );
}

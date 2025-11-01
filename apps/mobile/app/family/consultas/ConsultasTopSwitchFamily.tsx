// apps/mobile/app/family/consultas/ConsultasTopSwitchFamily.tsx
import * as React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Text, useTheme } from "react-native-paper";

type Key = "agendar" | "agenda";
type Item = { label: string; href: string; key: Key };

const ITEMS: Item[] = [
  { key: "agendar", label: "Agendar consultas", href: "/family/consultas/agendar" },
  { key: "agenda",  label: "Agenda",  href: "/family/consultas/agenda"  },
];

export default function ConsultasTopSwitchFamily() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  const activeKey: Key = React.useMemo(() => {
    const seg = pathname?.split("/").pop() ?? "";
    // quando estás em /family/consultas (index), escolhe o “default” que quiseres mostrar como ativo
    if (seg === "" || seg === "consultas" || seg === "index") return "agendar";
    return (["agendar", "agenda"].includes(seg) ? (seg as Key) : "agendar");
  }, [pathname]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, gap: 8, alignItems: "center" }}
    >
      {ITEMS.map((it) => {
        const active = activeKey === it.key;
        return (
          <TouchableOpacity
            key={it.key}
            onPress={() => router.replace(it.href)}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            activeOpacity={0.85}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? theme.colors.primary : theme.colors.secondaryContainer,
              borderWidth: active ? 0 : 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <Text style={{
              color: active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer,
              fontWeight: "800",
            }}>
              {it.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={{ width: 4 }} />
    </ScrollView>
  );
}

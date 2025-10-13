// apps/mobile/app/librarian/consultas/_layout.tsx
import * as React from "react";
import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";



const { Navigator } = createMaterialTopTabNavigator();
export const TopTabs = withLayoutContext(Navigator);

export default function LibrarianConsultasTabsLayout() {
  return (
    <TopTabs
      screenOptions={{
        tabBarIndicatorStyle: { height: 3 },
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <TopTabs.Screen name="pendentes" options={{ title: "Pendentes" }} />
      <TopTabs.Screen name="agenda" options={{ title: "Agenda" }} />
      <TopTabs.Screen name="historico" options={{ title: "Histórico" }} />
    </TopTabs>
  );
}

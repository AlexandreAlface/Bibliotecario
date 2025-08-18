// app/(tabs)/_layout.tsx
import * as React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import IconTabBar, { type IconTabItem } from '@bibliotecario/ui-mobile/components/Navigation/IconTabBar';
import { useAuth } from 'src/contexts/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();
  const role = user?.roles?.[0] ?? 'FAMÍLIA';

  const itemsByRole: Record<string, IconTabItem<string>[]> = {
    FAMÍLIA: [
      { key: 'index', icon: 'home' },
      { key: 'agenda', icon: 'calendar' },
      { key: 'consultas', icon: 'calendar-clock' },
      { key: 'feed', icon: 'rss' },
      { key: 'perfil', icon: 'account' },
    ],
    CRIANÇA: [
      { key: 'index', icon: 'home' },
      { key: 'sugestoes', icon: 'star' },
      { key: 'conquistas', icon: 'trophy' },
      { key: 'feed', icon: 'rss' },
      { key: 'perfil', icon: 'account' },
    ],
    BIBLIOTECÁRIO: [
      { key: 'index', icon: 'home' },
      { key: 'pedidos', icon: 'email' },
      { key: 'familias', icon: 'account-multiple' },
      { key: 'feed', icon: 'rss' },
      { key: 'perfil', icon: 'account' },
    ],
    ADMIN: [
      { key: 'index', icon: 'home' },
      { key: 'feed', icon: 'rss' },
      { key: 'perfil', icon: 'account' },
    ],
  };

  const items = itemsByRole[role];

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {/* aqui passamos os props originais (state, navigation, descriptors) + os nossos items */}
          <IconTabBar activeKey={''} onChange={function (key: string): void {
                  throw new Error('Function not implemented.');
              } } {...props} items={items} />
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="consultas" />
      <Tabs.Screen name="sugestoes" />
      <Tabs.Screen name="conquistas" />
      <Tabs.Screen name="pedidos" />
      <Tabs.Screen name="familias" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}

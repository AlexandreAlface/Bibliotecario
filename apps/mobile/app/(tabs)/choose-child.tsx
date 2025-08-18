import * as React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from 'src/contexts/AuthContext';

function ChildItem({ id, name, onPress }: { id: number; name: string; onPress: (id:number)=>void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress(id)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14, backgroundColor: theme.colors.secondaryContainer,
      }}
    >
      <Avatar.Text size={44} label={name.split(' ').map(s => s[0]).slice(0,2).join('')} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSecondaryContainer }}>{name}</Text>
    </Pressable>
  );
}

export default function ChooseChild() {
  const { user, actAsChild } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = user?.children ?? [];

  async function selectChild(id: number) {
    await actAsChild(id);
    router.replace('/(tabs)'); // entra nas tabs já em modo CRIANÇA
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16, gap: 16 }}>
      <Text variant="titleLarge" style={{ fontWeight: '800' }}>Quem vai ler hoje?</Text>
      <FlatList
        data={children}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <ChildItem {...item} onPress={selectChild} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text>Nenhuma criança associada à tua família.</Text>}
      />
      <Pressable onPress={() => router.replace('/(tabs)')}>
        <Text style={{ textAlign: 'center', marginTop: 18 }}>Entrar em modo família</Text>
      </Pressable>
    </View>
  );
}

import * as React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import Background from '@bibliotecario/ui-mobile/components/Background/Background';

export default function Screen() {
  return (
    <Background>
      <View style={{ padding: 16 }}>
        <Text variant="titleLarge">Em breve…</Text>
      </View>
    </Background>
  );
}

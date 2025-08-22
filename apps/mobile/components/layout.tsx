import * as React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

export function ScreenCenter({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cardWrap}>{children}</View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  cardWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
});

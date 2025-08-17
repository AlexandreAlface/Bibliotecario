import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import * as React from 'react';


export default function NotFound(){
  return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}>
      <Text>Rota não encontrada</Text>
      <Link href="/auth/login">Ir para Login</Link>
    </View>
  );
}

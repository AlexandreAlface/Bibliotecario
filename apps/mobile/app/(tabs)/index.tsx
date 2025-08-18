// app/(tabs)/index.tsx
import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Background from '@bibliotecario/ui-mobile/components/Background/Background';
import FlexibleCard from '@bibliotecario/ui-mobile/components/Card/FlexibleCard';
import { useAuth } from 'src/contexts/AuthContext';

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] ?? 'Leitor';
  const role = user?.roles?.[0] ?? 'FAMÍLIA';

  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text variant="titleLarge" style={{ marginBottom: 12 }}>Olá, {firstName}</Text>

        {/* Linha 1 de chips */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <FlexibleCard
            title="Consultas"
            subtitle="Próx. 15/07 · 11:00"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                Ver consultas
              </Button>
            }
            style={{ width: 160 }}
          />
          <FlexibleCard
            title="Hora do conto"
            subtitle="Hoje · 11 horas"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                Ver eventos
              </Button>
            }
            style={{ width: 160 }}
          />
        </View>

        {/* Linha 2 de chips */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <FlexibleCard
            title={role === 'CRIANÇA' ? 'Sugestões' : 'Leituras atuais'}
            subtitle="O Pequeno Príncipe"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                {role === 'CRIANÇA' ? 'Reservar' : 'Ver leituras'}
              </Button>
            }
            style={{ width: 160 }}
          />
          <FlexibleCard
            title="Diário de um Banana"
            subtitle="10/07"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                Ver mais
              </Button>
            }
            style={{ width: 160 }}
          />
        </View>

        <Section title="Conquistas Recentes">
          <FlexibleCard
            title="Primeira Leitura"
            subtitle="3 livros numa semana · Streak diário"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                Ver conquistas
              </Button>
            }
          />
        </Section>

        <Section title="Feed de Notícias & Dicas">
          <FlexibleCard
            title="Biblioterapia"
            subtitle="Ler antes de dormir ajuda a acalmar a mente…"
            footer={
              <Button mode="contained-tonal" compact onPress={() => {}}>
                Abrir feed
              </Button>
            }
          />
        </Section>
      </ScrollView>
    </Background>
  );
}

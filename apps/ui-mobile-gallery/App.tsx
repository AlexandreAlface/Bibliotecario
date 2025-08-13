import * as React from 'react';
import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import {
  ThemeProvider,
  PrimaryButton,
  SecondaryButton,
  TextField,
  LinkText,
  AvatarItem,
  RadioOption,
} from '@bibliotecario/ui-mobile';

// usa o Text do paper quando quiseres "variant"
import { Text as PaperText } from 'react-native-paper';
import { RadioOptionGroup } from '@bibliotecario/ui-mobile';



export default function App() {
  const [clicks, setClicks] = useState(0);
  const [nome, setNome] = useState('');
  const [dark, setDark] = useState(false);

  // estado do género
  const [genderDefault, setGenderDefault] = useState<string | undefined>('M');
  const [genderDisabled, setGenderDisabled] = useState<string | undefined>('F');

  const options: RadioOption[] = [
    { label: 'Masculino', value: 'M' },
    { label: 'Feminino', value: 'F' },
  ];

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{title}</Text>
      <View style={{ rowGap: 12 }}>{children}</View>
    </View>
  );

  return (
    <ThemeProvider dark={dark}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
        <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 720 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              @bibliotecario/ui-mobile — Gallery
            </Text>

            <Section title="Radio buttons (horizontal)">
              <PaperText variant="titleMedium" style={styles.title}>
                Género
              </PaperText>

              <RadioOptionGroup
                options={options}
                value={genderDefault}
                onChange={setGenderDefault}
                orientation="horizontal"
                required
                elevated
                indicator="circle"
                helperText="Escolhe uma opção."
                accessibilityLabel="Escolha o género (horizontal)"
              />

              <PaperText variant="bodyMedium" style={styles.debug}>
                Selecionado: {genderDefault}
              </PaperText>
            </Section>

            <Section title="Radio buttons (elevated + disabled)">
              <PaperText variant="titleMedium" style={styles.title}>
                Género (desativado)
              </PaperText>

              <View style={{ alignItems: 'center' }}>
                <RadioOptionGroup
                  options={options}
                  value={genderDisabled}
                  onChange={setGenderDisabled}
                  orientation="horizontal"
                  elevated
                  disabled
                  accessibilityLabel="Escolha o género (desativado)"
                />
              </View>

              <PaperText variant="bodyMedium" style={styles.debug}>
                Selecionado: {genderDisabled}
              </PaperText>
            </Section>

            <Section title="Botões">
              <PrimaryButton fullWidth onPress={() => setClicks((c) => c + 1)}>
                Cliquei {clicks} vezes
              </PrimaryButton>

              <SecondaryButton fullWidth onPress={() => setClicks(0)}>
                Reset
              </SecondaryButton>

              <SecondaryButton fullWidth onPress={() => setDark((d) => !d)}>
                Alternar tema: {dark ? 'Escuro' : 'Claro'}
              </SecondaryButton>
            </Section>

            <Section title="TextField">
              <TextField
                fullWidth
                placeholder="Escreve o teu nome..."
                value={nome}
                onChangeText={setNome}
              />
            </Section>

            <Section title="LinkText">
              <LinkText href="https://pnl2027.gov.pt" underline align="center" size="md">
                Abrir PNL 2027
              </LinkText>
            </Section>

            <Section title="AvatarItem">
              <AvatarItem
                label="Camila"
                description="7 anos"
                // avatarSrc="https://example.com/avatar.png"
                actions={[
                  { icon: 'pencil', onPress: () => console.log('editar'), accessibilityLabel: 'Editar' },
                  { icon: 'delete', onPress: () => console.log('apagar'), accessibilityLabel: 'Apagar' },
                ]}
                accessibilityRole="button"
                onPress={() => console.log('abrir perfil')}
              />
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#6f6a64',
  },
  title: {
    // como a Section é branca, usa cor escura
    color: '#222222',
    marginBottom: 8,
  },
  debug: {
    marginTop: 12,
    color: '#333333',
    opacity: 0.8,
  },
});

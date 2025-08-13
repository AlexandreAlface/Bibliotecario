import * as React from 'react';
import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text } from "react-native";
import {
  ThemeProvider,
  PrimaryButton,
  SecondaryButton,
  TextField,
  LinkText,
  AvatarItem,
} from "@bibliotecario/ui-mobile";

export default function App() {
  const [clicks, setClicks] = useState(0);
  const [nome, setNome] = useState("");
  const [dark, setDark] = useState(false);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>{title}</Text>
      <View style={{ rowGap: 12 }}>{children}</View>
    </View>
  );

  return (
    <ThemeProvider dark={dark}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f5f7" }}>
        <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: 720 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 16 }}>
              @bibliotecario/ui-mobile — Gallery
            </Text>

            <Section title="Botões">
              <PrimaryButton fullWidth onPress={() => setClicks((c) => c + 1)}>
                Cliquei {clicks} vezes
              </PrimaryButton>

              <SecondaryButton fullWidth onPress={() => setClicks(0)}>
                Reset
              </SecondaryButton>

              <SecondaryButton fullWidth onPress={() => setDark((d) => !d)}>
                Alternar tema: {dark ? "Escuro" : "Claro"}
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
                // avatarSrc="https://example.com/avatar.png" // se quiseres testar imagem
                actions={[
                  { icon: "pencil", onPress: () => console.log("editar"), accessibilityLabel: "Editar" },
                  { icon: "delete", onPress: () => console.log("apagar"), accessibilityLabel: "Apagar" },
                ]}
                accessibilityRole="button"
                onPress={() => console.log("abrir perfil")}
              />
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemeProvider>
  );
}

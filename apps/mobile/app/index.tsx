import { LinkText, PrimaryButton, SecondaryButton, TextField, ThemeProvider } from "@bibliotecario/ui-mobile";
import { View, StyleSheet } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";

import * as React from "react";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");


const [secure, setSecure] = useState(true);
const toggleSecure = () => setSecure((s) => !s);

  return (
    <ThemeProvider>
      <View style={styles.center}>
        <TextField
          label="Email ou Telefone"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />


        <TextField
          label="Palavra-passe"
          value={pass}
          onChangeText={setPass}
          secureTextEntry={secure}

          right={
            <PaperTextInput.Icon
              icon={secure ? "eye-off" : "eye"}
              onPress={toggleSecure}
            />
          }
          fullWidth
        />

        <PrimaryButton
          label="Entrar"
          onPress={() => { } }
          fullWidth
          style={{ width: "90%", marginBottom: 10 }} children={undefined}        />

        <SecondaryButton
          label="Criar Conta"
          onPress={() => { } }
          fullWidth
          style={{ width: "90%" }} children={undefined}        />

        <View style={{ height: 16 }} />

        <LinkText size="md" align="center" style={{ width: "90%" }}>
          Esqueceste-te da palavra-passe?
        </LinkText>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

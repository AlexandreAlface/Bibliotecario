// app/auth/login.tsx
import * as React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Text, useTheme } from "react-native-paper";

import {
  Background,
  PrimaryButton,
  SecondaryButton,
  TextField,
} from "@bibliotecario/ui-mobile";
import { authApi } from "services/auth";

import { useAuth } from "src/contexts/AuthContext";

const { login } = useAuth();

const schema = z.object({
  email: z
    .string()
    .min(1, "Obrigatório")
    .email("E-mail inválido")
    .or(
      // aceita telefone também (ex.: 9 dígitos PT) – opcional
      z.string().regex(/^\+?\d[\d\s]{5,}$/, "E-mail ou telefone inválido")
    ),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const theme = useTheme();
  const [showPass, setShowPass] = React.useState(false);

  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: { email: string; password: string }) {
    try {
      await login(values.email, values.password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Falha no login", e?.message || "Tenta novamente.");
    }
  }

  return (
    <Background center={0.72}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 60,
              paddingBottom: 24,
            }}
          >
            <Text
              variant="headlineLarge"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: "700",
                marginBottom: 28,
              }}
            >
              Entrar
            </Text>

            {/* Campo: Email ou Telefone */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 16 }}>
                  <TextField
                    label="Email ou Telefone"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  {!!fieldState.error && (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.error, marginTop: 6 }}
                    >
                      {fieldState.error.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Campo: Palavra-passe com ver/ocultar */}
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 6 }}>
                  <TextField
                    label="Palavra-passe"
                    secureTextEntry={!showPass}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    right={
                      {
                        // RN Paper permite usar objeto {icon, onPress}
                        icon: showPass ? "eye-off-outline" : "eye-outline",
                        onPress: () => setShowPass((s) => !s),
                      } as any
                    }
                    fullWidth
                  />
                  {!!fieldState.error && (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.error, marginTop: 6 }}
                    >
                      {fieldState.error.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Links auxiliares */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Pressable onPress={() => router.push("/auth/help")}>
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onPrimary,
                    textDecorationLine: "underline",
                  }}
                >
                  Problemas ao entrar?
                </Text>
              </Pressable>

              <Pressable onPress={() => router.push("/auth/forgot")}>
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onPrimary,
                    textDecorationLine: "underline",
                    textAlign: "right",
                  }}
                >
                  Esqueceste-te da{"\n"}palavra-passe?
                </Text>
              </Pressable>
            </View>

            {/* Botão Entrar */}
            <View style={{ marginTop: 48 }}>
              <PrimaryButton
                fullWidth
                label="Entrar"
                onPress={handleSubmit(onSubmit)}
                disabled={formState.isSubmitting}
                children={undefined}
              />
            </View>

            {/* CTA inferior */}
            <View
              style={{
                marginTop: "auto",
                alignItems: "center",
                paddingTop: 24,
              }}
            >
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onPrimary, opacity: 0.9 }}
              >
                Não tens conta?{" "}
                <Text
                  variant="bodyMedium"
                  style={{ textDecorationLine: "underline" }}
                  onPress={() => router.push("/auth/signup")}
                >
                  Cria uma conta
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
}

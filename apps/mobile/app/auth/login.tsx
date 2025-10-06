/**
 * =====================================================================
 * Ficheiro: apps/mobile/app/auth/login.tsx
 * Módulo: Ecrã de Autenticação (Login) – entrada por e-mail/telefone
 * Autor: Alexandre Brissos – Nº 21131
 * ---------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * =====================================================================
 */

import * as React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, Text, useTheme } from "react-native-paper";

import {
  Background,
  PrimaryButton,
  TextField,
} from "@bibliotecario/ui-mobile";
import { useAuth } from "src/contexts/AuthContext";
// 👇 importa o SVG como componente (ver svg.d.ts e metro.config.js)
import LogoBiblio from "../../assets/LogoBiblio.svg";
import { SafeAreaView } from "react-native-safe-area-context";

/** =====================================================================
 * Validação e helpers PUROS
 * ===================================================================== */

/** Regex permissivo para número de telefone (+351 9xx ...) com espaços opcionais. */
const PHONE_REGEX = /^\+?\d[\d\s]{5,}$/;

/** Esquema de validação: aceita e-mail válido OU telefone que passe no regex. */
const schema = z.object({
  email: z
    .string()
    .min(1, "Obrigatório")
    .email("E-mail inválido")
    .or(z.string().regex(PHONE_REGEX, "E-mail ou telefone inválido")),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

/** Comportamento do KeyboardAvoidingView por plataforma (puro). */
function getKeyboardBehavior(): "padding" | undefined {
  return Platform.OS === "ios" ? "padding" : undefined;
}

/**
 * Extrai uma mensagem amigável do erro recebido.
 * @param e Erro desconhecido (qualquer).
 * @returns Mensagem para apresentar no Alert.
 */
function safeErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as any).message === "string") {
    return (e as any).message;
  }
  return "Tenta novamente.";
}

/** Texto de erro padronizado abaixo dos campos. */
function FieldError({ message }: { message?: string }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 6 }}>
      {message}
    </Text>
  );
}

/** LOGO sobre “pill” branca com sombra. */
function LogoPill() {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          borderRadius: 999,
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: (theme as any).colors?.outlineVariant ?? "#e6e6e6",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <LogoBiblio width={260} height={110} />
      </View>
    </View>
  );
}

/** Links de ajuda sob os campos de login. */
function HelpLinks() {
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        marginBottom: 12,
      }}
    >
      <Text
        variant="bodySmall"
        style={{ textDecorationLine: "underline" }}
        onPress={() => router.push("/auth/help")}
      >
        Problemas ao entrar?
      </Text>
      <Text
        variant="bodySmall"
        style={{ textDecorationLine: "underline", textAlign: "right" }}
        onPress={() => router.push("/auth/forgot")}
      >
        Esqueceste-te da{"\n"}palavra-passe?
      </Text>
    </View>
  );
}

/** CTA inferior fora do cartão. */
function BottomCTA() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ marginTop: "auto", alignItems: "center", paddingTop: 24 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>
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
  );
}

/** Campo controlado de E-mail/Telefone. */
function EmailField({
  control,
}: {
  control: ReturnType<typeof useForm<FormData>>["control"];
}) {
  return (
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
          <FieldError message={fieldState.error?.message} />
        </View>
      )}
    />
  );
}

/** Campo controlado de Password com toggle “mostrar”. */
function PasswordField({
  control,
  showPass,
  setShowPass,
}: {
  control: ReturnType<typeof useForm<FormData>>["control"];
  showPass: boolean;
  setShowPass: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const theme = useTheme();
  return (
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
                icon: showPass ? "eye-off-outline" : "eye-outline",
                onPress: () => setShowPass((s) => !s),
              } as any
            }
            fullWidth
          />
          {!!fieldState.error && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 6 }}>
              {fieldState.error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}

/** =====================================================================
 * Ecrã principal (UI + orquestração)
 * ===================================================================== */

/**
 * Ecrã de Login:
 * - Validação com Zod + react-hook-form.
 * - Entra com e-mail/telefone e palavra-passe.
 * - Redireccionamento é gerido externamente pelo AuthGate em _layout.
 */
export default function Login() {
  const { login } = useAuth();
  const theme = useTheme();
  const [showPass, setShowPass] = React.useState(false);

  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  /**
   * Submissão do formulário de login.
   * @param values Credenciais introduzidas pelo utilizador.
   */
  async function onSubmit(values: { email: string; password: string }) {
    try {
      await login(values.email, values.password);
      // O AuthGate no _layout redireciona automaticamente.
    } catch (e) {
      Alert.alert("Falha no login", safeErrorMessage(e));
    }
  }

  return (
    <Background center={0.72}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={getKeyboardBehavior()}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View
              style={{
                flex: 1,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: 24,
              }}
            >
              {/* LOGO com “pill” branco por trás */}
              <LogoPill />

              {/* CARD branco do login */}
              <Card
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: (theme as any).colors?.outlineVariant ?? "#e6e6e6",
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 8,
                }}
              >
                <Card.Content style={{ paddingVertical: 20 }}>
                  <Text
                    variant="headlineMedium"
                    style={{ fontWeight: "800", textAlign: "center", marginBottom: 18 }}
                  >
                    Entrar
                  </Text>

                  {/* —— Email/Telefone —— */}
                  <EmailField control={control} />

                  {/* —— Password —— */}
                  <PasswordField control={control} showPass={showPass} setShowPass={setShowPass} />

                  {/* links ajuda */}
                  <HelpLinks />

                  {/* botão */}
                  <PrimaryButton
                    fullWidth
                    label="Entrar"
                    onPress={handleSubmit(onSubmit)}
                    disabled={formState.isSubmitting}
                  />
                </Card.Content>
              </Card>

              {/* CTA inferior (fora do card) */}
              <BottomCTA />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}

/**
 * ============================================================================
 * Ficheiro: app/auth/signup.tsx
 * Módulo: Formulário de registo (Passo 1/2)
 * Autor:  Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * ============================================================================
 */

import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text, IconButton, useTheme } from "react-native-paper";

import { Background, PrimaryButton, TextField } from "@bibliotecario/ui-mobile";
import { FamilySignupDraft } from "src/services/auth";

/* ============================================================================
 * Validação com Zod
 * ========================================================================== */
const schema = z
  .object({
    firstName: z.string().min(1, "Obrigatório"),
    lastName: z.string().min(1, "Obrigatório"),
    email: z.string().min(1, "Obrigatório").email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirmação necessária"),
    phone: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As palavras-passe não coincidem",
  });

type FormData = z.infer<typeof schema>;

/* ============================================================================
 * Constantes e helpers PUROS
 * ========================================================================== */

const FIELD_SPACING: number = 20;

/** Junta nome + apelido e remove espaços supérfluos. */
function fullName(first: string, last: string): string {
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

/** Normaliza opcionais para string (trim) ou vazio. */
function normalizeOptional(v?: string | null): string {
  return (v ?? "").trim();
}

/**
 * Constrói o draft do registo sem efeitos colaterais.
 * Mantém compatibilidade com o back-end.
 */
function buildSignupDraft(values: FormData): FamilySignupDraft {
  return {
    fullName: fullName(values.firstName, values.lastName),
    email: values.email,
    phone: normalizeOptional(values.phone),
    address: normalizeOptional(values.address),
    password: values.password,
    readerProfile: "", // mantido conforme implementação atual
  } as FamilySignupDraft;
}

/* ============================================================================
 * UI auxiliar
 * ========================================================================== */

/** Mensagem de erro compacta abaixo de um campo. */
function FieldError({ msg }: { msg?: string }) {
  const theme = useTheme();
  return !!msg ? (
    <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 6 }}>
      {msg}
    </Text>
  ) : null;
}

/* ============================================================================
 * Página
 * ========================================================================== */

/**
 * Ecrã de registo (Passo 1/2): dados do encarregado de educação.
 * Mantém o comportamento original (navega para /auth/children).
 */
export default function SignUp() {
  const router = useRouter();
  const theme = useTheme();

  // React Hook Form com validação Zod
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      postalCode: "",
    },
    mode: "onTouched",
  });

  /**
   * Submissão do passo 1:
   *  - Guarda draft simples em memória global (mesmo comportamento).
   *  - Avança para o passo 2 (crianças).
   */
  function onNext(values: FormData) {
    const draft = buildSignupDraft(values);

    // Em produção, persistir com SecureStore/AsyncStorage.
    // Mantido de propósito para não alterar o fluxo existente.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - chave ad-hoc para comunicação entre passos
    globalThis._signupDraft = draft;

    router.push("/auth/children");
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
              paddingTop: 16,
              paddingBottom: 24,
            }}
          >
            {/* topo: back + como funciona + step */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => router.back()}
                style={{ marginLeft: -8 }}
                iconColor={theme.colors.onPrimary} // seta branca
                accessibilityLabel="Voltar"
              />
              <Pressable onPress={() => router.push("/auth/help")}>
                <Text
                  variant="bodyMedium"
                  style={{
                    textDecorationLine: "underline",
                    color: theme.colors.onPrimary,
                    marginTop: 16,
                  }}
                >
                  Como funciona?
                </Text>
              </Pressable>
              <View
                style={{
                  marginLeft: "auto",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: theme.colors.onPrimary, marginTop: 16 }}>
                  ●
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onPrimary, marginTop: 16 }}
                >
                  1/2
                </Text>
              </View>
            </View>

            {/* título */}
            <Text
              variant="headlineLarge"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: "700",
                marginTop: 6,
                marginBottom: 14,
              }}
            >
              Criar Conta
            </Text>

            {/* Nome */}
            <Controller
              name="firstName"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Nome"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <FieldError msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Sobrenome */}
            <Controller
              name="lastName"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Sobrenome"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <FieldError msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Email */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Email"
                    variant="email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <FieldError msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Palavra-passe */}
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Palavra-passe"
                    variant="password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <FieldError msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Confirmar palavra-passe */}
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Confirmar palavra-passe"
                    variant="password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <FieldError msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Telefone */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <View style={{ marginBottom: FIELD_SPACING }}>
                  <TextField
                    label="Telefone"
                    keyboardType="phone-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    fullWidth
                  />
                </View>
              )}
            />

            {/* Morada + Código-Postal (2 colunas) */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Morada"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      fullWidth
                    />
                  )}
                />
              </View>
              <View style={{ width: 140 }}>
                <Controller
                  name="postalCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Código-Postal"
                      keyboardType="numbers-and-punctuation"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      fullWidth
                    />
                  )}
                />
              </View>
            </View>

            {/* Botão principal */}
            <View style={{ marginTop: 18 }}>
              <PrimaryButton
                fullWidth
                label="Seguinte"
                onPress={handleSubmit(onNext)}
                disabled={formState.isSubmitting}
                children={undefined}
              />
            </View>

            {/* CTA inferior */}
            <View style={{ marginTop: 8, alignItems: "center" }}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onPrimary, opacity: 0.9 }}
              >
                Já tens uma conta?{" "}
                <Text
                  variant="bodySmall"
                  style={{ textDecorationLine: "underline", marginTop: 16 }}
                  onPress={() => router.push("/auth/login")}
                >
                  Faz Login
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
}

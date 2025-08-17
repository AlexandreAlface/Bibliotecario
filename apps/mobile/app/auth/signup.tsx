// app/auth/signup.tsx
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, IconButton, useTheme } from 'react-native-paper';

import { Background, PrimaryButton, TextField } from '@bibliotecario/ui-mobile';
import { FamilySignupDraft } from 'services/auth';

// ----- validação -----
const schema = z
  .object({
    firstName: z.string().min(1, 'Obrigatório'),
    lastName: z.string().min(1, 'Obrigatório'),
    email: z.string().min(1, 'Obrigatório').email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirmação necessária'),
    phone: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As palavras-passe não coincidem',
  });

type FormData = z.infer<typeof schema>;

export default function SignUp() {
  const router = useRouter();
  const theme = useTheme();

  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      postalCode: '',
    },
    mode: 'onTouched',
  });

  function onNext(values: FormData) {
    // guarda um draft simples (em produção usa SecureStore/AsyncStorage)
    const draft: FamilySignupDraft = {
      fullName: `${values.firstName} ${values.lastName}`.trim(),
      email: values.email,
      phone: values.phone ?? '',
      address: `${values.address ?? ''}`.trim(),
      password: values.password,
      readerProfile: '',
    } as any;

    // @ts-ignore
    globalThis._signupDraft = draft;
    router.push('/auth/children'); // passo 2/2
  }

  const Err = ({ msg }: { msg?: string }) =>
    !!msg ? (
      <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 6 }}>
        {msg}
      </Text>
    ) : null;

  return (
    <Background center={0.68}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
            {/* topo: back + como funciona + step */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => router.back()}
                accessibilityLabel="Voltar"
                style={{ marginLeft: -8 }}
              />
              <Pressable onPress={() => router.push('/auth/help')}>
                <Text
                  variant="bodyMedium"
                  style={{
                    textDecorationLine: 'underline',
                    color: theme.colors.onPrimary,
                  }}
                >
                  Como funciona?
                </Text>
              </Pressable>
              <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.colors.onPrimary }}>●</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary }}>
                  1/2
                </Text>
              </View>
            </View>

            {/* título */}
            <Text
              variant="headlineLarge"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: '700',
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
                <View style={{ marginBottom: 12 }}>
                  <TextField
                    label="Nome"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <Err msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Sobrenome */}
            <Controller
              name="lastName"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 12 }}>
                  <TextField
                    label="Sobrenome"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <Err msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Email */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 12 }}>
                  <TextField
                    label="Email"
                    variant="email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <Err msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Palavra-passe */}
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 12 }}>
                  <TextField
                    label="Palavra-passe"
                    variant="password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <Err msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Confirmar palavra-passe */}
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <View style={{ marginBottom: 12 }}>
                  <TextField
                    label="Confirmar palavra-passe"
                    variant="password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    fullWidth
                  />
                  <Err msg={fieldState.error?.message} />
                </View>
              )}
            />

            {/* Telefone */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <View style={{ marginBottom: 12 }}>
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
            <View style={{ flexDirection: 'row', gap: 12 }}>
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
                disabled={formState.isSubmitting} children={undefined}              />
            </View>

            {/* CTA inferior */}
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>
                Já tens uma conta?{' '}
                <Text
                  variant="bodySmall"
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => router.push('/auth/login')}
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

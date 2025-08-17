// app/auth/children.tsx
import * as React from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, IconButton, RadioButton, Avatar, useTheme } from 'react-native-paper';

import {
  Background,
  PrimaryButton,
  TextField,
  DateTimeField,
  AvatarUpload,     // da tua lib
} from '@bibliotecario/ui-mobile';

import { authApi, ChildInput, FamilySignupDraft } from 'services/auth';

type ChildForm = ChildInput & {
  id: string;
  avatarUri?: string | null;
  birthDate: string; // AAAA-MM-DD
};

export default function ChildrenProfiles() {
  const router = useRouter();
  const theme = useTheme();

  const [children, setChildren] = React.useState<ChildForm[]>([]);
  const [temp, setTemp] = React.useState<ChildForm>({
    id: String(Math.random()),
    firstName: '',
    lastName: '',
    gender: 'M',
    birthDate: '',
    avatarUri: null,
  });

  function addChild() {
    if (!temp.firstName || !temp.birthDate) {
      Alert.alert('Validação', 'Preenche pelo menos o primeiro nome e a data de nascimento.');
      return;
    }
    setChildren((prev) => [...prev, temp]);
    setTemp({
      id: String(Math.random()),
      firstName: '',
      lastName: '',
      gender: 'M',
      birthDate: '',
      avatarUri: null,
    });
  }

  async function createAccount() {
    try {
      // @ts-ignore – vem do passo anterior
      const draft: FamilySignupDraft | undefined = globalThis._signupDraft;
      if (!draft) {
        Alert.alert('Ups', 'Volta ao passo anterior e preenche os dados.');
        return;
      }

      const payload = {
        ...draft,
        children: children.map(({ id, avatarUri, ...rest }) => rest),
      };

      await authApi.registerFamily(payload);
      Alert.alert('Conta criada!', 'Verifica o teu e-mail para confirmar.');
      router.replace('/auth/login');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível criar a conta.');
    }
  }

  const toISODate = (d: Date | null) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`
      : '';

  const ageFromISO = (iso: string) => {
    if (!iso) return undefined;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    const dob = new Date(y, m - 1, d);
    const now = new Date();
    let a = now.getFullYear() - dob.getFullYear();
    const bdayPassed =
      now.getMonth() > dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!bdayPassed) a--;
    return a;
  };

  const age = ageFromISO(temp.birthDate);

  return (
    <Background center={0.68}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* topo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <IconButton icon="arrow-left" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
          <Text
            onPress={() => router.push('/auth/help')}
            style={{ textDecorationLine: 'underline', color: theme.colors.onPrimary }}
          >
            Como funciona?
          </Text>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: theme.colors.onPrimary }}>●</Text>
            <Text style={{ color: theme.colors.onPrimary }}>2/2</Text>
          </View>
        </View>

        {/* título */}
        <Text variant="headlineLarge" style={{ color: theme.colors.onPrimary, fontWeight: '800', marginTop: 6 }}>
          Criar Perfil Criança
        </Text>

        {/* avatar grande (upload da lib) */}
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <AvatarUpload
            uri={temp.avatarUri ?? undefined}
            onPick={((uri: string) => setTemp((p) => ({ ...p, avatarUri: uri }))) as unknown as () => void}
            size={96}
            actionIcon="camera-plus-outline"
            accessibilityLabel="Carregar avatar da criança"
          />
        </View>

        {/* 2 colunas: Primeiro Nome / Sobrenome */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onPrimary, opacity: 0.9, marginBottom: 6 }}>Primeiro Nome</Text>
            <TextField value={temp.firstName} onChangeText={(t) => setTemp((p) => ({ ...p, firstName: t }))} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onPrimary, opacity: 0.9, marginBottom: 6 }}>Sobrenome</Text>
            <TextField value={temp.lastName} onChangeText={(t) => setTemp((p) => ({ ...p, lastName: t }))} fullWidth />
          </View>
        </View>

        <View style={{ height: 12 }} />

        {/* Data de nascimento + Género (sem “Selecionar Perfil” e sem TextField Idade) */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onPrimary, opacity: 0.9, marginBottom: 6 }}>
              Data de nascimento
            </Text>
            <DateTimeField
              value={temp.birthDate ? new Date(temp.birthDate) : null}
              onChange={(d) => setTemp((p) => ({ ...p, birthDate: toISODate(d) }))}
              withTime={false}
              helperText={age != null ? `Idade: ${age} ${age === 1 ? 'ano' : 'anos'}` : ''}
              fullWidth
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onPrimary, opacity: 0.9, marginBottom: 6 }}>Género</Text>
            <RadioButton.Group
              onValueChange={(v) => setTemp((p) => ({ ...p, gender: v as any }))}
              value={temp.gender}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RadioButton value="M" />
                  <Text style={{ color: theme.colors.onPrimary }}>Masculino</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RadioButton value="F" />
                  <Text style={{ color: theme.colors.onPrimary }}>Feminino</Text>
                </View>
              </View>
            </RadioButton.Group>
          </View>
        </View>

        {/* separador */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 12,
            opacity: 0.6,
          }}
        />

        {/* lista de perfis criados */}
        <Text style={{ color: theme.colors.onPrimary, marginBottom: 8 }}>Perfis Criados:</Text>
        <View style={{ maxHeight: 180, borderRadius: 12, overflow: 'hidden' }}>
          <ScrollView>
            {children.length === 0 ? (
              <Text style={{ color: theme.colors.onPrimary, opacity: 0.7 }}>
                Ainda não adicionaste nenhuma criança.
              </Text>
            ) : (
              children.map((c) => (
                <View
                  key={c.id}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}
                >
                  {c.avatarUri ? (
                    <Avatar.Image size={36} source={{ uri: c.avatarUri }} />
                  ) : (
                    <Avatar.Icon size={36} icon="account-child" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.onPrimary }}>
                      {c.firstName} {c.lastName ? `${c.lastName}` : ''}{' '}
                      {ageFromISO(c.birthDate) != null ? `• ${ageFromISO(c.birthDate)} anos` : ''}
                    </Text>
                  </View>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => {
                      setTemp(c);
                      setChildren((prev) => prev.filter((x) => x.id !== c.id));
                    }}
                  />
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    onPress={() => setChildren((p) => p.filter((x) => x.id !== c.id))}
                  />
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* linha fina */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 12,
            opacity: 0.4,
          }}
        />

        {/* ações inferiores */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton fullWidth label="Adicionar outra criança" onPress={addChild} children={undefined} />
          </View>
          <View style={{ width: 140 }}>
            <PrimaryButton fullWidth label="Criar Conta" onPress={createAccount} children={undefined} />
          </View>
        </View>
      </ScrollView>
    </Background>
  );
}

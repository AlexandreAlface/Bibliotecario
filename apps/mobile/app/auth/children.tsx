// app/auth/children.tsx
import * as React from "react";
import { Alert, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Text, IconButton, Avatar, useTheme } from "react-native-paper";

import {
  Background,
  PrimaryButton,
  TextField,
  DateTimeField,
  AvatarUpload,
  RadioOptionGroup, // ← usa o teu componente do UI Mobile
} from "@bibliotecario/ui-mobile";

import { authApi, ChildInput, FamilySignupDraft } from "services/auth";
import { registerTranslation, pt } from "react-native-paper-dates";

registerTranslation("pt", pt);
registerTranslation("pt-PT", { ...pt });

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
    firstName: "",
    lastName: "",
    gender: "M",
    birthDate: "",
    avatarUri: null,
  });

  function addChild() {
    if (!temp.firstName || !temp.birthDate) {
      Alert.alert(
        "Validação",
        "Preenche pelo menos o primeiro nome e a data de nascimento."
      );
      return;
    }
    const ageInfo = ageFromISO(temp.birthDate);
    if (!ageInfo) {
      Alert.alert("Validação", "Data de nascimento inválida.");
      return;
    }
    if (ageInfo.totalMonths < 0) {
      Alert.alert("Validação", "A data de nascimento não pode ser no futuro.");
      return;
    }
    setChildren((prev) => [...prev, temp]);
    setTemp({
      id: String(Math.random()),
      firstName: "",
      lastName: "",
      gender: "M",
      birthDate: "",
      avatarUri: null,
    });
  }

  async function createAccount() {
    try {
      // @ts-ignore — do passo anterior
      const draft: FamilySignupDraft | undefined = globalThis._signupDraft;
      if (!draft) {
        Alert.alert("Ups", "Volta ao passo anterior e preenche os dados.");
        return;
      }
      const payload = {
        ...draft,
        children: children.map(({ id, avatarUri, ...rest }) => rest),
      };
      await authApi.registerFamily(payload);
      Alert.alert("Conta criada!", "Verifica o teu e-mail para confirmar.");
      router.replace("/auth/login");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Não foi possível criar a conta.");
    }
  }

  const toISODate = (d: Date | null) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`
      : "";

  /** anos/meses e label; null se inválida */
  function ageFromISO(iso: string): {
    years: number;
    months: number;
    totalMonths: number;
    label: string;
  } | null {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return null;

    const dob = new Date(y, m - 1, d);
    if (isNaN(dob.getTime())) return null;

    const now = new Date();
    const ymDob = y * 12 + (m - 1);
    const ymNow = now.getFullYear() * 12 + now.getMonth();
    let totalMonths = ymNow - ymDob;
    if (now.getDate() < d) totalMonths -= 1;

    const years = Math.floor(totalMonths / 12);
    const months = Math.max(0, totalMonths % 12);
    const label =
      totalMonths < 0
        ? "—"
        : years >= 1
        ? `${years} ${years === 1 ? "ano" : "anos"}`
        : `${months} ${months === 1 ? "mês" : "meses"}`;
    return { years, months, totalMonths, label };
  }

  const ageInfo = ageFromISO(temp.birthDate);

  // mock para simular upload
  const MOCK_AVATARS = [
    "https://i.pravatar.cc/200?img=5",
    "https://i.pravatar.cc/200?img=12",
    "https://i.pravatar.cc/200?img=25",
    "https://i.pravatar.cc/200?img=33",
  ];
  const [mockIndex, setMockIndex] = React.useState(0);

  return (
    <Background center={0.72}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* topo */}
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
        >
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={{ marginLeft: -8 }}
            iconColor={theme.colors.onPrimary} // seta branca
            accessibilityLabel="Voltar"
          />
          <Text
            onPress={() => router.push("/auth/help")}
            style={{
              textDecorationLine: "underline",
              color: theme.colors.onPrimary,
              marginTop: 16,
            }}
          >
            Como funciona?
          </Text>
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
            <Text style={{ color: theme.colors.onPrimary, marginTop: 16 }}>
              2/2
            </Text>
          </View>
        </View>

        {/* título */}
        <Text
          variant="headlineLarge"
          style={{
            color: theme.colors.onPrimary,
            fontWeight: "800",
            marginTop: 6,
            marginBottom: 8,
          }}
        >
          Criar Perfil Criança
        </Text>

        {/* avatar grande (upload simulado) */}
        <View style={{ alignItems: "center", marginVertical: 12 }}>
          <AvatarUpload
            uri={temp.avatarUri ?? undefined}
            onPick={() => {
              const next = MOCK_AVATARS[mockIndex % MOCK_AVATARS.length];
              setMockIndex((i) => i + 1);
              setTemp((p) => ({ ...p, avatarUri: next }));
            }}
            size={112}
            actionIcon="camera-plus-outline"
            accessibilityLabel="Carregar avatar da criança (simulado)"
          />
        </View>

        {/* campos em UMA COLUNA */}
        <View style={{ gap: 12 }}>
          <View>
            <Text
              style={{
                color: theme.colors.onPrimary,
                opacity: 0.9,
                marginBottom: 6,
              }}
            >
              Primeiro Nome
            </Text>
            <TextField
              value={temp.firstName}
              onChangeText={(t) => setTemp((p) => ({ ...p, firstName: t }))}
              fullWidth
            />
          </View>

          <View>
            <Text
              style={{
                color: theme.colors.onPrimary,
                opacity: 0.9,
                marginBottom: 6,
              }}
            >
              Sobrenome
            </Text>
            <TextField
              value={temp.lastName}
              onChangeText={(t) => setTemp((p) => ({ ...p, lastName: t }))}
              fullWidth
            />
          </View>

          <View>
            <Text
              style={{
                color: theme.colors.onPrimary,
                opacity: 0.9,
                marginBottom: 6,
              }}
            >
              Data de nascimento
            </Text>
            <DateTimeField
              value={temp.birthDate ? new Date(temp.birthDate) : null}
              onChange={(d) =>
                setTemp((p) => ({ ...p, birthDate: toISODate(d) }))
              }
              withTime={false}
              fullWidth
              maximumDate={new Date()} // impede datas futuras
              helperText={
                ageInfo
                  ? ageInfo.totalMonths < 0
                    ? "Data no futuro não é válida."
                    : `Idade: ${ageInfo.label}`
                  : ""
              }
            />
          </View>

          {/* GÉNERO — usa RadioOptionGroup (UI Mobile) */}
          <RadioOptionGroup
            label="Género"
            options={[
              { label: "Masculino", value: "M" },
              { label: "Feminino", value: "F" },
              { label: "Outro", value: "O" },
            ]}
            value={temp.gender}
            onChange={(v) => setTemp((p) => ({ ...p, gender: v as any }))}
            orientation="horizontal"
            indicator="circle" // bolinha custom para iOS/nativo
            elevated={false}
            helperText={undefined}
            errorText={undefined}
            textColor="#fff"
            style={{ marginTop: 4 }}
          />
        </View>

        {/* separador */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 16,
            opacity: 0.6,
          }}
        />

        {/* lista de perfis */}
        <Text style={{ color: theme.colors.onPrimary, marginBottom: 8 }}>
          Perfis Criados:
        </Text>
        <View style={{ maxHeight: 180, borderRadius: 12, overflow: "hidden" }}>
          <ScrollView>
            {children.length === 0 ? (
              <Text style={{ color: theme.colors.onPrimary, opacity: 0.7 }}>
                Ainda não adicionaste nenhuma criança.
              </Text>
            ) : (
              children.map((c) => {
                const info = ageFromISO(c.birthDate);
                return (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      gap: 10,
                    }}
                  >
                    {c.avatarUri ? (
                      <Avatar.Image size={36} source={{ uri: c.avatarUri }} />
                    ) : (
                      <Avatar.Icon size={36} icon="account-child" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.onPrimary }}>
                        {c.firstName} {c.lastName ? `${c.lastName}` : ""} •{" "}
                        {info ? info.label : "—"}
                      </Text>
                    </View>
                    <IconButton
                      icon="pencil"
                      size={18}
                      onPress={() => {
                        setTemp(c);
                        setChildren((prev) =>
                          prev.filter((x) => x.id !== c.id)
                        );
                      }}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={18}
                      onPress={() =>
                        setChildren((p) => p.filter((x) => x.id !== c.id))
                      }
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* separador */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 16,
            opacity: 0.4,
          }}
        />

        {/* ações */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              fullWidth
              label="Adicionar outra criança"
              onPress={addChild}
              children={undefined}
            />
          </View>
          <View style={{ width: 150 }}>
            <PrimaryButton
              fullWidth
              label="Criar Conta"
              onPress={createAccount}
              children={undefined}
            />
          </View>
        </View>
      </ScrollView>
    </Background>
  );
}

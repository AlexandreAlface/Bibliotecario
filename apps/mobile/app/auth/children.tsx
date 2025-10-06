/**
 * =====================================================================
 * Ficheiro: app/auth/children.tsx
 * Módulo: Passo 2/2 — criação de perfis de crianças no registo
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
import { Alert, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Text, IconButton, Avatar, useTheme } from "react-native-paper";

import {
  Background,
  PrimaryButton,
  TextField,
  DateTimeField,
  AvatarUpload,
  RadioOptionGroup, // componente do UI Mobile
} from "@bibliotecario/ui-mobile";

import { authApi, ChildInput, FamilySignupDraft } from "src/services/auth";
import { registerTranslation, pt } from "react-native-paper-dates";

/* ============================================================================
 * Localização do picker de data/hora (PT e PT-PT)
 * ========================================================================== */
registerTranslation("pt", pt);
registerTranslation("pt-PT", { ...pt });

/* ============================================================================
 * Tipos e Constantes
 * ========================================================================== */

/**
 * Tipo do formulário de criança no contexto do registo.
 * - Mantém os campos de `ChildInput` e adiciona id local, avatar e data ISO.
 */
type ChildForm = ChildInput & {
  id: string;
  avatarUri?: string | null;
  /** Data de nascimento em formato ISO "AAAA-MM-DD". */
  birthDate: string;
};

/** Avatares de exemplo para o mock de upload (sem efeitos colaterais remotos). */
const MOCK_AVATARS = [
  "https://i.pravatar.cc/200?img=5",
  "https://i.pravatar.cc/200?img=12",
  "https://i.pravatar.cc/200?img=25",
  "https://i.pravatar.cc/200?img=33",
] as const;

/** Gera um id local simples para linhas temporárias. */
const randId = () => String(Math.random());

/* ============================================================================
 * Helpers PUROS
 * ========================================================================== */

/**
 * Converte uma `Date` para ISO "AAAA-MM-DD".
 * @param d Data ou `null`.
 * @returns String "AAAA-MM-DD" ou string vazia se `null`.
 */
function toISODate(d: Date | null): string {
  return d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    : "";
}

/**
 * Calcula idade (anos/meses) a partir de uma data ISO.
 * @param iso Data ISO "AAAA-MM-DD".
 * @returns Objeto com `years`, `months`, `totalMonths` e `label`, ou `null` se inválida.
 */
function ageFromISO(iso: string):
  | {
      years: number;
      months: number;
      totalMonths: number;
      label: string;
    }
  | null {
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

/* ============================================================================
 * Componente
 * ========================================================================== */

/**
 * Ecrã de criação/gestão de perfis de crianças durante o registo da família.
 * - Permite adicionar várias crianças a partir de um formulário simples.
 * - Mostra lista editável das crianças criadas localmente.
 * - No final, cria a conta familiar com os perfis indicados.
 */
export default function ChildrenProfiles() {
  const router = useRouter();
  const theme = useTheme();

  // Estado principal: lista de crianças e formulário temporário.
  const [children, setChildren] = React.useState<ChildForm[]>([]);
  const [temp, setTemp] = React.useState<ChildForm>({
    id: randId(),
    firstName: "",
    lastName: "",
    gender: "M",
    birthDate: "",
    avatarUri: null,
  });

  // Índice do mock de avatares (para simular uploads locais).
  const [mockIndex, setMockIndex] = React.useState(0);

  /** Informação de idade para a data atualmente selecionada. */
  const ageInfo = React.useMemo(() => ageFromISO(temp.birthDate), [temp.birthDate]);

  /**
   * Adiciona o formulário atual à lista de crianças com validações mínimas.
   * - Nome e data são obrigatórios.
   * - Data não pode ser futura.
   */
  const addChild = React.useCallback(() => {
    if (!temp.firstName || !temp.birthDate) {
      Alert.alert(
        "Validação",
        "Preenche pelo menos o primeiro nome e a data de nascimento."
      );
      return;
    }
    const info = ageFromISO(temp.birthDate);
    if (!info) {
      Alert.alert("Validação", "Data de nascimento inválida.");
      return;
    }
    if (info.totalMonths < 0) {
      Alert.alert("Validação", "A data de nascimento não pode ser no futuro.");
      return;
    }
    setChildren((prev) => [...prev, temp]);
    setTemp({
      id: randId(),
      firstName: "",
      lastName: "",
      gender: "M",
      birthDate: "",
      avatarUri: null,
    });
  }, [temp]);

  /**
   * Conclui o registo criando a conta da família.
   * - Lê o draft do passo anterior de `globalThis._signupDraft`.
   * - Envia as crianças sem campos auxiliares (`id`, `avatarUri`).
   */
  const createAccount = React.useCallback(async () => {
    try {
      // @ts-ignore — obtido no passo anterior do fluxo de registo
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
  }, [children, router]);

  /* -----------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------- */
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
        {/* ---------- Topo: voltar, ajuda e indicador de passo ---------- */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={{ marginLeft: -8 }}
            iconColor={theme.colors.onPrimary}
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
            <Text style={{ color: theme.colors.onPrimary, marginTop: 16 }}>●</Text>
            <Text style={{ color: theme.colors.onPrimary, marginTop: 16 }}>2/2</Text>
          </View>
        </View>

        {/* ---------- Título ---------- */}
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

        {/* ---------- Avatar grande (upload simulado) ---------- */}
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

        {/* ---------- Formulário: uma coluna ---------- */}
        <View style={{ gap: 12 }}>
          {/* Primeiro Nome */}
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

          {/* Sobrenome */}
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

          {/* Data de nascimento */}
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
              onChange={(d) => setTemp((p) => ({ ...p, birthDate: toISODate(d) }))}
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

          {/* Género — RadioOptionGroup (UI Mobile) */}
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
            indicator="circle"
            elevated={false}
            helperText={undefined}
            errorText={undefined}
            textColor="#fff"
            style={{ marginTop: 4 }}
          />
        </View>

        {/* ---------- Separador ---------- */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 16,
            opacity: 0.6,
          }}
        />

        {/* ---------- Lista de perfis criados ---------- */}
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
                        // Move o item para edição no formulário temporário.
                        setTemp(c);
                        setChildren((prev) => prev.filter((x) => x.id !== c.id));
                      }}
                      accessibilityLabel="Editar perfil"
                    />
                    <IconButton
                      icon="delete-outline"
                      size={18}
                      onPress={() => setChildren((p) => p.filter((x) => x.id !== c.id))}
                      accessibilityLabel="Remover perfil"
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* ---------- Separador ---------- */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
            marginVertical: 16,
            opacity: 0.4,
          }}
        />

        {/* ---------- Ações ---------- */}
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

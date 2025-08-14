import * as React from "react";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";
import {
  ThemeProvider,
  PrimaryButton,
  SecondaryButton,
  TextField,
  LinkText,
  AvatarItem,
  RadioOption,
  TextIconButton,
  DividerText,
  AvatarPicture,
  AvatarUpload,
  RadioOptionGroup,
  IconTabBar,
} from "@bibliotecario/ui-mobile";
import { Text as PaperText } from "react-native-paper";

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();

  const [clicks, setClicks] = useState(0);
  const [nome, setNome] = useState("");
  const [dark, setDark] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | undefined>();

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      console.warn("Permissão para aceder à galeria negada");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const [genderDefault, setGenderDefault] = useState<string | undefined>("M");
  const [genderDisabled, setGenderDisabled] = useState<string | undefined>("F");

  const options: RadioOption[] = [
    { label: "Masculino", value: "M" },
    { label: "Feminino", value: "F" },
  ];

  type TabKey = "home" | "search" | "add" | "reels" | "profile";
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ rowGap: 12 }}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ThemeProvider dark={dark}>
        <View style={styles.root}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: IG_BAR_HEIGHT + insets.bottom + 12 },
            ]}
          >
            <View style={{ width: "100%", maxWidth: 720 }}>
              <Text style={styles.header}>
                @bibliotecario/ui-mobile — Gallery
              </Text>

              <Section title="AvatarPicture">
                <View style={{ alignItems: "center", gap: 16 }}>
                  <AvatarPicture
                    uri="https://placekitten.com/300/300"
                    size={112}
                    showBorder
                  />
                  <AvatarPicture initials="CB" size={80} />
                  <AvatarPicture fallbackIcon="account" size={64} />
                </View>
              </Section>

              <Section title="AvatarPicture (preview escolhido)">
                <View style={{ alignItems: "center", gap: 16 }}>
                  <AvatarPicture uri={avatarUri} size={112} showBorder />
                  <AvatarPicture initials="CB" size={80} />
                  <AvatarPicture fallbackIcon="account" size={64} />
                </View>
              </Section>

              <Section title="AvatarUpload">
                <View style={{ alignItems: "center", gap: 24 }}>
                  <AvatarUpload
                    uri={avatarUri}
                    size={140}
                    showBorder
                    actionIcon="camera"
                    actionSize={12}
                    actionOffset={-6}
                    actionPosition="bottom-right"
                    onPick={pickImage}
                    helperText="Toca no botão para alterar"
                  />
                  <AvatarUpload
                    uri={avatarUri}
                    size={100}
                    actionIcon="pencil"
                    actionSize={12}
                    actionOffset={-6}
                    actionPosition="bottom-right"
                    onPick={pickImage}
                  />
                  <TextIconButton
                    label="Limpar foto"
                    icon="close-circle"
                    variant="ghost"
                    onPress={() => setAvatarUri(undefined)}
                  />
                </View>
              </Section>

              <Section title="TextIconButton">
                <TextIconButton
                  label="Adicionar outra criança"
                  icon="account-plus"
                  variant="solid"
                  backgroundColor="#8e44ad"
                  color="#fff"
                  iconPosition="right"
                  onPress={() => console.log("Adicionar criança")}
                />
                <TextIconButton
                  label="Adicionar outra criança"
                  icon="account-plus"
                  variant="ghost"
                  onPress={() => console.log("Adicionar criança")}
                />
              </Section>

              <Section title="DividerText">
                <DividerText />
                <DividerText label="Ou" />
                <DividerText label="Continuar" spacing={16} color="#00b894" />
              </Section>

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
                <View style={{ alignItems: "center" }}>
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
                <PrimaryButton
                  fullWidth
                  onPress={() => setClicks((c) => c + 1)}
                >
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
                <LinkText
                  href="https://pnl2027.gov.pt"
                  underline
                  align="center"
                  size="md"
                >
                  Abrir PNL 2027
                </LinkText>
              </Section>

              <Section title="AvatarItem">
                <AvatarItem
                  label="Camila"
                  description="7 anos"
                  actions={[
                    {
                      icon: "pencil",
                      onPress: () => console.log("editar"),
                      accessibilityLabel: "Editar",
                    },
                    {
                      icon: "delete",
                      onPress: () => console.log("apagar"),
                      accessibilityLabel: "Apagar",
                    },
                  ]}
                  accessibilityRole="button"
                  onPress={() => console.log("abrir perfil")}
                />
              </Section>
            </View>
          </ScrollView>

          {/* Barra fixa estilo Instagram */}
          <View style={[styles.igBar, { paddingBottom: insets.bottom }]}>
            <IconTabBar<TabKey>
              variant="ig"
              items={[
                { key: "home", icon: "home-variant-outline", accessibilityLabel: "Início" },
                { key: "search", icon: "magnify", accessibilityLabel: "Pesquisar" },
                { key: "add", icon: "plus-box-outline", accessibilityLabel: "Criar" },
                { key: "reels", icon: "play-box-multiple-outline", accessibilityLabel: "Reels" },
                { key: "profile", icon: "account-circle-outline", accessibilityLabel: "Perfil" },
              ]}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as TabKey)}
              backgroundColor="#fff"
              elevation={1}
            />
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaView>
  );
}

const IG_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f5f7" },
  root: { flex: 1 },
  header: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  scrollContent: { padding: 16, alignItems: "center" },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  title: { color: "#222222", marginBottom: 8 },
  debug: { marginTop: 12, color: "#333333", opacity: 0.8 },
  igBar: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e3e3e3",
  },
});

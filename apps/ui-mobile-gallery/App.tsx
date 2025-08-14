import * as React from "react";
import * as ImagePicker from "expo-image-picker";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // 👈 importa isto
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
  StepsList,
  NotificationItem,
  NotificationsPopover,
  ChipOption,
  InlineCheckOption,
  SelectedMap,
  FilterConfig,
} from "@bibliotecario/ui-mobile";
import { Text as PaperText } from "react-native-paper";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import SelectChild, {
  ChildOption,
} from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import ProgressBar from "@bibliotecario/ui-mobile/components/Feedback/ProgressBar";
import QuestionChoices, {
  QuestionChoice,
} from "@bibliotecario/ui-mobile/components/Questions/QuestionChoices";
import ChoiceChips from "@bibliotecario/ui-mobile/components/Inputs/ChoiceChips";
import InlineCheckList from "@bibliotecario/ui-mobile/components/Inputs/InlineCheckList";
import FilterBarAdvanced from "@bibliotecario/ui-mobile/components/Filters/FilterBarAdvanced";
import Paginator from "@bibliotecario/ui-mobile/components/Navigation/Paginator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MainApp />
      </SafeAreaProvider>
    </GestureHandlerRootView>
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

  const [selectedChild, setSelectedChild] = useState<string | undefined>();
  const childOptions: ChildOption[] = [
    { id: "1", name: "Camila" },
    { id: "2", name: "João" },
  ];

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ rowGap: 12 }}>{children}</View>
    </View>
  );

  // ===== Notificações =====
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Consulta confirmada",
      subtitle: "Quinta, 18:00",
      leftIcon: "calendar-check",
      read: false,
    },
    {
      id: "2",
      title: "Novo evento",
      subtitle: "Hora do Conto – Sábado",
      leftIcon: "calendar-outline",
      read: false,
    },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleItemPress(item: NotificationItem) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
  }
  function handleItemDelete(item: NotificationItem) {
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
  }
  function handleClearAll() {
    setNotifications([]);
  }

  const [progress, setProgress] = useState(0.4);

  const [ageVisibleCount, setAgeVisibleCount] = useState<number>(4);
  const [ageValue, setAgeValue] = useState<string | undefined>();

  const ageOptions: QuestionChoice[] = [
    {
      id: "0-3",
      label: "0–3",
      image: { uri: "https://picsum.photos/seed/a/300/300" },
    },
    {
      id: "4-6",
      label: "4–6",
      image: { uri: "https://picsum.photos/seed/b/300/300" },
    },
    {
      id: "7-10",
      label: "7–10",
      image: { uri: "https://picsum.photos/seed/c/300/300" },
    },
    {
      id: "11-14",
      label: "11–14",
      image: { uri: "https://picsum.photos/seed/d/300/300" },
    },
    {
      id: "15+",
      label: "15+",
      image: { uri: "https://picsum.photos/seed/e/300/300" },
    },
  ];

  const [age, setAge] = useState<string>("7-10");

  const ageChips: ChipOption[] = [
    { id: "0-3", label: "0–3" },
    { id: "4-6", label: "4–6" },
    { id: "7-10", label: "7–10" },
    // pode adicionar mais: { id: "11-14", label: "11–14" }
  ];

  const [genres, setGenres] = useState<string[]>(["aventura", "mistério"]);

  const genreOptions: InlineCheckOption[] = [
    { id: "aventura", label: "Aventura" },
    { id: "fantasia", label: "Fantasia" },
    { id: "ciencia", label: "Ciência" },
    { id: "misterio", label: "Mistério" },
  ];

  const filterDefs: FilterConfig[] = [
    {
      key: "age",
      label: "Idade",
      multiple: true,
      options: [
        { id: "3-5", label: "3–5" },
        { id: "6-8", label: "6–8" },
        { id: "9-12", label: "9–12" },
      ],
    },
    {
      key: "theme",
      label: "Tema",
      multiple: true,
      options: [
        { id: "aventura", label: "Aventura" },
        { id: "fantasia", label: "Fantasia" },
        { id: "misterio", label: "Mistério" },
      ],
    },
  ];

  const [filters, setFilters] = useState<SelectedMap>({
    age: ["6-8", "3-5"],
    theme: ["aventura", "fantasia", "misterio"],
  });

  const [page, setPage] = useState(1);

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

              <Section title="Paginação">
                <Paginator
                  page={page}
                  totalPages={10}
                  onPageChange={setPage}
                  siblingCount={1}
                  boundaryCount={1}
                  showArrows
                  variant="minimal" // círculo ativo
                  activeSize={30}
                  hitSize={34}
                  gap={6}
                />
              </Section>

              <Section title="Filtros (dropdown + tags)">
                <FilterBarAdvanced
                  filters={filterDefs}
                  value={filters}
                  onChange={setFilters}
                />
              </Section>

              <Section title="Géneros">
                <InlineCheckList
                  title="Géneros"
                  options={genreOptions}
                  value={genres}
                  onChange={setGenres}
                  checkColor="#c943b3ff" // opcional
                  checkSize={18} // opcional
                  gap={16} // opcional
                />
              </Section>

              <Section title="Faixa Etária">
                <ChoiceChips
                  title="Faixa Etária"
                  options={ageChips}
                  value={age}
                  onChange={(v) => setAge(v as string)}
                  size="md"
                  gap={8}
                />
              </Section>

              <Section title="Faixa etária">
                {/* usa o teu TextField para controlar quantos botões aparecem */}
                {/* <TextField
                  placeholder="Nº botões"
                  keyboardType="numeric"
                  value={String(ageVisibleCount)}
                  onChangeText={(txt) => {
                    const n = Math.max(
                      0,
                      Math.min(10, parseInt(txt || "0", 10) || 0)
                    );
                    setAgeVisibleCount(n);
                  }}
                  style={{ marginBottom: 12 }}
                /> */}

                <QuestionChoices
                  question="Qual a faixa etária da criança?"
                  options={ageOptions}
                  visibleCount={ageVisibleCount}
                  value={ageValue}
                  onChange={(v) => setAgeValue(v as string)}
                  columns={4} // ou omite para responsivo automático
                  itemMinHeight={96}
                />
              </Section>

              <Section title="Progresso da Leitura">
                <ProgressBar progress={progress} height={10} borderRadius={5} />
                <PrimaryButton
                  onPress={() => setProgress(Math.min(progress + 0.1, 1))}
                >
                  Avançar
                </PrimaryButton>
                <SecondaryButton
                  onPress={() => setProgress(Math.max(progress - 0.1, 0))}
                >
                  Recuar
                </SecondaryButton>
              </Section>

              <Section title="Selecionar criança">
                <SelectChild
                  label=""
                  value={selectedChild}
                  onChange={setSelectedChild}
                  options={childOptions}
                />
              </Section>

              {/* Notificações (Bell + Popover com swipe para apagar) */}
              <Section title="Notificações">
                <NotificationsPopover
                  items={notifications}
                  count={unreadCount}
                  onItemPress={handleItemPress}
                  onItemDelete={handleItemDelete}
                  onClearAll={handleClearAll}
                  swipeToDelete // 👈 ativa o gesto de arrastar
                  width={320}
                  screenMargin={8}
                  anchorGap={6}
                  placement="auto"
                  bellProps={
                    {
                      // icon: unreadCount ? "bell" : "bell-outline", // opcional
                    }
                  }
                />
              </Section>

              <Section title="FlexibleCard">
                <FlexibleCard
                  title="Consultas"
                  subtitle="As próximas marcações"
                  backgroundColor="rgba(122,68,189,0.08)"
                  images={[
                    "https://picsum.photos/seed/1/600/400",
                    "https://picsum.photos/seed/2/600/400",
                    "https://picsum.photos/seed/3/600/400",
                  ]}
                  footer={
                    <PrimaryButton
                      fullWidth
                      onPress={() => console.log("Ver consultas")}
                    >
                      Ver consultas
                    </PrimaryButton>
                  }
                  style={{ maxWidth: 420 }}
                >
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontWeight: "700" }}>Consulta 1</Text>
                    <Text>15/07 • 11:00</Text>

                    <Text style={{ fontWeight: "700", marginTop: 6 }}>
                      Consulta 2
                    </Text>
                    <Text>15/07 • 15:00</Text>

                    <Text style={{ fontWeight: "700", marginTop: 6 }}>
                      Consulta 3
                    </Text>
                    <Text>15/07 • 17:00</Text>
                  </View>
                </FlexibleCard>
              </Section>

              <Section title="Como funciona">
                <StepsList
                  steps={[
                    {
                      step: 1,
                      title: "Dados da Família",
                      description:
                        "Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.",
                      accentColor: "#7C3AED",
                      backgroundColor: "rgba(122,68,189,0.08)",
                    },
                    {
                      step: 2,
                      title: "Perfil das Crianças",
                      description:
                        "Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.",
                      accentColor: "#4137f7",
                      backgroundColor: "rgba(192,156,220,0.12)",
                    },
                    {
                      step: 3,
                      title: "Explora e Diverte-te",
                      description:
                        "Descobre histórias, calendários e atividades pensadas para a tua família.",
                    },
                  ]}
                />
              </Section>

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
                {
                  key: "home",
                  icon: "home-variant-outline",
                  accessibilityLabel: "Início",
                },
                {
                  key: "search",
                  icon: "magnify",
                  accessibilityLabel: "Pesquisar",
                },
                {
                  key: "add",
                  icon: "plus-box-outline",
                  accessibilityLabel: "Criar",
                },
                {
                  key: "reels",
                  icon: "play-box-multiple-outline",
                  accessibilityLabel: "Reels",
                },
                {
                  key: "profile",
                  icon: "account-circle-outline",
                  accessibilityLabel: "Perfil",
                },
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
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
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
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e3e3e3",
  },
});

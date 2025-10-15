/**
 * =============================================================================
 * Ficheiro: apps/mobile/src/features/consultations/ConsultationWizard.tsx
 * Componente: ConsultationWizard — wizard de marcação de consulta (3 passos)
 * -----------------------------------------------------------------------------
 * UI/UX:
 *  • Modal centrado (não full-screen), maxWidth 720, com altura limitada.
 *  • Cartões com borda/elevation, cabeçalhos com ícones.
 *  • “Família” é um seletor inline expansível (sem Menu/Portal dentro do modal).
 *  • Evita overflow/rosa e mantém consistência MD3 com o resto da app.
 * =============================================================================
 */

import * as React from "react";
import {
  View,
  ScrollView,
  Platform,
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import {
  Portal,
  Modal,
  TextInput,
  RadioButton,
  Button,
  Chip,
  ActivityIndicator,
  Text,
  useTheme,
  Divider,
  List,
  HelperText,
  IconButton,
} from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

/* ==== serviços (endpoints oficiais) ==== */
import {
  searchBooks as searchBooksSrv,
  type BookLite as BookLiteSrv,
} from "src/services/books";
import {
  listMicroContentsPublic as listMicroContentsPublicSrv,
  type MicroContentItem,
} from "src/services/microcontent";
import {
  getProximosEventos as getProximosEventosSrv,
  type EventLite as EventLiteSrv,
} from "src/services/events";
import {
  getFamilyById as getFamilyByIdSrv,
  type FamilyLite,
  type LibrarianFamilyRow,
  listFamiliesForLibrary,
} from "src/services/families";
import { API_URL } from "src/services/api";

/* ============================= Tipos & Props ============================== */

type Mode = "ONLINE" | "IN_PERSON";

export type CreateConsultationDTO = {
  familyId: number;
  librarianId: number;
  slotId?: number;
  modeEnum?: Mode;
  meetingUrl?: string;
  libraryId?: number;
  title?: string;
  purpose?: string;
  description?: string;
  bookIsbns?: string[];
  microContentIds?: number[];
  eventIds?: number[];
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  defaultFamilyId?: number;
  defaultLibrarianId: number;
  defaultSlotId?: number;
  libraries?: Array<{ id: number; name: string }>;
  onCreated?: (id: number) => void;

  /** 👇 NOVO — “modo família” */
  hideFamilySelect?: boolean; // esconde o seletor de família
  initialMode?: Mode; // define o modo inicial
  lockMode?: boolean; // se true, não deixa trocar modo
  allowOnlineWithoutMeetingLink?: boolean; // não exige meetingUrl no ONLINE
};

/* =============================== Helpers PUROS ============================= */

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** FadeIn — wrapper curto para dar vida aos cartões. */
function FadeIn({
  children,
  delay = 0,
  translateY = 10,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  translateY?: number;
  style?: any;
}) {
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 280,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [translateY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Cabeçalho de secção com ícone + título. */
function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <Icon name={icon as any} size={18} color={theme.colors.primary} />
      <Text style={{ fontWeight: "700" }}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/** Content wrapper branco com borda leve (consistente com os teus ecrãs). */
const CardContainer: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* ========================== Select inline de Família ======================= */
/**
 * InlineFamilySelect — seletor expansível com busca e paginação,
 * sem Menu/Portal; 100% inline → sem problemas de largura dentro do modal.
 */
function InlineFamilySelect({
  libraryId,
  value,
  onChange,
}: {
  libraryId?: number;
  value: FamilyLite | null;
  onChange: (f: FamilyLite | null) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const deb = useDebounced(search, 300);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<LibrarianFamilyRow[]>([]);
  const [cursor, setCursor] = React.useState<number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  const load = React.useCallback(
    async (reset = true) => {
      if (!libraryId) return;
      setLoading(true);
      try {
        const r = await listFamiliesForLibrary(libraryId, {
          search: deb,
          limit: 25,
          cursor: reset ? undefined : cursor ?? undefined,
        });
        setRows((old) => (reset ? r.items : [...old, ...r.items]));
        setCursor(r.nextCursor);
        setHasMore(!!r.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [libraryId, deb, cursor]
  );

  React.useEffect(() => {
    if (expanded) {
      setCursor(null);
      load(true);
    }
  }, [expanded, deb, load]);

  // se a biblioteca mudar, recarrega quando estiver aberto
  React.useEffect(() => {
    if (expanded) {
      setCursor(null);
      load(true);
    }
  }, [libraryId]); // eslint-disable-line

  return (
    <View style={{ gap: 6 }}>
      <SectionHeader
        icon="account-multiple"
        title="Família"
        right={
          value ? (
            <Chip
              compact
              icon="check"
              onClose={() => onChange(null)}
              style={{ height: 26 }}
            >
              {value.fullName}
            </Chip>
          ) : undefined
        }
      />
      <TextInput
        mode="outlined"
        label="Selecionar família"
        value={value ? `${value.fullName} #${value.id}` : ""}
        placeholder="Escolher família (da biblioteca)"
        editable={false}
        right={
          <TextInput.Icon
            icon={expanded ? "menu-up" : "menu-down"}
            onPress={() => setExpanded((s) => !s)}
          />
        }
        onPressIn={() => setExpanded((s) => !s)}
      />

      {expanded && (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 12,
            padding: 10,
            backgroundColor: theme.colors.elevation.level2,
          }}
        >
          {!libraryId ? (
            <HelperText type="error" visible>
              Não foi possível determinar a biblioteca.
            </HelperText>
          ) : (
            <>
              <TextInput
                mode="outlined"
                placeholder="Pesquisar por nome/email/telefone"
                value={search}
                onChangeText={setSearch}
                left={<TextInput.Icon icon="account-search" />}
              />

              {loading && rows.length === 0 ? (
                <ActivityIndicator style={{ marginTop: 12 }} />
              ) : rows.length === 0 ? (
                <Text style={{ opacity: 0.7, marginTop: 12 }}>
                  {deb.trim()
                    ? "Sem resultados."
                    : "Sem famílias nesta biblioteca."}
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 300, marginTop: 8 }}>
                  {rows.map((f) => (
                    <List.Item
                      key={f.id}
                      title={f.fullName}
                      description={[
                        f.email,
                        f.phone,
                        f.childrenCount ? `${f.childrenCount} crianças` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                      left={(props) => <List.Icon {...props} icon="account" />}
                      right={(props) => (
                        <List.Icon {...props} icon="chevron-right" />
                      )}
                      onPress={() => {
                        onChange({ id: f.id, fullName: f.fullName });
                        setExpanded(false);
                      }}
                    />
                  ))}
                  {hasMore && (
                    <Button
                      icon="chevron-down"
                      onPress={() => load(false)}
                      style={{ marginTop: 6 }}
                    >
                      Ver mais
                    </Button>
                  )}
                </ScrollView>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

/* ============================== Componente ================================ */

export default function ConsultationWizard(p: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  /* ---------- biblioteca automática (presencial) ---------- */
  const autoLibrary = React.useMemo(
    () => ({ id: p.libraries?.[0]?.id, name: p.libraries?.[0]?.name }),
    [p.libraries]
  );

  /* ---------- estado do wizard ---------- */
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<CreateConsultationDTO>({
    familyId: p.defaultFamilyId ?? 0,
    librarianId: p.defaultLibrarianId,
    slotId: p.defaultSlotId,
    modeEnum: p.initialMode ?? "ONLINE",
  });

  // ---------- família ----------
  const [selectedFamily, setSelectedFamily] = React.useState<FamilyLite | null>(
    null
  );

  const libIdToFilter = React.useMemo(
    () => (form.libraryId ? form.libraryId : p.libraries?.[0]?.id),
    [form.libraryId, p.libraries]
  );

  // pré-seleciona se vier defaultFamilyId
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (p.visible && p.defaultFamilyId && !selectedFamily) {
        const f = await getFamilyByIdSrv(p.defaultFamilyId);
        if (alive && f) {
          setSelectedFamily(f);
          setForm((old) => ({ ...old, familyId: f.id }));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.visible, p.defaultFamilyId]); // eslint-disable-line

  const resetAll = React.useCallback(() => {
    setStep(0);
    setForm({
      familyId: p.defaultFamilyId ?? 0,
      librarianId: p.defaultLibrarianId,
      slotId: p.defaultSlotId,
      modeEnum: p.initialMode ?? "ONLINE", // <— usar o initialMode se vier
    });

    setSelectedFamily(null);

    setBookQuery("");
    setMcQuery("");
    setEvQuery("");
    setBookOptions([]);
    setMcOptions([]);
    setEvOptions([]);
    setSelectedBooks([]);
    setSelectedMC([]);
    setSelectedEV([]);
  }, [p.defaultFamilyId, p.defaultLibrarianId, p.defaultSlotId]);

  React.useEffect(() => {
    if (p.visible) resetAll();
    if (p.visible)
      AccessibilityInfo.announceForAccessibility?.("Marcar consulta");
  }, [p.visible, resetAll]);

  // sincronizar biblioteca automática ao entrar em presencial
  React.useEffect(() => {
    if (!p.visible) return;
    if (
      form.modeEnum === "IN_PERSON" &&
      autoLibrary.id &&
      form.libraryId !== autoLibrary.id
    ) {
      setForm((f) => ({ ...f, libraryId: autoLibrary.id }));
    }
  }, [p.visible, form.modeEnum, autoLibrary.id, form.libraryId]);

  /* ---------- Anexos: Livros ---------- */
  const [bookQuery, setBookQuery] = React.useState("");
  const debBook = useDebounced(bookQuery, 400);
  const [bookLoading, setBookLoading] = React.useState(false);
  const [bookOptions, setBookOptions] = React.useState<BookLiteSrv[]>([]);
  const [selectedBooks, setSelectedBooks] = React.useState<BookLiteSrv[]>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!debBook.trim()) {
        setBookOptions([]);
        return;
      }
      setBookLoading(true);
      try {
        const items = await searchBooksSrv(debBook, 10);
        if (alive) setBookOptions(items);
      } finally {
        if (alive) setBookLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debBook]);

  /* ---------- Anexos: Micro-conteúdos ---------- */
  const [mcQuery, setMcQuery] = React.useState("");
  const debMc = useDebounced(mcQuery, 400);
  const [mcLoading, setMcLoading] = React.useState(false);
  const [mcOptions, setMcOptions] = React.useState<MicroContentItem[]>([]);
  const [selectedMC, setSelectedMC] = React.useState<MicroContentItem[]>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!debMc.trim()) {
        setMcOptions([]);
        return;
      }
      setMcLoading(true);
      try {
        const page = await listMicroContentsPublicSrv({ q: debMc, limit: 10 });
        if (alive) setMcOptions(page.items || []);
      } finally {
        if (alive) setMcLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debMc]);

  /* ---------- Anexos: Eventos ---------- */
  const [evQuery, setEvQuery] = React.useState("");
  const debEv = useDebounced(evQuery, 300);
  const [evLoading, setEvLoading] = React.useState(false);
  const [evOptions, setEvOptions] = React.useState<EventLiteSrv[]>([]);
  const [selectedEV, setSelectedEV] = React.useState<EventLiteSrv[]>([]);
  const eventsCacheRef = React.useRef<EventLiteSrv[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setEvLoading(true);
      try {
        if (!eventsCacheRef.current) {
          eventsCacheRef.current = await getProximosEventosSrv(120);
        }
        const all = eventsCacheRef.current || [];
        const q = debEv.trim().toLowerCase();
        const filtered = q
          ? all.filter((e) => e.title.toLowerCase().includes(q))
          : all.slice(0, 12);
        if (alive) setEvOptions(filtered.slice(0, 12));
      } finally {
        if (alive) setEvLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debEv]);

  /* ---------- Navegação ---------- */
  const next = React.useCallback(() => setStep((s) => Math.min(2, s + 1)), []);
  const back = React.useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const close = React.useCallback(() => p.onDismiss(), [p]);

  /* ---------- Validações simples ---------- */
  const effectiveFamilyId = React.useMemo(
    () => selectedFamily?.id ?? form.familyId ?? p.defaultFamilyId ?? 0,
    [selectedFamily?.id, form.familyId, p.defaultFamilyId]
  );

  // se o seletor está escondido, não exigimos selectedFamily
  const missingFamily = !p.hideFamilySelect && !effectiveFamilyId;

  const missingMeetingUrl =
    form.modeEnum === "ONLINE" &&
    !form.meetingUrl?.trim() &&
    !p.allowOnlineWithoutMeetingLink;

  const missingLibrary = form.modeEnum === "IN_PERSON" && !form.libraryId;

  /* ---------- Submit ---------- */

  const submit = React.useCallback(async () => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      setSubmitting(true);

      if (!effectiveFamilyId) throw new Error("family_required");
      if (form.modeEnum === "IN_PERSON" && !form.libraryId && autoLibrary.id) {
        form.libraryId = autoLibrary.id;
      }
      if (
        form.modeEnum === "ONLINE" &&
        !form.meetingUrl?.trim() &&
        !p.allowOnlineWithoutMeetingLink
      ) {
        throw new Error("meeting_url_required_for_online");
      }
      if (form.modeEnum === "IN_PERSON" && !form.libraryId) {
        throw new Error("library_required_for_in_person");
      }

      // monta payload
      const payload: any = {
        ...form,
        familyId: effectiveFamilyId, // <— usar sempre o effective
        bookIsbns: selectedBooks
          .map((b) => (b as any).isbn ?? b.id)
          .filter(Boolean),
        microContentIds: selectedMC.map((m) => m.id),
        eventIds: selectedEV.map((e) => Number(e.id)).filter(Number.isFinite),
      };

      // 👇 MODO FAMÍLIA: se ONLINE e sem link, não envia modeEnum/meetingUrl
      if (
        p.allowOnlineWithoutMeetingLink &&
        payload.modeEnum === "ONLINE" &&
        !payload.meetingUrl
      ) {
        delete payload.modeEnum;
        delete payload.meetingUrl;
      }

      const r = await fetch(`${API_URL}/consultations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!r.ok) {
        let msg = "Falha ao criar consulta";
        try {
          const ct = r.headers.get("content-type") || "";
          msg = ct.includes("application/json")
            ? (await r.json())?.error || msg
            : (await r.text()) || msg;
        } catch {}
        throw new Error(msg);
      }

      const out = await r.json().catch(() => ({}));
      p.onCreated?.(out?.id ?? 0);
      close();
    } catch (e: any) {
      const msg = String(
        e?.name === "AbortError"
          ? "timeout"
          : e?.message || "Falha ao criar consulta"
      );
      const labels: Record<string, string> = {
        timeout: "A rede está lenta. Tenta novamente.",
        family_required: p.hideFamilySelect
          ? "Não foi possível identificar a sua família. Tente terminar e voltar a iniciar sessão."
          : "Tens de escolher a família.",
        meeting_url_required_for_online:
          "No modo online tens de indicar o link da reunião.",
        library_required_for_in_person:
          "No modo presencial tens de indicar a biblioteca.",
        slot_not_open: "O horário selecionado já não está disponível.",
        slot_already_linked: "O horário já está associado a outra consulta.",
      };
      Alert.alert("Erro", labels[msg] ?? msg);
    } finally {
      clearTimeout(to);
      setSubmitting(false);
    }
  }, [
    form,
    selectedFamily,
    selectedBooks,
    selectedMC,
    selectedEV,
    autoLibrary.id,
    close,
    p,
  ]);

  /* ============================== Render ============================== */

  if (!p.visible) return null;

  // Dimensões do “painel” (centrado) — responsivo
  const panelWidth = Math.min(width - 32, 720);
  const panelMaxHeight = Math.min(height * 0.85, 720);

  return (
    <Portal>
      <Modal
        visible
        onDismiss={close}
        dismissable
        contentContainerStyle={{
          alignSelf: "center",
          width: panelWidth,
          maxHeight: panelMaxHeight,
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          margin: 16,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {/* Cabeçalho */}
        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryContainer,
            }}
          >
            <Icon
              name="calendar-plus"
              size={20}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
          <Text variant="titleLarge" style={{ fontWeight: "900", flex: 1 }}>
            Marcar consulta
          </Text>
          <IconButton
            icon="close"
            onPress={close}
            accessibilityLabel="Fechar"
          />
        </View>

        {/* Stepper */}
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: i === step ? 10 : 8,
                height: i === step ? 10 : 8,
                borderRadius: 999,
                backgroundColor:
                  i === step
                    ? theme.colors.primary
                    : theme.colors.outlineVariant,
              }}
            />
          ))}
        </View>

        <Divider />

        {/* Corpo scrolável (altura controlada pelo maxHeight do modal) */}
        <ScrollView
          contentContainerStyle={{ padding: 14, gap: 14 }}
          style={{ maxHeight: panelMaxHeight - 120 }}
        >
          {step === 0 && (
            <FadeIn>
              <CardContainer style={{ gap: 12 }}>
                {/* FAMÍLIA */}
                {!p.hideFamilySelect && (
                  <>
                    <InlineFamilySelect
                      libraryId={libIdToFilter}
                      value={selectedFamily}
                      onChange={(f) => {
                        setSelectedFamily(f);
                        setForm((old) => ({ ...old, familyId: f?.id ?? 0 }));
                      }}
                    />
                    <HelperText type="error" visible={!!missingFamily}>
                      É obrigatório escolher a família.
                    </HelperText>

                    <Divider style={{ marginVertical: 4 }} />
                  </>
                )}

                {/* MODO */}
                {/* MODO */}
                <SectionHeader icon="account-voice" title="Modo" />
                {p.lockMode ? (
                  <TextInput
                    mode="outlined"
                    label="Modo"
                    value={
                      form.modeEnum === "IN_PERSON" ? "Presencial" : "Online"
                    }
                    editable={false}
                    left={
                      <TextInput.Icon
                        icon={
                          form.modeEnum === "IN_PERSON" ? "map-marker" : "video"
                        }
                      />
                    }
                  />
                ) : (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Chip
                      icon="video"
                      selected={form.modeEnum === "ONLINE"}
                      onPress={() =>
                        setForm((f) => ({ ...f, modeEnum: "ONLINE" }))
                      }
                    >
                      Online
                    </Chip>
                    <Chip
                      icon="map-marker"
                      selected={form.modeEnum === "IN_PERSON"}
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          modeEnum: "IN_PERSON",
                          libraryId: autoLibrary.id ?? f.libraryId,
                        }))
                      }
                    >
                      Presencial
                    </Chip>
                  </View>
                )}

                {form.modeEnum === "ONLINE" && (
                  <TextInput
                    mode="outlined"
                    label="Link da reunião"
                    value={form.meetingUrl ?? ""}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, meetingUrl: v }))
                    }
                    left={<TextInput.Icon icon="video" />}
                    autoCapitalize="none"
                    keyboardType={Platform.OS === "ios" ? "url" : "default"}
                    error={!!missingMeetingUrl}
                  />
                )}

                {form.modeEnum === "IN_PERSON" && (
                  <View style={{ gap: 6 }}>
                    {(p.libraries?.length ?? 0) > 1 ? (
                      <>
                        <SectionHeader icon="library" title="Biblioteca" />
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {p.libraries!.map((lib) => (
                            <Chip
                              key={lib.id}
                              selected={form.libraryId === lib.id}
                              onPress={() =>
                                setForm((f) => ({ ...f, libraryId: lib.id }))
                              }
                              icon={
                                form.libraryId === lib.id ? "check" : "library"
                              }
                              compact
                              elevated
                            >
                              {lib.name}
                            </Chip>
                          ))}
                        </View>
                        <HelperText type="error" visible={!form.libraryId}>
                          Seleciona a biblioteca.
                        </HelperText>
                      </>
                    ) : (
                      <View style={{ gap: 6 }}>
                        <TextInput
                          mode="outlined"
                          label="Biblioteca"
                          value={autoLibrary.name ?? "—"}
                          editable={false}
                          left={<TextInput.Icon icon="library" />}
                        />
                        {!autoLibrary.id ? (
                          <HelperText type="error" visible>
                            Não foi possível identificar a biblioteca do
                            bibliotecário.
                          </HelperText>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}
              </CardContainer>
            </FadeIn>
          )}

          {step === 1 && (
            <FadeIn>
              <CardContainer style={{ gap: 12 }}>
                <SectionHeader icon="note-edit" title="Motivo da consulta" />
                <TextInput
                  mode="outlined"
                  label="Título"
                  value={form.title ?? ""}
                  onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                  left={<TextInput.Icon icon="format-title" />}
                />
                <TextInput
                  mode="outlined"
                  label="Pretexto/Motivo"
                  value={form.purpose ?? ""}
                  onChangeText={(v) => setForm((f) => ({ ...f, purpose: v }))}
                  left={<TextInput.Icon icon="comment-text" />}
                />
                <TextInput
                  mode="outlined"
                  label="Descrição (para o bibliotecário)"
                  value={form.description ?? ""}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, description: v }))
                  }
                  left={<TextInput.Icon icon="text-box" />}
                  multiline
                  numberOfLines={4}
                />
              </CardContainer>
            </FadeIn>
          )}

          {step === 2 && (
            <FadeIn>
              <View style={{ gap: 14 }}>
                {/* Livros */}
                <CardContainer>
                  <SectionHeader
                    icon="book-open-variant"
                    title="Livros (ISBN opcional)"
                  />
                  <TextInput
                    mode="outlined"
                    placeholder="Procurar livro por título/autor/ISBN"
                    value={bookQuery}
                    onChangeText={setBookQuery}
                    left={<TextInput.Icon icon="book-search" />}
                  />
                  {bookLoading ? (
                    <ActivityIndicator style={{ marginTop: 8 }} />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      {bookOptions.map((b) => (
                        <Chip
                          key={b.id || b.title}
                          onPress={() =>
                            setSelectedBooks((old) =>
                              old.some((x) => x.id === b.id) ? old : [...old, b]
                            )
                          }
                          icon="plus"
                          compact
                          elevated
                        >
                          {b.title}
                          {b.id ? ` — ${b.id}` : ""}
                        </Chip>
                      ))}
                    </View>
                  )}
                  {!!selectedBooks.length && (
                    <>
                      <Divider style={{ marginVertical: 8 }} />
                      <SectionHeader icon="check" title="Selecionados" />
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {selectedBooks.map((b) => (
                          <Chip
                            key={`sel-${b.id}`}
                            onClose={() =>
                              setSelectedBooks((old) =>
                                old.filter((x) => x.id !== b.id)
                              )
                            }
                            icon="check"
                            selected
                            compact
                          >
                            {b.title} {b.id ? `— ${b.id}` : ""}
                          </Chip>
                        ))}
                      </View>
                    </>
                  )}
                </CardContainer>

                {/* Micro-conteúdos */}
                <CardContainer>
                  <SectionHeader icon="flash" title="Micro-conteúdos" />
                  <TextInput
                    mode="outlined"
                    placeholder="Procurar micro-conteúdo por texto/tags"
                    value={mcQuery}
                    onChangeText={setMcQuery}
                    left={<TextInput.Icon icon="magnify" />}
                  />
                  {mcLoading ? (
                    <ActivityIndicator style={{ marginTop: 8 }} />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      {mcOptions.map((m) => (
                        <Chip
                          key={m.id}
                          onPress={() =>
                            setSelectedMC((old) =>
                              old.some((x) => x.id === m.id) ? old : [...old, m]
                            )
                          }
                          icon="plus"
                          compact
                          elevated
                        >
                          {m.text.length > 50
                            ? `${m.text.slice(0, 50)}…`
                            : m.text}
                        </Chip>
                      ))}
                    </View>
                  )}
                  {!!selectedMC.length && (
                    <>
                      <Divider style={{ marginVertical: 8 }} />
                      <SectionHeader icon="check" title="Selecionados" />
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {selectedMC.map((m) => (
                          <Chip
                            key={`sel-mc-${m.id}`}
                            onClose={() =>
                              setSelectedMC((old) =>
                                old.filter((x) => x.id !== m.id)
                              )
                            }
                            icon="check"
                            selected
                            compact
                          >
                            {m.text.length > 40
                              ? `${m.text.slice(0, 40)}…`
                              : m.text}{" "}
                            #{m.id}
                          </Chip>
                        ))}
                      </View>
                    </>
                  )}
                </CardContainer>

                {/* Eventos */}
                <CardContainer>
                  <SectionHeader icon="calendar" title="Eventos" />
                  <TextInput
                    mode="outlined"
                    placeholder="Procurar evento por título"
                    value={evQuery}
                    onChangeText={setEvQuery}
                    left={<TextInput.Icon icon="calendar-search" />}
                  />
                  {evLoading ? (
                    <ActivityIndicator style={{ marginTop: 8 }} />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      {evOptions.map((e) => (
                        <Chip
                          key={String(e.id)}
                          onPress={() =>
                            setSelectedEV((old) =>
                              old.some((x) => String(x.id) === String(e.id))
                                ? old
                                : [...old, e]
                            )
                          }
                          icon="plus"
                          compact
                          elevated
                        >
                          {e.title}
                          {e.date ? ` — ${e.date}` : ""}
                        </Chip>
                      ))}
                    </View>
                  )}
                  {!!selectedEV.length && (
                    <>
                      <Divider style={{ marginVertical: 8 }} />
                      <SectionHeader icon="check" title="Selecionados" />
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {selectedEV.map((e) => (
                          <Chip
                            key={`sel-ev-${String(e.id)}`}
                            onClose={() =>
                              setSelectedEV((old) =>
                                old.filter((x) => String(x.id) !== String(e.id))
                              )
                            }
                            icon="check"
                            selected
                            compact
                          >
                            {e.title} #{String(e.id)}
                          </Chip>
                        ))}
                      </View>
                    </>
                  )}
                </CardContainer>
              </View>
            </FadeIn>
          )}
        </ScrollView>

        {/* Ações no fundo do painel (não sticky ao ecrã) */}
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
            flexDirection: "row",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          {step > 0 ? (
            <Button
              onPress={back}
              disabled={submitting}
              icon="chevron-left"
              mode="text"
            >
              Anterior
            </Button>
          ) : (
            <Button onPress={close} disabled={submitting} icon="close">
              Cancelar
            </Button>
          )}
          {step < 2 ? (
            <Button
              onPress={next}
              disabled={
                submitting ||
                (step === 0 &&
                  (missingFamily ||
                    (form.modeEnum === "ONLINE" && missingMeetingUrl) ||
                    (form.modeEnum === "IN_PERSON" && missingLibrary)))
              }
              icon="chevron-right"
              mode="contained-tonal"
            >
              Seguinte
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={submit}
              loading={submitting}
              disabled={
                submitting || (form.modeEnum === "IN_PERSON" && missingLibrary)
              }
              icon="check-circle"
            >
              Confirmar
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

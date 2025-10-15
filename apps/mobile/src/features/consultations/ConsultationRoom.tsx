import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Image,
  Modal,
} from "react-native";
import {
  useTheme,
  Text,
  Button,
  TextInput,
  Chip,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import {
  consultationsApi,
  type DetailsShape,
  type ConsultationStatus,
  Slot,
} from "src/services/consultations";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

// ---------- estilos/labels por estado (iguais aos da tua lista) ----------
const STATUS_STYLE = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
  },
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    accent: "#F59E0B",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    accent: "#9CA3AF",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    accent: "#3B82F6",
  },
} as const;
type StatusKey = keyof typeof STATUS_STYLE;

const fmtLong = (iso?: string | Date) =>
  iso
    ? new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(iso))
    : "";

const fmtShort = (iso?: string | Date) =>
  iso
    ? new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    : "";

/** Cartão reutilizável com header fino (título + ícone opcional) */
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon ? (
          <Icon
            name={icon as any}
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
        ) : null}
        <Text
          style={{
            color: theme.colors.onSurface,
            fontWeight: "800",
            fontSize: 14,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ padding: 14, gap: 10 }}>{children}</View>
    </View>
  );
}

type TabKey = "livros" | "micro" | "eventos" | "ficheiros";

export type ConsultationRoomProps = {
  id: number;
  role: "family" | "librarian";
  onClose?: () => void;
};

export default function ConsultationRoom({
  id,
  role,
  onClose,
}: ConsultationRoomProps) {
  const insets = useSafeAreaInsets();

  const cid = Number(id);
  const theme = useTheme();
  const router = useRouter();

  // ---------------- state ----------------
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabKey>("livros");
  const [details, setDetails] = React.useState<DetailsShape | null>(null);
  const [notes, setNotes] = React.useState("");

  const [pendingProposal, setPendingProposal] = React.useState<any | null>(
    null
  );
  const [slotModal, setSlotModal] = React.useState(false);
  const [proposeModal, setProposeModal] = React.useState(false);
  const [acting, setActing] = React.useState(false); // para botões

  // ---------------- load ----------------
  const load = React.useCallback(async () => {
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const out = await consultationsApi.details(cid);
      setDetails(out);
      setNotes(String(out?.consultation?.notes ?? ""));
    } catch (e: any) {
      setError("Falha a carregar a consulta.");
    } finally {
      setLoading(false);
    }
  }, [cid]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Depois de carregar detalhes, ir buscar proposta PENDING deste ator
  React.useEffect(() => {
    (async () => {
      const c = details?.consultation;
      if (!c) return setPendingProposal(null);
      try {
        let list: any = null;
        if (role === "family" && c.family?.id) {
          list = await consultationsApi.proposalsByFamily(c.family.id);
        } else if (role === "librarian" && c.librarian?.id) {
          list = await consultationsApi.proposalsByLibrarian(c.librarian.id);
        }
        const pending = (list?.items || []).find(
          (p: any) => p.consultation?.id === cid
        );
        setPendingProposal(pending || null);
      } catch {
        setPendingProposal(null);
      }
    })();
  }, [details, role, cid]);

  // ---------------- derived ----------------
  const c = details?.consultation ?? {};
  const statusKey: StatusKey =
    (c?.status as ConsultationStatus) && STATUS_STYLE[c.status as StatusKey]
      ? (c.status as StatusKey)
      : "PENDING";
  const meta = STATUS_STYLE[statusKey];

  const title =
    c?.title ??
    (c?.child?.name ? `Consulta de ${c.child.name}` : `Consulta #${cid}`);

  const libraryName = c?.library?.name as string | undefined;
  const livros = details?.attachments?.books ?? [];
  const micro = details?.attachments?.microContents ?? [];
  const eventos = details?.attachments?.events ?? [];
  const timeline = details?.events ?? [];

  // ---------------- actions ----------------
  async function saveNotes() {
    if (!cid) return;
    setSaving(true);
    try {
      await consultationsApi.updateNotes(cid, { notes });
      Alert.alert("Notas guardadas");
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível guardar as notas.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmNow() {
    setActing(true);
    try {
      await consultationsApi.confirm(cid);
      await load();
    } catch {
      Alert.alert("Erro", "Falha ao confirmar.");
    } finally {
      setActing(false);
    }
  }
  async function declineNow() {
    setActing(true);
    try {
      await consultationsApi.decline(cid);
      await load();
    } catch {
      Alert.alert("Erro", "Falha ao recusar.");
    } finally {
      setActing(false);
    }
  }
  async function cancelNow() {
    setActing(true);
    try {
      await consultationsApi.cancel(cid);
      await load();
    } catch {
      Alert.alert("Erro", "Falha ao cancelar.");
    } finally {
      setActing(false);
    }
  }
  async function rescheduleTo(slotId: number) {
    setActing(true);
    try {
      await consultationsApi.reschedule(cid, { slotId });
      await load();
    } catch (e: any) {
      const msg = String(e?.message || "");
      Alert.alert(
        "Erro",
        msg.includes("only_pending")
          ? "Só podes escolher outro horário enquanto está Pendente."
          : "Falha ao reagendar."
      );
    } finally {
      setActing(false);
      setSlotModal(false);
    }
  }
  async function propose(toStartAt: string, toEndAt: string, message?: string) {
    setActing(true);
    try {
      await consultationsApi.proposeReschedule(cid, {
        toStartAt,
        toEndAt,
        message,
      });
      await load();
    } catch {
      Alert.alert("Erro", "Falha ao propor reagendamento.");
    } finally {
      setActing(false);
      setProposeModal(false);
    }
  }
  async function acceptProposal() {
    if (!pendingProposal?.id) return;
    setActing(true);
    try {
      await consultationsApi.acceptProposal(pendingProposal.id);
      await load();
    } catch {
      Alert.alert("Erro", "Falha ao aceitar proposta.");
    } finally {
      setActing(false);
    }
  }
  async function declineProposal() {
    if (!pendingProposal?.id) return;
    setActing(true);
    try {
      await consultationsApi.declineProposal(pendingProposal.id);
      await load();
      if (role === "family") {
        // opcional: pergunta antes
        Alert.alert(
          "Proposta recusada",
          "Queres sugerir um novo horário agora?",
          [
            { text: "Agora", onPress: () => setSlotModal(true) },
            { text: "Depois", style: "cancel" },
          ]
        );
        // ou direto: setTimeout(() => setSlotModal(true), 150);
      }
    } catch {
      Alert.alert("Erro", "Falha ao recusar proposta.");
    } finally {
      setActing(false);
    }
  }

  async function copyNotes() {
    try {
      await Clipboard.setStringAsync(notes || "");
      Alert.alert("Copiado", "Notas copiadas para a área de transferência.");
    } catch {
      /* ignore */
    }
  }

  async function onSlotPicked(slot: Slot) {
    setActing(true);
    try {
      if (statusKey === "PENDING") {
        // reagendamento direto enquanto está pendente
        await consultationsApi.reschedule(cid, { slotId: slot.id });
      } else {
        // CONFIRMED (ou outros): criar PROPOSTA com o intervalo do slot
        await consultationsApi.proposeReschedule(cid, {
          toStartAt: slot.startAt,
          toEndAt: slot.endAt,
        });
      }
      await load();
    } catch (e: any) {
      const msg = String(e?.message || "");
      Alert.alert(
        "Erro",
        msg.includes("only_pending")
          ? "Só podes escolher outro horário enquanto está Pendente."
          : "Falha ao reagendar/propor."
      );
    } finally {
      setActing(false);
      setSlotModal(false);
    }
  }

  function exportPdf() {
    // abre no browser; se precisares de gravar localmente, depois trocamos para FileSystem + Share
    Linking.openURL(`${API_URL}/consultations/${cid}/summary.pdf`).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir o PDF.")
    );
  }

  // ---------------- render ----------------
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* backdrop para fechar */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
      />

      {/* content */}
      <View
        style={{
          borderRadius: 18,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          overflow: "hidden",
          maxHeight: "88%",
        }}
      >
        {/* HEADER */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                numberOfLines={2}
              >
                {fmtLong(c?.startAt)}
                {libraryName ? ` • ${libraryName}` : ""}
              </Text>
            </View>

            {/* Estado */}
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: meta.bg,
                borderWidth: 1,
                borderColor: meta.accent,
              }}
            >
              <Text style={{ color: meta.fg, fontWeight: "800" }}>
                {meta.label}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.back()}
              style={{
                marginLeft: 4,
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.secondaryContainer,
              }}
            >
              <Icon
                name="close"
                size={18}
                color={theme.colors.onSecondaryContainer}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <ActivityIndicator />
            <Text
              style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
            >
              A carregar…
            </Text>
          </View>
        ) : error ? (
          <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ color: theme.colors.error }}>{error}</Text>
            <Button mode="outlined" icon="refresh" onPress={load}>
              Tentar novamente
            </Button>
          </View>
        ) : (
          <>
            {/* BODY SCROLL */}
            <ScrollView
              style={{ maxHeight: "100%" }}
              contentContainerStyle={{ padding: 14, gap: 12 }}
            >
              {/* Resumo / Família */}
              {(c?.purpose || c?.description) && (
                <Card title="Resumo" icon="text-box-outline">
                  <Text style={{ color: theme.colors.onSurface }}>
                    {c?.purpose || c?.description}
                  </Text>
                </Card>
              )}

              {(c?.family || c?.child || c?.library) && (
                <Card title="Família" icon="account-multiple-outline">
                  <View style={{ gap: 6 }}>
                    {c?.family?.fullName && (
                      <Text
                        style={{
                          fontWeight: "700",
                          color: theme.colors.onSurface,
                        }}
                      >
                        {c.family.fullName}
                      </Text>
                    )}
                    {c?.family?.email && (
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>
                        {c.family.email}
                      </Text>
                    )}
                    {c?.child?.name && (
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>
                        Criança: {c.child.name}
                      </Text>
                    )}
                    {c?.library?.name && (
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>
                        Biblioteca: {c.library.name}
                      </Text>
                    )}
                  </View>
                </Card>
              )}

              {/* Tabs (Livros/Micro/Eventos/Ficheiros) */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  {
                    k: "livros",
                    label: `Livros${
                      livros.length ? ` (${livros.length})` : ""
                    }`,
                  },
                  {
                    k: "micro",
                    label: `Micro${micro.length ? ` (${micro.length})` : ""}`,
                  },
                  {
                    k: "eventos",
                    label: `Eventos${
                      eventos.length ? ` (${eventos.length})` : ""
                    }`,
                  },
                  { k: "ficheiros", label: "Ficheiros" },
                ].map((t) => (
                  <Chip
                    key={t.k}
                    selected={tab === (t.k as TabKey)}
                    onPress={() => setTab(t.k as TabKey)}
                    icon={
                      t.k === "livros"
                        ? "book-outline"
                        : t.k === "micro"
                        ? "microphone-outline"
                        : t.k === "eventos"
                        ? "calendar-star"
                        : "paperclip"
                    }
                  >
                    {t.label}
                  </Chip>
                ))}
              </View>

              {/* Conteúdo da Tab */}
              {tab === "livros" && (
                <Card title="Livros vinculados" icon="book-outline">
                  {livros.length === 0 ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      (Sem livros anexados)
                    </Text>
                  ) : (
                    livros.map((b: any) => (
                      <View
                        key={b.isbn || b.title}
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 60,
                            borderRadius: 6,
                            backgroundColor: theme.colors.secondaryContainer,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {b.coverUrl ? (
                            <Image
                              source={{ uri: b.coverUrl }}
                              style={{ width: 44, height: 60 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Icon
                              name="book-open-variant"
                              size={20}
                              color={theme.colors.onSecondaryContainer}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "700",
                            }}
                            numberOfLines={2}
                          >
                            {b.title}
                          </Text>
                          {b.isbn && (
                            <Text
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              ISBN {b.isbn}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </Card>
              )}

              {tab === "micro" && (
                <Card title="Micro-conteúdos" icon="microphone-outline">
                  {micro.length === 0 ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      (Sem micro-conteúdos)
                    </Text>
                  ) : (
                    micro.map((m: any) => (
                      <View key={m.id} style={{ gap: 4 }}>
                        <Text
                          style={{
                            fontWeight: "700",
                            color: theme.colors.onSurface,
                          }}
                        >
                          {m.type}
                        </Text>
                        <Text style={{ color: theme.colors.onSurface }}>
                          {m.text}
                        </Text>
                        {!!m.tags?.length && (
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Tags: {m.tags.join(", ")}
                          </Text>
                        )}
                        <Divider style={{ marginVertical: 8, opacity: 0.5 }} />
                      </View>
                    ))
                  )}
                </Card>
              )}

              {tab === "eventos" && (
                <Card title="Eventos culturais" icon="calendar-star">
                  {eventos.length === 0 ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      (Sem eventos associados)
                    </Text>
                  ) : (
                    eventos.map((e: any) => (
                      <View
                        key={e.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon
                          name="calendar-blank"
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurface }}>
                          {e.title}
                          {e.startDate ? ` — ${fmtShort(e.startDate)}` : ""}
                        </Text>
                      </View>
                    ))
                  )}
                </Card>
              )}

              {tab === "ficheiros" && (
                <Card title="Ficheiros" icon="paperclip">
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    (Sem ficheiros — secção preparada para futuro)
                  </Text>
                </Card>
              )}

              {/* Notas */}
              <Card title="Notas da reunião" icon="note-edit-outline">
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Escreve aqui as tuas notas…"
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    mode="contained"
                    icon="content-save"
                    onPress={saveNotes}
                    loading={saving}
                  >
                    Guardar
                  </Button>
                  <Button
                    mode="outlined"
                    icon="content-copy"
                    onPress={copyNotes}
                  >
                    Copiar
                  </Button>
                  <Button
                    mode="text"
                    icon="eraser"
                    onPress={() => setNotes("")}
                  >
                    Limpar
                  </Button>
                </View>
              </Card>

              {/* Timeline */}
              {timeline?.length ? (
                <Card title="Timeline" icon="timeline-clock-outline">
                  <View style={{ gap: 6 }}>
                    {timeline.map((t: any) => (
                      <View
                        key={t.id ?? `${t.type}-${t.at}`}
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <Icon
                          name="checkbox-blank-circle"
                          size={10}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          <Text style={{ fontWeight: "700" }}>
                            {fmtShort(t.at)}
                          </Text>{" "}
                          — {t.type}
                          {t.actor?.fullName ? ` por ${t.actor.fullName}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              ) : null}

              {/* espaçador para a barra fixa */}
              <View style={{ height: 72 }} />
            </ScrollView>

            {/* Proposta pendente */}
            {pendingProposal ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  backgroundColor: role === "family" ? "#F0F9FF" : "#F0FDF4",
                  gap: 8,
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  Proposta de reagendamento pendente
                </Text>
                <Text style={{ opacity: 0.8 }}>
                  {fmtShort(pendingProposal.toStartAt)} —{" "}
                  {fmtShort(pendingProposal.toEndAt)}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    mode="contained"
                    icon="check"
                    onPress={acceptProposal}
                    loading={acting}
                  >
                    Aceitar
                  </Button>
                  <Button
                    mode="outlined"
                    icon="close"
                    onPress={declineProposal}
                    disabled={acting}
                  >
                    Recusar
                  </Button>
                </View>
              </View>
            ) : null}

            {/* FOOTER FIXO (ações globais) */}
            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 10 + insets.bottom, // 👈 safe-area
                borderTopWidth: 1,
                borderTopColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <Button mode="outlined" icon="file-export" onPress={exportPdf}>
                  PDF
                </Button>

                {/* Ações por ESTADO */}
                {statusKey === "PENDING" && role === "librarian" && (
                  <>
                    <Button
                      mode="outlined"
                      icon="calendar-edit"
                      onPress={() => setSlotModal(true)}
                    >
                      Reagendar
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      onPress={declineNow}
                      disabled={acting}
                    >
                      Recusar
                    </Button>
                    <Button
                      mode="contained"
                      icon="check"
                      onPress={confirmNow}
                      loading={acting}
                    >
                      Confirmar
                    </Button>
                  </>
                )}

                {statusKey === "PENDING" && role === "family" && (
                  <>
                    <Button
                      mode="outlined"
                      icon="calendar-edit"
                      onPress={() => setSlotModal(true)}
                    >
                      Reagendar
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      onPress={cancelNow}
                      disabled={acting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      mode="contained"
                      icon="check"
                      onPress={confirmNow}
                      loading={acting}
                    >
                      Confirmar
                    </Button>
                  </>
                )}

                {statusKey === "CONFIRMED" && (
                  <>
                    <Button
                      mode="outlined"
                      icon="calendar-edit"
                      onPress={() => setSlotModal(true)}
                    >
                      Pedir reagendamento
                    </Button>
                    <Button
                      mode="outlined"
                      icon="close"
                      onPress={cancelNow}
                      disabled={acting}
                    >
                      Cancelar
                    </Button>
                  </>
                )}

                <Button
                  mode="contained"
                  icon="close"
                  onPress={() => router.back()}
                >
                  Fechar
                </Button>
              </View>
            </View>

            <SlotsModal
              visible={slotModal}
              librarianId={c?.librarian?.id ?? c?.librarianId}
              onPick={onSlotPicked}
              onClose={() => setSlotModal(false)}
            />
            <ProposeModal
              visible={proposeModal}
              onSubmit={propose}
              onClose={() => setProposeModal(false)}
            />
          </>
        )}
      </View>
    </View>
  );
}

function ProposeModal({
  visible,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  onSubmit: (startIso: string, endIso: string, message?: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [start, setStart] = React.useState<Date>(
    new Date(Date.now() + 3 * 86400000)
  );
  const [end, setEnd] = React.useState<Date>(
    new Date(Date.now() + 3 * 86400000 + 30 * 60000)
  );
  const [msg, setMsg] = React.useState("");
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            padding: 14,
          }}
        >
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>
            Propor outro horário
          </Text>
          <Text style={{ marginBottom: 6 }}>Início</Text>
          <DateTimePicker
            value={start}
            mode="datetime"
            onChange={(_, d) => d && setStart(d)}
          />
          <Text style={{ marginVertical: 6 }}>Fim</Text>
          <DateTimePicker
            value={end}
            mode="datetime"
            onChange={(_, d) => d && setEnd(d)}
          />
          <TextInput
            mode="outlined"
            placeholder="Mensagem (opcional)"
            value={msg}
            onChangeText={setMsg}
            style={{ marginTop: 8 }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 10,
            }}
          >
            <Button onPress={onClose}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={() =>
                onSubmit(start.toISOString(), end.toISOString(), msg)
              }
            >
              Enviar
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SlotsModal({
  visible,
  librarianId,
  onPick,
  onClose,
}: {
  visible: boolean;
  librarianId?: number;
  onPick: (slot: Slot) => void; // ⇦ devolve o Slot completo
  onClose: () => void;
}) {
  const theme = useTheme();

  // estado de carregamento e paginação incremental (+14 dias)
  const [loading, setLoading] = React.useState(false);
  const [moreLoading, setMoreLoading] = React.useState(false);
  const [noMore, setNoMore] = React.useState(false);

  // janela atual carregada
  const [windowStart, setWindowStart] = React.useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = React.useState<Date | null>(null);

  // dados + seleção
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  // helpers puros
  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
      new Date(iso)
    );
  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(
      new Date(iso)
    );

  // carregar primeiros 14 dias ao abrir
  React.useEffect(() => {
    if (!visible || !librarianId) return;
    (async () => {
      setLoading(true);
      setSelectedId(null);
      setNoMore(false);
      try {
        const from = new Date();
        const to = addDays(from, 14);
        const data = await consultationsApi.searchSlots({
          from: from.toISOString(),
          to: to.toISOString(),
          librarianId, // 👈 apenas do bibliotecário escolhido
          onlyBookable: true,
        });
        setSlots(Array.isArray(data) ? data : []);
        setWindowStart(from);
        setWindowEnd(to);
        setNoMore((data?.length ?? 0) === 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, librarianId]);

  // carregar +14 dias (mantendo ordem e sem duplicar)
  async function loadMore() {
    if (!windowEnd || moreLoading || loading || noMore) return;
    setMoreLoading(true);
    try {
      const from = new Date(windowEnd);
      const to = addDays(from, 14);
      const data = await consultationsApi.searchSlots({
        from: from.toISOString(),
        to: to.toISOString(),
        librarianId,
        onlyBookable: true,
      });
      setSlots((prev) => {
        const map = new Map<number, Slot>();
        for (const s of prev) map.set(s.id, s);
        for (const s of Array.isArray(data) ? data : []) map.set(s.id, s);
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
      });
      setWindowEnd(to);
      setNoMore((data?.length ?? 0) === 0);
    } finally {
      setMoreLoading(false);
    }
  }

  // agrupar por dia (ordenado)
  const grouped = React.useMemo(() => {
    const byDay = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.startAt).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s);
    }
    return Array.from(byDay.entries())
      .map(([key, arr]) => ({
        key,
        label: fmtDay(arr[0].startAt),
        items: arr.sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      }))
      .sort(
        (a, b) =>
          new Date(a.items[0].startAt).getTime() -
          new Date(b.items[0].startAt).getTime()
      );
  }, [slots]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop com fecho ao toque fora */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Cartão do modal (toque dentro não fecha) */}
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            maxHeight: "80%",
          }}
          accessibilityViewIsModal
          accessibilityLabel="Escolher horário"
        >
          {/* Cabeçalho */}
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                color: theme.colors.onSurface,
              }}
            >
              Escolher horário
            </Text>
          </View>

          {/* Lista de dias/slots */}
          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
            {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

            {!loading && grouped.length === 0 && (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Sem slots abertos nos próximos 14 dias.
              </Text>
            )}

            {grouped.map((g) => (
              <View
                key={g.key}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{g.label}</Text>

                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {g.items.map((s) => {
                    const isSel = selectedId === s.id;
                    const label = `${fmtTime(s.startAt)} — ${fmtTime(s.endAt)}`;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() =>
                          setSelectedId((prev) => (prev === s.id ? null : s.id))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Escolher ${label}`}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: isSel
                            ? theme.colors.primary
                            : theme.colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            color: isSel
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                            fontWeight: "700",
                          }}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Paginação incremental (+14 dias) */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SecondaryButton
                label={noMore ? "Sem mais resultados" : "Ver +14 dias"}
                onPress={loadMore}
                disabled={moreLoading || loading || noMore}
              />
              {(moreLoading || loading) && <ActivityIndicator />}
            </View>
          </ScrollView>

          {/* Footer: ações do modal */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
            }}
          >
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton
              label="Confirmar"
              onPress={() => {
                const chosen = slots.find((s) => s.id === selectedId);
                if (chosen) onPick(chosen);
              }}
              disabled={!selectedId || loading || moreLoading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ⚠️ Usa o mesmo API_URL do teu módulo api
import { API_URL } from "src/services/api";
import { PrimaryButton, SecondaryButton } from "@bibliotecario/ui-mobile";
import { useSafeAreaInsets } from "react-native-safe-area-context";

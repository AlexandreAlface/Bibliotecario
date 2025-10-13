import * as React from "react";
import {
  View,
  ScrollView,
  Linking,
  Alert,
  Share,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Button,
  Divider,
  List,
  Snackbar,
  Text,
  TextInput,
  useTheme,
  IconButton,
} from "react-native-paper";
import * as FileSystem from "expo-file-system";

import { consultationsApi } from "src/services/consultations";
import { useAuth } from "src/contexts/AuthContext";

/** ==================== estado/meta ==================== */
type Status = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
const STATUS_META: Record<
  Status,
  { label: string; bg: string; fg: string; icon: string }
> = {
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    icon: "clock-outline",
  },
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    icon: "check-circle-outline",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    icon: "close-circle-outline",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    icon: "cancel",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    icon: "check-decagram-outline",
  },
};

function StatusPill({ status }: { status?: string }) {
  const s = STATUS_META[(status as Status) ?? "PENDING"] ?? STATUS_META.PENDING;
  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: s.bg,
      }}
    >
      <List.Icon color={s.fg} icon={s.icon as any} />
      <Text style={{ color: s.fg, fontWeight: "700" }}>{s.label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={{
          fontWeight: "800",
          fontSize: 16,
          color: theme.colors.onSurface,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/** ==================== helpers data/files ==================== */
function fmtDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString();
}
function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}
function fmtTimeRange(start?: string, end?: string) {
  if (!start || !end) return "-";
  const s = new Date(start),
    e = new Date(end);
  return `${s.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}–${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function modeLabel(m?: string) {
  switch (m) {
    case "PRESENTIAL":
      return "Presencial";
    case "REMOTE":
      return "Remota";
    case "HYBRID":
      return "Híbrida";
    default:
      return m ?? "-";
  }
}
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader: any = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(blob);
  });
}
async function shareFileSafe(fileUri: string) {
  try {
    const Sharing = await import("expo-sharing");
    const ok = await (Sharing as any).isAvailableAsync?.();
    if (ok) {
      await (Sharing as any).shareAsync(fileUri);
      return;
    }
  } catch {}
  Alert.alert("PDF guardado", `O PDF foi guardado em:\n${fileUri}`);
}

/** ==================== modal interno: anexos ==================== */
function AddAttachmentsModal({
  visible,
  onClose,
  onSubmit,
  busy = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    books?: string[];
    microContents?: number[];
    events?: number[];
  }) => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  const [isbns, setIsbns] = React.useState<string>("");
  const [micro, setMicro] = React.useState<string>("");
  const [events, setEvents] = React.useState<string>("");

  React.useEffect(() => {
    if (visible) {
      setIsbns("");
      setMicro("");
      setEvents("");
    }
  }, [visible]);

  const parseCsv = (s: string) =>
    (s || "")
      .split(/[\s,;\n]+/g)
      .map((x) => x.trim())
      .filter(Boolean);

  function handleConfirm() {
    const payload: any = {};
    const b = parseCsv(isbns);
    if (b.length) payload.books = b;
    const m = parseCsv(micro)
      .map((x) => Number(x))
      .filter((n) => !isNaN(n));
    if (m.length) payload.microContents = m;
    const e = parseCsv(events)
      .map((x) => Number(x))
      .filter((n) => !isNaN(n));
    if (e.length) payload.events = e;
    onSubmit(payload);
  }

  if (!visible) return null;
  return (
    <Pressable
      onPress={onClose}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
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
          overflow: "hidden",
          maxHeight: "85%",
        }}
        accessibilityViewIsModal
        accessibilityLabel="Adicionar anexos"
      >
        <View
          style={{
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16 }}>
            Adicionar anexos
          </Text>
          <IconButton icon="close" onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          <TextInput
            mode="outlined"
            label="ISBNs (CSV)"
            placeholder="978972…, 978989…"
            value={isbns}
            onChangeText={setIsbns}
          />
          <TextInput
            mode="outlined"
            label="Micro-conteúdos IDs (CSV)"
            placeholder="12, 34, 56"
            value={micro}
            onChangeText={setMicro}
          />
          <TextInput
            mode="outlined"
            label="Eventos culturais IDs (CSV)"
            placeholder="101, 102"
            value={events}
            onChangeText={setEvents}
          />
        </ScrollView>

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
          <Button mode="text" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={busy}
            disabled={busy}
          >
            Adicionar
          </Button>
        </View>
      </Pressable>
    </Pressable>
  );
}

/** ==================== SCREEN ==================== */
export default function ConsultationRoomScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  // Guard: id válido?
  const numericId = Number(id);
  React.useEffect(() => {
    if (!id || Number.isNaN(numericId)) {
      // evita “invalid id” e chamadas desnecessárias
      router.replace("/librarian/consultas");
    }
  }, [id, numericId, router]);

  const safeClose = React.useCallback(() => {
    if ((router as any).canGoBack?.()) router.back();
    else router.replace("/librarian/consultas");
  }, [router]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [snack, setSnack] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<any | null>(null);
  const [notes, setNotes] = React.useState<string>("");

  const [showAdd, setShowAdd] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (!numericId || Number.isNaN(numericId)) return;
    (async () => {
      try {
        setLoading(true);
        const d = await consultationsApi.details(numericId);
        if (!alive) return;
        setDetails(d);
        setNotes(d?.consultation?.notes ?? "");
      } catch (e: any) {
        Alert.alert(
          "Erro",
          e?.message ?? "Não foi possível carregar a consulta."
        );
        safeClose();
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [numericId, safeClose]);

  if (!numericId || Number.isNaN(numericId)) {
    return null; // já redirecionou
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  const c = details?.consultation;
  const status = (c?.status ?? "PENDING") as Status;
  const canEdit = status === "PENDING" || status === "CONFIRMED";
  const canComplete = status === "CONFIRMED";
  const canReschedule = status === "PENDING" || status === "CONFIRMED";

  const onSaveNotes = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      await consultationsApi.updateNotes(numericId, { notes });
      setSnack("Notas guardadas");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao guardar notas.");
    } finally {
      setSaving(false);
    }
  };

  const onComplete = async () => {
    if (!canComplete) return;
    try {
      setSaving(true);
      await consultationsApi.complete(numericId);
      setSnack("Consulta concluída");
      const d = await consultationsApi.details(numericId);
      setDetails(d);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao concluir.");
    } finally {
      setSaving(false);
    }
  };

  const onOpenMeeting = () => {
    const url = c?.meetingUrl;
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir o link da reunião.")
    );
  };

  const onCopyLink = async () => {
    const url = c?.meetingUrl;
    if (!url) return;
    await Share.share({ message: url });
  };

  const onDownloadPdf = async () => {
    try {
      setSaving(true);
      const blob = await consultationsApi.downloadSummaryPdf(numericId);
      const base64 = await blobToBase64(blob);
      const fileUri = FileSystem.cacheDirectory! + `consulta_${numericId}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await shareFileSafe(fileUri);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao descarregar PDF.");
    } finally {
      setSaving(false);
    }
  };

  /** ===== overlay do modal (usamos presentation: 'transparentModal') ===== */
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 12,
      }}
    >
      {/* click fora fecha */}
      <Pressable
        onPress={safeClose}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Cartão central */}
      <View
        style={{
          alignSelf: "stretch",
          marginHorizontal: Platform.OS === "web" ? "10%" : 0,
          maxHeight: "92%",
          borderRadius: 18,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          overflow: "hidden",
        }}
        accessibilityLabel="Consulta"
      >
        {/* Top bar */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "900" }}>
              {c?.title ?? "Consulta"}
            </Text>
            <Text style={{ opacity: 0.7 }}>
              {fmtDateTime(c?.startAt)}{" "}
              {c?.endAt ? `• ${fmtTimeRange(c?.startAt, c?.endAt)}` : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {c?.meetingUrl ? (
              <IconButton
                icon="video"
                onPress={onOpenMeeting}
                accessibilityLabel="Abrir reunião"
              />
            ) : null}
            <IconButton
              icon="share-variant"
              onPress={onCopyLink}
              accessibilityLabel="Partilhar link"
            />
            <IconButton
              icon="download"
              onPress={onDownloadPdf}
              accessibilityLabel="Descarregar PDF"
            />
            <IconButton
              icon="close"
              onPress={safeClose}
              accessibilityLabel="Fechar"
            />
          </View>
        </View>

        {/* Conteúdo */}
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 16 }}>
          <StatusPill status={c?.status} />

          <Section title="Dados">
            <List.Item
              title="Data"
              description={fmtDateTime(c?.startAt)}
              left={(p) => <List.Icon {...p} icon="calendar" />}
            />
            <List.Item
              title="Hora"
              description={fmtTimeRange(c?.startAt, c?.endAt)}
              left={(p) => <List.Icon {...p} icon="clock-outline" />}
            />
            {c?.modeEnum ? (
              <List.Item
                title="Modo"
                description={modeLabel(c?.modeEnum)}
                left={(p) => <List.Icon {...p} icon="account-voice" />}
              />
            ) : null}
            {c?.meetingUrl ? (
              <List.Item
                title="Link da reunião"
                description={c?.meetingUrl}
                onPress={onOpenMeeting}
                left={(p) => <List.Icon {...p} icon="video" />}
              />
            ) : null}
            <Divider style={{ marginVertical: 8 }} />
            {details?.family ? (
              <List.Item
                title="Família"
                description={details.family.fullName}
                left={(p) => <List.Icon {...p} icon="account" />}
              />
            ) : null}
            {details?.child ? (
              <List.Item
                title="Criança"
                description={details.child.name}
                left={(p) => <List.Icon {...p} icon="baby-face-outline" />}
              />
            ) : null}
            {details?.library ? (
              <List.Item
                title="Biblioteca"
                description={details.library.name}
                left={(p) => <List.Icon {...p} icon="library" />}
              />
            ) : null}
          </Section>

          <Section title="Notas">
            <TextInput
              mode="outlined"
              label="Notas"
              multiline
              value={notes}
              onChangeText={setNotes}
              editable={canEdit}
            />
            <View style={{ height: 8 }} />
            <Button
              mode="contained"
              onPress={onSaveNotes}
              disabled={!canEdit}
              loading={saving}
              icon="content-save"
            >
              Guardar notas
            </Button>
            {!canEdit && (
              <Text style={{ marginTop: 6, opacity: 0.7 }}>
                Este estado não permite edição de notas.
              </Text>
            )}
          </Section>

          <Section title="Anexos">
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Button
                icon="plus"
                mode="contained-tonal"
                onPress={() => setShowAdd(true)}
                disabled={!canEdit}
              >
                Adicionar
              </Button>
            </View>

            <Text variant="titleMedium">Livros</Text>
            {(details?.attachments?.books ?? []).length === 0 && (
              <Text style={{ opacity: 0.6 }}>Sem livros anexados.</Text>
            )}
            {details?.attachments?.books?.map((b: any) => (
              <List.Item
                key={b.isbn ?? b.id}
                title={b.title ?? b.isbn}
                left={(p) => <List.Icon {...p} icon="book-outline" />}
              />
            ))}

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="titleMedium">Micro-conteúdos</Text>
            {(details?.attachments?.microContents ?? []).length === 0 && (
              <Text style={{ opacity: 0.6 }}>Sem micro-conteúdos.</Text>
            )}
            {details?.attachments?.microContents?.map((m: any) => (
              <List.Item
                key={m.id}
                title={m.text ?? `#${m.id}`}
                left={(p) => (
                  <List.Icon {...p} icon="chat-processing-outline" />
                )}
              />
            ))}

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="titleMedium">Eventos culturais</Text>
            {(details?.attachments?.events ?? []).length === 0 && (
              <Text style={{ opacity: 0.6 }}>Sem eventos.</Text>
            )}
            {details?.attachments?.events?.map((e: any) => (
              <List.Item
                key={e.id}
                title={e.title}
                description={e.startDate}
                left={(p) => <List.Icon {...p} icon="ticket-outline" />}
              />
            ))}
            {!canEdit && (
              <Text style={{ marginTop: 6, opacity: 0.7 }}>
                Este estado não permite adicionar anexos.
              </Text>
            )}
          </Section>

          <Section title="Leituras">
            {(details?.readings ?? []).length === 0 && (
              <Text style={{ opacity: 0.6 }}>Sem leituras registadas.</Text>
            )}
            {details?.readings?.map((r: any, idx: number) => {
              const stars = Number(r?.rating?.stars ?? 0);
              const subtitleParts = [
                r.childName ?? "",
                r.finishedAt ? fmtDate(r.finishedAt) : "",
              ].filter(Boolean);
              return (
                <List.Item
                  key={idx}
                  title={r.bookTitle ?? r.bookIsbn}
                  description={subtitleParts.join(" — ")}
                  left={(p) => (
                    <View
                      style={{
                        width: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {stars > 0 ? (
                        <View style={{ flexDirection: "row" }}>
                          {Array.from({ length: Math.min(stars, 5) }).map(
                            (_, i) => (
                              <Text key={i} accessibilityLabel="estrela">
                                ★
                              </Text>
                            )
                          )}
                        </View>
                      ) : (
                        <List.Icon {...p} icon="star-outline" />
                      )}
                    </View>
                  )}
                  right={() =>
                    stars > 0 ? (
                      <View
                        style={{
                          alignSelf: "center",
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: "#DBEAFE",
                        }}
                      >
                        <Text style={{ color: "#1E3A8A", fontWeight: "700" }}>
                          {stars}/5
                        </Text>
                      </View>
                    ) : null
                  }
                />
              );
            })}
          </Section>

          <Section title="Timeline">
            {Array.isArray(details?.events) && details.events.length > 0 ? (
              ([...details.events] as any[])
                .sort(
                  (a, b) =>
                    new Date(a.when ?? a.date ?? a.createdAt).getTime() -
                    new Date(b.when ?? b.date ?? b.createdAt).getTime()
                )
                .map((ev: any, idx: number) => {
                  const label =
                    ev?.label ?? ev?.title ?? ev?.type ?? `Evento ${idx + 1}`;
                  const when = ev?.when ?? ev?.date ?? ev?.createdAt;
                  const desc = ev?.description ?? ev?.details ?? "";
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <View style={{ width: 16, alignItems: "center" }}>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#666",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{label}</Text>
                        <Text style={{ opacity: 0.7 }}>
                          {fmtDateTime(String(when))}
                        </Text>
                        {!!desc && (
                          <Text style={{ marginTop: 2 }}>{String(desc)}</Text>
                        )}
                      </View>
                    </View>
                  );
                })
            ) : (
              <Text style={{ opacity: 0.6 }}>Sem eventos na timeline.</Text>
            )}

            <Divider style={{ marginVertical: 8 }} />
            <Text variant="titleMedium" style={{ marginBottom: 6 }}>
              Histórico de consultas (relacionadas)
            </Text>
            {(details?.history?.consultations ?? []).length === 0 ? (
              <Text style={{ opacity: 0.6 }}>Sem histórico.</Text>
            ) : (
              details?.history?.consultations?.map((h: any) => (
                <List.Item
                  key={h.id}
                  title={h.title ?? `Consulta #${h.id}`}
                  description={`${h.status}${
                    h.startAt ? " — " + fmtDateTime(h.startAt) : ""
                  }`}
                  left={(p) => <List.Icon {...p} icon="history" />}
                />
              ))
            )}
          </Section>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outlineVariant,
            flexDirection: "row",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <Button
            mode="outlined"
            onPress={() =>
              router.push(`/librarian/consultas/${numericId}/reagendar`)
            }
            icon="calendar-refresh"
            disabled={!canReschedule}
          >
            Reagendar
          </Button>
          <Button
            mode="contained"
            onPress={onComplete}
            loading={saving}
            icon="check-circle"
            disabled={!canComplete}
          >
            Concluir
          </Button>
        </View>
      </View>

      {/* modal interno: anexos */}
      <AddAttachmentsModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={async (payload) => {
          try {
            setAdding(true);
            if (!(status === "PENDING" || status === "CONFIRMED")) return;
            await consultationsApi.addAttachments(numericId, payload);
            const d = await consultationsApi.details(numericId);
            setDetails(d);
            setSnack("Anexos adicionados");
            setShowAdd(false);
          } catch (e: any) {
            Alert.alert("Erro", e?.message ?? "Falha ao adicionar anexos.");
          } finally {
            setAdding(false);
          }
        }}
        busy={adding}
      />

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={2500}
      >
        {snack}
      </Snackbar>
    </View>
  );
}

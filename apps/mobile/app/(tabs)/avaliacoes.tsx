// apps/mobile/app/(tabs)/avaliacoes.tsx
import * as React from "react";
import { ScrollView, View, Image, StyleSheet } from "react-native";
import {
  Appbar,
  Button,
  Text,
  TextInput,
  IconButton,
  ActivityIndicator,
  useTheme,
  Snackbar,
  Chip, // ⬅️ filtros
  TouchableRipple, // ⬅️ mini-card
  Divider, // ⬅️ separador entre cards
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Background } from "@bibliotecario/ui-mobile";
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import { useAuth } from "src/contexts/AuthContext";
import { saveRating } from "src/services/ratings";
import {
  getLeiturasTerminadas,
  type FinishedReading,
} from "src/services/readings";
import { TABBAR_HEIGHT } from "./_layout";

/* ---------- Section Card (branco) ---------- */
const WhiteCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface ?? "#fff",
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* ---------- Mini card (linha clicável) ---------- */
const RowCard: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}> = ({ children, onPress, style }) => {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={theme.colors.primary}
      style={[
        {
          backgroundColor: theme.colors.background,
          borderRadius: 12,
          padding: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant ?? "rgba(0,0,0,0.12)",
        },
        style,
      ]}
    >
      <View>{children}</View>
    </TouchableRipple>
  );
};

/* ---------- Estrelas ---------- */
function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconButton
          key={n}
          icon={n <= value ? "star" : "star-outline"}
          onPress={() => onChange(n)}
        />
      ))}
    </View>
  );
}

/* ---------- Card de avaliação (agora com RowCard) ---------- */
type WhiteEvaluationCardProps = {
  title: string;
  finishedAt?: string | null;
  coverUrl?: string | null;
  stars: number;
  comment: string;
  saving?: boolean;
  onChangeStars: (v: number) => void;
  onChangeComment: (t: string) => void;
  onSave: () => void;
};
const WhiteEvaluationCard: React.FC<WhiteEvaluationCardProps> = ({
  title,
  finishedAt,
  coverUrl,
  stars,
  comment,
  saving,
  onChangeStars,
  onChangeComment,
  onSave,
}) => {
  const theme = useTheme();
  const finishedLabel = finishedAt
    ? new Date(finishedAt).toLocaleDateString("pt-PT")
    : undefined;

  return (
    <RowCard>
      {/* Linha 1: Título (esq) + Data (dir, apagada) */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text
          numberOfLines={2}
          style={{ fontWeight: "700", flex: 1, paddingTop: 10 }}
        >
          {title}
        </Text>
        {finishedLabel ? (
          <Chip compact mode="flat" style={{ opacity: 0.8 }}>
            {finishedLabel}
          </Chip>
        ) : null}
      </View>

      {/* Linha 2: Estrelas */}
      <View style={{ marginTop: 6 }}>
        <StarRow value={stars} onChange={onChangeStars} />
      </View>

      {/* Linha 3: Capa + Comentário lado a lado */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Image
          source={{ uri: coverUrl ?? undefined }}
          style={{
            width: 88,
            height: 128,
            borderRadius: 8,
            backgroundColor: theme.colors.surfaceVariant,
          }}
        />
        <View style={{ flex: 1 }}>
          <TextInput
            mode="outlined"
            label="Comentário"
            value={comment}
            onChangeText={onChangeComment}
            multiline
            numberOfLines={4}
            // garante altura e alinhamento do texto no topo
            contentStyle={{ minHeight: 96, textAlignVertical: "top" }}
          />
        </View>
      </View>

      {/* Linha 4: Botão Guardar à direita */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 10,
        }}
      >
        <Button
          mode="contained"
          onPress={onSave}
          loading={!!saving}
          disabled={!!saving}
        >
          Guardar
        </Button>
      </View>
    </RowCard>
  );
};

function toChildId(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof val === "object") {
    // @ts-ignore
    const anyId = val.id ?? val.value ?? val.key;
    return toChildId(anyId);
  }
  return undefined;
}

/* ===================== Screen ===================== */
export default function AvaliacoesTab() {
  const { user, actAsChild } = useAuth();
  const insets = useSafeAreaInsets();

  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  const firstChildId =
    !actingChildId && user?.children?.length
      ? Number(user.children[0].id)
      : undefined;

  const [selectedChildId, setSelectedChildId] = React.useState<
    string | undefined
  >(firstChildId ? String(firstChildId) : undefined);

  const childId = selectedChildId ? Number(selectedChildId) : actingChildId;

  const familyIdForAuth =
    Number((user as any)?.family?.id) ||
    Number((user as any)?.families?.[0]?.id) ||
    Number((user as any)?.id) || // último recurso
    undefined;

  const [items, setItems] = React.useState<FinishedReading[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [savingIsbn, setSavingIsbn] = React.useState<string | null>(null);
  const [commentDraft, setCommentDraft] = React.useState<
    Record<string, string>
  >({});
  const [starsDraft, setStarsDraft] = React.useState<Record<string, number>>(
    {}
  );
  const [snack, setSnack] = React.useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // filtros (como na web/leituras): Com avaliação / Sem avaliação
  const [ratingFilter, setRatingFilter] = React.useState<
    ("rated" | "unrated")[]
  >([]);

  const filteredItems = React.useMemo(() => {
    if (!ratingFilter.length) return items;
    return items.filter((r) =>
      ratingFilter.includes(typeof r.stars === "number" ? "rated" : "unrated")
    );
  }, [items, ratingFilter]);

  async function load() {
    if (!childId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const finished = await getLeiturasTerminadas(50, { childId });
      setItems(finished);

      // pré-preenche drafts (edição)
      setStarsDraft((m) => {
        const next = { ...m };
        for (const r of finished)
          if (typeof r.stars === "number") next[r.isbn] = r.stars;
        return next;
      });
      setCommentDraft((m) => {
        const next = { ...m };
        for (const r of finished) if (r.comment) next[r.isbn] = r.comment!;
        return next;
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Falha ao carregar leituras terminadas.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [childId]);

  const onSave = async (it: FinishedReading) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }

    const stars = starsDraft[it.isbn] ?? it.stars ?? 0;
    const comment = commentDraft[it.isbn] ?? it.comment ?? "";

    if (stars < 1 || stars > 5) {
      setSnack({ msg: "Escolhe entre 1 e 5 estrelas.", type: "error" });
      return;
    }
    const unchanged =
      (typeof it.stars === "number" ? it.stars : 0) === stars &&
      (it.comment ?? "") === comment;
    if (unchanged) {
      setSnack({ msg: "Sem alterações para guardar.", type: "error" });
      return;
    }

    setSavingIsbn(it.isbn);
    try {
      await saveRating({
        isbn: it.isbn,
        stars,
        comment: comment || undefined,
        childId,
        familyId: familyIdForAuth, // para o resolveChildId / contexto
        userIdHeader: familyIdForAuth, // força x-user-id no header
      });
      setSnack({ msg: "Avaliação guardada!", type: "success" });
      setItems((arr) =>
        arr.map((r) =>
          r.isbn === it.isbn ? { ...r, stars, comment: comment || null } : r
        )
      );
    } catch (e: any) {
      console.error(e);
      setSnack({ msg: "Falha ao guardar a avaliação.", type: "error" });
    } finally {
      setSavingIsbn(null);
    }
  };

  return (
    <Background>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 8),
          paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          paddingHorizontal: 16,
          rowGap: 16,
        }}
      >
        {/* WHITE CARD SUPERIOR — Header + SelectChild */}
        <WhiteCard>
          <Appbar.Header
            mode="small"
            style={{
              backgroundColor: "transparent",
              elevation: 0,
              paddingHorizontal: 0,
            }}
          >
            <Appbar.Content
              title="Avaliações"
              subtitle="Avalia (ou edita) leituras terminadas"
            />
            <Appbar.Action
              icon="refresh"
              disabled={loading || !childId}
              onPress={load}
            />
          </Appbar.Header>

          {!actingChildId && (
            <View style={{ rowGap: 10, marginTop: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                Escolhe a criança
              </Text>
              <SelectChild
                label="Selecionar criança"
                placeholder="Escolhe um perfil"
                options={(user?.children ?? []).map((c: any) => ({
                  id: String(c.id),
                  name: c.name,
                  avatarUri: c.avatarUrl || undefined,
                }))}
                value={selectedChildId}
                onChange={(val: any) => {
                  const id = toChildId(val);
                  setSelectedChildId(id ? String(id) : undefined);
                }}
                clearable
                disabled={!user?.children?.length}
                menuMaxHeight={360}
              />
              {!childId && (
                <Text style={{ opacity: 0.7 }}>
                  Seleciona uma criança para veres as leituras terminadas.
                </Text>
              )}
            </View>
          )}
        </WhiteCard>

        {/* Estado / Mensagens */}
        {error ? (
          <WhiteCard>
            <Text>{error}</Text>
          </WhiteCard>
        ) : loading ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator />
          </View>
        ) : !childId ? (
          <WhiteCard>
            <Text style={{ opacity: 0.7 }}>
              Seleciona uma criança para começar.
            </Text>
          </WhiteCard>
        ) : items.length === 0 ? (
          <WhiteCard>
            <Text style={{ opacity: 0.7 }}>
              Sem leituras terminadas para avaliar.
            </Text>
          </WhiteCard>
        ) : (
          // ------ Secção principal com lista + filtros ------
          <WhiteCard>
            <Text variant="titleLarge" style={{ fontWeight: "900" }}>
              Avaliar leituras
            </Text>

            {/* chips por baixo do título */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <Chip
                mode={ratingFilter.includes("rated") ? "flat" : "outlined"}
                selected={ratingFilter.includes("rated")}
                onPress={() =>
                  setRatingFilter((s) =>
                    s.includes("rated")
                      ? s.filter((x) => x !== "rated")
                      : [...s, "rated"]
                  )
                }
                icon="star"
              >
                Com avaliação
              </Chip>
              <Chip
                mode={ratingFilter.includes("unrated") ? "flat" : "outlined"}
                selected={ratingFilter.includes("unrated")}
                onPress={() =>
                  setRatingFilter((s) =>
                    s.includes("unrated")
                      ? s.filter((x) => x !== "unrated")
                      : [...s, "unrated"]
                  )
                }
                icon="star-outline"
              >
                Sem avaliação
              </Chip>
            </View>

            <View style={{ rowGap: 10 }}>
              {filteredItems.map((item, idx) => {
                const draftStars = starsDraft[item.isbn];
                const draftComment = commentDraft[item.isbn];
                const effectiveStars = draftStars ?? item.stars ?? 0;
                const effectiveComment = draftComment ?? item.comment ?? "";

                return (
                  <View key={`${item.childId}-${item.isbn}`}>
                    <WhiteEvaluationCard
                      title={item.title}
                      finishedAt={item.finishedAt}
                      coverUrl={item.coverUrl}
                      stars={effectiveStars}
                      comment={effectiveComment}
                      saving={savingIsbn === item.isbn}
                      onChangeStars={(v) =>
                        setStarsDraft((m) => ({ ...m, [item.isbn]: v }))
                      }
                      onChangeComment={(t) =>
                        setCommentDraft((m) => ({ ...m, [item.isbn]: t }))
                      }
                      onSave={() => onSave(item)}
                    />
                    {idx < filteredItems.length - 1 && (
                      <Divider
                        style={{
                          marginHorizontal: 4,
                          marginTop: 10,
                          opacity: 0.15,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </WhiteCard>
        )}
      </ScrollView>

      {/* TOAST */}
      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={2500}
        action={{ label: "Fechar", onPress: () => setSnack(null) }}
        style={
          snack?.type === "success"
            ? { backgroundColor: "#2e7d32" }
            : snack?.type === "error"
            ? { backgroundColor: "#c62828" }
            : undefined
        }
      >
        {snack?.msg}
      </Snackbar>
    </Background>
  );
}

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
  Snackbar, // ⬅️ toast
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

/* ---------- WhiteCard (visível) ---------- */
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

/* ---------- Card de avaliação ---------- */
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
  return (
    <WhiteCard>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image
          source={{ uri: coverUrl ?? undefined }}
          style={{
            width: 56,
            height: 80,
            borderRadius: 6,
            marginRight: 12,
            backgroundColor: theme.colors.surfaceVariant,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" numberOfLines={2}>
            {title}
          </Text>
          {finishedAt ? (
            <Text variant="labelSmall" style={{ opacity: 0.6, marginTop: 2 }}>
              {new Date(finishedAt).toLocaleString()}
            </Text>
          ) : null}
          <StarRow value={stars} onChange={onChangeStars} />
          <TextInput
            mode="outlined"
            label="Comentário"
            value={comment}
            onChangeText={onChangeComment}
            multiline
          />
        </View>
        <Button
          mode="contained"
          onPress={onSave}
          loading={!!saving}
          disabled={!!saving}
          style={{ marginLeft: 8 }}
        >
          Guardar
        </Button>
      </View>
    </WhiteCard>
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
    // tenta .id / .value / .key
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

      // pré-preenche drafts com o que já vem da API (edição)
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
        // 👇 isto evita o 401/unauthenticated e dá contexto à API
        userId: (user as any)?.id,
        familyId: (user as any)?.family?.id ?? (user as any)?.families?.[0]?.id,
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
        {/* WHITE CARD SUPERIOR — Header + SelectChild (quando não há actingChild) */}
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

                  // ⬇️ opcional mas recomendado: sincroniza o contexto
                  if (
                    id &&
                    id !== actingChildId &&
                    typeof actAsChild === "function"
                  ) {
                    actAsChild(id).catch((e: any) =>
                      console.warn("actAsChild:", e?.message || e)
                    );
                  }
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
          <View style={{ rowGap: 12 }}>
            {items.map((item) => {
              const draftStars = starsDraft[item.isbn];
              const draftComment = commentDraft[item.isbn];
              const effectiveStars = draftStars ?? item.stars ?? 0;
              const effectiveComment = draftComment ?? item.comment ?? "";
              return (
                <WhiteEvaluationCard
                  key={`${item.childId}-${item.isbn}`}
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
              );
            })}
          </View>
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

/**
 * ============================================================================
 * Ficheiro: <mantém o caminho se fornecido>
 * Módulo: Ecrã de Avaliações de Leituras (React Native/Expo + React Native Paper)
 * Autor: Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * ============================================================================
 */

import * as React from "react";
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Button,
  Text,
  TextInput,
  IconButton,
  ActivityIndicator,
  useTheme,
  Snackbar,
  Chip,
  TouchableRipple,
  Divider,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import { Background } from "@bibliotecario/ui-mobile";
import SelectChild from "@bibliotecario/ui-mobile/components/Avatars/SelectChild";
import { useAuth } from "src/contexts/AuthContext";
import { saveRating } from "src/services/ratings";
import {
  getLeiturasTerminadas,
  type FinishedReading,
} from "src/services/readings";
import { TABBAR_HEIGHT } from "src/constants/layout";
import type { MD3Theme } from "react-native-paper";

/* =============================================================================
 * Helpers PUROS (determinísticos, sem efeitos)
 * ===========================================================================*/

/**
 * Formata uma data ISO para “pt-PT”. Se vazio, devolve `undefined`.
 * @param isoString Data em ISO (ou `null/undefined`)
 */
function formatDatePt(isoString?: string | null): string | undefined {
  return isoString
    ? new Date(isoString).toLocaleDateString("pt-PT")
    : undefined;
}

/**
 * Normaliza/valida um id de criança a partir de várias formas comuns.
 * Aceita number/string/objeto com { id | value | key }.
 */
function toChildId(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof val === "object") {
    // @ts-ignore — tentamos ler propriedades conhecidas
    const anyId = (val as any).id ?? (val as any).value ?? (val as any).key;
    return toChildId(anyId);
  }
  return undefined;
}

/**
 * Verifica se o nº de estrelas é válido (1..5).
 */
function isValidStars(stars: number): boolean {
  return Number.isFinite(stars) && stars >= 1 && stars <= 5;
}

/**
 * Devolve array filtrado por “rated/unrated”.
 */
function filterByRating(
  items: FinishedReading[],
  filter: Array<"rated" | "unrated">
): FinishedReading[] {
  if (!filter.length) return items;
  return items.filter((r) =>
    filter.includes(typeof r.stars === "number" ? "rated" : "unrated")
  );
}

/**
 * Detecta se a avaliação não sofreu alterações.
 */
function isUnchangedRating(
  item: FinishedReading,
  stars: number,
  comment: string
): boolean {
  const prevStars = typeof item.stars === "number" ? item.stars : 0;
  const prevComment = item.comment ?? "";
  return prevStars === stars && prevComment === comment;
}

/**
 * Extrai o `familyId` para autenticação de forma tolerante.
 */
function getFamilyIdForAuth(user: any): number | undefined {
  return (
    Number(user?.family?.id) ||
    Number(user?.families?.[0]?.id) ||
    Number(user?.id) ||
    undefined
  );
}

/* =============================================================================
 * UI — Componentes reutilizáveis
 * ===========================================================================*/

/**
 * Cartão branco genérico (secção).
 */
const WhiteCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const theme = useTheme<MD3Theme>();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant,
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

/**
 * Linha clicável com faixa de acento à esquerda.
 */
const RowCard: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}> = ({ children, onPress, style, accentColor }) => {
  const theme = useTheme<MD3Theme>();
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
          borderColor: theme.colors.outlineVariant,
          borderLeftWidth: 4,
          borderLeftColor: accentColor ?? theme.colors.outlineVariant,
        },
        style,
      ]}
    >
      <View>{children}</View>
    </TouchableRipple>
  );
};

/**
 * Conjunto de estrelas selecionáveis (1..5).
 */
function StarRow({
  value,
  onChange,
}: {
  /** Valor atual (0..5) */
  value: number;
  /** Callback ao tocar numa estrela */
  onChange: (v: number) => void;
}) {
  const theme = useTheme<MD3Theme>();
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <IconButton
            key={n}
            icon={filled ? "star" : "star-outline"}
            onPress={() => onChange(n)}
            size={20}
            iconColor={
              filled ? theme.colors.tertiary : theme.colors.onSurfaceVariant
            }
            accessibilityLabel={`Selecionar ${n} estrela${n > 1 ? "s" : ""}`}
          />
        );
      })}
    </View>
  );
}

/**
 * Capa do livro com placeholder quando não há imagem.
 */
const BookCover: React.FC<{ uri?: string | null }> = ({ uri }) => {
  const theme = useTheme<MD3Theme>();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: 88,
          height: 128,
          borderRadius: 8,
          backgroundColor: theme.colors.surfaceVariant,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 88,
        height: 128,
        borderRadius: 8,
        backgroundColor: theme.colors.surfaceVariant,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name="book-outline"
        size={28}
        color={theme.colors.onSurfaceVariant}
      />
    </View>
  );
};

/**
 * Propriedades do cartão de avaliação.
 */
type WhiteEvaluationCardProps = {
  /** Título do livro */
  title: string;
  /** Data de conclusão (ISO) */
  finishedAt?: string | null;
  /** URL da capa */
  coverUrl?: string | null;
  /** Nº de estrelas selecionado */
  stars: number;
  /** Comentário escrito */
  comment: string;
  /** Estado de guardar */
  saving?: boolean;
  /** Alterar nº de estrelas */
  onChangeStars: (v: number) => void;
  /** Alterar comentário */
  onChangeComment: (t: string) => void;
  /** Guardar avaliação */
  onSave: () => void;
};

/**
 * Cartão de avaliação (linha expandida).
 */
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
  const theme = useTheme<MD3Theme>();
  const finishedLabel = formatDatePt(finishedAt);

  return (
    <RowCard accentColor={theme.colors.primary}>
      {/* Linha 1: Título + Data (chip) + ícone */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primaryContainer,
            marginTop: 8,
          }}
        >
          <Icon
            name="star-circle-outline"
            size={18}
            color={theme.colors.onPrimaryContainer}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ fontWeight: "800" }}>
            {title}
          </Text>
        </View>

        {finishedLabel ? (
          <Chip
            compact
            mode="outlined"
            icon="calendar-blank"
            style={{ borderColor: theme.colors.outlineVariant }}
          >
            {finishedLabel}
          </Chip>
        ) : null}
      </View>

      {/* Linha 2: Estrelas */}
      <View style={{ marginTop: 6, marginLeft: 36 }}>
        <StarRow value={stars} onChange={onChangeStars} />
      </View>

      {/* Linha 3: Capa + Comentário */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginTop: 8,
          marginLeft: 36,
        }}
      >
        <BookCover uri={coverUrl} />
        <View style={{ flex: 1 }}>
          <TextInput
            mode="outlined"
            label="Comentário"
            value={comment}
            onChangeText={onChangeComment}
            multiline
            numberOfLines={4}
            contentStyle={{ minHeight: 96, textAlignVertical: "top" }}
          />
        </View>
      </View>

      {/* Linha 4: Botão Guardar */}
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
          icon="content-save-outline"
        >
          Guardar
        </Button>
      </View>
    </RowCard>
  );
};

/* =============================================================================
 * Screen
 * ===========================================================================*/

/**
 * Ecrã: Tab “Avaliações” — permite avaliar/editar leituras terminadas.
 * - Mantém exatamente o comportamento existente.
 * - Acrescenta guards e comentários.
 */
export default function AvaliacoesTab() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme<MD3Theme>();

  // ---------------------------------------------------------------------------
  // Deriva ids de contexto do utilizador (tolerante a formatos).
  // ---------------------------------------------------------------------------
  const actingChildId = (user as any)?.actingChild?.id
    ? Number((user as any).actingChild.id)
    : undefined;

  const firstChildId =
    !actingChildId && user?.children?.length
      ? Number(user.children[0].id)
      : undefined;

  // Estado para seleção manual quando não há “actingChild”
  const [selectedChildId, setSelectedChildId] = React.useState<
    string | undefined
  >(firstChildId ? String(firstChildId) : undefined);

  // Id efetivo usado nas queries
  const childId = selectedChildId ? Number(selectedChildId) : actingChildId;

  // FamilyId usado nas chamadas autenticadas
  const familyIdForAuth = getFamilyIdForAuth(user as any);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
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

  // Filtros (“Com avaliação” / “Sem avaliação”)
  const [ratingFilter, setRatingFilter] = React.useState<
    Array<"rated" | "unrated">
  >([]);

  // Lista filtrada memorizada
  const filteredItems = React.useMemo(
    () => filterByRating(items, ratingFilter),
    [items, ratingFilter]
  );

  // ---------------------------------------------------------------------------
  // Carregamento de leituras terminadas
  // ---------------------------------------------------------------------------
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

      // Sincroniza drafts a partir de dados existentes (idempotente)
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

  // Recarrega quando muda o id da criança
  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // ---------------------------------------------------------------------------
  // Guardar avaliação (mesma semântica original)
  // ---------------------------------------------------------------------------
  const onSave = async (it: FinishedReading) => {
    if (!childId) {
      setSnack({ msg: "Escolhe a criança primeiro.", type: "error" });
      return;
    }

    const stars = starsDraft[it.isbn] ?? it.stars ?? 0;
    const comment = commentDraft[it.isbn] ?? it.comment ?? "";

    if (!isValidStars(stars)) {
      setSnack({ msg: "Escolhe entre 1 e 5 estrelas.", type: "error" });
      return;
    }
    if (isUnchangedRating(it, stars, comment)) {
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
        familyId: familyIdForAuth,
      });
      setSnack({ msg: "Avaliação guardada!", type: "success" });
      setItems((arr) =>
        arr.map((r) =>
          r.isbn === it.isbn ? { ...r, stars, comment: comment || null } : r
        )
      );
    } catch (e: any) {
      console.error(e);
      setSnack({
        msg: e?.message || "Falha ao guardar a avaliação.",
        type: "error",
      });
    } finally {
      setSavingIsbn(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Estilos de chips “selected” (branding coerente)
  // ---------------------------------------------------------------------------
  const BORDER = theme.colors.outlineVariant;
  const selBg = theme.colors.primaryContainer;
  const selFg = theme.colors.onPrimaryContainer;
  const selBorder = theme.colors.primary;

  /** Chip de filtro genérico (mantém API do Paper) */
  const FilterChip: React.FC<{
    selected: boolean;
    onPress: () => void;
    icon: string;
    children: React.ReactNode;
  }> = ({ selected, onPress, icon, children }) => (
    <Chip
      mode="outlined"
      selected={selected}
      onPress={onPress}
      style={{
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? selBg : undefined,
        borderColor: selected ? selBorder : BORDER,
      }}
      textStyle={{
        color: selected ? selFg : theme.colors.onSurface,
        fontWeight: (selected ? "700" : "400") as any,
      }}
      selectedColor={selected ? selFg : theme.colors.onSurface}
      icon={icon as any}
    >
      {children}
    </Chip>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: insets.bottom + TABBAR_HEIGHT + 16,
          }}
        >
          {/* WHITE CARD SUPERIOR — Header compacto + SelectChild */}
          <WhiteCard>
            {/* Header compacto */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
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
                    name="star-box-multiple-outline"
                    size={20}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                    Avaliações
                  </Text>
                  <Text style={{ opacity: 0.7, marginTop: 2 }}>
                    Avalia (ou edita) leituras terminadas
                  </Text>
                </View>
              </View>

              <IconButton
                icon="refresh"
                disabled={loading || !childId}
                onPress={load}
              />
            </View>

            {/* Seletor de criança (omitido se estiver a atuar como criança) */}
            {!actingChildId && (
              <View style={{ rowGap: 10, marginTop: 12 }}>
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
            /* ------ Secção principal com lista + filtros ------ */
            <WhiteCard>
              <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                Avaliar leituras
              </Text>

              {/* Chips por baixo do título (branding) */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <FilterChip
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
                </FilterChip>
                <FilterChip
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
                </FilterChip>
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
      </SafeAreaView>

      {/* Snackbar (toast) de feedback */}
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

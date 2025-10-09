// ============================== apps/web/src/pages/reviews.tsx ==============================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Página: Avaliar leituras (terminadas)
 *
 * Notas do refactor:
 * - Comentários detalhados por secções para leitura rápida
 * - Funções/“métodos” utilitários PUROS e pequenos (≤ 30 linhas)
 * - Mesma lógica/UX do original (sem alterações funcionais)
 */

import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Stack,
  Typography,
  TextField,
  Rating,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  Chip,
  Tooltip,
  Box,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import RateReviewRounded from "@mui/icons-material/RateReviewRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import StarBorderRounded from "@mui/icons-material/StarBorderRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import UpdateRounded from "@mui/icons-material/UpdateRounded";
import ModeCommentRounded from "@mui/icons-material/ModeCommentRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import {
  WhiteCard,
  AvatarSelect,
  FilterBar,
  type FilterDefinition,
  Paginator,
} from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { listPendingRatings, submitRating } from "../../services/readings";

/* =========================================================================================
   Tipos
   ========================================================================================= */

type Row = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  stars: number | null;
  comment?: string | null;
  ratedAt?: string | null;
};

/* =========================================================================================
   Constantes de página
   ========================================================================================= */

const PAGE_SIZE = 12;

/* =========================================================================================
   UI: cartão “skeleton” (carregamento)
   ========================================================================================= */

function SkeletonCard() {
  return (
    <Box
      sx={{
        width: 260,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" width="100%" height={320} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="70%" height={24} />
        <Skeleton width="40%" height={16} sx={{ mt: 1 }} />
        <Skeleton width="60%" height={28} sx={{ mt: 1 }} />
        <Skeleton width="100%" height={48} sx={{ mt: 1 }} />
        <Skeleton width="100%" height={36} sx={{ mt: 1 }} />
      </Box>
    </Box>
  );
}

/* =========================================================================================
   Helpers PUROS (≤ 30 linhas)
   ========================================================================================= */

/** Devolve apenas leituras terminadas */
function onlyFinished(rows: Row[]): Row[] {
  return rows.filter((r) => r.status === "finished");
}

/** Aplica filtro “rating” (rated / unrated) aos terminados */
function filterByRating(rows: Row[], ratingSel: string[]): Row[] {
  if (ratingSel.length === 0 || ratingSel.length === 2) return rows;
  const wantRated = ratingSel.includes("rated");
  return rows.filter((r) =>
    wantRated ? typeof r.stars === "number" : typeof r.stars !== "number"
  );
}

/** Paginação simples */
function paginate<T>(arr: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}

/** Semeia mapas de estrelas/comentários a partir de leituras terminadas */
function seedStarsAndComments(rows: Row[]): {
  stars: Record<string, number>;
  comment: Record<string, string>;
} {
  const stars: Record<string, number> = {};
  const comment: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.stars === "number") stars[r.isbn] = r.stars;
    if (r.comment) comment[r.isbn] = r.comment;
  }
  return { stars, comment };
}

/** Constrói opções para o AvatarSelect a partir do utilizador */
function buildChildOptions(
  user: any
): { id: string; nome: string; avatar?: string }[] {
  return (user?.children || []).map((c: any) => ({
    id: String(c.id),
    nome: c.name ?? "Criança",
    avatar: (c as any).avatarUrl || undefined,
  }));
}

/* =========================================================================================
   Página
   ========================================================================================= */

export default function ReviewsPage() {
  const { user, asChild } = useUserSession();

  // 🎯 Em modo família, o seletor é LOCAL (não altera o “active user” global)
  const [localChildId, setLocalChildId] = useState<string>("");

  // ID efetivo: actingChild em modo criança; localChildId em família
  const childId = asChild
    ? Number(user?.actingChild?.id as any)
    : localChildId
    ? Number(localChildId)
    : undefined;

  // Header de auth (compatível com mobile / x-user-id)
  const familyIdForAuth =
    Number((user as any)?.family?.id) ||
    Number((user as any)?.families?.[0]?.id) ||
    Number((user as any)?.id) ||
    undefined;

  const mustPickChild = !asChild && !childId;

  // Estado de dados/UI
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // -------- filtros + paginação --------
  const FINISHED_FILTERS: FilterDefinition[] = [
    {
      id: "rating",
      label: "Avaliação",
      options: [
        { value: "rated", label: "Com avaliação" },
        { value: "unrated", label: "Sem avaliação" },
      ],
    },
  ];
  const [filters, setFilters] = useState<Record<string, string[]>>({
    rating: [],
  });

  // Apenas terminados (memoizado)
  const finished = useMemo(() => onlyFinished(rows), [rows]);

  // Filtro “rating” (rated/unrated)
  const filtered = useMemo(
    () => filterByRating(finished, filters.rating || []),
    [finished, filters]
  );

  // Paginação
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => paginate(filtered, page, PAGE_SIZE),
    [filtered, page]
  );

  // Reset de página quando mudam filtros ou dataset
  useEffect(() => setPage(1), [JSON.stringify(filters), finished.length]);

  /** Carrega leituras pendentes de rating (limit 200) e semeia stars/comments */
  async function load() {
    if (!childId) return; // (família) não disparamos sem criança
    setLoading(true);
    try {
      const data = await listPendingRatings({
        childId,
        familyId: familyIdForAuth, // header x-user-id
        limit: 200,
      });

      const onlyFin = onlyFinished(data as Row[]);
      const seeds = seedStarsAndComments(onlyFin);

      setStars(seeds.stars);
      setComment(seeds.comment);
      setRows(onlyFin);
    } finally {
      setLoading(false);
    }
  }

  // Carregar ao trocar criança/família
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyIdForAuth]);

  // Opções para seletor de criança (família)
  const childOptions = buildChildOptions(user);

  /* ----------------------------- GATE: escolher criança (família) ----------------------------- */
  if (mustPickChild) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WhiteCard>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <RateReviewRounded />
            <Typography variant="h5" fontWeight={900}>
              Avaliar Leituras
            </Typography>
          </Stack>
          <Typography sx={{ mt: 1.5, mb: 2, opacity: 0.8 }}>
            Escolhe o perfil da criança para veres as leituras terminadas e
            deixares a avaliação.
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <PeopleAltRounded />
            <AvatarSelect
              label="Escolher criança"
              options={childOptions}
              value={localChildId || undefined}
              onChange={(id) => setLocalChildId(id ?? "")}
              minWidth={280}
            />
          </Stack>
        </WhiteCard>
      </Container>
    );
  }

  /* ----------------------------------------- UI ----------------------------------------- */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Contexto em modo família (filtro LOCAL; não muda active user) */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Typography
              fontWeight={900}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <PeopleAltRounded fontSize="small" />
              Filtrar por criança
            </Typography>
            <AvatarSelect
              label="Escolher criança"
              options={childOptions}
              value={localChildId || undefined}
              onChange={(id) => setLocalChildId(id ?? "")}
              minWidth={280}
            />
          </Stack>
        </WhiteCard>
      )}

      <WhiteCard>
        {/* Cabeçalho + refresh */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <RateReviewRounded />
            Avaliar Leituras
          </Typography>
          <Tooltip title="Atualizar lista">
            <span>
              <IconButton
                onClick={load}
                aria-label="Atualizar"
                disabled={!childId || loading}
              >
                <RefreshRounded />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Filtros */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 0.5, opacity: 0.9 }}
        >
          <TuneRounded fontSize="small" />
          <Typography variant="body2">Filtros</Typography>
        </Stack>

        <FilterBar
          filters={FINISHED_FILTERS}
          selected={filters}
          onChange={(id, values) => setFilters((s) => ({ ...s, [id]: values }))}
          icons={{ rating: <StarRounded fontSize="small" /> }}
          chipIcons={{ rating: <StarRounded fontSize="small" /> }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Loading skeletons */}
        {loading && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </Stack>
        )}

        {/* Vazio / sem resultados */}
        {!loading && pageItems.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            {childId
              ? "Sem resultados para os filtros aplicados."
              : "Escolhe uma criança para ver leituras terminadas."}
          </Typography>
        ) : null}

        {/* Lista de cartões */}
        {!loading && pageItems.length > 0 && (
          <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {pageItems.map((r) => {
                const currentStars = stars[r.isbn] ?? r.stars ?? 0; // rating visível
                const hasExisting = typeof r.stars === "number" && r.stars > 0; // já avaliado?
                const isBusy = busy === r.isbn;

                return (
                  <Card key={r.isbn} sx={{ width: 260 }}>
                    <img
                      src={r.coverUrl || "/placeholder-book.jpg"}
                      alt={r.title}
                      style={{
                        width: "100%",
                        height: 320,
                        objectFit: "cover",
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                      onError={(e: any) => {
                        if (
                          !e.currentTarget.src.includes("placeholder-book.jpg")
                        ) {
                          e.currentTarget.src = "/placeholder-book.jpg";
                        }
                      }}
                    />

                    <CardContent sx={{ pb: 1 }}>
                      <Typography fontWeight={900} noWrap title={r.title}>
                        {r.title}
                      </Typography>

                      {/* Meta: “Avaliado” / “Por avaliar” + data de rating */}
                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ mt: 0.5 }}
                      >
                        {hasExisting ? (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleRounded fontSize="small" />}
                            label="Avaliado"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={<StarBorderRounded fontSize="small" />}
                            label="Por avaliar"
                            variant="outlined"
                          />
                        )}
                        {r.ratedAt && (
                          <Chip
                            size="small"
                            icon={<CalendarMonthRounded fontSize="small" />}
                            label={new Date(r.ratedAt).toLocaleDateString(
                              "pt-PT"
                            )}
                          />
                        )}
                      </Stack>

                      {/* Rating (controlado/local) */}
                      <Rating
                        value={currentStars}
                        onChange={(_, v) =>
                          setStars((s) => ({ ...s, [r.isbn]: v || 0 }))
                        }
                        sx={{ mt: 1 }}
                        getLabelText={(val) => `${val} estrelas`}
                        aria-label={`Avaliar ${r.title}`}
                      />

                      {/* Comentário (opcional) */}
                      <TextField
                        size="small"
                        placeholder="Comentário (opcional)"
                        value={comment[r.isbn] ?? r.comment ?? ""}
                        onChange={(e) =>
                          setComment((c) => ({
                            ...c,
                            [r.isbn]: e.target.value,
                          }))
                        }
                        multiline
                        rows={2}
                        sx={{ mt: 1, width: "100%" }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <ModeCommentRounded fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </CardContent>

                    {/* Ação: guardar / atualizar avaliação */}
                    <CardActions sx={{ p: 1.25, pt: 1 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={
                          hasExisting ? <UpdateRounded /> : <SaveRounded />
                        }
                        disabled={isBusy || !(stars[r.isbn] ?? r.stars ?? 0)}
                        onClick={async () => {
                          try {
                            setBusy(r.isbn);

                            const starsToSend = stars[r.isbn] ?? r.stars ?? 0;
                            const commentToSend =
                              (comment[r.isbn] ?? r.comment ?? "").trim() ||
                              undefined;

                            await submitRating(
                              {
                                isbn: r.isbn,
                                stars: starsToSend,
                                comment: commentToSend,
                              },
                              { childId, familyId: familyIdForAuth } // header x-user-id
                            );

                            setToast({
                              msg: hasExisting
                                ? "Avaliação atualizada!"
                                : "Avaliação guardada!",
                              type: "success",
                            });

                            // Recarrega dados para refletir estado no servidor
                            await load();
                          } catch (e) {
                            console.error(e);
                            setToast({
                              msg: "Falha ao guardar avaliação.",
                              type: "error",
                            });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {isBusy
                          ? "A guardar…"
                          : hasExisting
                          ? "Atualizar avaliação"
                          : "Guardar avaliação"}
                      </Button>
                    </CardActions>
                  </Card>
                );
              })}
            </Stack>

            {/* Paginação */}
            <Paginator
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              showFirstButton
              showLastButton
              muiProps={{ sx: { mt: 2 } }}
            />
          </>
        )}
      </WhiteCard>

      {/* Toast global */}
      {toast && (
        <Snackbar
          open
          autoHideDuration={2500}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={() => setToast(null)} severity={toast.type}>
            {toast.msg}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
}

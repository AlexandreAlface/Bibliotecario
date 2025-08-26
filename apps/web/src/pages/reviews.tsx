// apps/web/src/pages/reviews.tsx
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
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { WhiteCard, AvatarSelect, FilterBar, type FilterDefinition, Paginator } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { listPendingRatings, submitRating } from "../services/readings";

type Row = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  stars: number | null;          // estrelas do utilizador (se existir)
  comment?: string | null;       // comentário do utilizador (se existir)
  ratedAt?: string | null;       // data da avaliação (se existir)
};

export default function ReviewsPage() {
  const { user, asChild, selectedChildId, setSelectedChildId } = useUserSession();

  // Em modo criança usa actingChild; em família, obriga a escolher
  const childId = asChild
    ? Number((user?.actingChild?.id as any) ?? (selectedChildId as any))
    : selectedChildId
    ? Number(selectedChildId)
    : undefined;

  const familyId = asChild ? undefined : Number(user?.id);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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
  const [filters, setFilters] = useState<Record<string, string[]>>({ rating: [] });

  const finished = useMemo(() => rows.filter((r) => r.status === "finished"), [rows]);
  const filtered = useMemo(() => {
    const sel = filters.rating || [];
    if (sel.length === 0 || sel.length === 2) return finished;
    const wantRated = sel.includes("rated");
    return finished.filter((r) => (wantRated ? typeof r.stars === "number" : typeof r.stars !== "number"));
  }, [finished, filters]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  useEffect(() => setPage(1), [JSON.stringify(filters), finished.length]);

  async function load() {
    if (!childId && !familyId) return;
    const data = await listPendingRatings({ childId, familyId, limit: 200 });
    // só guardamos terminados
    const onlyFinished = (data as any[]).filter((r) => r.status === "finished") as Row[];

    // preseed de estrelas/comentário com o que já existe
    const seedStars: Record<string, number> = {};
    const seedComment: Record<string, string> = {};
    for (const r of onlyFinished) {
      if (typeof r.stars === "number") seedStars[r.isbn] = r.stars;
      if (r.comment) seedComment[r.isbn] = r.comment;
    }
    setStars(seedStars);
    setComment(seedComment);
    setRows(onlyFinished);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId]);

  const childOptions =
    (user?.children || []).map((c: any) => ({
      id: String(c.id),
      nome: c.name,
      avatar: c.avatarUrl || undefined,
    })) ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Contexto em modo família */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
            <Typography fontWeight={900}>A atuar como</Typography>
            <AvatarSelect
              label="Escolher criança"
              options={childOptions}
              value={selectedChildId}
              onChange={(id) => setSelectedChildId(id)}
              minWidth={280}
            />
          </Stack>
        </WhiteCard>
      )}

      <WhiteCard>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h4" fontWeight={900}>Avaliar Leituras</Typography>
          <IconButton onClick={load} title="Atualizar"><RefreshRounded /></IconButton>
        </Stack>

        {/* filtros */}
        <FilterBar
          filters={FINISHED_FILTERS}
          selected={filters}
          onChange={(id, values) => setFilters((s) => ({ ...s, [id]: values }))}
          icons={{ rating: <StarRounded fontSize="small" /> }}
          chipIcons={{ rating: <StarRounded fontSize="small" /> }}
        />

        <Divider sx={{ mb: 2 }} />

        {pageItems.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            {childId || familyId
              ? "Sem resultados para os filtros aplicados."
              : "Escolhe a criança para ver leituras terminadas."}
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {pageItems.map((r) => {
                const currentStars = stars[r.isbn] ?? r.stars ?? 0;
                const hasExisting = typeof r.stars === "number" && r.stars > 0;

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
                        if (!e.currentTarget.src.includes("placeholder-book.jpg")) {
                          e.currentTarget.src = "/placeholder-book.jpg";
                        }
                      }}
                    />
                    <CardContent>
                      <Typography fontWeight={900} noWrap title={r.title}>
                        {r.title}
                      </Typography>

                      {/* Data da avaliação, se houver */}
                      {r.ratedAt && (
                        <Typography variant="caption" sx={{ opacity: 0.65, display: "block", mb: 0.5 }}>
                          Avaliado em {new Date(r.ratedAt).toLocaleDateString("pt-PT")}
                        </Typography>
                      )}

                      {/* rating + comentário (pré-preenchidos) */}
                      <Rating
                        value={currentStars}
                        onChange={(_, v) => setStars((s) => ({ ...s, [r.isbn]: v || 0 }))}
                        sx={{ mt: 0.5 }}
                      />
                      <TextField
                        size="small"
                        placeholder="Comentário (opcional)"
                        value={comment[r.isbn] ?? r.comment ?? ""}
                        onChange={(e) =>
                          setComment((c) => ({ ...c, [r.isbn]: e.target.value }))
                        }
                        multiline
                        rows={2}
                        sx={{ mt: 1, width: "100%" }}
                      />
                    </CardContent>
                    <CardActions>
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={!!busy || !(stars[r.isbn] ?? r.stars ?? 0)}
                        onClick={async () => {
                          try {
                            setBusy(r.isbn);
                            const starsToSend = stars[r.isbn] ?? r.stars ?? 0;
                            const commentToSend = (comment[r.isbn] ?? r.comment ?? "").trim() || undefined;

                            await submitRating(
                              { isbn: r.isbn, stars: starsToSend, comment: commentToSend },
                              { childId, familyId }
                            );
                            setToast({ msg: hasExisting ? "Avaliação atualizada!" : "Avaliação guardada!", type: "success" });
                            await load(); // volta já com comment/ratedAt
                          } catch (e) {
                            console.error(e);
                            setToast({ msg: "Falha ao guardar avaliação.", type: "error" });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {hasExisting ? "Atualizar avaliação" : "Guardar avaliação"}
                      </Button>
                    </CardActions>
                  </Card>
                );
              })}
            </Stack>

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

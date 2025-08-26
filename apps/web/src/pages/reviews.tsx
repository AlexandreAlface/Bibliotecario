// apps/web/src/pages/reviews.tsx
import { useEffect, useState, useMemo } from "react";
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
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { WhiteCard, AvatarSelect } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { listPendingRatings, submitRating } from "../services/readings";

type Row = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  stars: number | null;
};

export default function ReviewsPage() {
  const { user, asChild, selectedChildId, setSelectedChildId } = useUserSession();

  // Em modo criança usa actingChild; em família, obriga a escolher
  const childId = asChild
    ? Number((user?.actingChild?.id as any) ?? (selectedChildId as any))
    : (selectedChildId ? Number(selectedChildId) : undefined);

  const familyId = asChild ? undefined : Number(user?.id);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const finished = useMemo(() => rows.filter((r) => r.status === "finished"), [rows]);

  async function load() {
    if (!childId && !familyId) return;
    const data = await listPendingRatings({ childId, familyId, limit: 80 });
    setRows(data);
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4" fontWeight={900}>
            Avaliar Leituras
          </Typography>
          <IconButton onClick={load} title="Atualizar">
            <RefreshRounded />
          </IconButton>
        </Stack>

        {finished.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            {childId || familyId
              ? "Ainda não há leituras terminadas para avaliar."
              : "Escolhe a criança para ver leituras terminadas."}
          </Typography>
        ) : (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {finished.map((r) => (
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

                  {/* Controlo de rating + comentário */}
                  <Rating
                    value={stars[r.isbn] ?? r.stars ?? 0}
                    onChange={(_, v) => setStars((s) => ({ ...s, [r.isbn]: v || 0 }))}
                    sx={{ mt: 0.5 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Comentário (opcional)"
                    value={comment[r.isbn] ?? ""}
                    onChange={(e) => setComment((c) => ({ ...c, [r.isbn]: e.target.value }))}
                    multiline
                    rows={2}
                    sx={{ mt: 1, width: "100%" }}
                  />
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!!busy || !stars[r.isbn]}
                    onClick={async () => {
                      try {
                        setBusy(r.isbn);
                        await submitRating(
                          { isbn: r.isbn, stars: stars[r.isbn], comment: comment[r.isbn] },
                          { childId, familyId }
                        );
                        setToast({ msg: "Avaliação guardada!", type: "success" });
                        await load(); // atualiza lista (pode desaparecer se já avaliado)
                      } catch (e) {
                        console.error(e);
                        setToast({ msg: "Falha ao guardar avaliação.", type: "error" });
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Guardar avaliação
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
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

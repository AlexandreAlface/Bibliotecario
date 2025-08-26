// apps/web/src/pages/readings.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import Rating from "@mui/material/Rating";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { WhiteCard, AvatarSelect } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  getLeiturasAtuais,
  listPendingRatings,
  startReading,
  finishReading,
} from "@/services/readings";

type PendingRow = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  stars: number | null;
};

type HistoryRow = {
  id: number;
  title: string;
  coverUrl?: string | null;
  date?: string;                // ISO string (finishedAt || startedAt)
  childId?: number;
  childName?: string;
  // opcional: se a API devolver avaliação do próprio child
  stars?: number;
  comment?: string | null;
};

export default function ReadingsPage() {
  const { user, asChild, selectedChildId, setSelectedChildId } =
    useUserSession();

  // childId efetivo (em modo criança usa actingChild; em família, obriga a escolher)
  const childId = asChild
    ? Number((user?.actingChild?.id as any) ?? (selectedChildId as any))
    : selectedChildId
    ? Number(selectedChildId)
    : undefined;

  const familyId = asChild ? undefined : Number(user?.id);

  const [pending, setPending] = useState<PendingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const mustPickChild = !asChild && !childId;

  const childOptions =
    (user?.children || []).map((c: any) => ({
      id: String(c.id),
      nome: c.name,
      avatar: c.avatarUrl || undefined,
    })) ?? [];

  async function loadAll() {
    if (!childId && !familyId) return;

    const [pRows, hRaw] = await Promise.all([
      listPendingRatings({ childId, familyId, limit: 40 }),
      getLeiturasAtuais(12, { childId, familyId }),
    ]);

    setPending(
      pRows.filter((r) => r.status === "reserved" || r.status === "reading")
    );

    // normaliza histórico (garante types e remove nulls)
    const hRows: HistoryRow[] = hRaw.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      coverUrl: r.coverUrl ?? undefined,
      date: r.date || undefined,
      childId: r.childId,
      childName: r.childName ?? undefined,
      stars:
        typeof r.stars === "number"
          ? r.stars
          : typeof r.userStars === "number"
          ? r.userStars
          : undefined,
      comment: r.comment ?? r.userComment ?? undefined,
    }));
    setHistory(hRows);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId]);

  const headerRight = useMemo(
    () => (
      <IconButton onClick={loadAll} title="Atualizar" disabled={mustPickChild}>
        <RefreshRounded />
      </IconButton>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childId, familyId, mustPickChild]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Contexto em modo família */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
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

      {/* Reservas & leituras em curso */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h4" fontWeight={900}>
            Leituras em Curso
          </Typography>
          {headerRight}
        </Stack>

        {mustPickChild ? (
          <Typography sx={{ opacity: 0.75 }}>
            Escolhe a criança para veres reservas e leituras em curso.
          </Typography>
        ) : pending.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            Não há reservas por iniciar nem leituras por terminar.
          </Typography>
        ) : (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {pending.map((r) => (
              <Card key={r.isbn} sx={{ width: 260 }}>
                <img
                  src={r.coverUrl || "/placeholder-book.jpg"}
                  alt={r.title}
                  onError={(e: any) => {
                    if (!e.currentTarget.src.includes("placeholder-book.jpg")) {
                      e.currentTarget.src = "/placeholder-book.jpg";
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 320,
                    objectFit: "cover",
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
                <CardContent>
                  <Typography fontWeight={900} noWrap title={r.title}>
                    {r.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.75, display: "block", mt: 0.5 }}
                  >
                    {r.status === "reserved" ? "Reservado" : "A ler"}
                  </Typography>
                </CardContent>
                <CardActions>
                  {r.status === "reserved" ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={async () => {
                        try {
                          setBusy(r.isbn);
                          await startReading(r.isbn, { childId, familyId });
                          await loadAll();
                          setToast({
                            msg: "Leitura iniciada.",
                            type: "success",
                          });
                        } catch (e) {
                          console.error(e);
                          setToast({
                            msg: "Não foi possível iniciar.",
                            type: "error",
                          });
                        } finally {
                          setBusy(null);
                        }
                      }}
                      disabled={!!busy}
                    >
                      Começar
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        try {
                          setBusy(r.isbn);
                          await finishReading(r.isbn, { childId, familyId });
                          await loadAll();
                          setToast({
                            msg: "Leitura terminada.",
                            type: "success",
                          });
                        } catch (e) {
                          console.error(e);
                          setToast({
                            msg: "Não foi possível terminar.",
                            type: "error",
                          });
                        } finally {
                          setBusy(null);
                        }
                      }}
                      disabled={!!busy}
                    >
                      Terminar
                    </Button>
                  )}
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </WhiteCard>

      {/* Histórico */}
      <WhiteCard>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
          Histórico de leituras
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {history.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            {childId || familyId
              ? "Ainda não existem leituras registadas."
              : "Escolhe uma criança para ver o histórico."}
          </Typography>
        ) : (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {history.map((row) => (
              <Card key={row.id} sx={{ width: 220 }}>
                <img
                  src={row.coverUrl || "/placeholder-book.jpg"}
                  alt={row.title}
                  onError={(e: any) => {
                    if (!e.currentTarget.src.includes("placeholder-book.jpg")) {
                      e.currentTarget.src = "/placeholder-book.jpg";
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 280,
                    objectFit: "cover",
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
                <CardContent>
                  <Typography fontWeight={900} noWrap title={row.title}>
                    {row.title}
                  </Typography>

                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {row.date
                      ? new Date(row.date).toLocaleDateString("pt-PT")
                      : row.childName ?? ""}
                  </Typography>

                  {/* ⭐ rating do child, se existir */}
                  {typeof row.stars === "number" && (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{ mt: 0.5 }}
                    >
                      <Rating value={row.stars} readOnly size="small" />
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {row.stars}/5
                      </Typography>
                    </Stack>
                  )}

                  {row.comment && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, display: "block", opacity: 0.85 }}
                    >
                      “{row.comment}”
                    </Typography>
                  )}
                </CardContent>
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

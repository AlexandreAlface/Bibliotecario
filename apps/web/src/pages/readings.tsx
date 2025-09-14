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
import TuneRounded from "@mui/icons-material/TuneRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";
import {
  WhiteCard,
  AvatarSelect,
  FilterBar,
  type FilterDefinition,
  Paginator,
} from "@bibliotecario/ui-web";
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
  date?: string; // ISO (finishedAt || startedAt)
  childId?: number;
  childName?: string;
  stars?: number;
  comment?: string | null;
};

export default function ReadingsPage() {
  const { user, asChild } = useUserSession();

  // 🎯 Em modo família, usamos um filtro LOCAL de criança (não altera active user)
  const [localChildId, setLocalChildId] = useState<string>("");

  // ID efetivo para chamadas: actingChild em modo criança; localChildId em família
  const childId = asChild
    ? Number((user?.actingChild?.id as any))
    : localChildId
    ? Number(localChildId)
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
      nome: c.name ?? "Criança",
      avatar: (c as any).avatarUrl || undefined,
    })) ?? [];

  // ---------- Filtros + paginação (PENDING) ----------
  const PENDING_FILTERS: FilterDefinition[] = [
    {
      id: "status",
      label: "Estado",
      options: [
        { value: "reserved", label: "Reservado" },
        { value: "reading", label: "A ler" },
      ],
    },
  ];
  const [pendingFilters, setPendingFilters] = useState<
    Record<string, string[]>
  >({
    status: [], // vazio = todos
  });
  const pendingIcons = { status: <AutoStoriesRounded fontSize="small" /> };
  const [pendingPage, setPendingPage] = useState(1);
  const PENDING_PAGE_SIZE = 12;

  const filteredPending = useMemo(() => {
    const sel = pendingFilters.status || [];
    if (sel.length === 0 || sel.length === 2) return pending;
    return pending.filter((p) => sel.includes(p.status));
  }, [pending, pendingFilters]);

  const pendingTotalPages = Math.max(
    1,
    Math.ceil(filteredPending.length / PENDING_PAGE_SIZE)
  );
  const pendingPageItems = useMemo(() => {
    const start = (pendingPage - 1) * PENDING_PAGE_SIZE;
    return filteredPending.slice(start, start + PENDING_PAGE_SIZE);
  }, [filteredPending, pendingPage]);

  useEffect(() => {
    setPendingPage(1);
  }, [JSON.stringify(pendingFilters), pending.length]);

  // ---------- Filtros + paginação (HISTORY) ----------
  const HISTORY_FILTERS: FilterDefinition[] = [
    {
      id: "rating",
      label: "Avaliação",
      options: [
        { value: "rated", label: "Com avaliação" },
        { value: "unrated", label: "Sem avaliação" },
      ],
    },
  ];
  const [historyFilters, setHistoryFilters] = useState<
    Record<string, string[]>
  >({
    rating: [],
  });
  const historyIcons = { rating: <StarRounded fontSize="small" /> };
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 12;

  const filteredHistory = useMemo(() => {
    const ratingSel = historyFilters.rating || [];
    return history.filter((h) => {
      if (ratingSel.length === 0 || ratingSel.length === 2) return true;
      const isRated = typeof h.stars === "number";
      return ratingSel.includes("rated") ? isRated : !isRated;
    });
  }, [history, historyFilters]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE)
  );

  const historyPageItems = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return filteredHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredHistory, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [JSON.stringify(historyFilters), history.length]);

  // ---------- Carregamento ----------
  async function loadAll() {
    if (!childId && !familyId) return;

    const [pRows, hRaw] = await Promise.all([
      listPendingRatings({ childId, familyId, limit: 80 }),
      getLeiturasAtuais(200, { childId, familyId }),
    ]);

    setPending(
      pRows.filter((r) => r.status === "reserved" || r.status === "reading")
    );

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
      {/* Contexto em modo família (seletor LOCAL; não muda active user) */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Typography fontWeight={900}>Filtrar por criança</Typography>
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

      {/* --------- LEITURAS EM CURSO --------- */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="h4" fontWeight={900}>
            Leituras em Curso
          </Typography>
          {headerRight}
        </Stack>

        {/* Filtros de "em curso" */}
        <FilterBar
          filters={PENDING_FILTERS}
          selected={pendingFilters}
          onChange={(id, values) =>
            setPendingFilters((s) => ({ ...s, [id]: values }))
          }
          icons={pendingIcons}
          chipIcons={pendingIcons}
        />

        <Divider sx={{ mb: 2 }} />

        {mustPickChild ? (
          <Typography sx={{ opacity: 0.75 }}>
            Escolhe a criança para veres reservas e leituras em curso.
          </Typography>
        ) : pendingPageItems.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            Não há reservas por iniciar nem leituras por terminar.
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {pendingPageItems.map((r) => (
                <Card key={r.isbn} sx={{ width: 260 }}>
                  <img
                    src={r.coverUrl || "/placeholder-book.jpg"}
                    alt={r.title}
                    onError={(e: any) => {
                      if (
                        !e.currentTarget.src.includes("placeholder-book.jpg")
                      ) {
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

            <Paginator
              count={pendingTotalPages}
              page={pendingPage}
              onChange={(_, p) => setPendingPage(p)}
              showFirstButton
              showLastButton
              muiProps={{ sx: { mt: 2 } }}
            />
          </>
        )}
      </WhiteCard>

      {/* --------- HISTÓRICO --------- */}
      <WhiteCard>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="h5" fontWeight={900}>
            Histórico de leituras
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ opacity: 0.9 }}
          >
            <TuneRounded fontSize="small" />
            <Typography variant="body2">Filtros</Typography>
          </Stack>
        </Stack>

        <FilterBar
          filters={HISTORY_FILTERS}
          selected={historyFilters}
          onChange={(id, values) =>
            setHistoryFilters((s) => ({ ...s, [id]: values }))
          }
          icons={historyIcons}
          chipIcons={historyIcons}
        />

        <Divider sx={{ mb: 2 }} />

        {historyPageItems.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            {childId || familyId
              ? "Sem resultados para os filtros aplicados."
              : "Escolhe uma criança para ver o histórico."}
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {historyPageItems.map((row) => (
                <Card key={row.id} sx={{ width: 220 }}>
                  <img
                    src={row.coverUrl || "/placeholder-book.jpg"}
                    alt={row.title}
                    onError={(e: any) => {
                      if (
                        !e.currentTarget.src.includes("placeholder-book.jpg")
                      ) {
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

            <Paginator
              count={historyTotalPages}
              page={historyPage}
              onChange={(_, p) => setHistoryPage(p)}
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

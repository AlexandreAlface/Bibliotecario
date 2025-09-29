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
  Snackbar,
  Alert,
  DialogContent,
  Dialog,
  Chip,
  DialogTitle,
  Box,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
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
import {
  ArticleOutlined,
  BookmarkRounded,
  CalendarMonthRounded,
  CategoryRounded,
  InfoRounded,
  MenuBookRounded,
  PersonOutlineRounded,
  SpeedRounded,
} from "@mui/icons-material";
import { getBookByIsbn } from "@/services/books";

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
  isbn?: string;
  coverUrl?: string | null;
  date?: string; // ISO (finishedAt || startedAt)
  childId?: number;
  childName?: string;
  stars?: number;
  comment?: string | null;
};

function BookDetailsDialog({
  open,
  book,
  onClose,
}: {
  open: boolean;
  book: (import("@/services/books").BookDetails & { score?: number }) | null;
  onClose: () => void;
}) {
  if (!book) return null;

  const authors = Array.isArray(book.authors)
    ? book.authors
    : typeof book.authors === "string"
    ? [book.authors]
    : [];
  const categoriesRaw =
    (Array.isArray(book.categories) && book.categories) ||
    (Array.isArray(book.genres) && book.genres) ||
    (typeof book.categories === "string" ? [book.categories] : []) ||
    (typeof book.genres === "string" ? [book.genres] : []);
  const categories = (categoriesRaw || []).slice(0, 12);

  const hasSummary = !!(book.summary && String(book.summary).trim());
  const cover = book.coverUrl || "/placeholder-book.jpg";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}
      >
        <MenuBookRounded fontSize="small" />
        {book.title}
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={2}>
          <Box
            component="img"
            src={cover}
            alt={book.title}
            onError={(e: any) => {
              if (!e.currentTarget.src.includes("placeholder-book.jpg"))
                e.currentTarget.src = "/placeholder-book.jpg";
            }}
            sx={{
              width: { xs: 160, sm: 200 },
              height: { xs: 230, sm: 300 },
              objectFit: "cover",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          />
          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            {typeof (book as any).score === "number" && (
              <Chip
                size="small"
                icon={<SpeedRounded fontSize="small" />}
                label={`score ${(book as any).score.toFixed(3)}`}
                sx={{ width: "fit-content" }}
              />
            )}

            {authors.length > 0 && (
              <Typography
                sx={{
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <PersonOutlineRounded fontSize="small" /> <b>Autor(es):</b>
                &nbsp;{authors.join(", ")}
              </Typography>
            )}

            {categories.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
              >
                <CategoryRounded fontSize="small" />
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {categories.map((c, i) => (
                    <Chip key={i} size="small" label={String(c)} />
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>

        {hasSummary ? (
          <Typography sx={{ mt: 2, whiteSpace: "pre-line" }}>
            {book.summary}
          </Typography>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            gap={1}
            sx={{ mt: 2, opacity: 0.8 }}
          >
            <ArticleOutlined />
            <Typography>Sem resumo disponível.</Typography>
          </Stack>
        )}

        <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default function ReadingsPage() {
  const { user, asChild } = useUserSession();

  // 🎯 Em modo família, usamos um filtro LOCAL de criança (não altera active user)
  const [localChildId, setLocalChildId] = useState<string>("");

  // ID efetivo para chamadas: actingChild em modo criança; localChildId em família
  const childId = asChild
    ? Number(user?.actingChild?.id as any)
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

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBook, setDetailBook] = useState<
    import("@/services/books").BookDetails | null
  >(null);
  const [detailLoadingIsbn, setDetailLoadingIsbn] = useState<string | null>(
    null
  );

  async function openDetailsByIsbn(
    isbn?: string,
    fallbackTitle?: string,
    fallbackCover?: string | null
  ) {
    if (!isbn) return;

    // 1) semear logo com o novo ISBN (evita ver o anterior por 1 frame)
    setDetailBook({
      isbn,
      title: fallbackTitle || "Livro",
      coverUrl: fallbackCover ?? null,
      summary: null,
    });
    setDetailOpen(true);
    setDetailLoadingIsbn(isbn);

    // 2) depois vai buscar o detalhe e atualiza
    try {
      const b = await getBookByIsbn(isbn);
      setDetailBook({
        isbn,
        title: b.title || fallbackTitle || "Livro",
        coverUrl: b.coverUrl ?? fallbackCover ?? null,
        summary: b.summary ?? null,
        authors: b.authors ?? null,
        categories: (b as any).categories ?? (b as any).genres ?? null,
      });
    } catch {
      /* silencioso: fica com o fallback */
    } finally {
      setDetailLoadingIsbn(null);
    }
  }

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
    // 🚫 Em modo família, obriga a escolher criança primeiro
    if (!asChild && !childId) return;

    // Em modo criança, precisa de childId válido
    if (asChild && !childId) return;

    const [pRows, hRaw] = await Promise.all([
      listPendingRatings({ childId, familyId, limit: 80 }),
      getLeiturasAtuais(200, { childId, familyId }),
    ]);

    setPending(
      pRows.filter((r) => r.status === "reserved" || r.status === "reading")
    );

    const hRows: HistoryRow[] = hRaw.map((r: any) => ({
      id: Number(r.id),
      isbn: r.isbn, // NEW
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
  }, [childId, familyId, asChild]);

  const headerRight = useMemo(
    () => (
      <IconButton onClick={loadAll} title="Atualizar" disabled={mustPickChild}>
        <RefreshRounded />
      </IconButton>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childId, familyId, mustPickChild]
  );

  /* ===================== GATE: MODO FAMÍLIA → OBRIGA ESCOLHER CRIANÇA ===================== */
  if (mustPickChild) {
    return (
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <WhiteCard>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
            Leituras
          </Typography>
          <Typography sx={{ opacity: 0.8, mb: 2 }}>
            Escolhe primeiro a criança para veres reservas, leituras em curso e
            histórico — e poderes iniciar/terminar leituras.
          </Typography>
          <AvatarSelect
            label="Escolher criança"
            options={childOptions}
            value={localChildId || undefined}
            onChange={(id) => setLocalChildId(id ?? "")}
            minWidth={280}
          />
        </WhiteCard>
      </Container>
    );
  }

  /* ===================== CONTEÚDO PRINCIPAL (após escolher criança / modo criança) ===================== */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
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
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <AutoStoriesRounded />
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

        {pendingPageItems.length === 0 ? (
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
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      openDetailsByIsbn(r.isbn, r.title, r.coverUrl ?? null)
                    }
                  />
                  <CardContent>
                    <Typography fontWeight={900} noWrap title={r.title}>
                      {r.title}
                    </Typography>

                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip
                        size="small"
                        icon={
                          r.status === "reserved" ? (
                            <BookmarkRounded fontSize="small" />
                          ) : (
                            <AutoStoriesRounded fontSize="small" />
                          )
                        }
                        label={r.status === "reserved" ? "Reservado" : "A ler"}
                        variant={
                          r.status === "reserved" ? "outlined" : "filled"
                        }
                      />
                      {typeof r.stars === "number" && (
                        <Chip
                          size="small"
                          icon={<StarRounded fontSize="small" />}
                          label={`${r.stars}/5`}
                          variant="outlined"
                        />
                      )}
                    </Stack>
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

                    <LoadingButton
                      size="small"
                      startIcon={<InfoRounded />}
                      loading={detailLoadingIsbn === r.isbn}
                      loadingPosition="start"
                      onClick={() =>
                        openDetailsByIsbn(r.isbn, r.title, r.coverUrl ?? null)
                      }
                    >
                      Ver mais
                    </LoadingButton>
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
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <CalendarMonthRounded />
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

        {historyPageItems.length === 0 ? (
          <Typography sx={{ opacity: 0.75 }}>
            Sem resultados para os filtros aplicados.
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
                      cursor: row.isbn ? "pointer" : "default",
                    }}
                    onClick={() =>
                      row.isbn &&
                      openDetailsByIsbn(
                        row.isbn,
                        row.title,
                        row.coverUrl ?? null
                      )
                    }
                  />
                  <CardContent>
                    <Typography fontWeight={900} noWrap title={row.title}>
                      {row.title}
                    </Typography>

                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      {row.date && (
                        <Chip
                          size="small"
                          icon={<CalendarMonthRounded fontSize="small" />}
                          label={new Date(row.date).toLocaleDateString("pt-PT")}
                        />
                      )}
                      {typeof row.stars === "number" && (
                        <Chip
                          size="small"
                          icon={<StarRounded fontSize="small" />}
                          label={`${row.stars}/5`}
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {row.comment && (
                      <Typography
                        variant="caption"
                        sx={{ mt: 0.5, display: "block", opacity: 0.85 }}
                      >
                        “{row.comment}”
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <LoadingButton
                      size="small"
                      startIcon={<InfoRounded />}
                      loading={detailLoadingIsbn === row.isbn}
                      loadingPosition="start"
                      onClick={() =>
                        row.isbn &&
                        openDetailsByIsbn(
                          row.isbn,
                          row.title,
                          row.coverUrl ?? null
                        )
                      }
                      disabled={!row.isbn}
                    >
                      Ver mais
                    </LoadingButton>
                  </CardActions>
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

      <BookDetailsDialog
        key={detailBook?.isbn || "empty"}
        open={detailOpen}
        book={detailBook}
        onClose={() => {
          setDetailOpen(false);
          setDetailBook(null);
        }}
      />
    </Container>
  );
}

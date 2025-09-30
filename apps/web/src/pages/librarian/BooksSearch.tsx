import * as React from "react";
import {
  Box,
  Container,
  Stack,
  Typography,
  Divider,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Tooltip,
  IconButton,
  LinearProgress,
  DialogTitle,
  DialogContent,
  Dialog,
} from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import FilterAltRounded from "@mui/icons-material/FilterAltRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";

import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  type BookLite,
  searchBooks,
  getBookDetailLibrarian,
  type BookDetailLibrarian,
} from "@/services/books";

/* ---- Cartão simples (mesmo visual de sugestões, sem botão de reservar) ---- */
function BookCard({
  book,
  onOpen,
}: {
  book: BookLite;
  onOpen: (b: BookLite) => void;
}) {
  const cover = book.coverUrl || "/placeholder-book.jpg";
  return (
    <Box
      sx={{
        width: 280,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.5,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        component="img"
        src={cover}
        alt={book.title}
        onClick={() => onOpen(book)}
        onKeyDown={(e: any) => e.key === "Enter" && onOpen(book)}
        tabIndex={0}
        role="button"
        aria-label={`Abrir detalhes de ${book.title}`}
        onError={(e: any) => {
          if (!e.currentTarget.src.includes("placeholder-book.jpg"))
            e.currentTarget.src = "/placeholder-book.jpg";
        }}
        sx={{
          width: "100%",
          height: 280,
          objectFit: "cover",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          cursor: "pointer",
        }}
      />
      <Typography
        fontWeight={900}
        sx={{
          mt: 1,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 42,
        }}
        title={book.title}
      >
        {book.title}
      </Typography>

      {book.summary && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            opacity: 0.9,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 60,
          }}
          title={book.summary}
        >
          <ArticleOutlined
            fontSize="inherit"
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          {book.summary}
        </Typography>
      )}

      <Button
        size="small"
        variant="text"
        startIcon={<InfoRounded />}
        sx={{ mt: 1, alignSelf: "flex-start" }}
        onClick={() => onOpen(book)}
      >
        Ver mais
      </Button>
    </Box>
  );
}

/* ---- Dialog de detalhes (com holdings por biblioteca) ---- */
function BookDetailsDialogLibrarian({
  open,
  isbn,
  onClose,
}: {
  open: boolean;
  isbn: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<BookDetailLibrarian | null>(null);

  React.useEffect(() => {
    if (!open || !isbn) return;
    (async () => {
      setLoading(true);
      try {
        const d = await getBookDetailLibrarian(isbn);
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, isbn]);

  const cover = data?.coverUrl || "/placeholder-book.jpg";
  const authors = data?.authors ?? [];
  const cats = data?.categories ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}
      >
        <MenuBookRounded fontSize="small" />
        {data?.title || "Livro"}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}

        {data && (
          <>
            <Stack direction="row" spacing={2}>
              <Box
                component="img"
                src={cover}
                alt={data.title}
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
                {!!authors.length && (
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
                {!!cats.length && (
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                    alignItems="center"
                  >
                    <CategoryRounded fontSize="small" />
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {cats.slice(0, 10).map((c, i) => (
                        <Chip key={i} size="small" label={c} />
                      ))}
                    </Stack>
                  </Stack>
                )}
                <Typography sx={{ opacity: 0.8 }}>
                  {data.publicationYear
                    ? `Ano: ${data.publicationYear} • `
                    : ""}
                  {data.ageRange ? `Faixa etária: ${data.ageRange}` : ""}
                </Typography>
              </Stack>
            </Stack>

            {data.summary ? (
              <Typography sx={{ mt: 2, whiteSpace: "pre-line" }}>
                <ArticleOutlined
                  fontSize="small"
                  style={{ verticalAlign: "middle", marginRight: 6 }}
                />
                {data.summary}
              </Typography>
            ) : (
              <Typography sx={{ mt: 2, opacity: 0.7 }}>
                Sem resumo disponível.
              </Typography>
            )}

            {/* Holdings por biblioteca */}
            <Divider sx={{ my: 2 }} />
            <Typography
              fontWeight={900}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <LibraryBooksRounded fontSize="small" />
              Exemplares por biblioteca
            </Typography>
            {!(data.holdings && data.holdings.length) ? (
              <Typography sx={{ mt: 0.5, opacity: 0.7 }}>
                Sem registos.
              </Typography>
            ) : (
              <Box
                component="table"
                sx={{
                  mt: 1,
                  width: "100%",
                  borderCollapse: "collapse",
                  "& th, & td": {
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    p: 1,
                  },
                  "& th": { textAlign: "left", fontWeight: 800, opacity: 0.8 },
                }}
              >
                <thead>
                  <tr>
                    <th>Biblioteca</th>
                    <th>Quantidade</th>
                    <th>Prateleira</th>
                    <th>Nº de registo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((h, i) => (
                    <tr key={i}>
                      <td>{h.libraryName}</td>
                      <td>{h.quantity ?? "—"}</td>
                      <td>{h.shelfCode ?? "—"}</td>
                      <td>{h.accessionNo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---- Página ---- */
export default function LibrarianBooksSearch() {
  const { user } = useUserSession();

  // bibliotecas do bibliotecário (se vierem no user)
  const myLibraries =
    (user as any)?.userLibraries?.map?.((ul: any) => ({
      id: Number(ul.libraryId ?? ul.library?.id),
      name: ul.library?.name ?? `Biblioteca ${ul.libraryId}`,
    })) ?? [];

  // biblioteca “default” do bibliotecário:
  // - se tiver exatamente uma, usa essa
  // - se tiver várias ou nenhuma, não filtra por biblioteca (procura global)
  const defaultLibraryId: number | undefined = React.useMemo(() => {
    if (!myLibraries.length) return undefined;
    if (myLibraries.length === 1) return myLibraries[0].id;
    return undefined;
  }, [myLibraries]);

  // filtros
  const [q, setQ] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [yearFrom, setYearFrom] = React.useState<number | "">("");
  const [yearTo, setYearTo] = React.useState<number | "">("");
  const [ageMin, setAgeMin] = React.useState<number | "">("");
  const [ageMax, setAgeMax] = React.useState<number | "">("");

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);

  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<BookLite[]>([]);
  const [total, setTotal] = React.useState(0);

  const doSearch = React.useCallback(
    async (goToPage?: number) => {
      setLoading(true);
      try {
        const { items, total } = await searchBooks({
          q: q || undefined,
          author: author || undefined,
          category: category || undefined,
          yearFrom: yearFrom === "" ? undefined : Number(yearFrom),
          yearTo: yearTo === "" ? undefined : Number(yearTo),
          ageMin: ageMin === "" ? undefined : Number(ageMin),
          ageMax: ageMax === "" ? undefined : Number(ageMax),
          libraryId: defaultLibraryId, // usa a lib do bibliotecário (ou global)
          page: goToPage ?? page,
          perPage,
        });
        setItems(items);
        setTotal(total);
        if (goToPage) setPage(goToPage);
      } finally {
        setLoading(false);
      }
    },
    [
      q,
      author,
      category,
      yearFrom,
      yearTo,
      ageMin,
      ageMax,
      defaultLibraryId,
      page,
      perPage,
    ]
  );

  // primeira carga + quando a biblioteca default muda
  React.useEffect(() => {
    doSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLibraryId]);

  // paginação e "por página" (sem debounce)
  React.useEffect(() => {
    doSearch(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  // 🔎 AUTOSEARCH com debounce quando qualquer filtro muda (excepto paginação)
  React.useEffect(() => {
    const DEBOUNCE_MS = 400;
    const t = setTimeout(() => {
      // sempre que mudam filtros, volta à página 1
      doSearch(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, author, category, yearFrom, yearTo, ageMin, ageMax]);

  // detalhes
  const [openIsbn, setOpenIsbn] = React.useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <WhiteCard>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <LibraryBooksRounded />
              Pesquisar livros
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <span>
                <IconButton onClick={() => doSearch()}>
                  <RefreshRounded />
                </IconButton>
              </span>
            </Tooltip>
            {/* Botão fica como “forçar refresh”, mas já não é necessário */}
            {/* <Button
              variant="contained"
              startIcon={<SearchRounded />}
              onClick={() => doSearch(1)}
            >
              Pesquisar
            </Button> */}
          </Stack>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Filtros */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 1 }}
        >
          <TextField
            label="Pesquisa"
            placeholder="título, autor, resumo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <FilterAltRounded sx={{ mr: 1 }} /> }}
          />
          <TextField
            label="Autor"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            size="small"
          />
          <TextField
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
          />
          <TextField
            label="Ano de"
            value={yearFrom}
            onChange={(e) =>
              setYearFrom(e.target.value ? Number(e.target.value) : "")
            }
            size="small"
            type="number"
            sx={{ width: 120 }}
          />
          <TextField
            label="Ano até"
            value={yearTo}
            onChange={(e) =>
              setYearTo(e.target.value ? Number(e.target.value) : "")
            }
            size="small"
            type="number"
            sx={{ width: 120 }}
          />
          <TextField
            label="Idade min"
            value={ageMin}
            onChange={(e) =>
              setAgeMin(e.target.value ? Number(e.target.value) : "")
            }
            size="small"
            type="number"
            sx={{ width: 120 }}
          />
          <TextField
            label="Idade máx"
            value={ageMax}
            onChange={(e) =>
              setAgeMax(e.target.value ? Number(e.target.value) : "")
            }
            size="small"
            type="number"
            sx={{ width: 120 }}
          />

          {/* Biblioteca: removida do UI — usa-se automaticamente a do bibliotecário */}

          {/* Para evitar erro de tipo no Select, usamos strings como value */}
          <FormControl size="small" sx={{ minWidth: 140, ml: "auto" }}>
            <InputLabel id="per-page-label">Por página</InputLabel>
            <Select
              labelId="per-page-label"
              label="Por página"
              value={String(perPage)}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[8, 12, 16, 20, 24, 32, 48].map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 1 }} />}

        {/* Resultados */}
        {!loading && items.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
        ) : (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {items.map((b) => (
              <BookCard
                key={b.isbn}
                book={b}
                onOpen={(bk) => setOpenIsbn(bk.isbn)}
              />
            ))}
          </Stack>
        )}

        {/* Paginação */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2 }}
        >
          <Chip label={`${total} resultados`} />
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Stack>
      </WhiteCard>

      <BookDetailsDialogLibrarian
        open={!!openIsbn}
        isbn={openIsbn}
        onClose={() => setOpenIsbn(null)}
      />
    </Container>
  );
}

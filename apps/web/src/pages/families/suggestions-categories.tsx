// apps/web/src/pages/SuggestionsByCategoriesPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  PrimaryButton,
  RouteLink,
  AvatarSelect,
} from "@bibliotecario/ui-web";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Snackbar,
  Alert,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import SpeedRounded from "@mui/icons-material/SpeedRounded";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import BookmarkAddRounded from "@mui/icons-material/BookmarkAddRounded";
import BookmarkAddedRounded from "@mui/icons-material/BookmarkAddedRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import NightlightRounded from "@mui/icons-material/NightlightRounded";
import FreeBreakfastRounded from "@mui/icons-material/FreeBreakfastRounded";
import DirectionsCarRounded from "@mui/icons-material/DirectionsCarRounded";
import Diversity3Rounded from "@mui/icons-material/Diversity3Rounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import SubjectRounded from "@mui/icons-material/SubjectRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import PhotoLibraryRounded from "@mui/icons-material/PhotoLibraryRounded";
import CollectionsBookmarkRounded from "@mui/icons-material/CollectionsBookmarkRounded";
import ChildCareRounded from "@mui/icons-material/ChildCareRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SentimentSatisfiedRounded from "@mui/icons-material/SentimentSatisfiedRounded";
import VolunteerActivismRounded from "@mui/icons-material/VolunteerActivismRounded";
import TravelExploreRounded from "@mui/icons-material/TravelExploreRounded";

import { useUserSession } from "../../contexts/UserSession";
import {
  getSugestoesQuiz,
  type QuizAnswer,
  getSugestoesPerfil,
  type BookLite, // <- tem summary
} from "../../services/books";
import { reserveBook } from "@/services/reservation";

/* ------------ filtros ------------ */
type Filters = {
  ageRange?: string;
  genres: string[];
  format: string[];
  goals: string[];
  moment?: string;
};

const LS_KEY = "categoryFilters";

/* ------------ helpers ------------ */
function loadSavedFilters(): Filters {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { genres: [], format: [], goals: [] };
    const f = JSON.parse(raw);
    return {
      ageRange: f.ageRange,
      genres: Array.isArray(f.genres) ? f.genres : [],
      format: Array.isArray(f.format) ? f.format : [],
      goals: Array.isArray(f.goals) ? f.goals : [],
      moment: typeof f.moment === "string" ? f.moment : undefined,
    };
  } catch {
    return { genres: [], format: [], goals: [] };
  }
}
function saveFilters(f: Filters) {
  localStorage.setItem(LS_KEY, JSON.stringify(f));
}
function momentToMood(m?: string) {
  if (!m) return undefined;
  if (m === "antes-de-dormir") return "antes-de-dormir";
  return "tempo-livre";
}
function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ------------ Modal de detalhes ------------ */
function BookDetailsDialog({
  open,
  book,
  onClose,
  onReserve,
  reserving,
  reserved,
  disabled,
}: {
  open: boolean;
  book: BookLite | null;
  onClose: () => void;
  onReserve: (isbn: string) => void;
  reserving?: boolean;
  reserved?: boolean;
  disabled?: boolean;
}) {
  if (!book) return null;

  const cover = book.coverUrl || "/placeholder-book.jpg";
  const authors =
    (book as any)?.authors ||
    (book as any)?.author ||
    ((book as any)?.authorName ? [((book as any).authorName as string)] : []);
  const categories =
    (book as any)?.categories ||
    (book as any)?.genres ||
    (book as any)?.tags ||
    [];
  const hasSummary = !!(book.summary && String(book.summary).trim());

  const reserveIcon = reserved ? (
    <BookmarkAddedRounded />
  ) : reserving ? (
    <HourglassTopRounded />
  ) : (
    <BookmarkAddRounded />
  );

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
            {typeof book.score === "number" && (
              <Chip
                size="small"
                icon={<SpeedRounded fontSize="small" />}
                label={`score ${book.score.toFixed(3)}`}
                sx={{ width: "fit-content" }}
              />
            )}

            {Array.isArray(authors) && authors.length > 0 && (
              <Typography
                sx={{
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <PersonOutlineRounded fontSize="small" /> <b>Autor(es):</b>
                &nbsp;
                {authors.join(", ")}
              </Typography>
            )}

            {Array.isArray(categories) && categories.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
              >
                <CategoryRounded fontSize="small" />
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {categories.slice(0, 8).map((c: any, i: number) => (
                    <Chip key={i} size="small" label={String(c)} />
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>

        {hasSummary ? (
          <Typography sx={{ mt: 2, whiteSpace: "pre-line" }}>
            <ArticleOutlined
              fontSize="small"
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            {book.summary}
          </Typography>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            gap={1}
            sx={{ mt: 2, opacity: 0.85 }}
          >
            <ArticleOutlined />
            <Typography>Sem resumo disponível.</Typography>
          </Stack>
        )}

        <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={reserveIcon}
            onClick={() => onReserve(book.isbn)}
            disabled={!!reserving || !!reserved || !!disabled}
          >
            {reserved ? "Reservado" : reserving ? "A reservar..." : "Reservar"}
          </Button>
          <Button onClick={onClose} startIcon={<InfoRounded />}>
            Fechar
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/* ------------ cartão ------------ */
function SuggestionCard({
  book,
  onReserve,
  onOpenDetails,
  reserving,
  reserved,
  disabled,
}: {
  book: BookLite;
  onReserve: (isbn: string) => void;
  onOpenDetails: (book: BookLite) => void;
  reserving?: boolean;
  reserved?: boolean;
  disabled?: boolean;
}) {
  const cover = book.coverUrl || "/placeholder-book.jpg";
  const isBusy = !!reserving || !!reserved || !!disabled;

  const reserveIcon = reserved ? (
    <BookmarkAddedRounded />
  ) : reserving ? (
    <HourglassTopRounded />
  ) : (
    <BookmarkAddRounded />
  );

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
        onClick={() => onOpenDetails(book)}
        onKeyDown={(e: any) => e.key === "Enter" && onOpenDetails(book)}
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

      {typeof book.score === "number" && (
        <Chip
          size="small"
          icon={<SpeedRounded fontSize="small" />}
          label={`score ${book.score.toFixed(3)}`}
          sx={{ mt: 0.5, width: "fit-content" }}
        />
      )}

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

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          size="small"
          variant="contained"
          sx={{ borderRadius: 2 }}
          startIcon={reserveIcon}
          onClick={() => onReserve(book.isbn)}
          disabled={isBusy}
        >
          {reserved ? "Reservado" : reserving ? "A reservar..." : "Reservar"}
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<InfoRounded />}
          onClick={() => onOpenDetails(book)}
        >
          Ver mais
        </Button>
      </Stack>
    </Box>
  );
}

/* ------------ página ------------ */
export default function SuggestionsByCategoriesPage() {
  const { user, asChild } = useUserSession();

  // 🧭 Em modo família, a escolha da criança é LOCAL (não muda o utilizador ativo)
  const [localChildId, setLocalChildId] = useState<string>("");

  // Em modo criança usa a criança ativa; em modo família é OBRIGATÓRIO escolher (local)
  const childId = asChild
    ? Number((user?.actingChild?.id as any))
    : localChildId
    ? Number(localChildId)
    : undefined;
  const familyId = asChild ? undefined : (Number(user?.id) || undefined);

  const mustPickChild = !asChild && !childId;

  const [filters, setFilters] = useState<Filters>(() => loadSavedFilters());
  const [items, setItems] = useState<BookLite[] | null>(null);
  const [total, setTotal] = useState<number>(0);

  // paginação
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(12);

  // modo atual
  const [source, setSource] = useState<"perfil" | "quiz">("perfil");
  const [lastAnswers, setLastAnswers] = useState<QuizAnswer[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ⬇️ flags por ISBN
  const [busyByIsbn, setBusyByIsbn] = useState<Record<string, boolean>>({});
  const [reservedByIsbn, setReservedByIsbn] = useState<Record<string, boolean>>(
    {}
  );

  // modal de detalhes
  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<BookLite | null>(null);

  const subtitle = useMemo(
    () => "Escolhe categorias para afinar as sugestões",
    []
  );

  // opções para o AvatarSelect
  const childOptions =
    (user?.children || []).map((c: any) => ({
      id: String(c.id),
      nome: String(c.name ?? "Criança"),
      avatar: c.avatarUrl ?? undefined,
    })) ?? [];

  // Limpa resultados/estados quando troca a criança
  useEffect(() => {
    setItems(null);
    setBusyByIsbn({});
    setReservedByIsbn({});
    setPage(1);
  }, [childId]);

  // Carregar perfil (padrão) quando há criança válida
  useEffect(() => {
    if (mustPickChild) return;
    (async () => {
      setLoading(true);
      try {
        const { items, total } = await getSugestoesPerfil(perPage, {
          childId,
          familyId,
          page,
        });
        setItems(items);
        setTotal(total);
        setSource("perfil");
        setUpdatedAt(Date.now());
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId]);

  // Paginação: recarrega mantendo a origem (perfil/quiz)
  useEffect(() => {
    if (mustPickChild || !childId) return;
    (async () => {
      setLoading(true);
      try {
        if (source === "perfil") {
          const { items, total } = await getSugestoesPerfil(perPage, {
            childId,
            familyId,
            page,
          });
          setItems(items);
          setTotal(total);
        } else if (lastAnswers) {
          const { items, total } = await getSugestoesQuiz(lastAnswers, perPage, {
            childId,
            familyId,
            page,
          });
          setItems(items);
          setTotal(total);
        }
        setUpdatedAt(Date.now());
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  async function applyFilters() {
    if (mustPickChild) return;
    saveFilters(filters);

    const answers: QuizAnswer[] = [
      { id: "ageRange", value: filters.ageRange },
      { id: "genres", value: filters.genres },
      { id: "format", value: filters.format },
      { id: "mood", value: momentToMood(filters.moment) },
      { id: "goals", value: filters.goals },
    ];
    setLastAnswers(answers);
    setSource("quiz");
    setPage(1); // volta ao início para resultados novos

    setLoading(true);
    try {
      const { items, total } = await getSugestoesQuiz(answers, perPage, {
        childId,
        familyId,
        page: 1,
      });
      setItems(items);
      setTotal(total);
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (source === "perfil") {
      const { items, total } = await getSugestoesPerfil(perPage, {
        childId,
        familyId,
        page,
      });
      setItems(items);
      setTotal(total);
      setUpdatedAt(Date.now());
    } else if (lastAnswers) {
      const { items, total } = await getSugestoesQuiz(lastAnswers, perPage, {
        childId,
        familyId,
        page,
      });
      setItems(items);
      setTotal(total);
      setUpdatedAt(Date.now());
    }
  }

  async function onReserve(isbn: string) {
    if (!childId) {
      setToast({ msg: "Escolhe primeiro a criança.", type: "error" });
      return;
    }
    try {
      setBusyByIsbn((m) => ({ ...m, [isbn]: true }));
      await reserveBook(isbn, { childId });
      setReservedByIsbn((m) => ({ ...m, [isbn]: true }));
      setToast({ msg: "Reserva efetuada!", type: "success" });
    } catch (e: any) {
      const code = e?.response?.data?.error;
      if (code === "already_reading") {
        setReservedByIsbn((m) => ({ ...m, [isbn]: true }));
        setToast({ msg: "Já estás a ler este livro.", type: "error" });
      } else if (code === "already_reserved") {
        setReservedByIsbn((m) => ({ ...m, [isbn]: true }));
        setToast({ msg: "Este livro já está reservado.", type: "error" });
      } else {
        setToast({ msg: "Falha ao reservar.", type: "error" });
      }
      console.error(e);
    } finally {
      setBusyByIsbn((m) => ({ ...m, [isbn]: false }));
    }
  }

  // ---- BLOQUEIO: escolher criança em modo família ----
  if (mustPickChild) {
    return (
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <WhiteCard>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
          >
            <MenuBookRounded />
            Sugestões de Leitura
          </Typography>
          <Typography sx={{ opacity: 0.75 }}>
            <RouteLink href="/suggestions" weight={600}>
              <QuizRounded fontSize="inherit" style={{ marginRight: 4 }} />
              Quiz
            </RouteLink>
            {" · "}
            <RouteLink href="/suggestions-categories" weight={600}>
              <CategoryRounded fontSize="inherit" style={{ marginRight: 4 }} />
              Categorias
            </RouteLink>
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              mb: 2,
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PersonOutlineRounded />
            Escolhe o perfil da criança para ver sugestões e reservar.
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

  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Barra de contexto em modo família (filtro LOCAL) */}
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
              <PersonOutlineRounded />
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
        {/* Cabeçalho */}
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
              <MenuBookRounded />
              Sugestões de Leitura
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.75,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <InfoRounded fontSize="small" />
              {subtitle}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              <RouteLink href="/suggestions" weight={600}>
                <QuizRounded fontSize="inherit" style={{ marginRight: 4 }} />
                Quiz
              </RouteLink>
              {" · "}
              <RouteLink href="/suggestions-categories" weight={600}>
                <CategoryRounded fontSize="inherit" style={{ marginRight: 4 }} />
                Categorias
              </RouteLink>
            </Typography>
            {!!updatedAt && (
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <AccessTimeRounded fontSize="inherit" />
                Última atualização: {new Date(updatedAt).toLocaleString("pt-PT")}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <span>
                <IconButton onClick={refresh} disabled={loading}>
                  <RefreshRounded />
                </IconButton>
              </span>
            </Tooltip>
            <PrimaryButton
              startIcon={<TuneRounded />}
              onClick={applyFilters}
              disabled={loading}
            >
              Ver resultados
            </PrimaryButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filtros */}
        <Stack spacing={3} sx={{ mb: 2 }}>
          {/* Faixa etária */}
          <Box>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <ChildCareRounded />
              Faixa Etária
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {["0-2", "3-5", "6-8", "9-12", "12-15"].map((a) => (
                <Chip
                  key={a}
                  label={a}
                  variant={filters.ageRange === a ? "filled" : "outlined"}
                  color={filters.ageRange === a ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      ageRange: f.ageRange === a ? undefined : a,
                    }))
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* Géneros */}
          <Box>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <CategoryRounded />
              Géneros
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                "Aventura",
                "Fantasia",
                "Mistério",
                "Humor",
                "Ciência",
                "Animais",
                "Clássicos",
              ].map((g) => (
                <Chip
                  key={g}
                  label={g}
                  variant={filters.genres.includes(g) ? "filled" : "outlined"}
                  color={filters.genres.includes(g) ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({ ...f, genres: toggle(f.genres, g) }))
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* Formato */}
          <Box>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <MenuBookRounded />
              Formato
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                { k: "ilustrado", label: "Ilustrações", icon: <ImageRounded /> },
                { k: "curto", label: "Texto equilibrado", icon: <SubjectRounded /> },
                { k: "imagens", label: "Imagens", icon: <PhotoLibraryRounded /> },
                { k: "serie", label: "Série/Coleção", icon: <CollectionsBookmarkRounded /> },
              ].map(({ k, label, icon }) => (
                <Chip
                  key={k}
                  label={label}
                  icon={icon}
                  variant={filters.format.includes(k) ? "filled" : "outlined"}
                  color={filters.format.includes(k) ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({ ...f, format: toggle(f.format, k) }))
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* Objetivos */}
          <Box>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <TravelExploreRounded />
              Objetivos
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                { k: "divertir", label: "Divertir", icon: <SentimentSatisfiedRounded /> },
                { k: "aprender", label: "Aprender", icon: <SchoolRounded /> },
                { k: "emocionar", label: "Emocionar", icon: <VolunteerActivismRounded /> },
                { k: "explorar", label: "Explorar", icon: <TravelExploreRounded /> },
              ].map(({ k, label, icon }) => (
                <Chip
                  key={k}
                  label={label}
                  icon={icon}
                  variant={filters.goals.includes(k) ? "filled" : "outlined"}
                  color={filters.goals.includes(k) ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({ ...f, goals: toggle(f.goals, k) }))
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* Momento de leitura */}
          <Box>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <AccessTimeRounded />
              Momento de leitura
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                { k: "antes-de-dormir", label: "Antes de dormir", icon: <NightlightRounded /> },
                { k: "pequeno-almoco", label: "Pequeno-almoço", icon: <FreeBreakfastRounded /> },
                { k: "viagens", label: "Viagens", icon: <DirectionsCarRounded /> },
                { k: "lazer-familiar", label: "Lazer familiar", icon: <Diversity3Rounded /> },
              ].map(({ k, label, icon }) => (
                <Chip
                  key={k}
                  label={label}
                  icon={icon}
                  variant={filters.moment === k ? "filled" : "outlined"}
                  color={filters.moment === k ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      moment: f.moment === k ? undefined : k,
                    }))
                  }
                />
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<ReplayRounded />}
              onClick={() => {
                const reset: Filters = {
                  genres: [],
                  format: [],
                  goals: [],
                  ageRange: undefined,
                  moment: undefined,
                };
                setFilters(reset);
                saveFilters(reset);
              }}
            >
              Limpar filtros
            </Button>
            <Button
              variant="contained"
              startIcon={<TuneRounded />}
              onClick={applyFilters}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Ver resultados
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Resultados */}
        {loading && (
          <Typography sx={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 0.5 }}>
            <HourglassTopRounded />
            A preparar sugestões…
          </Typography>
        )}

        {!loading && items && items.length > 0 && (
          <>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {items.map((b) => (
                <SuggestionCard
                  key={b.isbn}
                  book={b}
                  onReserve={onReserve}
                  onOpenDetails={(bk) => {
                    setSelected(bk);
                    setOpenDetails(true);
                  }}
                  reserving={!!busyByIsbn[b.isbn]}
                  reserved={!!reservedByIsbn[b.isbn]}
                  disabled={!childId}
                />
              ))}
            </Stack>

            {/* --- Paginator --- */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              sx={{ mt: 2 }}
              spacing={1.5}
            >
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="per-page-label">Por página</InputLabel>
                <Select
                  labelId="per-page-label"
                  label="Por página"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[6, 8, 12, 16, 20, 24, 32, 48].map((n) => (
                    <MenuItem key={n} value={n}>
                      <MenuBookRounded fontSize="small" style={{ marginRight: 6 }} />
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          </>
        )}

        {!loading && items && items.length === 0 && (
          <Typography sx={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 0.5 }}>
            <SearchOffRounded />
            Sem resultados. Ajusta os filtros e tenta novamente.
          </Typography>
        )}
      </WhiteCard>

      {/* Modal de detalhes */}
      <BookDetailsDialog
        open={openDetails}
        book={selected}
        onClose={() => setOpenDetails(false)}
        onReserve={onReserve}
        reserving={selected ? !!busyByIsbn[selected.isbn] : false}
        reserved={selected ? !!reservedByIsbn[selected.isbn] : false}
        disabled={!childId}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.type}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
}

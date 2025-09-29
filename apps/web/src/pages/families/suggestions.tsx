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
  Dialog,
  DialogTitle,
  DialogContent,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  LinearProgress,
  Tooltip,
  Snackbar,
  Alert,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import SpeedRounded from "@mui/icons-material/SpeedRounded";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import BookmarkAddRounded from "@mui/icons-material/BookmarkAddRounded";
import BookmarkAddedRounded from "@mui/icons-material/BookmarkAddedRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import NightlightRounded from "@mui/icons-material/NightlightRounded";
import EmojiPeopleRounded from "@mui/icons-material/EmojiPeopleRounded";
import HikingRounded from "@mui/icons-material/HikingRounded";
import SubjectRounded from "@mui/icons-material/SubjectRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import CollectionsBookmarkRounded from "@mui/icons-material/CollectionsBookmarkRounded";
import ChildCareRounded from "@mui/icons-material/ChildCareRounded";

import { useUserSession } from "../../contexts/UserSession";
import {
  getSugestoesPerfil,
  getSugestoesQuiz,
  type QuizAnswer,
  type BookLite, // <- inclui summary
} from "../../services/books";
import { reserveBook } from "@/services/reservation";

/* ---------- helpers ---------- */
function saveQuizToStorage(answers: QuizAnswer[]) {
  localStorage.setItem("quizAnswers", JSON.stringify(answers));
}
function readQuizFromStorage(): QuizAnswer[] | null {
  try {
    const raw = localStorage.getItem("quizAnswers");
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((a: any) => a && typeof a.id === "string");
  } catch {
    return null;
  }
}

/* ---------- skeleton ---------- */
function SkeletonCard() {
  return (
    <Box
      sx={{
        width: 224,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.5,
      }}
    >
      <Box sx={{ height: 280, bgcolor: "action.hover", borderRadius: 2 }} />
      <Box
        sx={{
          mt: 1.5,
          height: 16,
          width: "75%",
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      />
      <Box
        sx={{
          mt: 1,
          height: 12,
          width: "45%",
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      />
    </Box>
  );
}

/* ---------- DIALOG de detalhes ---------- */
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
  const authors =
    (book as any)?.authors ||
    (book as any)?.author ||
    ((book as any)?.authorName ? [(book as any).authorName as string] : []);
  const categories =
    (book as any)?.categories ||
    (book as any)?.genres ||
    (book as any)?.tags ||
    [];

  if (!book) return null;

  const cover = book.coverUrl || "/placeholder-book.jpg";
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
              width: { xs: 160, sm: 200 }, // 👈 capa maior no modal
              height: { xs: 230, sm: 300 },
              objectFit: "cover",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          />
          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            {/* score com ícone */}
            {typeof book.score === "number" && (
              <Chip
                size="small"
                icon={<SpeedRounded fontSize="small" />}
                label={`score ${book.score.toFixed(3)}`}
                sx={{ width: "fit-content" }}
              />
            )}

            {/* autores */}
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

            {/* categorias/ géneros */}
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

        {/* resumo (ou fallback) */}
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
            sx={{ mt: 2, opacity: 0.8 }}
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

/* ---------- cartão ---------- */
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

      {/* score com ícone */}
      {typeof book.score === "number" && (
        <Chip
          size="small"
          icon={<SpeedRounded fontSize="small" />}
          label={`score ${book.score.toFixed(3)}`}
          sx={{ mt: 0.5, width: "fit-content" }}
        />
      )}

      {/* resumo/descrição (se houver) */}
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

/* ---------- modal do quiz ---------- */
function QuizModal({
  open,
  onClose,
  onFinish,
  defaultAgeRange,
}: {
  open: boolean;
  onClose: () => void;
  onFinish: (answers: QuizAnswer[]) => void;
  defaultAgeRange?: string;
}) {
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  const [mood, setMood] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<string[]>([]);
  const [age, setAge] = useState<string | undefined>(defaultAgeRange);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const canNext = [genres.length > 0, !!mood, format.length > 0, !!age][step];

  function next() {
    if (step < 3) setStep(step + 1);
    else {
      const answers: QuizAnswer[] = [
        { id: "genres", value: genres },
        { id: "mood", value: mood },
        { id: "format", value: format },
        { id: "ageRange", value: age },
      ];
      saveQuizToStorage(answers);
      onFinish(answers);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900, pb: 1, display: "flex", gap: 1, alignItems: "center" }}>
        <QuizRounded />
        Sugestões de Leitura — Quiz {age ? `(${age})` : ""}
      </DialogTitle>
      <DialogContent dividers>
        <LinearProgress
          variant="determinate"
          value={(step + 1) * 25}
          sx={{ mb: 2, borderRadius: 999 }}
        />

        {step === 0 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CategoryRounded />
              Que género de livro preferes?
            </Typography>
            <ToggleButtonGroup
              value={genres}
              onChange={(_, v) => setGenres(Array.isArray(v) ? v : [])}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              {[
                "Aventura",
                "Fantasia",
                "Mistério",
                "Humor",
                "Ciências",
                "Animais",
                "Clássicos",
              ].map((g) => (
                <ToggleButton key={g} value={g} sx={{ borderRadius: 3, px: 2 }}>
                  <CategoryRounded fontSize="small" style={{ marginRight: 6 }} />
                  {g}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <EmojiPeopleRounded />
              Qual o contexto de leitura?
            </Typography>
            <ToggleButtonGroup
              value={mood}
              exclusive
              onChange={(_, v) =>
                setMood(typeof v === "string" ? v : undefined)
              }
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton
                value="antes-de-dormir"
                sx={{ borderRadius: 3, px: 2 }}
              >
                <NightlightRounded fontSize="small" style={{ marginRight: 6 }} />
                Antes de dormir
              </ToggleButton>
              <ToggleButton value="tempo-livre" sx={{ borderRadius: 3, px: 2 }}>
                <EmojiPeopleRounded fontSize="small" style={{ marginRight: 6 }} />
                Tempo livre
              </ToggleButton>
              <ToggleButton value="aventura" sx={{ borderRadius: 3, px: 2 }}>
                <HikingRounded fontSize="small" style={{ marginRight: 6 }} />
                Aventura
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <MenuBookRounded />
              Preferes algum formato?
            </Typography>
            <ToggleButtonGroup
              value={format}
              onChange={(_, v) => setFormat(Array.isArray(v) ? v : [])}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton value="curto" sx={{ borderRadius: 3, px: 2 }}>
                <SubjectRounded fontSize="small" style={{ marginRight: 6 }} />
                Histórias curtas
              </ToggleButton>
              <ToggleButton value="ilustrado" sx={{ borderRadius: 3, px: 2 }}>
                <ImageRounded fontSize="small" style={{ marginRight: 6 }} />
                Ilustrado
              </ToggleButton>
              <ToggleButton value="serie" sx={{ borderRadius: 3, px: 2 }}>
                <CollectionsBookmarkRounded fontSize="small" style={{ marginRight: 6 }} />
                Série / coleção
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <ChildCareRounded />
              Faixa etária
            </Typography>
            <ToggleButtonGroup
              value={age}
              exclusive
              onChange={(_, v) => setAge(typeof v === "string" ? v : undefined)}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              {["0-2", "3-5", "6-8", "9-12", "12-15"].map((r) => (
                <ToggleButton key={r} value={r} sx={{ borderRadius: 3, px: 2 }}>
                  <ChildCareRounded fontSize="small" style={{ marginRight: 6 }} />
                  {r}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
          <Button
            startIcon={<ReplayRounded />}
            onClick={() => {
              setStep(0);
              setGenres([]);
              setMood(undefined);
              setFormat([]);
              setAge(defaultAgeRange);
            }}
          >
            Recomeçar
          </Button>
          <Button variant="contained" onClick={next} disabled={!canNext} startIcon={<QuizRounded />}>
            {step < 3 ? "Continuar" : "Ver sugestões"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- página ---------- */
export default function SuggestionsPage() {
  const { user, asChild } = useUserSession();

  // 🔒 Em modo família, a escolha da criança é LOCAL (não muda o active user)
  const [localChildId, setLocalChildId] = useState<string>("");

  // Em modo criança usa actingChild; em modo família é obrigatório escolher (local)
  const childId = asChild
    ? Number(user?.actingChild?.id as any)
    : localChildId
    ? Number(localChildId)
    : undefined;

  const familyId = asChild ? undefined : Number(user?.id) || undefined;

  const [items, setItems] = useState<BookLite[] | null>(null);
  const [total, setTotal] = useState<number>(0);

  // paginação
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(12);

  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"perfil" | "quiz">("perfil");
  const [quizOpen, setQuizOpen] = useState(false);
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

  // detalhes
  const [detailBook, setDetailBook] = useState<BookLite | null>(null);

  const mustPickChild = !asChild && !childId;

  const subtitle = useMemo(
    () =>
      source === "perfil"
        ? "Baseadas no teu perfil (idade/leitura)"
        : "Baseadas nas tuas respostas ao quiz",
    [source]
  );

  // limpar lista/flags ao trocar a criança
  useEffect(() => {
    setItems(null);
    setBusyByIsbn({});
    setReservedByIsbn({});
    setPage(1);
  }, [childId]);

  async function loadPerfil(p = page, pp = perPage) {
    if (mustPickChild) return;
    setLoading(true);
    try {
      const { items, total } = await getSugestoesPerfil(pp, {
        childId,
        familyId,
        page: p,
      });
      setItems(items);
      setTotal(total);
      setSource("perfil");
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  async function runQuiz(answers: QuizAnswer[], p = page, pp = perPage) {
    if (mustPickChild) return;
    setQuizOpen(false);
    setLoading(true);
    try {
      const { items, total } = await getSugestoesQuiz(answers, pp, {
        childId,
        familyId,
        page: p,
      });
      setItems(items);
      setTotal(total);
      setSource("quiz");
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(isbn: string) {
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

  useEffect(() => {
    loadPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId]);

  // trocar página / por página
  useEffect(() => {
    if (source === "perfil") loadPerfil(page, perPage);
    else {
      const stored = readQuizFromStorage();
      if (stored && stored.length) runQuiz(stored, page, perPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const childOptions =
    (user?.children || []).map((c: any) => ({
      id: String(c.id),
      nome: String(c.name ?? "Criança"),
      avatar: c.avatarUrl ?? undefined,
    })) ?? [];

  if (mustPickChild) {
    return (
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <WhiteCard>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
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
          <Typography sx={{ mt: 1.5, mb: 2, opacity: 0.8, display: "flex", alignItems: "center", gap: 1 }}>
            <PersonOutlineRounded />
            Escolhe o perfil da criança para gerar sugestões e permitir
            reservas.
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
      {/* Filtro LOCAL em modo família (não muda active user) */}
      {!asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
          >
            <Typography fontWeight={900} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MenuBookRounded />
              Sugestões de Leitura
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoRounded fontSize="small" />
              {subtitle}
            </Typography>

            {/* nav entre páginas */}
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
              <Typography variant="caption" sx={{ opacity: 0.6, display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccessTimeRounded fontSize="inherit" />
                Última geração: {new Date(updatedAt).toLocaleString("pt-PT")}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar lista">
              <span>
                <IconButton
                  onClick={
                    source === "perfil"
                      ? () => loadPerfil(page, perPage)
                      : () => {
                          const stored = readQuizFromStorage();
                          if (stored && stored.length)
                            runQuiz(stored, page, perPage);
                          else setQuizOpen(true);
                        }
                  }
                >
                  <RefreshRounded />
                </IconButton>
              </span>
            </Tooltip>
            <PrimaryButton
              startIcon={<QuizRounded />}
              onClick={() => setQuizOpen(true)}
            >
              Fazer quiz
            </PrimaryButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {loading && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {Array.from({ length: perPage }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </Stack>
        )}

        {!loading && items && items.length > 0 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip
                label={source === "perfil" ? "Perfil" : "Quiz"}
                icon={source === "perfil" ? <PersonRounded /> : <QuizRounded />}
                color={source === "perfil" ? "default" : "primary"}
              />
              {source === "quiz" && (
                <Chip
                  icon={<UndoRounded />}
                  label="Voltar ao perfil"
                  onClick={() => {
                    setPage(1);
                    loadPerfil(1, perPage);
                  }}
                  variant="outlined"
                />
              )}
            </Stack>

            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {items.map((b) => (
                <SuggestionCard
                  key={b.isbn}
                  book={b}
                  onReserve={(isbn) => handleReserve(isbn)}
                  onOpenDetails={(bk) => setDetailBook(bk)}
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
            Sem resultados. Tenta o{" "}
            <RouteLink
              href="#"
              onClick={(e: any) => {
                e.preventDefault();
                setQuizOpen(true);
              }}
              weight={600}
            >
              quiz
            </RouteLink>{" "}
            para explorar novos livros.
          </Typography>
        )}
      </WhiteCard>

      {/* Dialog de detalhes */}
      <BookDetailsDialog
        open={!!detailBook}
        book={detailBook}
        onClose={() => setDetailBook(null)}
        onReserve={(isbn) => handleReserve(isbn)}
        reserving={detailBook ? !!busyByIsbn[detailBook.isbn] : false}
        reserved={detailBook ? !!reservedByIsbn[detailBook.isbn] : false}
        disabled={!childId}
      />

      <QuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onFinish={(a) => {
          setPage(1);
          runQuiz(a, 1, perPage);
        }}
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

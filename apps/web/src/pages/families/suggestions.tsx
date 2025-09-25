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
import { StarRounded } from "@mui/icons-material";
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

/* ---------- cartão ---------- */
function SuggestionCard({
  book,
  onReserve,
  reserving,
  reserved,
  disabled,
}: {
  book: BookLite;
  onReserve: (isbn: string) => void;
  reserving?: boolean;
  reserved?: boolean;
  disabled?: boolean;
}) {
  const cover = book.coverUrl || "/placeholder-book.jpg";
  const isBusy = !!reserving || !!reserved || !!disabled;

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
          {book.summary}
        </Typography>
      )}

      {typeof book.score === "number" && (
        <Typography variant="caption" sx={{ opacity: 0.7, mt: 0.25 }}>
          score {book.score.toFixed(3)}
        </Typography>
      )}

      <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.25 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarRounded
            key={i}
            fontSize="small"
            sx={{ opacity: i < 4 ? 1 : 0.35 }}
          />
        ))}
      </Box>

      <Button
        size="small"
        variant="contained"
        sx={{ mt: 1, borderRadius: 2 }}
        onClick={() => onReserve(book.isbn)}
        disabled={isBusy}
      >
        {reserved ? "Reservado" : reserving ? "A reservar..." : "Reservar"}
      </Button>
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
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
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
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
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
                  {g}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
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
                Antes de dormir
              </ToggleButton>
              <ToggleButton value="tempo-livre" sx={{ borderRadius: 3, px: 2 }}>
                Tempo livre
              </ToggleButton>
              <ToggleButton value="aventura" sx={{ borderRadius: 3, px: 2 }}>
                Aventura
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
              Preferes algum formato?
            </Typography>
            <ToggleButtonGroup
              value={format}
              onChange={(_, v) => setFormat(Array.isArray(v) ? v : [])}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton value="curto" sx={{ borderRadius: 3, px: 2 }}>
                Histórias curtas
              </ToggleButton>
              <ToggleButton value="ilustrado" sx={{ borderRadius: 3, px: 2 }}>
                Ilustrado
              </ToggleButton>
              <ToggleButton value="serie" sx={{ borderRadius: 3, px: 2 }}>
                Série / coleção
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
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
          <Button variant="contained" onClick={next} disabled={!canNext}>
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
    ? Number((user?.actingChild?.id as any))
    : localChildId
    ? Number(localChildId)
    : undefined;

  const familyId = asChild ? undefined : (Number(user?.id) || undefined);

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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WhiteCard>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
            Sugestões de Leitura
          </Typography>
          <Typography sx={{ opacity: 0.75 }}>
            <RouteLink href="/suggestions" weight={600}>
              Quiz
            </RouteLink>
            {" · "}
            <RouteLink href="/suggestions-categories" weight={600}>
              Categorias
            </RouteLink>
          </Typography>
          <Typography sx={{ mt: 1.5, mb: 2, opacity: 0.8 }}>
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
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

      <WhiteCard>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={900}>
              Sugestões de Leitura
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {subtitle}
            </Typography>

            {/* nav entre páginas */}
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              <RouteLink href="/suggestions" weight={600}>
                Quiz
              </RouteLink>
              {" · "}
              <RouteLink href="/suggestions-categories" weight={600}>
                Categorias
              </RouteLink>
            </Typography>

            {!!updatedAt && (
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
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
                          if (stored && stored.length) runQuiz(stored, page, perPage);
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
                color={source === "perfil" ? "default" : "primary"}
              />
              {source === "quiz" && (
                <Chip
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
          <Typography sx={{ opacity: 0.7 }}>
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

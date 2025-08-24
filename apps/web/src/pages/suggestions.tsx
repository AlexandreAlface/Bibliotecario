// apps/web/src/pages/suggestions.tsx
import { useEffect, useMemo, useState } from "react";
import { WhiteCard, PrimaryButton, RouteLink, AvatarSelect } from "@bibliotecario/ui-web";
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
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import { StarRounded } from "@mui/icons-material";
import { useUserSession } from "../contexts/UserSession";
import {
  getSugestoesPerfil,
  getSugestoesQuiz,
  type QuizAnswer,
} from "../services/books";
import { reserveBook } from "@/services/reservation";

type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  score?: number;
  why?: string[];
};

const QUIZ_KEY = "quizAnswers";

/* ---------- helpers ---------- */
function saveQuizToStorage(answers: QuizAnswer[]) {
  localStorage.setItem(QUIZ_KEY, JSON.stringify(answers));
}
function readQuizFromStorage(): QuizAnswer[] | null {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((a: any) => a && typeof a.id === "string");
  } catch {
    return null;
  }
}
// normaliza payload vindo do serviço (array direto, {data:[...]}, {items:[...]})
function normalizeBooks(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload as BookLite[];
  if (Array.isArray(payload?.data)) return payload.data as BookLite[];
  if (Array.isArray(payload?.items)) return payload.items as BookLite[];
  return [];
}

/* ---------- cartões ---------- */
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
      <Box sx={{ mt: 1.5, height: 16, width: "75%", bgcolor: "action.hover", borderRadius: 1 }} />
      <Box sx={{ mt: 1, height: 12, width: "45%", bgcolor: "action.hover", borderRadius: 1 }} />
    </Box>
  );
}

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
        width: 224,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.5,
        bgcolor: "background.paper",
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
        }}
        title={book.title}
      >
        {book.title}
      </Typography>
      {typeof book.score === "number" && (
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          score {book.score.toFixed(3)}
        </Typography>
      )}
      <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.25 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarRounded key={i} fontSize="small" sx={{ opacity: i < 4 ? 1 : 0.35 }} />
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

/* ---------- modal do quiz (4 passos) ---------- */
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
        <LinearProgress variant="determinate" value={(step + 1) * 25} sx={{ mb: 2, borderRadius: 999 }} />

        {step === 0 && (
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
              Que género de livro preferes?
            </Typography>
            <ToggleButtonGroup value={genres} onChange={(_, v) => setGenres(Array.isArray(v) ? v : [])} sx={{ flexWrap: "wrap", gap: 1 }}>
              {["Aventura", "Fantasia", "Mistério", "Humor", "Ciências", "Animais", "Clássicos"].map((g) => (
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
              onChange={(_, v) => setMood(typeof v === "string" ? v : undefined)}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <ToggleButton value="antes-de-dormir" sx={{ borderRadius: 3, px: 2 }}>
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
            <ToggleButtonGroup value={format} onChange={(_, v) => setFormat(Array.isArray(v) ? v : [])} sx={{ flexWrap: "wrap", gap: 1 }}>
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
            <ToggleButtonGroup value={age} exclusive onChange={(_, v) => setAge(typeof v === "string" ? v : undefined)} sx={{ flexWrap: "wrap", gap: 1 }}>
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
  const { user, asChild, selectedChildId, setSelectedChildId } = useUserSession();

  // Em modo criança: usa a criança ativa; Em modo família: OBRIGATÓRIO escolher uma criança
  const childId = asChild
    ? Number((user?.actingChild?.id as any) ?? (selectedChildId as any))
    : (selectedChildId ? Number(selectedChildId) : undefined);

  const familyId = asChild ? undefined : Number(user?.id);

  const [items, setItems] = useState<BookLite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"perfil" | "quiz">("perfil");
  const [quizOpen, setQuizOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const mustPickChild = !asChild && !childId; // obrigatoriedade em modo família

  const subtitle = useMemo(
    () =>
      source === "perfil" ? "Baseadas no teu perfil (idade/leitura)" : "Baseadas nas tuas respostas ao quiz",
    [source]
  );

  async function loadPerfil() {
    if (mustPickChild) return; // bloqueia enquanto não escolher a criança
    setLoading(true);
    try {
      const raw = await getSugestoesPerfil(12, { childId, familyId });
      const data = normalizeBooks(raw);
      setItems(data);
      setSource("perfil");
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  async function runQuiz(answers: QuizAnswer[]) {
    if (mustPickChild) return;
    setQuizOpen(false);
    setLoading(true);
    try {
      const raw = await getSugestoesQuiz(answers, 12, { childId, familyId });
      const data = normalizeBooks(raw);
      setItems(data);
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
      await reserveBook(isbn, { childId });
      setToast({ msg: "Reserva efetuada!", type: "success" });
    } catch (e) {
      console.error(e);
      setToast({ msg: "Falha ao reservar.", type: "error" });
    }
  }

  useEffect(() => {
    loadPerfil(); // ao abrir e quando muda o contexto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId]);

  const childOptions =
    (user?.children || []).map((c) => ({
      id: String(c.id),
      nome: c.name,
      avatar: c.avatarUrl || undefined,
    })) ?? [];

  // ---- Se estiver em modo família e ainda não escolheu a criança, bloqueia a página com o seletor ----
  if (mustPickChild) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WhiteCard>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
            Sugestões de Leitura
          </Typography>
          <Typography sx={{ mb: 2, opacity: 0.8 }}>
            Escolhe o perfil da criança para gerar sugestões e permitir reservas.
          </Typography>
          <AvatarSelect
            label="Escolher criança"
            options={childOptions}
            value={selectedChildId}
            onChange={(id) => setSelectedChildId(id)}
            minWidth={280}
          />
        </WhiteCard>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Barra obrigatória de contexto em modo família */}
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={900}>
              Sugestões de Leitura
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {subtitle}
            </Typography>
            {!!updatedAt && (
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Última geração: {new Date(updatedAt).toLocaleString("pt-PT")}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title={mustPickChild ? "Escolhe uma criança" : "Atualizar lista"}>
              <span>
                <IconButton
                  onClick={
                    source === "perfil"
                      ? loadPerfil
                      : () => {
                          const stored = readQuizFromStorage();
                          if (stored && stored.length) runQuiz(stored);
                          else setQuizOpen(true);
                        }
                  }
                  disabled={mustPickChild}
                >
                  <RefreshRounded />
                </IconButton>
              </span>
            </Tooltip>
            <PrimaryButton startIcon={<QuizRounded />} onClick={() => setQuizOpen(true)} disabled={mustPickChild}>
              Fazer quiz
            </PrimaryButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {loading && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </Stack>
        )}

        {!loading && items && items.length > 0 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={source === "perfil" ? "Perfil" : "Quiz"} color={source === "perfil" ? "default" : "primary"} />
              {source === "quiz" && <Chip label="Voltar ao perfil" onClick={loadPerfil} variant="outlined" />}
            </Stack>

            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              {items.map((b) => (
                <SuggestionCard key={b.isbn} book={b} onReserve={(isbn) => handleReserve(isbn)} disabled={mustPickChild} />
              ))}
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
            >
              quiz
            </RouteLink>{" "}
            para explorar novos livros.
          </Typography>
        )}
      </WhiteCard>

      <QuizModal open={quizOpen} onClose={() => setQuizOpen(false)} onFinish={runQuiz} />

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

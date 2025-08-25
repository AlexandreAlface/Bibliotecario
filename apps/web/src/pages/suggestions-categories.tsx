// apps/web/src/pages/suggestions-categories.tsx
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
  Button,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { StarRounded } from "@mui/icons-material";
import { useUserSession } from "../contexts/UserSession";
import {
  getSugestoesQuiz,
  type QuizAnswer,
  getSugestoesPerfil,
} from "../services/books";
import { reserveBook } from "@/services/reservation";

/* ------------ tipos ------------ */
type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  score?: number;
  why?: string[];
};

type Filters = {
  ageRange?: string;
  genres: string[];
  format: string[];
  goals: string[];
  moment?: string;
};

const LS_KEY = "categoryFilters";

/* ------------ helpers ------------ */
function normalizeBooks(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload as BookLite[];
  if (Array.isArray(payload?.data)) return payload.data as BookLite[];
  if (Array.isArray(payload?.items)) return payload.items as BookLite[];
  return [];
}

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

/* ------------ cartão ------------ */
function SuggestionCard({
  book,
  onReserve,
  disabled,
}: {
  book: BookLite;
  onReserve: (isbn: string) => void;
  disabled?: boolean;
}) {
  const cover = book.coverUrl || "/placeholder-book.jpg";
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
        disabled={disabled}
      >
        Reservar
      </Button>
    </Box>
  );
}

/* ------------ página ------------ */
export default function SuggestionsByCategoriesPage() {
  const { user, asChild, selectedChildId, setSelectedChildId } = useUserSession();

  // Em modo criança usa a criança ativa; em modo família é OBRIGATÓRIO escolher uma criança
  const childId = asChild
    ? Number((user?.actingChild?.id as any) ?? (selectedChildId as any))
    : (selectedChildId ? Number(selectedChildId) : undefined);
  const familyId = asChild ? undefined : Number(user?.id);

  const mustPickChild = !asChild && !childId;

  const [filters, setFilters] = useState<Filters>(() => loadSavedFilters());
  const [items, setItems] = useState<BookLite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const subtitle = useMemo(() => "Escolhe categorias para afinar as sugestões", []);

  // opções para o AvatarSelect
  const childOptions =
    (user?.children || []).map((c) => ({
      id: String(c.id),
      nome: c.name,
      avatar: c.avatarUrl || undefined,
    })) ?? [];

  useEffect(() => {
    if (mustPickChild) return; // bloqueia até haver criança
    (async () => {
      if (items) return;
      setLoading(true);
      try {
        const raw = await getSugestoesPerfil(12, { childId, familyId });
        setItems(normalizeBooks(raw));
        setUpdatedAt(Date.now());
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId, mustPickChild]);

  function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

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

    setLoading(true);
    try {
      const raw = await getSugestoesQuiz(answers, 12, { childId, familyId });
      setItems(normalizeBooks(raw));
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  async function onReserve(isbn: string) {
    if (!childId) {
      setToast({ msg: "Escolhe primeiro a criança.", type: "error" });
      return;
    }
    try {
      await reserveBook(isbn, { childId }); // ✅ garante number
      setToast({ msg: "Reserva efetuada!", type: "success" });
    } catch (e) {
      console.error(e);
      setToast({ msg: "Falha ao reservar.", type: "error" });
    }
  }

  // ---- BLOQUEIO: escolher criança em modo família ----
  if (mustPickChild) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <WhiteCard>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
            Sugestões de Leitura
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {subtitle}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            <RouteLink href="/suggestions" weight={600}>Quiz</RouteLink>
            {" · "}
            <RouteLink href="/suggestions-categories" weight={600}>Categorias</RouteLink>
          </Typography>

          <Typography sx={{ mt: 1.5, mb: 2, opacity: 0.8 }}>
            Escolhe o perfil da criança para ver sugestões e reservar.
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
      {/* Barra de contexto em modo família */}
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
        {/* Cabeçalho */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={900}>Sugestões de Leitura</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>{subtitle}</Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              <RouteLink href="/suggestions" weight={600}>Quiz</RouteLink>
              {" · "}
              <RouteLink href="/suggestions-categories" weight={600}>Categorias</RouteLink>
            </Typography>
            {!!updatedAt && (
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Última atualização: {new Date(updatedAt).toLocaleString("pt-PT")}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <span>
                <IconButton onClick={applyFilters} disabled={loading}>
                  <RefreshRounded />
                </IconButton>
              </span>
            </Tooltip>
            <PrimaryButton onClick={applyFilters} disabled={loading}>
              Ver resultados
            </PrimaryButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filtros */}
        <Stack spacing={3} sx={{ mb: 2 }}>
          {/* Faixa etária */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
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
                    setFilters((f) => ({ ...f, ageRange: f.ageRange === a ? undefined : a }))
                  }
                />
              ))}
            </Stack>
          </Box>

          {/* Géneros */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Géneros
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {["Aventura", "Fantasia", "Mistério", "Humor", "Ciência", "Animais", "Clássicos"].map((g) => (
                <Chip
                  key={g}
                  label={g}
                  variant={filters.genres.includes(g) ? "filled" : "outlined"}
                  color={filters.genres.includes(g) ? "primary" : "default"}
                  onClick={() => setFilters((f) => ({ ...f, genres: toggle(f.genres, g) }))}
                />
              ))}
            </Stack>
          </Box>

          {/* Formato */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Formato
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                { k: "ilustrado", label: "Ilustrações" },
                { k: "curto", label: "Texto equilibrado" },
                { k: "imagens", label: "Imagens" },
                { k: "serie", label: "Série/Coleção" },
              ].map(({ k, label }) => (
                <Chip
                  key={k}
                  label={label}
                  variant={filters.format.includes(k) ? "filled" : "outlined"}
                  color={filters.format.includes(k) ? "primary" : "default"}
                  onClick={() => setFilters((f) => ({ ...f, format: toggle(f.format, k) }))}
                />
              ))}
            </Stack>
          </Box>

          {/* Objetivos */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Objetivos
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {["divertir", "aprender", "emocionar", "explorar"].map((o) => (
                <Chip
                  key={o}
                  label={o[0].toUpperCase() + o.slice(1)}
                  variant={filters.goals.includes(o) ? "filled" : "outlined"}
                  color={filters.goals.includes(o) ? "primary" : "default"}
                  onClick={() => setFilters((f) => ({ ...f, goals: toggle(f.goals, o) }))}
                />
              ))}
            </Stack>
          </Box>

          {/* Momento de leitura */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
              Momento de leitura
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {[
                { k: "antes-de-dormir", label: "Antes de dormir" },
                { k: "pequeno-almoco", label: "Pequeno-almoço" },
                { k: "viagens", label: "Viagens" },
                { k: "lazer-familiar", label: "Lazer familiar" },
              ].map(({ k, label }) => (
                <Chip
                  key={k}
                  label={label}
                  variant={filters.moment === k ? "filled" : "outlined"}
                  color={filters.moment === k ? "primary" : "default"}
                  onClick={() =>
                    setFilters((f) => ({ ...f, moment: f.moment === k ? undefined : k }))
                  }
                />
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => {
                const reset: Filters = { genres: [], format: [], goals: [], ageRange: undefined, moment: undefined };
                setFilters(reset);
                saveFilters(reset);
              }}
            >
              Limpar filtros
            </Button>
            <Button variant="contained" onClick={applyFilters} disabled={loading} sx={{ borderRadius: 2 }}>
              Ver resultados
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Resultados */}
        {loading && <Typography sx={{ opacity: 0.7 }}>A preparar sugestões…</Typography>}

        {!loading && items && items.length > 0 && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {items.map((b) => (
              <SuggestionCard key={b.isbn} book={b} onReserve={onReserve} disabled={!childId} />
            ))}
          </Stack>
        )}

        {!loading && items && items.length === 0 && (
          <Typography sx={{ opacity: 0.7 }}>Sem resultados. Ajusta os filtros e tenta novamente.</Typography>
        )}
      </WhiteCard>

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

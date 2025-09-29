// apps/web/src/pages/admin/Families.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
// lucide (evita problemas de MIME do @mui/icons-material)
import {
  Info,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Users,
  UserRound,
  SlidersHorizontal,
  Building2,
  ExternalLink,
} from "lucide-react";

import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { getMyLibrary, type LibraryLite } from "@/services/admin";

type ChildLiteFull = {
  id: number;
  name?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  ageYears?: number | null;
  readingsCount?: number | null;
  ratingsCount?: number | null;
};

type FamilyFullForLib = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  childrenCount: number;
  children: ChildLiteFull[];
};

type FamiliesResponse = {
  items: Partial<FamilyFullForLib>[];
  nextCursor: number | null;
};

const initials = (s?: string) =>
  (s || "")
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

/** Chamada com filtros avançados (rota da API). */
async function fetchFamiliesAdvanced(params: {
  libraryId: number;
  q?: string;
  child?: string;
  gender?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  hasChildren?: "all" | "true" | "false";
  limit?: number;
  cursor?: number | null;
  expandChildren?: boolean;
  signal?: AbortSignal;
}): Promise<FamiliesResponse> {
  const {
    libraryId,
    q,
    child,
    gender,
    ageMin,
    ageMax,
    hasChildren = "all",
    limit = 25,
    cursor,
    expandChildren = true,
    signal,
  } = params;

  const url = new URL(
    `${API_BASE}/admin/libraries/${libraryId}/families`,
    location.origin
  );
  url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (child) url.searchParams.set("child", child);
  if (gender) url.searchParams.set("gender", gender);
  if (ageMin != null && ageMin !== ("" as any))
    url.searchParams.set("ageMin", String(ageMin));
  if (ageMax != null && ageMax !== ("" as any))
    url.searchParams.set("ageMax", String(ageMax));
  if (hasChildren !== "all") url.searchParams.set("hasChildren", hasChildren);
  if (cursor) url.searchParams.set("cursor", String(cursor));
  if (expandChildren) url.searchParams.set("expand", "children");

  const res = await fetch(url.toString(), { credentials: "include", signal });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Normaliza a família vinda da API para garantir children[] e childrenCount coerentes */
function normalizeFamily(raw: Partial<FamilyFullForLib>): FamilyFullForLib {
  const kids = Array.isArray(raw.children) ? raw.children : [];
  const childrenCount =
    typeof raw.childrenCount === "number" ? raw.childrenCount : kids.length;

  return {
    id: Number(raw.id),
    fullName: String(raw.fullName || "—"),
    email: String(raw.email || ""),
    phone: (raw.phone ?? null) as string | null,
    address: (raw.address ?? null) as string | null,
    childrenCount,
    children: kids.map((c) => ({
      id: Number(c.id),
      name: c.name ?? null,
      birthDate: c.birthDate ?? null,
      gender: c.gender ?? null,
      ageYears:
        typeof c.ageYears === "number"
          ? c.ageYears
          : c.birthDate
          ? calcAge(c.birthDate)
          : null,
      readingsCount: c.readingsCount ?? 0,
      ratingsCount: c.ratingsCount ?? 0,
    })),
  };
}

function calcAge(isoDate?: string | null) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return Math.max(0, age);
}

// 🔽 junta estas helpers perto das outras (a seguir a calcAge, por exemplo)

function diffMonths(isoDate?: string | null) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
}

function ageLabelFromData(ageYears?: number | null, birthDate?: string | null) {
  // prioridade: valor já calculado → anos; se 0 anos, usar meses por data
  if (typeof ageYears === "number") {
    if (ageYears > 0) return `${ageYears}a`;
    if (ageYears === 0 && birthDate) {
      const m = diffMonths(birthDate);
      return m != null ? (m > 0 ? `${m}m` : "<1m") : "0a";
    }
  }
  // fallback só com a data
  if (birthDate) {
    const y = calcAge(birthDate);
    if (y === 0) {
      const m = diffMonths(birthDate);
      return m != null ? (m > 0 ? `${m}m` : "<1m") : "0a";
    }
    if (y != null) return `${y}a`;
  }
  return "—";
}

function mapGender(g?: string | null) {
  if (!g) return "—";
  const s = g.trim().toUpperCase();
  const MAP: Record<string, string> = {
    M: "Masculino",
    MALE: "Masculino",
    MASCULINO: "Masculino",
    F: "Feminino",
    FEMALE: "Feminino",
    FEMININO: "Feminino",
    NB: "Não-binário",
    N: "Não-binário",
    NONBINARY: "Não-binário",
    NON_BINARY: "Não-binário",
    O: "Outro",
    OTHER: "Outro",
    X: "Não especificado",
    U: "Não especificado",
    UNSPECIFIED: "Não especificado",
  };
  return MAP[s] ?? g; // se vier algo diferente, mostra como veio
}

export default function AdminFamilies() {
  const { user } = useUserSession() as any;

  // ---- Biblioteca do admin (única) ----
  const [library, setLibrary] = useState<LibraryLite | null>(null);
  const [libraryId, setLibraryId] = useState<number | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLibLoading(true);
        const lib = await getMyLibrary();
        if (!lib) {
          setLibrary(null);
          setLibraryId(null);
          setLibErr("Não estás associado a nenhuma biblioteca.");
        } else {
          setLibrary(lib);
          setLibraryId(lib.id);
          setLibErr(null);
        }
      } catch (e: any) {
        setLibrary(null);
        setLibraryId(null);
        setLibErr(e?.message || "Falha a carregar a tua biblioteca.");
      } finally {
        setLibLoading(false);
      }
    })();
  }, [user?.id]);

  // ---- Filtros ----
  const [q, setQ] = useState("");
  const [childQ, setChildQ] = useState("");
  const [gender, setGender] = useState<string>("");
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [hasChildren, setHasChildren] = useState<"all" | "true" | "false">(
    "all"
  );

  const filtersActive = useMemo(
    () =>
      Boolean(
        q || childQ || gender || ageMin || ageMax || hasChildren !== "all"
      ),
    [q, childQ, gender, ageMin, ageMax, hasChildren]
  );

  function clearFilters() {
    setQ("");
    setChildQ("");
    setGender("");
    setAgeMin("");
    setAgeMax("");
    setHasChildren("all");
  }

  // ---- Dados (cursor) ----
  const [items, setItems] = useState<FamilyFullForLib[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // evita que respostas antigas substituam as novas
  const reqSeq = useRef(0);

  async function search(reset = true, signal?: AbortSignal) {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      const seq = ++reqSeq.current;

      const res = await fetchFamiliesAdvanced({
        libraryId,
        q,
        child: childQ,
        gender: gender || undefined,
        ageMin: ageMin ? Number(ageMin) : undefined,
        ageMax: ageMax ? Number(ageMax) : undefined,
        hasChildren,
        limit: 25,
        cursor: reset ? null : cursor,
        signal,
      });

      if (seq !== reqSeq.current) return;

      const normalized = (res.items || []).map(normalizeFamily);
      setItems((prev) => (reset ? normalized : [...prev, ...normalized]));
      setCursor(res.nextCursor ?? null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Falha a carregar.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ AUTO-APLICAR FILTROS (debounce)
  useEffect(() => {
    if (!libraryId) return;
    setCursor(null);

    const controller = new AbortController();
    const t = setTimeout(() => {
      void search(true, controller.signal);
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId, q, childQ, gender, ageMin, ageMax, hasChildren]);

  // ---- Expand de detalhes por família ----
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggleOpen = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const isOpen = (id: number) => openIds.has(id);

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Cabeçalho */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, gap: 1 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Users size={22} />
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Famílias
          </Typography>
          {library && (
            <Chip
              size="small"
              icon={<Building2 size={14} />}
              label={library.name}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Atualizar">
            <span>
              <IconButton
                onClick={() => void search(true)}
                disabled={loading || !libraryId || libLoading}
              >
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {!!libErr && (
        <Typography color="error" sx={{ mb: 2 }}>
          {libErr}
        </Typography>
      )}

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <SlidersHorizontal size={16} />
          <Typography variant="subtitle2" fontWeight={700}>
            Filtros
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          {/* Pesquisas por família */}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Pesquisar por nome/email/telefone/morada…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 320 }}
            />
            <TextField
              size="small"
              label="Filho (nome)"
              value={childQ}
              onChange={(e) => setChildQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <UserRound size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              label="Género (filho)"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              sx={{ minWidth: 180 }}
            />
          </Stack>

          {/* Idades + hasChildren + ações */}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              label="Idade mínima"
              type="number"
              inputProps={{ min: 0, max: 99 }}
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              sx={{ width: 140 }}
            />
            <TextField
              size="small"
              label="Idade máxima"
              type="number"
              inputProps={{ min: 0, max: 99 }}
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              sx={{ width: 140 }}
            />

            <ToggleButtonGroup
              size="small"
              value={hasChildren}
              exclusive
              onChange={(_, v) => v && setHasChildren(v)}
              aria-label="Filtro filhos"
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="true">Com filhos</ToggleButton>
              <ToggleButton value="false">Sem filhos</ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="text"
              onClick={() => clearFilters()}
              disabled={!filtersActive || loading}
              sx={{ ml: 0.5 }}
            >
              Limpar
            </Button>

            <Tooltip
              title={`Filtra famílias desta biblioteca.
• 'Filho (nome)' e 'Género' procuram nos filhos.
• Idade mínima/máxima calculam por data de nascimento.
• 'Com/Sem filhos' filtra pelo número de filhos.
(Os filtros aplicam-se automaticamente.)`}
            >
              <IconButton sx={{ ml: 0.5 }}>
                <Info size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </WhiteCard>

      {/* Lista */}
      <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
        {/* Resumo topo */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {loading
              ? "A carregar…"
              : items.length === 0
              ? "Sem resultados."
              : `A mostrar ${items.length}${cursor ? "+" : ""} famílias`}
          </Typography>
          {filtersActive && (
            <Chip
              size="small"
              variant="outlined"
              icon={<SlidersHorizontal size={14} />}
              label="Filtros ativos"
            />
          )}
        </Stack>

        {!!err && (
          <Typography color="error" sx={{ mb: 1 }}>
            {err}
          </Typography>
        )}

        {!libraryId ? (
          <Typography sx={{ opacity: 0.7 }}>
            {libErr ?? "Sem biblioteca associada."}
          </Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>
            {loading ? "A carregar…" : "Sem resultados."}
          </Typography>
        ) : (
          <>
            <Stack spacing={1.25} divider={<Divider />}>
              {items.map((f) => {
                const open = isOpen(f.id);
                const kids = f.children || [];
                const totalKids =
                  typeof f.childrenCount === "number"
                    ? f.childrenCount
                    : kids.length;

                return (
                  <Box key={f.id}>
                    {/* Linha principal */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.25}
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Avatar sx={{ mr: { md: 0.5 } }}>
                        {initials(f.fullName)}
                      </Avatar>

                      <Box flex={1} minWidth={0}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Typography
                            fontWeight={900}
                            noWrap
                            title={f.fullName}
                            sx={{ maxWidth: { xs: "100%", md: 420 } }}
                          >
                            {f.fullName}
                          </Typography>
                          <Chip
                            size="small"
                            icon={<Users size={14} />}
                            label={`${totalKids} filhos`}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          />
                        </Stack>

                        {/* Contactos/Info rápidos */}
                        <Stack
                          direction="row"
                          spacing={1.5}
                          useFlexGap
                          flexWrap="wrap"
                          sx={{ mt: 0.5 }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              opacity: 0.9,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Mail size={14} />{" "}
                            <a href={`mailto:${f.email}`}>{f.email}</a>
                          </Typography>
                          {f.phone && (
                            <Typography
                              variant="body2"
                              sx={{
                                opacity: 0.9,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Phone size={14} />{" "}
                              <a href={`tel:${f.phone}`}>{f.phone}</a>
                            </Typography>
                          )}
                          {f.address && (
                            <Typography
                              variant="body2"
                              sx={{
                                opacity: 0.9,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <MapPin size={14} /> {f.address}
                            </Typography>
                          )}
                        </Stack>

                        {/* Chips de filhos (resumo) */}
                        {kids.length > 0 && (
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mt: 0.75 }}
                          >
                            {kids.slice(0, 6).map((c) => (
                              <Tooltip
                                key={c.id}
                                title={`Leituras: ${
                                  c.readingsCount ?? 0
                                } • Avaliações: ${c.ratingsCount ?? 0}`}
                              >
                                <Chip
                                  size="small"
                                  label={
                                    c.name
                                      ? `${c.name} (${ageLabelFromData(
                                          c.ageYears,
                                          c.birthDate
                                        )})`
                                      : `#${c.id} (${ageLabelFromData(
                                          c.ageYears,
                                          c.birthDate
                                        )})`
                                  }
                                  variant="outlined"
                                  sx={{ borderRadius: 2 }}
                                />
                              </Tooltip>
                            ))}
                            {kids.length > 6 && (
                              <Chip
                                size="small"
                                label={`+${kids.length - 6} filhos`}
                                variant="outlined"
                                sx={{ borderRadius: 2 }}
                              />
                            )}
                          </Stack>
                        )}
                      </Box>

                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Button
                          size="small"
                          onClick={() => toggleOpen(f.id)}
                          endIcon={
                            open ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )
                          }
                        >
                          {open ? "Ocultar detalhes" : "Ver detalhes"}
                        </Button>
                        <RouteLink href={`/librarian/familias`}>
                          <ExternalLink size={16} style={{ marginRight: 6 }} />
                          Abrir gestão
                        </RouteLink>
                      </Stack>
                    </Stack>

                    {/* Detalhes (expand) */}
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1.25, pl: { xs: 0, md: 7 } }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mb: 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <CalendarDays size={16} /> Filhos
                        </Typography>

                        {kids.length === 0 ? (
                          <Typography sx={{ opacity: 0.7 }}>
                            {totalKids > 0 ? (
                              <>
                                Existem <b>{totalKids}</b> filho(s) registados,
                                mas esta consulta não devolveu a lista
                                detalhada. (Se adicionares suporte a{" "}
                                <code>?expand=children</code> no backend, os
                                detalhes aparecem aqui.)
                              </>
                            ) : (
                              "Sem filhos registados."
                            )}
                          </Typography>
                        ) : (
                          <TableContainer>
                            <Table size="small" aria-label="filhos">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Nome</TableCell>
                                  <TableCell>Data nasc.</TableCell>
                                  <TableCell align="right">Idade</TableCell>
                                  <TableCell>Género</TableCell>
                                  <TableCell align="right">Leituras</TableCell>
                                  <TableCell align="right">
                                    Avaliações
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {kids.map((c) => {
                                  const born =
                                    c.birthDate &&
                                    !isNaN(new Date(c.birthDate).getTime())
                                      ? new Date(c.birthDate)
                                      : null;
                                  const age =
                                    typeof c.ageYears === "number"
                                      ? c.ageYears
                                      : born
                                      ? calcAge(c.birthDate)
                                      : null;
                                  return (
                                    <TableRow key={c.id} hover>
                                      <TableCell>
                                        {c.name || `#${c.id}`}
                                      </TableCell>
                                      <TableCell>
                                        {born
                                          ? born.toLocaleDateString("pt-PT")
                                          : "—"}
                                      </TableCell>
                                      <TableCell align="right">
                                        {ageLabelFromData(
                                          c.ageYears,
                                          c.birthDate
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {mapGender(c.gender)}
                                      </TableCell>
                                      <TableCell align="right">
                                        {c.readingsCount ?? 0}
                                      </TableCell>
                                      <TableCell align="right">
                                        {c.ratingsCount ?? 0}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Stack>

            {!!cursor && !!libraryId && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1.25 }}>
                <Button
                  variant="outlined"
                  startIcon={<ChevronDown size={16} />}
                  onClick={() => void search(false)}
                  disabled={loading}
                >
                  Ver mais
                </Button>
              </Box>
            )}
          </>
        )}
      </WhiteCard>
    </Container>
  );
}

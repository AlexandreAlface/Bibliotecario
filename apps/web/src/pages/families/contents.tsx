// ====================== apps/web/src/pages/FamilyContentsPage.tsx ======================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 *
 * Página: Conteúdos & Biblioterapia (famílias)
 *
 * Objetivos do refactor:
 *  - Helpers PUROS (assinalados com "PURE") e com menos de 30 linhas
 *  - Handlers/efeitos curtos e defensivos (try/catch, checks)
 *  - Comentários claros por secção e componente
 *  - Pequenas melhorias de acessibilidade (aria-labels) e UX
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Chip,
  Container,
  Pagination,
  Stack,
  TextField,
  Typography,
  Button,
  MenuItem,
  Card,
  CardContent,
  CardMedia,
  Tooltip,
  LinearProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { WhiteCard, PrimaryButton } from "@bibliotecario/ui-web";

import {
  listMicroContentsPublic,
  markMicroContentSeen,
} from "@/services/microcontent";
import type { MicroContentItem } from "@/services/microcontent";

/* =====================================================================================
   Ícones
   ===================================================================================== */
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import TagRounded from "@mui/icons-material/TagRounded";
import LocalLibraryRounded from "@mui/icons-material/LocalLibraryRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DoneAllRounded from "@mui/icons-material/DoneAllRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import FilterAltOffRounded from "@mui/icons-material/FilterAltOffRounded";

/* =====================================================================================
   Tipos e constantes
   ===================================================================================== */

const TYPES: MicroContentItem["type"][] = [
  "BIBLIOTERAPIA",
  "DICA",
  "FACTO",
  "OUTRO",
];

type LibraryLite = { id: number; name: string };

/* =====================================================================================
   Helpers (PUROS / <30 linhas)
   ===================================================================================== */

/** PURE: ícone consoante o tipo de microconteúdo */
function typeIcon(t?: string) {
  switch (t) {
    case "BIBLIOTERAPIA":
      return <PsychologyRounded fontSize="small" />;
    case "DICA":
      return <TipsAndUpdatesRounded fontSize="small" />;
    case "FACTO":
      return <FactCheckRounded fontSize="small" />;
    default:
      return <MoreHorizRounded fontSize="small" />;
  }
}

/** PURE: cor do chip consoante o tipo de microconteúdo */
function typeChipColor(
  t?: string
): "default" | "primary" | "success" | "warning" {
  switch (t) {
    case "BIBLIOTERAPIA":
      return "success";
    case "DICA":
      return "primary";
    case "FACTO":
      return "warning";
    default:
      return "default";
  }
}

/** PURE: determina se um microconteúdo já foi visto */
function isSeen(mc: MicroContentItem): boolean {
  return (
    (mc as any).seen === true || Number((mc as any).interactionsCount || 0) > 0
  );
}

/** PURE: compõe e deduplica tags a partir de resposta e itens */
function buildTagOptions(res: any): string[] {
  const baseTags = Array.isArray(res?.tags) ? (res.tags as unknown[]) : [];
  const itemTags = ((res?.items || []) as unknown[]).flatMap((mc: any) =>
    Array.isArray(mc?.tags) ? mc.tags : []
  );
  const all = [...baseTags, ...itemTags].filter(
    (t): t is string => typeof t === "string"
  );
  return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
}

/** PURE: extrai bibliotecas únicas a partir dos itens */
function extractLibraries(items: MicroContentItem[]): LibraryLite[] {
  const map = new Map<number, LibraryLite>();
  for (const mc of items) {
    const lib = (mc as any)?.library;
    if (lib?.id) {
      const id = Number(lib.id);
      if (!map.has(id)) {
        map.set(id, { id, name: String(lib.name || `Biblioteca #${id}`) });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/* =====================================================================================
   Página principal
   ===================================================================================== */

export default function FamilyContentsPage() {
  // ---------------- Estado base ----------------
  const [items, setItems] = useState<MicroContentItem[]>([]);
  const [total, setTotal] = useState(0);

  // paginação
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // filtros
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [libraryId, setLibraryId] = useState<string>("");

  // meta (tags/bibliotecas)
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);

  // feedback
  const [loading, setLoading] = useState(false);

  // ---------------- Loader (curto) ----------------
  /**
   * Carrega conteúdos com filtros e página atual.
   * Divide responsabilidades: tags e bibliotecas são calculadas por helpers PUROS.
   */
  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const res: any = await listMicroContentsPublic({
          q: q || undefined,
          type: type || undefined,
          tag: tag || undefined,
          libraryId: libraryId ? Number(libraryId) : undefined,
          page: p,
          limit,
        });

        const nextItems = (res.items || []) as MicroContentItem[];
        setItems(nextItems);
        setTotal(Number(res.total || 0));
        setTagOptions(buildTagOptions(res));
        setLibraries(extractLibraries(nextItems));
      } finally {
        setLoading(false);
      }
    },
    [q, type, tag, libraryId, page, limit]
  );

  // ---------------- Efeitos ----------------
  // pesquisa automática quando muda página/tipo/biblioteca
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, libraryId]);

  // debounce ao escrever em q/tag
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tag]);

  // total de páginas
  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  /* ===================================================================================
     UI
     =================================================================================== */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <WhiteCard>
        <Stack spacing={2}>
          {/* Cabeçalho */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <PsychologyRounded />
                Conteúdos & Biblioterapia
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
                <InfoOutlined fontSize="small" />
                Dicas, biblioterapia e conteúdos associados a livros.
              </Typography>

              {!!total && (
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.7, display: "flex", gap: 0.5, mt: 0.25 }}
                >
                  <LibraryBooksRounded fontSize="inherit" />
                  {total} resultado{total === 1 ? "" : "s"}
                </Typography>
              )}
            </Box>

            <Tooltip title="Atualizar lista">
              <span>
                <PrimaryButton
                  startIcon={<RefreshRounded />}
                  onClick={() => {
                    setPage(1);
                    load(1);
                  }}
                >
                  Atualizar
                </PrimaryButton>
              </span>
            </Tooltip>
          </Stack>

          {/* Filtros */}
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {/* Pesquisa textual */}
              <TextField
                size="small"
                placeholder="Pesquisar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ minWidth: 260 }}
                aria-label="Pesquisar conteúdos"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Tipo */}
              <TextField
                select
                size="small"
                label="Tipo"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                sx={{ width: 220 }}
              >
                <MenuItem value="">
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <MoreHorizRounded fontSize="small" />
                    Todos
                  </Box>
                </MenuItem>
                {TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {typeIcon(t)}
                      {t}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {/* Tag (única) */}
              <TextField
                select
                size="small"
                label="Tag"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setPage(1);
                }}
                sx={{ width: 240 }}
              >
                <MenuItem value="">
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <TagRounded fontSize="small" />
                    Todas
                  </Box>
                </MenuItem>
                {tagOptions.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <TagRounded fontSize="small" />
                      {t}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {/* Biblioteca */}
              <TextField
                select
                size="small"
                label="Biblioteca"
                value={libraryId}
                onChange={(e) => {
                  setLibraryId(e.target.value);
                  setPage(1);
                }}
                sx={{ width: 260 }}
              >
                <MenuItem value="">
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LocalLibraryRounded fontSize="small" />
                    Todas
                  </Box>
                </MenuItem>
                {libraries.map((lib) => (
                  <MenuItem key={lib.id} value={String(lib.id)}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <LocalLibraryRounded fontSize="small" />
                      {lib.name}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {/* Limpar filtros */}
              <Button
                size="small"
                variant="text"
                startIcon={<FilterAltOffRounded />}
                onClick={() => {
                  setQ("");
                  setType("");
                  setTag("");
                  setLibraryId("");
                  setPage(1);
                  load(1);
                }}
              >
                Limpar
              </Button>
            </Stack>

            {/* Tag cloud rápida (apenas uma ativa) */}
            {tagOptions.length > 0 && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>
                    Tags populares:
                  </Typography>
                  {tagOptions.slice(0, 10).map((t) => {
                    const active = tag === t;
                    return (
                      <Chip
                        key={t}
                        size="small"
                        icon={<TagRounded fontSize="small" />}
                        label={t}
                        variant={active ? "filled" : "outlined"}
                        color={active ? "primary" : "default"}
                        onClick={() => {
                          setTag(active ? "" : t);
                          setPage(1);
                        }}
                      />
                    );
                  })}
                </Stack>
              </>
            )}
          </Stack>

          {/* Loading */}
          {loading && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress />
            </Box>
          )}

          {/* Lista de conteúdos */}
          <Grid container spacing={2}>
            {items.map((mc) => {
              const seen = isSeen(mc);

              return (
                <Grid item key={mc.id} xs={12} md={6}>
                  <WhiteCard sx={{ p: 2, height: "100%" }}>
                    <Stack spacing={1}>
                      {/* Chips de meta */}
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Chip
                          size="small"
                          color={typeChipColor(mc.type)}
                          icon={typeIcon(mc.type)}
                          label={mc.type}
                          variant="filled"
                        />
                        {mc.tags.map((t) => (
                          <Chip
                            key={`${mc.id}-${t}`}
                            size="small"
                            icon={<TagRounded fontSize="small" />}
                            label={t}
                            variant="outlined"
                            onClick={() => {
                              // clicar num tag aplica-o ao filtro
                              setTag(t);
                              setPage(1);
                            }}
                          />
                        ))}
                        {mc.library ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<LocalLibraryRounded fontSize="small" />}
                            label={mc.library.name}
                          />
                        ) : null}
                        {seen ? (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleRounded fontSize="small" />}
                            label="Visto"
                            variant="filled"
                          />
                        ) : null}
                      </Stack>

                      {/* Texto principal */}
                      <Typography sx={{ whiteSpace: "pre-wrap" }}>
                        {mc.text}
                      </Typography>

                      {/* Livros associados */}
                      {!!mc.books?.length && (
                        <Stack spacing={1}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <LibraryBooksRounded fontSize="small" />
                            Livros relacionados
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                          >
                            {mc.books.map((b) => (
                              <Card key={b.isbn} sx={{ width: 160 }}>
                                {b.coverUrl ? (
                                  <CardMedia
                                    component="img"
                                    height="140"
                                    image={b.coverUrl}
                                    alt={b.title}
                                    sx={{ objectFit: "cover" }}
                                  />
                                ) : null}
                                <CardContent sx={{ p: 1.25 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                    title={b.title}
                                  >
                                    {b.title}
                                  </Typography>
                                  {b.summary ? (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        opacity: 0.75,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {b.summary}
                                    </Typography>
                                  ) : null}
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </Stack>
                      )}

                      {/* Ação: marcar como visto */}
                      <Stack direction="row" spacing={1}>
                        <Tooltip
                          title={
                            seen ? "Já marcado como visto" : "Marcar como visto"
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              startIcon={
                                seen ? (
                                  <CheckCircleRounded />
                                ) : (
                                  <DoneAllRounded />
                                )
                              }
                              onClick={async () => {
                                if (seen) return;
                                try {
                                  await markMicroContentSeen(mc.id);
                                  setItems((arr) =>
                                    arr.map((x) =>
                                      x.id === mc.id
                                        ? ({ ...x, seen: true } as any)
                                        : x
                                    )
                                  );
                                } catch {
                                  // silencioso: falha de rede não deve quebrar a UI
                                }
                              }}
                              disabled={seen}
                              aria-label={
                                seen
                                  ? "Conteúdo visto"
                                  : "Marcar conteúdo como visto"
                              }
                            >
                              {seen ? "Visto" : "Marcar como visto"}
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </WhiteCard>
                </Grid>
              );
            })}
          </Grid>

          {/* Paginação */}
          <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
            <Pagination
              count={pages}
              page={page}
              onChange={(_, p) => setPage(p)}
              shape="rounded"
              color="primary"
              aria-label="Paginação de conteúdos"
            />
          </Stack>
        </Stack>
      </WhiteCard>
    </Container>
  );
}

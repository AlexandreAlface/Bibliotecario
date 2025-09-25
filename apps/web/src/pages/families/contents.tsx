import { useEffect, useState } from "react";
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
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { WhiteCard, PrimaryButton } from "@bibliotecario/ui-web";
import {
  listMicroContentsPublic,
  markMicroContentSeen,
} from "@/services/microcontent";

import type { MicroContentItem } from "@/services/microcontent";

const TYPES: MicroContentItem["type"][] = [
  "BIBLIOTERAPIA",
  "DICA",
  "FACTO",
  "OUTRO",
];

type LibraryLite = { id: number; name: string };

export default function FamilyContentsPage() {
  const [items, setItems] = useState<MicroContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [libraryId, setLibraryId] = useState<string>("");

  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);

  async function load(p = page) {
    const res: any = await listMicroContentsPublic({
      q: q || undefined,
      type: type || undefined,
      tag: tag || undefined,
      libraryId: libraryId ? Number(libraryId) : undefined,
      page: p,
      limit,
    });

    setItems(res.items as MicroContentItem[]);
    setTotal(Number(res.total || 0));

    // ---- opções de tags (tipado) ----
    const rawTags: string[] = [
      ...((Array.isArray(res.tags) ? res.tags : []) as unknown[]),
      ...(((res.items || []) as unknown[]).flatMap((mc: any) =>
        Array.isArray(mc?.tags) ? mc.tags : []
      ) as unknown[]),
    ].filter((t): t is string => typeof t === "string");

    const dedupTags: string[] = Array.from(new Set(rawTags)).sort((a, b) =>
      a.localeCompare(b)
    );
    setTagOptions(dedupTags);

    // ---- opções de bibliotecas (deduzidas dos conteúdos) ----
    const libs: LibraryLite[] = Array.from(
      new Map(
        ((res.items || []) as any[])
          .map((mc) =>
            mc?.library?.id
              ? [mc.library.id, { id: Number(mc.library.id), name: String(mc.library.name || `Biblioteca #${mc.library.id}`) }]
              : null
          )
          .filter(Boolean) as [number, LibraryLite][]
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
    setLibraries(libs);
  }

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

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <WhiteCard>
        <Stack spacing={2}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4" fontWeight={900}>
                Conteúdos & Biblioterapia
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Dicas, biblioterapia e conteúdos associados a livros.
              </Typography>
            </Box>
            <PrimaryButton
              onClick={() => {
                setPage(1);
                load(1);
              }}
            >
              Atualizar
            </PrimaryButton>
          </Stack>

          {/* Filtros */}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Pesquisar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 260 }}
            />

            <TextField
              select
              size="small"
              label="Tipo"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              sx={{ width: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Tag"
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setPage(1);
              }}
              sx={{ width: 220 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {tagOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Biblioteca"
              value={libraryId}
              onChange={(e) => {
                setLibraryId(e.target.value);
                setPage(1);
              }}
              sx={{ width: 240 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {libraries.map((lib) => (
                <MenuItem key={lib.id} value={String(lib.id)}>
                  {lib.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Lista */}
          <Grid container spacing={2}>
            {items.map((mc) => {
              const seen =
                (mc as any).seen === true ||
                Number((mc as any).interactionsCount || 0) > 0;

              return (
                <Grid item key={mc.id} xs={12} md={6}>
                  <WhiteCard sx={{ p: 2, height: "100%" }}>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Chip size="small" label={mc.type} />
                        {mc.tags.map((t) => (
                          <Chip
                            key={t}
                            size="small"
                            label={t}
                            variant="outlined"
                          />
                        ))}
                        {mc.library ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`Biblioteca: ${mc.library.name}`}
                          />
                        ) : null}
                        {seen ? (
                          <Chip
                            size="small"
                            color="success"
                            label="Visto"
                            variant="filled"
                          />
                        ) : null}
                      </Stack>

                      <Typography sx={{ whiteSpace: "pre-wrap" }}>
                        {mc.text}
                      </Typography>

                      {/* Livros associados */}
                      {!!mc.books?.length && (
                        <Stack spacing={1}>
                          <Typography variant="subtitle2">
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

                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          onClick={async () => {
                            if (seen) return;
                            await markMicroContentSeen(mc.id);
                            setItems((arr) =>
                              arr.map((x) =>
                                x.id === mc.id
                                  ? ({ ...x, seen: true } as any)
                                  : x
                              )
                            );
                          }}
                          disabled={seen}
                        >
                          {seen ? "Visto" : "Marcar como visto"}
                        </Button>
                      </Stack>
                    </Stack>
                  </WhiteCard>
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" justifyContent="center">
            <Pagination
              count={pages}
              page={page}
              onChange={(_, p) => setPage(p)}
            />
          </Stack>
        </Stack>
      </WhiteCard>
    </Container>
  );
}

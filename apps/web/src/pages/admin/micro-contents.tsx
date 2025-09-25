import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Pagination,
  FormControlLabel,
  Switch,
  MenuItem,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  adminCreateMicroContent,
  adminDeleteMicroContent,
  adminListMicroContents,
  adminUpdateMicroContent,
} from "@/services/microcontent";
import type { MicroContentItem } from "@/services/microcontent";
import { WhiteCard } from "@bibliotecario/ui-web";
import { api } from "@/services/https";

const TYPES: MicroContentItem["type"][] = [
  "BIBLIOTERAPIA",
  "DICA",
  "FACTO",
  "OUTRO",
];

function TagInput({
  value,
  onChange,
  label = "Tags",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
}) {
  const [txt, setTxt] = useState("");
  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
        {value.map((t, i) => (
          <Chip key={t + i} label={t} onDelete={() => onChange(value.filter((x) => x !== t))} />
        ))}
      </Stack>
      <TextField
        size="small"
        fullWidth
        placeholder="Escreve e carrega Enter…"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = txt.trim();
            if (v && !value.includes(v)) onChange([...value, v]);
            setTxt("");
          }
        }}
        sx={{ mt: 1 }}
      />
    </Box>
  );
}

function IsbnListInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [txt, setTxt] = useState("");
  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        ISBNs associados
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
        {value.map((t, i) => (
          <Chip key={t + i} label={t} onDelete={() => onChange(value.filter((x) => x !== t))} />
        ))}
      </Stack>
      <TextField
        size="small"
        fullWidth
        placeholder="Introduz um ISBN e Enter…"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = txt.trim();
            if (v && !value.includes(v)) onChange([...value, v]);
            setTxt("");
          }
        }}
        sx={{ mt: 1 }}
      />
    </Box>
  );
}

type EditState =
  | { open: false }
  | {
      open: true;
      data: {
        id?: number;
        text: string;
        type: MicroContentItem["type"];
        isPublished: boolean;
        libraryId?: number | null;
        tags: string[];
        bookIsbns: string[];
        publishedAt?: string | null;
      };
    };

type LibraryLite = { id: number; name: string };

export default function AdminMicroContentsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [libraryId, setLibraryId] = useState<string>("");

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MicroContentItem[]>([]);
  const [total, setTotal] = useState(0);

  const [libraries, setLibraries] = useState<LibraryLite[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  async function load(p = page) {
    setLoading(true);
    try {
      const res: any = await adminListMicroContents({
        q: q || undefined,
        type: type || undefined,
        tag: tag || undefined,
        libraryId: libraryId ? Number(libraryId) : undefined,
        page: p,
        limit,
      });
      setItems(res.items as MicroContentItem[]);
      setTotal(Number(res.total || 0));

      // tags (tipado)
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
    } finally {
      setLoading(false);
    }
  }

  // carregar bibliotecas para o select
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<any>("/admin/libraries", {
          withCredentials: true,
        });
        const arr: any[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        const libs: LibraryLite[] = arr
          .map((x) => ({
            id: Number(x.id),
            name: String(x.name ?? `Biblioteca #${x.id}`),
          }))
          .filter((x) => Number.isFinite(x.id));
        setLibraries(libs);
      } catch {
        // silencioso
      }
    })();
  }, []);

  // pesquisa imediata quando muda página / tipo / biblioteca
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, libraryId]);

  // debounce quando escreves em q/tag
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tag]);

  const header = useMemo(
    () => (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Pesquisar texto ou tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchRounded fontSize="small" /> }}
          sx={{ minWidth: 280 }}
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
          sx={{ minWidth: 160 }}
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
          sx={{ minWidth: 200 }}
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
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {libraries.map((lib) => (
            <MenuItem key={lib.id} value={String(lib.id)}>
              {lib.name}
            </MenuItem>
          ))}
        </TextField>

        <Box flex={1} />
        <Button
          startIcon={<AddRounded />}
          variant="contained"
          onClick={() =>
            setEdit({
              open: true,
              data: {
                text: "",
                type: "BIBLIOTERAPIA",
                isPublished: true,
                libraryId: undefined,
                tags: [],
                bookIsbns: [],
                publishedAt: null,
              },
            })
          }
        >
          Novo conteúdo
        </Button>
      </Stack>
    ),
    [q, type, tag, tagOptions, libraryId, libraries]
  );

  const [edit, setEdit] = useState<EditState>({ open: false });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <WhiteCard>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={900}>
            Micro-conteúdos (Biblioterapia)
          </Typography>
          {header}
          {loading && <LinearProgress />}
          <Stack spacing={1}>
            {items.map((mc) => (
              <WhiteCard key={mc.id} sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={2} justifyContent="space-between">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip size="small" label={mc.type} />
                      {mc.tags.map((t) => (
                        <Chip key={t} size="small" label={t} variant="outlined" />
                      ))}
                      {mc.library && (
                        <Chip
                          size="small"
                          label={`Biblioteca: ${mc.library.name}`}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography sx={{ whiteSpace: "pre-wrap" }}>{mc.text}</Typography>
                    {!!mc.books?.length && (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                        {mc.books.map((b) => (
                          <Chip
                            key={b.isbn}
                            label={`${b.isbn} — ${b.title}`}
                            avatar={
                              b.coverUrl ? (
                                <img
                                  alt=""
                                  src={b.coverUrl}
                                  style={{ width: 24, height: 24, borderRadius: 4 }}
                                />
                              ) : undefined
                            }
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <IconButton
                      onClick={() =>
                        setEdit({
                          open: true,
                          data: {
                            id: mc.id,
                            text: mc.text,
                            type: mc.type,
                            tags: mc.tags,
                            isPublished: mc.isPublished ?? true,
                            libraryId: mc.library?.id ?? null,
                            bookIsbns: mc.books?.map((b) => b.isbn) ?? [],
                            publishedAt: mc.publishedAt ?? null,
                          },
                        })
                      }
                    >
                      <EditRounded />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={async () => {
                        if (!confirm("Apagar este conteúdo?")) return;
                        await adminDeleteMicroContent(mc.id);
                        load();
                      }}
                    >
                      <DeleteRounded />
                    </IconButton>
                  </Stack>
                </Stack>
              </WhiteCard>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
            <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        </Stack>
      </WhiteCard>

      {/* Dialog de edição/criação */}
      {edit.open && (
        <Dialog open onClose={() => setEdit({ open: false })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 900 }}>
            {edit.data.id ? "Editar conteúdo" : "Novo conteúdo"}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                multiline
                minRows={4}
                label="Texto"
                value={edit.data.text}
                onChange={(e) =>
                  setEdit((s) =>
                    s.open ? { ...s, data: { ...s.data, text: e.target.value } } : s
                  )
                }
                fullWidth
              />
              <TextField
                select
                label="Tipo"
                value={edit.data.type}
                onChange={(e) =>
                  setEdit((s) =>
                    s.open ? { ...s, data: { ...s.data, type: e.target.value as any } } : s
                  )
                }
                fullWidth
              >
                {TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={!!edit.data.isPublished}
                    onChange={(e) =>
                      setEdit((s) =>
                        s.open
                          ? { ...s, data: { ...s.data, isPublished: e.target.checked } }
                          : s
                      )
                    }
                  />
                }
                label="Publicado"
              />

              <TextField
                select
                label="Biblioteca"
                value={edit.data.libraryId == null ? "" : String(edit.data.libraryId)}
                onChange={(e) =>
                  setEdit((s) =>
                    s.open
                      ? {
                          ...s,
                          data: {
                            ...s.data,
                            libraryId: e.target.value ? Number(e.target.value) : null,
                          },
                        }
                      : s
                  )
                }
                fullWidth
              >
                <MenuItem value="">(nenhuma)</MenuItem>
                {libraries.map((lib) => (
                  <MenuItem key={lib.id} value={String(lib.id)}>
                    {lib.name}
                  </MenuItem>
                ))}
              </TextField>

              <TagInput
                value={edit.data.tags}
                onChange={(tags) =>
                  setEdit((s) => (s.open ? { ...s, data: { ...s.data, tags } } : s))
                }
              />
              <IsbnListInput
                value={edit.data.bookIsbns}
                onChange={(bookIsbns) =>
                  setEdit((s) => (s.open ? { ...s, data: { ...s.data, bookIsbns } } : s))
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEdit({ open: false })}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={async () => {
                const payload = {
                  text: edit.data.text,
                  type: edit.data.type,
                  tags: edit.data.tags,
                  libraryId:
                    edit.data.libraryId === undefined
                      ? undefined
                      : edit.data.libraryId ?? null,
                  bookIsbns: edit.data.bookIsbns,
                  isPublished: !!edit.data.isPublished,
                };
                if (edit.data.id) {
                  await adminUpdateMicroContent(edit.data.id, payload);
                } else {
                  await adminCreateMicroContent(payload);
                }
                setEdit({ open: false });
                load();
              }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

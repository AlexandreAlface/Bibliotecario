// apps/web/src/pages/admin/MicroContents.tsx
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
  Tooltip,
  Divider,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import LocalOfferRounded from "@mui/icons-material/LocalOfferRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import UnpublishedOutlined from "@mui/icons-material/UnpublishedOutlined";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";
import VolunteerActivismRounded from "@mui/icons-material/VolunteerActivismRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import LabelRounded from "@mui/icons-material/LabelRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";

import {
  adminCreateMicroContent,
  adminDeleteMicroContent,
  adminListMicroContents,
  adminUpdateMicroContent,
} from "@/services/microcontent";
import type { MicroContentItem } from "@/services/microcontent";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { getMyLibrary, type LibraryLite } from "@/services/admin";

const TYPES: MicroContentItem["type"][] = [
  "BIBLIOTERAPIA",
  "DICA",
  "FACTO",
  "OUTRO",
];

/* --------------------- UI helpers --------------------- */
const TYPE_META: Record<
  MicroContentItem["type"],
  {
    label: string;
    color: "success" | "info" | "secondary" | "default";
    Icon: typeof LightbulbRounded;
  }
> = {
  BIBLIOTERAPIA: {
    label: "Biblioterapia",
    color: "success",
    Icon: VolunteerActivismRounded,
  },
  DICA: { label: "Dica", color: "info", Icon: LightbulbRounded },
  FACTO: { label: "Facto", color: "secondary", Icon: FactCheckRounded },
  OUTRO: { label: "Outro", color: "default", Icon: LabelRounded },
};

function TypeChip({ type }: { type: MicroContentItem["type"] }) {
  const meta = TYPE_META[type];
  const Ico = meta.Icon;
  return (
    <Chip
      size="small"
      color={meta.color}
      icon={<Ico fontSize="small" />}
      label={meta.label}
    />
  );
}

function TagGroup({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      useFlexGap
      flexWrap="wrap"
    >
      <LocalOfferRounded fontSize="small" style={{ opacity: 0.7 }} />
      {tags.map((t) => (
        <Chip
          key={t}
          size="small"
          variant="outlined"
          label={t}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Stack>
  );
}

/* Mini-card do livro com capa maior */
function BookCard({
  isbn,
  title,
  coverUrl,
}: {
  isbn: string;
  title: string;
  coverUrl?: string | null;
}) {
  const theme = useTheme();
  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        pr: 1.25,
        borderRadius: 2,
        overflow: "hidden",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 80,
          bgcolor: "action.hover",
          backgroundImage: coverUrl ? `url(${coverUrl})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          flexShrink: 0,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap title={title}>
          {title || "—"}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ opacity: 0.8 }}
        >
          <AutoStoriesRounded fontSize="inherit" />
          <Typography variant="caption" noWrap>
            {isbn}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

/* --------------------- Inputs com tokenização --------------------- */
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

  function pushTokens(s: string) {
    const tokens = s
      .split(/[,\n;]+/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replace(/\s+/g, " "))
      .map((t) => t.slice(0, 64));
    if (!tokens.length) return;
    const set = new Set(value);
    tokens.forEach((t) => set.add(t));
    onChange(Array.from(set));
  }

  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 0.5 }}
      >
        {value.map((t, i) => (
          <Chip
            key={t + i}
            label={t}
            onDelete={() => onChange(value.filter((x) => x !== t))}
            color="primary"
            variant="outlined"
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        fullWidth
        placeholder="Escreve tags (Enter, vírgula ou ;)"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === ";") {
            e.preventDefault();
            pushTokens(txt);
            setTxt("");
          }
        }}
        onBlur={() => {
          if (txt.trim()) {
            pushTokens(txt);
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

  function pushIsbns(s: string) {
    const tokens = s
      .split(/[,\s;]+/g)
      .map((t) => t.replace(/[-\s]/g, "").toUpperCase())
      .filter(Boolean)
      .filter((t) => /^\d{13}$|^\d{9}(\d|X)$/.test(t));
    if (!tokens.length) return;
    const set = new Set(value);
    tokens.forEach((t) => set.add(t));
    onChange(Array.from(set));
  }

  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        ISBNs associados
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 0.5 }}
      >
        {value.map((t, i) => (
          <Chip
            key={t + i}
            label={t}
            onDelete={() => onChange(value.filter((x) => x !== t))}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        fullWidth
        placeholder="Cole/introduza ISBNs (Enter, espaço, vírgula ou ;)"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" ||
            e.key === " " ||
            e.key === "," ||
            e.key === ";"
          ) {
            e.preventDefault();
            pushIsbns(txt);
            setTxt("");
          }
        }}
        onBlur={() => {
          if (txt.trim()) {
            pushIsbns(txt);
            setTxt("");
          }
        }}
        sx={{ mt: 1 }}
      />
    </Box>
  );
}

/* --------------------- Page --------------------- */
type EditState =
  | { open: false }
  | {
      open: true;
      data: {
        id?: number;
        text: string;
        type: MicroContentItem["type"];
        isPublished: boolean;
        tags: string[];
        bookIsbns: string[];
        publishedAt?: string | null;
      };
    };

export default function AdminMicroContentsPage() {
  const { user } = useUserSession() as any;
  const theme = useTheme();

  // Biblioteca do admin
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libErr, setLibErr] = useState<string | null>(null);
  const [libLoading, setLibLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLibLoading(true);
        const lib = await getMyLibrary();
        if (!lib) {
          setMyLib(null);
          setLibErr("Não estás associado a nenhuma biblioteca.");
        } else {
          setMyLib(lib);
          setLibErr(null);
        }
      } catch (e: any) {
        setMyLib(null);
        setLibErr(e?.message || "Falha a carregar a tua biblioteca.");
      } finally {
        setLibLoading(false);
      }
    })();
  }, [user?.id]);

  // Filtros
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [tag, setTag] = useState<string>("");

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MicroContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  async function load(p = page) {
    if (!myLib?.id) return;
    setLoading(true);
    try {
      const res: any = await adminListMicroContents({
        q: q || undefined,
        type: type || undefined,
        tag: tag || undefined,
        libraryId: myLib.id, // scoped à biblioteca do admin
        page: p,
        limit,
      });
      setItems(res.items as MicroContentItem[]);
      setTotal(Number(res.total || 0));

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

  useEffect(() => {
    if (!myLib?.id) return;
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, myLib?.id]);

  useEffect(() => {
    if (!myLib?.id) return;
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tag, myLib?.id]);

  const header = useMemo(
    () => (
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        sx={{
          pb: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ mr: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {libLoading ? (
              "A carregar biblioteca…"
            ) : myLib ? (
              <>
                <LibraryBooksRounded
                  fontSize="small"
                  style={{ verticalAlign: "text-bottom" }}
                />{" "}
                Biblioteca: <b>{myLib.name}</b>
              </>
            ) : (
              libErr || "—"
            )}
          </Typography>
        </Box>

        <TextField
          size="small"
          placeholder="Pesquisar texto ou tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchRounded fontSize="small" /> }}
          sx={{ minWidth: 320 }}
          disabled={!myLib?.id}
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
          sx={{ minWidth: 180 }}
          disabled={!myLib?.id}
        >
          <MenuItem value="">Todos</MenuItem>
          {TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {TYPE_META[t].label}
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
          disabled={!myLib?.id}
        >
          <MenuItem value="">Todas</MenuItem>
          {tagOptions.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>

        <Box flex={1} />
        <Tooltip title="Recarregar">
          <span>
            <IconButton
              onClick={() => void load()}
              disabled={loading || !myLib?.id}
            >
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
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
                tags: [],
                bookIsbns: [],
                publishedAt: null,
              },
            })
          }
          disabled={!myLib?.id}
        >
          Novo conteúdo
        </Button>
      </Stack>
    ),
    [q, type, tag, tagOptions, myLib, libLoading, libErr, loading]
  );

  const [edit, setEdit] = useState<EditState>({ open: false });

  return (
    // layout FLUIDO: ocupa toda a largura; conteúdo respirável
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{
              letterSpacing: 0.3,
              pb: 0.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            Micro-conteúdos (Biblioterapia)
          </Typography>

          {header}
          {loading && <LinearProgress />}

          {!myLib?.id ? (
            <Typography sx={{ opacity: 0.8, py: 2 }}>
              {libLoading
                ? "A carregar…"
                : libErr || "Sem biblioteca associada."}
            </Typography>
          ) : (
            <>
              <Stack spacing={1.25}>
                {items.map((mc) => {
                  const meta = TYPE_META[mc.type];
                  const pubChip = mc.isPublished ? (
                    <Chip
                      size="small"
                      color="success"
                      icon={<CheckCircleRounded />}
                      label="Publicado"
                      sx={{ borderRadius: 2 }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<UnpublishedOutlined />}
                      label="Rascunho"
                      sx={{ borderRadius: 2 }}
                    />
                  );

                  return (
                    <WhiteCard
                      key={mc.id}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        background: mc.isPublished
                          ? `linear-gradient(0deg, ${alpha(
                              theme.palette.success.main,
                              0.04
                            )} 0%, transparent 30%)`
                          : `linear-gradient(0deg, ${alpha(
                              theme.palette.warning.main,
                              0.04
                            )} 0%, transparent 30%)`,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.75, gap: 1, flexWrap: "wrap" }}
                          >
                            <TypeChip type={mc.type} />
                            {pubChip}
                            {mc.library && (
                              <Chip
                                size="small"
                                variant="outlined"
                                icon={<LibraryBooksRounded />}
                                label={mc.library.name}
                                sx={{ borderRadius: 2 }}
                              />
                            )}
                          </Stack>

                          <Typography sx={{ whiteSpace: "pre-wrap" }}>
                            {mc.text}
                          </Typography>

                          {!!mc.tags?.length && (
                            <Box sx={{ mt: 1 }}>
                              <TagGroup tags={mc.tags} />
                            </Box>
                          )}

                          {!!mc.books?.length && (
                            <>
                              <Divider sx={{ my: 1.25 }} />
                              <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                flexWrap="wrap"
                              >
                                {mc.books.map((b) => (
                                  <BookCard
                                    key={b.isbn}
                                    isbn={b.isbn}
                                    title={b.title}
                                    coverUrl={b.coverUrl}
                                  />
                                ))}
                              </Stack>
                            </>
                          )}
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ flexShrink: 0 }}
                        >
                          <Tooltip title="Editar">
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
                                    bookIsbns:
                                      mc.books?.map((b) => b.isbn) ?? [],
                                    publishedAt: mc.publishedAt ?? null,
                                  },
                                })
                              }
                            >
                              <EditRounded />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Apagar">
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
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </WhiteCard>
                  );
                })}
              </Stack>

              <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                />
              </Stack>
            </>
          )}
        </Stack>
      </WhiteCard>

      {/* Dialog de edição/criação */}
      {edit.open && (
        <Dialog
          open
          onClose={() => setEdit({ open: false })}
          maxWidth="sm"
          fullWidth
        >
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
                    s.open
                      ? { ...s, data: { ...s.data, text: e.target.value } }
                      : s
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
                    s.open
                      ? {
                          ...s,
                          data: { ...s.data, type: e.target.value as any },
                        }
                      : s
                  )
                }
                fullWidth
              >
                {TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {(() => {
                        const Ico = TYPE_META[t].Icon;
                        return <Ico fontSize="small" />;
                      })()}
                      <span>{TYPE_META[t].label}</span>
                    </Stack>
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
                          ? {
                              ...s,
                              data: {
                                ...s.data,
                                isPublished: e.target.checked,
                              },
                            }
                          : s
                      )
                    }
                  />
                }
                label="Publicado"
              />

              <TagInput
                value={edit.data.tags}
                onChange={(tags) =>
                  setEdit((s) =>
                    s.open ? { ...s, data: { ...s.data, tags } } : s
                  )
                }
              />
              <IsbnListInput
                value={edit.data.bookIsbns}
                onChange={(bookIsbns) =>
                  setEdit((s) =>
                    s.open ? { ...s, data: { ...s.data, bookIsbns } } : s
                  )
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEdit({ open: false })}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!myLib?.id) return;
                const payload = {
                  text: edit.data.text,
                  type: edit.data.type,
                  tags: edit.data.tags,
                  libraryId: myLib.id, // força associação à biblioteca do admin
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
              disabled={!myLib?.id}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

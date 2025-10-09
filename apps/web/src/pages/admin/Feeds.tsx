/**
 * =============================================================================
 *  Admin · Feeds RSS da Biblioteca
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Feeds.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Reforços “como combinado”:
 *   • Comentários descritivos em todo o ficheiro (pt-PT).
 *   • Helpers **puros** (sem side-effects) bem identificados.
 *   • Funções curtas (≲ 30 linhas) com nomes explícitos e propósito claro.
 *   • Pequenas proteções/UX: tooltips, estados disabled, mensagens de erro.
 * =============================================================================
 */

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RssFeedRounded from "@mui/icons-material/RssFeedRounded";
import AddLinkRounded from "@mui/icons-material/AddLinkRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UpdateRounded from "@mui/icons-material/UpdateRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";

import { WhiteCard } from "@bibliotecario/ui-web";
import {
  getMyLibrary,
  listFeeds,
  addFeed,
  updateFeed,
  removeFeed,
  type FeedLite,
  type LibraryLite,
} from "@/services/feeds";

/* =============================================================================
 *  Helpers PUROS (sem side-effects) — pequenos e testáveis
 * ============================================================================= */

/** Valida URL http/https (PURO). */
function isValidUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

/** Formata data/hora em PT ou devolve "—" (PURO). */
function fmtPt(dateIso?: string | null): string {
  if (!dateIso) return "—";
  const t = new Date(dateIso);
  return isNaN(t.getTime()) ? "—" : t.toLocaleString("pt-PT");
}

/* =============================================================================
 *  Página — AdminFeeds
 * ============================================================================= */

export default function AdminFeeds() {
  // Estado base
  const [library, setLibrary] = useState<LibraryLite | null>(null);
  const [feeds, setFeeds] = useState<FeedLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Campo para adicionar novo feed
  const [url, setUrl] = useState("");
  const urlOk = url.trim() !== "" && isValidUrl(url.trim());

  /** Carrega a biblioteca do utilizador (≲ 30 linhas). */
  async function loadLibrary() {
    setErr(null);
    const lib = await getMyLibrary();
    setLibrary(lib);
  }

  /** Carrega os feeds da biblioteca (≲ 30 linhas). */
  async function loadFeeds(libId?: number) {
    if (!libId) {
      setFeeds([]);
      return;
    }
    try {
      setErr(null);
      const items = await listFeeds(libId);
      setFeeds(items);
    } catch (e: any) {
      setFeeds([]);
      setErr(e?.message || "Falha a carregar feeds (sem permissões?)");
    }
  }

  /** Recarrega tudo: biblioteca (o efeito abaixo puxa os feeds) (≲ 30 linhas). */
  async function reloadAll() {
    try {
      setLoading(true);
      await loadLibrary();
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar feeds");
    } finally {
      setLoading(false);
    }
  }

  // Montagem inicial
  useEffect(() => {
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre que a biblioteca muda, recarrega feeds
  useEffect(() => {
    if (library?.id) void loadFeeds(library.id);
    else setFeeds([]);
  }, [library?.id]);

  /** Adiciona um novo feed à biblioteca (≲ 30 linhas). */
  async function onAdd() {
    if (!library || !urlOk) return;
    try {
      const created = await addFeed({ libraryId: library.id, url: url.trim() });
      setFeeds((prev) => [...prev, created]);
      setUrl("");
    } catch (e: any) {
      alert(e?.message || "Falha ao adicionar feed.");
    }
  }

  /** Guarda alterações de uma row (≲ 30 linhas). */
  async function onSaveRow(f: FeedLite, patch: Partial<FeedLite>) {
    try {
      const upd = await updateFeed(f.id, { url: patch.url ?? f.url });
      setFeeds((prev) => prev.map((x) => (x.id === f.id ? upd : x)));
    } catch (e: any) {
      alert(e?.message || "Falha ao guardar alterações.");
    }
  }

  /** Remove um feed (≲ 30 linhas). */
  async function onRemove(id: number) {
    try {
      await removeFeed(id);
      setFeeds((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e?.message || "Falha ao remover feed.");
    }
  }

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, gap: 1 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <RssFeedRounded />
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Feeds RSS da biblioteca
          </Typography>
          {library && (
            <Chip
              size="small"
              icon={<LibraryBooksRounded />}
              label={library.name}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          )}
        </Stack>
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void reloadAll()} disabled={loading}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {!!err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Card: adicionar feed */}
      <WhiteCard sx={{ mb: 2, p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={1.25}>
          <Typography variant="body1" sx={{ opacity: 0.85 }}>
            Biblioteca:{" "}
            <strong>{library ? library.name : "— (sem associação)"}</strong>
          </Typography>

          {/* Campo + botão adicionar */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              fullWidth
              label="URL do feed"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && urlOk) onAdd();
              }}
              error={url.trim() !== "" && !urlOk}
              helperText={
                url.trim() && !urlOk
                  ? "Insere um URL válido (http/https)."
                  : "Ex.: https://site.pt/feed"
              }
              sx={{ minWidth: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title={urlOk ? "Adicionar feed" : "Insere um URL válido"}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddLinkRounded />}
                  onClick={onAdd}
                  disabled={!library || !urlOk}
                >
                  Adicionar
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </WhiteCard>

      {/* Card: lista de feeds */}
      <WhiteCard sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6" fontWeight={900}>
            Feeds ativos {library ? `— ${library.name}` : ""}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {loading ? "A carregar…" : `${feeds.length} feed(s)`}
          </Typography>
        </Stack>

        {feeds.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>
            {loading ? "A carregar…" : "Sem feeds configurados."}
          </Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {feeds.map((f) => (
              <FeedRow
                key={f.id}
                feed={f}
                onSave={onSaveRow}
                onRemove={onRemove}
              />
            ))}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}

/* =============================================================================
 *  Linha editável de Feed — componente autónomo (pequenas helpers internas)
 * ============================================================================= */

function FeedRow({
  feed,
  onSave,
  onRemove,
}: {
  feed: FeedLite;
  onSave: (f: FeedLite, patch: Partial<FeedLite>) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  // Estado local
  const [url, setUrl] = useState(feed.url);
  const [busy, setBusy] = useState(false);

  // Derivados (PUROS)
  const changed = url !== feed.url;
  const ok = isValidUrl(url);

  /** Guarda alterações desta row (≲ 30 linhas). */
  async function doSave() {
    if (!changed || !ok) return;
    try {
      setBusy(true);
      await onSave(feed, { url });
    } finally {
      setBusy(false);
    }
  }

  /** Remove esta row (≲ 30 linhas). */
  async function doRemove() {
    if (!confirm("Remover este feed?")) return;
    try {
      setBusy(true);
      await onRemove(feed.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr auto auto auto" },
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* URL + meta */}
      <Box>
        <TextField
          label="URL"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={!!url && !ok}
          helperText={!!url && !ok ? "URL inválido" : " "}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkRounded fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 0.5 }}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.8 }}>
          <UpdateRounded fontSize="small" />
          <Typography variant="body2">
            Última atualização: {fmtPt(feed.lastBuildDate)}
          </Typography>
        </Stack>
      </Box>

      {/* Abrir feed em nova janela */}
      <Box sx={{ justifySelf: "end" }}>
        <Tooltip title="Abrir feed">
          <span>
            <Button
              variant="outlined"
              size="small"
              href={feed.url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewRounded />}
            >
              Abrir
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Guardar alterações */}
      <Box sx={{ justifySelf: "end" }}>
        <Tooltip title={changed ? (ok ? "Guardar alterações" : "URL inválido") : "Sem alterações"}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveRounded />}
              disabled={!changed || !ok || busy}
              onClick={doSave}
            >
              Guardar
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Remover feed */}
      <Box sx={{ justifySelf: "end" }}>
        <Tooltip title="Remover feed">
          <span>
            <Button
              color="error"
              variant="outlined"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={doRemove}
              disabled={busy}
            >
              Remover
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

/* =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */

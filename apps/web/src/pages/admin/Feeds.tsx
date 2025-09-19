// apps/web/src/pages/admin/Feeds.tsx
import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { WhiteCard } from "@bibliotecario/ui-web";
import {
  listMyLibraries,
  listFeeds,
  addFeed,
  updateFeed,
  removeFeed,
  type FeedLite,
  type LibraryLite,
} from "@/services/feeds";

export default function AdminFeeds() {
  // bibliotecas do admin
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);
  // biblioteca selecionada — CONTROLADO desde o 1º render (null)
  const [selectedLib, setSelectedLib] = useState<LibraryLite | null>(null);

  // feeds da biblioteca
  const [feeds, setFeeds] = useState<FeedLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form "Adicionar"
  const [url, setUrl] = useState("");
  const [ttl, setTtl] = useState<number | "">("");

  async function loadLibraries() {
    setErr(null);
    const libs = await listMyLibraries();
    setLibraries(libs);
    // se ainda não houver selecionada, escolhe a 1ª (continua controlado: null -> objeto)
    if (!selectedLib && libs.length) setSelectedLib(libs[0]);
  }

  async function loadFeeds(libId?: number) {
    if (!libId) {
      setFeeds([]);
      return;
    }
    setErr(null);
    const items = await listFeeds(libId);
    setFeeds(items);
  }

  async function reloadAll() {
    try {
      setLoading(true);
      await loadLibraries();
      // a seguir ao loadLibraries, selectedLib pode mudar no mesmo tick.
      // portanto pedimos feeds com o id mais recente numa microtask:
      queueMicrotask(() => void loadFeeds(selectedLib?.id ?? null as any));
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar feeds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quando a biblioteca selecionada mudar, carrega feeds dessa lib
  useEffect(() => {
    if (selectedLib?.id) void loadFeeds(selectedLib.id);
    else setFeeds([]);
  }, [selectedLib?.id]);

  const canAdd = !!selectedLib && !!url.trim();

  async function onAdd() {
    if (!selectedLib) return;
    const created = await addFeed({
      libraryId: selectedLib.id,
      url: url.trim(),
      ttl: ttl === "" ? null : Number(ttl),
    });
    setFeeds((prev) => [...prev, created]);
    setUrl("");
    setTtl("");
  }

  async function onSaveRow(f: FeedLite, patch: Partial<FeedLite>) {
    const upd = await updateFeed(f.id, {
      url: patch.url ?? f.url,
      ttl: patch.ttl === undefined ? f.ttl : patch.ttl,
    });
    setFeeds((prev) => prev.map((x) => (x.id === f.id ? upd : x)));
  }

  async function onRemove(id: number) {
    await removeFeed(id);
    setFeeds((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900}>Feeds RSS da biblioteca</Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void reloadAll()} disabled={loading}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {!!err && (
        <Typography color="error" sx={{ mb: 1 }}>
          {err}
        </Typography>
      )}

      {/* Filtro + adicionar */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems="center">
          <Autocomplete
            options={libraries}
            loading={loading}
            value={selectedLib}                          
            onChange={(_, val) => setSelectedLib(val)}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            getOptionLabel={(o) => o?.name ?? ""}
            renderInput={(params) => <TextField {...params} label="Biblioteca" />}
            sx={{ minWidth: 320 }}
          />

          <Box sx={{ flex: 1 }} />

          <TextField
            fullWidth
            label="URL do feed"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            sx={{ minWidth: 360 }}
          />
          <TextField
            label="TTL (min)"
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: 160 }}
          />
          <Button variant="contained" onClick={onAdd} disabled={!canAdd}>
            Adicionar
          </Button>
        </Stack>
      </WhiteCard>

      {/* Lista */}
      <WhiteCard>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
          Feeds ativos {selectedLib ? `— ${selectedLib.name}` : ""}
        </Typography>

        {feeds.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>
            {loading ? "A carregar…" : "Sem feeds configurados."}
          </Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {feeds.map((f) => (
              <FeedRow key={f.id} feed={f} onSave={onSaveRow} onRemove={onRemove} />
            ))}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}

/* —— Row editável —— */
function FeedRow({
  feed,
  onSave,
  onRemove,
}: {
  feed: FeedLite;
  onSave: (f: FeedLite, patch: Partial<FeedLite>) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [url, setUrl] = useState(feed.url);
  const [ttl, setTtl] = useState<number | "">(feed.ttl ?? "");
  const changed = url !== feed.url || (ttl === "" ? null : ttl) !== feed.ttl;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12 }}>
      <Box>
        <TextField
          label="URL"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ mb: 0.5 }}
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="TTL (min)"
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: 160 }}
          />
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Última atualização:{" "}
            {feed.lastBuildDate
              ? new Date(feed.lastBuildDate).toLocaleString("pt-PT")
              : "—"}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          disabled={!changed}
          onClick={() => onSave(feed, { url, ttl: ttl === "" ? null : Number(ttl) })}
        >
          Guardar
        </Button>
        <Button color="error" onClick={() => onRemove(feed.id)}>
          Remover
        </Button>
      </Stack>
    </Box>
  );
}

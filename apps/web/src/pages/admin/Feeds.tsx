import { useEffect, useState } from "react";
import { Box, Button, Container, Divider, Stack, TextField, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";

// TODO: ligar a services/feeds.ts (list/add/remove)
type Feed = { id: number; url: string; ttl?: number | null };

export default function AdminFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [url, setUrl] = useState("");
  const [ttl, setTtl] = useState<number | "">("");

  useEffect(() => {
    // mock inicial
    setFeeds([{ id: 1, url: "https://exemplo/rss.xml", ttl: 60 }]);
  }, []);

  function addFeed() {
    if (!url.trim()) return;
    const id = (feeds.at(-1)?.id ?? 0) + 1;
    setFeeds([...feeds, { id, url: url.trim(), ttl: ttl === "" ? undefined : Number(ttl) }]);
    setUrl("");
    setTtl("");
  }

  function removeFeed(id: number) {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
        Feeds RSS da biblioteca
      </Typography>

      <WhiteCard sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
          Adicionar feed
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            label="URL do feed"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <TextField
            label="TTL (min)"
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: 160 }}
          />
          <Button variant="contained" onClick={addFeed}>
            Adicionar
          </Button>
        </Stack>
      </WhiteCard>

      <WhiteCard>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
          Feeds ativos
        </Typography>
        {feeds.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem feeds configurados.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {feeds.map((f) => (
              <Box key={f.id} sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1 }}>
                <Box>
                  <Typography fontWeight={900} sx={{ wordBreak: "break-all" }}>
                    {f.url}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    TTL: {f.ttl ?? "—"} min
                  </Typography>
                </Box>
                <Button color="error" onClick={() => removeFeed(f.id)}>
                  Remover
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}

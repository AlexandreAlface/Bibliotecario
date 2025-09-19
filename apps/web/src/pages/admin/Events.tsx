// apps/web/src/pages/admin/Events.tsx
import { useEffect, useState } from "react";
import { Box, Button, Container, Divider, Stack, TextField, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { deleteEvent, deleteFeed, listFeeds, listLibraryEvents, upsertEvent, upsertFeed, type EventLite, type FeedLite } from "@/services/admin";
import Grid from "@mui/material/GridLegacy";

export default function AdminEventsFeeds() {
  const { user } = useUserSession() as any;
  const libraryId = Number((user?.userLibraries?.[0]?.libraryId as any) ?? (user as any)?.libraryId ?? 0);

  const [events, setEvents] = useState<EventLite[]>([]);
  const [feeds, setFeeds] = useState<FeedLite[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // forms
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [evLoc, setEvLoc] = useState("");

  const [feedUrl, setFeedUrl] = useState("");

  async function reload() {
    try {
      setErr(null);
      const [e, f] = await Promise.all([listLibraryEvents(libraryId), listFeeds(libraryId)]);
      setEvents(e); setFeeds(f);
    } catch (e: any) { setErr(e?.message || "Falha a carregar."); }
  }
  useEffect(()=>{ if (libraryId) void reload(); }, [libraryId]);

  async function addEvent() {
    try {
      await upsertEvent(libraryId, { title: evTitle, startDate: evStart, endDate: evEnd || undefined, location: evLoc || undefined });
      setEvTitle(""); setEvStart(""); setEvEnd(""); setEvLoc("");
      await reload();
    } catch (e: any) { alert(e?.message || "Falha ao criar evento."); }
  }
  async function addFeed() {
    try {
      await upsertFeed(libraryId, { url: feedUrl });
      setFeedUrl("");
      await reload();
    } catch (e: any) { alert(e?.message || "Falha ao criar feed."); }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3, mb: 2 }}>Eventos & Feeds</Typography>
      {err && <Typography color="error" sx={{ mb: 1 }}>{err}</Typography>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <WhiteCard>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Eventos</Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              <TextField label="Título" value={evTitle} onChange={e=>setEvTitle(e.target.value)} sx={{ minWidth: 240 }} />
              <TextField label="Início" type="datetime-local" value={evStart} onChange={e=>setEvStart(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Fim (opcional)" type="datetime-local" value={evEnd} onChange={e=>setEvEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Local (opcional)" value={evLoc} onChange={e=>setEvLoc(e.target.value)} />
              <Button variant="contained" onClick={addEvent} disabled={!evTitle || !evStart}>Adicionar</Button>
            </Stack>

            <Stack spacing={1.25} divider={<Divider />}>
              {events.map(ev => (
                <Stack key={ev.id} direction="row" spacing={1.25} alignItems="center">
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={900} noWrap title={ev.title}>{ev.title}</Typography>
                    <Typography variant="body2" sx={{ opacity: .8 }}>
                      {new Date(ev.startDate).toLocaleString("pt-PT")}
                      {ev.endDate ? ` — ${new Date(ev.endDate).toLocaleString("pt-PT")}` : ""}
                      {ev.location ? ` • ${ev.location}` : ""}
                    </Typography>
                  </Box>
                  <Button color="error" variant="outlined" onClick={()=>void deleteEvent(libraryId, ev.id).then(reload)}>Remover</Button>
                </Stack>
              ))}
              {events.length === 0 && <Typography sx={{ opacity: .7 }}>Sem eventos.</Typography>}
            </Stack>
          </WhiteCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <WhiteCard>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Feeds RSS</Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField fullWidth label="URL do feed" value={feedUrl} onChange={e=>setFeedUrl(e.target.value)} />
              <Button variant="contained" onClick={addFeed} disabled={!feedUrl.trim()}>Adicionar</Button>
            </Stack>

            <Stack spacing={1.25} divider={<Divider />}>
              {feeds.map(fd => (
                <Stack key={fd.id} direction="row" spacing={1.25} alignItems="center">
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={900} noWrap title={fd.url}>{fd.url}</Typography>
                    <Typography variant="body2" sx={{ opacity: .8 }}>
                      TTL: {fd.ttl ?? "—"} • Últ.: {fd.lastBuildDate ? new Date(fd.lastBuildDate).toLocaleString("pt-PT") : "—"}
                    </Typography>
                  </Box>
                  <Button color="error" variant="outlined" onClick={()=>void deleteFeed(libraryId, fd.id).then(reload)}>Remover</Button>
                </Stack>
              ))}
              {feeds.length === 0 && <Typography sx={{ opacity: .7 }}>Sem feeds configurados.</Typography>}
            </Stack>
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

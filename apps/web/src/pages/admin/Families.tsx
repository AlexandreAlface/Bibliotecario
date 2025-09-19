// apps/web/src/pages/admin/Families.tsx
import { useEffect, useState } from "react";
import { Avatar, Box, Button, Container, Divider, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { listFamiliesForLibrary, type FamilyLiteForLib } from "@/services/admin";

const initials = (s?: string) => (s || "").split(" ").map(x => x[0]).filter(Boolean).slice(0,2).join("").toUpperCase();

export default function AdminFamilies() {
  const { user } = useUserSession() as any;
  const libraryId = Number((user?.userLibraries?.[0]?.libraryId as any) ?? (user as any)?.libraryId ?? 0);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<FamilyLiteForLib[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search(reset = true) {
    try {
      setLoading(true); setErr(null);
      const res = await listFamiliesForLibrary(libraryId, q, 25, reset ? null : cursor);
      setItems(prev => reset ? res.items : [...prev, ...res.items]);
      setCursor(res.nextCursor ?? null);
    } catch (e: any) { setErr(e?.message || "Falha a carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (libraryId) void search(true); }, [libraryId]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>Famílias (read-only)</Typography>
        <IconButton onClick={()=>void search(true)} disabled={loading}><RefreshRounded /></IconButton>
      </Stack>

      <WhiteCard sx={{ mb: 2 }}>
        <TextField
          placeholder="Pesquisar por nome/email…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={(e)=>e.key==="Enter"&&search(true)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRounded/></InputAdornment>,
            endAdornment: <Button onClick={()=>void search(true)} disabled={loading}>Buscar</Button>
          }}
          sx={{ minWidth: 360 }}
        />
        {err && <Typography color="error" sx={{ mt: 1 }}>{err}</Typography>}
      </WhiteCard>

      <WhiteCard>
        {items.length === 0 ? (
          <Typography sx={{ opacity: .7 }}>Sem resultados.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {items.map(f => (
              <Stack key={f.id} direction="row" spacing={1.25} alignItems="center">
                <Avatar>{initials(f.fullName)}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={900} noWrap title={f.fullName}>{f.fullName}</Typography>
                  <Typography variant="body2" sx={{ opacity: .8 }}>{f.email}</Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: .8 }}>{f.childrenCount} filhos</Typography>
                <RouteLink href={`/librarian/familias`}>Ver detalhe</RouteLink>
              </Stack>
            ))}
          </Stack>
        )}

        {!!cursor && (
          <Button sx={{ mt: 1.25 }} onClick={()=>void search(false)} disabled={loading}>
            Ver mais
          </Button>
        )}
      </WhiteCard>
    </Container>
  );
}

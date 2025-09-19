// apps/web/src/pages/admin/Librarians.tsx
import { useEffect, useState } from "react";
import { Avatar, Box, Button, Container, Divider, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { addLibrarianToLibrary, listLibraryLibrarians, removeLibrarianFromLibrary, type LibrarianLite } from "@/services/admin";

const initials = (s?: string) => (s || "").split(" ").map(x => x[0]).filter(Boolean).slice(0,2).join("").toUpperCase();

export default function AdminLibrarians() {
  const { user } = useUserSession() as any;
  const libraryId = Number((user?.userLibraries?.[0]?.libraryId as any) ?? (user as any)?.libraryId ?? 0);

  const [items, setItems] = useState<LibrarianLite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true); setErr(null);
      const arr = await listLibraryLibrarians(libraryId);
      setItems(arr);
    } catch (e: any) { setErr(e?.message || "Falha a carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [libraryId]);

  async function add() {
    if (!email.trim()) return;
    try {
      setLoading(true); setErr(null);
      await addLibrarianToLibrary(libraryId, email.trim());
      setEmail("");
      await reload();
    } catch (e: any) { setErr(e?.message || "Falha ao adicionar."); }
    finally { setLoading(false); }
  }

  async function remove(id: number) {
    if (!confirm("Remover este bibliotecário da biblioteca?")) return;
    try {
      setLoading(true); setErr(null);
      await removeLibrarianFromLibrary(libraryId, id);
      await reload();
    } catch (e: any) { setErr(e?.message || "Falha ao remover."); }
    finally { setLoading(false); }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>Bibliotecários</Typography>
        <Tooltip title="Atualizar"><span><IconButton onClick={() => void reload()} disabled={loading}><RefreshRounded /></IconButton></span></Tooltip>
      </Stack>

      <WhiteCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField label="Email do bibliotecário" value={email} onChange={(e)=>setEmail(e.target.value)} sx={{ minWidth: 320 }} />
          <Button variant="contained" startIcon={<PersonAddAltRounded />} onClick={add} disabled={loading}>Aderir</Button>
        </Stack>
        {err && <Typography color="error" sx={{ mt: 1 }}>{err}</Typography>}
      </WhiteCard>

      <WhiteCard>
        {items.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem bibliotecários nesta biblioteca.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {items.map((u) => (
              <Stack key={u.id} direction="row" spacing={1.25} alignItems="center">
                <Avatar>{initials(u.fullName)}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={900} noWrap title={u.fullName}>{u.fullName}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>{u.email}</Typography>
                </Box>
                <IconButton onClick={()=>void remove(u.id)}><DeleteRounded /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}

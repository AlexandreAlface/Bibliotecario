// apps/web/src/pages/admin/Slots.tsx
import { useEffect, useState } from "react";
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import { createGlobalBlock, deleteGlobalBlock, listGlobalBlocks, type BlockSlot } from "@/services/admin";

function ymd(d: Date) { return d.toISOString().slice(0,10); }
function hhmm(d: Date) { return d.toTimeString().slice(0,5); }

export default function AdminSlots() {
  const { user } = useUserSession() as any;
  const libraryId = Number((user?.userLibraries?.[0]?.libraryId as any) ?? (user as any)?.libraryId ?? 0);

  const [items, setItems] = useState<BlockSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // dialog
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState(ymd(new Date()));
  const [fromTime, setFromTime] = useState(hhmm(new Date()));
  const [toDate, setToDate] = useState(ymd(new Date()));
  const [toTime, setToTime] = useState(hhmm(new Date()));
  const [reason, setReason] = useState("");

  async function reload() {
    try {
      setLoading(true); setErr(null);
      const arr = await listGlobalBlocks(libraryId);
      setItems(arr);
    } catch (e: any) { setErr(e?.message || "Falha a carregar."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (libraryId) void reload(); }, [libraryId]);

  async function createBlock() {
    try {
      const startAt = new Date(`${fromDate}T${fromTime}:00`).toISOString();
      const endAt = new Date(`${toDate}T${toTime}:00`).toISOString();
      await createGlobalBlock(libraryId, { startAt, endAt, reason: reason || undefined });
      setOpen(false);
      setReason("");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Falha a criar bloqueio.");
    }
  }

  async function del(id: number) {
    if (!confirm("Remover bloqueio?")) return;
    try { await deleteGlobalBlock(libraryId, id); await reload(); }
    catch (e: any) { alert(e?.message || "Falha ao remover."); }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>Slots globais (bloqueios)</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Novo bloqueio</Button>
      </Stack>

      {err && <Typography color="error" sx={{ mb: 1 }}>{err}</Typography>}

      <WhiteCard>
        {items.length === 0 ? (
          <Typography sx={{ opacity: .7 }}>Sem bloqueios ativos.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {items.map(b => (
              <Stack key={b.id} direction="row" spacing={1.25} alignItems="center">
                <Typography fontWeight={900}>
                  {new Date(b.startAt).toLocaleString("pt-PT")} — {new Date(b.endAt).toLocaleString("pt-PT")}
                </Typography>
                <Typography variant="body2" sx={{ opacity: .8 }}>{b.reason || "—"}</Typography>
                <Box sx={{ ml: "auto" }}>
                  <Button color="error" variant="outlined" onClick={()=>void del(b.id)}>Remover</Button>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </WhiteCard>

      <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo bloqueio</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField label="De (data)" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="De (hora)" type="time" value={fromTime} onChange={e=>setFromTime(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField label="Até (data)" type="date" value={toDate} onChange={e=>setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Até (hora)" type="time" value={toTime} onChange={e=>setToTime(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <TextField label="Motivo (opcional)" fullWidth sx={{ mt: 1 }} value={reason} onChange={e=>setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={createBlock}>Criar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

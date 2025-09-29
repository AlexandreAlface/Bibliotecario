// apps/web/src/pages/admin/Librarians.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
// lucide icons
import { RefreshCw, UserPlus, Trash2, Search } from "lucide-react";

import {
  getMyLibrary,
  listLibraryLibrarians,
  removeLibrarianFromLibrary,
  type LibrarianLite,
  type LibraryLite,
} from "@/services/admin";
import { createLibrarianAndAssign } from "@/services/admin.librarians.create";

const initials = (s?: string) =>
  (s || "")
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function AdminLibrarians() {
  const { user } = useUserSession() as any;

  // ---- Biblioteca do admin ----
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  async function loadMyLibrary() {
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
  }

  useEffect(() => {
    void loadMyLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---- Dados ----
  const [items, setItems] = useState<LibrarianLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    if (!myLib?.id) return;
    try {
      setLoading(true);
      setErr(null);
      const arr = await listLibraryLibrarians(myLib.id);
      setItems(arr);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (myLib?.id) void reload();
  }, [myLib?.id]);

  // ---- Filtro local por nome/email ----
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return items;
    const s = q.toLowerCase();
    return items.filter(
      (u) =>
        u.fullName.toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  // ---- Remover ----
  async function remove(id: number) {
    if (!myLib?.id) return;
    if (!confirm("Remover este bibliotecário da biblioteca?")) return;
    try {
      setLoading(true);
      setErr(null);
      await removeLibrarianFromLibrary(myLib.id, id);
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Falha ao remover.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Dialog: novo bibliotecário ----
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
  }

  async function submitCreate() {
    if (!myLib?.id) return;
    if (!fullName.trim() || !email.trim()) {
      alert("Nome e email são obrigatórios.");
      return;
    }
    try {
      setLoading(true);
      setErr(null);
      await createLibrarianAndAssign(myLib.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
      });
      setOpen(false);
      resetForm();
      await reload();
    } catch (e: any) {
      alert(e?.message || "Falha ao criar bibliotecário.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Cabeçalho */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Bibliotecários
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {libLoading ? (
              "A carregar biblioteca…"
            ) : libErr ? (
              libErr
            ) : myLib ? (
              <>
                Biblioteca: <b>{myLib.name}</b>
              </>
            ) : (
              "—"
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Atualizar">
            <span>
              <IconButton
                onClick={() => void reload()}
                disabled={loading || !myLib?.id}
              >
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<UserPlus size={16} />}
            onClick={() => setOpen(true)}
            disabled={!myLib?.id}
          >
            Novo bibliotecário
          </Button>
        </Stack>
      </Stack>

      {/* Barra de filtro */}
      <WhiteCard sx={{ mb: 2 }}>
        <TextField
          placeholder="Filtrar por nome ou email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box component="span" sx={{ mr: 1, display: "inline-flex" }}>
                <Search size={16} />
              </Box>
            ),
          }}
          sx={{ minWidth: 320 }}
          disabled={!myLib?.id}
        />
        {err && (
          <Typography color="error" sx={{ mt: 1 }}>
            {err}
          </Typography>
        )}
      </WhiteCard>

      {/* Lista */}
      <WhiteCard>
        {!myLib?.id ? (
          <Typography sx={{ opacity: 0.7 }}>
            {libLoading ? "A carregar…" : libErr || "Sem biblioteca associada."}
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>
            {loading ? "A carregar…" : "Sem bibliotecários nesta biblioteca."}
          </Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {filtered.map((u) => (
              <Stack
                key={u.id}
                direction="row"
                spacing={1.25}
                alignItems="center"
              >
                <Avatar>{initials(u.fullName)}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={900} noWrap title={u.fullName}>
                    {u.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {u.email}
                  </Typography>
                </Box>
                <Tooltip title="Remover da biblioteca">
                  <span>
                    <IconButton
                      onClick={() => void remove(u.id)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
      </WhiteCard>

      {/* Dialog criar */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Novo bibliotecário</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <TextField
              label="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Telefone (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextField
              label="Palavra-passe (opcional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Se vazio, é gerada uma palavra-passe temporária."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitCreate}
            disabled={loading || !myLib?.id}
          >
            Criar e associar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

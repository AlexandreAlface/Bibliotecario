/**
 * =============================================================================
 *  Admin · Bibliotecários
 * -----------------------------------------------------------------------------
 *  Ficheiro: apps/web/src/pages/admin/Librarians.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 *
 *  Reforços “como combinado”:
 *   • Comentários completos (pt-PT) em todo o ficheiro.
 *   • Identificação explícita de funções/expressões **puras**.
 *   • Funções curtas (≤ ~30 linhas) com nomes descritivos.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { WhiteCard } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";

// lucide icons
import {
  RefreshCw,
  UserPlus,
  Trash2,
  Search,
  Mail,
  Phone,
  Building2,
  Shield,
} from "lucide-react";

import {
  getMyLibrary,
  listLibraryLibrarians,
  removeLibrarianFromLibrary,
  type LibrarianLite,
  type LibraryLite,
} from "@/services/admin/admin";
import { createLibrarianAndAssign } from "@/services/admin/admin.librarians.create";

/** 
 * Helper de UI: devolve iniciais de um nome.
 * ✅ **PURO** (sem efeitos colaterais).
 */
const initials = (s?: string) =>
  (s || "")
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Página de administração de bibliotecários:
 *  • Lista os bibliotecários associados à biblioteca do admin autenticado;
 *  • Permite filtrar por nome/email (cliente);
 *  • Suporta criar um novo utilizador com perfil de bibliotecário e associar à biblioteca;
 *  • Permite remover a associação de um bibliotecário à biblioteca.
 */
export default function AdminLibrarians() {
  const { user } = useUserSession() as any;

  /* ============================ Biblioteca do admin ============================ */
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);

  /**
   * Carrega a biblioteca do admin autenticado.
   * - Controla estado de “loading” e mensagens de erro.
   * - Mantém a função curta e previsível (≤ 30 linhas).
   */
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

  // Efeito: carregar biblioteca ao montar / quando muda o utilizador
  useEffect(() => {
    void loadMyLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ================================ Dados (lista) =============================== */
  const [items, setItems] = useState<LibrarianLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Recarrega a lista de bibliotecários da biblioteca atual.
   * - Mostra os erros ao utilizador.
   */
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

  // Efeito: sempre que há biblioteca válida, carrega a lista.
  useEffect(() => {
    if (myLib?.id) void reload();
  }, [myLib?.id]);

  /* ============================ Filtro local (cliente) ========================= */
  const [q, setQ] = useState("");

  /**
   * Aplica filtro por nome/email do lado do cliente.
   * ✅ **PURO** (derivado apenas de `items` + `q`).
   */
  const filtered = useMemo(() => {
    if (!q) return items;
    const s = q.toLowerCase();
    return items.filter(
      (u) =>
        u.fullName.toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  /* ================================= Remoção ================================== */
  /**
   * Remove a associação do bibliotecário à biblioteca atual.
   * - Pede confirmação;
   * - Recarrega a lista após remoção.
   */
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

  /* ============================ Dialog: criação =============================== */
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  /** Limpa os campos do formulário (pequena utilidade de UX). */
  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
  }

  /**
   * Submete a criação de um novo bibliotecário e associa à biblioteca atual.
   * - Valida campos obrigatórios (nome e email);
   * - Recarrega lista e fecha o diálogo em caso de sucesso.
   */
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

  // Derivado simples para UI (quantidade de registos filtrados) — ✅ **PURO**
  const count = filtered.length;

  /* =================================== UI ==================================== */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Cabeçalho com nome da secção, biblioteca atual e ações rápidas */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, gap: 1 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
            Bibliotecários
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip
              size="small"
              variant="outlined"
              icon={<Building2 size={14} />}
              label={
                libLoading
                  ? "A carregar biblioteca…"
                  : libErr
                  ? libErr
                  : myLib
                  ? myLib.name
                  : "—"
              }
            />
            {!!count && (
              <Chip
                size="small"
                label={`${count} ${count === 1 ? "registo" : "registos"}`}
              />
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Recarregar lista */}
          <Tooltip title="Atualizar">
            <span>
              <IconButton
                onClick={() => void reload()}
                disabled={loading || !myLib?.id}
                aria-label="Atualizar"
              >
                <RefreshCw size={18} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Abrir diálogo de criação */}
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

      {/* Barra de filtro (cliente) */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <TextField
            placeholder="Filtrar por nome ou email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 320, maxWidth: 520 }}
            disabled={!myLib?.id}
          />
          {/* Mensagem de erro (carregamentos/remover/criar) */}
          {err && (
            <Typography color="error" sx={{ ml: { sm: "auto" } }}>
              {err}
            </Typography>
          )}
        </Stack>
      </WhiteCard>

      {/* Lista de bibliotecários */}
      <WhiteCard>
        {/* Estados vazios / sem permissão */}
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
              <Stack key={u.id} direction="row" spacing={1.25} alignItems="center">
                {/* Avatar com iniciais (puro) */}
                <Avatar sx={{ width: 40, height: 40 }}>
                  {initials(u.fullName)}
                </Avatar>

                {/* Conteúdo principal do registo */}
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography fontWeight={900} noWrap title={u.fullName}>
                      {u.fullName}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<Shield size={14} />}
                      label="Bibliotecário"
                    />
                  </Stack>

                  {/* Contactos principais */}
                  <Stack
                    direction="row"
                    spacing={1.5}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mt: 0.25 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.9,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        minWidth: 220,
                      }}
                    >
                      <Mail size={14} />{" "}
                      <a href={`mailto:${u.email}`}>{u.email}</a>
                    </Typography>

                    {!!(u as any).phone && (
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          minWidth: 160,
                        }}
                      >
                        <Phone size={14} />{" "}
                        <a href={`tel:${(u as any).phone}`}>{(u as any).phone}</a>
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* Remover associação à biblioteca */}
                <Tooltip title="Remover da biblioteca">
                  <span>
                    <IconButton
                      onClick={() => void remove(u.id)}
                      disabled={loading}
                      aria-label="Remover"
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

      {/* Diálogo de criação de bibliotecário */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo bibliotecário</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <TextField
              label="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Shield size={16} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={16} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Telefone (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={16} />
                  </InputAdornment>
                ),
              }}
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

/**
 * =============================================================================
 *  FIM — Alexandre Brissos • Nº 21131
 * =============================================================================
 */

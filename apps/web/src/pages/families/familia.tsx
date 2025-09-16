// apps/web/src/pages/familia.tsx
import { useEffect, useMemo, useState } from "react";
import { WhiteCard, PrimaryButton, RouteLink } from "@bibliotecario/ui-web";
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import EditRounded from "@mui/icons-material/EditRounded";
import FamilyRestroomRounded from "@mui/icons-material/FamilyRestroomRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";

import { useUserSession } from "../../contexts/UserSession";
import { getLeiturasAtuais, type BookLite } from "../../services/readings";
import { getBadgesRecent, type BadgeLite } from "../../services/badges";
import { getNextConsultas, type ConsultaLite } from "../../services/consultations";
import { getSugestoesPerfil } from "../../services/books";
import { getMe, updateMe } from "@/services/auth";
import {
  createChild,
  updateChild as updateChildSvc,
  deleteChild as deleteChildSvc,
} from "../../services/children";

/* ---------------- helpers ---------------- */
function ageFrom(birth?: string | Date | null) {
  if (!birth) return "—";
  const d = typeof birth === "string" ? new Date(birth) : birth;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return `${a} ${a === 1 ? "ano" : "anos"}`;
}
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}
function toYMD(d?: string | null) {
  if (!d) return "";
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ====== género: mapeamento M/F/O <-> labels e normalização ====== */
type GenderCode = "M" | "F" | "O" | "";
const GENDER_OPTS: { code: GenderCode; label: string }[] = [
  { code: "M", label: "Masculino" },
  { code: "F", label: "Feminino" },
  { code: "O", label: "Outro" },
];
function toGenderCode(raw?: string | null): GenderCode {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return "";
  if (s === "m" || s.startsWith("masc") || s === "male" || s === "homem")
    return "M";
  if (s === "f" || s.startsWith("fem") || s === "female" || s === "mulher")
    return "F";
  return "O";
}

/* =================== Página =================== */
type UIChild = {
  id: number;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  readerProfile?: string | null;
  avatarUrl?: string | null;
};

export default function FamilyPage() {
  const { user } = useUserSession();

  // lista local de crianças
  const [children, setChildren] = useState<UIChild[]>([]);
  useEffect(() => {
    const arr = (user?.children || []) as any[];
    setChildren(
      arr.map((c) => ({
        id: Number(c.id),
        name: String(c.name),
        birthDate: (c as any).birthDate ?? (c as any).dataNascimento ?? null,
        gender: (c as any).gender ?? (c as any).sexo ?? null,
        readerProfile:
          (c as any).readerProfile ??
          (c as any).perfilLeitor ??
          (c as any).profileText ??
          null,
        avatarUrl: (c as any).avatarUrl ?? null,
      }))
    );
  }, [user?.children]);

  // seleção local da criança ativa
  const [activeId, setActiveId] = useState<number>(NaN);
  useEffect(() => {
    if (!Number.isFinite(activeId) && children.length) {
      setActiveId(Number(children[0].id));
    }
  }, [children, activeId]);

  const activeChild = useMemo(
    () => children.find((c) => Number(c.id) === Number(activeId)),
    [children, activeId]
  );

  // estado: form família
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [citizenCard, setCitizenCard] = useState(user?.citizenCard || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setCitizenCard(user?.citizenCard || "");
    setAddress(user?.address || "");
  }, [
    user?.fullName,
    user?.email,
    user?.phone,
    user?.citizenCard,
    user?.address,
  ]);

  async function onSave() {
    setSaveMsg(null);
    setSaveErr(null);
    setSaving(true);
    try {
      await updateMe({ fullName, email, phone, citizenCard, address });
      setSaveMsg("Dados guardados!");
    } catch (e: any) {
      setSaveErr(e?.message || "Falha ao guardar.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  // pesquisa na lista de crianças
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return children;
    return children.filter((c) => c.name.toLowerCase().includes(s));
  }, [children, q]);

  // dados do painel da criança selecionada
  const [leituras, setLeituras] = useState<BookLite[]>([]);
  const [badges, setBadges] = useState<BadgeLite[]>([]);
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);
  const [loadingChild, setLoadingChild] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!Number.isFinite(activeId)) {
        setLeituras([]);
        setBadges([]);
        setConsultas([]);
        return;
      }
      setLoadingChild(true);
      try {
        const [le, ba] = await Promise.all([
          getLeiturasAtuais(6, { childId: Number(activeId) }),
          getBadgesRecent(6, { childId: Number(activeId) }),
        ]);
        setLeituras(le as any);
        setBadges(ba as any);
      } finally {
        setLoadingChild(false);
      }

      const famId = Number(user?.id);
      if (Number.isFinite(famId)) {
        try {
          const next = await getNextConsultas(6, { familyId: famId });
          setConsultas(
            next.filter((c: any) => Number(c.childId) === Number(activeId))
          );
        } catch {
          setConsultas([]);
        }
      }
    })();
  }, [activeId, user?.id]);

  async function generateSuggestions() {
    if (!Number.isFinite(activeId)) return;
    setSugLoading(true);
    try {
      await getSugestoesPerfil(6, { childId: Number(activeId) });
    } finally {
      setSugLoading(false);
    }
  }

  function authorOf(b: BookLite): string | undefined {
    return (
      (b as any)?.author ??
      (b as any)?.bookAuthor ??
      (b as any)?.autor ??
      undefined
    );
  }

  // --------- Editor inline de criança (novo + edição) ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editIsNew, setEditIsNew] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formBirth, setFormBirth] = useState(""); // YYYY-MM-DD
  const [formGender, setFormGender] = useState<GenderCode>(""); // M/F/O/""
  const [formProfile, setFormProfile] = useState("");

  function openEdit(c: UIChild) {
    setActiveId(Number(c.id));
    setEditIsNew(false);
    setFormName(c.name || "");
    setFormBirth(toYMD(c.birthDate || null));
    setFormGender(toGenderCode(c.gender));
    setFormProfile(c.readerProfile || "");
    setEditErr(null);
    setEditOpen(true);
  }
  function openCreate() {
    setActiveId(NaN);
    setEditIsNew(true);
    setFormName("");
    setFormBirth("");
    setFormGender("");
    setFormProfile("");
    setEditErr(null);
    setEditOpen(true);
  }

  /* -------------- UI -------------- */
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Título */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: 0.3 }}>
          Família & Crianças
        </Typography>
        <FamilyRestroomRounded />
      </Stack>

      <Grid
        container
        spacing={2}
        justifyContent="center"
        alignItems="flex-start"
      >
        {/* -------- Coluna esquerda: perfil família + EDITOR DA CRIANÇA -------- */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 720 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.25 }}
            >
              <Typography variant="h6" fontWeight={900}>
                Dados da Família
              </Typography>
              <PrimaryButton
                onClick={onSave}
                startIcon={
                  saving ? <CircularProgress size={16} /> : <EditRounded />
                }
                disabled={saving}
              >
                Guardar
              </PrimaryButton>
            </Stack>

            {saveMsg && (
              <Alert severity="success" sx={{ mb: 1 }}>
                {saveMsg}
              </Alert>
            )}
            {saveErr && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {saveErr}
              </Alert>
            )}

            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Cartão de cidadão"
                  value={citizenCard}
                  onChange={(e) => setCitizenCard(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Morada"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Grid>
            </Grid>
          </WhiteCard>

          {/* >>>> EDITOR DA CRIANÇA AQUI, POR BAIXO DO FORM DA FAMÍLIA <<<< */}
          {editOpen && (
            <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 720 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6" fontWeight={900}>
                  {editIsNew ? "Adicionar criança" : "Editar criança"}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {!editIsNew && activeChild && (
                    <Tooltip title="Remover criança">
                      <span>
                        <PrimaryButton
                          variant="outlined"
                          color="error"
                          onClick={async () => {
                            if (!activeChild) return;
                            if (!confirm(`Remover ${activeChild.name}?`))
                              return;
                            setEditSaving(true);
                            setEditErr(null);
                            try {
                              await deleteChildSvc(activeChild.id);
                              const me = await getMe();
                              const newKids = (me.children || []) as any[];
                              setChildren(newKids as any);
                              setActiveId(newKids[0]?.id ?? NaN);
                              setEditOpen(false);
                            } catch (e: any) {
                              setEditErr(e?.message || "Erro ao remover.");
                            } finally {
                              setEditSaving(false);
                            }
                          }}
                        >
                          Remover
                        </PrimaryButton>
                      </span>
                    </Tooltip>
                  )}
                  <PrimaryButton
                    variant="outlined"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancelar
                  </PrimaryButton>
                  <PrimaryButton
                    onClick={async () => {
                      if (!formName.trim()) {
                        setEditErr("O nome é obrigatório.");
                        return;
                      }
                      setEditSaving(true);
                      setEditErr(null);
                      const payload = {
                        name: formName.trim(),
                        birthDate: formBirth
                          ? new Date(formBirth).toISOString()
                          : null,
                        gender: (formGender || null) as "M" | "F" | "O" | null,
                        readerProfile: formProfile || null,
                      };
                      try {
                        if (editIsNew) {
                          const saved = await createChild(payload);
                          const me = await getMe();
                          setChildren((me.children || []) as any);
                          setActiveId(Number(saved.id));
                        } else if (activeChild) {
                          const saved = await updateChildSvc(
                            activeChild.id,
                            payload
                          );
                          const me = await getMe();
                          setChildren((me.children || []) as any);
                          setActiveId(Number(saved.id));
                        }
                        setEditOpen(false);
                      } catch (e: any) {
                        setEditErr(e?.message || "Falha ao guardar.");
                      } finally {
                        setEditSaving(false);
                      }
                    }}
                    disabled={editSaving}
                  >
                    {editSaving ? "A guardar…" : "Guardar"}
                  </PrimaryButton>
                </Stack>
              </Stack>

              {editErr && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {editErr}
                </Alert>
              )}

              <Grid container spacing={1.25}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nome"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    size="small"
                    fullWidth
                    autoFocus
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    type="date"
                    label="Data de nascimento"
                    value={formBirth}
                    onChange={(e) => setFormBirth(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Género como SELECT com M/F/O */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Género"
                    value={formGender}
                    onChange={(e) =>
                      setFormGender(e.target.value as GenderCode)
                    }
                    size="small"
                    fullWidth
                  >
                    {GENDER_OPTS.map((opt) => (
                      <MenuItem key={opt.code} value={opt.code}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Perfil de leitor"
                    placeholder="Ex.: gosta de aventura, BD, animais…"
                    value={formProfile}
                    onChange={(e) => setFormProfile(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Grid>
              </Grid>
            </WhiteCard>
          )}
        </Grid>

        {/* -------- Coluna direita: lista de crianças + detalhe -------- */}
        <Grid
          item
          xs={12}
          md={5}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Lista / Pesquisa */}
          <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 520 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6" fontWeight={900}>
                Dados das Crianças
              </Typography>
              <PrimaryButton onClick={openCreate} size="small">
                + Adicionar criança
              </PrimaryButton>
            </Stack>

            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              placeholder="Pesquisar criança…"
              fullWidth
              sx={{ mb: 1 }}
            />

            <Stack
              spacing={0.75}
              sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5 }}
            >
              {filtered.map((c) => {
                const isActive = Number(c.id) === Number(activeId);
                return (
                  <Box
                    key={c.id}
                    onClick={() => openEdit(c)}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: isActive ? "primary.main" : "divider",
                      bgcolor: isActive ? "primary.light" : "background.paper",
                      cursor: "pointer",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={c.avatarUrl || undefined}
                        sx={{ width: 32, height: 32 }}
                      >
                        {(c.name || "?").charAt(0)}
                      </Avatar>
                      <Box minWidth={0} flex={1}>
                        <Typography fontWeight={800} noWrap title={c.name}>
                          {c.name}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {ageFrom(c.birthDate)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
              {filtered.length === 0 && (
                <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
              )}
            </Stack>
          </WhiteCard>

          {/* Painel da criança ativa */}
          <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 520 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6" fontWeight={900}>
                {activeChild ? activeChild.name : "Seleciona uma criança"}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                {activeChild && (
                  <PrimaryButton
                    onClick={() => openEdit(activeChild)}
                    size="small"
                  >
                    Editar dados
                  </PrimaryButton>
                )}
                <Tooltip title="Gerar sugestões para esta criança">
                  <span>
                    <IconButton
                      size="small"
                      onClick={generateSuggestions}
                      disabled={!activeChild || sugLoading}
                      aria-label="Gerar sugestões"
                    >
                      <RefreshRounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <RouteLink href="/agenda">Ver Agenda</RouteLink>
              </Stack>
            </Stack>

            {!activeChild ? (
              <Typography sx={{ opacity: 0.7 }}>
                Escolhe uma criança para ver a atividade.
              </Typography>
            ) : loadingChild ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography sx={{ opacity: 0.8 }}>A carregar…</Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {/* Leituras recentes */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={900}
                    sx={{ mb: 0.5 }}
                  >
                    Leituras recentes
                  </Typography>
                  {leituras.length ? (
                    <Stack
                      spacing={0.75}
                      divider={<Divider sx={{ borderColor: "divider" }} />}
                    >
                      {leituras.slice(0, 3).map((b) => (
                        <Stack
                          key={b.id}
                          direction="row"
                          gap={1}
                          alignItems="center"
                        >
                          <img
                            src={b.coverUrl || "/placeholder-book.jpg"}
                            alt=""
                            width={36}
                            height={50}
                            style={{ borderRadius: 6, objectFit: "cover" }}
                          />
                          <Box minWidth={0} flex={1}>
                            <Typography noWrap title={b.title} fontWeight={800}>
                              {b.title}
                            </Typography>
                            {!!authorOf(b) && (
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.7 }}
                              >
                                de {authorOf(b)}
                              </Typography>
                            )}
                          </Box>
                          <RouteLink href="/reading">Abrir</RouteLink>
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem leituras ativas.
                    </Typography>
                  )}
                </Box>

                {/* Conquistas recentes */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={900}
                    sx={{ mb: 0.5 }}
                  >
                    Conquistas recentes
                  </Typography>
                  {badges.length ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {badges.slice(0, 6).map((b) => {
                        const isTrophy = (b.type || "")
                          .toUpperCase()
                          .includes("TROF");
                        const Icon = isTrophy
                          ? EmojiEventsRounded
                          : VerifiedRounded;
                        return (
                          <Tooltip
                            key={`${b.id}-${b.assignedAt || ""}`}
                            title={
                              b.assignedAt
                                ? new Date(b.assignedAt).toLocaleString("pt-PT")
                                : ""
                            }
                          >
                            <Chip
                              size="small"
                              variant={isTrophy ? "filled" : "outlined"}
                              icon={<Icon fontSize="small" />}
                              label={b.name}
                              sx={{ borderRadius: 3 }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography sx={{ opacity: 0.7 }}>
                      Ainda sem conquistas… continua a ler! 📚
                    </Typography>
                  )}
                </Box>

                {/* Próximas consultas */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={900}
                    sx={{ mb: 0.5 }}
                  >
                    Próximas consultas
                  </Typography>
                  {consultas.length ? (
                    <Stack spacing={0.75}>
                      {consultas.slice(0, 3).map((c) => {
                        const iso = c.scheduledAt || c.date;
                        const { day, mon, time } = parts(iso);
                        return (
                          <Box
                            key={c.id}
                            sx={{
                              p: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Chip
                                size="small"
                                icon={<CalendarMonthRounded fontSize="small" />}
                                label={`${day} ${mon}`}
                              />
                              {!!time && (
                                <Chip
                                  size="small"
                                  icon={<AccessTimeRounded fontSize="small" />}
                                  label={time}
                                />
                              )}
                              <Typography
                                noWrap
                                title={c.title}
                                sx={{ ml: 0.5 }}
                              >
                                {c.title}
                              </Typography>
                              <Box sx={{ flex: 1 }} />
                              <RouteLink href="/consultas">Ver</RouteLink>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem consultas marcadas para esta criança.
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </WhiteCard>
        </Grid>
      </Grid>
    </Container>
  );
}

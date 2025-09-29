// apps/web/src/pages/familia.tsx (versão melhorada)
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  InputAdornment,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import EditRounded from "@mui/icons-material/EditRounded";
import FamilyRestroomRounded from "@mui/icons-material/FamilyRestroomRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import PhoneIphoneRounded from "@mui/icons-material/PhoneIphoneRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ClearRounded from "@mui/icons-material/ClearRounded";
import ManRounded from "@mui/icons-material/ManRounded";
import WomanRounded from "@mui/icons-material/WomanRounded";
import TransgenderRounded from "@mui/icons-material/TransgenderRounded";

import { useUserSession } from "../../contexts/UserSession";
import { getLeiturasAtuais, type BookLite } from "../../services/readings";
import { getBadgesRecent, type BadgeLite } from "../../services/badges";
import {
  getNextConsultas,
  type ConsultaLite,
} from "../../services/consultations";
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

// saneadores básicos (pt-PT)
const sanitizeName = (s: string) =>
  s
    .normalize("NFKC")
    // permite letras (com acentos), espaço, hífen e apóstrofo
    .replace(/[^\p{L}\s\-']+/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
const sanitizePhone = (s: string) => s.replace(/[^0-9]/g, "").slice(0, 9);
const sanitizeCC = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

/* ====== género: mapeamento M/F/O <-> labels e normalização ====== */
type GenderCode = "M" | "F" | "O" | "";
const GENDER_OPTS: {
  code: GenderCode;
  label: string;
  icon: React.ReactElement;
}[] = [
  { code: "M", label: "Masculino", icon: <ManRounded fontSize="small" /> },
  { code: "F", label: "Feminino", icon: <WomanRounded fontSize="small" /> },
  { code: "O", label: "Outro", icon: <TransgenderRounded fontSize="small" /> },
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

// Cabeçalho de secção reutilizável
const SectionHeader = memo(function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactElement;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography variant="h6" fontWeight={900} component="h2">
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
});

const ChildListItem = memo(function ChildListItem({
  c,
  active,
  onClick,
}: {
  c: UIChild;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      role="button"
      aria-pressed={active}
      sx={{
        p: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: active ? "primary.main" : "divider",
        bgcolor: active ? "primary.light" : "background.paper",
        cursor: "pointer",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Avatar src={c.avatarUrl || undefined} sx={{ width: 32, height: 32 }}>
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
});

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

  // estado: form família (com validação leve)
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [citizenCard, setCitizenCard] = useState(user?.citizenCard || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // erros do form
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    citizenCard?: string;
    address?: string;
  }>({});

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

  const validateFamilyForm = useCallback(() => {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = "Obrigatório.";
    else if (fullName.trim().length < 3) next.fullName = "Nome muito curto.";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email))
      next.email = "Email inválido.";

    if (phone && !/^(9\d{8}|2\d{8})$/.test(phone))
      next.phone = "Telefone (9 dígitos).";

    if (citizenCard && !/^[0-9]{8}[A-Z0-9]{1,4}$/.test(citizenCard))
      next.citizenCard = "Ex.: 00000000ZZ4";

    if (address && address.length < 5) next.address = "Morada muito curta.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [fullName, email, phone, citizenCard, address]);

  const onSave = useCallback(async () => {
    setSaveMsg(null);
    setSaveErr(null);
    if (!validateFamilyForm()) return;
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
  }, [validateFamilyForm, fullName, email, phone, citizenCard, address]);

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
    let mounted = true;
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
        if (!mounted) return;
        setLeituras(le as any);
        setBadges(ba as any);
      } finally {
        if (mounted) setLoadingChild(false);
      }

      const famId = Number(user?.id);
      if (Number.isFinite(famId)) {
        try {
          const next = await getNextConsultas(6, { familyId: famId });
          if (!mounted) return;
          setConsultas(
            next.filter((c: any) => Number(c.childId) === Number(activeId))
          );
        } catch {
          if (mounted) setConsultas([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeId, user?.id]);

  const generateSuggestions = useCallback(async () => {
    if (!Number.isFinite(activeId)) return;
    setSugLoading(true);
    try {
      await getSugestoesPerfil(6, { childId: Number(activeId) });
    } finally {
      setSugLoading(false);
    }
  }, [activeId]);

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

  const openEdit = useCallback((c: UIChild) => {
    setActiveId(Number(c.id));
    setEditIsNew(false);
    setFormName(c.name || "");
    setFormBirth(toYMD(c.birthDate || null));
    setFormGender(toGenderCode(c.gender));
    setFormProfile(c.readerProfile || "");
    setEditErr(null);
    setEditOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setActiveId(NaN);
    setEditIsNew(true);
    setFormName("");
    setFormBirth("");
    setFormGender("");
    setFormProfile("");
    setEditErr(null);
    setEditOpen(true);
  }, []);

  // validação leve do editor da criança
  const childErrors = useMemo(() => {
    const e: { name?: string } = {};
    if (!formName.trim()) e.name = "Obrigatório.";
    else if (formName.trim().length < 2) e.name = "Nome muito curto.";
    return e;
  }, [formName]);

  /* -------------- UI -------------- */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
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
            <SectionHeader
              title="Dados da Família"
              icon={<PersonRounded />}
              action={
                <PrimaryButton
                  onClick={onSave}
                  startIcon={
                    saving ? <CircularProgress size={16} /> : <EditRounded />
                  }
                  disabled={saving}
                  aria-label="Guardar dados da família"
                >
                  Guardar
                </PrimaryButton>
              }
            />

            {saveMsg && (
              <Alert severity="success" sx={{ mb: 1 }} aria-live="polite">
                {saveMsg}
              </Alert>
            )}
            {saveErr && (
              <Alert severity="error" sx={{ mb: 1 }} aria-live="assertive">
                {saveErr}
              </Alert>
            )}

            <Grid
              container
              spacing={1.25}
              component="form"
              noValidate
              onSubmit={(e) => e.preventDefault()}
            >
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome completo"
                  placeholder="Ex.: Ana Martins"
                  value={fullName}
                  onChange={(e) => setFullName(sanitizeName(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 80 }}
                  error={!!errors.fullName}
                  helperText={errors.fullName || " "}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  type="email"
                  label="Email"
                  placeholder="ana@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  size="small"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email || " "}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefone"
                  placeholder="912345678"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "^(9\\d{8}|2\\d{8})$",
                    maxLength: 9,
                  }}
                  error={!!errors.phone}
                  helperText={errors.phone || " "}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIphoneRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Cartão de cidadão"
                  placeholder="00000000ZZ4"
                  value={citizenCard}
                  onChange={(e) => setCitizenCard(sanitizeCC(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{
                    inputMode: "text",
                    pattern: "^[0-9]{8}[A-Z0-9]{1,4}$",
                    maxLength: 12,
                  }}
                  error={!!errors.citizenCard}
                  helperText={errors.citizenCard || " "}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Morada"
                  placeholder="Rua da Biblioteca, 123"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 120 }}
                  error={!!errors.address}
                  helperText={errors.address || " "}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <HomeRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </WhiteCard>

          {/* EDITOR DA CRIANÇA */}
          {editOpen && (
            <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 720 }}>
              <SectionHeader
                title={editIsNew ? "Adicionar criança" : "Editar criança"}
                icon={<FamilyRestroomRounded />}
                action={
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
                                const newKids = (me!.children || []) as any[];
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
                          name: sanitizeName(formName.trim()),
                          // enviar YYYY-MM-DD diretamente para evitar TZ shift
                          birthDate: formBirth || null,
                          gender: (formGender || null) as
                            | "M"
                            | "F"
                            | "O"
                            | null,
                          readerProfile: formProfile || null,
                        };
                        try {
                          if (editIsNew) {
                            const saved = await createChild(payload);
                            const me = await getMe();
                            setChildren((me!.children || []) as any);
                            setActiveId(Number((saved as any).id));
                          } else if (activeChild) {
                            const saved = await updateChildSvc(
                              activeChild.id,
                              payload
                            );
                            const me = await getMe();
                            setChildren((me!.children || []) as any);
                            setActiveId(Number((saved as any).id));
                          }
                          setEditOpen(false);
                        } catch (e: any) {
                          setEditErr(e?.message || "Falha ao guardar.");
                        } finally {
                          setEditSaving(false);
                        }
                      }}
                      disabled={editSaving || !!childErrors.name}
                    >
                      {editSaving ? "A guardar…" : "Guardar"}
                    </PrimaryButton>
                  </Stack>
                }
              />

              {editErr && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {editErr}
                </Alert>
              )}

              <Grid
                container
                spacing={1.25}
                component="form"
                noValidate
                onSubmit={(e) => e.preventDefault()}
              >
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nome"
                    placeholder="Ex.: João"
                    value={formName}
                    onChange={(e) => setFormName(sanitizeName(e.target.value))}
                    size="small"
                    fullWidth
                    autoFocus
                    inputProps={{ maxLength: 60 }}
                    error={!!childErrors.name}
                    helperText={childErrors.name || " "}
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
                        <Stack direction="row" spacing={1} alignItems="center">
                          {opt.icon}
                          <span>{opt.label}</span>
                        </Stack>
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
                    inputProps={{ maxLength: 280 }}
                    helperText={`${formProfile.length}/280`}
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
            <SectionHeader
              title="Dados das Crianças"
              icon={<FamilyRestroomRounded />}
              action={
                <PrimaryButton
                  onClick={openCreate}
                  size="small"
                  aria-label="Adicionar criança"
                >
                  + Adicionar criança
                </PrimaryButton>
              }
            />

            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              placeholder="Pesquisar criança…"
              fullWidth
              sx={{ mb: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: q ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Limpar pesquisa"
                      size="small"
                      onClick={() => setQ("")}
                    >
                      <ClearRounded fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />

            <Stack
              spacing={0.75}
              sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5 }}
            >
              {filtered.map((c) => (
                <ChildListItem
                  key={c.id}
                  c={c}
                  active={Number(c.id) === Number(activeId)}
                  onClick={() => openEdit(c)}
                />
              ))}
              {filtered.length === 0 && (
                <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
              )}
            </Stack>
          </WhiteCard>

          {/* Painel da criança ativa */}
          <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 520 }}>
            <SectionHeader
              title={activeChild ? activeChild.name : "Seleciona uma criança"}
              icon={<PersonRounded />}
              action={
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
              }
            />

            {!activeChild ? (
              <Typography sx={{ opacity: 0.7 }}>
                Escolhe uma criança para ver a atividade.
              </Typography>
            ) : loadingChild ? (
              <Stack spacing={1}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={64} />
                ))}
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

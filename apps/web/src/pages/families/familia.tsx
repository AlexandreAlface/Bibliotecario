/**
 * Autor: Alexandre Brrissos — Nº 21131
 * Ficheiro: apps/web/src/pages/familia.tsx
 * Descrição:
 *   - Página "Família & Crianças" com:
 *     (1) Dados da família (editar/validar/guardar)
 *     (2) Lista e editor inline de crianças (criar/editar/remover)
 *     (3) Painel de atividade da criança selecionada (leituras, conquistas, consultas, sugestões)
 *
 * Notas de arquitetura:
 *   - Funções utilitárias → PURAS e com menos de 30 linhas
 *   - Handlers e hooks → pequenos e focados (<=30 linhas sempre que possível)
 *   - Componentes UI divididos em cartões claros (cada um com a sua responsabilidade)
 */

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

import { useUserSession } from "@/contexts/UserSession";
import { getLeiturasAtuais, type BookLite } from "@/services/readings";
import { getBadgesRecent, type BadgeLite } from "@/services/badges";
import { getNextConsultas, type ConsultaLite } from "@/services/consultations";
import { getSugestoesPerfil } from "@/services/books";
import { getMe, updateMe } from "@/services/auth";
import {
  createChild,
  updateChild as updateChildSvc,
  deleteChild as deleteChildSvc,
} from "@/services/children";

/* =====================================================================================
   UTILITÁRIAS (PURO / <30 linhas)
   ===================================================================================== */

/** PURE: calcula idade legível a partir de YYYY-MM-DD (ou Date) */
function ageFrom(birth?: string | Date | null) {
  if (!birth) return "—";
  const d = typeof birth === "string" ? new Date(birth) : birth;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return `${a} ${a === 1 ? "ano" : "anos"}`;
}

/** PURE: partes de uma data ISO para UI (dia/mes/hora em pt-PT) */
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", time: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    time: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** PURE: Date/ISO -> "YYYY-MM-DD" para inputs type="date" */
function toYMD(d?: string | null) {
  if (!d) return "";
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** PURE: saneia nome (mantém letras, acentos, espaço, hífen, apóstrofo) */
const sanitizeName = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[^\p{L}\s\-']+/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/** PURE: só dígitos (até 9) */
const sanitizePhone = (s: string) => s.replace(/[^0-9]/g, "").slice(0, 9);

/** PURE: CC uppercase [0-9]{8}[A-Z0-9]{1,4} (máx 12) */
const sanitizeCC = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

/** PURE: normaliza vários inputs em códigos de género "M" | "F" | "O" | "" */
type GenderCode = "M" | "F" | "O" | "";
function toGenderCode(raw?: string | null): GenderCode {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return "";
  if (s === "m" || s.startsWith("masc") || s === "male" || s === "homem")
    return "M";
  if (s === "f" || s.startsWith("fem") || s === "female" || s === "mulher")
    return "F";
  return "O";
}

/** PURE: validação leve do formulário da família; devolve dicionário de erros */
function validateFamilyForm(fields: {
  fullName: string;
  email: string;
  phone: string;
  citizenCard: string;
  address: string;
}) {
  const next: Partial<Record<keyof typeof fields, string>> = {};
  const { fullName, email, phone, citizenCard, address } = fields;

  if (!fullName.trim()) next.fullName = "Obrigatório.";
  else if (fullName.trim().length < 3) next.fullName = "Nome muito curto.";

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email))
    next.email = "Email inválido.";

  if (phone && !/^(9\d{8}|2\d{8})$/.test(phone))
    next.phone = "Telefone (9 dígitos).";

  if (citizenCard && !/^[0-9]{8}[A-Z0-9]{1,4}$/.test(citizenCard))
    next.citizenCard = "Ex.: 00000000ZZ4";

  if (address && address.length < 5) next.address = "Morada muito curta.";

  return next;
}

/** PURE: extrai autor de um BookLite com variações de backend */
function authorOf(b: BookLite): string | undefined {
  return (
    (b as any)?.author ??
    (b as any)?.bookAuthor ??
    (b as any)?.autor ??
    undefined
  );
}

/** PURE: coage para nº válido (>0); caso contrário devolve undefined */
const validId = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* =====================================================================================
   TIPOS DE UI
   ===================================================================================== */

type UIChild = {
  id: number;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  readerProfile?: string | null;
  avatarUrl?: string | null;
};

const GENDER_OPTS: {
  code: GenderCode;
  label: string;
  icon: React.ReactElement;
}[] = [
  { code: "M", label: "Masculino", icon: <ManRounded fontSize="small" /> },
  { code: "F", label: "Feminino", icon: <WomanRounded fontSize="small" /> },
  { code: "O", label: "Outro", icon: <TransgenderRounded fontSize="small" /> },
];

/* =====================================================================================
   PEÇAS DE UI PEQUENAS (memo)  — <30 linhas cada
   ===================================================================================== */

/** Cabeçalho de secção reutilizável */
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

/** Linha da lista de crianças (seleção) */
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

/* =====================================================================================
   HOOKS PEQUENOS (lógica de dados) — <=30 linhas
   ===================================================================================== */

/** Carrega e controla a lista de crianças a partir do utilizador. */
function useFamilyChildren(user?: any | null) {
  const [children, setChildren] = useState<UIChild[]>([]);
  const [activeId, setActiveId] = useState<number>(NaN);

  // Inicializa crianças a partir de user
  useEffect(() => {
    const arr = (user?.children || []) as any[];
    const mapped = arr.map(
      (c) =>
        ({
          id: Number(c.id),
          name: String(c.name),
          birthDate: c.birthDate ?? c.dataNascimento ?? null,
          gender: c.gender ?? c.sexo ?? null,
          readerProfile:
            c.readerProfile ?? c.perfilLeitor ?? c.profileText ?? null,
          avatarUrl: c.avatarUrl ?? null,
        } as UIChild)
    );
    setChildren(mapped);
    if (!Number.isFinite(activeId) && mapped.length)
      setActiveId(Number(mapped[0].id));
  }, [user?.children]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Atualiza lista a partir de GET /me (pós-criar/editar/remover) */
  const refreshChildren = useCallback(async () => {
    const me = await getMe();
    const list = (me?.children || []) as any[];
    const mapped = list.map(
      (c) =>
        ({
          id: Number(c.id),
          name: String(c.name),
          birthDate: c.birthDate ?? c.dataNascimento ?? null,
          gender: c.gender ?? c.sexo ?? null,
          readerProfile:
            c.readerProfile ?? c.perfilLeitor ?? c.profileText ?? null,
          avatarUrl: c.avatarUrl ?? null,
        } as UIChild)
    );
    setChildren(mapped);
    if (mapped.length && !mapped.find((x) => x.id === activeId))
      setActiveId(Number(mapped[0].id));
    return mapped;
  }, [activeId]);

  return { children, setChildren, activeId, setActiveId, refreshChildren };
}

/** Carrega atividade (leituras/badges/consultas) da criança ativa. */
function useActiveChildData(activeChildId?: number, familyId?: number) {
  const [leituras, setLeituras] = useState<BookLite[]>([]);
  const [badges, setBadges] = useState<BadgeLite[]>([]);
  const [consultas, setConsultas] = useState<ConsultaLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cid = validId(activeChildId);
      if (!cid) {
        setLeituras([]);
        setBadges([]);
        setConsultas([]);
        return;
      }
      setLoading(true);
      try {
        const [le, ba] = await Promise.all([
          getLeiturasAtuais(6, { childId: cid }),
          getBadgesRecent(6, { childId: cid }),
        ]);
        if (!mounted) return;
        setLeituras(Array.isArray(le) ? (le as any) : []);
        setBadges(Array.isArray(ba) ? (ba as any) : []);
      } finally {
        if (mounted) setLoading(false);
      }

      // consultas da família, filtradas pela criança
      const fid = validId(familyId);
      if (!fid) return;
      try {
        const next = await getNextConsultas(6, { familyId: fid });
        if (!mounted) return;
        setConsultas(
          (Array.isArray(next) ? next : []).filter(
            (c: any) => Number(c.childId) === cid
          )
        );
      } catch {
        if (mounted) setConsultas([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeChildId, familyId]);

  return { leituras, badges, consultas, loading };
}

/* =====================================================================================
   CARTÕES DE UI (maiores). As lógicas internas usam helpers/handlers curtos.
   ===================================================================================== */

/** Cartão: formulário da família (com validação e guardar) */
function FamilyFormCard({
  initial,
}: {
  initial: {
    fullName?: string;
    email?: string;
    phone?: string;
    citizenCard?: string;
    address?: string;
  };
}) {
  const [fullName, setFullName] = useState(initial.fullName || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [citizenCard, setCitizenCard] = useState(initial.citizenCard || "");
  const [address, setAddress] = useState(initial.address || "");

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Re-sync quando mudar o utilizador
  useEffect(() => {
    setFullName(initial.fullName || "");
    setEmail(initial.email || "");
    setPhone(initial.phone || "");
    setCitizenCard(initial.citizenCard || "");
    setAddress(initial.address || "");
  }, [
    initial.fullName,
    initial.email,
    initial.phone,
    initial.citizenCard,
    initial.address,
  ]);

  /** Handler: valida e envia para API (curto, <30 linhas) */
  const onSave = useCallback(async () => {
    setSaveMsg(null);
    setSaveErr(null);
    const next = validateFamilyForm({
      fullName,
      email,
      phone,
      citizenCard,
      address,
    });
    setErrors(next);
    if (Object.keys(next).length) return;

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
  }, [fullName, email, phone, citizenCard, address]);

  return (
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
  );
}

/** Cartão: lista de crianças + pesquisa + abrir editor */
function ChildrenListCard({
  children,
  activeId,
  setQ,
  q,
  onOpenCreate,
  onOpenEdit,
}: {
  children: UIChild[];
  activeId: number;
  q: string;
  setQ: (s: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (c: UIChild) => void;
}) {
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? children.filter((c) => c.name.toLowerCase().includes(s))
      : children;
  }, [children, q]);

  return (
    <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 520 }}>
      <SectionHeader
        title="Dados das Crianças"
        icon={<FamilyRestroomRounded />}
        action={
          <PrimaryButton
            onClick={onOpenCreate}
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

      <Stack spacing={0.75} sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5 }}>
        {filtered.map((c) => (
          <ChildListItem
            key={c.id}
            c={c}
            active={Number(c.id) === Number(activeId)}
            onClick={() => onOpenEdit(c)}
          />
        ))}
        {filtered.length === 0 && (
          <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
        )}
      </Stack>
    </WhiteCard>
  );
}

/** Cartão: editor inline de criança (criar/editar/remover) — SEMPRE MONTADO */
function ChildEditorCard({
  open,
  isNew,
  child,
  onClose,
  onSaved,
  refreshChildren,
  setActiveId,
}: {
  open: boolean;
  isNew: boolean;
  child: UIChild | null;
  onClose: () => void;
  onSaved: (savedId: number) => void;
  refreshChildren: () => Promise<UIChild[]>;
  setActiveId: (id: number) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState(child?.name || "");
  const [formBirth, setFormBirth] = useState(toYMD(child?.birthDate || null));
  const [formGender, setFormGender] = useState<GenderCode>(
    toGenderCode(child?.gender)
  );
  const [formProfile, setFormProfile] = useState(child?.readerProfile || "");

  // Mantém o formulário sincronizado quando muda a criança ativa
  useEffect(() => {
    setFormName(child?.name || "");
    setFormBirth(toYMD(child?.birthDate || null));
    setFormGender(toGenderCode(child?.gender));
    setFormProfile(child?.readerProfile || "");
  }, [child?.id]);

  /** Handler: remover (confirmado) */
  const onRemove = useCallback(async () => {
    if (!child) return;
    if (!confirm(`Remover ${child.name}?`)) return;
    setSaving(true);
    setErr(null);
    try {
      await deleteChildSvc(child.id);
      const list = await refreshChildren();
      setActiveId(list[0]?.id ?? NaN);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Erro ao remover.");
    } finally {
      setSaving(false);
    }
  }, [child, refreshChildren, setActiveId, onClose]);

  /** Handler: guardar (criar/editar) */
  const onSave = useCallback(async () => {
    if (!formName.trim()) {
      setErr("O nome é obrigatório.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      name: sanitizeName(formName.trim()),
      birthDate: formBirth || null, // enviar em YYYY-MM-DD (evita TZ)
      gender: (formGender || null) as "M" | "F" | "O" | null,
      readerProfile: formProfile || null,
    };
    try {
      const saved = isNew
        ? await createChild(payload)
        : await updateChildSvc(child!.id, payload);
      await refreshChildren();
      onSaved(Number((saved as any).id));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Falha ao guardar.");
    } finally {
      setSaving(false);
    }
  }, [
    formName,
    formBirth,
    formGender,
    formProfile,
    isNew,
    child,
    onClose,
    onSaved,
    refreshChildren,
  ]);

  const childErrors = useMemo(() => {
    const e: { name?: string } = {};
    if (!formName.trim()) e.name = "Obrigatório.";
    else if (formName.trim().length < 2) e.name = "Nome muito curto.";
    return e;
  }, [formName]);

  const disabled = !open; // cartão sempre montado; desativa inputs/ações quando fechado

  return (
    <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 720 }}>
      <SectionHeader
        title={
          open ? (isNew ? "Adicionar criança" : "Editar criança") : "Editor de criança"
        }
        icon={<FamilyRestroomRounded />}
        action={
          <Stack direction="row" spacing={1}>
            {!isNew && child && (
              <Tooltip title={disabled ? "Abrir editor para remover" : "Remover criança"}>
                <span>
                  <PrimaryButton
                    variant="outlined"
                    color="error"
                    onClick={onRemove}
                    disabled={disabled || saving}
                  >
                    Remover
                  </PrimaryButton>
                </span>
              </Tooltip>
            )}
            <PrimaryButton variant="outlined" onClick={onClose} disabled={disabled}>
              Cancelar
            </PrimaryButton>
            <PrimaryButton
              onClick={onSave}
              disabled={disabled || saving || !!childErrors.name}
            >
              {saving ? "A guardar…" : "Guardar"}
            </PrimaryButton>
          </Stack>
        }
      />

      {!open && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Selecione <b>“+ Adicionar criança”</b> ou <b>“Editar dados”</b> para abrir o editor.
        </Alert>
      )}

      {err && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {err}
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
            autoFocus={open}
            inputProps={{ maxLength: 60 }}
            error={!!childErrors.name && open}
            helperText={(open && childErrors.name) || " "}
            disabled={disabled}
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
            disabled={disabled}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Género"
            value={formGender}
            onChange={(e) => setFormGender(e.target.value as GenderCode)}
            size="small"
            fullWidth
            disabled={disabled}
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
            disabled={disabled}
          />
        </Grid>
      </Grid>
    </WhiteCard>
  );
}

/** Cartão: painel de atividade da criança ativa (leituras, badges, consultas, sugestões) */
function ActiveChildPanelCard({
  child,
  leituras,
  badges,
  consultas,
  loading,
  onOpenEdit,
  onGenerateSuggestions,
  suggestionsBusy,
}: {
  child: UIChild | null;
  leituras: BookLite[];
  badges: BadgeLite[];
  consultas: ConsultaLite[];
  loading: boolean;
  onOpenEdit: (c: UIChild) => void;
  onGenerateSuggestions: () => void;
  suggestionsBusy: boolean;
}) {
  const title = child ? child.name : "Seleciona uma criança";
  return (
    <WhiteCard sx={{ mx: "auto", width: "100%", maxWidth: 520 }}>
      <SectionHeader
        title={title}
        icon={<PersonRounded />}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Gerar sugestões para esta criança">
              <span>
                <IconButton
                  size="small"
                  onClick={onGenerateSuggestions}
                  disabled={!child || suggestionsBusy}
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

      {!child ? (
        <Typography sx={{ opacity: 0.7 }}>
          Escolhe uma criança para ver a atividade.
        </Typography>
      ) : loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={1.25}>
          {/* Leituras recentes */}
          <Box>
            <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.5 }}>
              Leituras recentes
            </Typography>
            {leituras.length ? (
              <Stack
                spacing={0.75}
                divider={<Divider sx={{ borderColor: "divider" }} />}
              >
                {leituras.slice(0, 3).map((b, i) => {
                  const bookKey =
                    (b as any).id ??
                    (b as any).isbn ??
                    `${(b as any).title ?? "book"}-${i}`;
                  return (
                    <Stack key={String(bookKey)} direction="row" gap={1} alignItems="center">
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
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            de {authorOf(b)}
                          </Typography>
                        )}
                      </Box>
                      <RouteLink href="/reading">Abrir</RouteLink>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography sx={{ opacity: 0.7 }}>
                Sem leituras ativas.
              </Typography>
            )}
          </Box>

          {/* Conquistas recentes */}
          <Box>
            <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.5 }}>
              Conquistas recentes
            </Typography>
            {badges.length ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {badges.slice(0, 6).map((b, i) => {
                  const isTrophy = (b.type || "")
                    .toUpperCase()
                    .includes("TROF");
                  const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;
                  const badgeKey = [
                    b.id ?? "noid",
                    b.name ?? "noname",
                    b.assignedAt ?? "noat",
                    i,
                  ].join("-");
                  return (
                    <Tooltip
                      key={badgeKey}
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
            <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.5 }}>
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
                      <Stack direction="row" spacing={1} alignItems="center">
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
                        <Typography noWrap title={c.title} sx={{ ml: 0.5 }}>
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
  );
}

/* =====================================================================================
   PÁGINA PRINCIPAL
   ===================================================================================== */

export default function FamilyPage() {
  const { user } = useUserSession();

  // Estado/gestão de crianças (hook pequeno)
  const { children, activeId, setActiveId, refreshChildren } =
    useFamilyChildren(user);

  // Criança ativa e atividade associada
  const activeChild = useMemo(
    () => children.find((c) => Number(c.id) === Number(activeId)) ?? null,
    [children, activeId]
  );
  const {
    leituras,
    badges,
    consultas,
    loading: loadingChild,
  } = useActiveChildData(activeChild?.id, user?.id);

  // Editor de criança
  const [editOpen, setEditOpen] = useState(false);
  const [editIsNew, setEditIsNew] = useState(false);

  // Pesquisa
  const [q, setQ] = useState("");

  // Sugestões (gerar)
  const [sugLoading, setSugLoading] = useState(false);
  const generateSuggestions = useCallback(async () => {
    const cid = validId(activeChild?.id);
    if (!cid) return;
    setSugLoading(true);
    try {
      await getSugestoesPerfil(6, { childId: cid });
    } finally {
      setSugLoading(false);
    }
  }, [activeChild?.id]);

  // Abertura dos editores
  const openEdit = useCallback(
    (c: UIChild) => {
      setActiveId(Number(c.id));
      setEditIsNew(false);
      setEditOpen(true);
    },
    [setActiveId]
  );
  const openCreate = useCallback(() => {
    setEditIsNew(true);
    setEditOpen(true);
  }, []);

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
        {/* Coluna esquerda: Dados família + Editor de criança (sempre montado) */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FamilyFormCard
            initial={{
              fullName: user?.fullName ?? undefined,
              email: user?.email ?? undefined,
              phone: user?.phone ?? undefined,
              citizenCard: user?.citizenCard ?? undefined,
              address: user?.address ?? undefined,
            }}
          />

          <ChildEditorCard
            open={editOpen}
            isNew={editIsNew}
            child={editIsNew ? null : activeChild}
            onClose={() => setEditOpen(false)}
            onSaved={(id) => setActiveId(id)}
            refreshChildren={refreshChildren}
            setActiveId={setActiveId}
          />
        </Grid>

        {/* Coluna direita: Lista + Painel de atividade */}
        <Grid
          item
          xs={12}
          md={5}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <ChildrenListCard
            children={children}
            activeId={activeId}
            q={q}
            setQ={setQ}
            onOpenCreate={openCreate}
            onOpenEdit={openEdit}
          />

          <ActiveChildPanelCard
            child={activeChild}
            leituras={leituras}
            badges={badges}
            consultas={consultas}
            loading={loadingChild}
            onOpenEdit={openEdit}
            onGenerateSuggestions={generateSuggestions}
            suggestionsBusy={sugLoading}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

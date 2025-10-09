// ============================ apps/web/src/pages/achievements.tsx ============================
/**
 * Autor: Alexandre Brrissos — Nº 21131
 *
 * Página: Conquistas (badges e troféus) da criança selecionada.
 *
 * Objetivos deste refactor:
 *  - Helpers utilitários → **PUROS** e com menos de 30 linhas
 *  - Handlers/hooks pequenos e focados
 *  - Componentes de UI simples e auto-explicativos
 *  - Comentários claros por secção
 */

import { useEffect, useMemo, useState, memo } from "react";
import { WhiteCard, AvatarSelect } from "@bibliotecario/ui-web";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  Avatar,
  Tooltip,
  LinearProgress,
} from "@mui/material";

import MilitaryTechRounded from "@mui/icons-material/MilitaryTechRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";

import { useUserSession } from "../../contexts/UserSession";
import {
  listBadges,
  listBadgeAssignments,
  type Badge,
  type BadgeAssignment,
} from "../../services/badges";

/* =====================================================================================
   UTILITÁRIAS (PURO / <30 linhas)
   ===================================================================================== */

/** PURE: normaliza o tipo (uppercase, sem acentos) */
function normType(t?: unknown) {
  return String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/** PURE: identifica se o tipo é “troféu” */
function isTrophyType(t?: unknown) {
  return normType(t).includes("TROF");
}

/** PURE: constrói um Map badgeId -> assignedAt para pesquisa O(1) */
function buildEarnedMap(assignments: BadgeAssignment[]) {
  const m = new Map<number, string>();
  for (const a of assignments) m.set(a.badgeId, a.assignedAt);
  return m;
}

/** PURE: catálogo fallback (quando a API /badges não existe) */
function catalogFromAssignments(asg: BadgeAssignment[]): Badge[] {
  const seen = new Set<number>();
  const out: Badge[] = [];
  for (const a of asg) {
    if (seen.has(a.badgeId)) continue;
    seen.add(a.badgeId);
    out.push(
      a.badge ?? {
        id: a.badgeId,
        name: `Badge #${a.badgeId}`,
        type: "STAMP",
        criteria: null,
      }
    );
  }
  return out;
}

/** PURE: percentagem “x de total” (0..100) */
function progressPct(x: number, total: number) {
  return total > 0 ? (x / total) * 100 : 0;
}

/** PURE: opções para AvatarSelect (id/nome/avatar) */
function toChildOptions(user?: any) {
  return ((user?.children as any[]) || []).map((c) => ({
    id: String(c.id),
    nome: c.name ?? "Criança",
    avatar: (c as any).avatarUrl ?? undefined,
  }));
}

/* =====================================================================================
   PEÇAS DE UI PEQUENAS
   ===================================================================================== */

/** Cabeçalho de secção (reutilizável) */
const SectionHeader = memo(function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Typography
        variant="h6"
        fontWeight={900}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        {icon}
        {title}
      </Typography>
      {action}
    </Stack>
  );
});

/** Cartão de badge (earned vs locked) */
const BadgeCard = memo(function BadgeCard({
  badge,
  earnedAt,
  onClick,
}: {
  badge: Badge;
  earnedAt?: string;
  onClick?: () => void;
}) {
  const isEarned = Boolean(earnedAt);
  const isTrophy = isTrophyType(badge.type);
  const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;

  return (
    <Box
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: isEarned ? "success.main" : "divider",
        bgcolor: isEarned ? "success.light" : "background.paper",
        cursor: onClick ? "pointer" : "default",
        "&:hover": { bgcolor: isEarned ? "success.main" : "action.hover" },
        transition: "background-color .15s ease",
      }}
      title={badge.criteria || ""}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: isTrophy ? "warning.main" : "primary.main",
            color: "primary.contrastText",
            opacity: isEarned ? 1 : 0.65,
          }}
        >
          <Icon fontSize="small" />
        </Avatar>

        <Box flex={1} minWidth={0} sx={{ overflow: "hidden" }}>
          <Typography noWrap fontWeight={900}>
            {badge.name}
          </Typography>

          {!!badge.criteria && (
            <Tooltip arrow placement="top" title={badge.criteria}>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.8,
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textDecoration: "underline",
                }}
              >
                ver critério
              </Typography>
            </Tooltip>
          )}
        </Box>

        {isEarned ? (
          <Tooltip title={new Date(earnedAt!).toLocaleString("pt-PT")}>
            <CheckCircleRounded color="success" />
          </Tooltip>
        ) : (
          <Tooltip title="Por conquistar">
            <LockOutlined sx={{ opacity: 0.6 }} />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
});

/* =====================================================================================
   PÁGINA PRINCIPAL
   ===================================================================================== */

export default function AchievementsPage() {
  // ⚠️ Modo criança vs. família: a seleção aqui é **LOCAL** (não mexe no contexto global)
  const { user, asChild } = useUserSession();

  // Seletor LOCAL de criança (apenas no modo família)
  const [localChildId, setLocalChildId] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    if (asChild) setLocalChildId(undefined); // ao entrar em modo criança, limpamos
  }, [asChild]);

  // ID ativo: actingChild (modo criança) OU localChildId (modo família)
  const activeChildId = useMemo(() => {
    if (asChild) return Number((user as any)?.actingChild?.id);
    return localChildId ? Number(localChildId) : NaN;
  }, [asChild, user?.actingChild?.id, localChildId]);

  // Estado principal
  const [badges, setBadges] = useState<Badge[]>([]);
  const [assignments, setAssignments] = useState<BadgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // Opções do seletor
  const childOptions = useMemo(() => toChildOptions(user), [user]);

  /* ---------- EFEITOS: catálogo de badges (1x) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const list = await listBadges();
        setBadges(Array.isArray(list) ? list : []);
      } catch {
        setBadges([]); // tolerante: se /badges não existir
      }
    })();
  }, []);

  /* ---------- EFEITOS: assignments por criança ativa ---------- */
  useEffect(() => {
    (async () => {
      if (!Number.isFinite(activeChildId)) {
        setAssignments([]);
        return;
      }
      try {
        setLoading(true);
        const list = await listBadgeAssignments(Number(activeChildId));
        setAssignments(Array.isArray(list) ? list : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeChildId]);

  /* ---------- DERIVADOS: earned map / catálogo / grupos / progresso ---------- */
  const earnedById = useMemo(() => buildEarnedMap(assignments), [assignments]);

  // Se a API /badges não existir, bombear catálogo a partir de assignments
  const catalog: Badge[] = useMemo(() => {
    return badges.length ? badges : catalogFromAssignments(assignments);
  }, [badges, assignments]);

  const groups = useMemo(() => {
    const stamps = catalog.filter((b) => normType(b.type) === "STAMP");
    const trophies = catalog.filter((b) => isTrophyType(b.type));
    return { stamps, trophies };
  }, [catalog]);

  const stampsEarned = useMemo(
    () => groups.stamps.filter((b) => earnedById.has(b.id)).length,
    [groups.stamps, earnedById]
  );
  const trophiesEarned = useMemo(
    () => groups.trophies.filter((b) => earnedById.has(b.id)).length,
    [groups.trophies, earnedById]
  );

  const stampsPct = useMemo(
    () => progressPct(stampsEarned, groups.stamps.length),
    [stampsEarned, groups.stamps.length]
  );
  const trophiesPct = useMemo(
    () => progressPct(trophiesEarned, groups.trophies.length),
    [trophiesEarned, groups.trophies.length]
  );

  // Detalhe selecionado
  const focusedBadge = useMemo(
    () =>
      focusedId != null
        ? catalog.find((b) => b.id === focusedId) ?? null
        : null,
    [catalog, focusedId]
  );
  const focusedEarnedAt = focusedBadge
    ? earnedById.get(focusedBadge.id)
    : undefined;

  /* ===================================================================================
     UI
     =================================================================================== */
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Título */}
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{
          mb: 2,
          letterSpacing: 0.3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <MilitaryTechRounded fontSize="large" />
        Conquistas
      </Typography>

      {/* Seletor de criança — só em modo família (apenas filtra, não muda active user) */}
      {!asChild && !!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <SectionHeader title="Escolher criança" icon={<PeopleAltRounded />} />
          <AvatarSelect
            label="Filtrar por criança"
            options={childOptions}
            value={localChildId}
            onChange={(id) => setLocalChildId(id)}
            minWidth={320}
          />
        </WhiteCard>
      )}

      {/* Modo criança: mostra a criança ativa (contexto) */}
      {asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <SectionHeader title="A atuar como" icon={<PersonRounded />} />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ width: 32, height: 32 }}>
              {(user?.actingChild?.name || "?").charAt(0)}
            </Avatar>
            <Typography fontWeight={900}>{user?.actingChild?.name}</Typography>
            <Chip size="small" label="Modo criança" variant="outlined" />
          </Stack>
        </WhiteCard>
      )}

      {/* Resumo + progresso */}
      <WhiteCard sx={{ mb: 2 }}>
        <SectionHeader title="Resumo" icon={<InsightsRounded />} />
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <Chip
              icon={<VerifiedRounded />}
              label={`Selos: ${stampsEarned} / ${groups.stamps.length}`}
            />
            <Chip
              icon={<EmojiEventsRounded />}
              label={`Troféus: ${trophiesEarned} / ${groups.trophies.length}`}
            />
            {!Number.isFinite(activeChildId) && (
              <Typography sx={{ opacity: 0.8 }}>
                {asChild
                  ? "Sem criança ativa."
                  : "Escolhe uma criança para ver as conquistas."}
              </Typography>
            )}
            {loading && (
              <Typography sx={{ opacity: 0.8 }}>A carregar…</Typography>
            )}
          </Stack>

          {/* Barras de progresso */}
          <Stack spacing={1}>
            <Typography
              variant="caption"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                opacity: 0.8,
              }}
            >
              <VerifiedRounded fontSize="small" /> Progresso de selos
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round(stampsPct)}
              sx={{ borderRadius: 999 }}
            />
            <Typography
              variant="caption"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                opacity: 0.8,
              }}
            >
              <EmojiEventsRounded fontSize="small" /> Progresso de troféus
            </Typography>
            <LinearProgress
              color="warning"
              variant="determinate"
              value={Math.round(trophiesPct)}
              sx={{ borderRadius: 999 }}
            />
          </Stack>
        </Stack>
      </WhiteCard>

      {/* Grelhas */}
      <Stack spacing={2}>
        {/* Selos */}
        <WhiteCard>
          <SectionHeader title="Selos" icon={<VerifiedRounded />} />
          {groups.stamps.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 1,
              }}
            >
              {groups.stamps.map((b) => (
                <BadgeCard
                  key={b.id}
                  badge={b}
                  earnedAt={earnedById.get(b.id)}
                  onClick={() => setFocusedId(b.id)}
                />
              ))}
            </Box>
          ) : (
            <Typography sx={{ opacity: 0.7 }}>Sem selos definidos.</Typography>
          )}
        </WhiteCard>

        {/* Troféus */}
        <WhiteCard>
          <SectionHeader title="Troféus" icon={<EmojiEventsRounded />} />
          {groups.trophies.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 1,
              }}
            >
              {groups.trophies.map((b) => (
                <BadgeCard
                  key={b.id}
                  badge={b}
                  earnedAt={earnedById.get(b.id)}
                  onClick={() => setFocusedId(b.id)}
                />
              ))}
            </Box>
          ) : (
            <Typography sx={{ opacity: 0.7 }}>
              Sem troféus definidos.
            </Typography>
          )}
        </WhiteCard>
      </Stack>

      {/* Detalhe da conquista (quando selecionada) */}
      {focusedId != null && (
        <WhiteCard sx={{ mt: 2 }}>
          <SectionHeader title="Detalhe da conquista" icon={<InfoOutlined />} />
          {!focusedBadge ? (
            <Typography>Badge não encontrado.</Typography>
          ) : (
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={900}>
                {focusedBadge.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={
                    isTrophyType(focusedBadge.type) ? (
                      <EmojiEventsRounded />
                    ) : (
                      <VerifiedRounded />
                    )
                  }
                  label={focusedBadge.type}
                  variant="outlined"
                />
                {focusedEarnedAt ? (
                  <Chip
                    color="success"
                    icon={<CheckCircleRounded />}
                    label={`Conquistado em ${new Date(
                      focusedEarnedAt
                    ).toLocaleDateString("pt-PT")}`}
                  />
                ) : (
                  <Chip icon={<LockOutlined />} label="Por conquistar" />
                )}
              </Stack>

              {!!focusedBadge.criteria && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography sx={{ opacity: 0.9 }}>
                    {focusedBadge.criteria}
                  </Typography>
                </>
              )}
            </Stack>
          )}
        </WhiteCard>
      )}
    </Container>
  );
}

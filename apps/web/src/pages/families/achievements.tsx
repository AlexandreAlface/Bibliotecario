// apps/web/src/pages/achievements.tsx
import { useEffect, useMemo, useState } from "react";
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

/* --- UI helpers --- */
function SectionHeader({
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
}

function BadgeCard({
  badge,
  earnedAt,
  onClick,
}: {
  badge: Badge;
  earnedAt?: string;
  onClick?: () => void;
}) {
  const isEarned = Boolean(earnedAt);
  const isTrophy = String(badge.type).toUpperCase().includes("TROF");
  const Icon = isTrophy ? EmojiEventsRounded : VerifiedRounded;

  const bg = isEarned ? "success.light" : "background.paper";
  const border = isEarned ? "success.main" : "divider";

  return (
    <Box
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: border,
        bgcolor: bg,
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
}

/* =================== Página =================== */
export default function AchievementsPage() {
  // ⚠️ Só lemos user/asChild; a seleção aqui é LOCAL
  const { user, asChild } = useUserSession();

  // seleção local para modo família (não mexe no contexto global)
  const [localChildId, setLocalChildId] = useState<string | undefined>(
    undefined
  );

  // quando muda entre modo criança/família limpamos o filtro local
  useEffect(() => {
    if (asChild) setLocalChildId(undefined);
  }, [asChild]);

  // ID ativo: actingChild em modo criança; localChildId em modo família
  const activeChildId = useMemo(() => {
    if (asChild) return Number((user as any)?.actingChild?.id);
    return localChildId ? Number(localChildId) : NaN;
  }, [asChild, user?.actingChild?.id, localChildId]);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [assignments, setAssignments] = useState<BadgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // opções para o seletor (apenas em modo família)
  const childOptions =
    (user?.children || []).map((c) => ({
      id: String(c.id),
      nome: c.name ?? "Criança", // garantir string
      avatar: (c as any).avatarUrl ?? undefined,
    })) ?? [];

  /* carregar catálogo de badges 1x */
  useEffect(() => {
    (async () => {
      try {
        const list = await listBadges();
        setBadges(list);
      } catch {
        setBadges([]); // se /badges não existir, mostramos só conquistas
      }
    })();
  }, []);

  /* carregar assignments quando muda a criança ativa */
  useEffect(() => {
    (async () => {
      if (!Number.isFinite(activeChildId)) {
        setAssignments([]);
        return;
      }
      try {
        setLoading(true);
        const list = await listBadgeAssignments(activeChildId);
        setAssignments(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeChildId]);

  const earnedById = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of assignments) m.set(a.badgeId, a.assignedAt);
    return m;
  }, [assignments]);

  // catálogo (fallback quando não há /badges)
  const catalog: Badge[] = useMemo(() => {
    if (badges.length) return badges;
    const seen = new Set<number>();
    const s: Badge[] = [];
    for (const a of assignments) {
      if (seen.has(a.badgeId)) continue;
      seen.add(a.badgeId);
      s.push(
        a.badge ?? {
          id: a.badgeId,
          name: `Badge #${a.badgeId}`,
          type: "STAMP",
          criteria: null,
        }
      );
    }
    return s;
  }, [badges, assignments]);

  const groups = useMemo(() => {
    const normType = (t: any) =>
      String(t ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    const stamps = catalog.filter((b) => normType(b.type) === "STAMP");
    const trophies = catalog.filter((b) => normType(b.type).includes("TROF"));
    return { stamps, trophies };
  }, [catalog]);

  const countEarned = (arr: Badge[]) =>
    arr.filter((b) => earnedById.has(b.id)).length;

  // progresso para resumo
  const stampsEarned = countEarned(groups.stamps);
  const trophiesEarned = countEarned(groups.trophies);
  const stampsPct =
    groups.stamps.length > 0 ? (stampsEarned / groups.stamps.length) * 100 : 0;
  const trophiesPct =
    groups.trophies.length > 0
      ? (trophiesEarned / groups.trophies.length) * 100
      : 0;

  // detalhe selecionado
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

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
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

      {/* Em modo criança, mostra apenas info do perfil ativo */}
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

      {/* Resumo */}
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

          {/* barras de progresso */}
          <Stack spacing={1}>
            <Typography
              variant="caption"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, opacity: 0.8 }}
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
              sx={{ display: "flex", alignItems: "center", gap: 0.5, opacity: 0.8 }}
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

      {/* Detalhe da conquista */}
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
                    String(focusedBadge.type).toUpperCase().includes("TROF") ? (
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

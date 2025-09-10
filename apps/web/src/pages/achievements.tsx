// apps/web/src/pages/conquistas.tsx
import { useEffect, useMemo, useState } from "react";
import {
  WhiteCard,
  AvatarSelect,
} from "@bibliotecario/ui-web";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";

import { useUserSession } from "../contexts/UserSession";
import {
  listBadges,
  listBadgeAssignments,
  type Badge,
  type BadgeAssignment,
} from "../services/badges";

/* --- UI helpers --- */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.25 }}
    >
      <Typography variant="h6" fontWeight={900}>{title}</Typography>
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
  const Icon = badge.type === "TROFÉU" ? EmojiEventsRounded : VerifiedRounded;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: isEarned ? "success.light" : "divider",
        bgcolor: isEarned ? "success.light" : "background.paper",
        color: isEarned ? "success.contrastText" : "inherit",
        cursor: "pointer",
        "&:hover": { bgcolor: isEarned ? "success.main" : "action.hover" },
        transition: "background-color .15s ease",
      }}
      title={badge.criteria || ""}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar sx={{ width: 32, height: 32 }}>
          <Icon fontSize="small" />
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Typography noWrap fontWeight={900}>{badge.name}</Typography>
          {badge.criteria && (
            <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
              {badge.criteria}
            </Typography>
          )}
        </Box>
        {isEarned && (
          <Tooltip title={new Date(earnedAt!).toLocaleString("pt-PT")}>
            <CheckCircleRounded />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/* =================== Página =================== */
export default function AchievementsPage() {
  const { user, asChild, selectedChildId, setSelectedChildId, actAsChild } =
    useUserSession();

  // child ativo: em modo criança usamos o actingChild; em modo família é a seleção
  const activeChildId = useMemo(() => {
    if (asChild) return Number((user as any)?.actingChild?.id);
    return selectedChildId ? Number(selectedChildId) : NaN;
  }, [asChild, user?.actingChild?.id, selectedChildId]);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [assignments, setAssignments] = useState<BadgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // opções para o seletor (apenas em modo família)
  const childOptions = (user?.children || []).map((c) => ({
    id: String(c.id),
    nome: c.name,
    avatar: (c as any).avatarUrl || undefined,
  }));

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

  // Se não houver catálogo, mostrar só as conquistadas (a partir dos assignments)
  const catalog: Badge[] = useMemo(() => {
    if (badges.length) return badges;
    // construir catálogo mínimo a partir dos assignments (quando API não tiver /badges)
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
    const stamps = catalog.filter((b) => String(b.type).toUpperCase() === "STAMP");
    const trophies = catalog.filter((b) => String(b.type).toUpperCase() === "TROFÉU");
    return { stamps, trophies };
  }, [catalog]);

  // contadores
  const countEarned = (arr: Badge[]) => arr.filter((b) => earnedById.has(b.id)).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight={900} sx={{ mb: 2, letterSpacing: 0.3 }}>
        Conquistas
      </Typography>

      {/* Seletor de criança — só em modo família */}
      {!asChild && !!user?.children?.length && (
        <WhiteCard sx={{ mb: 2 }}>
          <SectionHeader title="Escolher criança" />
          <AvatarSelect
            label="Filtrar por criança"
            options={childOptions}
            value={selectedChildId ?? ""}
            onChange={async (id) => {
              const eff = id && String(id).length ? String(id) : "";
              setSelectedChildId(eff);
            }}
            minWidth={320}
          />
        </WhiteCard>
      )}

      {/* Em modo criança, não mostrar seletor; mostrar info do perfil ativo */}
      {asChild && (
        <WhiteCard sx={{ mb: 2 }}>
          <SectionHeader title="A atuar como" />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ width: 32, height: 32 }}>
              {(user?.actingChild?.name || "?").charAt(0)}
            </Avatar>
            <Typography fontWeight={900}>{user?.actingChild?.name}</Typography>
            <Chip size="small" label="Modo criança" />
          </Stack>
        </WhiteCard>
      )}

      {/* Stats/Resumo */}
      <WhiteCard sx={{ mb: 2 }}>
        <SectionHeader title="Resumo" />
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
          <Chip
            icon={<VerifiedRounded />}
            label={`Selos: ${countEarned(groups.stamps)} / ${groups.stamps.length}`}
          />
          <Chip
            icon={<EmojiEventsRounded />}
            label={`Troféus: ${countEarned(groups.trophies)} / ${groups.trophies.length}`}
          />
          {!Number.isFinite(activeChildId) && (
            <Typography sx={{ opacity: 0.8 }}>
              {asChild
                ? "Sem criança ativa."
                : "Escolhe uma criança para ver as conquistas."}
            </Typography>
          )}
          {loading && <Typography sx={{ opacity: 0.8 }}>A carregar…</Typography>}
        </Stack>
      </WhiteCard>

      <Stack spacing={2}>
        {/* SELos */}
        <WhiteCard>
          <SectionHeader title="Selos" />
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
          <SectionHeader title="Troféus" />
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
            <Typography sx={{ opacity: 0.7 }}>Sem troféus definidos.</Typography>
          )}
        </WhiteCard>
      </Stack>

      {/* Detalhe opcional no fim (quando o utilizador clica num badge) */}
      {focusedId != null && (
        <WhiteCard sx={{ mt: 2 }}>
          <SectionHeader title="Detalhe da conquista" />
          {(() => {
            const badge = catalog.find((b) => b.id === focusedId);
            if (!badge) return <Typography>Badge não encontrado.</Typography>;
            const earnedAt = earnedById.get(badge.id);

            return (
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={900}>{badge.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    icon={
                      badge.type === "TROFÉU" ? (
                        <EmojiEventsRounded />
                      ) : (
                        <VerifiedRounded />
                      )
                    }
                    label={badge.type}
                    variant="outlined"
                  />
                  {earnedAt ? (
                    <Chip
                      color="success"
                      icon={<CheckCircleRounded />}
                      label={`Conquistado em ${new Date(earnedAt).toLocaleDateString("pt-PT")}`}
                    />
                  ) : (
                    <Chip label="Por conquistar" />
                  )}
                </Stack>
                {!!badge.criteria && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography sx={{ opacity: 0.9 }}>{badge.criteria}</Typography>
                  </>
                )}
              </Stack>
            );
          })()}
        </WhiteCard>
      )}
    </Container>
  );
}

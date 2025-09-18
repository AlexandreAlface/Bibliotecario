import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import TodayRounded from "@mui/icons-material/TodayRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import { WhiteCard, AvatarSelect, RouteLink } from "@bibliotecario/ui-web";
import type { AvatarOption } from "@bibliotecario/ui-web";

import { useUserSession } from "../../contexts/UserSession";
import {
  getConsultationsHistory,
  type ConsultationFull,
} from "../../services/consultations";

/* ---------- helpers ---------- */
const STATUS_CFG: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmado", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusado", color: "error" },
  CANCELLED: { label: "Cancelado", color: "default" },
  COMPLETED: { label: "Concluído", color: "success" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", hhmm: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    hhmm: d.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/* ---------- item da lista ---------- */
function HistoryRow({
  c,
  onClick,
}: {
  c: ConsultationFull;
  onClick?: () => void;
}) {
  const theme = useTheme();
  const iso = c.startAt || c.requestedAt || undefined;
  const { day, mon, hhmm } = parts(iso);
  const cfg = STATUS_CFG[(c.status || "").toUpperCase()] || {
    label: c.status || "",
    color: "default",
  };

  const subtitle =
    c.child?.name
      ? `Consulta de ${c.child.name} • com ${c.librarian?.fullName ?? "—"}`
      : `Consulta com ${c.librarian?.fullName ?? "—"}`;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick ? { bgcolor: "action.hover" } : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* date pill */}
        <Box
          sx={{
            width: 68,
            height: 68,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Box textAlign="center" sx={{ lineHeight: 1 }}>
            <Typography fontWeight={900}>{day}</Typography>
            <Typography
              variant="caption"
              sx={{ textTransform: "uppercase", opacity: 0.8 }}
            >
              {mon}
            </Typography>
            {!!hhmm && (
              <Typography
                variant="caption"
                sx={{ display: "block", opacity: 0.8 }}
              >
                {hhmm}
              </Typography>
            )}
          </Box>
        </Box>

        {/* conteúdo */}
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900} noWrap title={c.title ?? "Consulta"}>
            {c.title ?? "Consulta"}
          </Typography>

          <Typography variant="body2" noWrap sx={{ opacity: 0.8 }}>
            {subtitle}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.5 }}
            useFlexGap
            flexWrap="wrap"
          >
            <Chip
              size="small"
              icon={<CalendarMonthRounded fontSize="small" />}
              label={
                iso
                  ? new Date(iso).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            {!!hhmm && (
              <Chip
                size="small"
                icon={<AccessTimeRounded fontSize="small" />}
                label={hhmm}
              />
            )}
            {!!c.status && (
              <Chip
                size="small"
                color={cfg.color}
                label={cfg.label}
                variant="outlined"
              />
            )}
            {!!c.library?.name && <Chip size="small" label={c.library.name} />}
          </Stack>
        </Box>

        <RouteLink href="/consultas">Ver</RouteLink>
      </Stack>
    </Box>
  );
}

/* =================== Página =================== */

type GroupedDay = { key: string; label: string; items: ConsultationFull[] };

export default function HistoricoConsultasPage() {
  const { user, asChild, isLibrarian } = useUserSession() as any;

  // filtros
  const [localChildId, setLocalChildId] = useState<string | undefined>();
  const [fromYmd, setFromYmd] = useState(
    fmtYMD(startOfDay(new Date(new Date().setMonth(new Date().getMonth() - 6))))
  ); // últimos 6 meses
  const [toYmd, setToYmd] = useState(fmtYMD(new Date())); // hoje
  const [statusSet, setStatusSet] = useState<Set<string>>(
    new Set(["COMPLETED", "CANCELLED", "DECLINED"])
  );

  const [items, setItems] = useState<ConsultationFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // opções para o filtro por criança (usado só para famílias)
  const childBaseOptions: AvatarOption[] = (user?.children || []).map((c: { id: any; name: any; }) => ({
    id: String(c.id),
    nome: c.name ?? "",
    avatar: (c as any).avatarUrl ?? undefined,
  }));
  const selectOptions: AvatarOption[] = [
    { id: "", nome: "Todos os filhos", avatar: undefined },
    ...childBaseOptions,
  ];

  async function reload() {
    try {
      setLoading(true);
      setErr(null);

      const query: any = {
        limit: 200,
        order: "desc",
        from: new Date(fromYmd).toISOString(),
        to: endOfDay(new Date(toYmd)).toISOString(),
        status: Array.from(statusSet),
      };

      if (isLibrarian) {
        const lid = Number(user?.id);
        if (Number.isFinite(lid)) query.librarianId = lid;
      } else if (asChild) {
        const cid = Number((user?.actingChild?.id as any) ?? NaN);
        if (Number.isFinite(cid)) query.childId = cid;
      } else {
        const fid = Number(user?.id);
        if (Number.isFinite(fid)) query.familyId = fid;
        if (localChildId && localChildId !== "") {
          const cid = Number(localChildId);
          if (Number.isFinite(cid)) query.childId = cid;
        }
      }

      const res = await getConsultationsHistory(query);
      setItems(res || []);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar histórico");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fromYmd,
    toYmd,
    Array.from(statusSet).join(","),
    localChildId,
    asChild,
    user?.actingChild?.id,
    user?.id,
  ]);

  const grouped = useMemo<GroupedDay[]>(() => {
    const map = new Map<string, ConsultationFull[]>();
    for (const c of items) {
      const k = fmtYMD(c.startAt || c.requestedAt);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(c);
      map.set(k, arr);
    }
    // ordenar por data desc
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, arr]) => ({
        key,
        label: new Date(key).toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        items: arr.sort(
          (a, b) =>
            new Date(b.startAt || 0).getTime() -
            new Date(a.startAt || 0).getTime()
        ),
      }));
  }, [items]);

  const toggleStatus = (s: string) =>
    setStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const quickSet = (days: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - days);
    setFromYmd(fmtYMD(from));
    setToYmd(fmtYMD(now));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        Histórico de consultas
      </Typography>

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              label="De"
              type="date"
              value={fromYmd}
              onChange={(e) => setFromYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="Até"
              type="date"
              value={toYmd}
              onChange={(e) => setToYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <IconButton
              onClick={() => {
                setFromYmd(fmtYMD(new Date()));
                setToYmd(fmtYMD(new Date()));
              }}
              title="Ir para hoje"
              aria-label="Hoje"
            >
              <TodayRounded />
            </IconButton>

            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => quickSet(30)}>
                Últimos 30d
              </Button>
              <Button size="small" onClick={() => quickSet(90)}>
                90d
              </Button>
              <Button size="small" onClick={() => quickSet(365)}>
                12 meses
              </Button>
            </Stack>
          </Stack>

          {/* Filtro por criança (apenas famílias no modo normal) */}
          {!isLibrarian && !asChild && !!user?.children?.length && (
            <AvatarSelect
              label="Filtrar por criança"
              options={selectOptions}
              value={localChildId ?? ""}
              onChange={(id?: string) => setLocalChildId(id)}
              minWidth={280}
            />
          )}
        </Stack>

        {/* Status */}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
          {["COMPLETED", "CANCELLED", "DECLINED", "CONFIRMED", "PENDING"].map(
            (s) => {
              const active = statusSet.has(s);
              const cfg = STATUS_CFG[s] || { label: s, color: "default" };
              return (
                <Chip
                  key={s}
                  clickable
                  color={active ? cfg.color : "default"}
                  variant={active ? "filled" : "outlined"}
                  label={cfg.label}
                  onClick={() => toggleStatus(s)}
                />
              );
            }
          )}
        </Stack>
      </WhiteCard>

      {err && (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      )}

      {/* Lista agrupada por dia */}
      <Grid container spacing={2}>
        {grouped.length === 0 && !loading && (
          <Grid item xs={12}>
            <WhiteCard>
              <Typography sx={{ opacity: 0.7 }}>
                Sem resultados para os filtros selecionados.
              </Typography>
            </WhiteCard>
          </Grid>
        )}

        {grouped.map((g) => (
          <Grid key={g.key} item xs={12}>
            <WhiteCard>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
                {g.label}
              </Typography>

              <Stack
                spacing={1.25}
                divider={<Divider sx={{ borderColor: "divider" }} />}
              >
                {g.items.map((c) => (
                  <HistoryRow key={c.id} c={c} />
                ))}
              </Stack>
            </WhiteCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

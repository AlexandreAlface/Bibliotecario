/**
 * =============================================================================
 *  Histórico de Consultas — Famílias / Bibliotecário
 * -----------------------------------------------------------------------------
 *  Ficheiro: src/pages/families/HistoricoConsultas.tsx
 *  Autor:    Alexandre Brissos  (nº 21131)
 *
 *  Notas de reforço:
 *  - Comentários em TODO o código.
 *  - Helpers "puros" (sem efeitos colaterais) separados para testes fáceis.
 *  - Funções auxiliares curtas (< 30 linhas).
 *  - Mantido padrão de UI do projeto (MUI + ui-web).
 * =============================================================================
 */

import { useEffect, useMemo, useState, useCallback } from "react";
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

/* =================================================================================
 *  Helpers "PUROS" (sem efeitos colaterais) — simples de testar e reutilizar
 * ================================================================================= */

/** Mapa de estados para rótulo/cor de Chip. */
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

/** Início do dia (00:00:00.000) — evita bugs de TZ ao filtrar. */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Fim do dia (23:59:59.999) — útil em filtros "até". */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** YYYY-MM-DD para inputs type="date". */
function fmtYMD(d?: string | Date | null) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  // Mantemos formato local (não UTC) para estabilidade nos inputs.
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Partes formatadas de um ISO (dia, mês curto e hora). */
function parts(iso?: string) {
  if (!iso) return { day: "—", mon: "—", hhmm: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "2-digit" }),
    mon: d.toLocaleDateString("pt-PT", { month: "short" }),
    hhmm: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Agrupa consultas por YYYY-MM-DD e ordena (dia desc, hora desc). */
function groupByDay(items: ConsultationFull[]) {
  const map = new Map<string, ConsultationFull[]>();
  for (const c of items) {
    const k = fmtYMD(c.startAt || c.requestedAt);
    if (!k) continue;
    const arr = map.get(k) || [];
    arr.push(c);
    map.set(k, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // dias desc
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
}

/** Constrói query para a API a partir do contexto/estado. */
function buildHistoryQuery(params: {
  fromYmd: string;
  toYmd: string;
  status: Set<string>;
  isLibrarian: boolean;
  asChild: boolean;
  user: any;
  localChildId?: string;
}) {
  const { fromYmd, toYmd, status, isLibrarian, asChild, user, localChildId } =
    params;

  const q: any = {
    limit: 200,
    order: "desc",
    from: new Date(fromYmd).toISOString(),
    to: endOfDay(new Date(toYmd)).toISOString(),
    status: Array.from(status),
  };

  if (isLibrarian) {
    const lid = Number(user?.id);
    if (Number.isFinite(lid)) q.librarianId = lid;
  } else if (asChild) {
    const cid = Number((user?.actingChild?.id as any) ?? NaN);
    if (Number.isFinite(cid)) q.childId = cid;
  } else {
    const fid = Number(user?.id);
    if (Number.isFinite(fid)) q.familyId = fid;
    if (localChildId && localChildId !== "") {
      const cid = Number(localChildId);
      if (Number.isFinite(cid)) q.childId = cid;
    }
  }
  return q;
}

/* =================================================================================
 *  Item da lista (Componente curto e reutilizável)
 * ================================================================================= */

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

  const subtitle = c.child?.name
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
      role={onClick ? "button" : undefined}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* “pílula” de data */}
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

/* =================================================================================
 *  Página
 * ================================================================================= */

type GroupedDay = { key: string; label: string; items: ConsultationFull[] };

export default function HistoricoConsultasPage() {
  const { user, asChild, isLibrarian } = useUserSession() as any;

  // -------- Filtros de data/estado/filho --------
  const [localChildId, setLocalChildId] = useState<string | undefined>();
  // Por defeito, últimos 6 meses
  const [fromYmd, setFromYmd] = useState(
    fmtYMD(startOfDay(new Date(new Date().setMonth(new Date().getMonth() - 6))))
  );
  const [toYmd, setToYmd] = useState(fmtYMD(new Date()));
  const [statusSet, setStatusSet] = useState<Set<string>>(
    new Set(["COMPLETED", "CANCELLED", "DECLINED"])
  );

  // -------- Estado de dados/erro --------
  const [items, setItems] = useState<ConsultationFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // -------- Opções do seletor por criança (apenas famílias) --------
  const childBaseOptions: AvatarOption[] = (user?.children || []).map(
    (c: { id: any; name: any }) => ({
      id: String(c.id),
      nome: c.name ?? "",
      avatar: (c as any).avatarUrl ?? undefined,
    })
  );
  const selectOptions: AvatarOption[] = [
    { id: "", nome: "Todos os filhos", avatar: undefined },
    ...childBaseOptions,
  ];

  /** Recarrega a lista com base no estado atual de filtros/role. */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const query = buildHistoryQuery({
        fromYmd,
        toYmd,
        status: statusSet,
        isLibrarian: !!isLibrarian,
        asChild: !!asChild,
        user,
        localChildId,
      });
      const res = await getConsultationsHistory(query);
      setItems(res || []);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar histórico");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fromYmd, toYmd, statusSet, isLibrarian, asChild, user, localChildId]);

  // Dispara reload quando filtros mudam
  useEffect(() => {
    reload();
  }, [
    reload, // memoizada
  ]);

  /** Lista agrupada por dia (memoizada). */
  const grouped = useMemo<GroupedDay[]>(() => groupByDay(items), [items]);

  /** Toggle de um estado (imutável, puro). */
  const toggleStatus = useCallback((s: string) => {
    setStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  /** Atalhos rápidos de intervalo (ex.: últimos 30 dias). */
  const quickSet = useCallback((days: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - days);
    setFromYmd(fmtYMD(from));
    setToYmd(fmtYMD(now));
  }, []);

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{ mb: 2, letterSpacing: 0.3 }}
      >
        Histórico de consultas
      </Typography>

      {/* ------------------------- Filtros ------------------------- */}
      <WhiteCard sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          {/* Intervalo de datas + atalhos */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
          >
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

        {/* Estados (chips toggle) */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1 }}
          useFlexGap
          flexWrap="wrap"
        >
          {["COMPLETED", "CANCELLED", "DECLINED", "CONFIRMED", "PENDING"].map(
            (s) => {
              const active = statusSet.has(s);
              const cfg = STATUS_CFG[s] || {
                label: s,
                color: "default" as const,
              };
              return (
                <Chip
                  key={s}
                  clickable
                  color={active ? cfg.color : "default"}
                  variant={active ? "filled" : "outlined"}
                  label={cfg.label}
                  onClick={() => toggleStatus(s)}
                  aria-pressed={active}
                />
              );
            }
          )}
        </Stack>
      </WhiteCard>

      {/* Erro global */}
      {err && (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      )}

      {/* --------------------- Lista agrupada por dia --------------------- */}
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

/* =============================================================================
 *  Fim — Alexandre Brissos • nº 21131
 * =============================================================================
 */

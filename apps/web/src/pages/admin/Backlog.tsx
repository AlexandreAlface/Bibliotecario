import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SearchIcon from "@mui/icons-material/Search";
import { WhiteCard, RouteLink } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listLibraryConsultations,
  type ConsultationLite,
} from "@/services/admin";
import { listMyLibraries } from "@/services/adminMetrics";

type LibraryLite = { id: number; name: string };

const ALL_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
] as const;
type Status = (typeof ALL_STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
};
const STATUS_COLOR: Record<
  Status,
  "default" | "warning" | "success" | "error" | "info"
> = {
  PENDING: "warning",
  CONFIRMED: "success",
  DECLINED: "error",
  CANCELLED: "default",
  COMPLETED: "info",
};

export default function AdminBacklogConsultas() {
  const { user } = useUserSession() as any;

  // --- bibliotecas ---
  const [libraries, setLibraries] = useState<LibraryLite[]>([]);
  const [libraryId, setLibraryId] = useState<number | null>(null);
  const [libsLoading, setLibsLoading] = useState(false);
  const [libsErr, setLibsErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLibsLoading(true);
        const libs = await listMyLibraries();
        setLibraries(libs || []);
        setLibraryId((prev) =>
          prev && libs.some((l: any) => l.id === prev)
            ? prev
            : libs[0]?.id ?? null
        );
      } catch (e: any) {
        setLibraries([]);
        setLibraryId(null);
        setLibsErr(e?.message || "Falha a carregar bibliotecas.");
      } finally {
        setLibsLoading(false);
      }
    })();
  }, [user?.id]);

  // --- filtros (cliente) ---
  const [statuses, setStatuses] = useState<Status[]>(["PENDING", "CONFIRMED"]);
  const [librarianId, setLibrarianId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  // --- dados ---
  const [rowsAll, setRowsAll] = useState<ConsultationLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    if (!libraryId) return;
    try {
      setLoading(true);
      setErr(null);
      // ⚠️ carregamos tudo para filtrar no cliente (evita o endpoint de bibliotecários)
      const res = await listLibraryConsultations(libraryId);
      setRowsAll(res);
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar consultas.");
      setRowsAll([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId]);

  // bibliotecários disponíveis (derivados dos dados)
  const librarians = useMemo(() => {
    const map = new Map<number, { id: number; fullName: string }>();
    for (const r of rowsAll) {
      const l = r.librarian;
      if (l?.id && !map.has(l.id))
        map.set(l.id, { id: l.id, fullName: l.fullName });
    }
    // mantém seleção se ainda existir
    if (librarianId && !map.has(librarianId)) setLibrarianId(null);
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "pt")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsAll]);

  // aplica filtros no cliente
  const rows = useMemo(() => {
    const hasStatus = statuses.length > 0;
    const qNorm = q.trim().toLowerCase();
    return rowsAll.filter((c) => {
      if (hasStatus && !statuses.includes(c.status as Status)) return false;
      if (librarianId && c.librarian?.id !== librarianId) return false;
      if (qNorm) {
        const hay =
          (c.child?.name || "") +
          " " +
          (c.family?.fullName || "") +
          " " +
          (c.librarian?.fullName || "");
        if (!hay.toLowerCase().includes(qNorm)) return false;
      }
      return true;
    });
  }, [rowsAll, statuses, librarianId, q]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h3" fontWeight={900}>
          Backlog de consultas
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton onClick={() => void reload()} disabled={loading}>
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Filtros */}
      <WhiteCard sx={{ mb: 2 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={libraries}
              loading={libsLoading}
              value={libraries.find((l) => l.id === libraryId) || null}
              onChange={(_, v) => setLibraryId(v ? v.id : null)}
              getOptionLabel={(o) => o?.name ?? ""}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField {...params} label="Biblioteca" />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Autocomplete
              options={librarians}
              value={librarians.find((l) => l.id === librarianId) || null}
              onChange={(_, v) => setLibrarianId(v ? v.id : null)}
              getOptionLabel={(o) => o?.fullName ?? ""}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField {...params} label="Bibliotecário (opcional)" />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar por criança/família/bibliotecário…"
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    fontSize="small"
                    style={{ opacity: 0.7, marginRight: 8 }}
                  />
                ),
              }}
              fullWidth
              label="Pesquisa"
            />
          </Grid>

          <Grid item xs={12}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              useFlexGap
              flexWrap="wrap"
            >
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Estados:
              </Typography>
              <ToggleButtonGroup
                value={statuses}
                onChange={(_, v) => setStatuses(v)}
                aria-label="Estados"
              >
                {ALL_STATUSES.map((s) => (
                  <ToggleButton key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Chip
                label="Todos"
                onClick={() => setStatuses([...ALL_STATUSES])}
                size="small"
                sx={{ ml: 0.5 }}
              />
              <Chip
                label="Pendentes + Confirmadas"
                onClick={() => setStatuses(["PENDING", "CONFIRMED"])}
                size="small"
              />
              <Chip
                label="Limpar"
                onClick={() => setStatuses([])}
                size="small"
              />
            </Stack>
          </Grid>
        </Grid>
      </WhiteCard>

      {!!libsErr && (
        <Typography color="error" sx={{ mb: 1 }}>
          {libsErr}
        </Typography>
      )}
      {!!err && (
        <Typography color="error" sx={{ mb: 1 }}>
          {err}
        </Typography>
      )}

      <WhiteCard>
        {loading ? (
          <Typography sx={{ opacity: 0.7 }}>A carregar…</Typography>
        ) : rows.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>Sem resultados.</Typography>
        ) : (
          <Stack spacing={1.25} divider={<Divider />}>
            {rows.map((c) => {
              const a = c.startAt ? new Date(c.startAt) : null;
              const b = c.endAt ? new Date(c.endAt) : null;
              return (
                <Box
                  key={c.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography fontWeight={900}>
                      {c.child?.name
                        ? `Consulta de ${c.child.name}`
                        : "Consulta"}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {c.family?.fullName || "—"}
                      {c.librarian ? ` • ${c.librarian.fullName}` : ""}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 0.5 }}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {a && (
                        <Chip
                          size="small"
                          label={a.toLocaleDateString("pt-PT")}
                        />
                      )}
                      {a && (
                        <Chip
                          size="small"
                          label={`${a.toLocaleTimeString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}${
                            b
                              ? ` — ${b.toLocaleTimeString("pt-PT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""
                          }`}
                        />
                      )}
                      <Chip
                        size="small"
                        color={STATUS_COLOR[c.status as Status]}
                        variant="outlined"
                        label={STATUS_LABEL[c.status as Status]}
                      />
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <RouteLink href="/librarian/consultas/pendentes">
                      Abrir gestão
                    </RouteLink>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </WhiteCard>
    </Container>
  );
}

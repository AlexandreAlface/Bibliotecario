// apps/web/src/pages/families/HistoricoConsultasFamilia.tsx
import * as React from "react";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Stack,
  Box,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  TableContainer,
  TableSortLabel,
  TablePagination,
  Divider,
  Button,
  Skeleton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  getConsultationsHistory,
  type ConsultationFull,
  type ConsultationStatus,
} from "@/services/consultations";
import { useUserSession } from "@/contexts/UserSession";

import SearchRounded from "@mui/icons-material/SearchRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";

/** ===== Helpers de apresentação ===== */
const STATUS_UI: Record<
  ConsultationStatus,
  {
    label: string;
    color:
      | "default"
      | "primary"
      | "secondary"
      | "success"
      | "warning"
      | "error"
      | "info";
  }
> = {
  PENDING: { label: "Pendente", color: "warning" },
  CONFIRMED: { label: "Confirmada", color: "success" },
  DECLINED: { label: "Recusada", color: "error" },
  CANCELLED: { label: "Cancelada", color: "default" },
  COMPLETED: { label: "Concluída", color: "primary" },
};

const STATUS_OPTIONS: ConsultationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
];

/** Converte rows para CSV simples (UTF-8) */
function toCsv(rows: ConsultationFull[]) {
  const header = [
    "ID",
    "Data",
    "Hora início",
    "Hora fim",
    "Título",
    "Bibliotecário",
    "Estado",
  ];
  const lines = rows.map((c) => {
    const d = c.startAt ? dayjs(c.startAt) : null;
    const e = c.endAt ? dayjs(c.endAt) : null;
    return [
      c.id ?? "",
      d ? d.format("YYYY-MM-DD") : "",
      d ? d.format("HH:mm") : "",
      e ? e.format("HH:mm") : "",
      (c.title ?? "").replace(/\s+/g, " ").trim(),
      c.librarian?.fullName ?? "",
      c.status ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ===== Componente ===== */
export default function HistoricoConsultasFamilia() {
  const theme = useTheme();
  const { user } = useUserSession();

  // id da família (o teu modelo usa o próprio user.id)
  const familyId = React.useMemo(
    () => (user?.id ? Number(user.id) : undefined),
    [user?.id]
  );
  // opcional: histórico só do filho ativo
  const childId = user?.actingChild?.id ?? undefined;

  // dados
  const [rows, setRows] = React.useState<ConsultationFull[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // filtros & UI state
  const [q, setQ] = React.useState("");
  const [statusSel, setStatusSel] = React.useState<ConsultationStatus[]>([]);
  const [from, setFrom] = React.useState<string>(""); // YYYY-MM-DD
  const [to, setTo] = React.useState<string>(""); // YYYY-MM-DD

  // ordenação
  type OrderBy = "date" | "title" | "librarian" | "status";
  const [orderBy, setOrderBy] = React.useState<OrderBy>("date");
  const [order, setOrder] = React.useState<"asc" | "desc">("desc");

  // paginação local
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const fetchData = React.useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getConsultationsHistory({
        familyId,
        childId,
        order: "desc",
        limit: 250,
        from: from ? dayjs(from).startOf("day").toISOString() : undefined,
        to: to ? dayjs(to).endOf("day").toISOString() : undefined,
        status: statusSel.length ? statusSel : undefined, // ✅ agora correto
      });
      setRows(data ?? []);
      setPage(0);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [familyId, childId, from, to, statusSel]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchData();
      } catch {
        /* já tratamos no fetchData */
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchData]);

  /** Filtragem por texto */
  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((c) => {
      const hay = [c.title, c.librarian?.fullName, c.status, c.id?.toString()]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [q, rows]);

  /** Ordenação */
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dA = a.startAt ? dayjs(a.startAt).valueOf() : 0;
      const dB = b.startAt ? dayjs(b.startAt).valueOf() : 0;
      const by = orderBy;
      let res = 0;
      if (by === "date") res = dA - dB;
      if (by === "title")
        res = (a.title ?? "").localeCompare(b.title ?? "", "pt");
      if (by === "librarian")
        res = (a.librarian?.fullName ?? "").localeCompare(
          b.librarian?.fullName ?? "",
          "pt"
        );
      if (by === "status")
        res = (a.status ?? "").localeCompare(b.status ?? "", "pt");
      return order === "asc" ? res : -res;
    });
    return arr;
  }, [filtered, order, orderBy]);

  /** Paginação */
  const paged = React.useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  const handleRequestSort = (col: OrderBy) => {
    if (orderBy === col) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(col);
      setOrder(col === "date" ? "desc" : "asc");
    }
  };

  const headerActionSx = {
    borderRadius: 999,
    px: 1.5,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
  };

  /** ===== Render ===== */
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      {/* Header & filtros */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontWeight: 900, fontSize: 22, m: 0 }}
          >
            Histórico de consultas
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Veja e filtre as consultas passadas da sua família.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Exportar CSV (filtro aplicado)">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadRounded />}
                onClick={() =>
                  download("historico-consultas.csv", toCsv(sorted))
                }
                disabled={!sorted.length}
                sx={headerActionSx}
              >
                Exportar CSV
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Recarregar">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshRounded />}
                onClick={fetchData}
                sx={headerActionSx}
              >
                Atualizar
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 1.5 }}
      >
        <TextField
          placeholder="Procurar por título, bibliotecário, estado…"
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded />
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        {/* datas sem dependências (@mui/x) */}
        <TextField
          type="date"
          size="small"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarMonthRounded />
              </InputAdornment>
            ),
          }}
          label="De"
        />
        <TextField
          type="date"
          size="small"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarMonthRounded />
              </InputAdornment>
            ),
          }}
          label="Até"
        />
      </Stack>

      {/* filtros de estado com chips toggle */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
        {STATUS_OPTIONS.map((s) => {
          const active = statusSel.includes(s);
          const ui = STATUS_UI[s];
          return (
            <Chip
              key={s}
              label={ui.label}
              color={active ? ui.color : "default"}
              variant={active ? "filled" : "outlined"}
              size="small"
              onClick={() =>
                setStatusSel((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                )
              }
              sx={{ fontWeight: 700 }}
            />
          );
        })}
        {!!(from || to || statusSel.length || q) && (
          <Chip
            label="Limpar filtros"
            onClick={() => {
              setFrom("");
              setTo("");
              setStatusSel([]); // ✅ limpa corretamente
              setQ("");
            }}
            size="small"
            sx={{ ml: 0.5, fontWeight: 700 }}
          />
        )}
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* Estado de erro/loading/empty */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ p: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={44}
              sx={{ mb: 1, borderRadius: 2 }}
            />
          ))}
        </Box>
      ) : !sorted.length ? (
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            opacity: 0.8,
          }}
        >
          <InfoRounded sx={{ fontSize: 36, mb: 1 }} />
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            Sem registos a mostrar
          </Typography>
          <Typography variant="body2">
            Ajuste os filtros acima para ver mais resultados.
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "date" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "date"}
                      direction={orderBy === "date" ? order : "asc"}
                      onClick={() => handleRequestSort("date")}
                    >
                      Data
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sortDirection={orderBy === "title" ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === "title"}
                      direction={orderBy === "title" ? order : "asc"}
                      onClick={() => handleRequestSort("title")}
                    >
                      Título
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sortDirection={orderBy === "librarian" ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === "librarian"}
                      direction={orderBy === "librarian" ? order : "asc"}
                      onClick={() => handleRequestSort("librarian")}
                    >
                      Bibliotecário
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sortDirection={orderBy === "status" ? order : false}
                    align="left"
                  >
                    <TableSortLabel
                      active={orderBy === "status"}
                      direction={orderBy === "status" ? order : "asc"}
                      onClick={() => handleRequestSort("status")}
                    >
                      Estado
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((c) => {
                  const d = c.startAt ? dayjs(c.startAt) : null;
                  const ui = STATUS_UI[
                    (c.status as ConsultationStatus) ?? "PENDING"
                  ] ?? { label: c.status ?? "—", color: "default" };
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {d ? (
                          <>
                            {d.format("DD/MM/YYYY")}{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ opacity: 0.7 }}
                            >
                              {d.format("HH:mm")}
                            </Typography>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <InfoRounded fontSize="small" sx={{ opacity: 0.5 }} />
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {c.title || "Consulta"}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.7, display: "block" }}
                            >
                              ID #{c.id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PersonRounded
                            fontSize="small"
                            sx={{ opacity: 0.5 }}
                          />
                          <Typography>
                            {c.librarian?.fullName ?? "—"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="left">
                        <Chip
                          label={ui.label}
                          color={ui.color}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={sorted.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Linhas por página"
          />
        </>
      )}
    </Paper>
  );
}

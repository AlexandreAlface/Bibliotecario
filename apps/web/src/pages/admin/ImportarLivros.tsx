// apps/web/src/pages/admin/ImportarLivros.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import CleaningServicesRounded from "@mui/icons-material/CleaningServicesRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { WhiteCard } from "@bibliotecario/ui-web";
import {
  importBooksCsv,
  runBooksPipeline,
  reindexEmbeddingsAdmin,
  cleanupOrphanBooks,
  type ImportResult,
} from "@/services/adminBooks";
import { getMyLibrary, type LibraryLite } from "@/services/admin";

export default function ImportarLivros() {
  // biblioteca do admin
  const [myLib, setMyLib] = useState<LibraryLite | null>(null);
  const [loadingLibs, setLoadingLibs] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // loading por secção (evita “loading” global em todos os cards)
  const [busyCsv, setBusyCsv] = useState(false);
  const [busyAuto, setBusyAuto] = useState(false);
  const [busyTools, setBusyTools] = useState(false);
  const globalBusy = loadingLibs || busyCsv || busyAuto || busyTools;

  // CSV final
  const [file, setFile] = useState<File | null>(null);
  const [recalcCsv, setRecalcCsv] = useState(true);
  const [resultCsv, setResultCsv] = useState<ImportResult | null>(null);

  // Pipeline (check Beja sempre ON no backend)
  const [filesAuto, setFilesAuto] = useState<File[]>([]);
  const [concurrency, setConcurrency] = useState<number>(4);
  const [recalcAuto, setRecalcAuto] = useState(true);
  const [resultAuto, setResultAuto] = useState<ImportResult | null>(null);

  async function loadMyLibrary() {
    try {
      setErr(null);
      setLoadingLibs(true);
      const lib = await getMyLibrary();
      if (!lib) {
        setMyLib(null);
        setErr("Não estás associado a nenhuma biblioteca.");
      } else {
        setMyLib(lib);
      }
    } catch (e: any) {
      setErr(e?.message || "Falha a carregar a biblioteca.");
      setMyLib(null);
    } finally {
      setLoadingLibs(false);
    }
  }

  useEffect(() => {
    void loadMyLibrary();
  }, []);

  async function onImportCsv() {
    if (!myLib?.id || !file) return;
    setBusyCsv(true);
    setErr(null);
    setResultCsv(null);
    try {
      // 👉 substitui sempre o catálogo desta biblioteca
      const r = await importBooksCsv(myLib.id, file, {
        replace: true,
        recalc: recalcCsv,
      });
      setResultCsv(r);
      setFile(null);
      const input = document.getElementById(
        "csv-input"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e: any) {
      setErr(e?.message || "Falha na importação.");
    } finally {
      setBusyCsv(false);
    }
  }

  async function onRunAuto() {
    if (!myLib?.id || filesAuto.length === 0) return;
    setBusyAuto(true);
    setErr(null);
    setResultAuto(null);
    try {
      // 👉 substitui sempre o catálogo + check Beja é aplicado no backend
      const r = await runBooksPipeline(myLib.id, filesAuto, {
        concurrency,
        recalc: recalcAuto,
      });
      setResultAuto(r);
      setFilesAuto([]);
      const input = document.getElementById(
        "xls-input"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e: any) {
      setErr(e?.message || "Falha na pipeline automática.");
    } finally {
      setBusyAuto(false);
    }
  }

  async function onReindexNull() {
    if (!myLib?.id) return;
    setBusyTools(true);
    setErr(null);
    try {
      const resp = await reindexEmbeddingsAdmin({
        libraryId: myLib.id,
        limit: 300,
        concurrency: 4,
      });
      const stats = resp.result;
      alert(
        `Embeddings: ${stats.ok}/${stats.total} concluídos • falhas: ${stats.fail}`
      );
    } catch (e: any) {
      setErr(e?.message || "Falha no reindex");
    } finally {
      setBusyTools(false);
    }
  }

  async function onCleanupOrphans() {
    setBusyTools(true);
    setErr(null);
    try {
      const r = await cleanupOrphanBooks();
      alert(`Apagados ${r.deleted} livros órfãos (sem biblioteca).`);
    } catch (e: any) {
      setErr(e?.message || "Falha na limpeza");
    } finally {
      setBusyTools(false);
    }
  }

  const autoDisabled = !myLib?.id || filesAuto.length === 0 || busyAuto;
  const autoDisabledReason = !myLib?.id
    ? "Sem biblioteca associada"
    : filesAuto.length === 0
    ? "Carrega pelo menos um ficheiro XLS/XLSX/CSV"
    : undefined;

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h3" fontWeight={900}>
          Importar livros
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              onClick={() => void loadMyLibrary()}
              disabled={globalBusy}
            >
              <RefreshRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {!!err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Info da biblioteca */}
      <WhiteCard sx={{ mb: 2, p: 2 }}>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          {loadingLibs ? (
            "A carregar biblioteca…"
          ) : myLib ? (
            <>
              Biblioteca: <b>{myLib.name}</b>
            </>
          ) : (
            "Sem biblioteca associada."
          )}
        </Typography>
      </WhiteCard>

      {/* —— Modo 1: CSV final —— */}
      <WhiteCard>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>
          Importar CSV final
        </Typography>

        {!!resultCsv && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Importação concluída — {resultCsv.total ?? 0} linhas processadas ·{" "}
            {resultCsv.inserted} novos · {resultCsv.updated} atualizados ·{" "}
            {resultCsv.linked} associados.
            {resultCsv.embeddings && (
              <>
                {" "}
                · Embeddings: {resultCsv.embeddings.ok}/
                {resultCsv.embeddings.total}
              </>
            )}
          </Alert>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems="center"
        >
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileRounded />}
            disabled={busyCsv}
          >
            Escolher CSV final…
            <input
              id="csv-input"
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          <Box sx={{ flex: 1 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={recalcCsv}
                onChange={(e) => setRecalcCsv(e.target.checked)}
                disabled={busyCsv}
              />
            }
            label="Recalcular embeddings no fim"
          />
          <Tooltip
            title={!myLib?.id ? "Sem biblioteca associada" : "Importar CSV"}
          >
            <span>
              <Button
                variant="contained"
                onClick={() => void onImportCsv()}
                disabled={!myLib?.id || !file || busyCsv}
              >
                Importar
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {file && (
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
            Ficheiro selecionado: <strong>{file.name}</strong>
          </Typography>
        )}

        <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
          Espera-se um CSV com as colunas:{" "}
          <em>
            ISBN, Idade, Título, Resumo, Imagem_Lisboa, Autor_Beja,
            Publicacao_Beja, Colecao_Beja, Assuntos_Beja, CDU_Beja
          </em>
          .
        </Typography>

        {busyCsv && <LinearProgress sx={{ mt: 2 }} />}
      </WhiteCard>

      <Divider sx={{ my: 3 }} />

      {/* —— Modo 2: Pipeline automática —— */}
      <WhiteCard>
        <Stack direction="row" alignItems="center" spacing={1}>
          <RocketLaunchRounded />
          <Typography variant="h6" fontWeight={900}>
            Automatizar (XLS/XLSX/CSV → CSV final → importar)
          </Typography>
        </Stack>

        {!!resultAuto && (
          <Alert severity="success" sx={{ my: 2 }}>
            Pipeline concluída — {resultAuto.inputs?.files ?? 0} ficheiros ·{" "}
            {resultAuto.totals?.deduplicados ?? 0} ISBN deduplicados ·{" "}
            {resultAuto.totals?.bejaPresent ?? 0} presentes em Beja ·{" "}
            {resultAuto.totals?.filteredOut ?? 0} filtrados ·{" "}
            {resultAuto.totals?.inserted ?? 0} novos ·{" "}
            {resultAuto.totals?.updated ?? 0} atualizados ·{" "}
            {resultAuto.totals?.linked ?? 0} associados
            {resultAuto.embeddings && (
              <>
                {" "}
                · Embeddings: {resultAuto.embeddings.ok}/
                {resultAuto.embeddings.total}
              </>
            )}
          </Alert>
        )}

        <Stack spacing={1.25} sx={{ mt: 1 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems="center"
          >
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileRounded />}
              disabled={busyAuto}
            >
              Carregar XLS/XLSX/CSV…
              <input
                id="xls-input"
                type="file"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                multiple
                hidden
                onChange={(e) =>
                  setFilesAuto(e.target.files ? Array.from(e.target.files) : [])
                }
              />
            </Button>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {filesAuto.length
                ? `${filesAuto.length} ficheiro(s) selecionado(s)`
                : "Nenhum ficheiro selecionado."}
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems="center"
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                label="Concorrência (pedidos em paralelo)"
                type="number"
                value={concurrency}
                onChange={(e) =>
                  setConcurrency(
                    Math.max(1, Math.min(8, Number(e.target.value || 4)))
                  )
                }
                sx={{ width: 300 }}
                disabled={busyAuto}
              />
              <Tooltip
                arrow
                title="Quantos ISBNs consultar ao mesmo tempo (1–8). Valores altos podem ser travados pelo site de Beja."
              >
                <InfoOutlined
                  fontSize="small"
                  sx={{ opacity: 0.7, cursor: "help" }}
                />
              </Tooltip>
            </Box>

            <Box sx={{ flex: 1 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={recalcAuto}
                  onChange={(e) => setRecalcAuto(e.target.checked)}
                  disabled={busyAuto}
                />
              }
              label="Recalcular embeddings no fim"
            />

            <Tooltip
              title={
                autoDisabled
                  ? autoDisabledReason || "A aguardar…"
                  : "Executa a pipeline completa"
              }
              arrow
            >
              <span>
                <Button
                  variant="contained"
                  onClick={() => void onRunAuto()}
                  disabled={autoDisabled}
                  startIcon={<RocketLaunchRounded />}
                >
                  Processar automaticamente
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {busyAuto && <LinearProgress />}
        </Stack>
      </WhiteCard>

      <Divider sx={{ my: 3 }} />

      {/* Utilitários admin */}
      <WhiteCard>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Tooltip title={!myLib?.id ? "Sem biblioteca associada" : ""}>
            <span>
              <Button
                variant="outlined"
                startIcon={<RocketLaunchRounded />}
                onClick={() => void onReindexNull()}
                disabled={!myLib?.id || busyTools}
              >
                Recalcular embeddings pendentes (biblioteca)
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CleaningServicesRounded />}
            onClick={() => void onCleanupOrphans()}
            disabled={busyTools}
          >
            Limpar livros órfãos (sem biblioteca)
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
          A pipeline confirma cada ISBN no catálogo de Beja e só importa os que
          existem. O catálogo desta biblioteca é sempre substituído. A limpeza
          remove apenas livros sem ligações a bibliotecas.
        </Typography>

        {busyTools && <LinearProgress sx={{ mt: 1 }} />}
      </WhiteCard>
    </Container>
  );
}

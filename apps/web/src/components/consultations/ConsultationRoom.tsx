import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Avatar,
  Rating,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import VideoCameraFrontRounded from "@mui/icons-material/VideoCameraFrontRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import BookRounded from "@mui/icons-material/BookRounded";
import TipsAndUpdatesRounded from "@mui/icons-material/TipsAndUpdatesRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import PictureAsPdfRounded from "@mui/icons-material/PictureAsPdfRounded";

// serviços
import {
  getConsultationDetails,
  updateConsultationNotes,
  completeConsultation,
  addConsultationAttachments,
  type ConsultationDetail,
  downloadConsultationPdf,
} from "@/services/consultations";

type Props = {
  open: boolean;
  onClose: () => void;
  consultationId: number;
  /** se o botão “Concluir consulta” aparece */
  allowComplete?: boolean; // default: true
  /** notas editáveis? (família = false) */
  readOnlyNotes?: boolean; // default: false
  /** permitir anexar livros/micro/eventos/ficheiros */
  allowAttach?: boolean; // default: true
};

function a11yProps(index: number) {
  return {
    id: `annex-tab-${index}`,
    "aria-controls": `annex-tabpanel-${index}`,
  };
}

function TabPanel({
  value,
  index,
  children,
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`annex-tabpanel-${index}`}
      aria-labelledby={`annex-tab-${index}`}
      sx={{ pt: value === index ? 1.5 : 0 }}
    >
      {value === index && children}
    </Box>
  );
}

const STATUS_LABEL: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  CONFIRMED: { label: "Confirmada", color: "success" },
  PENDING: { label: "Pendente", color: "warning" },
  DECLINED: { label: "Recusada", color: "error" },
  CANCELLED: { label: "Cancelada", color: "default" },
  COMPLETED: { label: "Concluída", color: "default" },
};

const TYPE_COLOR: Record<
  string,
  "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error"
> = {
  BIBLIOTERAPIA: "success",
  DICA: "info",
  FACTO: "warning",
  OUTRO: "default",
};

type ReadingItem = {
  childId: number;
  childName?: string;
  bookIsbn: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  finishedAt?: string;
  rating?: {
    stars: number;
    comment?: string;
    ratedAt: string;
  };
};
type TimelineItem = {
  id: number;
  type: string;
  at: string;
  actor?: { id: number; fullName: string };
  payload?: any;
};

export default function ConsultationRoom({
  open,
  onClose,
  consultationId,
  allowComplete = true,
  readOnlyNotes = false,
  allowAttach = true,
}: Props) {
  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (open && consultationId) {
      getConsultationDetails(consultationId).then((d: ConsultationDetail) => {
        setData(d);
        setNotes(String(d?.consultation?.notes ?? ""));
        // selecionar automaticamente a tab com conteúdo
        const hasBooks = (d?.consultation?.attachments?.books?.length ?? 0) > 0;
        const hasMicro =
          (d?.consultation?.attachments?.microContents?.length ?? 0) > 0;
        const hasEvents =
          (d?.consultation?.attachments?.events?.length ?? 0) > 0;
        const hasFiles =
          (d?.consultation?.attachments as any)?.files?.length > 0;
        setTab(hasBooks ? 0 : hasMicro ? 1 : hasEvents ? 2 : hasFiles ? 3 : 0);
      });
    }
  }, [open, consultationId]);

  const c = data?.consultation;
  const h = data?.history;

  const date = c?.startAt ? new Date(c.startAt) : null;
  const timeRange =
    c?.startAt && c?.endAt
      ? `${new Date(c.startAt).toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        })} — ${new Date(c.endAt).toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : undefined;

  const suggestion = useMemo(() => {
    const mc = c?.attachments?.microContents?.[0]?.text;
    if (mc) return mc;
    const evSoon = (h?.events ?? []).find(
      (e) => new Date(e.startDate) > new Date()
    );
    if (evSoon) return `Pauta rápida: falem sobre o evento «${evSoon.title}».`;
    return "Sugestão: peça à família que traga 1 livro muito apreciado para analisarem juntos.";
  }, [c, h]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateConsultationNotes(consultationId, notes);
      // sincroniza com o estado "data"
      if (res?.notes !== undefined) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                consultation: { ...prev.consultation, notes: res.notes },
              }
            : prev
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function copyNotes() {
    navigator?.clipboard?.writeText(notes).catch(() => {});
  }

  const books = c?.attachments?.books ?? [];
  const micro = c?.attachments?.microContents ?? [];
  const events = c?.attachments?.events ?? [];
  const files: Array<{ id: number; name: string; url: string }> =
    (c?.attachments as any)?.files ?? [];

  const canComplete =
    c &&
    !["COMPLETED", "CANCELLED", "DECLINED"].includes(
      (c.status || "").toUpperCase()
    );

  // garantir arrays tipados
  const readings: ReadingItem[] = Array.isArray(data?.history?.readings)
    ? (data!.history!.readings as ReadingItem[])
    : [];
  const timeline: TimelineItem[] = Array.isArray((data as any)?.timeline)
    ? ((data as any).timeline as TimelineItem[])
    : [];

  const [downloading, setDownloading] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: { xs: "92vh", md: "80vh" },
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ mr: "auto" }} noWrap>
            {c?.title ?? "Consulta"}
          </Typography>

          {/* Chips de metadata */}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mr: 1 }}
          >
            {date && (
              <Chip
                icon={<EventRounded />}
                size="small"
                label={date.toLocaleDateString("pt-PT", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              />
            )}
            {timeRange && (
              <Chip
                icon={<AccessTimeRounded />}
                size="small"
                label={timeRange}
              />
            )}
            {c?.modeEnum === "ONLINE" && c?.meetingUrl && (
              <Chip
                icon={<VideoCameraFrontRounded />}
                size="small"
                label={
                  <Link href={c.meetingUrl} target="_blank" rel="noreferrer">
                    Link de reunião
                  </Link>
                }
              />
            )}
            {c?.modeEnum === "IN_PERSON" && c?.library?.name && (
              <Chip
                icon={<PlaceRounded />}
                size="small"
                label={c.library.name}
              />
            )}
            {c?.status && (
              <Chip
                size="small"
                variant="outlined"
                color={
                  STATUS_LABEL[(c.status || "").toUpperCase()]?.color ??
                  "default"
                }
                label={
                  STATUS_LABEL[(c.status || "").toUpperCase()]?.label ??
                  c.status
                }
              />
            )}
          </Stack>

          <IconButton
            onClick={onClose}
            aria-label="Fechar"
            edge="end"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRounded />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Stack direction={{ xs: "column", md: "row" }} sx={{ height: "100%" }}>
          {/* Coluna esquerda */}
          <Box sx={{ flex: 7, p: 3, minWidth: 0 }}>
            {/* Resumo */}
            <Box
              sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
            >
              <Typography
                variant="subtitle2"
                sx={{ textTransform: "uppercase", opacity: 0.7 }}
              >
                Resumo
              </Typography>
              <Typography variant="body1" sx={{ mt: 1.25 }}>
                {c?.purpose || c?.description || "(sem descrição)"}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap">
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Família
                  </Typography>
                  <Typography fontWeight={700}>
                    {c?.family?.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {c?.family?.email}
                  </Typography>
                </Box>

                {c?.child && (
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Criança
                    </Typography>
                    <Typography fontWeight={700}>{c.child.name}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Anexos: Tabs por categoria */}
            <Box
              sx={{
                mt: 2.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                position: "relative",
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 1 }}
              >
                <Tab
                  icon={<BookRounded />}
                  iconPosition="start"
                  label={`Livros (${books.length})`}
                  {...a11yProps(0)}
                />
                <Tab
                  icon={<TipsAndUpdatesRounded />}
                  iconPosition="start"
                  label={`Micro (${micro.length})`}
                  {...a11yProps(1)}
                />
                <Tab
                  icon={<EventRounded />}
                  iconPosition="start"
                  label={`Eventos (${events.length})`}
                  {...a11yProps(2)}
                />
                <Tab
                  icon={<InsertDriveFileRounded />}
                  iconPosition="start"
                  label={`Ficheiros (${files.length})`}
                  {...a11yProps(3)}
                />
              </Tabs>

              {/* Ações “Anexar …” por tab */}
              <Box sx={{ position: "absolute", right: 16, top: 10 }}>
                {allowAttach && (
                  <>
                    {tab === 0 && (
                      <Button
                        size="small"
                        onClick={async () => {
                          const isbn = prompt("ISBN do livro a anexar:");
                          if (!isbn) return;
                          await addConsultationAttachments(c!.id, {
                            books: [isbn.trim()],
                          });
                          const d = await getConsultationDetails(c!.id);
                          setData(d);
                        }}
                      >
                        Anexar livro
                      </Button>
                    )}
                    {tab === 1 && (
                      <Button
                        size="small"
                        onClick={async () => {
                          const idStr = prompt(
                            "ID do micro-conteúdo a anexar:"
                          );
                          const mid = Number(idStr);
                          if (!Number.isFinite(mid)) return;
                          await addConsultationAttachments(c!.id, {
                            microContents: [mid],
                          });
                          const d = await getConsultationDetails(c!.id);
                          setData(d);
                        }}
                      >
                        Anexar micro
                      </Button>
                    )}
                    {tab === 2 && (
                      <Button
                        size="small"
                        onClick={async () => {
                          const idStr = prompt(
                            "ID do evento cultural a anexar:"
                          );
                          const eid = Number(idStr);
                          if (!Number.isFinite(eid)) return;
                          await addConsultationAttachments(c!.id, {
                            events: [eid],
                          });
                          const d = await getConsultationDetails(c!.id);
                          setData(d);
                        }}
                      >
                        Anexar evento
                      </Button>
                    )}
                    {tab === 3 && (
                      <Button
                        size="small"
                        onClick={async () => {
                          const name = prompt("Nome do ficheiro:");
                          const url = prompt("URL do ficheiro:");
                          if (!name || !url) return;
                          await addConsultationAttachments(c!.id, {
                            files: [{ name, url }],
                          });
                          const d = await getConsultationDetails(c!.id);
                          setData(d);
                        }}
                      >
                        Anexar ficheiro
                      </Button>
                    )}
                  </>
                )}
              </Box>

              <Divider />

              <Box sx={{ p: 2 }}>
                {/* Livros */}
                <TabPanel value={tab} index={0}>
                  {books.length === 0 ? (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem livros anexados.
                    </Typography>
                  ) : (
                    <Stack
                      direction="row"
                      spacing={1.5}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {books.map((b) => (
                        <Stack
                          key={b.isbn}
                          direction="row"
                          spacing={1}
                          sx={{
                            p: 1,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                            alignItems: "center",
                            minWidth: 220,
                          }}
                        >
                          <Avatar
                            variant="rounded"
                            src={b.coverUrl}
                            sx={{ width: 40, height: 56, borderRadius: 1 }}
                          >
                            <BookRounded fontSize="small" />
                          </Avatar>
                          <Box minWidth={0}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              title={b.title}
                            >
                              {b.title}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              ISBN {b.isbn}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </TabPanel>

                {/* Micro-conteúdos */}
                <TabPanel value={tab} index={1}>
                  {micro.length === 0 ? (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem micro-conteúdos.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {micro.map((m) => (
                        <Stack
                          key={m.id}
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                          sx={{
                            p: 1,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                          }}
                        >
                          <Chip
                            size="small"
                            color={TYPE_COLOR[m.type] ?? "default"}
                            label={m.type}
                            sx={{ mr: 0.5 }}
                          />
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>
                            {m.text}
                          </Typography>
                          {m.tags?.length ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              useFlexGap
                              flexWrap="wrap"
                              sx={{ ml: "auto" }}
                            >
                              {m.tags.map((t) => (
                                <Chip
                                  key={t}
                                  size="small"
                                  variant="outlined"
                                  label={t}
                                />
                              ))}
                            </Stack>
                          ) : null}
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </TabPanel>

                {/* Eventos */}
                <TabPanel value={tab} index={2}>
                  {events.length === 0 ? (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem eventos culturais.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {events.map((e) => (
                        <Stack
                          key={e.id}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Chip
                            size="small"
                            icon={<EventRounded />}
                            label={new Date(e.startDate).toLocaleDateString(
                              "pt-PT",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          />
                          <Typography>{e.title}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </TabPanel>

                {/* Ficheiros */}
                <TabPanel value={tab} index={3}>
                  {files.length === 0 ? (
                    <Typography sx={{ opacity: 0.7 }}>
                      Sem ficheiros anexados.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {files.map((f) => (
                        <Stack
                          key={f.id}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <InsertDriveFileRounded fontSize="small" />
                          <Link href={f.url} target="_blank" rel="noreferrer">
                            {f.name}
                          </Link>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </TabPanel>
              </Box>
            </Box>

            {/* Sugestão */}
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <TipsAndUpdatesRounded />
                <Typography
                  variant="subtitle2"
                  sx={{ textTransform: "uppercase", opacity: 0.7 }}
                >
                  Sugestão
                </Typography>
              </Stack>
              <Typography>{suggestion}</Typography>
            </Box>
          </Box>

          {/* Coluna direita */}
          <Box
            sx={{
              flex: 5,
              p: 3,
              borderLeft: { md: 1 },
              borderColor: { md: "divider" },
              minWidth: 0,
            }}
          >
            {/* Histórico */}
            <Box
              sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
            >
              <Typography
                variant="subtitle2"
                sx={{ textTransform: "uppercase", opacity: 0.7 }}
              >
                Histórico
              </Typography>

              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Consultas recentes
              </Typography>
              <Stack sx={{ mt: 0.5 }}>
                {(h?.consultations ?? []).map((x) => (
                  <Typography key={x.id} variant="body2">
                    • {x.title ?? "(sem título)"} —{" "}
                    {STATUS_LABEL[(x.status || "").toUpperCase()]?.label ??
                      x.status}
                  </Typography>
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Leituras da família (últimas {readings.length})
              </Typography>
              <Stack sx={{ mt: 0.5 }} spacing={1}>
                {readings.length === 0 && (
                  <Typography sx={{ opacity: 0.7 }}>
                    Sem leituras registadas.
                  </Typography>
                )}

                {readings.map((r) => {
                  const finished =
                    r.finishedAt &&
                    new Date(r.finishedAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });

                  return (
                    <Stack
                      key={`${r.bookIsbn}-${r.childId}-${
                        r.finishedAt || "open"
                      }`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        p: 1,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      {r.bookCoverUrl ? (
                        <Avatar
                          src={r.bookCoverUrl}
                          variant="rounded"
                          sx={{ width: 26, height: 36, borderRadius: 0.5 }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{ width: 26, height: 36, borderRadius: 0.5 }}
                        >
                          <BookRounded fontSize="small" />
                        </Avatar>
                      )}

                      <Box minWidth={0} flex={1}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          noWrap
                          title={r.bookTitle || "Livro"}
                        >
                          {r.bookTitle || "Livro"}
                        </Typography>

                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {r.childName ? `${r.childName} • ` : ""}
                          {finished ?? "em curso"}
                        </Typography>

                        {!!r.rating?.comment && (
                          <Typography
                            variant="caption"
                            sx={{ display: "block", opacity: 0.85, mt: 0.25 }}
                          >
                            {r.rating.comment}
                          </Typography>
                        )}
                      </Box>

                      {typeof r.rating?.stars === "number" ? (
                        <Rating value={r.rating.stars} readOnly size="small" />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={finished ? "sem avaliação" : "a ler"}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>

            {/* Notas */}
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ textTransform: "uppercase", opacity: 0.7 }}
              >
                Notas da reunião
              </Typography>
              <TextField
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={6}
                fullWidth
                placeholder="O que ficou decidido, próximos passos, preferências…"
                sx={{ mt: 1 }}
                disabled={readOnlyNotes}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {!readOnlyNotes && (
                  <Button
                    variant="contained"
                    startIcon={<SaveRounded />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Guardar
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyRounded />}
                  onClick={copyNotes}
                >
                  Copiar
                </Button>
                {!readOnlyNotes && (
                  <Button variant="text" onClick={() => setNotes("")}>
                    Limpar
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Timeline */}
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ textTransform: "uppercase", opacity: 0.7 }}
              >
                Timeline
              </Typography>
              <Stack sx={{ mt: 0.5 }} spacing={0.75}>
                {timeline.length === 0 && (
                  <Typography sx={{ opacity: 0.7 }}>Sem eventos.</Typography>
                )}
                {timeline.map((ev) => (
                  <Typography
                    key={ev.id}
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    •{" "}
                    {new Date(ev.at).toLocaleString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" — "} <strong>{ev.type}</strong>
                    {ev.actor?.fullName ? ` por ${ev.actor.fullName}` : ""}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {canComplete && allowComplete && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleRounded />}
            onClick={async () => {
              await completeConsultation(c!.id);
              const d = await getConsultationDetails(c!.id);
              setData(d);
            }}
          >
            Concluir consulta
          </Button>
        )}

        {!!c?.id && (
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfRounded />}
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadConsultationPdf(c!.id);
              } catch (e: any) {
                alert(e?.message || "Não foi possível descarregar o PDF.");
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? "A gerar…" : "Exportar PDF"}
          </Button>
        )}

        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

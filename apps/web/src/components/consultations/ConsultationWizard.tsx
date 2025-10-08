import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControlLabel,
  RadioGroup,
  Radio,
  Button,
  Stack,
  Autocomplete,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  createConsultation,
  type CreateConsultationDTO,
} from "@/services/consultations";
import { searchBooks, type BookLite } from "@/services/books";
import {
  listMicroContentsPublic,
  type MicroContentItem,
} from "@/services/microcontent";
import { getProximosEventos, type EventLite } from "@/services/events";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultLibrarianId?: number;
  defaultFamilyId: number;
  defaultSlotId?: number;
  /** Lista (do próprio bibliotecário). Usamos a primeira automaticamente no modo presencial. */
  libraries?: { id: number; name: string }[];
  /** Ex.: na área do bibliotecário podes querer resultados de microconteúdos admin; aqui fico no público p/ simplicidade */
  isLibrarian?: boolean;
  onCreated?: (id: number) => void;
};

/* --------------------------- helpers locais --------------------------- */

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ============================ Componente ============================ */

export default function ConsultationWizard(p: Props) {
  /* --------- biblioteca automática (presencial) --------- */
  const autoLibrary = useMemo(() => {
    const first = p.libraries?.[0];
    return { id: first?.id, name: first?.name };
  }, [p.libraries]);

  /* --------- form + navegação --------- */
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateConsultationDTO>({
    familyId: p.defaultFamilyId,
    librarianId: p.defaultLibrarianId!,
    slotId: p.defaultSlotId,
    modeEnum: "ONLINE",
  });
  const next = () => setStep((s) => Math.min(2, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const close = () => {
    setStep(0);
    p.onClose();
  };

  useEffect(() => {
    if (!p.open) return;
    setForm({
      familyId: p.defaultFamilyId,
      librarianId: p.defaultLibrarianId!, // <-- aqui
      slotId: p.defaultSlotId,
      modeEnum: "ONLINE",
    });
    setStep(0);
    setSelectedBooks([]);
    setSelectedMC([]);
    setSelectedEV([]);
  }, [p.open, p.defaultFamilyId, p.defaultLibrarianId, p.defaultSlotId]);

  useEffect(() => {
    if (
      p.open &&
      form.modeEnum === "IN_PERSON" &&
      autoLibrary.id &&
      form.libraryId !== autoLibrary.id
    ) {
      setForm((f) => ({ ...f, libraryId: autoLibrary.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open, form.modeEnum, autoLibrary.id]);

  /* --------- Anexos (estado local + fetch) --------- */
  // Livros
  const [bookQuery, setBookQuery] = useState("");
  const debBookQuery = useDebounced(bookQuery, 400);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookOptions, setBookOptions] = useState<BookLite[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<
    Array<{ isbn: string; title: string }>
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!debBookQuery?.trim()) {
        setBookOptions([]);
        return;
      }
      setBookLoading(true);
      try {
        const res = await searchBooks({
          q: debBookQuery,
          perPage: 10,
          page: 1,
        });
        if (!alive) return;
        setBookOptions(res.items || []);
      } finally {
        setBookLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debBookQuery]);

  // Microconteúdos
  const [mcQuery, setMcQuery] = useState("");
  const debMcQuery = useDebounced(mcQuery, 400);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcOptions, setMcOptions] = useState<MicroContentItem[]>([]);
  const [selectedMC, setSelectedMC] = useState<
    Array<{ id: number; text: string }>
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!debMcQuery?.trim()) {
        setMcOptions([]);
        return;
      }
      setMcLoading(true);
      try {
        const page = await listMicroContentsPublic({
          q: debMcQuery,
          limit: 10,
          page: 1,
        });
        if (!alive) return;
        setMcOptions(page.items || []);
      } finally {
        setMcLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debMcQuery]);

  // Eventos (a API pública não tem search → busco muitos e filtro local)
  const [evQuery, setEvQuery] = useState("");
  const debEvQuery = useDebounced(evQuery, 400);
  const [evLoading, setEvLoading] = useState(false);
  const [evOptions, setEvOptions] = useState<EventLite[]>([]);
  const [selectedEV, setSelectedEV] = useState<
    Array<{ id: number; title: string }>
  >([]);

  // cache simples para não bater sempre no servidor
  const eventsCacheRef = useRef<EventLite[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      setEvLoading(true);
      try {
        if (!eventsCacheRef.current) {
          eventsCacheRef.current = await getProximosEventos(120);
        }
        const all = eventsCacheRef.current || [];
        const q = (debEvQuery || "").toLowerCase().trim();
        const filtered = q
          ? all.filter((e) => e.title.toLowerCase().includes(q))
          : all.slice(0, 12);
        if (!alive) return;
        setEvOptions(filtered.slice(0, 12));
      } finally {
        setEvLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debEvQuery]);

  /* --------- submit --------- */
  async function submit() {
    // garantir biblioteca no presencial
    if (form.modeEnum === "IN_PERSON" && !form.libraryId && autoLibrary.id) {
      form.libraryId = autoLibrary.id;
    }

    const payload: CreateConsultationDTO = {
      ...form,
      bookIsbns: selectedBooks.map((b) => b.isbn),
      microContentIds: selectedMC.map((m) => m.id),
      eventIds: selectedEV.map((e) => e.id),
    };

    const out = await createConsultation(payload);
    p.onCreated?.(out?.id ?? 0);
    close();
  }

  /* --------------------------- render --------------------------- */
  return (
    <Dialog open={p.open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Marcar consulta</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          <Step>
            <StepLabel>Quando & Modo</StepLabel>
          </Step>
          <Step>
            <StepLabel>Motivo</StepLabel>
          </Step>
          <Step>
            <StepLabel>Anexos</StepLabel>
          </Step>
        </Stepper>

        {/* Passo 1 */}
        {step === 0 && (
          <Stack gap={2}>
            <RadioGroup
              row
              value={form.modeEnum}
              onChange={(e) => {
                const mode = e.target
                  .value as CreateConsultationDTO["modeEnum"];
                if (mode === "IN_PERSON") {
                  setForm((f) => ({
                    ...f,
                    modeEnum: mode,
                    libraryId: autoLibrary.id ?? f.libraryId,
                  }));
                } else {
                  setForm((f) => ({ ...f, modeEnum: mode }));
                }
              }}
            >
              <FormControlLabel
                value="ONLINE"
                control={<Radio />}
                label="Online"
              />
              <FormControlLabel
                value="IN_PERSON"
                control={<Radio />}
                label="Presencial"
              />
            </RadioGroup>

            {form.modeEnum === "ONLINE" && (
              <TextField
                label="Link da reunião"
                fullWidth
                value={form.meetingUrl ?? ""}
                onChange={(e) =>
                  setForm({ ...form, meetingUrl: e.target.value })
                }
              />
            )}

            {form.modeEnum === "IN_PERSON" && (
              <TextField
                label="Biblioteca"
                fullWidth
                value={autoLibrary.name ?? "—"}
                InputProps={{ readOnly: true }}
                helperText={
                  autoLibrary.id
                    ? "Associada automaticamente à biblioteca do bibliotecário."
                    : "Não foi possível identificar a biblioteca do bibliotecário."
                }
              />
            )}
          </Stack>
        )}

        {/* Passo 2 */}
        {step === 1 && (
          <Stack gap={2}>
            <TextField
              label="Título"
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Pretexto/Motivo"
              value={form.purpose ?? ""}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              fullWidth
            />
            <TextField
              label="Descrição (para o bibliotecário)"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        )}

        {/* Passo 3 — Anexos com pesquisa */}
        {step === 2 && (
          <Stack gap={3}>
            {/* Livros */}
            <Stack gap={1}>
              <Typography variant="subtitle2">
                Livros (ISBN opcional)
              </Typography>
              <Autocomplete
                options={bookOptions}
                loading={bookLoading}
                getOptionLabel={(o) =>
                  `${o.title}${o.isbn ? ` — ${o.isbn}` : ""}`
                }
                onInputChange={(_, v) => setBookQuery(v)}
                onChange={(_, v) => {
                  if (!v) return;
                  setSelectedBooks((old) => {
                    if (old.some((b) => b.isbn === v.isbn)) return old;
                    return [...old, { isbn: v.isbn, title: v.title }];
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Procurar livro por título/autor/ISBN"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {bookLoading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Stack direction="row" gap={1} flexWrap="wrap">
                {selectedBooks.map((b) => (
                  <Chip
                    key={b.isbn}
                    label={`${b.title} — ${b.isbn}`}
                    onDelete={() =>
                      setSelectedBooks((old) =>
                        old.filter((x) => x.isbn !== b.isbn)
                      )
                    }
                  />
                ))}
              </Stack>
            </Stack>

            {/* Microconteúdos */}
            <Stack gap={1}>
              <Typography variant="subtitle2">Micro-conteúdos</Typography>
              <Autocomplete
                options={mcOptions}
                loading={mcLoading}
                getOptionLabel={(o) =>
                  `${o.text.slice(0, 60)}${o.text.length > 60 ? "…" : ""} (#${
                    o.id
                  })`
                }
                onInputChange={(_, v) => setMcQuery(v)}
                onChange={(_, v) => {
                  if (!v) return;
                  setSelectedMC((old) => {
                    if (old.some((m) => m.id === v.id)) return old;
                    return [...old, { id: v.id, text: v.text }];
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Procurar micro-conteúdo por texto/tags"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {mcLoading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Stack direction="row" gap={1} flexWrap="wrap">
                {selectedMC.map((m) => (
                  <Chip
                    key={m.id}
                    label={`${m.text.slice(0, 40)}${
                      m.text.length > 40 ? "…" : ""
                    } (#${m.id})`}
                    onDelete={() =>
                      setSelectedMC((old) => old.filter((x) => x.id !== m.id))
                    }
                  />
                ))}
              </Stack>
            </Stack>

            {/* Eventos */}
            <Stack gap={1}>
              <Typography variant="subtitle2">Eventos</Typography>
              <Autocomplete
                options={evOptions}
                loading={evLoading}
                getOptionLabel={(o) =>
                  `${o.title}${o.date ? ` — ${o.date}` : ""}`
                }
                onInputChange={(_, v) => setEvQuery(v)}
                onChange={(_, v) => {
                  if (!v) return;
                  setSelectedEV((old) => {
                    if (old.some((e) => e.id === v.id)) return old;
                    return [...old, { id: v.id, title: v.title }];
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Procurar evento por título"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {evLoading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Stack direction="row" gap={1} flexWrap="wrap">
                {selectedEV.map((e) => (
                  <Chip
                    key={e.id}
                    label={`${e.title} (#${e.id})`}
                    onDelete={() =>
                      setSelectedEV((old) => old.filter((x) => x.id !== e.id))
                    }
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {step > 0 && <Button onClick={back}>Anterior</Button>}
        {step < 2 && <Button onClick={next}>Seguinte</Button>}
        {step === 2 && (
          <Button
            variant="contained"
            onClick={submit}
            disabled={form.modeEnum === "IN_PERSON" && !autoLibrary.id}
          >
            Confirmar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

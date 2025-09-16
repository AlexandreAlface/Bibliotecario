import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, TextField, FormControlLabel, Checkbox, MenuItem,
  Divider, Stack, InputAdornment
} from "@mui/material";
import { WhiteCard, PrimaryButton, SecondaryButton } from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listLibrarianSlots,
  bulkCreateSlots,
  listLibrarianLibraries, // 👈 NOVO
} from "@/services/consultations";

/** Utilitários de datas (local) */
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function toIso(d: Date) { return new Date(d).toISOString(); }

type Mode = "DAY" | "WEEK" | "MONTH" | "RANGE";

export default function LibrarianSlots() {
  const { user } = useUserSession();
  const librarianId = user!.id;

  // Passo 1: intervalo
  const [mode, setMode] = useState<Mode>("WEEK");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [weekdays, setWeekdays] = useState<boolean[]>([false,true,true,true,true,true,false]); // seg-sex

  // Passo 2: janela e granularidade
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [gapMinutes, setGapMinutes] = useState(0);

  // Passo 3: bibliotecas do bibliotecário
  const [libs, setLibs] = useState<Array<{ id: number; name: string }>>([]);
  const [libraryId, setLibraryId] = useState<number | "">(""); // "" = não definido

  // Estado: existentes e preview
  const [existing, setExisting] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  // Carrega bibliotecas associadas e auto-seleciona se houver só 1
  useEffect(() => {
    (async () => {
      try {
        const l = await listLibrarianLibraries(librarianId);
        setLibs(l || []);
        if (l && l.length === 1) setLibraryId(l[0].id);
      } catch {
        setLibs([]);
        setLibraryId("");
      }
    })();
  }, [librarianId]);

  // Calcula intervalo efetivo [from,to]
  const { from, to } = useMemo(() => {
    const base = new Date(date + "T00:00:00");
    if (mode === "DAY") return { from: startOfDay(base), to: endOfDay(base) };
    if (mode === "WEEK") {
      const dow = (base.getDay()+6)%7; // 0=Mon..6=Sun
      const monday = addDays(base, -dow);
      const sunday = addDays(monday, 6);
      return { from: startOfDay(monday), to: endOfDay(sunday) };
    }
    if (mode === "MONTH") {
      const first = new Date(base.getFullYear(), base.getMonth(), 1);
      const last = new Date(base.getFullYear(), base.getMonth()+1, 0);
      return { from: startOfDay(first), to: endOfDay(last) };
    }
    const a = new Date(date + "T00:00:00");
    const b = new Date(dateTo + "T00:00:00");
    const lo = a <= b ? a : b;
    const hi = a <= b ? b : a;
    return { from: startOfDay(lo), to: endOfDay(hi) };
  }, [mode, date, dateTo]);

  // Carrega slots existentes no intervalo (para “pular dia”)
  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null); setDoneMsg(null);
      try {
        const items = await listLibrarianSlots(librarianId, { from: toIso(from), to: toIso(to) });
        setExisting(Array.isArray(items) ? items : []);
      } catch (e: any) {
        setErr(e?.message || "Falha ao carregar slots existentes");
        setExisting([]);
      } finally { setLoading(false); }
    })();
  }, [librarianId, from.getTime(), to.getTime()]);

  // Gera pré-visualização (pula dias que já têm 1+ slot)
  const preview = useMemo(() => {
    const daysWithSlots = new Set<string>();
    for (const s of existing) {
      const d = new Date(s.startAt);
      daysWithSlots.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString());
    }

    const out: { startAt: Date; endAt: Date }[] = [];
    const [hStart, mStart] = dayStart.split(":").map(Number);
    const [hEnd, mEnd] = dayEnd.split(":").map(Number);

    if (slotMinutes <= 0) return [];
    const totalMin = (hEnd*60+mEnd) - (hStart*60+mStart);
    if (totalMin <= 0) return [];

    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
      const w = d.getDay(); // 0..6 (0=Dom)
      if (!weekdays[w]) continue;

      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      if (daysWithSlots.has(key)) continue;

      let cur = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hStart, mStart, 0, 0);
      const endD = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hEnd, mEnd, 0, 0);

      while (cur < endD) {
        const st = new Date(cur);
        const en = new Date(cur.getTime() + slotMinutes*60000);
        if (en > endD) break;
        out.push({ startAt: st, endAt: en });
        cur = new Date(en.getTime() + gapMinutes*60000);
      }
    }
    return out;
  }, [existing, from, to, weekdays, dayStart, dayEnd, slotMinutes, gapMinutes]);

  async function handleCreate() {
    setCreating(true); setErr(null); setDoneMsg(null);
    try {
      const payload = preview.map(s => ({
        startAt: toIso(s.startAt),
        endAt: toIso(s.endAt),
        ...(libraryId !== "" ? { libraryId: Number(libraryId) } : {}), // 👈 omite se vazio; API auto-preenche quando há 1 associação
        status: "OPEN" as const,
      }));
      if (!payload.length) {
        setDoneMsg("Nada a criar (todos os dias já tinham slots ou a janela é inválida).");
      } else {
        const res = await bulkCreateSlots(librarianId, payload);
        setDoneMsg(`Criados ${res?.created ?? payload.length} slots.`);
        // recarrega existentes
        const items = await listLibrarianSlots(librarianId, { from: toIso(from), to: toIso(to) });
        setExisting(Array.isArray(items) ? items : []);
      }
    } catch (e:any) {
      setErr(e?.message || "Falha ao criar slots");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box sx={{ py: 3, display: "grid", gap: 2 }}>
      <Typography variant="h5">Gestão de slots</Typography>

      {err && <Typography color="error" sx={{ mb: 1 }}>Erro: {err}</Typography>}
      {doneMsg && <Typography color="success.main" sx={{ mb: 1 }}>{doneMsg}</Typography>}

      {/* Passo 1: intervalo */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>1) Intervalo</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select label="Modo" size="small" value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="DAY">Dia</MenuItem>
            <MenuItem value="WEEK">Semana</MenuItem>
            <MenuItem value="MONTH">Mês</MenuItem>
            <MenuItem value="RANGE">Intervalo</MenuItem>
          </TextField>

          <TextField
            type="date" size="small" label={mode === "DAY" ? "Dia" : mode === "WEEK" ? "Qualquer dia da semana" : mode === "MONTH" ? "Mês (qualquer dia)" : "De"}
            value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 200 }}
            InputLabelProps={{ shrink: true }}
          />
          {mode === "RANGE" && (
            <TextField
              type="date" size="small" label="Até"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" sx={{ mb: 1 }}>Dias da semana</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d, idx) => (
            <FormControlLabel
              key={idx}
              control={
                <Checkbox
                  checked={weekdays[idx]}
                  onChange={(e) => {
                    const next = weekdays.slice(); next[idx] = e.target.checked; setWeekdays(next);
                  }}
                  size="small"
                />
              }
              label={d}
            />
          ))}
        </Stack>
      </WhiteCard>

      {/* Passo 2: janela diária e granularidade */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>2) Janela do dia e duração</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            type="time" size="small" label="Início do dia"
            value={dayStart} onChange={(e) => setDayStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="time" size="small" label="Fim do dia"
            value={dayEnd} onChange={(e) => setDayEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="number" size="small" label="Duração slot"
            value={slotMinutes} onChange={(e) => setSlotMinutes(Math.max(1, Number(e.target.value || 0)))}
            InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
          />
          <TextField
            type="number" size="small" label="Intervalo"
            value={gapMinutes} onChange={(e) => setGapMinutes(Math.max(0, Number(e.target.value || 0)))}
            InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
          />
        </Stack>
      </WhiteCard>

      {/* Passo 3: biblioteca (automático) */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>3) Biblioteca</Typography>

        {libs.length === 0 && (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Sem biblioteca associada — os slots serão criados sem biblioteca.
          </Typography>
        )}

        {libs.length === 1 && (
          <Typography variant="body2">
            Biblioteca associada: <b>{libs[0].name}</b> (aplicada automaticamente)
          </Typography>
        )}

        {libs.length > 1 && (
          <TextField
            select size="small" label="Selecionar biblioteca"
            value={libraryId === "" ? "" : libraryId}
            onChange={(e) => setLibraryId(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ maxWidth: 360 }}
            helperText="Obrigatório quando tens várias bibliotecas."
          >
            {libs.map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
            ))}
            <MenuItem value="">Sem biblioteca</MenuItem>
          </TextField>
        )}
      </WhiteCard>

      {/* Passo 4: preview e criar */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          4) Pré-visualização {loading ? "· a carregar existentes…" : ""}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          Intervalo: <b>{from.toLocaleDateString()}</b> — <b>{to.toLocaleDateString()}</b>
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Dias com slots existentes: <b>{
            Array.from(new Set(existing.map((s:any)=> new Date(s.startAt).toDateString()))).length
          }</b> (serão saltados)
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Serão criados <b>{preview.length}</b> slots.
        </Typography>

        <Box sx={{ display: "grid", gap: 1, maxHeight: 260, overflow: "auto" }}>
          {preview.slice(0, 20).map((s, idx) => (
            <Box key={idx} sx={{ fontSize: 14, opacity: 0.85 }}>
              {s.startAt.toLocaleDateString()} · {s.startAt.toLocaleTimeString()}—{s.endAt.toLocaleTimeString()}
            </Box>
          ))}
          {preview.length > 20 && (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              (+{preview.length - 20} mais…)
            </Typography>
          )}
          {preview.length === 0 && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Nada para criar. Ajusta os filtros acima.
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <PrimaryButton disabled={creating || preview.length === 0} onClick={handleCreate}>
            {creating ? "A criar…" : "Criar slots"}
          </PrimaryButton>
          <SecondaryButton onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Voltar ao topo
          </SecondaryButton>
        </Box>
      </WhiteCard>
    </Box>
  );
}

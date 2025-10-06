/**
 * =============================================================================
 *  Gestão de Slots do Bibliotecário
 * -----------------------------------------------------------------------------
 *  Ficheiro: src/pages/librarian/Slots.tsx
 *  Autor:    Alexandre Brissos — nº 21131
 *
 *  Reforço pedido:
 *   - Comentários por todo o código (pt-PT).
 *   - Helpers/métodos "puros" (sem side-effects) destacados.
 *   - Funções com menos de ~30 linhas sempre que possível.
 *   - Manter padrões MUI + @bibliotecario/ui-web.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Divider,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  WhiteCard,
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-web";
import { useUserSession } from "@/contexts/UserSession";
import {
  listLibrarianSlots,
  bulkCreateSlots,
  listLibrarianLibraries,
} from "@/services/consultations";
import type { SlotLite } from "@/services/consultations";

/* ============================================================================
 *  HELPERS "PUROS" — utilitários sem efeitos colaterais (fáceis de testar)
 * ========================================================================== */

/** Início do dia (00:00) — útil para comparar intervalos por data. */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** Fim do dia (23:59) — útil para limites “até”. */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
/** Soma N dias sem mutar o original. */
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** ISO string estável (sempre novo Date(d) para evitar mutabilidade). */
function toIso(d: Date) {
  return new Date(d).toISOString();
}

/** Converte "HH:mm" em horas/minutos numéricos. */
function parseHM(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return { h, m };
}

/** Chave canónica “por dia” (sem tempo) — ex.: para sets/hashtables. */
function sameDayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}

/** Conjunto de dias que já têm 1+ slot, para “saltar” esses dias. */
function computeDaysWithSlots(existing: SlotLite[]): Set<string> {
  const set = new Set<string>();
  for (const s of existing || []) {
    const d = new Date(s.startAt);
    set.add(sameDayKey(d));
  }
  return set;
}

/** Devolve se o dia respeita o filtro de weekdays. getDay(): 0=Dom..6=Sáb */
function shouldUseWeekday(d: Date, weekdays: boolean[]): boolean {
  return !!weekdays[d.getDay()];
}

/** Cria intervalos de um único dia, dada a janela e granularidade. */
function generateIntervalsForDay(
  day: Date,
  dayStart: string,
  dayEnd: string,
  slotMinutes: number,
  gapMinutes: number
): Array<{ startAt: Date; endAt: Date }> {
  const { h: hStart, m: mStart } = parseHM(dayStart);
  const { h: hEnd, m: mEnd } = parseHM(dayEnd);

  if (slotMinutes <= 0) return [];

  const totalMin = hEnd * 60 + mEnd - (hStart * 60 + mStart);
  if (totalMin <= 0) return [];

  const out: Array<{ startAt: Date; endAt: Date }> = [];
  let cur = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hStart,
    mStart,
    0,
    0
  );
  const endD = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hEnd,
    mEnd,
    0,
    0
  );

  while (cur < endD) {
    const st = new Date(cur);
    const en = new Date(cur.getTime() + slotMinutes * 60000);
    if (en > endD) break;
    out.push({ startAt: st, endAt: en });
    cur = new Date(en.getTime() + gapMinutes * 60000);
  }
  return out;
}

/** Calcula intervalo [from,to] a partir do modo e datas (puro). */
type Mode = "DAY" | "WEEK" | "MONTH" | "RANGE";
function rangeFromMode(
  mode: Mode,
  date: string,
  dateTo: string
): { from: Date; to: Date } {
  const base = new Date(date + "T00:00:00");

  if (mode === "DAY") return { from: startOfDay(base), to: endOfDay(base) };

  if (mode === "WEEK") {
    // Segunda-feira como início: (getDay()+6)%7 → 0=Seg..6=Dom
    const dow = (base.getDay() + 6) % 7;
    const monday = addDays(base, -dow);
    const sunday = addDays(monday, 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }

  if (mode === "MONTH") {
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { from: startOfDay(first), to: endOfDay(last) };
  }

  // RANGE
  const a = new Date(date + "T00:00:00");
  const b = new Date(dateTo + "T00:00:00");
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  return { from: startOfDay(lo), to: endOfDay(hi) };
}

/* ============================================================================
 *  COMPONENTE — página de gestão de slots
 * ========================================================================== */

export default function LibrarianSlots() {
  const { user } = useUserSession();
  const librarianId = user!.id; // assumido autenticado (página do bibliotecário)

  // ------- Passo 1: intervalo
  const [mode, setMode] = useState<Mode>("WEEK");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  // Índices alinhados com getDay(): 0=Dom..6=Sáb — por omissão: seg-sex
  const [weekdays, setWeekdays] = useState<boolean[]>([
    false,
    true,
    true,
    true,
    true,
    true,
    false,
  ]);

  // ------- Passo 2: janela e granularidade
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [gapMinutes, setGapMinutes] = useState(0);

  // ------- Passo 3: bibliotecas do bibliotecário
  const [libs, setLibs] = useState<Array<{ id: number; name: string }>>([]);
  const [libraryId, setLibraryId] = useState<number | "">(""); // "" → sem biblioteca

  // ------- Estado: existentes, loading & feedback
  const [existing, setExisting] = useState<SlotLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  // Carregar bibliotecas associadas e auto-selecionar se houver apenas 1
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

  // Intervalo efetivo [from,to] derivado do modo (puro via helper)
  const { from, to } = useMemo(
    () => rangeFromMode(mode, date, dateTo),
    [mode, date, dateTo]
  );

  // Slots já existentes no intervalo (para saltar dias com 1+ slot)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setDoneMsg(null);
      try {
        const items = await listLibrarianSlots(librarianId, {
          from: toIso(from),
          to: toIso(to),
        });
        setExisting(Array.isArray(items) ? (items as SlotLite[]) : []);
      } catch (e: any) {
        setErr(e?.message || "Falha ao carregar slots existentes");
        setExisting([]);
      } finally {
        setLoading(false);
      }
    })();
    // dependências por valor (getTime) para evitar loops
  }, [librarianId, from.getTime(), to.getTime()]);

  // Pré-visualização dos slots a criar (saltando dias com slots)
  const preview = useMemo(() => {
    const out: { startAt: Date; endAt: Date }[] = [];
    const daysWithSlots = computeDaysWithSlots(existing); // puro

    // Itera dia a dia no intervalo e aplica filtros/granularidade
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
      if (!shouldUseWeekday(d, weekdays)) continue; // filtro por dia útil
      if (daysWithSlots.has(sameDayKey(d))) continue; // já existe slot: salta

      // gera segmentos para o dia
      const parts = generateIntervalsForDay(
        d,
        dayStart,
        dayEnd,
        slotMinutes,
        gapMinutes
      );
      out.push(...parts);
    }
    return out;
  }, [existing, from, to, weekdays, dayStart, dayEnd, slotMinutes, gapMinutes]);

  /** Criação em massa dos slots (mantida < 30 linhas). */
  async function handleCreate() {
    setCreating(true);
    setErr(null);
    setDoneMsg(null);
    try {
      // Prepara payload para API; omite libraryId se vazio
      const payload = preview.map((s) => ({
        startAt: toIso(s.startAt),
        endAt: toIso(s.endAt),
        ...(libraryId !== "" ? { libraryId: Number(libraryId) } : {}),
        status: "OPEN" as const,
      }));

      if (!payload.length) {
        setDoneMsg(
          "Nada a criar (dias já tinham slots ou a janela é inválida)."
        );
      } else {
        const res = await bulkCreateSlots(librarianId, payload);
        setDoneMsg(`Criados ${res?.created ?? payload.length} slots.`);
        // Recarrega existentes para atualizar “saltos”
        const items = await listLibrarianSlots(librarianId, {
          from: toIso(from),
          to: toIso(to),
        });
        setExisting(Array.isArray(items) ? (items as SlotLite[]) : []);
      }
    } catch (e: any) {
      setErr(e?.message || "Falha ao criar slots");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box sx={{ py: 3, display: "grid", gap: 2 }}>
      <Typography variant="h5" fontWeight={900}>
        Gestão de slots
      </Typography>

      {/* Feedback global */}
      {err && (
        <Typography color="error" sx={{ mb: 1 }}>
          Erro: {err}
        </Typography>
      )}
      {doneMsg && (
        <Typography color="success.main" sx={{ mb: 1 }}>
          {doneMsg}
        </Typography>
      )}

      {/* ==================== Passo 1: Intervalo ==================== */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          1) Intervalo
        </Typography>

        {/* Modo + datas */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Modo"
            size="small"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="DAY">Dia</MenuItem>
            <MenuItem value="WEEK">Semana</MenuItem>
            <MenuItem value="MONTH">Mês</MenuItem>
            <MenuItem value="RANGE">Intervalo</MenuItem>
          </TextField>

          <TextField
            type="date"
            size="small"
            label={
              mode === "DAY"
                ? "Dia"
                : mode === "WEEK"
                ? "Qualquer dia da semana"
                : mode === "MONTH"
                ? "Mês (qualquer dia)"
                : "De"
            }
            value={date}
            onChange={(e) => setDate(e.target.value)}
            sx={{ minWidth: 200 }}
            InputLabelProps={{ shrink: true }}
          />

          {mode === "RANGE" && (
            <TextField
              type="date"
              size="small"
              label="Até"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              sx={{ minWidth: 200 }}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Seleção de dias da semana (alinha com getDay(): 0..6) */}
        <Typography variant="body2" sx={{ mb: 1 }}>
          Dias da semana
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, idx) => (
            <FormControlLabel
              key={idx}
              control={
                <Checkbox
                  checked={weekdays[idx]}
                  onChange={(e) => {
                    const next = weekdays.slice();
                    next[idx] = e.target.checked;
                    setWeekdays(next);
                  }}
                  size="small"
                />
              }
              label={d}
            />
          ))}
        </Stack>
      </WhiteCard>

      {/* ========== Passo 2: janela diária e granularidade ========== */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          2) Janela do dia e duração
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            type="time"
            size="small"
            label="Início do dia"
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="time"
            size="small"
            label="Fim do dia"
            value={dayEnd}
            onChange={(e) => setDayEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="number"
            size="small"
            label="Duração slot"
            value={slotMinutes}
            onChange={(e) =>
              setSlotMinutes(Math.max(1, Number(e.target.value || 0)))
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">min</InputAdornment>,
            }}
          />
          <TextField
            type="number"
            size="small"
            label="Intervalo"
            value={gapMinutes}
            onChange={(e) =>
              setGapMinutes(Math.max(0, Number(e.target.value || 0)))
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">min</InputAdornment>,
            }}
          />
        </Stack>
      </WhiteCard>

      {/* ========== Passo 3: Biblioteca (automático/obrigatório se várias) ========== */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          3) Biblioteca
        </Typography>

        {libs.length === 0 && (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Sem biblioteca associada — os slots serão criados sem biblioteca.
          </Typography>
        )}

        {libs.length === 1 && (
          <Typography variant="body2">
            Biblioteca associada: <b>{libs[0].name}</b> (aplicada
            automaticamente)
          </Typography>
        )}

        {libs.length > 1 && (
          <TextField
            select
            size="small"
            label="Selecionar biblioteca"
            value={libraryId === "" ? "" : libraryId}
            onChange={(e) =>
              setLibraryId(e.target.value === "" ? "" : Number(e.target.value))
            }
            sx={{ maxWidth: 360 }}
            helperText="Obrigatório quando tens várias bibliotecas."
          >
            {libs.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
            <MenuItem value="">Sem biblioteca</MenuItem>
          </TextField>
        )}
      </WhiteCard>

      {/* ========== Passo 4: Pré-visualização e criação ========== */}
      <WhiteCard>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          4) Pré-visualização {loading ? "· a carregar existentes…" : ""}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          Intervalo: <b>{from.toLocaleDateString()}</b> —{" "}
          <b>{to.toLocaleDateString()}</b>
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Dias com slots existentes:{" "}
          <b>
            {
              Array.from(
                new Set(
                  existing.map((s: SlotLite) => sameDayKey(new Date(s.startAt)))
                )
              ).length
            }
          </b>{" "}
          (serão saltados)
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Serão criados <b>{preview.length}</b> slots.
        </Typography>

        {/* Listagem compacta do preview (cap a 20 linhas) */}
        <Box sx={{ display: "grid", gap: 1, maxHeight: 260, overflow: "auto" }}>
          {preview.slice(0, 20).map((s, idx) => (
            <Box key={idx} sx={{ fontSize: 14, opacity: 0.85 }}>
              {s.startAt.toLocaleDateString()} ·{" "}
              {s.startAt.toLocaleTimeString()}—{s.endAt.toLocaleTimeString()}
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

        {/* Ações */}
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <PrimaryButton
            disabled={creating || preview.length === 0}
            onClick={handleCreate}
          >
            {creating ? "A criar…" : "Criar slots"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Voltar ao topo
          </SecondaryButton>
        </Box>
      </WhiteCard>
    </Box>
  );
}

/* ============================================================================
 *  FIM — Alexandre Brissos • nº 21131
 * ========================================================================== */

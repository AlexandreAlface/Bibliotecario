/**
 * =============================================================================
 *  Módulo: apps/mobile/src/utils/format.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc PT-PT e código autoexplicativo.
 *   • Helpers **PUROS** (sem efeitos laterais) e funções curtas (≤ 30 linhas).
 *   • Tratamento “fail-safe”: datas inválidas devolvem string vazia.
 * =============================================================================
 */

const LOCALE = "pt-PT";

/** Formatadores reutilizados para evitar recriação a cada chamada. */
const DATE_FMT = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" });
const TIME_FMT = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Tenta converter ISO para Date; devolve `null` se for inválido. */
function parseIso(dateIso?: string | null): Date | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formata uma data ISO para "15/07/2025" (pt-PT). */
export function fmtDate(dateIso?: string | null): string {
  const d = parseIso(dateIso);
  return d ? DATE_FMT.format(d) : "";
}

/** Formata uma data ISO para hora "11:00" (24h, pt-PT). */
export function fmtTime(dateIso?: string | null): string {
  const d = parseIso(dateIso);
  return d ? TIME_FMT.format(d) : "";
}

/** Junta data e hora já formatadas (ex.: "15/07/2025 11:00"). */
export function fmtDateTime(dateIso?: string | null): string {
  const d = parseIso(dateIso);
  return d ? `${DATE_FMT.format(d)} ${TIME_FMT.format(d)}` : "";
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */

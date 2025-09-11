// apps/mobile/src/utils/format.ts
export function fmtDate(dateIso?: string | null) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(d);
}
export function fmtTime(dateIso?: string | null) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).format(d);
}
export function fmtDateTime(dateIso?: string | null) {
  if (!dateIso) return '';
  return `${fmtDate(dateIso)} ${fmtTime(dateIso)}`;
}

// apps/web/src/utils/errorMessages.ts
export function rescheduleErrorMessage(err: any) {
  const msg = (err?.message || "").toString();
  if (msg === "only_pending")
    return "Só é possível reagendar diretamente enquanto a consulta está pendente.";
  if (msg === "slot_not_open" || msg === "slot_already_linked")
    return "Esse horário já não está disponível.";
  if (msg === "library_required_for_in_person")
    return "Escolhe um horário com biblioteca para consultas presenciais.";
  return "Não foi possível reagendar. Tenta novamente.";
}

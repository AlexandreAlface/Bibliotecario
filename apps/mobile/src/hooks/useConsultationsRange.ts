// apps/mobile/src/hooks/useConsultationsRange.ts
import * as React from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { consultationsApi } from "src/services/consultations";
import { useAuth } from "src/contexts/AuthContext";

export type Role = "family" | "librarian";
export type ConsultationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED";

export function useConsultationsRange(role: Role) {
  const { user } = useAuth();
  const ids = React.useMemo(
    () => ({
      familyId: role === "family" ? user?.id : undefined,
      librarianId: role === "librarian" ? user?.id : undefined,
      // Opcional: filtrar por criança ativa (se quiseres)
      childId: user?.actingChild?.id,
    }),
    [role, user?.id, user?.actingChild?.id]
  );

  const [from, setFrom] = React.useState<string>(
    startOfMonth(new Date()).toISOString()
  );
  const [to, setTo] = React.useState<string>(
    endOfMonth(new Date()).toISOString()
  );
  const [statuses, setStatuses] = React.useState<ConsultationStatus[]>([
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
  ]);

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!ids.familyId && !ids.librarianId) return;
    setLoading(true);
    setError(null);
    try {
      // O teu service aceita CSV; junta os estados:
      const statusCsv = statuses.join(",");
      const data = await consultationsApi.listAll({
        ...ids,
        from,
        to,
        order: "asc",
        status: statusCsv,
        limit: 200,
      });
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Falha a carregar consultas");
    } finally {
      setLoading(false);
    }
  }, [ids.familyId, ids.librarianId, ids.childId, from, to, statuses]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    from,
    to,
    setFrom,
    setTo,
    statuses,
    setStatuses,
    rows,
    loading,
    error,
    refresh,
  };
}

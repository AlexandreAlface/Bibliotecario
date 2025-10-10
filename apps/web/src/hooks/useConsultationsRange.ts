// apps/web/src/hooks/useConsultationsRange.ts
import * as React from "react";
import dayjs from "dayjs";
import {
  getConsultationsHistory,
  type ConsultationFull,
  type ConsultationStatus,
} from "@/services/consultations";
import { useUserSession } from "@/contexts/UserSession";

export type Role = "family" | "librarian";

export function useConsultationsRange(role: Role) {
  const { user } = useUserSession();
  const familyId =
    role === "family" ? (user?.id ? Number(user.id) : undefined) : undefined;
  const librarianId =
    role === "librarian"
      ? (user?.id ? Number(user.id) : undefined)
      : undefined;
  const childId =
    role === "family" ? user?.actingChild?.id ?? undefined : undefined;

  // mês corrente por defeito
  const startOfMonth = dayjs().startOf("month").toISOString();
  const endOfMonth = dayjs().endOf("month").toISOString();

  const [from, setFrom] = React.useState<string>(startOfMonth);
  const [to, setTo] = React.useState<string>(endOfMonth);
  const [statuses, setStatuses] = React.useState<ConsultationStatus[]>([
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
  ]);

  const [rows, setRows] = React.useState<ConsultationFull[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!familyId && !librarianId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getConsultationsHistory({
        familyId,
        childId,
        librarianId,
        from,
        to,
        order: "asc",
        status: statuses,
        limit: 500,
      });
      setRows(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar consultas");
    } finally {
      setLoading(false);
    }
  }, [familyId, childId, librarianId, from, to, statuses]);

  React.useEffect(() => {
    refresh();
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

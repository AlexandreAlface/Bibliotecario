/**
 * =============================================================================
 *  Módulo: src/services/consultations.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários e JSDoc detalhados (PT-PT).
 *   • Helpers **PUROS** (toQuery, tryJson, normalizeDetails) — sem efeitos.
 *   • Funções curtas, coesas e testáveis.
 *   • Tipagem explícita e retorno tipado em todas as chamadas.
 * =============================================================================
 */

import { API_URL, request } from "./api";

export type ConsultationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED";

/** Consulta “light” para listagens no mobile. */
export type ConsultationLite = {
  id: number;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: ConsultationStatus | null;
  childName?: string | null;
  librarianName?: string | null;
  libraryName?: string | null;
};

/** Slot de marcação de consulta. */
export type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "CANCELLED";
  librarianId: number;
  librarianName?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  librarianAvatarUrl?: string | null;
};

/** Estrutura normalizada devolvida por `details`. */
export type DetailsShape = {
  consultation?: any;
  attachments?: {
    books?: any[];
    microContents?: any[];
    events?: any[];
  };
  readings?: any[];
  /** eventos / timeline */
  events?: any[];
  history?: { consultations?: any[] };
};

/* ============================== Helpers PUROS =============================== */

/**
 * Constrói query-string ignorando chaves indefinidas/nulas/vazias.
 * Suporta arrays (repete o mesmo parâmetro p/ cada valor).
 */
function toQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || String(v) === "") continue;
    if (Array.isArray(v)) {
      for (const vv of v) {
        if (vv === undefined || vv === null || String(vv) === "") continue;
        parts.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(String(vv))}`
        );
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Tenta, por ordem, uma lista de caminhos relativos e devolve o JSON (ou null).
 * Não lança — falha suave para permitir fallbacks.
 */
async function tryJson(paths: string[]): Promise<any | null> {
  for (const p of paths) {
    try {
      const res = await fetch(`${API_URL}${p}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        // 404/501: pode não existir — tenta próximo
        if (res.status === 404 || res.status === 501) continue;
        // outros erros: tenta próximo também (modo tolerante)
        continue;
      }
      return await res.json();
    } catch {
      // offline ou outra falha — tenta próximo
      continue;
    }
  }
  return null;
}

/**
 * Normaliza um payload de detalhes (venha ele em que forma vier) para o
 * “shape” usado pelo ecrã mobile.
 */
function normalizeDetails(input: any): DetailsShape {
  const consultation =
    input?.consultation && typeof input.consultation === "object"
      ? input.consultation
      : input && typeof input === "object"
      ? input
      : {};

  const attachmentsRaw =
    input?.attachments ??
    input?.consultation?.attachments ??
    {
      books: input?.books ?? [],
      microContents: input?.microContents ?? [],
      events: input?.events ?? [],
    };

  return {
    consultation,
    attachments: {
      books: attachmentsRaw?.books ?? [],
      microContents: attachmentsRaw?.microContents ?? [],
      events: attachmentsRaw?.events ?? [],
    },
    readings: input?.readings ?? input?.consultation?.readings ?? [],
    // “events” é a timeline; evitar colisão com attachments.events (já tratado acima)
    events: input?.eventsTimeline ?? input?.timeline ?? input?.eventsTimelineItems ?? [],
    history: {
      consultations:
        input?.history?.consultations ??
        input?.consultationsHistory ??
        input?.relatedConsultations ??
        [],
    },
  };
}

/* ================================= API ===================================== */

export const consultationsApi = {
  /**
   * Lista **todas** as consultas visíveis para o utilizador (família/criança),
   * opcionalmente filtradas por estado, intervalo temporal, bibliotecário, etc.
   */
  listAll: (params: {
    familyId?: number;
    childId?: number;
    librarianId?: number;
    status?: ConsultationStatus | ConsultationStatus[];
    from?: string;
    to?: string;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }) => request(`/consultations/all?${toQuery(params)}`, { method: "GET" }),

  /**
   * Obtém os slots de um bibliotecário específico num intervalo.
   */
  slotsByLibrarian: (
    librarianId: number,
    params: { from: string; to: string }
  ) =>
    request<Slot[]>(
      `/consultations/librarians/${librarianId}/slots${toQuery({
        from: params.from,
        to: params.to,
      })}`,
      { method: "GET" }
    ),

  /**
   * Cria uma consulta a partir de um slot existente.
   */
  create: (data: {
    familyId: number;
    childId: number;
    slotId: number;
    librarianId: number;
  }) => request("/consultations", { method: "POST", json: data }),

  next: (params: { familyId?: number; librarianId?: number }) =>
    request(`/consultations/next?${toQuery(params)}`, { method: "GET" }),

  /**
   * 🔧 `details` “rico”: tenta endpoints completos; se faltarem secções
   * (anexos/leituras/timeline/histórico), vai buscá-las em paralelo.
   * Devolve sempre o shape: { consultation, attachments:{...}, readings, events, history:{consultations} }
   */
  details: async (id: number): Promise<DetailsShape> => {
    // 1) tenta endpoints ricos usados na web
    const base =
      (await tryJson([`/consultations/${id}/room`, `/consultations/${id}/details`])) ??
      (await tryJson([`/consultations/${id}`])) ??
      {};

    // 2) normaliza o que já veio
    const normalized = normalizeDetails(base);

    // 3) identificar faltas
    const needsAttachments =
      !normalized.attachments ||
      (!normalized.attachments.books?.length &&
        !normalized.attachments.microContents?.length &&
        !normalized.attachments.events?.length);

    const needsReadings = !(normalized.readings?.length > 0);
    const needsTimeline = !(normalized.events?.length > 0);
    const needsHistory = !(normalized.history?.consultations?.length > 0);

    // 4) ir buscar sub-recursos em paralelo (fall-back).
    const [attachments, readings, timeline, history] = await Promise.all([
      needsAttachments
        ? tryJson([
            `/consultations/${id}/attachments`,
            `/consultations/${id}/books`, // compat
          ])
        : null,
      needsReadings ? tryJson([`/consultations/${id}/readings`]) : null,
      needsTimeline
        ? tryJson([
            `/consultations/${id}/events`,
            `/consultations/${id}/timeline`,
          ])
        : null,
      needsHistory
        ? tryJson([`/consultations/${id}/history`, `/consultations/${id}/related`])
        : null,
    ]);

    // 5) merge final com coerência de chaves
    return {
      consultation: normalized.consultation,
      attachments: {
        books:
          normalized.attachments?.books ??
          attachments?.books ??
          attachments?.items ??
          attachments ??
          [],
        microContents:
          normalized.attachments?.microContents ??
          attachments?.microContents ??
          [],
        events:
          normalized.attachments?.events ??
          (Array.isArray(attachments?.events) ? attachments.events : []),
      },
      readings: normalized.readings ?? readings?.items ?? readings ?? [],
      events: normalized.events ?? timeline?.items ?? timeline ?? [],
      history: {
        consultations:
          normalized.history?.consultations ??
          history?.consultations ??
          history?.items ??
          history ??
          [],
      },
    };
  },

  confirm: (id: number) =>
    request(`/consultations/${id}/confirm`, { method: "POST" }),

  decline: (id: number) =>
    request(`/consultations/${id}/decline`, { method: "POST" }),

  cancel: (id: number) =>
    request(`/consultations/${id}/cancel`, { method: "POST" }),

  complete: (id: number) =>
    request(`/consultations/${id}/complete`, { method: "POST" }),

  reschedule: (id: number, data: { slotId: number }) =>
    request(`/consultations/${id}/reschedule`, { method: "POST", json: data }),

  searchSlots: (params: {
    from: string;
    to: string;
    librarianId?: number;
    libraryId?: number;
    onlyBookable?: boolean;
  }) =>
    request(
      `/consultations/slots?${toQuery({ onlyBookable: true, ...params })}`,
      { method: "GET" }
    ),

  // Opcional: propostas (alinhamento com a web)
  proposalsByFamily: (familyId: number) =>
    request(`/consultations/families/${familyId}/proposals`, { method: "GET" }),

  proposalsByLibrarian: (librarianId: number) =>
    request(`/consultations/librarians/${librarianId}/proposals`, {
      method: "GET",
    }),

  /** Atualiza notas da consulta (bibliotecário/admin) */
  updateNotes: (id: number, data: { notes: string }) =>
    request(`/consultations/${id}/notes`, {
      method: "PATCH",
      json: data,
    }),

  addAttachments: (
    id: number,
    payload: {
      books?: string[]; // isbns
      microContents?: number[]; // ids
      events?: number[]; // ids
      files?: { name: string; url: string }[]; // opcional
    }
  ) =>
    request(`/consultations/${id}/attachments`, {
      method: "POST",
      json: payload,
    }),

  /** Descarrega o PDF de resumo — devolve Blob/ArrayBuffer */
  downloadSummaryPdf: async (id: number) => {
    const res = await fetch(`${API_URL}/consultations/${id}/summary.pdf`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Falha ao descarregar PDF");
    return await res.blob();
  },
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */

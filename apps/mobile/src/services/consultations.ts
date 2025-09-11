// src/services/consultations.ts
import { request } from './api';

export type ConsultationLite = {
  id: number;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
  childName?: string | null;
  librarianName?: string | null;
  libraryName?: string | null;
};

export type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED';
  librarianId: number;
  librarianName?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
};

export const consultationsApi = {
  listAll: (params: {
    familyId?: number;
    childId?: number;
    status?: string; // "PENDING,CONFIRMED"
    from?: string;
    to?: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }) =>
    request<ConsultationLite[]>('/consultations/all', { method: 'GET', json: undefined, headers: undefined,  // keep typing happy
      // request() já monta query quando usamos path completo; aqui vamos manualmente construir:
    } as any) as any, // ver nota abaixo
  // 👆 Nota: se quiseres query-string forte, cria um helper em api.ts. Mais abaixo mostro como chamo com URL pronto.

  // Slots por bibliotecário
  slotsByLibrarian: (librarianId: number, params: { from: string; to: string }) =>
    request<Slot[]>(`/consultations/librarians/${librarianId}/slots?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`, { method: 'GET' }),

  create: (data: { familyId: number; childId: number; slotId: number }) =>
    request('/consultations', { method: 'POST', json: data }),
};

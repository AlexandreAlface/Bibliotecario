/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de sessão (utilizador atual e "acting child") usando o cliente HTTP
 *            central (axios) com cookies e tratamento de erros normalizado.
 */
import { http } from "./https";

/** Payload para assumir atuação como uma criança específica. */
type ActAsChildPayload = { childId: number };

/**
 * API de sessão.
 * - Todas as chamadas enviam o cookie httpOnly (configurado em https.ts).
 * - Endpoints assumem baseURL já definida no axios.
 */
export const sessionApi = {
  /** Obtém o utilizador autenticado (e metadados de sessão). */
  me: async <T = unknown>() =>
    http<T>({ url: "/auth/me", method: "GET" }),

  /** Define o "acting child" na sessão. */
  actAsChild: async (childId: number) =>
    http<void>({
      url: "/auth/acting-child",
      method: "POST",
      data: { childId } as ActAsChildPayload,
      headers: { "Content-Type": "application/json" },
    }),

  /** Limpa o "acting child" atual. */
  clearActingChild: async () =>
    http<void>({ url: "/auth/acting-child/clear", method: "POST" }),
};

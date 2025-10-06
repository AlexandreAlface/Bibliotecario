// apps/api/src/ai/embeddings.ts
// Autor: Alexandre Brissos 21131
// O que faz: cria um cliente OpenAI e expõe uma função tipada para gerar um
// embedding de um único texto. Inclui validações mínimas e mensagens de erro
// mais claras para facilitar o debug em dev.

import OpenAI from "openai";

/** Cliente singleton (evita recriar em cada chamada). */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Modelo de embeddings.
 * Pode ser configurado por env var (EMBEDDING_MODEL) ou cai no default.
 */
export const MODEL: string =
  (process.env.EMBEDDING_MODEL as string) ?? "text-embedding-3-small";

/**
 * Gera o embedding (vetor de números) para um único texto.
 *
 * @param text Texto de entrada (obrigatório, não vazio)
 * @returns Vetor numérico do embedding
 * @throws Error quando o texto está vazio ou a API falha
 *
 * Exemplo:
 * ```ts
 * const vec = await embedOne("Era uma vez...");
 * console.log(vec.length); // dimensão do embedding
 * ```
 */
export async function embedOne(text: string): Promise<number[]> {
  const input = String(text ?? "").trim();
  if (!input) {
    throw new Error("embedOne: argumento 'text' está vazio.");
  }

  try {
    const r = await openai.embeddings.create({
      model: MODEL,
      input,
    });

    const vec = r.data?.[0]?.embedding;
    if (!Array.isArray(vec)) {
      throw new Error("Resposta de embeddings sem vetor válido.");
    }
    return vec as number[];
  } catch (err: any) {
    // Em dev é útil saber o modelo e parte da mensagem original
    const msg = err?.message ?? String(err);
    throw new Error(`Falha ao gerar embedding (${MODEL}): ${msg}`);
  }
}

"use strict";
// apps/api/src/ai/embeddings.ts
// Autor: Alexandre Brissos 21131
// O que faz: cria um cliente OpenAI e expõe uma função tipada para gerar um
// embedding de um único texto. Inclui validações mínimas e mensagens de erro
// mais claras para facilitar o debug em dev.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL = void 0;
exports.embedOne = embedOne;
const openai_1 = __importDefault(require("openai"));
/** Cliente singleton (evita recriar em cada chamada). */
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Modelo de embeddings.
 * Pode ser configurado por env var (EMBEDDING_MODEL) ou cai no default.
 */
exports.MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
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
async function embedOne(text) {
    const input = String(text ?? "").trim();
    if (!input) {
        throw new Error("embedOne: argumento 'text' está vazio.");
    }
    try {
        const r = await openai.embeddings.create({
            model: exports.MODEL,
            input,
        });
        const vec = r.data?.[0]?.embedding;
        if (!Array.isArray(vec)) {
            throw new Error("Resposta de embeddings sem vetor válido.");
        }
        return vec;
    }
    catch (err) {
        // Em dev é útil saber o modelo e parte da mensagem original
        const msg = err?.message ?? String(err);
        throw new Error(`Falha ao gerar embedding (${exports.MODEL}): ${msg}`);
    }
}

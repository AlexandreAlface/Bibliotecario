"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBookEmbeddingText = buildBookEmbeddingText;
exports.reembedBooks = reembedBooks;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const embeddings_js_1 = require("../ai/embeddings.js");
const utils_js_1 = require("../reco/utils.js");
const prisma = new client_1.PrismaClient();
function buildBookEmbeddingText(b) {
    return [
        `Título: ${b.title}`,
        b.author ? `Autor: ${b.author}` : "",
        Array.isArray(b.genres) && b.genres.length
            ? `Géneros: ${b.genres.join(", ")}`
            : "",
        b.collection ? `Coleção: ${b.collection}` : "",
        b.category ? `Categoria: ${b.category}` : "",
        b.summary ? `Resumo: ${b.summary}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
function sha256(s) {
    return crypto_1.default.createHash("sha256").update(s, "utf8").digest("hex");
}
/** Garante extensão/colunas/índice sem rebentar se já existirem */
async function ensureEmbeddingSchema(prisma) {
    // Extensão (ignora se sem permissões)
    try {
        await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    }
    catch { }
    // Colunas
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536)`);
    }
    catch { }
    await prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz`);
    // Índice ANN (cosine)
    await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'book_embedding_ivf_cos'
      ) THEN
        CREATE INDEX book_embedding_ivf_cos
          ON "Book" USING ivfflat ("embedding" vector_cosine_ops)
          WITH (lists = 100);
      END IF;
    END $$;
  `);
}
/**
 * Re-embute em batches. Idempotente:
 * - Faz embed se o hash mudou OU se o embedding está nulo.
 * - Atualiza embedding, embedding_hash e embedding_at.
 */
async function reembedBooks(limit = 500) {
    await ensureEmbeddingSchema(prisma);
    const rows = await prisma.$queryRaw `
    SELECT "isbn","title","author","genres","collection","category","summary","embedding_hash"
    FROM "Book"
    ORDER BY "isbn"
    LIMIT ${limit};
  `;
    let updated = 0;
    for (const b of rows) {
        const text = buildBookEmbeddingText(b);
        const hash = sha256(text);
        // Se já está igual, salta
        if (b.embedding_hash === hash)
            continue;
        const vec = await (0, embeddings_js_1.embedOne)(text);
        await prisma.$executeRaw `
      UPDATE "Book"
      SET "embedding" = ${(0, utils_js_1.toSqlVector)(vec)}::vector,
          "embedding_hash" = ${hash},
          "embedding_at" = now()
      WHERE "isbn" = ${b.isbn};
    `;
        updated++;
    }
    console.log(`Re-embutidos/atualizados: ${updated}/${rows.length}`);
    return updated;
}

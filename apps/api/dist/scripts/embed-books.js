"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/embed-books.js  (ESM)
require("dotenv/config"); // opcional se já usas --env-file
const openai_1 = __importDefault(require("openai"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
// monta um texto curto para cada livro
function textForBook(b) {
    return [
        b.title,
        b.author ? `Autor: ${b.author}` : '',
        b.category ? `Categoria: ${b.category}` : '',
        b.cdu ? `CDU: ${b.cdu}` : '',
        b.summary || ''
    ].filter(Boolean).join('\n');
}
// formata o vetor para o literal SQL de pgvector: '[v1,v2,...]'
function toSqlVector(vec) {
    return `[${vec.join(',')}]`;
}
async function fetchBooksWithoutEmbedding(limit = 128) {
    return prisma.$queryRaw `
    SELECT "isbn", "title", "author", "category", "cdu", "summary"
    FROM "Book"
    WHERE "embedding" IS NULL
    LIMIT ${limit};
  `;
}
async function main() {
    while (true) {
        const batch = await fetchBooksWithoutEmbedding(128);
        if (batch.length === 0)
            break;
        const inputs = batch.map(textForBook);
        const r = await openai.embeddings.create({ model: MODEL, input: inputs });
        for (let i = 0; i < batch.length; i++) {
            const v = toSqlVector(r.data[i].embedding);
            await prisma.$executeRaw `
        UPDATE "Book" SET "embedding" = ${v}::vector WHERE "isbn" = ${batch[i].isbn}
      `;
        }
        console.log(`gravados ${batch.length} embeddings…`);
    }
    await prisma.$executeRawUnsafe(`ANALYZE "Book";`);
    console.log('✔ terminado');
}
await main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => {
    await prisma.$disconnect();
});

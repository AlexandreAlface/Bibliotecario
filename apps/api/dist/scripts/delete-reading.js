"use strict";
// Uso:
//  node -r dotenv/config apps/api/scripts/readings-cleanup.js by-id 123
//  node -r dotenv/config apps/api/scripts/readings-cleanup.js by-child-book 42 9789722041234
//  node -r dotenv/config apps/api/scripts/readings-cleanup.js open-for-child 42
//  node -r dotenv/config apps/api/scripts/readings-cleanup.js truncate
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const [cmd, a1, a2] = process.argv.slice(2);
    if (cmd === "by-id") {
        const id = Number(a1);
        if (!Number.isFinite(id))
            throw new Error("Falta o id numérico.");
        const r = await prisma.reading.delete({ where: { id } });
        console.log("✅ Apagado:", r.id);
        return;
    }
    if (cmd === "by-child-book") {
        const childId = Number(a1);
        const isbn = String(a2 || "");
        if (!Number.isFinite(childId) || !isbn) {
            throw new Error("Uso: by-child-book <childId> <isbn>");
        }
        const r = await prisma.reading.deleteMany({
            where: { childId, bookIsbn: isbn },
        });
        console.log(`✅ Apagadas ${r.count} leituras (childId=${childId}, isbn=${isbn})`);
        return;
    }
    if (cmd === "open-for-child") {
        const childId = Number(a1);
        if (!Number.isFinite(childId))
            throw new Error("Falta childId numérico.");
        const r = await prisma.reading.deleteMany({
            where: { childId, finishedAt: null },
        });
        console.log(`✅ Apagadas ${r.count} sessões em aberto (childId=${childId})`);
        return;
    }
    if (cmd === "truncate") {
        // ⚠️ Apaga TUDO em Reading e faz reset aos IDs.
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Reading" RESTART IDENTITY CASCADE;');
        console.log('🧹 TRUNCATE em "Reading" concluído (RESTART IDENTITY CASCADE).');
        return;
    }
    console.log(`Comandos disponíveis:
  by-id <id>                     — apaga 1 leitura pelo ID
  by-child-book <childId> <isbn> — apaga todas as leituras desse livro para essa criança
  open-for-child <childId>       — apaga sessões em aberto dessa criança
  truncate                       — TRUNCATE total da tabela Reading
`);
}
main()
    .catch((e) => {
    console.error("❌ Erro:", e.message || e);
    process.exit(1);
})
    .finally(async () => prisma.$disconnect());

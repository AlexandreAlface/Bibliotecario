"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/scripts/clear-book-reservations.js
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Método 1: TRUNCATE (apaga e reinicia ID de forma mais rápida)
    await prisma.$executeRaw `TRUNCATE TABLE "BookReservation" RESTART IDENTITY CASCADE`;
    console.log('✅ Tabela "BookReservation" limpa (TRUNCATE + RESTART IDENTITY).');
}
main()
    .catch((e) => {
    console.error('❌ Falhou a limpeza:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

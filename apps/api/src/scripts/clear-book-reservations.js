// apps/api/scripts/clear-book-reservations.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Método 1: TRUNCATE (apaga e reinicia ID de forma mais rápida)
  await prisma.$executeRaw`TRUNCATE TABLE "BookReservation" RESTART IDENTITY CASCADE`;
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

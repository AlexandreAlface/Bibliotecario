// ⚠️ PERIGO: apaga todos os registos de livros e dependências.
// Uso:
//   npx tsx apps/api/scripts/wipeBooks.ts --dry   (mostra contagens)
//   npx tsx apps/api/scripts/wipeBooks.ts         (APAGA MESMO)

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry");

  console.log("⚠️  Isto vai APAGAR todos os livros e relações (holdings, leituras, ratings, reservas, origens).");

  // Contagens antes
  const [books, holdings, origins, readings, ratings, reservations] =
    await Promise.all([
      prisma.book.count(),
      prisma.libraryBook.count(),
      prisma.bookOrigin.count(),
      prisma.reading.count(),
      prisma.rating.count(),
      prisma.bookReservation.count(),
    ]);

  console.log(
    `Antes: Book=${books} | LibraryBook=${holdings} | BookOrigin=${origins} | ` +
      `Reading=${readings} | Rating=${ratings} | BookReservation=${reservations}`
  );

  if (dryRun) {
    console.log("Dry run: nada foi apagado. Remover --dry para executar.");
    return;
  }

  // Apagar em ordem segura (filhos -> pai)
  const result = await prisma.$transaction(async (tx) => {
    const delReservations = await tx.bookReservation.deleteMany({});
    const delReadings     = await tx.reading.deleteMany({});
    const delRatings      = await tx.rating.deleteMany({});
    const delOrigins      = await tx.bookOrigin.deleteMany({});
    const delHoldings     = await tx.libraryBook.deleteMany({});
    const delBooks        = await tx.book.deleteMany({});

    return {
      deleted: {
        reservations: delReservations.count,
        readings: delReadings.count,
        ratings: delRatings.count,
        origins: delOrigins.count,
        holdings: delHoldings.count,
        books: delBooks.count,
      },
    };
  });

  console.log("✅ Feito:", result.deleted);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// prisma/csvSeed.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve(process.cwd(), 'prisma', 'PNL_Final_Combo.csv');
  const stream = fs.createReadStream(filePath).pipe(csv({ separator: ',' }));

  for await (const row of stream) {
    // Extrai ano de publicação (ex.: "Lisboa : Orfeu Negro, 2025")
    let year = null;
    const m = row.Publicacao_Beja.match(/, (\d{4})/);
    if (m) year = parseInt(m[1], 10);

    // Upsert em Book
    await prisma.book.upsert({
      where: { isbn: row.ISBN },
      update: {
        title:          row.Título,
        summary:        row.Resumo,
        author:         row.Autor_Beja,
        publicationYear: year,
        collection:     row.Colecao_Beja,
        category:       row.Assuntos_Beja,
        cdu:            row.CDU_Beja,
        coverUrl:        row.Imagem_Lisboa
      },
      create: {
        isbn:           row.ISBN,
        title:          row.Título,
        summary:        row.Resumo,
        author:         row.Autor_Beja,
        author:         row.Autor_Beja,
        publicationYear: year,
        category:       row.Assuntos_Beja,
        cdu:            row.CDU_Beja,
        coverUrl:        row.Imagem_Lisboa
      }
    });

    // (Opcional) ligas sempre todos os livros à origem “CSV”
    await prisma.origin.upsert({
      where: { description: 'CSV_PNL' },
      update: {},
      create: { description: 'CSV_PNL' }
    });
    await prisma.bookOrigin.upsert({
      where: {
        bookIsbn_originId: {
          bookIsbn: row.ISBN,
          originId: 1      // se o upsert acima tiver id 1, senão adapta
        }
      },
      update: {},
      create: {
        bookIsbn: row.ISBN,
        originId: 1
      }
    });
  }

  // Regista a fonte CSV no teu catálogo de fontes
  await prisma.csvSource.upsert({
    where: { name: 'PNL_Final_Combo' },
    update: { importDate: new Date() },
    create: {
      name:       'PNL_Final_Combo',
      filePath:   'prisma/PNL_Final_Combo.csv',
      importDate: new Date()
    }
  });
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() });

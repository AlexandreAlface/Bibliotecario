// prisma/csvSeed.js
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// Caminho do CSV (podes sobrepor com env CSV_PATH)
const CSV_PATH =
  process.env.CSV_PATH || path.resolve(process.cwd(), 'prisma', 'PNL_Final_Combo.csv');

// por omissão faz TRUNCATE; usa --no-truncate para preservar dados
const DO_TRUNCATE = !process.argv.includes('--no-truncate');

const norm = (v) => (v ?? '').toString().trim();
const normIsbn = (v) => norm(v).replace(/^ISBN:/i, '').trim();
const pickYear = (v) => {
  const m = norm(v).match(/\b(19|20)\d{2}\b/g);
  return m ? parseInt(m[m.length - 1], 10) : null; // último ano na string
};

async function truncateAll() {
  console.log('→ TRUNCATE "BookOrigin","Book","Origin" (CASCADE)…');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "BookOrigin","Book","Origin" RESTART IDENTITY CASCADE;`
  );
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV não encontrado em: ${CSV_PATH}`);
  }

  if (DO_TRUNCATE) await truncateAll();

  // origem CSV_PNL
  const origin = await prisma.origin.upsert({
    where: { description: 'CSV_PNL' },
    update: {},
    create: { description: 'CSV_PNL' },
  });

  // regista/atualiza fonte do CSV
  await prisma.csvSource.upsert({
    where: { name: 'PNL_Final_Combo' },
    update: { filePath: CSV_PATH, importDate: new Date() },
    create: { name: 'PNL_Final_Combo', filePath: CSV_PATH, importDate: new Date() },
  });

  const stream = fs
    .createReadStream(CSV_PATH)
    .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }));

  let count = 0;

  for await (const row of stream) {
    const isbn = normIsbn(row.ISBN || row.isbn);
    if (!isbn) continue;

    const data = {
      title:           norm(row['Título'] ?? row['title']),
      summary:         norm(row['Resumo'] ?? row['summary']) || null,
      author:          norm(row['Autor_Beja'] ?? row['author']),
      publicationYear: pickYear(row['Publicacao_Beja'] ?? row['publication'] ?? row['publicationYear']),
      collection:      norm(row['Colecao_Beja'] ?? row['collection']) || null,
      category:        norm(row['Assuntos_Beja'] ?? row['category']) || null,
      cdu:             norm(row['CDU_Beja'] ?? row['cdu']) || null,
      ageRange:        norm(row['Idade'] ?? row['ageRange']) || null, // ← vem do CSV ("2-5")
      coverUrl:        norm(row['Imagem_Lisboa'] ?? row['coverUrl']) || null,
    };

    // upsert do livro
    await prisma.book.upsert({
      where:  { isbn },
      update: data,
      create: { isbn, ...data },
    });

    // ligação à origem CSV_PNL (chave composta bookIsbn+originId)
    await prisma.bookOrigin.upsert({
      where: { bookIsbn_originId: { bookIsbn: isbn, originId: origin.id } },
      update: {},
      create: { bookIsbn: isbn, originId: origin.id },
    });

    count++;
    if (count % 200 === 0) console.log(`… ${count} livros processados`);
  }

  console.log(`✅ Importados ${count} livros a partir de ${path.basename(CSV_PATH)}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

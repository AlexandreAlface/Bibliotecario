// prisma/seed.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import bcrypt from 'bcryptjs'; // portável no Windows
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ----------------------------- helpers gerais ----------------------------- */
const hash = (pwd) => bcrypt.hash(String(pwd), 12);

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getFlagValue = (prefix) => {
  const item = args.find((a) => a.startsWith(prefix + '='));
  return item ? item.split('=').slice(1).join('=') : undefined;
};

const RUN_CSV = hasFlag('--csv') || process.env.RUN_CSV_SEED === '1';
const NO_TRUNCATE = hasFlag('--no-truncate');
const CSV_PATH =
  getFlagValue('--csv-path') ||
  process.env.CSV_PATH ||
  path.resolve(process.cwd(), 'prisma', 'PNL_Final_Combo.csv');

const norm = (v) => (v ?? '').toString().trim();
const normIsbn = (v) => norm(v).replace(/^ISBN:/i, '').trim();
const pickYear = (v) => {
  const m = norm(v).match(/\b(19|20)\d{2}\b/g);
  return m ? parseInt(m[m.length - 1], 10) : null;
};

/* ---------------------------- seeds: entidades ---------------------------- */
async function seedRoles() {
  await prisma.role.createMany({
    data: [
      { name: 'FAMÍLIA' },
      { name: 'BIBLIOTECÁRIO' },
      { name: 'CRIANÇA' },
      { name: 'ADMIN' },
    ],
    skipDuplicates: true,
  });
}

async function ensureUserWithRoleAndLibrary({ fullName, email, password, roleName, libraryId }) {
  const pwdHash = await hash(password);
  // user
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: pwdHash, fullName },
    create: {
      fullName,
      email,
      passwordHash: pwdHash,
    },
  });

  // role (N:N)
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) {
    const existsRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    if (!existsRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
  }
;
}

async function ensureChildForFamily({ name, birthDate, gender, readerProfile, familyId }) {
  const existing = await prisma.child.findFirst({ where: { name } });
  const child =
    existing ||
    (await prisma.child.create({
      data: { name, birthDate, gender, readerProfile },
    }));

  const cfKey = { childId_familyId: { childId: child.id, familyId } };
  const cfExists = await prisma.childFamily.findUnique({ where: cfKey });
  if (!cfExists) {
    await prisma.childFamily.create({ data: { childId: child.id, familyId } });
  }
  return child;
}

async function seedBadges() {
  const badges = [
    // Selos
    { name: 'Primeiro Livro',        type: 'STAMP',  criteria: 'Ler e avaliar o primeiro livro.' },
    { name: '5 Leituras',            type: 'STAMP',  criteria: 'Concluir cinco livros diferentes.' },
    { name: 'Crítico Literário',     type: 'STAMP',  criteria: 'Fazer cinco avaliações com comentário.' },
    { name: 'Curioso',               type: 'STAMP',  criteria: 'Clique em 10 microconteúdos “Sabia que...”.' },
    { name: 'Leitor Frequente',      type: 'STAMP',  criteria: 'Ler três livros em sete dias consecutivos.' },
    { name: 'Explorador de Géneros', type: 'STAMP',  criteria: 'Ler, pelo menos, um livro de quatro géneros literários diferentes.' },
    { name: 'Pontual',               type: 'STAMP',  criteria: 'Participar em três eventos culturais reservados pela agenda.' },
    { name: 'Ilustrador de Palavras',type: 'STAMP',  criteria: 'Comentar cinco livros com ilustrações destacadas.' },
    { name: 'Boa Noite, Livro',      type: 'STAMP',  criteria: 'Ler três livros marcados como “Histórias para Dormir”.' },
    { name: 'Descobridor de Curiosidades', type: 'STAMP', criteria: 'Explorar cinco conteúdos de boas práticas sugeridos pelo chatbot.' },

    // Troféus
    { name: 'Mini Bibliófilo',        type: 'TROFÉU', criteria: 'Ler 10 livros.' },
    { name: 'Família Leitora',        type: 'TROFÉU', criteria: 'Todos os elementos da família registados leram pelo menos um livro.' },
    { name: 'Aventureiro Literário',  type: 'TROFÉU', criteria: 'Ler livros de aventura, fantasia e mistério.' },
    { name: 'Clube da Lareira',       type: 'TROFÉU', criteria: 'Participação em três eventos culturais com marcação prévia.' },
    { name: 'Contador de Histórias',  type: 'TROFÉU', criteria: 'Ter três comentários aprovados pelo bibliotecário como “comentário em destaque”.' },
    { name: 'Explorador Global',      type: 'TROFÉU', criteria: 'Ler livros de cinco países diferentes.' },
    { name: 'Meta Atingida',          type: 'TROFÉU', criteria: 'Cumprir três metas de leitura (configuradas pelo bibliotecário ou pelo sistema).' },
    { name: 'Embaixador da Leitura',  type: 'TROFÉU', criteria: 'Partilhar a plataforma com três novas famílias (via link).' },
    { name: 'Guardião da Biblioteca', type: 'TROFÉU', criteria: 'Atingir o nível máximo e ter cinco troféus anteriores.' },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: { type: badge.type, criteria: badge.criteria },
      create: badge,
    });
  }
}

/* ----------------------------- seed: catálogo CSV ----------------------------- */
async function truncateCatalog() {
  console.log('→ TRUNCATE "BookOrigin","Book","Origin" (CASCADE)…');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "BookOrigin","Book","Origin" RESTART IDENTITY CASCADE;`
  );
}

async function seedCsvCatalog({ csvPath, truncate }) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV não encontrado em: ${csvPath}`);
  }

  if (truncate) await truncateCatalog();

  const origin = await prisma.origin.upsert({
    where: { description: 'CSV_PNL' },
    update: {},
    create: { description: 'CSV_PNL' },
  });

  await prisma.csvSource.upsert({
    where: { name: 'PNL_Final_Combo' },
    update: { filePath: csvPath, importDate: new Date() },
    create: { name: 'PNL_Final_Combo', filePath: csvPath, importDate: new Date() },
  });

  const stream = fs
    .createReadStream(csvPath)
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
      ageRange:        norm(row['Idade'] ?? row['ageRange']) || null,
      coverUrl:        norm(row['Imagem_Lisboa'] ?? row['coverUrl']) || null,
    };

    await prisma.book.upsert({
      where:  { isbn },
      update: data,
      create: { isbn, ...data },
    });

    await prisma.bookOrigin.upsert({
      where: { bookIsbn_originId: { bookIsbn: isbn, originId: origin.id } },
      update: {},
      create: { bookIsbn: isbn, originId: origin.id },
    });

    count++;
    if (count % 200 === 0) console.log(`… ${count} livros processados`);
  }

  console.log(`✅ Importados ${count} livros a partir de ${path.basename(csvPath)}`);
}

/* ----------------------------------- main ---------------------------------- */
async function main() {
  console.log('▶️ Seed inicial…');
  await seedRoles();
  const library = await ensureLibrary();

  // utilizadores
  const admin = await ensureUserWithRoleAndLibrary({
    fullName: 'Admin Sistema',
    email: 'admin@localhost',
    password: 'adminpass',
    roleName: 'ADMIN',
    libraryId: library.id,
  });

  const librarian = await ensureUserWithRoleAndLibrary({
    fullName: 'Maria Bibliotecária',
    email: 'bibliotecario@localhost',
    password: 'biblio123',
    roleName: 'BIBLIOTECÁRIO',
    libraryId: library.id,
  });

  const family = await ensureUserWithRoleAndLibrary({
    fullName: 'Ana e João Silva',
    email: 'familia@localhost',
    password: 'familia123',
    roleName: 'FAMÍLIA',
    libraryId: library.id,
  });

  // criança
  const child = await ensureChildForFamily({
    name: 'Pedro Silva',
    birthDate: new Date('2016-06-15'),
    gender: 'M',
    readerProfile: 'Iniciante',
    familyId: family.id,
  });

  // badges
  await seedBadges();

  // CSV (opcional)
  if (RUN_CSV) {
    console.log(`▶️ Import CSV: ${CSV_PATH} (${NO_TRUNCATE ? 'sem TRUNCATE' : 'com TRUNCATE'})`);
    await seedCsvCatalog({ csvPath: CSV_PATH, truncate: !NO_TRUNCATE });
  }

  console.log('✅ Seed concluído.');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

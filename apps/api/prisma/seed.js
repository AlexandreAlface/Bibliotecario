// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';  
const prisma = new PrismaClient();

async function main() {
  // 1) Perfis de utilizador
  await prisma.role.createMany({
    data: [
      { name: 'FAMÍLIA' },
      { name: 'BIBLIOTECÁRIO' },
      { name: 'CRIANÇA' },
      { name: 'ADMIN' },
    ],
    skipDuplicates: true,
  });

  // 2) Biblioteca de exemplo
  let library = await prisma.library.findFirst({
    where: { name: 'Biblioteca Municipal José Saramago' },
  });
  if (!library) {
    library = await prisma.library.create({
      data: {
        name: 'Biblioteca Municipal José Saramago',
        address: 'Rua de Luiz de Camões sn, 7800-508 Beja',
        contact: '284 311 901',
      },
    });
  }

  // 3) ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@localhost' },
    update: {},
    create: {
      fullName: 'Admin Sistema',
      email: 'admin@localhost',
      passwordHash: 'adminpass', // ⚠️ só demo — usa bcrypt em produção
      userRoles: { create: { role: { connect: { name: 'ADMIN' } } } },
    },
  });

  // 4) BIBLIOTECÁRIO
  const librarian = await prisma.user.upsert({
    where: { email: 'bibliotecario@localhost' },
    update: {},
    create: {
      fullName: 'Maria Bibliotecária',
      email: 'bibliotecario@localhost',
      passwordHash: 'biblio123', // ⚠️ só demo
      userRoles: { create: { role: { connect: { name: 'BIBLIOTECÁRIO' } } } },
      userLibraries: { create: { libraryId: library.id } },
    },
  });

  // 5) FAMÍLIA
  const family = await prisma.user.upsert({
    where: { email: 'familia@localhost' },
    update: {},
    create: {
      fullName: 'Ana e João Silva',
      email: 'familia@localhost',
      passwordHash: 'familia123', // ⚠️ só demo
      userRoles: { create: { role: { connect: { name: 'FAMÍLIA' } } } },
      userLibraries: { create: { libraryId: library.id } },
    },
  });

  // 6) CRIANÇA associada à família
  let child = await prisma.child.findFirst({ where: { name: 'Pedro Silva' } });
  if (!child) {
    child = await prisma.child.create({
      data: {
        name: 'Pedro Silva',
        birthDate: new Date('2016-06-15'),
        gender: 'M',
        readerProfile: 'Iniciante',
        families: { create: { familyId: family.id } },
      },
    });
  }

  // 7) CONSULTAS — 3 marcações futuras
  const now = new Date();
  const addHours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);

  // apaga consultas antigas de demo (opcional)
  // await prisma.consultation.deleteMany({ where: { familyId: family.id, librarianId: librarian.id } });

  await prisma.consultation.createMany({
    data: [
      {
        familyId: family.id,
        librarianId: librarian.id,
        scheduledAt: addHours(24), // +24h
        status: 'CONFIRMADO',
      },
      {
        familyId: family.id,
        librarianId: librarian.id,
        scheduledAt: addHours(48), // +48h
        status: 'PENDENTE',
      },
      {
        familyId: family.id,
        librarianId: librarian.id,
        scheduledAt: addHours(72), // +72h
        status: 'PENDENTE',
      },
    ],
  });

  console.log('✅ Seed concluído: roles, biblioteca, users, criança e consultas criadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

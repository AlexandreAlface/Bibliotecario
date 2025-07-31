// prisma/seed.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()

async function main() {
  // 1. Perfis de utilizador
  await prisma.role.createMany({
    data: [
      { name: 'FAMÍLIA' },
      { name: 'BIBLIOTECÁRIO' },
      { name: 'CRIANÇA' },
      { name: 'ADMIN' },
    ],
    skipDuplicates: true, // não falha se já existirem
  })

  // 2. Biblioteca de exemplo
  let library = await prisma.library.findFirst({
    where: { name: 'Biblioteca Municipal José Saramago' } // procura pelo nome
  })
  if (!library) {
    library = await prisma.library.create({
      data: {
        name:    'Biblioteca Municipal José Saramago',       // nome da biblioteca
        address: 'Rua de Luiz de Camões sn, 7800-508 Beja',   // morada
        contact: '284 311 901',                              // contacto
      }
    })
  }

  // 3. ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@localhost' },     // e-mail é único
    update: {},
    create: {
      fullName:     'Admin Sistema',          // nome completo
      email:        'admin@localhost',
      passwordHash: 'adminpass',              // ex.: hash simples (substituir em produção)
      userRoles: {
        create: { role: { connect: { name: 'ADMIN' } } }
      }
    }
  })

  // 4. BIBLIOTECÁRIO
  await prisma.user.upsert({
    where: { email: 'bibliotecario@localhost' },
    update: {},
    create: {
      fullName:     'Maria Bibliotecária',
      email:        'bibliotecario@localhost',
      passwordHash: 'biblio123',
      userRoles: {
        create: { role: { connect: { name: 'BIBLIOTECÁRIO' } } }
      },
      userLibraries: {
        create: { libraryId: library.id }   // associa à biblioteca
      }
    }
  })

  // 5. FAMÍLIA
  const family = await prisma.user.upsert({
    where: { email: 'familia@localhost' },
    update: {},
    create: {
      fullName:     'Ana e João Silva',
      email:        'familia@localhost',
      passwordHash: 'familia123',
      userRoles: {
        create: { role: { connect: { name: 'FAMÍLIA' } } }
      },
      userLibraries: {
        create: { libraryId: library.id }
      }
    }
  })

  // 6. CRIANÇA associada à família
  let child = await prisma.child.findFirst({
    where: { name: 'Pedro Silva' }
  })
  if (!child) {
    child = await prisma.child.create({
      data: {
        name:          'Pedro Silva',               // nome da criança
        birthDate:     new Date('2016-06-15'),      // data de nascimento
        gender:        'M',                         // género (“M”/“F”)
        readerProfile: 'Iniciante',                 // perfil_leitor
        families: {
          create: { familyId: family.id }          // associa à família
        }
      }
    })
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

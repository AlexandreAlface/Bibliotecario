// apps/api/prisma/seeds/seed-consultations.ts
import {
  PrismaClient,
  ConsultationStatus,
  ProposalActor,
  ProposalStatus,
  SlotStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function ensureUserWithRole(
  fullName: string,
  email: string,
  roleName: string
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      fullName,
      email,
      passwordHash: "seed", // placeholder
    },
  });

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`Role "${roleName}" não existe.`);

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

function at(date: Date, h: number, m = 0) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function ensureSlot(
  librarianId: number,
  startAt: Date,
  endAt: Date,
  status: SlotStatus = SlotStatus.OPEN
) {
  // usa o @@unique([librarianId, startAt, endAt])
  return prisma.consultationSlot.upsert({
    where: {
      librarianId_startAt_endAt: { librarianId, startAt, endAt },
    },
    update: { status },
    create: { librarianId, startAt, endAt, status },
  });
}

async function main() {
  //—— família “default” (usa a tua existente, senão cria)
  const family = await prisma.user.upsert({
    where: { email: "familia@localhost.com" },
    update: {},
    create: {
      fullName: "Família Ana e João Silva",
      email: "familia@localhost.com",
      passwordHash: "seed",
    },
  });
  const familyRole = await prisma.role.findUnique({
    where: { name: "FAMÍLIA" },
  });
  if (familyRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: family.id, roleId: familyRole.id } },
      update: {},
      create: { userId: family.id, roleId: familyRole.id },
    });
  }

  //—— bibliotecários
  const bib1 = await ensureUserWithRole(
    "João Bibliotecário",
    "joao.biblio@localhost.com",
    "BIBLIOTECÁRIO"
  );
  const bib2 = await ensureUserWithRole(
    "Carla Bibliotecária",
    "carla.biblio@localhost.com",
    "BIBLIOTECÁRIO"
  );
  const bib3 = await ensureUserWithRole(
    "Rita Bibliotecária",
    "rita.biblio@localhost.com",
    "BIBLIOTECÁRIO"
  );

  //—— slots (amanhã) para cada bibliotecário: 10:00, 10:30, 11:00
  const base = new Date();
  const tomorrow = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + 1
  );

  const slotsByBib: Record<
    number,
    { id: number; startAt: Date; endAt: Date }[]
  > = {};

  for (const bib of [bib1, bib2, bib3]) {
    const s1 = await ensureSlot(
      bib.id,
      at(tomorrow, 10, 0),
      at(tomorrow, 10, 30)
    );
    const s2 = await ensureSlot(
      bib.id,
      at(tomorrow, 10, 30),
      at(tomorrow, 11, 0)
    );
    const s3 = await ensureSlot(
      bib.id,
      at(tomorrow, 11, 0),
      at(tomorrow, 11, 30)
    );
    slotsByBib[bib.id] = [s1, s2, s3];
  }

  //—— 1) pedido pendente (sem horário) → João
  await prisma.consultation.create({
    data: {
      family: { connect: { id: family.id } },
      librarian: { connect: { id: bib1.id } },
      status: ConsultationStatus.PENDING,
      notes: "Primeiro contacto — avaliação inicial.",
      events: { create: [{ type: "REQUESTED" }] },
    },
  });

  //—— 2) confirmada com slot (Carla) — usa o primeiro slot de Carla
  {
    const slot = slotsByBib[bib2.id][0];

    const confirmed = await prisma.consultation.create({
      data: {
        family: { connect: { id: family.id } },
        librarian: { connect: { id: bib2.id } },
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: ConsultationStatus.CONFIRMED,
        slot: { connect: { id: slot.id } }, // 1–1 pelo lado da Consultation
        notes: "Consulta confirmada.",
        events: { create: [{ type: "CONFIRMED" }] },
      },
    });

    await prisma.consultationSlot.update({
      where: { id: slot.id },
      data: {
        status: SlotStatus.BOOKED,
        consultation: { connect: { id: confirmed.id } },
      },
    });
  }

  //—— 3) consulta recusada (Rita)
  await prisma.consultation.create({
    data: {
      family: { connect: { id: family.id } },
      librarian: { connect: { id: bib3.id } },
      status: ConsultationStatus.DECLINED,
      notes: "Sem disponibilidade esta semana.",
      events: { create: [{ type: "DECLINED" }] },
    },
  });

  //—— 4) consulta com proposta de remarcação pendente (João)
  {
    const slotOrig = slotsByBib[bib1.id][1];

    const c = await prisma.consultation.create({
      data: {
        family: { connect: { id: family.id } },
        librarian: { connect: { id: bib1.id } },
        startAt: slotOrig.startAt,
        endAt: slotOrig.endAt,
        status: ConsultationStatus.PENDING,
        slot: { connect: { id: slotOrig.id } },
        notes: "Horário original; proposta a caminho.",
        events: { create: [{ type: "SCHEDULED" }] },
      },
    });

    const toStart = new Date(slotOrig.startAt);
    toStart.setDate(toStart.getDate() + 1);
    const toEnd = new Date(slotOrig.endAt);
    toEnd.setDate(toEnd.getDate() + 1);

    await prisma.consultationProposal.create({
      data: {
        consultation: { connect: { id: c.id } },
        proposedBy: ProposalActor.LIBRARIAN,
        fromStartAt: slotOrig.startAt,
        fromEndAt: slotOrig.endAt,
        toStartAt: toStart,
        toEndAt: toEnd,
        message: "Posso no dia seguinte, mesmo horário.",
        status: ProposalStatus.PENDING,
      },
    });
  }

  console.log("✅ Seed de consultas concluído.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

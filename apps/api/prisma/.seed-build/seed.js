"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const ROUNDS = 12;
/* ----------------------- helpers ----------------------- */
async function hash(p) {
    return bcryptjs_1.default.hash(p, ROUNDS);
}
function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}
function at(d, hour, minute = 0) {
    const x = new Date(d);
    x.setHours(hour, minute, 0, 0);
    return x;
}
/* ----------------------- seeders ----------------------- */
async function seedRoles() {
    await prisma.role.createMany({
        data: [
            { name: "FAMÍLIA" },
            { name: "BIBLIOTECÁRIO" },
            { name: "CRIANÇA" },
            { name: "ADMIN" },
        ],
        skipDuplicates: true,
    });
}
async function seedLibraryAndFeed() {
    // Biblioteca Municipal de Beja
    const lib = await prisma.library.upsert({
        where: { id: 1 }, // força id=1 para ficares com isto estável em dev
        create: {
            id: 1,
            name: "Biblioteca Municipal de Beja",
            address: "Largo do Lidador, Beja",
            contact: "biblioteca@cm-beja.pt",
        },
        update: {},
    });
    // Feed RSS (agenda) — sem criar eventos; o teu cron vai buscar
    await prisma.feedRss.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            libraryId: lib.id,
            url: "https://cm-beja.pt/feeds/agenda",
        },
        update: { url: "https://cm-beja.pt/feeds/agenda", libraryId: lib.id },
    });
    return lib;
}
async function getRoleIdByName(name) {
    const r = await prisma.role.findUnique({ where: { name } });
    if (!r)
        throw new Error(`Role "${name}" não encontrada`);
    return r.id;
}
async function upsertUserWithRoles(payload) {
    const pwd = await hash(payload.password);
    const user = await prisma.user.upsert({
        where: { email: payload.email },
        create: {
            email: payload.email,
            fullName: payload.fullName,
            passwordHash: pwd,
            phone: payload.phone,
        },
        update: {
            fullName: payload.fullName,
            phone: payload.phone,
            // se mudares password em dev, também atualiza
            passwordHash: pwd,
        },
    });
    // ligar roles
    const roleIds = await Promise.all(payload.roles.map(getRoleIdByName));
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        skipDuplicates: true,
    });
    return user;
}
async function seedUsersAndFamilies(libraryId) {
    // Admin
    const admin = await upsertUserWithRoles({
        email: "admin@bibliotecario.com",
        fullName: "Admin Bibliotecário",
        password: "admin123",
        roles: ["ADMIN"],
    });
    // Bibliotecário
    const librarian = await upsertUserWithRoles({
        email: "rita.bibliotecaria@beja.com",
        fullName: "Rita Bibliotecária",
        password: "rita123",
        roles: ["BIBLIOTECÁRIO"],
    });
    await prisma.userLibrary.upsert({
        where: { userId_libraryId: { userId: librarian.id, libraryId } },
        create: { userId: librarian.id, libraryId },
        update: {},
    });
    // Família #1
    const family1 = await upsertUserWithRoles({
        email: "joao.silva@familia.com",
        fullName: "João Silva",
        password: "joao123",
        roles: ["FAMÍLIA"],
    });
    // Filhos da família #1
    const ines = await prisma.child.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            name: "Inês Silva",
            birthDate: new Date("2016-05-12"),
            gender: "F",
            readerProfile: "Gosta de fantasia e mistério",
        },
        update: {},
    });
    const tiago = await prisma.child.upsert({
        where: { id: 2 },
        create: {
            id: 2,
            name: "Tiago Silva",
            birthDate: new Date("2012-11-03"),
            gender: "M",
            readerProfile: "Adora aventura e BD",
        },
        update: {},
    });
    await prisma.childFamily.upsert({
        where: { childId_familyId: { childId: ines.id, familyId: family1.id } },
        create: { childId: ines.id, familyId: family1.id },
        update: {},
    });
    await prisma.childFamily.upsert({
        where: { childId_familyId: { childId: tiago.id, familyId: family1.id } },
        create: { childId: tiago.id, familyId: family1.id },
        update: {},
    });
    // Família #2 (para ter variedade)
    const family2 = await upsertUserWithRoles({
        email: "maria.costa@familia.com",
        fullName: "Maria Costa",
        password: "maria123",
        roles: ["FAMÍLIA"],
    });
    const ana = await prisma.child.upsert({
        where: { id: 3 },
        create: {
            id: 3,
            name: "Ana Costa",
            birthDate: new Date("2018-03-20"),
            gender: "F",
            readerProfile: "Histórias curtas e ilustradas",
        },
        update: {},
    });
    await prisma.childFamily.upsert({
        where: { childId_familyId: { childId: ana.id, familyId: family2.id } },
        create: { childId: ana.id, familyId: family2.id },
        update: {},
    });
    // Newsletter (família #1)
    await prisma.newsletterSubscription.createMany({
        data: [{ familyId: family1.id, frequency: "weekly", status: "active" }],
        skipDuplicates: true,
    });
    return { admin, librarian, family1, family2, ines, tiago, ana };
}
async function seedBadges() {
    const badges = [
        {
            name: "Primeiro Livro",
            type: "STAMP",
            criteria: "Ler e avaliar o primeiro livro.",
        },
        {
            name: "5 Leituras",
            type: "STAMP",
            criteria: "Concluir cinco livros diferentes.",
        },
        {
            name: "Crítico Literário",
            type: "STAMP",
            criteria: "Fazer cinco avaliações com comentário.",
        },
        {
            name: "Curioso",
            type: "STAMP",
            criteria: "Clique em 10 microconteúdos “Sabia que...”.",
        },
        {
            name: "Leitor Frequente",
            type: "STAMP",
            criteria: "Ler três livros em sete dias consecutivos.",
        },
        {
            name: "Explorador de Géneros",
            type: "STAMP",
            criteria: "Ler, pelo menos, um livro de quatro géneros literários diferentes.",
        },
        {
            name: "Pontual",
            type: "STAMP",
            criteria: "Participar em três eventos culturais reservados pela agenda.",
        },
        {
            name: "Ilustrador de Palavras",
            type: "STAMP",
            criteria: "Comentar cinco livros com ilustrações destacadas.",
        },
        {
            name: "Boa Noite, Livro",
            type: "STAMP",
            criteria: "Ler três livros marcados como “Histórias para Dormir”.",
        },
        {
            name: "Descobridor de Curiosidades",
            type: "STAMP",
            criteria: "Explorar cinco conteúdos de boas práticas sugeridos pelo chatbot.",
        },
        { name: "Mini Bibliófilo", type: "TROFÉU", criteria: "Ler 10 livros." },
        {
            name: "Família Leitora",
            type: "TROFÉU",
            criteria: "Todos os elementos da família registados leram pelo menos um livro.",
        },
        {
            name: "Aventureiro Literário",
            type: "TROFÉU",
            criteria: "Ler livros de aventura, fantasia e mistério.",
        },
        {
            name: "Clube da Lareira",
            type: "TROFÉU",
            criteria: "Participação em três eventos culturais com marcação prévia.",
        },
        {
            name: "Contador de Histórias",
            type: "TROFÉU",
            criteria: "Três comentários aprovados como “destaque”.",
        },
        {
            name: "Explorador Global",
            type: "TROFÉU",
            criteria: "Ler livros de cinco países diferentes.",
        },
        {
            name: "Meta Atingida",
            type: "TROFÉU",
            criteria: "Cumprir três metas de leitura.",
        },
        {
            name: "Embaixador da Leitura",
            type: "TROFÉU",
            criteria: "Partilhar a plataforma com três novas famílias.",
        },
        {
            name: "Guardião da Biblioteca",
            type: "TROFÉU",
            criteria: "Atingir o nível máximo com cinco troféus.",
        },
    ];
    await prisma.badge.createMany({ data: badges, skipDuplicates: true });
}
async function seedMicroContents(libraryId, authorId) {
    const base = [
        {
            type: client_1.MicroContentType.BIBLIOTERAPIA,
            text: "Ler 10 minutos antes de dormir ajuda a acalmar e a melhorar o sono das crianças.",
            tags: ["rotina", "sono", "bem-estar"],
        },
        {
            type: client_1.MicroContentType.DICA,
            text: "Transforma a ida à biblioteca num passeio semanal. Deixa a criança escolher o livro!",
            tags: ["família", "biblioteca", "hábito"],
        },
        {
            type: client_1.MicroContentType.FACTO,
            text: "Sabias que ler em voz alta melhora a atenção e o vocabulário em qualquer idade?",
            tags: ["curiosidade", "voz-alta", "vocabulário"],
        },
        {
            type: client_1.MicroContentType.OUTRO,
            text: "Cria um cantinho de leitura em casa, com luz suave e almofadas.",
            tags: ["ambiente", "casa"],
        },
    ];
    for (const mc of base) {
        await prisma.microContent.create({
            data: {
                type: mc.type,
                text: mc.text,
                tags: mc.tags,
                isPublished: true,
                libraryId,
                authorId,
                // books: []  // (vais associar depois de importares livros)
            },
        });
    }
}
async function seedAgenda(librarianId, familyId, childId, libraryId) {
    // 5 slots abertos nas próximas 2 semanas
    const d1 = daysFromNow(2);
    const slots = [
        { startAt: at(d1, 10, 0), endAt: at(d1, 10, 30) },
        { startAt: at(d1, 11, 0), endAt: at(d1, 11, 30) },
        { startAt: at(daysFromNow(4), 15, 0), endAt: at(daysFromNow(4), 15, 30) },
        { startAt: at(daysFromNow(7), 9, 30), endAt: at(daysFromNow(7), 10, 0) },
        { startAt: at(daysFromNow(10), 14, 0), endAt: at(daysFromNow(10), 14, 30) },
    ];
    const created = [];
    for (const s of slots) {
        try {
            const slot = await prisma.consultationSlot.create({
                data: {
                    librarianId,
                    libraryId,
                    startAt: s.startAt,
                    endAt: s.endAt,
                    status: client_1.SlotStatus.OPEN,
                },
            });
            created.push(slot.id);
        }
        catch {
            // se já existir, ignora
        }
    }
    // marca uma consulta confirmada no primeiro slot
    const firstSlot = await prisma.consultationSlot.findFirst({
        where: { librarianId, status: client_1.SlotStatus.OPEN },
        orderBy: { startAt: "asc" },
    });
    if (!firstSlot)
        return;
    const consultation = await prisma.consultation.create({
        data: {
            family: { connect: { id: familyId } },
            librarian: { connect: { id: librarianId } },
            child: { connect: { id: childId } },
            library: { connect: { id: libraryId } },
            startAt: firstSlot.startAt,
            endAt: firstSlot.endAt,
            status: client_1.ConsultationStatus.CONFIRMED,
            slot: { connect: { id: firstSlot.id } },
            mode: "PRESENCIAL",
            location: "Biblioteca Municipal de Beja",
        },
    });
    await prisma.consultationSlot.update({
        where: { id: firstSlot.id },
        data: { status: client_1.SlotStatus.BOOKED },
    });
    // e uma proposta pendente para outra data
    const otherSlot = await prisma.consultationSlot.findFirst({
        where: { librarianId, status: client_1.SlotStatus.OPEN, id: { not: firstSlot.id } },
        orderBy: { startAt: "asc" },
    });
    if (otherSlot) {
        await prisma.consultationProposal.create({
            data: {
                consultationId: consultation.id,
                proposedBy: client_1.ProposalActor.LIBRARIAN,
                toStartAt: otherSlot.startAt,
                toEndAt: otherSlot.endAt,
                status: client_1.ProposalStatus.PENDING,
            },
        });
    }
}
/* ----------------------- main ----------------------- */
async function main() {
    console.log("→ Seeding…");
    await seedRoles();
    const lib = await seedLibraryAndFeed();
    const { admin, librarian, family1, family2, ines, tiago, ana } = await seedUsersAndFamilies(lib.id);
    await seedBadges();
    await seedMicroContents(lib.id, librarian.id);
    await seedAgenda(librarian.id, family1.id, ines.id, lib.id);
    // pontos e afins (opcional, só um registo simbólico)
    await prisma.pointsHistory.createMany({
        data: [
            { userId: family1.id, action: "signup_bonus", points: 50 },
            { userId: librarian.id, action: "agenda_setup", points: 20 },
        ],
        skipDuplicates: true,
    });
    console.log("✓ Seed concluído.");
    console.log("Credenciais DEV:");
    console.log("  Admin       → admin@bibliotecario.com / admin123");
    console.log("  Bibliotecário → rita.bibliotecaria@beja.com / rita123");
    console.log("  Família #1  → joao.silva@familia.com / joao123");
    console.log("  Família #2  → maria.costa@familia.com / maria123");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

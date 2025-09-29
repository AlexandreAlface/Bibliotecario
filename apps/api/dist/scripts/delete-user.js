"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/scripts/delete-user.ts
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Usa: tsx delete-user.ts <userId>  (ou)  tsx delete-user.ts --email=familia@localhost
    const idArg = process.argv.find((a) => /^\d+$/.test(a));
    const emailArg = process.argv.find((a) => a.startsWith('--email='));
    let userId = idArg ? Number(idArg) : null;
    if (!userId && emailArg) {
        const email = emailArg.split('=')[1];
        const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (!u)
            throw new Error(`User com email ${email} não encontrado`);
        userId = u.id;
    }
    if (!userId) {
        console.error('Uso:');
        console.error('  npx tsx -r dotenv/config apps/api/src/scripts/delete-user.ts <userId>');
        console.error('  npx tsx -r dotenv/config apps/api/src/scripts/delete-user.ts --email=familia@localhost');
        process.exit(1);
    }
    await prisma.$transaction(async (tx) => {
        // Consultas em que o user participa (família ou bibliotecário)
        const cons = await tx.consultation.findMany({
            where: { OR: [{ familyId: userId }, { librarianId: userId }] },
            select: { id: true },
        });
        const cids = cons.map((c) => c.id);
        // Apagar dependências em ordem segura
        if (cids.length) {
            await tx.consultationEvent.deleteMany({ where: { consultationId: { in: cids } } });
            await tx.consultationProposal.deleteMany({ where: { consultationId: { in: cids } } });
        }
        await tx.eventReservation.deleteMany({ where: { familyId: userId } });
        await tx.newsletterSubscription.deleteMany({ where: { familyId: userId } });
        await tx.microInteraction.deleteMany({ where: { userId: userId } });
        await tx.pointsHistory.deleteMany({ where: { userId: userId } });
        await tx.rating.deleteMany({ where: { userId: userId } });
        await tx.userLibrary.deleteMany({ where: { userId: userId } });
        await tx.userRole.deleteMany({ where: { userId: userId } });
        // Ligações família–criança
        await tx.childFamily.deleteMany({ where: { familyId: userId } });
        // Consultations (depois de events/proposals)
        await tx.consultation.deleteMany({
            where: { OR: [{ familyId: userId }, { librarianId: userId }] },
        });
        // Slots criados por este bibliotecário (não têm FK para Consultation, é o inverso)
        await tx.consultationSlot.deleteMany({ where: { librarianId: userId } });
        // Finalmente, o utilizador
        await tx.user.delete({ where: { id: userId } });
    });
    console.log('✅ User apagado com sucesso:', userId);
}
main()
    .catch((e) => {
    console.error('❌ Falhou a remoção:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

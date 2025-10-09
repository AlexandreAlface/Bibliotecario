"use strict";
// apps/api/src/scripts/delete-users.mjs
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
// carrega apps/api/.env
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });
const prisma = new PrismaClient();
const ids = process.argv.slice(2).map(n => parseInt(n, 10)).filter(Boolean);
if (!ids.length) {
    console.error('Uso: node src/scripts/delete-users.mjs 5 6 7');
    process.exit(1);
}
async function hardDeleteUser(userId) {
    console.log(`\n→ A apagar user ${userId}...`);
    // apanhar crianças desta família para limpar reservas/leitura, etc.
    const childLinks = await prisma.childFamily.findMany({
        where: { familyId: userId },
        select: { childId: true },
    });
    const childIds = childLinks.map(c => c.childId);
    await prisma.$transaction([
        // ligações diretas do utilizador
        prisma.userRole.deleteMany({ where: { userId } }),
        prisma.userLibrary.deleteMany({ where: { userId } }),
        prisma.childFamily.deleteMany({ where: { familyId: userId } }),
        // conteúdo do utilizador
        prisma.rating.deleteMany({ where: { userId } }),
        prisma.pointsHistory.deleteMany({ where: { userId } }),
        prisma.eventReservation.deleteMany({ where: { familyId: userId } }),
        prisma.newsletterSubscription.deleteMany({ where: { familyId: userId } }),
        prisma.microInteraction.deleteMany({ where: { userId } }),
        // consultas onde é família ou bibliotecário
        prisma.consultation.deleteMany({
            where: { OR: [{ familyId: userId }, { librarianId: userId }] },
        }),
        // reservas de livros das crianças desta família
        ...(childIds.length
            ? [prisma.bookReservation.deleteMany({ where: { childId: { in: childIds } } })]
            : []),
        // finalmente, o próprio utilizador
        prisma.user.delete({ where: { id: userId } }),
    ]);
    console.log(`✔ User ${userId} apagado`);
}
async function cleanupOrphanChildren() {
    // crianças sem qualquer família
    const orphans = await prisma.child.findMany({
        where: { families: { none: {} } },
        select: { id: true },
    });
    if (!orphans.length)
        return;
    const orphanIds = orphans.map(c => c.id);
    await prisma.$transaction([
        prisma.badgeAssignment.deleteMany({ where: { childId: { in: orphanIds } } }),
        prisma.reading.deleteMany({ where: { childId: { in: orphanIds } } }),
        prisma.bookReservation.deleteMany({ where: { childId: { in: orphanIds } } }),
        prisma.child.deleteMany({ where: { id: { in: orphanIds } } }),
    ]);
    console.log(`✔ Limpeza: ${orphanIds.length} criança(s) órfã(s) removida(s)`);
}
async function main() {
    for (const id of ids)
        await hardDeleteUser(id);
    await cleanupOrphanChildren();
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

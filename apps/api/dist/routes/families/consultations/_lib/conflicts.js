"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLibrarianConflict = findLibrarianConflict;
// src/routes/consultations/_lib/conflicts.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** devolve uma consulta confirmada que sobreponha [startAt, endAt) para o bibliotecário */
async function findLibrarianConflict(opts) {
    const { librarianId, startAt, endAt, excludeConsultationId } = opts;
    return prisma.consultation.findFirst({
        where: {
            librarianId,
            status: client_1.ConsultationStatus.CONFIRMED,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            ...(excludeConsultationId ? { id: { not: excludeConsultationId } } : {}),
        },
        select: { id: true, startAt: true, endAt: true, familyId: true },
    });
}

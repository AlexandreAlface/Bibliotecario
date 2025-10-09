// src/routes/consultations/_lib/conflicts.ts
import { PrismaClient, ConsultationStatus } from "@prisma/client";
const prisma = new PrismaClient();

/** devolve uma consulta confirmada que sobreponha [startAt, endAt) para o bibliotecário */
export async function findLibrarianConflict(opts: {
  librarianId: number;
  startAt: Date;
  endAt: Date;
  excludeConsultationId?: number;
}) {
  const { librarianId, startAt, endAt, excludeConsultationId } = opts;

  return prisma.consultation.findFirst({
    where: {
      librarianId,
      status: ConsultationStatus.CONFIRMED,
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
      ...(excludeConsultationId ? { id: { not: excludeConsultationId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true, familyId: true },
  });
}

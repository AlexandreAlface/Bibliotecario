// apps/api/src/routes/_helpers.ts
// Autor: Alexandre Brissos 21131
// O que faz: devolve o childId a usar. Se vier explícito, usa-o;
// caso contrário, procura o primeiro filho associado à familyId.
// Retorna null se não houver dados suficientes.

import type { PrismaClient } from "@prisma/client";

type ResolveChildIdArgs = {
  prisma: PrismaClient;
  childId?: number | string | null;
  familyId?: number | string | null;
};

export async function resolveChildId({
  prisma,
  childId,
  familyId,
}: ResolveChildIdArgs): Promise<number | null> {
  const cId = childId != null ? Number(childId) : NaN;
  if (Number.isFinite(cId)) return cId;

  const fId = familyId != null ? Number(familyId) : NaN;
  if (!Number.isFinite(fId)) return null;

  const cf = await prisma.childFamily.findFirst({
    where: { familyId: fId },
    select: { childId: true },
    orderBy: { childId: "asc" },
  });

  return cf?.childId ?? null;
}

// apps/api/src/routes/_helpers.js
export async function resolveChildId({ prisma, childId, familyId }) {
  if (Number.isFinite(childId)) return Number(childId);
  if (Number.isFinite(familyId)) {
    // escolhe a 1ª criança da família (ou ajusta a tua regra)
    const cf = await prisma.childFamily.findFirst({
      where: { familyId: Number(familyId) },
      select: { childId: true },
      orderBy: { childId: "asc" },
    });
    return cf?.childId ?? null;
  }
  return null;
}

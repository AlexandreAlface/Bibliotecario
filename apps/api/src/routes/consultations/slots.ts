import { Router } from 'express'
import { $Enums, PrismaClient, SlotStatus } from '@prisma/client'
import { requireRole, ROLES } from '../../middlewares/auth'
const prisma = new PrismaClient()
const r = Router()

// GET /api/v1/librarians/:librarianId/slots?from=...&to=...
r.get('/librarians/:librarianId/slots', async (req, res) => {
  const librarianId = Number(req.params.librarianId)
  const from = new Date(String(req.query.from))
  const to = new Date(String(req.query.to))
  const slots = await prisma.consultationSlot.findMany({
    where: { librarianId, startAt: { gte: from }, endAt: { lte: to } },
    orderBy: { startAt: 'asc' },
  })
  res.json(slots)
})

// POST /api/v1/librarians/:librarianId/slots/bulk
r.post('/librarians/:librarianId/slots/bulk', requireRole(ROLES.LIBRARIAN, ROLES.ADMIN), async (req:any, res) => {
  const librarianId = Number(req.params.librarianId)
  // opcional: garantir que req.user.id === librarianId
  const items = (req.body?.slots ?? []).map((s:any) => ({
    librarianId,
    startAt: new Date(s.startAt),
    endAt: new Date(s.endAt),
    libraryId: s.libraryId ?? null,
    status: s.status ?? SlotStatus.OPEN,
  }))
  const created = await prisma.consultationSlot.createMany({ data: items, skipDuplicates: true })
  res.json({ created: created.count })
})

// PATCH /api/v1/slots/:id  body: { status: 'OPEN' | 'BLOCKED' }
r.patch('/slots/:id', requireRole(ROLES.LIBRARIAN, ROLES.ADMIN), async (req, res) => {
  const id = Number(req.params.id)
  const status = req.body?.status as SlotStatus
  if (!['OPEN','BLOCKED'].includes(status)) return res.status(400).json({ error: 'invalid status' })
  const slot = await prisma.consultationSlot.update({ where: { id }, data: { status } })
  res.json(slot)
})

/** GET /api/consultations/slots?from&to&libraryId&librarianId
 *  devolve slots OPEN no intervalo indicado
 */
r.get("/", async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to   = req.query.to   ? new Date(String(req.query.to))   : undefined;
    if (!from || !to) return res.status(400).json({ error: "from e to são obrigatórios" });

    const libraryId   = req.query.libraryId ? Number(req.query.libraryId) : undefined;
    const librarianId = req.query.librarianId ? Number(req.query.librarianId) : undefined;

    const where: any = {
      status: $Enums.SlotStatus.OPEN,
      startAt: { gte: from },
      endAt:   { lte: to },
    };
    if (Number.isFinite(libraryId)) where.libraryId = libraryId;
    if (Number.isFinite(librarianId)) where.librarianId = librarianId;

    const items = await prisma.consultationSlot.findMany({
      where,
      orderBy: { startAt: "asc" },
      include: {
        librarian: { select: { id: true, fullName: true } },
        library:   { select: { id: true, name: true } },
      },
    });

    res.json(
      items.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        librarianId: s.librarianId,
        librarianName: s.librarian?.fullName,
        librarianAvatarUrl: (s as any).librarian?.avatarUrl ?? null,
        libraryId: s.libraryId ?? undefined,
        libraryName: s.library?.name ?? undefined,
      }))
    );
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ error: e?.message ?? "failed to list slots" });
  }
});


export default r

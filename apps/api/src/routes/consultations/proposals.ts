import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const r = Router()

// POST /api/v1/consultations/:id/proposals
r.post('/consultations/:id/proposals', async (req, res) => {
  const id = Number(req.params.id)
  const { proposedBy, toStartAt, toEndAt, message } = req.body

  const c = await prisma.consultation.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'not found' })

  const p = await prisma.consultationProposal.create({
    data: {
      consultationId: id,
      proposedBy,
      fromStartAt: c.startAt,
      fromEndAt: c.endAt,
      toStartAt: new Date(toStartAt),
      toEndAt: new Date(toEndAt),
      message,
      status: 'PENDING',
    },
  })
  await prisma.consultationEvent.create({
    data: { consultationId: id, type: 'RESCHEDULE_PROPOSED' },
  })
  res.json(p)
})

// POST /api/v1/proposals/:proposalId/accept
r.post('/proposals/:proposalId/accept', async (req, res) => {
  const proposalId = Number(req.params.proposalId)
  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.consultationProposal.findUnique({ where: { id: proposalId } })
    if (!p || p.status !== 'PENDING') throw new Error('invalid proposal')
    const c = await tx.consultation.findUnique({ where: { id: p.consultationId } })
    if (!c) throw new Error('consultation missing')

    if (c.slotId) await tx.consultationSlot.update({ where: { id: c.slotId }, data: { status: 'OPEN' } })

    const newSlot = await tx.consultationSlot.findFirst({
      where: { librarianId: c.librarianId, startAt: p.toStartAt, endAt: p.toEndAt, status: 'OPEN' },
    })

    const data: any = { startAt: p.toStartAt, endAt: p.toEndAt }
    if (newSlot) {
      data.slot = { connect: { id: newSlot.id } }
      await tx.consultationSlot.update({ where: { id: newSlot.id }, data: { status: 'BOOKED' } })
    } else {
      data.slot = { disconnect: true }
    }

    const updated = await tx.consultation.update({ where: { id: c.id }, data })
    await tx.consultationProposal.update({ where: { id: proposalId }, data: { status: 'ACCEPTED', decidedAt: new Date() } })
    await tx.consultationEvent.create({ data: { consultationId: c.id, type: 'RESCHEDULE_ACCEPTED' } })
    return updated
  })
  res.json(result)
})

// POST /api/v1/proposals/:proposalId/decline
r.post('/proposals/:proposalId/decline', async (req, res) => {
  const proposalId = Number(req.params.proposalId)
  const p = await prisma.consultationProposal.update({
    where: { id: proposalId },
    data: { status: 'DECLINED', decidedAt: new Date() },
  })
  res.json(p)
})

export default r

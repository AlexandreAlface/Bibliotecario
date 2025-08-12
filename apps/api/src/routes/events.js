import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/events', async (_, res) => {
  const events = await prisma.culturalEvent.findMany({
    orderBy: { startDate: 'asc' }
  });
  res.json(events);
});

export default router;

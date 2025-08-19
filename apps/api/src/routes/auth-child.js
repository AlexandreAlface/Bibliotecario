import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from './auth.js';

const router = Router();
const ACTING_COOKIE = process.env.ACTING_COOKIE || 'bf_acting';
const isProd = process.env.NODE_ENV === 'production';

function setActingCookie(res, childId) {
  res.cookie(ACTING_COOKIE, String(childId), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}
function clearActingCookie(res) {
  res.clearCookie(ACTING_COOKIE, { path: '/' });
}

// família passa a atuar como uma criança da própria família
router.post('/auth/act-as-child', requireAuth, async (req, res, next) => {
  try {
    const { childId } = req.body;
    const link = await prisma.childFamily.findUnique({
      where: {
        childId_familyId: { childId: Number(childId), familyId: Number(req.user.sub) },
      },
    });
    if (!link) return res.status(403).json({ error: 'Child não pertence à tua família' });

    setActingCookie(res, Number(childId));
    res.json({ ok: true, actingChildId: Number(childId) });
  } catch (e) { next(e); }
});

router.post('/auth/act-as-clear', requireAuth, async (_req, res) => {
  clearActingCookie(res);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const COOKIE_NAME = process.env.COOKIE_NAME || 'bf_access';
const ACTING_COOKIE = process.env.ACTING_COOKIE || 'bf_acting';
const isProd = process.env.NODE_ENV === 'production';

// ---------------- helpers cookies ----------------
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
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
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// --------------- middleware JWT ------------------
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { sub, roles, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
}

// --------------- REGISTER ------------------------
router.post('/register', async (req, res, next) => {
  try {
    const {
      fullName, email, phone, citizenCard, address, password,
      children = [],
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'E-mail já registado' });

    const passwordHash = await bcrypt.hash(String(password), 12);

    const role = await prisma.role.upsert({
      where: { name: 'FAMÍLIA' },
      update: {},
      create: { name: 'FAMÍLIA' },
    });

    const user = await prisma.user.create({
      data: {
        fullName, email, phone, citizenCard, address, passwordHash,
        userRoles: { create: { roleId: role.id } },
        children: {
          create: children.map((c) => ({
            child: {
              create: {
                name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(),
                birthDate: c.birthDate
                  ? new Date(c.birthDate)
                  : new Date(new Date().getFullYear() - Number(c.age || 0), 0, 1),
                gender: c.gender || null,
                readerProfile: c.readerProfile || null,
              },
            },
          })),
        },
      },
      select: { id: true, fullName: true, email: true },
    });

    return res.status(201).json({ userId: user.id, emailVerification: 'pending' });
  } catch (err) { next(err); }
});

// --------------- LOGIN ---------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Credenciais em falta' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const roles = user.userRoles.map(ur => ur.role.name);
    const token = signToken({ sub: user.id, roles });

    setAuthCookie(res, token);
    clearActingCookie(res); // ao entrar, limpas o modo criança
    return res.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, roles },
    });
  } catch (err) { next(err); }
});

// --------------- ME (sempre roles: string[]) -----
router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const userId = Number(req.user.sub);
    const actingChildId = parseInt(req.cookies?.[ACTING_COOKIE] || '', 10);

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true,
        userRoles: { include: { role: true } },
        children: { include: { child: { select: { id: true, name: true } } } },
      },
    });
    if (!u) return res.status(401).json({ error: 'Sessão inválida' });

    const roles = u.userRoles.map(ur => ur.role.name);
    const children = u.children.map(c => ({ id: c.childId, name: c.child.name, avatarUrl: null }));

    // validar actingChild (se existir cookie)
    if (!Number.isNaN(actingChildId)) {
      const belongs = children.find(c => c.id === actingChildId);
      if (belongs) {
        return res.json({
          id: u.id, fullName: u.fullName, email: u.email,
          roles: ['CRIANÇA'],
          actingChild: belongs,
          children,
        });
      }
      // se o cookie for inválido, limpa-o
      clearActingCookie(res);
    }

    return res.json({
      id: u.id, fullName: u.fullName, email: u.email,
      roles,
      children,
      actingChild: null,
    });
  } catch (e) { next(e); }
});

// --------------- LOGOUT --------------------------
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  clearActingCookie(res);
  res.status(204).end();
});

export default router;

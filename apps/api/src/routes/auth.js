// src/routes/auth.js
import { Router } from 'express';
import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const COOKIE_NAME = process.env.COOKIE_NAME || 'bf_access';
const isProd = process.env.NODE_ENV === 'production';

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/'
  });
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function authGuard(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
}



// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const {
      fullName, email, phone, citizenCard, address, password,
      children = [] // [{ firstName, lastName?, age, gender, readerProfile }]
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'E-mail já registado' });

    const passwordHash = await bcrypt.hash(String(password), 12);

    // Garante que a role FAMÍLIA existe
    const role = await prisma.role.upsert({
      where: { name: 'FAMÍLIA' },
      update: {},
      create: { name: 'FAMÍLIA' }
    });

    const user = await prisma.user.create({
      data: {
        fullName, email, phone, citizenCard, address, passwordHash,
        userRoles: { create: { roleId: role.id } },
        // cria crianças e associa via ChildFamily
        children: {
          create: children.map((c) => ({
            child: {
              create: {
                name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(),
                // Se vier "idade", aproxima data de nascimento para 1 Jan (ou ajusta no frontend)
                birthDate: c.birthDate ? new Date(c.birthDate) :
                  new Date(new Date().getFullYear() - Number(c.age || 0), 0, 1),
                gender: c.gender || null,
                readerProfile: c.readerProfile || null
              }
            }
          }))
        }
      },
      select: { id: true, fullName: true, email: true }
    });

    // TODO: Enviar e-mail de confirmação (SRS) e guardar token de verificação
    // Por agora, respondemos já com 201
    return res.status(201).json({ userId: user.id, emailVerification: 'pending' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Credenciais em falta' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } }
    });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const roles = user.userRoles.map(ur => ur.role.name);
    const token = signToken({ sub: user.id, roles });

    setAuthCookie(res, token);
    return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, roles } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authGuard, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, fullName: true, email: true }
    });
    res.json(me);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.status(204).end();
});

// (Opcional) /verify-email, /forgot-password, /reset-password — podemos acrescentar depois
export default router;

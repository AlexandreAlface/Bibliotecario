import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import { ROLES, requireRole } from "../middlewares/auth";

export const adminLibrariansRouter = Router();

/**
 * POST /admin/libraries/:libraryId/librarians/new
 * Body: { fullName, email, phone?, password? }
 * - Cria (se não existir) utilizador
 * - Garante role "BIBLIOTECÁRIO" (ou alias)
 * - Garante associação à biblioteca
 * - Devolve { id, fullName, email }
 */
adminLibrariansRouter.post(
  "/admin/libraries/:libraryId/librarians/new",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN), // admin ou bibliotecário com acesso à lib
  async (req, res) => {
    const libraryId = Number(req.params.libraryId);
    if (!Number.isFinite(libraryId) || libraryId <= 0) {
      return res.status(400).json({ error: "invalid_library_id" });
    }

    const me = (req as any).user as { id: number; roles: string[] } | undefined;
    const isAdmin = (me?.roles || []).some(
      (r) => r.toUpperCase() === ROLES.ADMIN
    );
    if (!isAdmin) {
      // se for só librarian, tem de pertencer à biblioteca
      const canAccess = await prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me!.id, libraryId } },
        select: { userId: true },
      });
      if (!canAccess) return res.status(403).json({ error: "forbidden" });
    }

    const { fullName, email, phone, password } = req.body || {};
    if (!fullName || !email) {
      return res.status(400).json({ error: "missing_fields" });
    }

    // role alvo (aceita aliases)
    const librarianAliases = ["BIBLIOTECÁRIO", "BIBLIOTECARIO", "LIBRARIAN"];
    let librarianRole = await prisma.role.findFirst({
      where: { name: { in: librarianAliases } },
    });
    if (!librarianRole) {
      librarianRole = await prisma.role.create({
        data: { name: "BIBLIOTECÁRIO" },
      });
    }

    // cria ou reaproveita o utilizador por email
    let user = await prisma.user.findUnique({ where: { email } });

    // Se não existir → cria
    if (!user) {
      const pwd =
        typeof password === "string" && password.trim()
          ? password.trim()
          : Math.random().toString(36).slice(-12); // temp
      const passwordHash = await bcrypt.hash(pwd, 10);

      user = await prisma.user.create({
        data: {
          fullName,
          email,
          phone: phone || null,
          passwordHash,
        },
      });
      // (opcional) aqui podes enviar email com a password temporária
    } else {
      // existe: atualiza nome/telefone se vierem preenchidos
      const data: any = {};
      if (fullName && fullName !== user.fullName) data.fullName = fullName;
      if (phone && phone !== user.phone) data.phone = phone;
      if (Object.keys(data).length) {
        user = await prisma.user.update({
          where: { id: user.id },
          data,
        });
      }
    }

    // garante role de bibliotecário
    const hasRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: librarianRole.id } },
    });
    if (!hasRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: librarianRole.id },
      });
    }

    // garante associação à biblioteca
    const hasLib = await prisma.userLibrary.findUnique({
      where: { userId_libraryId: { userId: user.id, libraryId } },
    });
    if (!hasLib) {
      await prisma.userLibrary.create({
        data: { userId: user.id, libraryId },
      });
    }

    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    });
  }
);

/**
 * DELETE /admin/libraries/:libraryId/librarians/:userId
 * Remove a associação (UserLibrary). Não apaga o utilizador.
 */
adminLibrariansRouter.delete(
  "/admin/libraries/:libraryId/librarians/:userId",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  async (req, res) => {
    const libraryId = Number(req.params.libraryId);
    const userId = Number(req.params.userId);
    if (!Number.isFinite(libraryId) || libraryId <= 0) {
      return res.status(400).json({ error: "invalid_library_id" });
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    // Se não for admin, só pode mexer se tiver acesso à biblioteca
    const me = (req as any).user as { id: number; roles: string[] } | undefined;
    const isAdmin = (me?.roles || []).some(r => r.toUpperCase() === ROLES.ADMIN);
    if (!isAdmin) {
      const canAccess = await prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me!.id, libraryId } },
        select: { userId: true },
      });
      if (!canAccess) return res.status(403).json({ error: "forbidden" });
    }

    const link = await prisma.userLibrary.findUnique({
      where: { userId_libraryId: { userId, libraryId } },
    });
    if (!link) return res.status(404).json({ error: "not_found" });

    await prisma.userLibrary.delete({
      where: { userId_libraryId: { userId, libraryId } },
    });

    // 204 = no content
    return res.status(204).end();
  }
);

/**
 * POST /api/admin/librarians
 * body: { fullName, email, phone?, citizenCard?, address?, password, libraryId }
 * requer ADMIN
 */
adminLibrariansRouter.post(
  "/admin/librarians",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const {
        fullName,
        email,
        phone,
        citizenCard,
        address,
        password,
        libraryId,
      } = req.body || {};

      if (!fullName || !email || !password || !libraryId) {
        return res
          .status(400)
          .json({ error: "Campos obrigatórios em falta" });
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: "E-mail já registado" });

      const passwordHash = await bcrypt.hash(String(password), 12);

      // garante role “BIBLIOTECÁRIO”
      const role = await prisma.role.upsert({
        where: { name: ROLES.LIBRARIAN },
        update: {},
        create: { name: ROLES.LIBRARIAN },
      });

      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          phone: phone || null,
          citizenCard: citizenCard || null,
          address: address || null,
          passwordHash,
          userRoles: { create: { roleId: role.id } },
          userLibraries: {
            create: { libraryId: Number(libraryId) },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

      return res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  }
);

export default adminLibrariansRouter;

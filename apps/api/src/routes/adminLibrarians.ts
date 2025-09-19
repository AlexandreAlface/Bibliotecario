import { Router } from "express";
import { prisma } from "../prisma";
import { requireRole, ROLES } from "../middlewares/auth";

const r = Router();

// GET /admin/libraries/:libraryId/librarians
r.get(
  "/admin/libraries/:libraryId/librarians",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      if (!Number.isFinite(libraryId) || libraryId <= 0) {
        return res.status(400).json({ error: "libraryId inválido" });
      }

      // users com role bibliotecário e associados à biblioteca
      const items = await prisma.user.findMany({
        where: {
          userLibraries: { some: { libraryId } },
          userRoles: {
            some: {
              role: { name: { in: ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"] } },
            },
          },
        },
        select: { id: true, fullName: true, email: true },
        orderBy: [{ fullName: "asc" }],
      });

      res.json(items);
    } catch (e) { next(e); }
  }
);

export default r;

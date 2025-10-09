// apps/api/src/routes/badges.ts
// Autor: Alexandre Brissos 21131
// O que faz: devolve a lista de badges (id, nome, tipo, critério), ordenados.

import { Router, type RequestHandler } from "express";
import { prisma } from "../../prisma";

const r = Router();

const listBadges: RequestHandler = async (_req, res, next) => {
  try {
    const items = await prisma.badge.findMany({
      orderBy: [{ type: "asc" }, { id: "asc" }],
      select: { id: true, name: true, type: true, criteria: true },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
};

r.get("/", listBadges);

export default r;

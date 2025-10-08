// apps/api/src/routes/badges-engine.ts
// Autor: Alexandre Brissos 21131
// O que faz: expõe um endpoint para recalcular/atribuir badges.
// Se vier childId, recalcula só essa criança; caso contrário, todas.

import { Router, type RequestHandler } from "express";
import {
  checkAndAwardAllForChild,
  recomputeAllChildren,
} from "../../services/badgesEngine";
import { requireRole, ROLES } from "../../middlewares/auth";

const r = Router();

// helper puro: parse num opcional
const parseNum = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const recomputeHandler: RequestHandler = async (req, res) => {
  const childId = parseNum(req.query.childId);
  if (childId != null) {
    const out = await checkAndAwardAllForChild(childId);
    return res.json({ scope: "child", ...out });
  }
  const out = await recomputeAllChildren();
  return res.json({ scope: "all", ...out });
};

r.post(
  "/recompute",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  recomputeHandler
);

export default r;

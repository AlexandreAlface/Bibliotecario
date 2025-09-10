// apps/api/src/routes/badges-engine.ts
import { Router } from "express";
import { checkAndAwardAllForChild, recomputeAllChildren } from "../services/badgesEngine";
import { requireRole, ROLES } from "../middlewares/auth";

const r = Router();

r.post("/recompute", requireRole(ROLES.ADMIN, ROLES.LIBRARIAN), async (req, res) => {
  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  if (Number.isFinite(childId)) {
    const out = await checkAndAwardAllForChild(childId!);
    return res.json({ scope: "child", ...out });
  }
  const out = await recomputeAllChildren();
  res.json({ scope: "all", ...out });
});

export default r;

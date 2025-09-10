// apps/api/src/routes/badges.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const r = Router();

r.get("/", async (_req, res) => {
  const items = await prisma.badge.findMany({
    orderBy: [{ type: "asc" }, { id: "asc" }],
    select: { id: true, name: true, type: true, criteria: true },
  });
  res.json(items);
});

export default r;

// apps/api/src/routes/adminFeeds.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma.js";
import { fetchAndUpsertFeed, fetchAndUpsertAllFeeds } from "../services/rssService.js";

const r = Router();

function requireUser(req: Request, res: Response): asserts req is Request & { user: Express.User } {
  if (!req.user) {
    // podes também lançar erro; aqui devolvo 401 de forma explícita
    res.status(401).json({ error: "unauthenticated" });
    // Hack para TypeScript perceber que daqui para a frente a função não prossegue
    throw new Error("unauthenticated");
  }
}

// GET /admin/feeds – lista feeds das bibliotecas do admin
r.get("/admin/feeds", async (req, res) => {
  requireUser(req, res);

  const libs = await prisma.userLibrary.findMany({
    where: { userId: req.user.id },
    select: { libraryId: true },
  });
  const libraryIds = libs.map((l) => l.libraryId);

  const feeds = await prisma.feedRss.findMany({
    where: { libraryId: { in: libraryIds } },
    orderBy: { id: "asc" },
  });

  res.json(feeds);
});

// POST /admin/feeds – cria feed e faz ingestão imediata
r.post("/admin/feeds", async (req, res) => {
  requireUser(req, res);

  const { libraryId, url, ttl } = req.body as {
    libraryId?: number;
    url?: string;
    ttl?: number | null;
  };

  if (!libraryId || !url) {
    return res.status(400).json({ error: "missing_params" });
  }

  const feed = await prisma.feedRss.create({
    data: { libraryId: Number(libraryId), url: String(url), ttl: ttl ?? null },
  });

  await fetchAndUpsertFeed(feed.id, { force: true });

  res.json(feed);
});

// PATCH /admin/feeds/:id – atualiza feed e força ingestão
r.patch("/admin/feeds/:id", async (req, res) => {
  requireUser(req, res);

  const id = Number(req.params.id);
  const { url, ttl } = req.body as { url?: string; ttl?: number | null };

  const feed = await prisma.feedRss.update({
    where: { id },
    data: {
      ...(url != null ? { url: String(url) } : {}),
      ...(ttl !== undefined ? { ttl: ttl === null ? null : Number(ttl) } : {}),
    },
  });

  await fetchAndUpsertFeed(id, { force: true });

  res.json(feed);
});

// DELETE /admin/feeds/:id – remove feed
r.delete("/admin/feeds/:id", async (req, res) => {
  requireUser(req, res);

  const id = Number(req.params.id);
  await prisma.feedRss.delete({ where: { id } });
  res.json({ ok: true });
});

// POST /admin/feeds/refresh – força refresh de todos os feeds das minhas bibliotecas
r.post("/admin/feeds/refresh", async (req, res) => {
  requireUser(req, res);

  const libs = await prisma.userLibrary.findMany({
    where: { userId: req.user.id },
    select: { libraryId: true },
  });

  const results = [];
  for (const { libraryId } of libs) {
    const r = await fetchAndUpsertAllFeeds({ libraryId, force: true });
    results.push({ libraryId, result: r });
  }

  res.json({ ok: true, results });
});

export default r;

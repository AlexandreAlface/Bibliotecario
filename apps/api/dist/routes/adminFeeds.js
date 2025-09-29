"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/adminFeeds.ts
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const rssService_js_1 = require("../services/rssService.js");
const r = (0, express_1.Router)();
function requireUser(req, res) {
    if (!req.user) {
        res.status(401).json({ error: "unauthenticated" });
        throw new Error("unauthenticated");
    }
}
async function assertLibraryAccess(userId, libraryId) {
    const link = await prisma_js_1.prisma.userLibrary.findFirst({
        where: { userId, libraryId },
        select: { userId: true },
    });
    if (!link) {
        const err = new Error("forbidden");
        err.status = 403;
        throw err;
    }
}
/* =======================
   “Qual é a minha biblioteca?”
   ======================= */
// GET /admin/feeds/my-library — devolve a 1ª biblioteca associada ao utilizador
r.get("/admin/feeds/my-library", async (req, res) => {
    requireUser(req, res);
    const link = await prisma_js_1.prisma.userLibrary.findFirst({
        where: { userId: req.user.id },
        include: { library: { select: { id: true, name: true } } },
        orderBy: { libraryId: "asc" },
    });
    if (!link || !link.library) {
        return res.status(404).json({ error: "no_library" });
    }
    res.json({ id: link.library.id, name: link.library.name });
});
/* =======================
   ENDPOINTS “SCOPED” POR BIBLIOTECA (usados pelo frontend)
   ======================= */
// GET /admin/libraries/:libraryId/feeds – lista feeds da biblioteca
r.get("/admin/libraries/:libraryId/feeds", async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    try {
        await assertLibraryAccess(req.user.id, libraryId);
        const feeds = await prisma_js_1.prisma.feedRss.findMany({
            where: { libraryId },
            orderBy: { id: "asc" },
        });
        res.json(feeds);
    }
    catch (e) {
        res
            .status(e?.status || 500)
            .json({ error: e?.message || "internal_error" });
    }
});
// POST /admin/libraries/:libraryId/feeds – cria/ativa um feed
r.post("/admin/libraries/:libraryId/feeds", async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    const { url, ttl } = (req.body || {});
    if (!url)
        return res.status(400).json({ error: "missing_params" });
    try {
        await assertLibraryAccess(req.user.id, libraryId);
        const feed = await prisma_js_1.prisma.feedRss.create({
            data: { libraryId, url: String(url), ttl: ttl ?? null },
        });
        // força ingestão inicial
        try {
            await (0, rssService_js_1.fetchAndUpsertFeed)(feed.id, { force: true });
        }
        catch { }
        res.json(feed);
    }
    catch (e) {
        res
            .status(e?.status || 500)
            .json({ error: e?.message || "internal_error" });
    }
});
// PATCH /admin/libraries/:libraryId/feeds/:id – atualiza um feed
r.patch("/admin/libraries/:libraryId/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    const id = Number(req.params.id);
    const { url, ttl } = (req.body || {});
    try {
        await assertLibraryAccess(req.user.id, libraryId);
        // garante pertença à biblioteca
        const exists = await prisma_js_1.prisma.feedRss.findFirst({ where: { id, libraryId } });
        if (!exists)
            return res.status(404).json({ error: "not_found" });
        const feed = await prisma_js_1.prisma.feedRss.update({
            where: { id },
            data: {
                ...(url != null ? { url: String(url) } : {}),
                ...(ttl !== undefined
                    ? { ttl: ttl === null ? null : Number(ttl) }
                    : {}),
            },
        });
        try {
            await (0, rssService_js_1.fetchAndUpsertFeed)(id, { force: true });
        }
        catch { }
        res.json(feed);
    }
    catch (e) {
        res
            .status(e?.status || 500)
            .json({ error: e?.message || "internal_error" });
    }
});
// DELETE /admin/libraries/:libraryId/feeds/:id – remove feed
r.delete("/admin/libraries/:libraryId/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    const id = Number(req.params.id);
    try {
        await assertLibraryAccess(req.user.id, libraryId);
        const exists = await prisma_js_1.prisma.feedRss.findFirst({ where: { id, libraryId } });
        if (!exists)
            return res.status(404).json({ error: "not_found" });
        await prisma_js_1.prisma.feedRss.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (e) {
        res
            .status(e?.status || 500)
            .json({ error: e?.message || "internal_error" });
    }
});
/* =======================
   ENDPOINTS LEGACY (mantidos por compat)
   ======================= */
// GET /admin/feeds – feeds de todas as bibliotecas do utilizador
r.get("/admin/feeds", async (req, res) => {
    requireUser(req, res);
    const libs = await prisma_js_1.prisma.userLibrary.findMany({
        where: { userId: req.user.id },
        select: { libraryId: true },
    });
    const feeds = await prisma_js_1.prisma.feedRss.findMany({
        where: { libraryId: { in: libs.map((l) => l.libraryId) } },
        orderBy: { id: "asc" },
    });
    res.json(feeds);
});
// POST /admin/feeds – cria feed (não usado pelo FE atual)
r.post("/admin/feeds", async (req, res) => {
    requireUser(req, res);
    const { libraryId, url, ttl } = req.body;
    if (!libraryId || !url)
        return res.status(400).json({ error: "missing_params" });
    await assertLibraryAccess(req.user.id, Number(libraryId));
    const feed = await prisma_js_1.prisma.feedRss.create({
        data: { libraryId: Number(libraryId), url: String(url), ttl: ttl ?? null },
    });
    try {
        await (0, rssService_js_1.fetchAndUpsertFeed)(feed.id, { force: true });
    }
    catch { }
    res.json(feed);
});
// PATCH /admin/feeds/:id – atualiza feed (legacy por ID)
r.patch("/admin/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const id = Number(req.params.id);
    const { url, ttl } = req.body;
    const feed = await prisma_js_1.prisma.feedRss.findUnique({ where: { id } });
    if (!feed)
        return res.status(404).json({ error: "not_found" });
    await assertLibraryAccess(req.user.id, feed.libraryId);
    const upd = await prisma_js_1.prisma.feedRss.update({
        where: { id },
        data: {
            ...(url != null ? { url: String(url) } : {}),
            ...(ttl !== undefined ? { ttl: ttl === null ? null : Number(ttl) } : {}),
        },
    });
    try {
        await (0, rssService_js_1.fetchAndUpsertFeed)(id, { force: true });
    }
    catch { }
    res.json(upd);
});
// DELETE /admin/feeds/:id – remove feed (legacy por ID)
r.delete("/admin/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const id = Number(req.params.id);
    const feed = await prisma_js_1.prisma.feedRss.findUnique({ where: { id } });
    if (!feed)
        return res.status(404).json({ error: "not_found" });
    await assertLibraryAccess(req.user.id, feed.libraryId);
    await prisma_js_1.prisma.feedRss.delete({ where: { id } });
    res.json({ ok: true });
});
// POST /admin/feeds/refresh – força refresh de todos os feeds das minhas bibliotecas
r.post("/admin/feeds/refresh", async (req, res) => {
    requireUser(req, res);
    const libs = await prisma_js_1.prisma.userLibrary.findMany({
        where: { userId: req.user.id },
        select: { libraryId: true },
    });
    const results = [];
    for (const { libraryId } of libs) {
        const rr = await (0, rssService_js_1.fetchAndUpsertAllFeeds)({ libraryId, force: true });
        results.push({ libraryId, result: rr });
    }
    res.json({ ok: true, results });
});
exports.default = r;

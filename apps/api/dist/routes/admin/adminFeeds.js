"use strict";
/**
 * Admin — gestão de feeds RSS por biblioteca (rotas mantidas).
 * Autor: Alexandre Brissos — Data: 2025-10-02
 * Nota: Limpeza leve, helpers de validação e comentários. Rotas e comportamentos preservados.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma"); // — Alexandre Brissos — 2025-10-02
const rssService_js_1 = require("../../services/rssService.js"); // — Alexandre Brissos — 2025-10-02
const r = (0, express_1.Router)();
/* ===================== Helpers puros =====================
 * — Alexandre Brissos — 2025-10-02
 */
/** Valida que está autenticado e afina o tipo. — Alexandre Brissos — 2025-10-02 */
function requireUser(req, res) {
    if (!req.user) {
        res.status(401).json({ error: "unauthenticated" });
        throw new Error("unauthenticated");
    }
}
/** Converte para inteiro positivo ou lança 400. — Alexandre Brissos — 2025-10-02 */
function parsePositiveId(v, field = "id") {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
        const err = new Error(`${field} inválido`);
        err.status = 400;
        throw err;
    }
    return n;
}
/* ============== Helpers com efeitos (DB/Acesso) ==============
 * — Alexandre Brissos — 2025-10-02
 */
/** Garante que o utilizador tem acesso à biblioteca. — Alexandre Brissos — 2025-10-02 */
async function assertLibraryAccess(userId, libraryId) {
    const link = await prisma_1.prisma.userLibrary.findFirst({
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
/**
 * GET /admin/feeds/my-library — devolve a 1ª biblioteca do utilizador.
 * — Alexandre Brissos — 2025-10-02
 */
r.get("/admin/feeds/my-library", async (req, res) => {
    requireUser(req, res);
    const link = await prisma_1.prisma.userLibrary.findFirst({
        where: { userId: req.user.id },
        include: { library: { select: { id: true, name: true } } },
        orderBy: { libraryId: "asc" },
    });
    if (!link?.library)
        return res.status(404).json({ error: "no_library" });
    res.json({ id: link.library.id, name: link.library.name });
});
/* =======================
   ENDPOINTS "SCOPED" POR BIBLIOTECA
   ======================= */
/**
 * GET /admin/libraries/:libraryId/feeds — lista feeds da biblioteca.
 * — Alexandre Brissos — 2025-10-02
 */
r.get("/admin/libraries/:libraryId/feeds", async (req, res) => {
    requireUser(req, res);
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        await assertLibraryAccess(req.user.id, libraryId);
        const feeds = await prisma_1.prisma.feedRss.findMany({
            where: { libraryId },
            orderBy: { id: "asc" },
        });
        res.json(feeds);
    }
    catch (e) {
        res.status(e?.status || 500).json({ error: e?.message || "internal_error" });
    }
});
/**
 * POST /admin/libraries/:libraryId/feeds — cria/ativa um feed e força 1º ingest.
 * Body: { url: string, ttl?: number|null }
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/libraries/:libraryId/feeds", async (req, res) => {
    requireUser(req, res);
    const { url, ttl } = (req.body || {});
    if (!url)
        return res.status(400).json({ error: "missing_params" });
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        await assertLibraryAccess(req.user.id, libraryId);
        const feed = await prisma_1.prisma.feedRss.create({ data: { libraryId, url: String(url), ttl: ttl ?? null } });
        try {
            await (0, rssService_js_1.fetchAndUpsertFeed)(feed.id, { force: true });
        }
        catch { }
        res.json(feed);
    }
    catch (e) {
        res.status(e?.status || 500).json({ error: e?.message || "internal_error" });
    }
});
/**
 * PATCH /admin/libraries/:libraryId/feeds/:id — atualiza url/ttl e força refresh.
 * — Alexandre Brissos — 2025-10-02
 */
r.patch("/admin/libraries/:libraryId/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const { url, ttl } = (req.body || {});
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const id = parsePositiveId(req.params.id, "id");
        await assertLibraryAccess(req.user.id, libraryId);
        const exists = await prisma_1.prisma.feedRss.findFirst({ where: { id, libraryId } });
        if (!exists)
            return res.status(404).json({ error: "not_found" });
        const feed = await prisma_1.prisma.feedRss.update({
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
        res.json(feed);
    }
    catch (e) {
        res.status(e?.status || 500).json({ error: e?.message || "internal_error" });
    }
});
/**
 * DELETE /admin/libraries/:libraryId/feeds/:id — remove feed da biblioteca.
 * — Alexandre Brissos — 2025-10-02
 */
r.delete("/admin/libraries/:libraryId/feeds/:id", async (req, res) => {
    requireUser(req, res);
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const id = parsePositiveId(req.params.id, "id");
        await assertLibraryAccess(req.user.id, libraryId);
        const exists = await prisma_1.prisma.feedRss.findFirst({ where: { id, libraryId } });
        if (!exists)
            return res.status(404).json({ error: "not_found" });
        await prisma_1.prisma.feedRss.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(e?.status || 500).json({ error: e?.message || "internal_error" });
    }
});
/**
 * GET /admin/feeds — feeds de todas as bibliotecas do utilizador.
 * — Alexandre Brissos — 2025-10-02
 */
r.get("/admin/feeds", async (req, res) => {
    requireUser(req, res);
    const libs = await prisma_1.prisma.userLibrary.findMany({
        where: { userId: req.user.id },
        select: { libraryId: true },
    });
    const feeds = await prisma_1.prisma.feedRss.findMany({
        where: { libraryId: { in: libs.map((l) => l.libraryId) } },
        orderBy: { id: "asc" },
    });
    res.json(feeds);
});
/**
 * POST /admin/feeds — cria feed por ID de biblioteca (legacy).
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/feeds", async (req, res) => {
    requireUser(req, res);
    const { libraryId, url, ttl } = req.body;
    if (!libraryId || !url)
        return res.status(400).json({ error: "missing_params" });
    await assertLibraryAccess(req.user.id, Number(libraryId));
    const feed = await prisma_1.prisma.feedRss.create({ data: { libraryId: Number(libraryId), url: String(url), ttl: ttl ?? null } });
    try {
        await (0, rssService_js_1.fetchAndUpsertFeed)(feed.id, { force: true });
    }
    catch { }
    res.json(feed);
});
/**
 * PATCH /admin/feeds/:id — atualiza feed por ID (legacy).
 * — Alexandre Brissos — 2025-10-02
 */
r.patch("/admin/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const id = parsePositiveId(req.params.id, "id");
    const { url, ttl } = req.body;
    const feed = await prisma_1.prisma.feedRss.findUnique({ where: { id } });
    if (!feed)
        return res.status(404).json({ error: "not_found" });
    await assertLibraryAccess(req.user.id, feed.libraryId);
    const upd = await prisma_1.prisma.feedRss.update({
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
/**
 * DELETE /admin/feeds/:id — remove feed (legacy).
 * — Alexandre Brissos — 2025-10-02
 */
r.delete("/admin/feeds/:id", async (req, res) => {
    requireUser(req, res);
    const id = parsePositiveId(req.params.id, "id");
    const feed = await prisma_1.prisma.feedRss.findUnique({ where: { id } });
    if (!feed)
        return res.status(404).json({ error: "not_found" });
    await assertLibraryAccess(req.user.id, feed.libraryId);
    await prisma_1.prisma.feedRss.delete({ where: { id } });
    res.json({ ok: true });
});
/**
 * POST /admin/feeds/refresh — força refresh de todos os feeds das minhas bibliotecas.
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/feeds/refresh", async (req, res) => {
    requireUser(req, res);
    const libs = await prisma_1.prisma.userLibrary.findMany({
        where: { userId: req.user.id },
        select: { libraryId: true },
    });
    const results = []; // log simples
    for (const { libraryId } of libs) {
        const rr = await (0, rssService_js_1.fetchAndUpsertAllFeeds)({ libraryId, force: true });
        results.push({ libraryId, result: rr });
    }
    res.json({ ok: true, results });
});
exports.default = r;

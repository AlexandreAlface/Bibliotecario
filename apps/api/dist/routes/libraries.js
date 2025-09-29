"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
function requireAuth(req, res, next) {
    const userId = Number(req?.user?.sub ?? req?.user?.id ?? req?.session?.userId);
    if (!userId)
        return res.status(401).json({ error: "unauthorized" });
    req.authUserId = userId;
    next();
}
/** Bibliotecas do utilizador autenticado */
router.get("/libraries/mine", requireAuth, async (req, res) => {
    try {
        const userId = Number(req.authUserId);
        const libs = await prisma.library.findMany({
            where: { userLibraries: { some: { userId } } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
        res.json({ items: libs });
    }
    catch (e) {
        console.error("GET /libraries/mine", e);
        res.status(500).json({ error: "failed_to_list_libraries" });
    }
});
// opcional: alias com ?scope=mine
router.get("/libraries", requireAuth, async (req, res) => {
    if (String(req.query.scope || "").toLowerCase() === "mine") {
        req.authUserId = Number(req?.user?.sub ?? 0);
        const userId = Number(req.authUserId);
        const libs = await prisma.library.findMany({
            where: { userLibraries: { some: { userId } } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
        return res.json({ items: libs });
    }
    return res.status(400).json({ error: "unsupported_scope" });
});
exports.default = router;

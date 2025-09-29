"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/** LISTA PÚBLICA DE BIBLIOTECAS */
router.get("/libraries", async (_req, res) => {
    try {
        const libs = await prisma.library.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
        res.json({ items: libs });
    }
    catch (e) {
        console.error("GET /public/libraries", e);
        res.status(500).json({ error: "failed_to_list_libraries" });
    }
});
exports.default = router;

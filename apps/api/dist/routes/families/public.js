"use strict";
// apps/api/src/routes/public-libraries.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista pública de bibliotecas (id + name).
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicLibraries = listPublicLibraries;
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const router = (0, express_1.Router)();
/* -------- Service (curto) -------- */
async function listPublicLibraries() {
    return prisma_1.prisma.library.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}
/* -------- Route (handler < 30 linhas) -------- */
router.get("/libraries", async (_req, res) => {
    try {
        const items = await listPublicLibraries();
        res.json({ items });
    }
    catch (e) {
        console.error("GET /public/libraries", e);
        res.status(500).json({ error: "failed_to_list_libraries" });
    }
});
exports.default = router;

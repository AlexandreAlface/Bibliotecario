"use strict";
// apps/api/src/routes/badges.ts
// Autor: Alexandre Brissos 21131
// O que faz: devolve a lista de badges (id, nome, tipo, critério), ordenados.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const r = (0, express_1.Router)();
const listBadges = async (_req, res, next) => {
    try {
        const items = await prisma_1.prisma.badge.findMany({
            orderBy: [{ type: "asc" }, { id: "asc" }],
            select: { id: true, name: true, type: true, criteria: true },
        });
        res.json(items);
    }
    catch (e) {
        next(e);
    }
};
r.get("/", listBadges);
exports.default = r;

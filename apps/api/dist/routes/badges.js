"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/badges.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
r.get("/", async (_req, res) => {
    const items = await prisma.badge.findMany({
        orderBy: [{ type: "asc" }, { id: "asc" }],
        select: { id: true, name: true, type: true, criteria: true },
    });
    res.json(items);
});
exports.default = r;

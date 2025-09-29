"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
// GET /admin/libraries/:libraryId/librarians
r.get("/admin/libraries/:libraryId/librarians", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        if (!Number.isFinite(libraryId) || libraryId <= 0) {
            return res.status(400).json({ error: "libraryId inválido" });
        }
        // users com role bibliotecário e associados à biblioteca
        const items = await prisma_1.prisma.user.findMany({
            where: {
                userLibraries: { some: { libraryId } },
                userRoles: {
                    some: {
                        role: { name: { in: ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"] } },
                    },
                },
            },
            select: { id: true, fullName: true, email: true },
            orderBy: [{ fullName: "asc" }],
        });
        res.json(items);
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;

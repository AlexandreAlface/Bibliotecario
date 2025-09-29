"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma"); // ajusta se o teu path do prisma for diferente
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
/**
 * GET /admin/libraries/:libraryId/consultations
 * Query:
 *  - status: "PENDING,CONFIRMED,..." (opcional, multi)
 *  - librarianId: number (opcional)
 *  - q: texto (opcional – procura em child.name e family.fullName)
 */
r.get("/admin/libraries/:libraryId/consultations", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        if (!Number.isFinite(libraryId) || libraryId <= 0) {
            return res.status(400).json({ error: "libraryId inválido" });
        }
        const q = req.query.q?.trim();
        const statusStr = req.query.status?.trim();
        const statuses = statusStr
            ? statusStr.split(",").map(s => s.trim().toUpperCase())
            : undefined;
        const librarianId = req.query.librarianId
            ? Number(req.query.librarianId)
            : undefined;
        const where = {
            AND: [
                {
                    OR: [
                        { libraryId }, // consultas com libraryId preenchido
                        { librarian: { userLibraries: { some: { libraryId } } } }, // fallback por pertença do bibliotecário
                    ],
                },
            ],
        };
        if (statuses?.length) {
            where.AND.push({ status: { in: statuses } });
        }
        if (Number.isFinite(librarianId)) {
            where.AND.push({ librarianId });
        }
        if (q) {
            where.AND.push({
                OR: [
                    { child: { name: { contains: q, mode: "insensitive" } } },
                    { family: { fullName: { contains: q, mode: "insensitive" } } },
                ],
            });
        }
        const items = await prisma_1.prisma.consultation.findMany({
            where,
            orderBy: [{ startAt: "desc" }, { id: "desc" }],
            take: 500,
            select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
                libraryId: true,
                child: { select: { id: true, name: true } },
                family: { select: { id: true, fullName: true } },
                librarian: { select: { id: true, fullName: true, email: true } },
            },
        });
        res.json(items.map(i => ({
            id: i.id,
            startAt: i.startAt ? i.startAt.toISOString() : null,
            endAt: i.endAt ? i.endAt.toISOString() : null,
            status: i.status,
            libraryId: i.libraryId ?? null,
            child: i.child ? { id: i.child.id, name: i.child.name } : null,
            family: i.family ? { id: i.family.id, fullName: i.family.fullName } : null,
            librarian: i.librarian
                ? { id: i.librarian.id, fullName: i.librarian.fullName, email: i.librarian.email }
                : null,
        })));
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;

"use strict";
// src/routes/children.ts
// Autor: Alexandre Brissos 21131
// O que faz: CRUD mínimo de crianças para a família autenticada.
// Inclui helpers “puros” (parse de datas, mapeamento) e handlers ≤ ~30 linhas.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
const parseBirthDate = (input) => {
    if (!input)
        return null;
    const d = new Date(String(input));
    return Number.isNaN(d.getTime()) ? null : d;
};
const toJsonChild = (c) => ({
    id: c.id,
    name: c.name,
    birthDate: c.birthDate ? c.birthDate.toISOString() : null,
    gender: c.gender,
    readerProfile: c.readerProfile,
    avatarUrl: null,
});
async function assertBelongsToFamily(childId, familyId) {
    const link = await prisma_1.prisma.childFamily.findUnique({
        where: { childId_familyId: { childId, familyId } },
        select: { childId: true },
    });
    if (!link)
        throw Object.assign(new Error("not_found"), { status: 404 });
}
/* ---------------- Handlers (≤ ~30 linhas) ---------------- */
// POST /api/children — cria criança e liga à família autenticada
const createChild = async (req, res, next) => {
    try {
        const { name, birthDate, gender, readerProfile } = (req.body || {});
        if (!String(name || "").trim())
            return res.status(400).json({ error: "Nome obrigatório" });
        const bd = parseBirthDate(birthDate) ??
            new Date(new Date().getFullYear() - 6, 0, 1);
        const familyId = Number(req.user?.sub);
        if (!Number.isFinite(familyId))
            return res.status(401).json({ error: "unauthenticated" });
        const child = await prisma_1.prisma.child.create({
            data: {
                name: String(name).trim(),
                birthDate: bd,
                gender: gender || null,
                readerProfile: readerProfile || null,
                families: { create: { familyId } },
            },
            select: { id: true, name: true, birthDate: true, gender: true, readerProfile: true },
        });
        return res.status(201).json(toJsonChild(child));
    }
    catch (e) {
        next(e);
    }
};
// PATCH /api/children/:id — atualiza apenas campos enviados
const updateChild = async (req, res, next) => {
    try {
        const childId = Number(req.params.id);
        const familyId = Number(req.user?.sub);
        await assertBelongsToFamily(childId, familyId);
        const data = {};
        if (typeof req.body.name === "string")
            data.name = String(req.body.name).trim();
        if (req.body.birthDate) {
            const bd = parseBirthDate(req.body.birthDate);
            if (bd)
                data.birthDate = bd;
        }
        if ("gender" in req.body)
            data.gender = req.body.gender || null;
        if ("readerProfile" in req.body)
            data.readerProfile = req.body.readerProfile || null;
        const child = await prisma_1.prisma.child.update({
            where: { id: childId },
            data,
            select: { id: true, name: true, birthDate: true, gender: true, readerProfile: true },
        });
        res.json(toJsonChild(child));
    }
    catch (e) {
        if (e?.status === 404)
            return res.status(404).json({ error: "not_found" });
        next(e);
    }
};
// DELETE /api/children/:id — apaga (cascata no schema)
const deleteChild = async (req, res, next) => {
    try {
        const childId = Number(req.params.id);
        const familyId = Number(req.user?.sub);
        await assertBelongsToFamily(childId, familyId);
        await prisma_1.prisma.child.delete({ where: { id: childId } });
        res.status(204).end();
    }
    catch (e) {
        if (e?.status === 404)
            return res.status(404).json({ error: "not_found" });
        next(e);
    }
};
/* ---------------- Wire-up ---------------- */
router.post("/children", auth_1.requireAuth, createChild);
router.patch("/children/:id", auth_1.requireAuth, updateChild);
router.delete("/children/:id", auth_1.requireAuth, deleteChild);
exports.default = router;

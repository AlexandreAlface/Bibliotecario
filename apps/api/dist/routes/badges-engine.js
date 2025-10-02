"use strict";
// apps/api/src/routes/badges-engine.ts
// Autor: Alexandre Brissos 21131
// O que faz: expõe um endpoint para recalcular/atribuir badges.
// Se vier childId, recalcula só essa criança; caso contrário, todas.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const badgesEngine_1 = require("../services/badgesEngine");
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
// helper puro: parse num opcional
const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const recomputeHandler = async (req, res) => {
    const childId = parseNum(req.query.childId);
    if (childId != null) {
        const out = await (0, badgesEngine_1.checkAndAwardAllForChild)(childId);
        return res.json({ scope: "child", ...out });
    }
    const out = await (0, badgesEngine_1.recomputeAllChildren)();
    return res.json({ scope: "all", ...out });
};
r.post("/recompute", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), recomputeHandler);
exports.default = r;

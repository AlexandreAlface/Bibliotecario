"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/badges-engine.ts
const express_1 = require("express");
const badgesEngine_1 = require("../services/badgesEngine");
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
r.post("/recompute", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res) => {
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    if (Number.isFinite(childId)) {
        const out = await (0, badgesEngine_1.checkAndAwardAllForChild)(childId);
        return res.json({ scope: "child", ...out });
    }
    const out = await (0, badgesEngine_1.recomputeAllChildren)();
    res.json({ scope: "all", ...out });
});
exports.default = r;

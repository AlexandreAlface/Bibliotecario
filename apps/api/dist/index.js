"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const node_cron_1 = __importDefault(require("node-cron"));
// 👇 INTERNOS SEM .js
const rssService_1 = require("./services/rssService");
const events_1 = __importDefault(require("./routes/events"));
const books_1 = __importDefault(require("./routes/books"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_child_1 = __importDefault(require("./routes/auth-child"));
const badge_assignments_1 = __importDefault(require("./routes/badge-assignments"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const reservations_1 = __importDefault(require("./routes/reservations"));
const readings_1 = __importDefault(require("./routes/readings"));
const ratings_1 = __importDefault(require("./routes/ratings"));
const slots_1 = __importDefault(require("./routes/consultations/slots"));
const proposals_1 = __importDefault(require("./routes/consultations/proposals"));
const consultations_1 = __importDefault(require("./routes/consultations/consultations"));
const badges_engine_1 = __importDefault(require("./routes/badges-engine"));
const auth_2 = require("./middlewares/auth");
const badgesEngine_1 = require("./services/badgesEngine");
const badges_1 = __importDefault(require("./routes/badges"));
const users_1 = __importDefault(require("./routes/users"));
const children_1 = __importDefault(require("./routes/children"));
const families_1 = __importDefault(require("./routes/families")); // <<< sem /index.js
const libraries_1 = __importDefault(require("./routes/libraries"));
const adminFeeds_1 = __importDefault(require("./routes/adminFeeds"));
const adminEvents_1 = __importDefault(require("./routes/adminEvents"));
const adminConsultations_1 = __importDefault(require("./routes/adminConsultations"));
const adminSlots_1 = __importDefault(require("./routes/adminSlots"));
const adminLibrarians_1 = __importDefault(require("./routes/adminLibrarians"));
const adminBlocks_1 = __importDefault(require("./routes/adminBlocks"));
const adminFamilies_1 = __importDefault(require("./routes/adminFamilies"));
const admin_librarian_1 = __importDefault(require("./routes/admin.librarian"));
const adminMetrics_1 = require("./routes/adminMetrics");
const culturalEvents_1 = __importDefault(require("./routes/culturalEvents"));
const adminBooks_1 = __importDefault(require("./routes/adminBooks"));
const public_js_1 = __importDefault(require("./routes/public.js"));
const microContent_1 = __importDefault(require("./routes/microContent"));
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não carregada. Verifica apps/api/.env");
    process.exit(1);
}
const app = (0, express_1.default)();
// Segurança / parsing
app.use((0, helmet_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
// CORS (com credenciais)
const DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? DEFAULT_ORIGINS;
app.use((0, cors_1.default)({
    origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin))
            return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
// healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/public", public_js_1.default);
/* --------- Rotas (sem /v1) --------- */
app.use("/api/auth", auth_1.default);
app.use("/api", auth_child_1.default);
app.use("/api", auth_2.withUser);
app.use("/api/consultations", consultations_1.default); // /api/consultations/...
app.use("/api/consultations", slots_1.default); // /api/consultations/slots, /api/consultations/librarians/:id/slots, etc.
app.use("/api/consultations", proposals_1.default);
app.use("/api", events_1.default);
app.use("/api/books", books_1.default);
app.use("/api/badge-assignments", badge_assignments_1.default);
app.use("/api", recommendations_1.default);
app.use("/api", reservations_1.default);
app.use("/api/readings", readings_1.default);
app.use("/api/ratings", ratings_1.default);
app.use("/api/badges", badges_engine_1.default);
app.use("/api/badges", badges_1.default);
app.use("/api/users", users_1.default);
app.use("/api", children_1.default);
app.use("/api/librarian", families_1.default);
app.use("/api", libraries_1.default);
app.use("/api", adminFeeds_1.default);
app.use("/api", adminEvents_1.default);
app.use("/api", adminConsultations_1.default);
app.use("/api", adminSlots_1.default);
app.use("/api", adminLibrarians_1.default);
app.use("/api", adminBlocks_1.default);
app.use("/api", adminFamilies_1.default);
app.use("/api", admin_librarian_1.default);
app.use("/api", adminMetrics_1.adminMetricsRouter);
app.use("/api", culturalEvents_1.default);
app.use("/api", adminBooks_1.default);
app.use("/api", microContent_1.default);
/* --------- Ingestão RSS --------- */
(async () => {
    try {
        console.log("▶️  Ingestão inicial de eventos RSS …");
        await (0, rssService_1.fetchAndUpsertAllFeeds)({ force: true }); // primeira vez ignora TTL
        console.log("✅  Ingestão inicial concluída");
    }
    catch (e) {
        console.error("❌ Falha na ingestão inicial de RSS:", e);
    }
})();
/* --------- Cron ---------
   Corre de hora a hora; o TTL por feed evita fetchs desnecessários. */
node_cron_1.default.schedule("0 * * * *", async () => {
    try {
        console.log("⏰ Ingestão agendada de eventos RSS …");
        await (0, rssService_1.fetchAndUpsertAllFeeds)(); // respeita TTL
        console.log("✅ Ingestão agendada concluída");
    }
    catch (e) {
        console.error("❌ Falha na ingestão agendada de RSS:", e);
    }
});
node_cron_1.default.schedule("15 3 * * *", async () => {
    const res = await (0, badgesEngine_1.recomputeAllChildren)();
    console.log("Badges recomputados:", res);
});
/* --------- 404 e errors --------- */
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ error: err?.message || "internal_error" });
});
// Boot
const PORT = Number(process.env.PORT || 3333);
app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}/api`);
});
exports.default = app;

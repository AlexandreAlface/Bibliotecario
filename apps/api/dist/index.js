"use strict";
/**
 * Ficheiro principal do servidor Express (bootstrap).
 * Autor: Alexandre Brissos 21131
 * Data: 2025-10-02
 * Nota: Não foram removidas nem adicionadas rotas; apenas documentação e comentários.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
/**
 * Importações de base do Express e middlewares de segurança/utilidade.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const node_cron_1 = __importDefault(require("node-cron"));
// 👇 INTERNOS SEM .js
/**
 * Serviços e routers internos da aplicação.
 * Mantemos a estrutura das rotas intacta.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
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
const consultations_1 = __importDefault(require("./routes/families/consultations"));
const slots_1 = __importDefault(require("./routes/families/consultations/slots"));
const proposals_1 = __importDefault(require("./routes/families/consultations/proposals"));
const badges_engine_1 = __importDefault(require("./routes/badges-engine"));
const auth_2 = require("./middlewares/auth");
const badgesEngine_1 = require("./services/badgesEngine");
const badges_1 = __importDefault(require("./routes/badges"));
const users_1 = __importDefault(require("./routes/users"));
const children_1 = __importDefault(require("./routes/children"));
const families_1 = __importDefault(require("./routes/families"));
const libraries_1 = __importDefault(require("./routes/libraries"));
const adminFeeds_1 = __importDefault(require("./routes/admin/adminFeeds"));
const adminEvents_1 = __importDefault(require("./routes/admin/adminEvents"));
const adminConsultations_1 = __importDefault(require("./routes/admin/adminConsultations"));
const adminSlots_1 = __importDefault(require("./routes/admin/adminSlots"));
const adminLibrarians_1 = __importDefault(require("./routes/admin/adminLibrarians"));
const adminBlocks_1 = __importDefault(require("./routes/admin/adminBlocks"));
const adminFamilies_1 = __importDefault(require("./routes/admin/adminFamilies"));
const admin_librarian_1 = __importDefault(require("./routes/admin/admin.librarian"));
const adminMetrics_1 = require("./routes/admin/adminMetrics");
const culturalEvents_1 = __importDefault(require("./routes/culturalEvents"));
const adminBooks_1 = __importDefault(require("./routes/admin/adminBooks"));
const public_js_1 = __importDefault(require("./routes/public.js"));
const microContent_1 = __importDefault(require("./routes/microContent"));
/**
 * Validação mínima de ambiente crítico para arrancar o servidor.
 * Falha cedo se faltar DATABASE_URL.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não carregada. Verifica apps/api/.env");
    process.exit(1);
}
/**
 * Instancia a aplicação Express.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
const app = (0, express_1.default)();
/**
 * Middlewares globais de segurança e parsing:
 * - helmet: cabeçalhos de segurança
 * - cookieParser: leitura de cookies
 * - express.json: parsing de JSON com limite para evitar payloads grandes
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use((0, helmet_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
/**
 * Configuração de CORS com suporte a credenciais.
 * allowedOrigins vem de ALLOWED_ORIGINS (CSV) ou recorre a defaults locais.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
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
/**
 * Healthcheck: confirma que a API está operacional.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
/**
 * Rota base pública — endpoints que não exigem sessão.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use("/api/public", public_js_1.default);
/* --------- Rotas (sem /v1) --------- */
/** Rota base /api/auth — autenticação geral. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/auth", auth_1.default);
/** Rota base /api — autenticação de criança (subconjunto). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", auth_child_1.default);
/**
 * Middleware withUser aplica-se a partir daqui para rotas autenticadas.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use("/api", auth_2.withUser);
/** Rota base /api/consultations — consultas e gestão associada. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", consultations_1.default); // /api/consultations/...
/** Rota base /api/consultations — slots de agendamento. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", slots_1.default); // /api/consultations/slots, /api/consultations/librarians/:id/slots, etc.
/** Rota base /api/consultations — propostas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", proposals_1.default);
/** Rota base /api — eventos culturais (listagem/gestão). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", events_1.default);
/** Rota base /api/books — catálogo de livros. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/books", books_1.default);
/** Rota base /api/badge-assignments — atribuições de badges. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badge-assignments", badge_assignments_1.default);
/** Rota base /api — recomendações. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", recommendations_1.default);
/** Rota base /api — reservas (livros/sessões). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", reservations_1.default);
/** Rota base /api/readings — leituras. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/readings", readings_1.default);
/** Rota base /api/ratings — avaliações. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/ratings", ratings_1.default);
/** Rota base /api/badges — motor de badges (engine). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badges", badges_engine_1.default);
/** Rota base /api/badges — endpoints públicos/consulta de badges. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badges", badges_1.default);
/** Rota base /api/users — gestão de utilizadores. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/users", users_1.default);
/** Rota base /api — gestão de crianças. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", children_1.default);
/** Rota base /api/librarian — famílias (área do bibliotecário). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/librarian", families_1.default);
/** Rota base /api — bibliotecas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", libraries_1.default);
/** Rota base /api — administração: feeds. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminFeeds_1.default);
/** Rota base /api — administração: eventos. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminEvents_1.default);
/** Rota base /api — administração: consultas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminConsultations_1.default);
/** Rota base /api — administração: slots. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminSlots_1.default);
/** Rota base /api — administração: bibliotecários. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminLibrarians_1.default);
/** Rota base /api — administração: bloqueios. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminBlocks_1.default);
/** Rota base /api — administração: famílias. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminFamilies_1.default);
/** Rota base /api — administração: librarian específico. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", admin_librarian_1.default);
/** Rota base /api — administração: métricas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminMetrics_1.adminMetricsRouter);
/** Rota base /api — eventos culturais (externos). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", culturalEvents_1.default);
/** Rota base /api — administração: livros. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminBooks_1.default);
/** Rota base /api — micro-conteúdos. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", microContent_1.default);
/* --------- Ingestão RSS --------- */
/**
 * Arranque assíncrono: faz ingestão inicial de feeds RSS e força recomputação
 * de badges das crianças. Mantém a lógica; adiciona logs semânticos.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
(async () => {
    try {
        console.log("▶️  Ingestão inicial de eventos RSS …");
        await (0, rssService_1.fetchAndUpsertAllFeeds)({ force: true }); // primeira vez ignora TTL
        console.log("✅  Ingestão inicial concluída");
        const res = await (0, badgesEngine_1.recomputeAllChildren)();
        console.log("Badges recomputados:", res);
    }
    catch (e) {
        console.error("❌ Falha na ingestão inicial de RSS:", e);
    }
})();
/* --------- Cron ---------
   Corre de hora a hora; o TTL por feed evita fetchs desnecessários. */
/**
 * Cron 1: de hora a hora — sincroniza RSS e recomputa badges.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
node_cron_1.default.schedule("0 * * * *", async () => {
    try {
        console.log("⏰ Ingestão agendada de eventos RSS …");
        await (0, rssService_1.fetchAndUpsertAllFeeds)(); // respeita TTL
        console.log("✅ Ingestão agendada concluída");
        const res = await (0, badgesEngine_1.recomputeAllChildren)();
        console.log("Badges recomputados:", res);
    }
    catch (e) {
        console.error("❌ Falha na ingestão agendada de RSS:", e);
    }
});
/**
 * Cron 2: diário às 03:15 — recomputa badges independentemente dos feeds.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
node_cron_1.default.schedule("15 3 * * *", async () => {
    const res = await (0, badgesEngine_1.recomputeAllChildren)();
    console.log("Badges recomputados:", res);
});
/* --------- 404 e errors --------- */
/**
 * 404 para qualquer rota /api não encontrada.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
/**
 * Handler global de erros: regista e responde com JSON normalizado.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ error: err?.message || "internal_error" });
});
/**
 * Boot do servidor HTTP.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
const PORT = Number(process.env.PORT || 3333);
app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}/api`);
});
exports.default = app;

/**
 * Ficheiro principal do servidor Express (bootstrap).
 * Autor: Alexandre Brissos 21131
 * Data: 2025-10-02
 * Nota: Não foram removidas nem adicionadas rotas; apenas documentação e comentários.
 */

import "dotenv/config";

/**
 * Importações de base do Express e middlewares de segurança/utilidade.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cron from "node-cron";

// 👇 INTERNOS SEM .js
/**
 * Serviços e routers internos da aplicação.
 * Mantemos a estrutura das rotas intacta.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
import { fetchAndUpsertAllFeeds } from "./services/rssService";
import eventsRouter from "./routes/families/events";
import booksRouter from "./routes/families/books";
import authRouter from "./routes/families/auth";
import authChildRouter from "./routes/families/auth-child";
import badgeAssignmentsRouter from "./routes/families/badge-assignments";
import recommendationsRouter from "./routes/families/recommendations";
import reservationsRouter from "./routes/families/reservations";
import readingsRouter from "./routes/families/readings";
import ratingsRouter from "./routes/families/ratings";
import consultations from "./routes/families/consultations";
import slots from "./routes/families/consultations/slots";
import proposals from "./routes/families/consultations/proposals";
import badgesEngineRouter from "./routes/families/badges-engine";
import { withUser } from "./middlewares/auth";
import { recomputeAllChildren } from "./services/badgesEngine";
import badgesRouter from "./routes/families/badges";
import usersRouter from "./routes/families/users";
import childrenRouter from "./routes/families/children";
import librarianFamilies from "./routes/families/families"; 
import librariesRouter from "./routes/families/libraries";
import adminFeedsRouter from "./routes/admin/adminFeeds";
import adminEventsRouter from "./routes/admin/adminEvents";
import adminConsultationsRoutes from "./routes/admin/adminConsultations";
import adminSlotsRoutes from "./routes/admin/adminSlots";
import adminLibrariansRoutes from "./routes/admin/adminLibrarians";
import adminBlocksRoutes from "./routes/admin/adminBlocks";
import adminFamiliesRoutes from "./routes/admin/adminFamilies";
import adminLibrariansRouter from "./routes/admin/admin.librarian";
import { adminMetricsRouter } from "./routes/admin/adminMetrics";
import culturalEventsRouter from "./routes/families/culturalEvents";
import adminBooksRouter from "./routes/admin/adminBooks";
import publicRouter from "./routes/families/public.js";
import microContentRoutes from "./routes/families/microContent";

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
const app = express();

/**
 * Middlewares globais de segurança e parsing:
 * - helmet: cabeçalhos de segurança
 * - cookieParser: leitura de cookies
 * - express.json: parsing de JSON com limite para evitar payloads grandes
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

/**
 * Configuração de CORS com suporte a credenciais.
 * allowedOrigins vem de ALLOWED_ORIGINS (CSV) ou recorre a defaults locais.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
const DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5558", "http://127.0.0.1:5558"];
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? DEFAULT_ORIGINS;

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/**
 * Healthcheck: confirma que a API está operacional.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/**
 * Rota base pública — endpoints que não exigem sessão.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use("/api/public", publicRouter);

/* --------- Rotas (sem /v1) --------- */
/** Rota base /api/auth — autenticação geral. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/auth", authRouter);
/** Rota base /api — autenticação de criança (subconjunto). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", authChildRouter);

/**
 * Middleware withUser aplica-se a partir daqui para rotas autenticadas.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
app.use("/api", withUser);

/** Rota base /api/consultations — consultas e gestão associada. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", consultations); // /api/consultations/...
/** Rota base /api/consultations — slots de agendamento. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", slots); // /api/consultations/slots, /api/consultations/librarians/:id/slots, etc.
/** Rota base /api/consultations — propostas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/consultations", proposals);

/** Rota base /api — eventos culturais (listagem/gestão). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", eventsRouter);
/** Rota base /api/books — catálogo de livros. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/books", booksRouter);
/** Rota base /api/badge-assignments — atribuições de badges. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badge-assignments", badgeAssignmentsRouter);
/** Rota base /api — recomendações. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", recommendationsRouter);
/** Rota base /api — reservas (livros/sessões). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", reservationsRouter);
/** Rota base /api/readings — leituras. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/readings", readingsRouter);
/** Rota base /api/ratings — avaliações. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/ratings", ratingsRouter);
/** Rota base /api/badges — motor de badges (engine). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badges", badgesEngineRouter);
/** Rota base /api/badges — endpoints públicos/consulta de badges. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/badges", badgesRouter);
/** Rota base /api/users — gestão de utilizadores. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/users", usersRouter);
/** Rota base /api — gestão de crianças. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", childrenRouter);
/** Rota base /api/librarian — famílias (área do bibliotecário). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api/librarian", librarianFamilies);
/** Rota base /api — bibliotecas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", librariesRouter);

/** Rota base /api — administração: feeds. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminFeedsRouter);
/** Rota base /api — administração: eventos. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminEventsRouter);
/** Rota base /api — administração: consultas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminConsultationsRoutes);
/** Rota base /api — administração: slots. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminSlotsRoutes);
/** Rota base /api — administração: bibliotecários. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminLibrariansRoutes);
/** Rota base /api — administração: bloqueios. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminBlocksRoutes);
/** Rota base /api — administração: famílias. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminFamiliesRoutes);
/** Rota base /api — administração: librarian específico. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminLibrariansRouter);
/** Rota base /api — administração: métricas. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminMetricsRouter);
/** Rota base /api — eventos culturais (externos). — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", culturalEventsRouter);
/** Rota base /api — administração: livros. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", adminBooksRouter);
/** Rota base /api — micro-conteúdos. — Alexandre Brissos 21131 — 2025-10-02 */
app.use("/api", microContentRoutes);

/* --------- Ingestão RSS --------- */
/**
 * Arranque assíncrono: faz ingestão inicial de feeds RSS e força recomputação
 * de badges das crianças. Mantém a lógica; adiciona logs semânticos.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
(async () => {
  try {
    console.log("▶️  Ingestão inicial de eventos RSS …");
    await fetchAndUpsertAllFeeds({ force: true }); // primeira vez ignora TTL
    console.log("✅  Ingestão inicial concluída");

    const res = await recomputeAllChildren();
    console.log("Badges recomputados:", res);
  } catch (e) {
    console.error("❌ Falha na ingestão inicial de RSS:", e);
  }
})();

/* --------- Cron ---------
   Corre de hora a hora; o TTL por feed evita fetchs desnecessários. */
/**
 * Cron 1: de hora a hora — sincroniza RSS e recomputa badges.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
cron.schedule("0 * * * *", async () => {
  try {
    console.log("⏰ Ingestão agendada de eventos RSS …");
    await fetchAndUpsertAllFeeds(); // respeita TTL
    console.log("✅ Ingestão agendada concluída");

    const res = await recomputeAllChildren();
    console.log("Badges recomputados:", res);
  } catch (e) {
    console.error("❌ Falha na ingestão agendada de RSS:", e);
  }
});

/**
 * Cron 2: diário às 03:15 — recomputa badges independentemente dos feeds.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
cron.schedule("15 3 * * *", async () => {
  const res = await recomputeAllChildren();
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
app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Unhandled error:", err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({ error: err?.message || "internal_error" });
  }
);

/**
 * Boot do servidor HTTP.
 * — Alexandre Brissos 21131 — 2025-10-02
 */
const PORT = Number(process.env.PORT || 3333);
app.listen(PORT, () => {
  console.log(`API a correr em http://localhost:${PORT}/api`);
});

export default app;

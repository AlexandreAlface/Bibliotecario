// apps/api/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cron from "node-cron";

import { fetchAndUpsertAllFeeds } from "./services/rssService.js";
import eventsRouter from "./routes/events.js";
import booksRouter from "./routes/books.js";
import authRouter from "./routes/auth.js";
import authChildRouter from "./routes/auth-child.js";
import badgeAssignmentsRouter from "./routes/badge-assignments.js";
import recommendationsRouter from "./routes/recommendations.js";
import reservationsRouter from "./routes/reservations.js";
import readingsRouter from "./routes/readings.js";
import ratingsRouter from "./routes/ratings.js";
import slots from "./routes/consultations/slots.js";
import proposals from "./routes/consultations/proposals.js";
import consultations from "./routes/consultations/consultations.js";
import badgesEngineRouter from "./routes/badges-engine";
import { withUser } from "./middlewares/auth.js";
import { recomputeAllChildren } from "./services/badgesEngine.js";
import badgesRouter from './routes/badges.js';
import usersRouter from "./routes/users.js";
import childrenRouter from "./routes/children.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não carregada. Verifica apps/api/.env");
  process.exit(1);
}

const app = express();

// Segurança / parsing
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// CORS (com credenciais)
const DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? DEFAULT_ORIGINS;

app.use(
  cors({
    origin(origin, cb) {
      // permitir chamadas sem Origin (apps nativas/curl) e as da lista
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* --------- Rotas (sem /v1) --------- */
app.use("/api/auth", authRouter);
app.use("/api", authChildRouter);

app.use("/api", withUser);

app.use("/api/consultations", consultations); // /api/consultations/...
app.use("/api/consultations", slots); // /api/consultations/slots, /api/consultations/librarians/:id/slots, etc.
app.use("/api", proposals);
app.use("/api", eventsRouter);
app.use("/api", booksRouter);
app.use("/api/badge-assignments", badgeAssignmentsRouter);
app.use("/api", recommendationsRouter);
app.use("/api", reservationsRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/badges", badgesEngineRouter);
app.use('/api/badges', badgesRouter);
app.use("/api/users", usersRouter);
app.use("/api", childrenRouter);

/* --------- Ingestão RSS --------- */
(async () => {
  try {
    console.log("▶️  Ingestão manual de eventos RSS …");
    await fetchAndUpsertAllFeeds();
    await recomputeAllChildren();
    console.log("✅  Ingestão concluída");
  } catch (e) {
    console.error("❌ Falha na ingestão inicial de RSS:", e);
  }
})();

// Cron às 00:00 de 2 em 2 dias
cron.schedule("0 0 */2 * *", async () => {
  try {
    console.log("⏰ Iniciando ingestão agendada de eventos RSS …");
    await fetchAndUpsertAllFeeds();
    console.log("✅ Ingestão agendada concluída");
  } catch (e) {
    console.error("❌ Falha na ingestão agendada de RSS:", e);
  }
});

cron.schedule("15 3 * * *", async () => {
  const res = await recomputeAllChildren();
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

export default app;

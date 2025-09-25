import "dotenv/config";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cron from "node-cron";

// 👇 INTERNOS SEM .js
import { fetchAndUpsertAllFeeds } from "./services/rssService";
import eventsRouter from "./routes/events";
import booksRouter from "./routes/books";
import authRouter from "./routes/auth";
import authChildRouter from "./routes/auth-child";
import badgeAssignmentsRouter from "./routes/badge-assignments";
import recommendationsRouter from "./routes/recommendations";
import reservationsRouter from "./routes/reservations";
import readingsRouter from "./routes/readings";
import ratingsRouter from "./routes/ratings";
import slots from "./routes/consultations/slots";
import proposals from "./routes/consultations/proposals";
import consultations from "./routes/consultations/consultations";
import badgesEngineRouter from "./routes/badges-engine";
import { withUser } from "./middlewares/auth";
import { recomputeAllChildren } from "./services/badgesEngine";
import badgesRouter from "./routes/badges";
import usersRouter from "./routes/users";
import childrenRouter from "./routes/children";
import librarianFamilies from "./routes/families"; // <<< sem /index.js
import librariesRouter from "./routes/libraries";
import adminFeedsRouter from "./routes/adminFeeds";
import adminEventsRouter from "./routes/adminEvents";
import adminConsultationsRoutes from "./routes/adminConsultations";
import adminSlotsRoutes from "./routes/adminSlots";
import adminLibrariansRoutes from "./routes/adminLibrarians";
import adminBlocksRoutes from "./routes/adminBlocks";
import adminFamiliesRoutes from "./routes/adminFamilies";
import adminLibrariansRouter from "./routes/admin.librarian";
import { adminMetricsRouter } from "./routes/adminMetrics";
import culturalEventsRouter from "./routes/culturalEvents";
import adminBooksRouter from "./routes/adminBooks";
import publicRouter from "./routes/public.js"; 


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
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/public", publicRouter);


/* --------- Rotas (sem /v1) --------- */
app.use("/api/auth", authRouter);
app.use("/api", authChildRouter);

app.use("/api", withUser);

app.use("/api/consultations", consultations); // /api/consultations/...
app.use("/api/consultations", slots); // /api/consultations/slots, /api/consultations/librarians/:id/slots, etc.
app.use("/api/consultations", proposals);
app.use("/api", eventsRouter);
app.use("/api", booksRouter);
app.use("/api/badge-assignments", badgeAssignmentsRouter);
app.use("/api", recommendationsRouter);
app.use("/api", reservationsRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/badges", badgesEngineRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/users", usersRouter);
app.use("/api", childrenRouter);
app.use("/api/librarian", librarianFamilies);
app.use("/api", librariesRouter);
app.use("/api", adminFeedsRouter);
app.use("/api", adminEventsRouter);
app.use("/api", adminConsultationsRoutes);
app.use("/api", adminSlotsRoutes);
app.use("/api", adminLibrariansRoutes);
app.use("/api", adminBlocksRoutes);
app.use("/api", adminFamiliesRoutes);
app.use("/api", adminLibrariansRouter);
app.use("/api", adminMetricsRouter);
app.use("/api", culturalEventsRouter);
app.use("/api", adminBooksRouter);


/* --------- Ingestão RSS --------- */
(async () => {
  try {
    console.log("▶️  Ingestão inicial de eventos RSS …");
    await fetchAndUpsertAllFeeds({ force: true }); // primeira vez ignora TTL
    console.log("✅  Ingestão inicial concluída");
  } catch (e) {
    console.error("❌ Falha na ingestão inicial de RSS:", e);
  }
})();

/* --------- Cron ---------
   Corre de hora a hora; o TTL por feed evita fetchs desnecessários. */
cron.schedule("0 * * * *", async () => {
  try {
    console.log("⏰ Ingestão agendada de eventos RSS …");
    await fetchAndUpsertAllFeeds(); // respeita TTL
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

// Boot
const PORT = Number(process.env.PORT || 3333);
app.listen(PORT, () => {
  console.log(`API a correr em http://localhost:${PORT}/api`);
});

export default app;

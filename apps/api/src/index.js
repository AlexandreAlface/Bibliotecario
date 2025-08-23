import express from "express";
import cron from "node-cron";
import { fetchAndUpsertAllFeeds } from "./services/rssService.js";
import eventsRouter from "./routes/events.js";
import booksRouter from "./routes/books.js";
import authRouter from "./routes/auth.js";
import authChildRouter from "./routes/auth-child.js";
import consultationsRouter from "./routes/consultations.js";
import readingsRouter from "./routes/readings.js";
import badgeAssignmentsRouter from "./routes/badge-assignments.js";
import recommendations from "./routes/recommendations.js";
import reservationsRouter from "./routes/reservations.js";
import "dotenv/config";

import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não carregada. Verifica apps/api/.env");
  process.exit(1);
}

const ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

const app = express();
app.use(express.json({ limit: "1mb" }));

// Segurança / parsing
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS com credenciais (cookies)
const corsOptions = { origin: ORIGINS, credentials: true };
app.use(cors(corsOptions)); // <-- isto já trata os preflight OPTIONS também

// Rotas
app.use("/api", eventsRouter);
app.use("/api", booksRouter);
app.use('/api/auth', authRouter);
app.use('/api', authChildRouter);
app.use("/api/consultations", consultationsRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/badge-assignments", badgeAssignmentsRouter);
app.use("/api", recommendations);
app.use("/api", reservationsRouter);


// Ingestão manual no arranque (RSS)
(async () => {
  console.log("▶️  Ingestão manual de eventos RSS …");
  await fetchAndUpsertAllFeeds();
  console.log("✅  Ingestão concluída");
})();

// Cron para 00:00 de 2 em 2 dias
cron.schedule("0 0 */2 * *", async () => {
  console.log("⏰ Iniciando ingestão agendada de eventos RSS …");
  await fetchAndUpsertAllFeeds();
  console.log("✅ Ingestão agendada concluída");
});

app.listen(3333, () => {
  console.log("API a correr em http://localhost:3333/api");
});

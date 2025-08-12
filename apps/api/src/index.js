import express from 'express';
import cron from 'node-cron';
import { fetchAndUpsertAllFeeds } from './services/rssService.js';
import eventsRouter from './routes/events.js';
import booksRouter  from './routes/books.js';
import badgesRouter from './routes/badges.js';
import authRouter   from './routes/auth.js';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const app = express();

// Segurança / parsing
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS com credenciais (cookies)
const corsOptions = { origin: ORIGINS, credentials: true };
app.use(cors(corsOptions));         // <-- isto já trata os preflight OPTIONS também

// Rotas
app.use('/api', eventsRouter);
app.use('/api', booksRouter);
app.use('/api', badgesRouter);
app.use('/api/auth', authRouter);

// Ingestão manual no arranque (RSS)
(async () => {
  console.log('▶️  Ingestão manual de eventos RSS …');
  await fetchAndUpsertAllFeeds();
  console.log('✅  Ingestão concluída');
})();

// Cron para 00:00 de 2 em 2 dias
cron.schedule('0 0 */2 * *', async () => {
  console.log('⏰ Iniciando ingestão agendada de eventos RSS …');
  await fetchAndUpsertAllFeeds();
  console.log('✅ Ingestão agendada concluída');
});

app.listen(3333, () => {
  console.log('API a correr em http://localhost:3333/api');
});

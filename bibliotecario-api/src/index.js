import express from 'express';
import cron from 'node-cron';
import { fetchAndUpsertAllFeeds } from './services/rssService.js';
import eventsRouter from './routes/events.js';
import booksRouter  from './routes/books.js';
import badgesRouter from './routes/badges.js';

const app = express();

// ... configurações de middleware, rotas, etc.
app.use('/api', eventsRouter);
app.use('/api', booksRouter);
app.use('/api', badgesRouter);

// Chamada manual para testar
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

// src/services/rssService.js
import Parser from 'rss-parser';
import axios from 'axios';
import { prisma } from '../prisma.js';

const parser = new Parser({
  customFields: {
    item: [
      // namespace "ev" para enddate e location
      ['ev:enddate',   'evEndDate'],
      ['ev:location',  'evLocation'],
      // tag simple <category>
      ['category',     'category']
    ]
  }
});

function mapItem(item, feedId) {
  // converte se existir, caso contrário null
  const endDate   = item.evEndDate  ? new Date(item.evEndDate)   : null;
  const location  = item.evLocation || item.link;   // fallback para link
  const category  = item.category   || null;

  return {
    where: { guid: item.guid },
    update: {
      title:       item.title,
      description: item.contentSnippet || item.content,
      pubDate:     item.isoDate ? new Date(item.isoDate) : undefined,
      startDate:   item.isoDate ? new Date(item.isoDate) : new Date(),
      endDate,
      location,
      category
    },
    create: {
      feedId,
      guid:        item.guid,
      title:       item.title,
      description: item.contentSnippet || item.content,
      pubDate:     item.isoDate ? new Date(item.isoDate) : undefined,
      startDate:   item.isoDate ? new Date(item.isoDate) : new Date(),
      endDate,
      location,
      category,
      capacity: null
    }
  };
}

export async function fetchAndUpsertAllFeeds() {
  const feeds = await prisma.feedRss.findMany();

  for (const feed of feeds) {
    try {
      // 1. Requisição condicional
      const headers = feed.lastBuildDate
        ? { 'If-Modified-Since': feed.lastBuildDate.toUTCString() }
        : {};

      const response = await axios.get(feed.url, { headers });
      if (response.status !== 200) continue;

      // 2. Parse RSS
      const rss = await parser.parseString(response.data);

      // 3. Upsert de cada item
      for (const item of rss.items) {
        await prisma.culturalEvent.upsert(mapItem(item, feed.id));
      }

      // 4. Atualizar lastBuildDate
      await prisma.feedRss.update({
        where: { id: feed.id },
        data:  { lastBuildDate: new Date(rss.lastBuildDate || Date.now()) }
      });
    } catch (err) {
      console.error(`Erro no feed ${feed.url}:`, err.message);
    }
  }
}

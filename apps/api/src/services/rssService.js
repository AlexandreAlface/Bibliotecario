// src/services/rssService.js
import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../prisma.js';

const parser = new Parser({
  customFields: {
    item: [
      // namespace "ev" para enddate e location
      ['ev:enddate',   'evEndDate'],
      ['ev:location',  'evLocation'],
      // tag simple <category>
      ['category',     'category'],
      // imagens mais comuns em RSS
      ['media:content',   'mediaContent',   { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['enclosure',       'enclosure'],
      ['itunes:image',    'itunesImage'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// normaliza URL relativa para absoluta
function toAbs(url, base) {
  try { return new URL(url, base).href; } catch { return url; }
}

// tenta extrair URL de imagem do próprio item RSS
function pickImageFromItem(item, feedBaseUrl) {
  // 1) <media:content url="...">
  const media = item?.mediaContent?.find?.((m) => m?.$?.url);
  if (media?.$?.url) return toAbs(media.$.url, feedBaseUrl);

  // 2) <media:thumbnail url="...">
  const thumb = item?.mediaThumbnail?.find?.((m) => m?.$?.url);
  if (thumb?.$?.url) return toAbs(thumb.$.url, feedBaseUrl);

  // 3) <enclosure url="...">
  if (item?.enclosure?.url) return toAbs(item.enclosure.url, feedBaseUrl);

  // 4) <itunes:image href="...">
  if (item?.itunesImage?.href) return toAbs(item.itunesImage.href, feedBaseUrl);
  if (typeof item?.itunesImage === 'string') return toAbs(item.itunesImage, feedBaseUrl);

  // 5) primeira <img src="..."> no HTML
  const html = item?.contentEncoded || item?.content || item?.summary || '';
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m?.[1]) return toAbs(m[1], feedBaseUrl);

  return null;
}

// fallback: abre a página e tenta meta og:image/twitter:image
async function fetchOgImage(link) {
  try {
    if (!link) return null;
    const res = await axios.get(link, { maxRedirects: 3, responseType: 'text' });
    if (res.status !== 200) return null;
    const $ = cheerio.load(res.data);
    const og = $('meta[property="og:image"]').attr('content')
          || $('meta[name="twitter:image"]').attr('content');
    return og || null;
  } catch {
    return null;
  }
}

async function imageForItem(item, feedUrl) {
  const base = new URL(feedUrl).origin;
  return pickImageFromItem(item, base) || (await fetchOgImage(item.link));
}

function mapItem(item, feedId, imageUrl) {
  const endDate   = item.evEndDate ? new Date(item.evEndDate) : null;
  const location  = item.evLocation || item.link || null;
  const category  = item.category || null;
  const pubDate   = item.isoDate ? new Date(item.isoDate) : undefined;
  const startDate = item.isoDate ? new Date(item.isoDate) : new Date();
  const guid      = item.guid || item.link; // garante guid

  // só atualizamos imageUrl se tivermos uma nova; caso contrário mantemos a existente
  const updateData = {
    title:       item.title,
    description: item.contentSnippet || item.content || null,
    pubDate,
    startDate,
    endDate,
    location,
    category,
    ...(imageUrl ? { imageUrl } : {}), // <-- só define se existir
  };

  const createData = {
    feedId,
    guid,
    title:       item.title,
    description: item.contentSnippet || item.content || null,
    pubDate,
    startDate,
    endDate,
    location,
    category,
    capacity: null,
    imageUrl: imageUrl || undefined,
  };

  return {
    where: { guid },
    update: updateData,
    create: createData,
  };
}

export async function fetchAndUpsertAllFeeds() {
  const feeds = await prisma.feedRss.findMany();

  for (const feed of feeds) {
    try {
      // 1) Requisição condicional
      const headers = feed.lastBuildDate
        ? { 'If-Modified-Since': feed.lastBuildDate.toUTCString() }
        : {};

      const response = await axios.get(feed.url, { headers, responseType: 'text' });
      if (response.status !== 200) continue;

      // 2) Parse RSS
      const rss = await parser.parseString(response.data);

      // 3) Upsert de cada item com imageUrl
      for (const item of rss.items) {
        const img = await imageForItem(item, feed.url);
        await prisma.culturalEvent.upsert(mapItem(item, feed.id, img));
      }

      // 4) Atualizar lastBuildDate
      await prisma.feedRss.update({
        where: { id: feed.id },
        data:  { lastBuildDate: new Date(rss.lastBuildDate || Date.now()) }
      });
    } catch (err) {
      console.error(`Erro no feed ${feed.url}:`, err.message);
    }
  }
}

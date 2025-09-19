// apps/api/src/services/rssService.ts
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../prisma.js";
import type { FeedRss } from "@prisma/client";

const parser = new Parser({
  customFields: {
    item: [
      ["ev:enddate", "evEndDate"],
      ["ev:location", "evLocation"],
      ["category", "category"],
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["enclosure", "enclosure"],
      ["itunes:image", "itunesImage"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

const MINUTE = 60 * 1000;

function toAbs(url?: string, base?: string) {
  try {
    return url ? new URL(url, base).href : null;
  } catch {
    return url ?? null;
  }
}

function pickImageFromItem(item: any, feedBaseUrl?: string | null) {
  const media = item?.mediaContent?.find?.((m: any) => m?.$?.url)?.$?.url;
  if (media) return toAbs(media, feedBaseUrl || undefined);

  const thumb = item?.mediaThumbnail?.find?.((m: any) => m?.$?.url)?.$?.url;
  if (thumb) return toAbs(thumb, feedBaseUrl || undefined);

  if (item?.enclosure?.url)
    return toAbs(item.enclosure.url, feedBaseUrl || undefined);

  if (item?.itunesImage?.href)
    return toAbs(item.itunesImage.href, feedBaseUrl || undefined);
  if (typeof item?.itunesImage === "string")
    return toAbs(item.itunesImage, feedBaseUrl || undefined);

  const html = String(
    item?.contentEncoded || item?.content || item?.summary || ""
  );
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m?.[1]) return toAbs(m[1], feedBaseUrl || undefined);

  return null;
}

async function fetchOgImage(link?: string | null) {
  try {
    if (!link) return null;
    const res = await axios.get(link, {
      maxRedirects: 3,
      responseType: "text",
      validateStatus: () => true,
    });
    if (res.status !== 200) return null;
    const $ = cheerio.load(res.data);
    return (
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null
    );
  } catch {
    return null;
  }
}

async function imageForItem(item: any, feedUrl: string) {
  let origin: string | undefined;
  try {
    origin = new URL(feedUrl).origin;
  } catch {
    origin = undefined;
  }
  return pickImageFromItem(item, origin) || (await fetchOgImage(item.link));
}

// >>> garante que o feedId fica atualizado mesmo em updates
function mapItem(item: any, feedId: number, imageUrl: string | null) {
  const guid = item.guid || item.link;
  const endDate = item.evEndDate ? new Date(item.evEndDate) : null;
  const location = item.evLocation || item.link || null;
  const category = item.category || null;
  const pubDate = item.isoDate ? new Date(item.isoDate) : undefined;
  const startDate = item.isoDate ? new Date(item.isoDate) : new Date();

  return {
    where: { guid },
    update: {
      feedId, // <— importante!
      title: item.title,
      description: item.contentSnippet || item.content || null,
      pubDate,
      startDate,
      endDate,
      location,
      category,
      ...(imageUrl ? { imageUrl } : {}),
    },
    create: {
      feedId,
      guid,
      title: item.title,
      description: item.contentSnippet || item.content || null,
      pubDate,
      startDate,
      endDate,
      location,
      category,
      capacity: null,
      imageUrl: imageUrl || undefined,
    },
  };
}

// processa um feed (respeitando TTL e If-Modified-Since)
async function processFeed(feed: FeedRss, force: boolean) {
  // TTL por feed
  if (!force && feed.ttl && feed.lastBuildDate) {
    const ms = feed.ttl * MINUTE;
    if (Date.now() - new Date(feed.lastBuildDate).getTime() < ms) {
      return { feedId: feed.id, skippedByTTL: true, upserts: 0 };
    }
  }

  const headers =
    !force && feed.lastBuildDate
      ? { "If-Modified-Since": new Date(feed.lastBuildDate).toUTCString() }
      : {};

  const resp = await axios.get<string>(feed.url, {
    headers,
    responseType: "text",
    validateStatus: () => true,
  });

  if (resp.status === 304) {
    return { feedId: feed.id, notModified: true, upserts: 0 };
  }
  if (resp.status !== 200 || !resp.data) {
    console.warn(`Feed ${feed.id} (${feed.url}) devolveu ${resp.status}`);
    return { feedId: feed.id, error: `HTTP ${resp.status}`, upserts: 0 };
  }

  const rss = await parser.parseString(resp.data);
  let upserts = 0;

  for (const item of rss.items) {
    const img = await imageForItem(item, feed.url);
    await prisma.culturalEvent.upsert(mapItem(item, feed.id, img));
    upserts++;
  }

  await prisma.feedRss.update({
    where: { id: feed.id },
    data: {
      lastBuildDate: rss.lastBuildDate
        ? new Date(rss.lastBuildDate)
        : new Date(),
    },
  });

  return { feedId: feed.id, upserts };
}

// PUBLIC: corre todos os feeds (opcionalmente só de uma biblioteca)
export async function fetchAndUpsertAllFeeds(
  opts: { force?: boolean; libraryId?: number } = {}
) {
  const { force = false, libraryId } = opts;
  const feeds = await prisma.feedRss.findMany({
    where: libraryId ? { libraryId } : undefined,
  });

  const results = [];
  for (const f of feeds) {
    try {
      results.push(await processFeed(f, force));
    } catch (e: any) {
      console.error(`Erro no feed #${f.id}:`, e?.message || e);
      results.push({
        feedId: f.id,
        error: e?.message || String(e),
        upserts: 0,
      });
    }
  }
  return results;
}

// PUBLIC: corre apenas um feed (é o que o /admin/feeds usa)
export async function fetchAndUpsertFeed(
  feedId: number,
  opts: { force?: boolean } = {}
) {
  const { force = false } = opts;
  const feed = await prisma.feedRss.findUnique({ where: { id: feedId } });
  if (!feed) throw new Error(`Feed ${feedId} não encontrado`);
  return processFeed(feed, force);
}

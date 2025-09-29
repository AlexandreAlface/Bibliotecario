"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndUpsertAllFeeds = fetchAndUpsertAllFeeds;
exports.fetchAndUpsertFeed = fetchAndUpsertFeed;
// apps/api/src/services/rssService.ts
const rss_parser_1 = __importDefault(require("rss-parser"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const prisma_js_1 = require("../prisma.js");
const parser = new rss_parser_1.default({
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
function toAbs(url, base) {
    try {
        return url ? new URL(url, base).href : null;
    }
    catch {
        return url ?? null;
    }
}
function pickImageFromItem(item, feedBaseUrl) {
    const media = item?.mediaContent?.find?.((m) => m?.$?.url)?.$?.url;
    if (media)
        return toAbs(media, feedBaseUrl || undefined);
    const thumb = item?.mediaThumbnail?.find?.((m) => m?.$?.url)?.$?.url;
    if (thumb)
        return toAbs(thumb, feedBaseUrl || undefined);
    if (item?.enclosure?.url)
        return toAbs(item.enclosure.url, feedBaseUrl || undefined);
    if (item?.itunesImage?.href)
        return toAbs(item.itunesImage.href, feedBaseUrl || undefined);
    if (typeof item?.itunesImage === "string")
        return toAbs(item.itunesImage, feedBaseUrl || undefined);
    const html = String(item?.contentEncoded || item?.content || item?.summary || "");
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m?.[1])
        return toAbs(m[1], feedBaseUrl || undefined);
    return null;
}
async function fetchOgImage(link) {
    try {
        if (!link)
            return null;
        const res = await axios_1.default.get(link, {
            maxRedirects: 3,
            responseType: "text",
            validateStatus: () => true,
        });
        if (res.status !== 200)
            return null;
        const $ = cheerio.load(res.data);
        return ($('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            null);
    }
    catch {
        return null;
    }
}
async function imageForItem(item, feedUrl) {
    let origin;
    try {
        origin = new URL(feedUrl).origin;
    }
    catch {
        origin = undefined;
    }
    return pickImageFromItem(item, origin) || (await fetchOgImage(item.link));
}
/**
 * Resolve um GUID “final” seguro para o item do feed.
 * Se existir um evento **manual** com o mesmo GUID (feedId == null),
 * NÃO o tocamos; em vez disso, “namespacemos” o GUID do feed para
 * `${guidBase}#rss:${feedId}` garantindo unicidade e preservação do manual.
 */
async function resolveSafeGuidForFeedItem(item, feedId) {
    const base = (typeof item?.guid === "string" && item.guid) ||
        (typeof item?.link === "string" && item.link) ||
        (typeof item?.title === "string" && item.title) ||
        null;
    // fallback determinístico caso base seja nulo (situação rara em RSS)
    const fallback = base ||
        `rss:${feedId}:${String(item?.isoDate ?? "")}:${String(item?.link ?? item?.title ?? "")}`;
    try {
        const existing = await prisma_js_1.prisma.culturalEvent.findUnique({
            where: { guid: fallback },
            select: { id: true, feedId: true }, // apenas o necessário
        });
        if (existing && existing.feedId == null) {
            // Colisão com evento MANUAL → não tocar nesse registo.
            return `${fallback}#rss:${feedId}`;
        }
    }
    catch {
        // Qualquer erro aqui não deve bloquear ingestão; seguimos com fallback
    }
    return fallback;
}
// >>> garante que o feedId fica atualizado mesmo em updates
function mapItemWithGuid(item, feedId, imageUrl, finalGuid) {
    const endDate = item.evEndDate ? new Date(item.evEndDate) : null;
    const location = item.evLocation || item.link || null;
    const category = item.category || null;
    const pubDate = item.isoDate ? new Date(item.isoDate) : undefined;
    const startDate = item.isoDate ? new Date(item.isoDate) : new Date();
    return {
        where: { guid: finalGuid },
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
            guid: finalGuid,
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
async function processFeed(feed, force) {
    // TTL por feed
    if (!force && feed.ttl && feed.lastBuildDate) {
        const ms = feed.ttl * MINUTE;
        if (Date.now() - new Date(feed.lastBuildDate).getTime() < ms) {
            return { feedId: feed.id, skippedByTTL: true, upserts: 0 };
        }
    }
    const headers = !force && feed.lastBuildDate
        ? { "If-Modified-Since": new Date(feed.lastBuildDate).toUTCString() }
        : {};
    const resp = await axios_1.default.get(feed.url, {
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
        // 👇 NOVO: impedir que itens do feed “roubem”/apaguem eventos manuais
        const finalGuid = await resolveSafeGuidForFeedItem(item, feed.id);
        await prisma_js_1.prisma.culturalEvent.upsert(mapItemWithGuid(item, feed.id, img, finalGuid));
        upserts++;
    }
    await prisma_js_1.prisma.feedRss.update({
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
async function fetchAndUpsertAllFeeds(opts = {}) {
    const { force = false, libraryId } = opts;
    const feeds = await prisma_js_1.prisma.feedRss.findMany({
        where: libraryId ? { libraryId } : undefined,
    });
    const results = [];
    for (const f of feeds) {
        try {
            results.push(await processFeed(f, force));
        }
        catch (e) {
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
async function fetchAndUpsertFeed(feedId, opts = {}) {
    const { force = false } = opts;
    const feed = await prisma_js_1.prisma.feedRss.findUnique({ where: { id: feedId } });
    if (!feed)
        throw new Error(`Feed ${feedId} não encontrado`);
    return processFeed(feed, force);
}

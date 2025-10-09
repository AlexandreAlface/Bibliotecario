"use strict";
/**
 * Admin — importação e gestão de livros.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Rotas mantidas; limpeza, helpers puros e comentários.
 */
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
// apps/api/src/routes/adminBooks.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_js_1 = require("../../prisma.js");
const client_1 = require("@prisma/client");
const embeddings_js_1 = require("../../ai/embeddings.js");
const utils_js_1 = require("../../reco/utils.js");
const r = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * Middleware de autenticação hard-fail para endpoints admin.
 * — Alexandre Brissos — 2025-10-02
 */
function requireUser(req, res) {
    if (!req.user) {
        res.status(401).json({ error: "unauthenticated" });
        throw new Error("unauthenticated");
    }
}
// -------------------- Utils (puros) --------------------
/** Normaliza ISBN para dígitos + X. — Alexandre Brissos — 2025-10-02 */
function normalizeIsbn(s) {
    if (s == null)
        return "";
    const raw = String(s).trim();
    return raw.replace(/[^0-9xX]/g, "");
}
/** Normaliza faixa etária livre. — Alexandre Brissos — 2025-10-02 */
function normalizeAgeRange(s) {
    if (!s)
        return {
            ageMin: null,
            ageMax: null,
            ageRange: null,
        };
    const txt = String(s)
        .toLowerCase()
        .replace(/anos?/g, "")
        .replace(/[–—_x]/g, "-")
        .replace(/\ba\b/g, "-")
        .replace(/\s+/g, "")
        .trim();
    const m = txt.match(/(\d{1,2})(?:\D+)?(\d{1,2})?/);
    if (!m)
        return { ageMin: null, ageMax: null, ageRange: s.trim() };
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    return {
        ageMin: Math.min(a, b),
        ageMax: Math.max(a, b),
        ageRange: `${Math.min(a, b)}-${Math.max(a, b)}`,
    };
}
/** Extrai ano AAAA de texto. — Alexandre Brissos — 2025-10-02 */
function extractYear(s) {
    if (!s)
        return null;
    const m = String(s).match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : null;
}
/** Sleep assíncrono. — Alexandre Brissos — 2025-10-02 */
function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}
/** Executor com concorrência fixa. — Alexandre Brissos — 2025-10-02 */
async function withConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let i = 0;
    const workers = new Array(Math.min(limit, items.length))
        .fill(0)
        .map(async () => {
        while (true) {
            const idx = i++;
            if (idx >= items.length)
                break;
            results[idx] = await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
    return results;
}
/** SHA256 para conteúdo de embeddings. — Alexandre Brissos — 2025-10-02 */
function sha256(s) {
    return node_crypto_1.default.createHash("sha256").update(s, "utf8").digest("hex");
}
/** Texto canónico para embedding de livro. — Alexandre Brissos — 2025-10-02 */
function buildBookEmbeddingText(b) {
    const parts = [b.title, b.author, b.collection, b.category, b.summary]
        .filter(Boolean)
        .map(String);
    return parts.join("\n\n").slice(0, 8000);
}
/** Absolutiza URL relativa e força HTTPS. — Alexandre Brissos — 2025-10-02 */
function absolutize(src, baseUrl) {
    try {
        if (!src)
            return undefined;
        if (/^https?:\/\//i.test(src))
            return src;
        if (src.startsWith("//"))
            return "https:" + src;
        const u = new URL(baseUrl);
        return `${u.protocol}//${u.host}${src.startsWith("/") ? src : "/" + src}`;
    }
    catch {
        return src;
    }
}
/** Força https://. — Alexandre Brissos — 2025-10-02 */
function forceHttps(u) {
    return u ? u.replace(/^http:\/\//i, "https://") : u;
}
// -------------------- Embeddings (efeitos) --------------------
/** Garante colunas de embedding na tabela Book (idempotente). — Alexandre Brissos — 2025-10-02 */
async function ensureEmbeddingSchema() {
    try {
        await prisma_js_1.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    }
    catch { }
    try {
        await prisma_js_1.prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);`);
    }
    catch { }
    try {
        await prisma_js_1.prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text;`);
    }
    catch { }
    try {
        await prisma_js_1.prisma.$executeRawUnsafe(`ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz;`);
    }
    catch { }
}
/** Re-embed por ISBN (idempotente via hash). — Alexandre Brissos — 2025-10-02 */
async function reembedByIsbns(isbns, opts) {
    await ensureEmbeddingSchema();
    const uniq = Array.from(new Set(isbns.map(normalizeIsbn))).filter(Boolean);
    let ok = 0, fail = 0;
    await withConcurrency(uniq, Math.max(1, Math.min(8, Number(opts?.concurrency ?? 4))), async (isbn) => {
        const rows = await prisma_js_1.prisma.$queryRaw `
      SELECT "isbn","title","author","summary","category","collection","embedding_hash" FROM "Book" WHERE "isbn" = ${isbn} LIMIT 1;`;
        const b = rows[0];
        if (!b)
            return;
        const text = buildBookEmbeddingText(b);
        const hash = sha256(text || "");
        if (!text) {
            await prisma_js_1.prisma.$executeRaw `UPDATE "Book" SET "embedding"=NULL,"embedding_hash"=NULL,"embedding_at"=now() WHERE "isbn"=${isbn};`;
            ok++;
            return;
        }
        if (b.embedding_hash === hash) {
            ok++;
            return;
        }
        try {
            const vec = await (0, embeddings_js_1.embedOne)(text);
            await prisma_js_1.prisma.$executeRaw `UPDATE "Book" SET "embedding"=${(0, utils_js_1.toSqlVector)(vec)}::vector, "embedding_hash"=${hash}, "embedding_at"=now() WHERE "isbn"=${isbn};`;
            ok++;
        }
        catch {
            fail++;
        }
    });
    return { total: uniq.length, ok, fail };
}
/** Re-embed onde embedding/hash está NULL (com filtro por biblioteca). — Alexandre Brissos — 2025-10-02 */
async function reembedWhereNull(opts) {
    await ensureEmbeddingSchema();
    const { libraryId, limit = 200 } = opts || {};
    let rows = [];
    if (libraryId != null) {
        rows = await prisma_js_1.prisma.$queryRaw `
      SELECT b."isbn" AS isbn FROM "Book" b JOIN "LibraryBook" lb ON lb."bookIsbn"=b."isbn"
      WHERE lb."libraryId"=${libraryId} AND (b."embedding" IS NULL OR b."embedding_hash" IS NULL)
      ORDER BY b."isbn" ASC LIMIT ${limit};`;
    }
    else {
        rows = await prisma_js_1.prisma.$queryRaw `
      SELECT "isbn" AS isbn FROM "Book" WHERE "embedding" IS NULL OR "embedding_hash" IS NULL
      ORDER BY "isbn" ASC LIMIT ${limit};`;
    }
    return reembedByIsbns(rows.map((r) => r.isbn), { concurrency: opts?.concurrency ?? 4 });
}
// -------------------- Leitores (CSV/XLS) --------------------
/** Lê CSV para linhas (header=true). — Alexandre Brissos — 2025-10-02 */
function decodeBest(buffer) {
    const utf8 = buffer.toString("utf-8");
    const bad = (utf8.match(/\uFFFD/g) || []).length;
    const pctBad = bad / Math.max(utf8.length, 1);
    return pctBad > 0.01 ? buffer.toString("latin1") : utf8;
}
function readCsv(buffer) {
    const text = decodeBest(buffer);
    return (0, sync_1.parse)(text, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
        delimiter: [",", ";", "\t"], // 👈 ponto-e-vírgula
        relax_column_count: true,
    });
}
/** Lê Excel e tenta extrair hyperlinks. — Alexandre Brissos — 2025-10-02 */
function readXls(buffer) {
    const wb = XLSX.read(buffer, {
        type: "buffer",
        cellHTML: false,
        cellText: false,
    });
    const sheetName = wb.SheetNames.find((n) => {
        const ws = wb.Sheets[n];
        const r = XLSX.utils.sheet_to_json(ws, { header: 1 });
        return (r?.length || 0) > 0;
    }) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const headerRows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
    });
    const headers = (headerRows?.[0] ?? []).map((h) => String(h || ""));
    if (ws["!ref"] && headers.length) {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        const dataStartR = range.s.r + 1;
        for (let R = dataStartR; R <= range.e.r; R++) {
            const rowObj = rows[R - dataStartR];
            if (!rowObj)
                continue;
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (cell && cell.l && cell.l.Target) {
                    const colName = headers[C - range.s.c];
                    if (colName)
                        rowObj[colName] = String(cell.l.Target).trim();
                }
            }
        }
    }
    return rows;
}
/** Tenta deduzir leitor pelo ficheiro. — Alexandre Brissos — 2025-10-02 */
function guessRowsFromFile(file) {
    const ext = node_path_1.default.extname(file.originalname).toLowerCase();
    if (ext === ".csv")
        return readCsv(file.buffer);
    if (ext === ".xls" || ext === ".xlsx")
        return readXls(file.buffer);
    try {
        return readCsv(file.buffer);
    }
    catch {
        return [];
    }
}
/** Extrai faixa etária do nome do ficheiro. — Alexandre Brissos — 2025-10-02 */
function ageFromFilename(name) {
    const base = node_path_1.default.basename(name).toLowerCase();
    const m = base.match(/(\d{1,2})\s*(?:-|a|ao?s?)\s*(\d{1,2})/);
    return m ? `${m[1]}-${m[2]}` : null;
}
// -------------------- Mapeamento cru → Final --------------------
/** Mapeia linha heterogénea para estrutura FinalCsvRow. — Alexandre Brissos — 2025-10-02 */
function mapRawToFinal(row, fallbackAge) {
    const keys = Object.keys(row);
    const isbnKey = keys.find((k) => k.toLowerCase().replace(/\s+/g, "") === "isbn") ||
        keys.find((k) => /isbn/i.test(k));
    const tituloKey = keys.find((k) => /t[íi]tulo/i.test(k));
    const resumoKey = keys.find((k) => /resumo|descri[cç][aã]o|sinopse/i.test(k));
    const autorKey = keys.find((k) => /autor/i.test(k));
    const anoKey = keys.find((k) => /(publica[cç][aã]o|ano)/i.test(k));
    const colecKey = keys.find((k) => /cole[cç][aã]o/i.test(k));
    const assuntosKey = keys.find((k) => /assuntos?/i.test(k));
    const cduKey = keys.find((k) => /cdu/i.test(k));
    const idadeKey = keys.find((k) => /idade|faixa/i.test(k));
    const imgKey = keys.find((k) => /imagem/i.test(k));
    const linkKey = keys.find((k) => /hiperlig|hiperligação|hiperligacao|link/i.test(k));
    const isbn = normalizeIsbn(isbnKey ? row[isbnKey] : undefined);
    if (!isbn)
        return null;
    const out = { ISBN: isbn };
    if (tituloKey)
        out["Título"] = String(row[tituloKey] ?? "").trim() || undefined;
    if (resumoKey)
        out["Resumo"] = String(row[resumoKey] ?? "").trim() || undefined;
    if (autorKey)
        out["Autor_Beja"] = String(row[autorKey] ?? "").trim() || undefined;
    if (anoKey)
        out["Publicacao_Beja"] = String(row[anoKey] ?? "").trim() || undefined;
    if (colecKey)
        out["Colecao_Beja"] = String(row[colecKey] ?? "").trim() || undefined;
    if (assuntosKey)
        out["Assuntos_Beja"] = String(row[assuntosKey] ?? "").trim() || undefined;
    if (cduKey)
        out["CDU_Beja"] = String(row[cduKey] ?? "").trim() || undefined;
    if (imgKey)
        out["Imagem_Lisboa"] = String(row[imgKey] ?? "").trim() || undefined;
    if (linkKey) {
        const v = String(row[linkKey] ?? "").trim();
        if (v)
            out.Hiperligacao = v;
    }
    const idade = idadeKey
        ? String(row[idadeKey] ?? "").trim()
        : fallbackAge ?? undefined;
    if (idade)
        out.Idade = idade;
    return out;
}
// -------------------- Import para BD (em lotes) --------------------
/** Upsert de livros + rel. LibraryBook, com invalidation de embeddings. — Alexandre Brissos — 2025-10-02 */
const IMPORT_BATCH_SIZE = 250;
async function upsertBooksAndLink(libraryId, rows) {
    let inserted = 0, updated = 0, linked = 0;
    const isbnsToReindex = new Set();
    await prisma_js_1.prisma.libraryBook.deleteMany({ where: { libraryId } });
    const map = new Map();
    for (const r of rows) {
        const isbn = normalizeIsbn(r.ISBN);
        if (!isbn)
            continue;
        if (!map.has(isbn))
            map.set(isbn, { ...r, ISBN: isbn });
    }
    const items = Array.from(map.values());
    for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
        const chunk = items.slice(i, i + IMPORT_BATCH_SIZE);
        const chunkIsbns = chunk.map((r) => r.ISBN);
        const existing = await prisma_js_1.prisma.book.findMany({
            where: { isbn: { in: chunkIsbns } },
            select: { isbn: true, title: true, summary: true, category: true },
        });
        const existByIsbn = new Map(existing.map((b) => [b.isbn, b]));
        const toCreate = [];
        const toUpdate = [];
        for (const row of chunk) {
            const isbn = row.ISBN;
            const { ageMin, ageMax, ageRange } = normalizeAgeRange(row.Idade ?? null);
            const publicationYear = extractYear(row["Publicacao_Beja"] ?? null);
            const dataUpdate = {
                title: row["Título"]?.trim() || undefined,
                summary: row["Resumo"]?.trim() || undefined,
                author: row["Autor_Beja"]?.trim() || undefined,
                publicationYear: publicationYear ?? undefined,
                collection: row["Colecao_Beja"]?.trim() || undefined,
                category: row["Assuntos_Beja"]?.trim() || undefined,
                cdu: row["CDU_Beja"]?.trim() || undefined,
                ageRange: ageRange ?? undefined,
                ageMin: ageMin ?? undefined,
                ageMax: ageMax ?? undefined,
                coverUrl: row["Imagem_Lisboa"]?.trim() || undefined,
            };
            const before = existByIsbn.get(isbn);
            if (!before) {
                toCreate.push({
                    isbn,
                    title: dataUpdate.title || "(Sem título)",
                    author: dataUpdate.author || "—",
                    publicationYear: publicationYear ?? null,
                    summary: dataUpdate.summary ?? null,
                    collection: dataUpdate.collection ?? null,
                    category: dataUpdate.category ?? null,
                    cdu: dataUpdate.cdu ?? null,
                    ageRange: dataUpdate.ageRange ?? null,
                    ageMin: dataUpdate.ageMin ?? null,
                    ageMax: dataUpdate.ageMax ?? null,
                    coverUrl: dataUpdate.coverUrl ?? null,
                });
                isbnsToReindex.add(isbn);
            }
            else {
                const willChangeText = Boolean((!!dataUpdate.title && dataUpdate.title !== before.title) ||
                    (!!dataUpdate.summary && dataUpdate.summary !== before.summary) ||
                    (!!dataUpdate.category && dataUpdate.category !== before.category));
                toUpdate.push({ isbn, data: dataUpdate, invalidate: willChangeText });
                if (willChangeText)
                    isbnsToReindex.add(isbn);
            }
        }
        if (toCreate.length) {
            const res = await prisma_js_1.prisma.book.createMany({
                data: toCreate,
                skipDuplicates: true,
            });
            inserted += res.count;
        }
        if (toUpdate.length) {
            const UPD_BATCH = 100;
            for (let j = 0; j < toUpdate.length; j += UPD_BATCH) {
                const ups = toUpdate.slice(j, j + UPD_BATCH);
                await prisma_js_1.prisma.$transaction(ups.map((u) => prisma_js_1.prisma.book.update({ where: { isbn: u.isbn }, data: u.data })));
                const toInvalidate = ups.filter((u) => u.invalidate).map((u) => u.isbn);
                if (toInvalidate.length) {
                    await prisma_js_1.prisma.$executeRaw `UPDATE "Book" SET "embedding_hash" = NULL WHERE "isbn" IN (${client_1.Prisma.join(toInvalidate)});`;
                }
            }
            updated += toUpdate.length;
        }
        const linkRes = await prisma_js_1.prisma.libraryBook.createMany({
            data: chunkIsbns.map((isbn) => ({ libraryId, bookIsbn: isbn })),
            skipDuplicates: true,
        });
        linked += linkRes.count;
    }
    return {
        inserted,
        updated,
        linked,
        isbnsToReindex: Array.from(isbnsToReindex),
    };
}
// -------------------- Check Beja --------------------
const BEJA_BASE = "http://catbib.cm-beja.pt/ipac20/ipac.jsp";
let BEJA_SESSION = null;
/** Obtém sessão ativa do catálogo de Beja. — Alexandre Brissos — 2025-10-02 */
async function getBejaSession() {
    try {
        const s0 = await axios_1.default.get(BEJA_BASE, {
            params: { profile: "bmb", menu: "search", aspect: "subtab13" },
            timeout: 15000,
            responseType: "text",
            validateStatus: () => true,
        });
        const $0 = cheerio.load(s0.data || "");
        const session = $0('input[name="session"]').attr("value") || "";
        return session;
    }
    catch {
        return "";
    }
}
/** Verifica existência de registo em Beja por ISBN. — Alexandre Brissos — 2025-10-02 */
async function bejaHasRecord(isbn) {
    try {
        if (!BEJA_SESSION)
            BEJA_SESSION = await getBejaSession();
        const doQuery = async (session) => {
            const s1 = await axios_1.default.get(BEJA_BASE, {
                params: {
                    session,
                    profile: "bmb",
                    menu: "search",
                    aspect: "subtab13",
                    index: "ISBN",
                    term: isbn,
                    npp: "20",
                    ipp: "20",
                    spp: "20",
                },
                timeout: 15000,
                responseType: "text",
                validateStatus: () => true,
            });
            const $ = cheerio.load(s1.data || "");
            const txt = $.text();
            const noRes = /não se encontram registos para/i.test(txt);
            const hasFull = $('form[name="full"]').length > 0;
            const hasTitles = $("a.boldBlackFont2U").length > 0;
            return !noRes && (hasFull || hasTitles);
        };
        let ok = BEJA_SESSION ? await doQuery(BEJA_SESSION) : false;
        if (!ok) {
            BEJA_SESSION = await getBejaSession();
            if (BEJA_SESSION)
                ok = await doQuery(BEJA_SESSION);
        }
        return ok;
    }
    catch {
        return false;
    }
}
// -------------------- Lisboa (OG + WinlibImg) --------------------
/** Puxa metadados de página Lisboa/Winlib. — Alexandre Brissos — 2025-10-02 */
async function fetchLisboaMeta(url) {
    try {
        const r = await axios_1.default.get(url, {
            responseType: "text",
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; BibliotecarioBot/1.0)",
                "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
            },
            validateStatus: () => true,
        });
        if (r.status < 200 || r.status >= 300)
            return {};
        const $ = cheerio.load(r.data || "");
        let title = $('meta[property="og:title"]').attr("content") ||
            $('meta[name="title"]').attr("content") ||
            $("title").text() ||
            undefined;
        let summary = $('meta[name="description"]').attr("content") ||
            $('meta[property="og:description"]').attr("content") ||
            undefined;
        let image = $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            undefined;
        const $form = $('form[name="full"]');
        if ($form.length) {
            if (!title) {
                const t = $form.find("a.boldBlackFont2U").first().text().trim();
                if (t)
                    title = t;
            }
            if (!summary) {
                const aRes = $form
                    .find("a")
                    .filter((_, el) => /^RESUMO:/i.test($(el).text().trim()))
                    .first();
                if (aRes.length) {
                    const td = aRes.parent().next("td");
                    const txt = td
                        .text()
                        .replace(/\u00a0/g, " ")
                        .trim();
                    if (txt)
                        summary = txt;
                }
            }
        }
        if (!image) {
            const capaHref = $("a")
                .filter((_, el) => $(el).text().trim().toLowerCase() === "capa")
                .first()
                .attr("href");
            if (capaHref)
                image = absolutize(capaHref, url);
        }
        if (!image) {
            const img = $("img")
                .filter((_, el) => {
                const s = $(el).attr("src") || "";
                return /winlibimg\.aspx/i.test(s) && !/qrcode\.aspx/i.test(s);
            })
                .first();
            const src = img.attr("src");
            if (src)
                image = absolutize(src, url);
        }
        if (image)
            image = forceHttps(image);
        return { title, summary, image };
    }
    catch {
        return {};
    }
}
// -------------------- Reindex / Cleanup (novo fluxo) --------------------
/** Wrap do reembed por ISBN. — Alexandre Brissos — 2025-10-02 */
async function reindexEmbeddingsForIsbns(isbns, concurrency = 4) {
    const { total, ok, fail } = await reembedByIsbns(isbns, { concurrency });
    return { total, done: total, ok, fail };
}
/** Wrap do reembed where null. — Alexandre Brissos — 2025-10-02 */
async function reindexEmbeddingsWhereNull(opts) {
    const res = await reembedWhereNull(opts);
    return { total: res.total, done: res.total, ok: res.ok, fail: res.fail };
}
/** Apaga livros órfãos (sem holdings). — Alexandre Brissos — 2025-10-02 */
async function cleanupOrphanBooks(opts = {}) {
    const dryRun = !!opts.dryRun;
    const rows = await prisma_js_1.prisma.$queryRaw `
    SELECT b."isbn" FROM "Book" b WHERE NOT EXISTS (SELECT 1 FROM "LibraryBook" lb WHERE lb."bookIsbn" = b."isbn");`;
    const isbns = rows.map((r) => r.isbn);
    if (!isbns.length)
        return { deleted: 0, candidates: 0, details: {} };
    if (dryRun) {
        const [origins, readings, ratings, reservations] = await Promise.all([
            prisma_js_1.prisma.bookOrigin.count({ where: { bookIsbn: { in: isbns } } }),
            prisma_js_1.prisma.reading.count({ where: { bookIsbn: { in: isbns } } }),
            prisma_js_1.prisma.rating.count({ where: { bookIsbn: { in: isbns } } }),
            prisma_js_1.prisma.bookReservation.count({ where: { bookIsbn: { in: isbns } } }),
        ]);
        return {
            deleted: 0,
            candidates: isbns.length,
            details: { origins, readings, ratings, reservations },
        };
    }
    const result = await prisma_js_1.prisma.$transaction(async (tx) => {
        const delOrigins = await tx.bookOrigin.deleteMany({
            where: { bookIsbn: { in: isbns } },
        });
        const delReadings = await tx.reading.deleteMany({
            where: { bookIsbn: { in: isbns } },
        });
        const delRatings = await tx.rating.deleteMany({
            where: { bookIsbn: { in: isbns } },
        });
        const delReservations = await tx.bookReservation.deleteMany({
            where: { bookIsbn: { in: isbns } },
        });
        const delBooks = await tx.book.deleteMany({
            where: { isbn: { in: isbns } },
        });
        return {
            deleted: delBooks.count,
            details: {
                origins: delOrigins.count,
                readings: delReadings.count,
                ratings: delRatings.count,
                reservations: delReservations.count,
            },
        };
    });
    return { candidates: isbns.length, ...result };
}
// -------------------- Helpers do pipeline (para encurtar handlers) --------------------
/** Lê e mapeia múltiplos ficheiros para linhas finais deduplicadas. — Alexandre Brissos — 2025-10-02 */
function filesToRows(files) {
    const prelim = [];
    for (const f of files) {
        const ageHint = ageFromFilename(f.originalname);
        const rawRows = guessRowsFromFile(f);
        for (const rr of rawRows) {
            const mapped = mapRawToFinal(rr, ageHint);
            if (mapped && mapped.ISBN)
                prelim.push(mapped);
        }
    }
    const byIsbn = new Map();
    for (const row of prelim) {
        const isbn = normalizeIsbn(row.ISBN);
        if (!isbn)
            continue;
        const prev = byIsbn.get(isbn);
        if (!prev)
            byIsbn.set(isbn, row);
        else
            byIsbn.set(isbn, { ...prev, ...row, ISBN: isbn });
    }
    return Array.from(byIsbn.values());
}
/** Filtra por presença em Beja, devolvendo flags e filtrados. — Alexandre Brissos — 2025-10-02 */
async function filterByBeja(rows, concurrency) {
    const isbns = rows.map((r) => r.ISBN);
    const flags = await withConcurrency(isbns, concurrency, async (isbn, idx) => {
        if (idx % concurrency === 0)
            await sleep(150);
        try {
            return await bejaHasRecord(isbn);
        }
        catch {
            return false;
        }
    });
    const filtered = rows.filter((_, i) => flags[i]);
    return {
        filtered,
        bejaPresent: flags.filter(Boolean).length,
        filteredOut: rows.length - filtered.length,
    };
}
/** Enriquecimento via Lisboa (title/summary/image). — Alexandre Brissos — 2025-10-02 */
async function enrichWithLisboa(rows, concurrency) {
    const results = await withConcurrency(rows, concurrency, async (row, idx) => {
        if (idx % concurrency === 0)
            await sleep(150);
        const link = row.Hiperligacao ||
            row["Hiperligação"] ||
            row["Hiperligacao"];
        if (!link)
            return {};
        return await fetchLisboaMeta(String(link));
    });
    rows.forEach((row, i) => {
        row["Assuntos_Beja"] = row["Assuntos_Beja"]
            ? `${row["Assuntos_Beja"]}; Disponível em Beja`
            : "Disponível em Beja";
        const meta = results[i];
        if (meta?.title && !row["Título"])
            row["Título"] = meta.title;
        if (meta?.summary && !row["Resumo"])
            row["Resumo"] = meta.summary;
        if (meta?.image)
            row["Imagem_Lisboa"] = meta.image;
    });
    return rows;
}
// -------------------- ENDPOINTS (rotas mantidas) --------------------
/**
 * POST /admin/libraries/:libraryId/books/import.csv — importação simples via CSV.
 * Body multipart: file; recalc? (true/false)
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/libraries/:libraryId/books/import.csv", (req, res, next) => {
    try {
        requireUser(req, res);
        next();
    }
    catch { }
}, upload.single("file"), async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    if (!req.file)
        return res.status(400).json({ error: "missing_file" });
    const recalc = String(req.body?.recalc || "").toLowerCase() === "true";
    let rows;
    try {
        rows = (0, sync_1.parse)(req.file.buffer.toString("utf-8"), {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
        });
    }
    catch (e) {
        return res
            .status(400)
            .json({ error: "invalid_csv", details: e?.message });
    }
    const { inserted, updated, linked, isbnsToReindex } = await upsertBooksAndLink(libraryId, rows);
    const embeddings = recalc && isbnsToReindex.length
        ? await reindexEmbeddingsForIsbns(isbnsToReindex, 4)
        : null;
    return res.json({
        ok: true,
        total: rows.length,
        inserted,
        updated,
        linked,
        ...(embeddings ? { embeddings } : {}),
    });
});
/**
 * POST /admin/libraries/:libraryId/books/pipeline — pipeline completo (múltiplos ficheiros).
 * Files: files[]; Body: { concurrency?, recalc? }
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/libraries/:libraryId/books/pipeline", (req, res, next) => {
    try {
        requireUser(req, res);
        next();
    }
    catch { }
}, upload.array("files", 16), async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    const body = req.body ?? {};
    const options = {
        concurrency: Math.max(1, Math.min(8, Number(body.concurrency ?? 4))),
    };
    const all = req.files ?? [];
    const recalc = String(body.recalc || "").toLowerCase() === "true";
    const files = all.filter((f) => f.fieldname === "files" || f.fieldname === "files[]");
    if (files.length === 0)
        return res.status(400).json({ error: "missing_files" });
    const combined = filesToRows(files);
    const { filtered, bejaPresent, filteredOut } = await filterByBeja(combined, options.concurrency);
    const enriched = await enrichWithLisboa(filtered, options.concurrency);
    const { inserted, updated, linked, isbnsToReindex } = await upsertBooksAndLink(libraryId, enriched);
    const embeddings = recalc && isbnsToReindex.length
        ? await reindexEmbeddingsForIsbns(isbnsToReindex, options.concurrency ?? 4)
        : null;
    return res.json({
        ok: true,
        inputs: { files: files.length },
        totals: {
            deduplicados: combined.length,
            bejaPresent,
            filteredOut,
            inserted,
            updated,
            linked,
        },
        ...(embeddings ? { embeddings } : {}),
        sample: enriched.slice(0, 3),
    });
});
/**
 * POST /admin/books/reindex-embeddings — reindex where null (opcional por biblioteca).
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/books/reindex-embeddings", async (req, res) => {
    requireUser(req, res);
    const libraryId = req.body?.libraryId != null ? Number(req.body.libraryId) : undefined;
    const limit = req.body?.limit != null ? Number(req.body.limit) : 200;
    const concurrency = req.body?.concurrency != null ? Number(req.body.concurrency) : 4;
    const result = await reindexEmbeddingsWhereNull({
        libraryId,
        limit,
        concurrency,
    });
    return res.json({ ok: true, result });
});
/**
 * POST /admin/books/cleanup-orphans — remove livros sem holdings (dry-run opcional).
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/books/cleanup-orphans", async (req, res) => {
    requireUser(req, res);
    const dryRun = String(req.query?.dryRun ?? req.body?.dryRun ?? "").toLowerCase() === "1" ||
        String(req.body?.dryRun ?? "").toLowerCase() === "true";
    const result = await cleanupOrphanBooks({ dryRun });
    return res.json({ ok: true, ...result });
});
exports.default = r;

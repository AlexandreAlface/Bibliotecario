/**
 * Admin — importação e gestão de livros.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Rotas mantidas; limpeza, helpers puros e comentários.
 */

// apps/api/src/routes/adminBooks.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { parse as parseCsvSync } from "csv-parse/sync";
import * as XLSX from "xlsx";
import axios from "axios";
import * as cheerio from "cheerio";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../../prisma";
import { Prisma } from "@prisma/client";
import { embedOne } from "../../ai/embeddings.js";
import { toSqlVector } from "../../reco/utils.js";

const r = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Middleware de autenticação hard-fail para endpoints admin.
 * — Alexandre Brissos — 2025-10-02
 */
function requireUser(
  req: Request,
  res: Response
): asserts req is Request & { user: Express.User } {
  if (!req.user) {
    res.status(401).json({ error: "unauthenticated" });
    throw new Error("unauthenticated");
  }
}

// -------------------- Tipos auxiliares --------------------
/** Linha final normalizada do CSV/XLS. — Alexandre Brissos — 2025-10-02 */
type FinalCsvRow = {
  ISBN: string;
  Idade?: string;
  Título?: string;
  Resumo?: string;
  Imagem_Lisboa?: string;
  Autor_Beja?: string;
  Publicacao_Beja?: string;
  Colecao_Beja?: string;
  Assuntos_Beja?: string;
  CDU_Beja?: string;
  Hiperligacao?: string;
};

/** Opções do pipeline. — Alexandre Brissos — 2025-10-02 */
type PipelineOptions = { concurrency?: number };

// -------------------- Utils (puros) --------------------
/** Normaliza ISBN para dígitos + X. — Alexandre Brissos — 2025-10-02 */
function normalizeIsbn(s?: string | number | null) {
  if (s == null) return "";
  const raw = String(s).trim();
  return raw.replace(/[^0-9xX]/g, "");
}

/** Normaliza faixa etária livre. — Alexandre Brissos — 2025-10-02 */
function normalizeAgeRange(s?: string | null) {
  if (!s)
    return {
      ageMin: null as number | null,
      ageMax: null as number | null,
      ageRange: null as string | null,
    };
  const txt = String(s)
    .toLowerCase()
    .replace(/anos?/g, "")
    .replace(/[–—_x]/g, "-")
    .replace(/\ba\b/g, "-")
    .replace(/\s+/g, "")
    .trim();
  const m = txt.match(/(\d{1,2})(?:\D+)?(\d{1,2})?/);
  if (!m) return { ageMin: null, ageMax: null, ageRange: s.trim() };
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : a;
  return {
    ageMin: Math.min(a, b),
    ageMax: Math.max(a, b),
    ageRange: `${Math.min(a, b)}-${Math.max(a, b)}`,
  };
}

/** Extrai ano AAAA de texto. — Alexandre Brissos — 2025-10-02 */
function extractYear(s?: string | null) {
  if (!s) return null;
  const m = String(s).match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

/** Sleep assíncrono. — Alexandre Brissos — 2025-10-02 */
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Executor com concorrência fixa. — Alexandre Brissos — 2025-10-02 */
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await fn(items[idx], idx);
      }
    });
  await Promise.all(workers);
  return results;
}

/** SHA256 para conteúdo de embeddings. — Alexandre Brissos — 2025-10-02 */
function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

/** Texto canónico para embedding de livro. — Alexandre Brissos — 2025-10-02 */
function buildBookEmbeddingText(b: {
  title?: string | null;
  author?: string | null;
  summary?: string | null;
  category?: string | null;
  collection?: string | null;
}) {
  const parts = [b.title, b.author, b.collection, b.category, b.summary]
    .filter(Boolean)
    .map(String);
  return parts.join("\n\n").slice(0, 8000);
}

/** Absolutiza URL relativa e força HTTPS. — Alexandre Brissos — 2025-10-02 */
function absolutize(src: string, baseUrl: string) {
  try {
    if (!src) return undefined as any;
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("//")) return "https:" + src;
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}${src.startsWith("/") ? src : "/" + src}`;
  } catch {
    return src;
  }
}

/** Força https://. — Alexandre Brissos — 2025-10-02 */
function forceHttps(u?: string) {
  return u ? u.replace(/^http:\/\//i, "https://") : u;
}

// -------------------- Embeddings (efeitos) --------------------
/** Garante colunas de embedding na tabela Book (idempotente). — Alexandre Brissos — 2025-10-02 */
async function ensureEmbeddingSchema() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);`
    );
  } catch {}
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text;`
    );
  } catch {}
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz;`
    );
  } catch {}
}

/** Re-embed por ISBN (idempotente via hash). — Alexandre Brissos — 2025-10-02 */
async function reembedByIsbns(
  isbns: string[],
  opts?: { concurrency?: number }
): Promise<{ total: number; ok: number; fail: number }> {
  await ensureEmbeddingSchema();
  const uniq = Array.from(new Set(isbns.map(normalizeIsbn))).filter(Boolean);
  let ok = 0,
    fail = 0;
  await withConcurrency(
    uniq,
    Math.max(1, Math.min(8, Number(opts?.concurrency ?? 4))),
    async (isbn) => {
      const rows = await prisma.$queryRaw<
        {
          isbn: string;
          title: string | null;
          author: string | null;
          summary: string | null;
          category: string | null;
          collection: string | null;
          embedding_hash: string | null;
        }[]
      >`
      SELECT "isbn","title","author","summary","category","collection","embedding_hash" FROM "Book" WHERE "isbn" = ${isbn} LIMIT 1;`;
      const b = rows[0];
      if (!b) return;
      const text = buildBookEmbeddingText(b);
      const hash = sha256(text || "");
      if (!text) {
        await prisma.$executeRaw`UPDATE "Book" SET "embedding"=NULL,"embedding_hash"=NULL,"embedding_at"=now() WHERE "isbn"=${isbn};`;
        ok++;
        return;
      }
      if (b.embedding_hash === hash) {
        ok++;
        return;
      }
      try {
        const vec = await embedOne(text);
        await prisma.$executeRaw`UPDATE "Book" SET "embedding"=${toSqlVector(
          vec
        )}::vector, "embedding_hash"=${hash}, "embedding_at"=now() WHERE "isbn"=${isbn};`;
        ok++;
      } catch {
        fail++;
      }
    }
  );
  return { total: uniq.length, ok, fail };
}

/** Re-embed onde embedding/hash está NULL (com filtro por biblioteca). — Alexandre Brissos — 2025-10-02 */
async function reembedWhereNull(opts?: {
  libraryId?: number;
  limit?: number;
  concurrency?: number;
}) {
  await ensureEmbeddingSchema();
  const { libraryId, limit = 200 } = opts || {};
  let rows: { isbn: string }[] = [];
  if (libraryId != null) {
    rows = await prisma.$queryRaw<{ isbn: string }[]>`
      SELECT b."isbn" AS isbn FROM "Book" b JOIN "LibraryBook" lb ON lb."bookIsbn"=b."isbn"
      WHERE lb."libraryId"=${libraryId} AND (b."embedding" IS NULL OR b."embedding_hash" IS NULL)
      ORDER BY b."isbn" ASC LIMIT ${limit};`;
  } else {
    rows = await prisma.$queryRaw<{ isbn: string }[]>`
      SELECT "isbn" AS isbn FROM "Book" WHERE "embedding" IS NULL OR "embedding_hash" IS NULL
      ORDER BY "isbn" ASC LIMIT ${limit};`;
  }
  return reembedByIsbns(
    rows.map((r) => r.isbn),
    { concurrency: opts?.concurrency ?? 4 }
  );
}

// -------------------- Leitores (CSV/XLS) --------------------
/** Lê CSV para linhas (header=true). — Alexandre Brissos — 2025-10-02 */
function decodeBest(buffer: Buffer) {
  const utf8 = buffer.toString("utf-8");
  const bad = (utf8.match(/\uFFFD/g) || []).length;
  const pctBad = bad / Math.max(utf8.length, 1);
  return pctBad > 0.01 ? buffer.toString("latin1") : utf8;
}

function readCsv(buffer: Buffer): any[] {
  const text = decodeBest(buffer);
  return parseCsvSync(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    delimiter: [",", ";", "\t"], // 👈 ponto-e-vírgula
    relax_column_count: true,
  }) as any[];
}

/** Lê Excel e tenta extrair hyperlinks. — Alexandre Brissos — 2025-10-02 */
function readXls(buffer: Buffer): any[] {
  const wb = XLSX.read(buffer, {
    type: "buffer",
    cellHTML: false,
    cellText: false,
  });
  const sheetName =
    wb.SheetNames.find((n) => {
      const ws = wb.Sheets[n];
      const r = XLSX.utils.sheet_to_json(ws, { header: 1 });
      return (r?.length || 0) > 0;
    }) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const headerRows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  }) as any[][];
  const headers: string[] = (headerRows?.[0] ?? []).map((h: any) =>
    String(h || "")
  );
  if (ws["!ref"] && headers.length) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const dataStartR = range.s.r + 1;
    for (let R = dataStartR; R <= range.e.r; R++) {
      const rowObj = rows[R - dataStartR];
      if (!rowObj) continue;
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell: any = (ws as any)[cellRef];
        if (cell && cell.l && cell.l.Target) {
          const colName = headers[C - range.s.c];
          if (colName) rowObj[colName] = String(cell.l.Target).trim();
        }
      }
    }
  }
  return rows;
}

/** Tenta deduzir leitor pelo ficheiro. — Alexandre Brissos — 2025-10-02 */
function guessRowsFromFile(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".csv") return readCsv(file.buffer);
  if (ext === ".xls" || ext === ".xlsx") return readXls(file.buffer);
  try {
    return readCsv(file.buffer);
  } catch {
    return [];
  }
}

/** Extrai faixa etária do nome do ficheiro. — Alexandre Brissos — 2025-10-02 */
function ageFromFilename(name: string) {
  const base = path.basename(name).toLowerCase();
  const m = base.match(/(\d{1,2})\s*(?:-|a|ao?s?)\s*(\d{1,2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// -------------------- Mapeamento cru → Final --------------------
/** Mapeia linha heterogénea para estrutura FinalCsvRow. — Alexandre Brissos — 2025-10-02 */
function mapRawToFinal(
  row: Record<string, any>,
  fallbackAge?: string | null
): FinalCsvRow | null {
  const keys = Object.keys(row);
  const isbnKey =
    keys.find((k) => k.toLowerCase().replace(/\s+/g, "") === "isbn") ||
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
  const linkKey = keys.find((k) =>
    /hiperlig|hiperligação|hiperligacao|link/i.test(k)
  );

  const isbn = normalizeIsbn(isbnKey ? row[isbnKey] : undefined);
  if (!isbn) return null;
  const out: FinalCsvRow = { ISBN: isbn };
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
  if (cduKey) out["CDU_Beja"] = String(row[cduKey] ?? "").trim() || undefined;
  if (imgKey)
    out["Imagem_Lisboa"] = String(row[imgKey] ?? "").trim() || undefined;
  if (linkKey) {
    const v = String(row[linkKey] ?? "").trim();
    if (v) out.Hiperligacao = v;
  }
  const idade = idadeKey
    ? String(row[idadeKey] ?? "").trim()
    : fallbackAge ?? undefined;
  if (idade) out.Idade = idade;
  return out;
}

// -------------------- Import para BD (em lotes) --------------------
/** Upsert de livros + rel. LibraryBook, com invalidation de embeddings. — Alexandre Brissos — 2025-10-02 */
const IMPORT_BATCH_SIZE = 250;
async function upsertBooksAndLink(libraryId: number, rows: FinalCsvRow[]) {
  let inserted = 0,
    updated = 0,
    linked = 0;
  const isbnsToReindex = new Set<string>();
  await prisma.libraryBook.deleteMany({ where: { libraryId } });
  const map = new Map<string, FinalCsvRow>();
  for (const r of rows) {
    const isbn = normalizeIsbn(r.ISBN);
    if (!isbn) continue;
    if (!map.has(isbn)) map.set(isbn, { ...r, ISBN: isbn });
  }
  const items = Array.from(map.values());
  for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
    const chunk = items.slice(i, i + IMPORT_BATCH_SIZE);
    const chunkIsbns = chunk.map((r) => r.ISBN);
    const existing = await prisma.book.findMany({
      where: { isbn: { in: chunkIsbns } },
      select: { isbn: true, title: true, summary: true, category: true },
    });
    const existByIsbn = new Map(existing.map((b) => [b.isbn, b]));
    const toCreate: any[] = [];
    const toUpdate: Array<{ isbn: string; data: any; invalidate: boolean }> =
      [];

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
      } else {
        const willChangeText = Boolean(
          (!!dataUpdate.title && dataUpdate.title !== before.title) ||
            (!!dataUpdate.summary && dataUpdate.summary !== before.summary) ||
            (!!dataUpdate.category && dataUpdate.category !== before.category)
        );
        toUpdate.push({ isbn, data: dataUpdate, invalidate: willChangeText });
        if (willChangeText) isbnsToReindex.add(isbn);
      }
    }

    if (toCreate.length) {
      const res = await prisma.book.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      inserted += res.count;
    }
    if (toUpdate.length) {
      const UPD_BATCH = 100;
      for (let j = 0; j < toUpdate.length; j += UPD_BATCH) {
        const ups = toUpdate.slice(j, j + UPD_BATCH);
        await prisma.$transaction(
          ups.map((u) =>
            prisma.book.update({ where: { isbn: u.isbn }, data: u.data })
          )
        );
        const toInvalidate = ups.filter((u) => u.invalidate).map((u) => u.isbn);
        if (toInvalidate.length) {
          await prisma.$executeRaw`UPDATE "Book" SET "embedding_hash" = NULL WHERE "isbn" IN (${Prisma.join(
            toInvalidate
          )});`;
        }
      }
      updated += toUpdate.length;
    }

    const linkRes = await prisma.libraryBook.createMany({
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
let BEJA_SESSION: string | null = null;

/** Obtém sessão ativa do catálogo de Beja. — Alexandre Brissos — 2025-10-02 */
async function getBejaSession(): Promise<string> {
  try {
    const s0 = await axios.get<string>(BEJA_BASE, {
      params: { profile: "bmb", menu: "search", aspect: "subtab13" },
      timeout: 15_000,
      responseType: "text",
      validateStatus: () => true,
    });
    const $0 = cheerio.load(s0.data || "");
    const session = $0('input[name="session"]').attr("value") || "";
    return session;
  } catch {
    return "";
  }
}

/** Verifica existência de registo em Beja por ISBN. — Alexandre Brissos — 2025-10-02 */
async function bejaHasRecord(isbn: string): Promise<boolean> {
  try {
    if (!BEJA_SESSION) BEJA_SESSION = await getBejaSession();
    const doQuery = async (session: string) => {
      const s1 = await axios.get<string>(BEJA_BASE, {
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
        timeout: 15_000,
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
      if (BEJA_SESSION) ok = await doQuery(BEJA_SESSION);
    }
    return ok;
  } catch {
    return false;
  }
}

// -------------------- Lisboa (OG + WinlibImg) --------------------
/** Puxa metadados de página Lisboa/Winlib. — Alexandre Brissos — 2025-10-02 */
async function fetchLisboaMeta(url: string) {
  try {
    const r = await axios.get<string>(url, {
      responseType: "text",
      timeout: 15_000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BibliotecarioBot/1.0)",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
      validateStatus: () => true,
    });
    if (r.status < 200 || r.status >= 300) return {} as any;
    const $ = cheerio.load(r.data || "");
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("title").text() ||
      undefined;
    let summary =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      undefined;
    let image: string | undefined =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      undefined;
    const $form = $('form[name="full"]');
    if ($form.length) {
      if (!title) {
        const t = $form.find("a.boldBlackFont2U").first().text().trim();
        if (t) title = t;
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
          if (txt) summary = txt;
        }
      }
    }
    if (!image) {
      const capaHref = $("a")
        .filter((_, el) => $(el).text().trim().toLowerCase() === "capa")
        .first()
        .attr("href");
      if (capaHref) image = absolutize(capaHref, url);
    }
    if (!image) {
      const img = $("img")
        .filter((_, el) => {
          const s = $(el).attr("src") || "";
          return /winlibimg\.aspx/i.test(s) && !/qrcode\.aspx/i.test(s);
        })
        .first();
      const src = img.attr("src");
      if (src) image = absolutize(src, url);
    }
    if (image) image = forceHttps(image);
    return { title, summary, image } as {
      title?: string;
      summary?: string;
      image?: string;
    };
  } catch {
    return {} as any;
  }
}

// -------------------- Reindex / Cleanup (novo fluxo) --------------------
/** Wrap do reembed por ISBN. — Alexandre Brissos — 2025-10-02 */
async function reindexEmbeddingsForIsbns(
  isbns: string[],
  concurrency = 4
): Promise<{ total: number; done: number; ok: number; fail: number }> {
  const { total, ok, fail } = await reembedByIsbns(isbns, { concurrency });
  return { total, done: total, ok, fail };
}

/** Wrap do reembed where null. — Alexandre Brissos — 2025-10-02 */
async function reindexEmbeddingsWhereNull(opts?: {
  libraryId?: number;
  limit?: number;
  concurrency?: number;
}) {
  const res = await reembedWhereNull(opts);
  return { total: res.total, done: res.total, ok: res.ok, fail: res.fail };
}

/** Apaga livros órfãos (sem holdings). — Alexandre Brissos — 2025-10-02 */
async function cleanupOrphanBooks(opts: { dryRun?: boolean } = {}) {
  const dryRun = !!opts.dryRun;
  const rows = await prisma.$queryRaw<{ isbn: string }[]>`
    SELECT b."isbn" FROM "Book" b WHERE NOT EXISTS (SELECT 1 FROM "LibraryBook" lb WHERE lb."bookIsbn" = b."isbn");`;
  const isbns = rows.map((r) => r.isbn);
  if (!isbns.length) return { deleted: 0, candidates: 0, details: {} } as any;
  if (dryRun) {
    const [origins, readings, ratings, reservations] = await Promise.all([
      prisma.bookOrigin.count({ where: { bookIsbn: { in: isbns } } }),
      prisma.reading.count({ where: { bookIsbn: { in: isbns } } }),
      prisma.rating.count({ where: { bookIsbn: { in: isbns } } }),
      prisma.bookReservation.count({ where: { bookIsbn: { in: isbns } } }),
    ]);
    return {
      deleted: 0,
      candidates: isbns.length,
      details: { origins, readings, ratings, reservations },
    };
  }
  const result = await prisma.$transaction(async (tx) => {
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
  return { candidates: isbns.length, ...result } as any;
}

// -------------------- Helpers do pipeline (para encurtar handlers) --------------------
/** Lê e mapeia múltiplos ficheiros para linhas finais deduplicadas. — Alexandre Brissos — 2025-10-02 */
function filesToRows(files: Express.Multer.File[]): FinalCsvRow[] {
  const prelim: FinalCsvRow[] = [];
  for (const f of files) {
    const ageHint = ageFromFilename(f.originalname);
    const rawRows = guessRowsFromFile(f) as Record<string, any>[];
    for (const rr of rawRows) {
      const mapped = mapRawToFinal(rr, ageHint);
      if (mapped && mapped.ISBN) prelim.push(mapped);
    }
  }
  const byIsbn = new Map<string, FinalCsvRow>();
  for (const row of prelim) {
    const isbn = normalizeIsbn(row.ISBN);
    if (!isbn) continue;
    const prev = byIsbn.get(isbn);
    if (!prev) byIsbn.set(isbn, row);
    else byIsbn.set(isbn, { ...prev, ...row, ISBN: isbn });
  }
  return Array.from(byIsbn.values());
}

/** Filtra por presença em Beja, devolvendo flags e filtrados. — Alexandre Brissos — 2025-10-02 */
async function filterByBeja(rows: FinalCsvRow[], concurrency: number) {
  const isbns = rows.map((r) => r.ISBN);
  const flags = await withConcurrency(isbns, concurrency, async (isbn, idx) => {
    if (idx % concurrency === 0) await sleep(150);
    try {
      return await bejaHasRecord(isbn);
    } catch {
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
async function enrichWithLisboa(rows: FinalCsvRow[], concurrency: number) {
  const results = await withConcurrency(rows, concurrency, async (row, idx) => {
    if (idx % concurrency === 0) await sleep(150);
    const link =
      row.Hiperligacao ||
      (row as any)["Hiperligação"] ||
      (row as any)["Hiperligacao"];
    if (!link) return {} as any;
    return await fetchLisboaMeta(String(link));
  });
  rows.forEach((row, i) => {
    row["Assuntos_Beja"] = row["Assuntos_Beja"]
      ? `${row["Assuntos_Beja"]}; Disponível em Beja`
      : "Disponível em Beja";
    const meta = results[i] as any;
    if (meta?.title && !row["Título"]) row["Título"] = meta.title;
    if (meta?.summary && !row["Resumo"]) row["Resumo"] = meta.summary;
    if (meta?.image) row["Imagem_Lisboa"] = meta.image;
  });
  return rows;
}

// -------------------- ENDPOINTS (rotas mantidas) --------------------
/**
 * POST /admin/libraries/:libraryId/books/import.csv — importação simples via CSV.
 * Body multipart: file; recalc? (true/false)
 * — Alexandre Brissos — 2025-10-02
 */
r.post(
  "/admin/libraries/:libraryId/books/import.csv",
  (req, res, next) => {
    try {
      requireUser(req, res);
      next();
    } catch {}
  },
  upload.single("file"),
  async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    if (!req.file) return res.status(400).json({ error: "missing_file" });
    const recalc = String(req.body?.recalc || "").toLowerCase() === "true";
    let rows: FinalCsvRow[];
    try {
      rows = parseCsvSync(req.file.buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      }) as FinalCsvRow[];
    } catch (e: any) {
      return res
        .status(400)
        .json({ error: "invalid_csv", details: e?.message });
    }
    const { inserted, updated, linked, isbnsToReindex } =
      await upsertBooksAndLink(libraryId, rows);
    const embeddings =
      recalc && isbnsToReindex.length
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
  }
);

/**
 * POST /admin/libraries/:libraryId/books/pipeline — pipeline completo (múltiplos ficheiros).
 * Files: files[]; Body: { concurrency?, recalc? }
 * — Alexandre Brissos — 2025-10-02
 */
r.post(
  "/admin/libraries/:libraryId/books/pipeline",
  (req, res, next) => {
    try {
      requireUser(req, res);
      next();
    } catch {}
  },
  upload.array("files", 16),
  async (req, res) => {
    requireUser(req, res);
    const libraryId = Number(req.params.libraryId);
    const body = req.body ?? {};
    const options: PipelineOptions = {
      concurrency: Math.max(1, Math.min(8, Number(body.concurrency ?? 4))),
    };

    const all = (req.files as Express.Multer.File[] | undefined) ?? [];

    const recalc = String(body.recalc || "").toLowerCase() === "true";
    const files = all.filter(
      (f) => f.fieldname === "files" || f.fieldname === "files[]"
    );
    if (files.length === 0)
      return res.status(400).json({ error: "missing_files" });

    const combined = filesToRows(files);
    const { filtered, bejaPresent, filteredOut } = await filterByBeja(
      combined,
      options.concurrency!
    );
    const enriched = await enrichWithLisboa(filtered, options.concurrency!);
    const { inserted, updated, linked, isbnsToReindex } =
      await upsertBooksAndLink(libraryId, enriched);
    const embeddings =
      recalc && isbnsToReindex.length
        ? await reindexEmbeddingsForIsbns(
            isbnsToReindex,
            options.concurrency ?? 4
          )
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
  }
);

/**
 * POST /admin/books/reindex-embeddings — reindex where null (opcional por biblioteca).
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/books/reindex-embeddings", async (req, res) => {
  requireUser(req, res);
  const libraryId =
    req.body?.libraryId != null ? Number(req.body.libraryId) : undefined;
  const limit = req.body?.limit != null ? Number(req.body.limit) : 200;
  const concurrency =
    req.body?.concurrency != null ? Number(req.body.concurrency) : 4;
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
  const dryRun =
    String(req.query?.dryRun ?? req.body?.dryRun ?? "").toLowerCase() === "1" ||
    String(req.body?.dryRun ?? "").toLowerCase() === "true";
  const result = await cleanupOrphanBooks({ dryRun });
  return res.json({ ok: true, ...result });
});

export default r;

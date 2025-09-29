import { PrismaClient } from "@prisma/client";
import { toSqlVector, weightedCentroid } from "../reco/utils.js";

const prisma = new PrismaClient();

/* ---- util local: asNumArray (não vem de utils.js) ---- */
function asNumArray(v: unknown): number[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.map((x) => Number(x));
  if (typeof v === "string") {
    const s = v.replace(/^\s*\[|\]\s*$/g, "");
    if (!s) return null;
    const arr = s.split(",").map((x) => Number(x.trim()));
    return arr.every((n) => Number.isFinite(n)) ? arr : null;
  }
  return null;
}

/* ---- util local: idade ---- */
function yearsOld(dob?: Date | null): number | undefined {
  if (!dob) return undefined;
  const now = new Date();
  let y = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) y--;
  return Math.max(0, y);
}

/**
 * Recalcula o vetor do perfil do miúdo:
 *  - ratings 4–5★ (meia-vida 90d)
 *  - leituras em curso (meia-vida 60d)
 *  - reservas (meia-vida 45d)
 *  Faz cache em ChildPreference, mas devolve o vetor fresco.
 */
export async function computeChildVector(childId: number): Promise<number[] | null> {
  const now = Date.now();
  const vecs: number[][] = [];
  const weights: number[] = [];

  // 1) Ratings 4–5★
  const rated = await prisma.$queryRaw<
    { e: string; stars: number; ratedAt: Date }[]
  >`
    SELECT b.embedding::text AS e, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId}
      AND b.embedding IS NOT NULL
      AND r."stars" >= 4
    ORDER BY r."ratedAt" DESC
    LIMIT 200;
  `;
  for (const r of rated) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.ratedAt).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 90);
    const gusto = (r.stars - 3) / 2; // 0.5..1.0
    vecs.push(v);
    weights.push(0.3 + 0.7 * gusto * recency); // 0.3..1.0
  }

  // 2) Leituras em curso
  const reading = await prisma.$queryRaw<{ e: string; t: Date }[]>`
    SELECT b.embedding::text AS e, COALESCE(r."startedAt", r."ratedAt", now()) AS t
    FROM "Reading" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId}
      AND r."finishedAt" IS NULL
      AND b.embedding IS NOT NULL
    LIMIT 100;
  `;
  for (const r of reading) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.t).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 60);
    vecs.push(v);
    weights.push(0.2 + 0.15 * recency); // ≤ 0.35
  }

  // 3) Reservas
  const reserved = await prisma.$queryRaw<{ e: string; t: Date }[]>`
    SELECT b.embedding::text AS e, br."reservedAt" AS t
    FROM "BookReservation" br
    JOIN "Book" b ON b."isbn" = br."bookIsbn"
    WHERE br."childId" = ${childId}
      AND b.embedding IS NOT NULL
    ORDER BY br."reservedAt" DESC
    LIMIT 50;
  `;
  for (const r of reserved) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.t).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 45);
    vecs.push(v);
    weights.push(0.1 + 0.15 * recency); // ≤ 0.25
  }

  let centroid = weightedCentroid(vecs, weights);

  // 4) Fallback por idade (se ainda não há sinal)
  if (!centroid) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: { birthDate: true },
    });
    const age = yearsOld(child?.birthDate);
    const rows = await prisma.$queryRaw<{ e: string }[]>`
      SELECT b.embedding::text AS e
      FROM "Book" b
      WHERE b.embedding IS NOT NULL
        AND (${age ?? null}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
      age ?? null
    }::int)
        AND (${age ?? null}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
      age ?? null
    }::int)
      LIMIT 200;
    `;
    const vks = rows.map((r) => asNumArray(r.e)).filter(Boolean) as number[][];
    if (vks.length) {
      const d = vks[0].length;
      centroid = Array.from({ length: d }, (_: unknown, i: number) =>
        vks.reduce((s, v) => s + v[i], 0) / vks.length
      );
    }
  }

  if (!centroid) return null;

  // cache em ChildPreference (sem bloquear)
  try {
    await prisma.$executeRaw`
      INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
      VALUES (${childId}, ${"AUTO (ratings+reading+reservas)"}, ${toSqlVector(
        centroid
      )}::vector, now())
      ON CONFLICT ("childId") DO UPDATE
        SET "profileText" = EXCLUDED."profileText",
            "embedding"   = EXCLUDED."embedding",
            "updatedAt"   = now();
    `;
  } catch {
    // ignora erro de cache
  }

  return centroid;
}

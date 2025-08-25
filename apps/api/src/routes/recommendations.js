import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import z from "zod";
import { embedOne } from "../ai/embeddings.js";
import {
  buildProfileText,
  getAlreadyReadIsbns,
  toSqlVector,
} from "../reco/utils.js";

const prisma = new PrismaClient();
const router = Router();

const QuizBodySchema = z.object({
  answers: z.array(z.object({ id: z.string(), value: z.unknown() })).nonempty(),
});

router.post("/recommendations/quiz", async (req, res) => {
  let body;
  try {
    body = QuizBodySchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: "bad_body", details: e.errors });
  }

  const answers = body.answers;
  const limit = Number(req.query.limit ?? 12);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  const profile = buildProfileText(answers);
  const vec = await embedOne(profile);
  const v = toSqlVector(vec);

  // idade vinda do quiz (ex.: "6-8")
  const ageRange = answers.find(
    (a) => a.id === "age" || a.id === "ageRange"
  )?.value;
  let min, max;
  const m =
    typeof ageRange === "string" ? ageRange.match(/^(\d+)\s*-\s*(\d+)$/) : null;
  if (m) {
    min = Number(m[1]);
    max = Number(m[2]);
  }

  // CASTS seguros para o Postgres
  const minI = Number.isFinite(min) ? Number(min) : null;
  const maxI = Number.isFinite(max) ? Number(max) : null;

  const exclude = await getAlreadyReadIsbns({ childId, familyId });
  const excludeArr = Array.isArray(exclude) && exclude.length ? exclude : null;

  const rows = await prisma.$queryRaw`
    SELECT b."isbn", b."title", b."coverUrl",
           1 - (b."embedding" <=> ${v}::vector) AS score
    FROM "Book" b
    WHERE b."embedding" IS NOT NULL
      AND (${minI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxI}::int)
      AND (${maxI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minI}::int)
      AND (${excludeArr}::text[] IS NULL OR b."isbn" <> ALL(${excludeArr}::text[]))
    ORDER BY b."embedding" <=> ${v}::vector
    LIMIT ${limit};
  `;

  const out = rows.map((r) => ({
    isbn: r.isbn,
    title: r.title,
    coverUrl: r.coverUrl ?? undefined,
    score: Number((r.score ?? 0).toFixed(3)),
    why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(Boolean),
  }));

  res.json(out);
});

function avgVec(vecs) {
  if (!vecs?.length) return null;
  const n = vecs.length;
  const acc = Array.from(vecs[0], () => 0);
  for (const v of vecs) for (let i = 0; i < acc.length; i++) acc[i] += Number(v[i] || 0);
  for (let i = 0; i < acc.length; i++) acc[i] /= n;
  return acc;
}
function asNumArray(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === "string") {
    const s = v.replace(/^\s*\[|\]\s*$/g, "");
    if (!s) return null;
    const arr = s.split(",").map((x) => Number(x.trim()));
    return arr.every((n) => Number.isFinite(n)) ? arr : null;
  }
  return null;
}
function yearsOld(dob) {
  if (!dob) return undefined;
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return Math.max(0, y);
}

// ======================
// GET /recommendations/profile
// Query: ?limit=12&childId=...&familyId=...
router.get("/recommendations/profile", async (req, res) => {
  const limit = Number(req.query.limit ?? 12);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    let queryVec = null;
    let minAge = null;
    let maxAge = null;

    // ------- 1) tentar preferências existentes / leituras -------
    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { birthDate: true },
      });
      const age = yearsOld(child && child.birthDate);
      if (Number.isFinite(age)) {
        minAge = age;
        maxAge = age;
      }

      // preferência gravada (CAST para texto)
      const pref = await prisma.$queryRaw`
        SELECT embedding::text AS embedding
        FROM "ChildPreference"
        WHERE "childId"=${childId} AND embedding IS NOT NULL
        LIMIT 1;
      `;
      queryVec = asNumArray(pref && pref[0] && pref[0].embedding);

      // média dos livros lidos se não houver preferência (CAST para texto)
      if (!queryVec) {
        const rows = await prisma.$queryRaw`
          SELECT b.embedding::text AS embedding
          FROM "Reading" r
          JOIN "Book" b ON b."isbn" = r."bookIsbn"
          WHERE r."childId"=${childId} AND b.embedding IS NOT NULL
          ORDER BY r."readAt" DESC
          LIMIT 20;
        `;
        const vecs = rows.map((r) => asNumArray(r.embedding)).filter(Boolean);
        queryVec = avgVec(vecs);
      }

      // ------- 2) FALLBACK COLD-START por idade -------
      if (!queryVec) {
        const minAgeI = Number.isFinite(minAge) ? Number(minAge) : null;
        const maxAgeI = Number.isFinite(maxAge) ? Number(maxAge) : null;

        const rows = await prisma.$queryRaw`
          SELECT b.embedding::text AS embedding
          FROM "Book" b
          WHERE b.embedding IS NOT NULL
            AND (${minAgeI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAgeI}::int)
            AND (${maxAgeI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAgeI}::int)
          LIMIT 200;
        `;
        const vecs = rows.map((r) => asNumArray(r.embedding)).filter(Boolean);
        queryVec = avgVec(vecs) || null;

        // guardar bootstrap para futuras chamadas
        if (queryVec) {
          const v = toSqlVector(queryVec);
          await prisma.$executeRaw`
            INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
            VALUES (${childId}, ${"Bootstrap por idade"}, ${v}::vector, now())
            ON CONFLICT ("childId")
            DO UPDATE SET
              "profileText" = EXCLUDED."profileText",
              "embedding"   = EXCLUDED."embedding",
              "updatedAt"   = now();
          `;
        }
      }
    } else if (familyId) {
      // família: média das preferências das crianças; senão, média por idade de cada criança
      const kids = await prisma.childFamily.findMany({
        where: { familyId },
        select: { childId: true, child: { select: { birthDate: true } } },
      });

      // preferências existentes (CAST para texto)
      const rowsPref = await prisma.$queryRaw`
        SELECT cp.embedding::text AS embedding
        FROM "ChildPreference" cp
        JOIN "ChildFamily" cf ON cf."childId" = cp."childId"
        WHERE cf."familyId"=${familyId} AND cp.embedding IS NOT NULL;
      `;
      let vecs = rowsPref.map((r) => asNumArray(r.embedding)).filter(Boolean);

      if (!vecs.length && kids.length) {
        const perKid = [];
        for (const k of kids) {
          const age = yearsOld(k.child && k.child.birthDate);
          if (!Number.isFinite(age)) continue;
          const rows = await prisma.$queryRaw`
            SELECT b.embedding::text AS embedding
            FROM "Book" b
            WHERE b.embedding IS NOT NULL
              AND (b."ageMin" IS NULL OR b."ageMin" <= ${age}::int)
              AND (b."ageMax" IS NULL OR b."ageMax" >= ${age}::int)
            LIMIT 120;
          `;
          const vks = rows.map((r) => asNumArray(r.embedding)).filter(Boolean);
          const centroid = avgVec(vks);
          if (centroid) perKid.push(centroid);
        }
        vecs = perKid;
      }

      queryVec = avgVec(vecs) || null;
    }

    // ------- 3) se ainda não houver vetor, devolve lista neutra -------
    if (!queryVec) {
      const rows = await prisma.$queryRaw`
        SELECT b."isbn", b."title", b."coverUrl", 0.0 AS score
        FROM "Book" b
        WHERE b.embedding IS NOT NULL
        ORDER BY b."publicationYear" DESC NULLS LAST
        LIMIT ${limit};
      `;
      return res.json(
        rows.map((r) => ({
          isbn: r.isbn,
          title: r.title,
          coverUrl: r.coverUrl ?? undefined,
          score: Number(r.score),
        }))
      );
    }

    // ------- 4) excluir já lidos e fazer a query vetorial -------
    const excludeRows = await prisma.reading.findMany({
      where: childId
        ? { childId }
        : familyId
        ? { child: { families: { some: { familyId } } } }
        : undefined,
      select: { bookIsbn: true },
    });
    const exclude = excludeRows.map((r) => r.bookIsbn);
    const excludeArr = exclude.length ? exclude : null;

    const v = toSqlVector(queryVec);

    const minAgeI = Number.isFinite(minAge) ? Number(minAge) : null;
    const maxAgeI = Number.isFinite(maxAge) ? Number(maxAge) : null;

    const rows = await prisma.$queryRaw`
      SELECT b."isbn", b."title", b."coverUrl",
             1 - (b."embedding" <=> ${v}::vector) AS score
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${minAgeI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAgeI}::int)
        AND (${maxAgeI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAgeI}::int)
        AND (${excludeArr}::text[] IS NULL OR b."isbn" <> ALL(${excludeArr}::text[]))
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${limit};
    `;

    const out = rows.map((r) => ({
      isbn: r.isbn,
      title: r.title,
      coverUrl: r.coverUrl ?? undefined,
      score: Number((r.score ?? 0).toFixed(3)),
      why: [],
    }));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;

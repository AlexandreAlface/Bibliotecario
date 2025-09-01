-- [Higiene 1] Preencher childId a partir da leitura ligada
UPDATE "Rating" r
SET "childId" = rd."childId"
FROM "Reading" rd
WHERE r."readingId" = rd."id"
  AND r."childId" IS NULL;

-- [Higiene 2] Inferir childId quando possível (família/filho/leitura mais recente do mesmo livro)
WITH cand AS (
  SELECT r."id" rating_id, rd."childId" infer_child_id,
         ROW_NUMBER() OVER (PARTITION BY r."id" ORDER BY rd."finishedAt" DESC NULLS LAST, rd."id" DESC) rn
  FROM "Rating" r
  JOIN "ChildFamily" cf ON cf."familyId" = r."userId"
  JOIN "Reading" rd ON rd."childId" = cf."childId" AND rd."bookIsbn" = r."bookIsbn"
  WHERE r."childId" IS NULL
)
UPDATE "Rating" r
SET "childId" = c.infer_child_id
FROM cand c
WHERE r."id" = c.rating_id AND c.rn = 1;

-- [Higiene 3] Deduplicar ratings antigas (mantém a mais recente)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "userId","childId","bookIsbn"
                            ORDER BY "ratedAt" DESC, "id" DESC) rn
  FROM "Rating"
  WHERE "childId" IS NOT NULL
)
DELETE FROM "Rating" r
USING ranked d
WHERE r."id" = d."id" AND d.rn > 1;

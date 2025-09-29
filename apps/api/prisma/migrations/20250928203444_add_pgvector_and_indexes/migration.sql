-- 1) Extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Colunas para embeddings e controlo de versão/recálculo
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz;

-- 3) Índice ANN para buscas por similaridade (cosine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  schemaname = 'public'
    AND    indexname  = 'book_embedding_ivf_cos'
  ) THEN
    CREATE INDEX book_embedding_ivf_cos
      ON "Book" USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END
$$;

-- 4) Índices que aceleram as tuas subqueries NOT EXISTS
CREATE INDEX IF NOT EXISTS reading_book_child_finished
  ON "Reading" ("bookIsbn","childId","finishedAt");

CREATE INDEX IF NOT EXISTS bookreservation_book_child
  ON "BookReservation" ("bookIsbn","childId");

CREATE INDEX IF NOT EXISTS childfamily_family_child
  ON "ChildFamily" ("familyId","childId");

-- (opcional) para fallback por “recentes”
CREATE INDEX IF NOT EXISTS book_publication_year_idx
  ON "Book" ("publicationYear");

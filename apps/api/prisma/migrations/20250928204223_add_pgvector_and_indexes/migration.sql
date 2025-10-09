-- Extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Colunas (se não existirem)
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz;

-- Índice ANN (cosine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'book_embedding_ivf_cos'
  ) THEN
    CREATE INDEX book_embedding_ivf_cos
      ON "Book" USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;

-- Índices que aceleram os NOT EXISTS
CREATE INDEX IF NOT EXISTS reading_book_child_finished
  ON "Reading" ("bookIsbn","childId","finishedAt");

CREATE INDEX IF NOT EXISTS bookreservation_book_child
  ON "BookReservation" ("bookIsbn","childId");

CREATE INDEX IF NOT EXISTS childfamily_family_child
  ON "ChildFamily" ("familyId","childId");

-- Opcional (fallback por recentes)
CREATE INDEX IF NOT EXISTS book_publication_year_idx
  ON "Book" ("publicationYear");

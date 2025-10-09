-- Garante a extensão pgvector (não faz mal se já existir)
CREATE EXTENSION IF NOT EXISTS vector;

-- Colunas para controlar o embedding
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_hash" text;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "embedding_at" timestamptz;

-- Índice ANN (opcional, mas recomendado)
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

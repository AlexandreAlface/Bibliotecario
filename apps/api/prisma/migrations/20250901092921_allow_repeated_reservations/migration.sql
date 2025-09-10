-- 1) remover unique antigo, se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'BookReservation_childId_bookIsbn_key'
  ) THEN
    DROP INDEX "BookReservation_childId_bookIsbn_key";
  END IF;
END
$$;

-- 2) índice normal para acelerar consultas
CREATE INDEX IF NOT EXISTS "BookReservation_childId_bookIsbn_idx"
  ON "BookReservation" ("childId","bookIsbn");

-- 3) (opcional) índice para leituras por (child, book)
CREATE INDEX IF NOT EXISTS "Reading_childId_bookIsbn_idx"
  ON "Reading" ("childId","bookIsbn");

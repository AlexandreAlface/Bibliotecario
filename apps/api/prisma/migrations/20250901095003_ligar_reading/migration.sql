-- liga cada Reading (sem reservationId) à reserva mais recente anterior
WITH r0 AS (
  SELECT r."id" AS rid, r."childId", r."bookIsbn", r."startedAt"
  FROM "Reading" r
  WHERE r."reservationId" IS NULL
)
UPDATE "Reading" r
SET "reservationId" = br.id
FROM r0
JOIN LATERAL (
  SELECT br2.id
  FROM "BookReservation" br2
  WHERE br2."childId" = r0."childId"
    AND br2."bookIsbn" = r0."bookIsbn"
    AND br2."reservedAt" <= r0."startedAt"
    AND NOT EXISTS (
      SELECT 1 FROM "Reading" rx WHERE rx."reservationId" = br2.id
    )
  ORDER BY br2."reservedAt" DESC
  LIMIT 1
) br ON TRUE
WHERE r.id = r0.rid;

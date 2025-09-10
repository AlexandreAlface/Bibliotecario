/*
  Warnings:

  - A unique constraint covering the columns `[childId,bookIsbn]` on the table `BookReservation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[childId,bookIsbn]` on the table `Reading` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."BookReservation_childId_bookIsbn_idx";

-- CreateIndex
CREATE INDEX "BookReservation_childId_bookIsbn_reservedAt_idx" ON "public"."BookReservation"("childId", "bookIsbn", "reservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookReservation_childId_bookIsbn_key" ON "public"."BookReservation"("childId", "bookIsbn");

-- CreateIndex
CREATE UNIQUE INDEX "Reading_childId_bookIsbn_key" ON "public"."Reading"("childId", "bookIsbn");

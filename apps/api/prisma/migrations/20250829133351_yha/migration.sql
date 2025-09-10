/*
  Warnings:

  - A unique constraint covering the columns `[userId,childId,bookIsbn]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "BookReservation_childId_bookIsbn_idx" ON "public"."BookReservation"("childId", "bookIsbn");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_childId_bookIsbn_key" ON "public"."Rating"("userId", "childId", "bookIsbn");

-- CreateIndex
CREATE INDEX "Reading_childId_bookIsbn_finishedAt_idx" ON "public"."Reading"("childId", "bookIsbn", "finishedAt");

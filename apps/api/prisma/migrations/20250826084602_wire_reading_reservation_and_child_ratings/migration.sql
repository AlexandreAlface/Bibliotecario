/*
  Warnings:

  - You are about to drop the column `readAt` on the `Reading` table. All the data in the column will be lost.
  - Made the column `startedAt` on table `Reading` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Reading_childId_bookIsbn_finishedAt_idx";

-- AlterTable
ALTER TABLE "public"."Rating" ADD COLUMN     "childId" INTEGER,
ADD COLUMN     "readingId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Reading" DROP COLUMN "readAt",
ADD COLUMN     "reservationId" INTEGER,
ALTER COLUMN "startedAt" SET NOT NULL,
ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Rating_childId_idx" ON "public"."Rating"("childId");

-- CreateIndex
CREATE INDEX "Rating_bookIsbn_idx" ON "public"."Rating"("bookIsbn");

-- CreateIndex
CREATE INDEX "Reading_childId_finishedAt_idx" ON "public"."Reading"("childId", "finishedAt");

-- AddForeignKey
ALTER TABLE "public"."Reading" ADD CONSTRAINT "Reading_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."BookReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "public"."Reading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

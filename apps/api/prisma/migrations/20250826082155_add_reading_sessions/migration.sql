-- AlterTable
ALTER TABLE "public"."Reading" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Reading_childId_bookIsbn_finishedAt_idx" ON "public"."Reading"("childId", "bookIsbn", "finishedAt");

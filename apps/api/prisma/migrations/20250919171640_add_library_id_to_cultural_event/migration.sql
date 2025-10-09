-- AlterTable
ALTER TABLE "public"."CulturalEvent" ADD COLUMN     "libraryId" INTEGER;

-- CreateIndex
CREATE INDEX "CulturalEvent_libraryId_startDate_idx" ON "public"."CulturalEvent"("libraryId", "startDate");

-- AddForeignKey
ALTER TABLE "public"."CulturalEvent" ADD CONSTRAINT "CulturalEvent_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

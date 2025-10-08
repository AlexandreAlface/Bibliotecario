-- CreateEnum
CREATE TYPE "public"."ConsultationMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- AlterTable
ALTER TABLE "public"."Consultation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "meetingNotes" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "modeEnum" "public"."ConsultationMode",
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "public"."ConsultationSlot" ADD COLUMN     "blockedByLibraryBlockId" INTEGER;

-- CreateTable
CREATE TABLE "public"."ConsultationBook" (
    "consultationId" INTEGER NOT NULL,
    "bookIsbn" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationBook_pkey" PRIMARY KEY ("consultationId","bookIsbn")
);

-- CreateTable
CREATE TABLE "public"."ConsultationMicroContent" (
    "consultationId" INTEGER NOT NULL,
    "microContentId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationMicroContent_pkey" PRIMARY KEY ("consultationId","microContentId")
);

-- CreateTable
CREATE TABLE "public"."ConsultationCulturalEvent" (
    "consultationId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationCulturalEvent_pkey" PRIMARY KEY ("consultationId","eventId")
);

-- CreateTable
CREATE TABLE "public"."LibraryBlock" (
    "id" SERIAL NOT NULL,
    "libraryId" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationBook_bookIsbn_idx" ON "public"."ConsultationBook"("bookIsbn");

-- CreateIndex
CREATE INDEX "ConsultationMicroContent_microContentId_idx" ON "public"."ConsultationMicroContent"("microContentId");

-- CreateIndex
CREATE INDEX "ConsultationCulturalEvent_eventId_idx" ON "public"."ConsultationCulturalEvent"("eventId");

-- CreateIndex
CREATE INDEX "LibraryBlock_libraryId_startAt_idx" ON "public"."LibraryBlock"("libraryId", "startAt");

-- CreateIndex
CREATE INDEX "LibraryBlock_libraryId_endAt_idx" ON "public"."LibraryBlock"("libraryId", "endAt");

-- CreateIndex
CREATE INDEX "ConsultationSlot_blockedByLibraryBlockId_idx" ON "public"."ConsultationSlot"("blockedByLibraryBlockId");

-- AddForeignKey
ALTER TABLE "public"."ConsultationBook" ADD CONSTRAINT "ConsultationBook_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationBook" ADD CONSTRAINT "ConsultationBook_bookIsbn_fkey" FOREIGN KEY ("bookIsbn") REFERENCES "public"."Book"("isbn") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationMicroContent" ADD CONSTRAINT "ConsultationMicroContent_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationMicroContent" ADD CONSTRAINT "ConsultationMicroContent_microContentId_fkey" FOREIGN KEY ("microContentId") REFERENCES "public"."MicroContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationCulturalEvent" ADD CONSTRAINT "ConsultationCulturalEvent_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationCulturalEvent" ADD CONSTRAINT "ConsultationCulturalEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."CulturalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationSlot" ADD CONSTRAINT "ConsultationSlot_blockedByLibraryBlockId_fkey" FOREIGN KEY ("blockedByLibraryBlockId") REFERENCES "public"."LibraryBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryBlock" ADD CONSTRAINT "LibraryBlock_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

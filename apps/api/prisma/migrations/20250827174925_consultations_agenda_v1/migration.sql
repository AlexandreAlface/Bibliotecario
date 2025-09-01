/*
  Warnings:

  - You are about to drop the column `scheduledAt` on the `Consultation` table. All the data in the column will be lost.
  - The `status` column on the `Consultation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slotId]` on the table `Consultation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Consultation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ConsultationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."SlotStatus" AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ProposalActor" AS ENUM ('FAMILY', 'LIBRARIAN', 'SYSTEM');

-- AlterTable
ALTER TABLE "public"."Consultation" DROP COLUMN "scheduledAt",
ADD COLUMN     "childId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "libraryId" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "mode" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "slotId" INTEGER,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."ConsultationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."ConsultationEvent" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" INTEGER,
    "payload" JSONB,

    CONSTRAINT "ConsultationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsultationSlot" (
    "id" SERIAL NOT NULL,
    "librarianId" INTEGER NOT NULL,
    "libraryId" INTEGER,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."SlotStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsultationProposal" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "proposedBy" "public"."ProposalActor" NOT NULL,
    "fromStartAt" TIMESTAMP(3),
    "fromEndAt" TIMESTAMP(3),
    "toStartAt" TIMESTAMP(3) NOT NULL,
    "toEndAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" "public"."ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,

    CONSTRAINT "ConsultationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationSlot_librarianId_startAt_status_idx" ON "public"."ConsultationSlot"("librarianId", "startAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationSlot_librarianId_startAt_endAt_key" ON "public"."ConsultationSlot"("librarianId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ConsultationProposal_consultationId_status_idx" ON "public"."ConsultationProposal"("consultationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_slotId_key" ON "public"."Consultation"("slotId");

-- CreateIndex
CREATE INDEX "Consultation_librarianId_startAt_idx" ON "public"."Consultation"("librarianId", "startAt");

-- CreateIndex
CREATE INDEX "Consultation_familyId_startAt_idx" ON "public"."Consultation"("familyId", "startAt");

-- AddForeignKey
ALTER TABLE "public"."Consultation" ADD CONSTRAINT "Consultation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consultation" ADD CONSTRAINT "Consultation_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consultation" ADD CONSTRAINT "Consultation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."ConsultationSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationEvent" ADD CONSTRAINT "ConsultationEvent_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationEvent" ADD CONSTRAINT "ConsultationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationSlot" ADD CONSTRAINT "ConsultationSlot_librarianId_fkey" FOREIGN KEY ("librarianId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationSlot" ADD CONSTRAINT "ConsultationSlot_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationProposal" ADD CONSTRAINT "ConsultationProposal_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationProposal" ADD CONSTRAINT "ConsultationProposal_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

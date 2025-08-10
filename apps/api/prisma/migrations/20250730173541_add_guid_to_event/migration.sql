/*
  Warnings:

  - A unique constraint covering the columns `[guid]` on the table `CulturalEvent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guid` to the `CulturalEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CulturalEvent" ADD COLUMN     "guid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CulturalEvent_guid_key" ON "public"."CulturalEvent"("guid");

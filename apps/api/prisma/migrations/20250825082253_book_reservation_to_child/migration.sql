/*
  Warnings:

  - You are about to drop the column `userId` on the `BookReservation` table. All the data in the column will be lost.
  - Added the required column `childId` to the `BookReservation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BookReservation" DROP CONSTRAINT "BookReservation_userId_fkey";

-- AlterTable
ALTER TABLE "public"."BookReservation" DROP COLUMN "userId",
ADD COLUMN     "childId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."BookReservation" ADD CONSTRAINT "BookReservation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

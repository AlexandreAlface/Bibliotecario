/*
  Warnings:

  - A unique constraint covering the columns `[userId,microContentId]` on the table `MicroInteraction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MicroInteraction_userId_microContentId_key" ON "public"."MicroInteraction"("userId", "microContentId");

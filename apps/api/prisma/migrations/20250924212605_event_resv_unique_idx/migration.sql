/*
  Warnings:

  - A unique constraint covering the columns `[familyId,eventId]` on the table `EventReservation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "EventReservation_eventId_status_idx" ON "public"."EventReservation"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventReservation_familyId_eventId_key" ON "public"."EventReservation"("familyId", "eventId");

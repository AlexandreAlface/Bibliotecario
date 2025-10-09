-- DropForeignKey
ALTER TABLE "public"."BadgeAssignment" DROP CONSTRAINT "BadgeAssignment_childId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BookReservation" DROP CONSTRAINT "BookReservation_childId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ChildFamily" DROP CONSTRAINT "ChildFamily_childId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ChildPreference" DROP CONSTRAINT "ChildPreference_childId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Reading" DROP CONSTRAINT "Reading_childId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ChildPreference" ADD CONSTRAINT "ChildPreference_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChildFamily" ADD CONSTRAINT "ChildFamily_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reading" ADD CONSTRAINT "Reading_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BadgeAssignment" ADD CONSTRAINT "BadgeAssignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookReservation" ADD CONSTRAINT "BookReservation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

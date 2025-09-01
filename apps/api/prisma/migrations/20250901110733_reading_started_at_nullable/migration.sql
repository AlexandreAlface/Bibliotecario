-- AlterTable
ALTER TABLE "public"."Reading" ALTER COLUMN "startedAt" DROP NOT NULL,
ALTER COLUMN "startedAt" DROP DEFAULT;

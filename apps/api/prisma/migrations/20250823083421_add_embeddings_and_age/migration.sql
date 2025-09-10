CREATE EXTENSION IF NOT EXISTS vector;


-- AlterTable
ALTER TABLE "public"."Book" ADD COLUMN     "ageMax" INTEGER,
ADD COLUMN     "ageMin" INTEGER,
ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."ChildPreference" (
    "childId" INTEGER NOT NULL,
    "profileText" TEXT,
    "embedding" vector(1536),
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildPreference_childId_key" ON "public"."ChildPreference"("childId");

-- AddForeignKey
ALTER TABLE "public"."ChildPreference" ADD CONSTRAINT "ChildPreference_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

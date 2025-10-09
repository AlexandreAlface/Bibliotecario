/*
  Warnings:

  - Added the required column `updatedAt` to the `MicroContent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MicroContentType" AS ENUM ('BIBLIOTERAPIA', 'DICA', 'FACTO', 'OUTRO');

-- AlterTable
ALTER TABLE "public"."MicroContent" ADD COLUMN     "authorId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "libraryId" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" "public"."MicroContentType" NOT NULL DEFAULT 'BIBLIOTERAPIA',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."MicroContentBook" (
    "microContentId" INTEGER NOT NULL,
    "bookIsbn" TEXT NOT NULL,

    CONSTRAINT "MicroContentBook_pkey" PRIMARY KEY ("microContentId","bookIsbn")
);

-- CreateIndex
CREATE INDEX "MicroContentBook_bookIsbn_idx" ON "public"."MicroContentBook"("bookIsbn");

-- CreateIndex
CREATE INDEX "MicroContent_libraryId_isPublished_idx" ON "public"."MicroContent"("libraryId", "isPublished");

-- CreateIndex
CREATE INDEX "MicroContent_publishedAt_idx" ON "public"."MicroContent"("publishedAt");

-- CreateIndex
CREATE INDEX "MicroContent_type_idx" ON "public"."MicroContent"("type");

-- CreateIndex
CREATE INDEX "MicroInteraction_userId_microContentId_idx" ON "public"."MicroInteraction"("userId", "microContentId");

-- AddForeignKey
ALTER TABLE "public"."MicroContent" ADD CONSTRAINT "MicroContent_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MicroContent" ADD CONSTRAINT "MicroContent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MicroContentBook" ADD CONSTRAINT "MicroContentBook_microContentId_fkey" FOREIGN KEY ("microContentId") REFERENCES "public"."MicroContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MicroContentBook" ADD CONSTRAINT "MicroContentBook_bookIsbn_fkey" FOREIGN KEY ("bookIsbn") REFERENCES "public"."Book"("isbn") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `embedding_at` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `embedding_hash` on the `Book` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."book_embedding_ivf_cos";

-- AlterTable
ALTER TABLE "public"."Book" DROP COLUMN "embedding_at",
DROP COLUMN "embedding_hash";

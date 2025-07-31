/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `CsvSource` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[description]` on the table `Origin` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CsvSource_name_key" ON "public"."CsvSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Origin_description_key" ON "public"."Origin"("description");

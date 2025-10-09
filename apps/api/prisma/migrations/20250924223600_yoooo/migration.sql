-- CreateTable
CREATE TABLE "public"."LibraryBook" (
    "libraryId" INTEGER NOT NULL,
    "bookIsbn" TEXT NOT NULL,
    "quantity" INTEGER,
    "shelfCode" TEXT,
    "accessionNo" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("libraryId","bookIsbn")
);

-- CreateIndex
CREATE INDEX "LibraryBook_bookIsbn_idx" ON "public"."LibraryBook"("bookIsbn");

-- AddForeignKey
ALTER TABLE "public"."LibraryBook" ADD CONSTRAINT "LibraryBook_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryBook" ADD CONSTRAINT "LibraryBook_bookIsbn_fkey" FOREIGN KEY ("bookIsbn") REFERENCES "public"."Book"("isbn") ON DELETE CASCADE ON UPDATE CASCADE;

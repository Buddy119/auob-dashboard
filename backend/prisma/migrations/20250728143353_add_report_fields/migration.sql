-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "reportContent" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "summary" JSONB,
    "apiCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("collectionId", "createdAt", "id", "reportContent", "reportDate", "reportType") SELECT "collectionId", "createdAt", "id", "reportContent", "reportDate", "reportType" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

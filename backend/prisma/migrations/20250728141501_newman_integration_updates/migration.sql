/*
  Warnings:

  - You are about to drop the column `apiName` on the `APIRunResult` table. All the data in the column will be lost.
  - You are about to drop the column `passed` on the `APIRunResult` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `APIRunResult` table. All the data in the column will be lost.
  - You are about to alter the column `responseTime` on the `APIRunResult` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to drop the column `runTime` on the `Run` table. All the data in the column will be lost.
  - Added the required column `itemName` to the `APIRunResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestName` to the `APIRunResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `configName` to the `Run` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_APIRunResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "requestName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseTime" REAL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "responseBody" TEXT,
    "responseHeaders" JSONB,
    "assertions" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIRunResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_APIRunResult" ("errorMessage", "id", "method", "responseBody", "responseHeaders", "responseTime", "runId", "url") SELECT "errorMessage", "id", "method", "responseBody", "responseHeaders", "responseTime", "runId", "url" FROM "APIRunResult";
DROP TABLE "APIRunResult";
ALTER TABLE "new_APIRunResult" RENAME TO "APIRunResult";
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT,
    "configName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Collection" ("createdAt", "description", "id", "name") SELECT "createdAt", "description", "id", "name" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "variableSetName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "passedRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "Run_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("collectionId", "id") SELECT "collectionId", "id" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

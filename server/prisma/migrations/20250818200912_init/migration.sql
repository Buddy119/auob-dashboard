/*
  Warnings:

  - Made the column `id` on table `collection_envs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `collection_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `collections` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `run_assertions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `run_steps` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `runs` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_collection_envs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUri" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collection_envs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_collection_envs" ("collectionId", "createdAt", "fileUri", "id", "isDefault", "name") SELECT "collectionId", "createdAt", "fileUri", "id", "isDefault", "name" FROM "collection_envs";
DROP TABLE "collection_envs";
ALTER TABLE "new_collection_envs" RENAME TO "collection_envs";
CREATE UNIQUE INDEX "collection_envs_collectionId_name_key" ON "collection_envs"("collectionId", "name");
CREATE TABLE "new_collection_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collection_requests_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_collection_requests" ("collectionId", "createdAt", "id", "isCritical", "method", "name", "path", "url") SELECT "collectionId", "createdAt", "id", "isCritical", "method", "name", "path", "url" FROM "collection_requests";
DROP TABLE "collection_requests";
ALTER TABLE "new_collection_requests" RENAME TO "collection_requests";
CREATE INDEX "collection_requests_collectionId_method_idx" ON "collection_requests"("collectionId", "method");
CREATE UNIQUE INDEX "collection_requests_collectionId_path_key" ON "collection_requests"("collectionId", "path");
CREATE TABLE "new_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "fileUri" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_collections" ("createdAt", "description", "fileUri", "id", "name", "updatedAt", "version") SELECT "createdAt", "description", "fileUri", "id", "name", "updatedAt", "version" FROM "collections";
DROP TABLE "collections";
ALTER TABLE "new_collections" RENAME TO "collections";
CREATE INDEX "collections_createdAt_idx" ON "collections"("createdAt");
CREATE TABLE "new_run_assertions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runStepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    CONSTRAINT "run_assertions_runStepId_fkey" FOREIGN KEY ("runStepId") REFERENCES "run_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_run_assertions" ("errorMsg", "id", "name", "runStepId", "status") SELECT "errorMsg", "id", "name", "runStepId", "status" FROM "run_assertions";
DROP TABLE "run_assertions";
ALTER TABLE "new_run_assertions" RENAME TO "run_assertions";
CREATE INDEX "run_assertions_runStepId_idx" ON "run_assertions"("runStepId");
CREATE TABLE "new_run_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "requestId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "latencyMs" INTEGER,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "responseSize" INTEGER,
    "errorMsg" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    CONSTRAINT "run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_steps_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "collection_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_run_steps" ("endedAt", "errorMsg", "httpStatus", "id", "latencyMs", "name", "orderIndex", "requestId", "responseSize", "retries", "runId", "startedAt", "status") SELECT "endedAt", "errorMsg", "httpStatus", "id", "latencyMs", "name", "orderIndex", "requestId", "responseSize", "retries", "runId", "startedAt", "status" FROM "run_steps";
DROP TABLE "run_steps";
ALTER TABLE "new_run_steps" RENAME TO "run_steps";
CREATE INDEX "run_steps_runId_orderIndex_idx" ON "run_steps"("runId", "orderIndex");
CREATE INDEX "run_steps_requestId_idx" ON "run_steps"("requestId");
CREATE TABLE "new_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "environmentId" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "durationMs" INTEGER,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "successRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "p50Ms" INTEGER,
    "p95Ms" INTEGER,
    "p99Ms" INTEGER,
    "reportUri" TEXT,
    "health" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "runs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "runs_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "collection_envs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_runs" ("collectionId", "createdAt", "durationMs", "endedAt", "environmentId", "errorMsg", "failedRequests", "health", "id", "p50Ms", "p95Ms", "p99Ms", "reportUri", "startedAt", "status", "successRequests", "totalRequests", "trigger") SELECT "collectionId", "createdAt", "durationMs", "endedAt", "environmentId", "errorMsg", "failedRequests", "health", "id", "p50Ms", "p95Ms", "p99Ms", "reportUri", "startedAt", "status", "successRequests", "totalRequests", "trigger" FROM "runs";
DROP TABLE "runs";
ALTER TABLE "new_runs" RENAME TO "runs";
CREATE INDEX "runs_collectionId_createdAt_idx" ON "runs"("collectionId", "createdAt");
CREATE INDEX "runs_status_idx" ON "runs"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

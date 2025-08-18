-- CreateTable
CREATE TABLE "collections" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "version" TEXT,
  "fileUri" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER "collections_updatedAt"
AFTER UPDATE ON "collections"
FOR EACH ROW
BEGIN
  UPDATE "collections" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = OLD."id";
END;

CREATE INDEX "collections_createdAt_idx" ON "collections"("createdAt");

CREATE TABLE "collection_envs" (
  "id" TEXT PRIMARY KEY,
  "collectionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fileUri" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_envs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_envs_collectionId_name_key" UNIQUE ("collectionId", "name")
);

CREATE TABLE "collection_requests" (
  "id" TEXT PRIMARY KEY,
  "collectionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "method" TEXT NOT NULL CHECK ("method" IN ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','TRACE')),
  "url" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "isCritical" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_requests_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_requests_collectionId_path_key" UNIQUE ("collectionId","path")
);
CREATE INDEX "collection_requests_collectionId_method_idx" ON "collection_requests"("collectionId","method");

CREATE TABLE "runs" (
  "id" TEXT PRIMARY KEY,
  "collectionId" TEXT NOT NULL,
  "environmentId" TEXT,
  "trigger" TEXT NOT NULL DEFAULT 'manual' CHECK ("trigger" IN ('manual','schedule','api')),
  "status" TEXT NOT NULL DEFAULT 'queued' CHECK ("status" IN ('queued','running','success','partial','fail','timeout','cancelled','error')),
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
  "health" TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK ("health" IN ('UNKNOWN','HEALTHY','DEGRADED','UNHEALTHY')),
  "errorMsg" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "runs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "runs_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "collection_envs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "runs_collectionId_createdAt_idx" ON "runs"("collectionId","createdAt");
CREATE INDEX "runs_status_idx" ON "runs"("status");

CREATE TABLE "run_steps" (
  "id" TEXT PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "requestId" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('success','fail','timeout','skipped')),
  "httpStatus" INTEGER,
  "latencyMs" INTEGER,
  "retries" INTEGER NOT NULL DEFAULT 0,
  "responseSize" INTEGER,
  "errorMsg" TEXT,
  "startedAt" DATETIME,
  "endedAt" DATETIME,
  CONSTRAINT "run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "run_steps_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "collection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "run_steps_runId_orderIndex_idx" ON "run_steps"("runId","orderIndex");
CREATE INDEX "run_steps_requestId_idx" ON "run_steps"("requestId");

CREATE TABLE "run_assertions" (
  "id" TEXT PRIMARY KEY,
  "runStepId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('pass','fail','skipped')),
  "errorMsg" TEXT,
  CONSTRAINT "run_assertions_runStepId_fkey" FOREIGN KEY ("runStepId") REFERENCES "run_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "run_assertions_runStepId_idx" ON "run_assertions"("runStepId");

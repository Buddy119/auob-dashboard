-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "responseStatus" INTEGER,
    "responseStatusText" TEXT,
    "responseHeaders" TEXT,
    "responseContentType" TEXT,
    "responseBody" TEXT,
    "responseBodyEncoding" TEXT,
    "responseTruncated" BOOLEAN NOT NULL DEFAULT false,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

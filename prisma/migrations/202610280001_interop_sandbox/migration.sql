-- Apply ONLY to an isolated synthetic test database. Does not alter clinical tables.
CREATE TABLE "InteropSandboxReceipt" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "normalized" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InteropSandboxReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InteropSandboxReceipt_source_reportId_key" ON "InteropSandboxReceipt"("source", "reportId");
CREATE TABLE "InteropSandboxEvent" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InteropSandboxEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InteropSandboxEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "InteropSandboxReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InteropSandboxEvent_receiptId_createdAt_idx" ON "InteropSandboxEvent"("receiptId", "createdAt");

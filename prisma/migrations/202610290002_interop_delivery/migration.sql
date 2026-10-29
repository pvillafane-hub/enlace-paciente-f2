ALTER TABLE "InteropSandboxReceipt" ADD COLUMN "deliveredDocumentId" TEXT, ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "InteropSandboxReceipt_deliveredDocumentId_key" ON "InteropSandboxReceipt"("deliveredDocumentId");
ALTER TABLE "InteropSandboxReceipt" ADD CONSTRAINT "InteropSandboxReceipt_deliveredDocumentId_fkey" FOREIGN KEY ("deliveredDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "InteropSandboxPatient" ("id" TEXT NOT NULL, "source" TEXT NOT NULL, "externalPatientId" TEXT NOT NULL, "userId" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "InteropSandboxPatient_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "InteropSandboxPatient_source_externalPatientId_key" ON "InteropSandboxPatient"("source", "externalPatientId");
ALTER TABLE "InteropSandboxPatient" ADD CONSTRAINT "InteropSandboxPatient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

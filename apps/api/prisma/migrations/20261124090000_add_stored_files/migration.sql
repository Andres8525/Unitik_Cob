-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('INSTALLATION_SITE', 'INSTALLATION_EQUIPMENT', 'PAYMENT_PROOF', 'PROMOTION');

-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stored_files_purpose_idx" ON "stored_files"("purpose");


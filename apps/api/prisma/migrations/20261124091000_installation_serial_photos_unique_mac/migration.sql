-- Normalize existing MACs so the unique index treats aa:bb and AA:BB as the same device
UPDATE "network_access" SET "macAddress" = UPPER("macAddress") WHERE "macAddress" IS NOT NULL;

-- AlterTable
ALTER TABLE "network_access" ADD COLUMN     "equipmentSerial" TEXT;

-- AlterTable
ALTER TABLE "installation_records" ADD COLUMN     "equipmentPhotoId" TEXT,
ADD COLUMN     "equipmentSerial" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "sitePhotoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "network_access_macAddress_key" ON "network_access"("macAddress");


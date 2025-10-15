/*
  Warnings:

  - You are about to drop the column `province` on the `Clinic` table. All the data in the column will be lost.
  - You are about to drop the column `responsibleOrmed` on the `Clinic` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `Patient` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Clinic_city_province_idx";

-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "province",
DROP COLUMN "responsibleOrmed",
ADD COLUMN     "responsibleCrm" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "province",
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateIndex
CREATE INDEX "Clinic_city_state_idx" ON "Clinic"("city", "state");

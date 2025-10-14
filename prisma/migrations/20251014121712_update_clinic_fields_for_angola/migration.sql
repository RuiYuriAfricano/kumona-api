/*
  Warnings:

  - You are about to drop the column `state` on the `Clinic` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `Clinic` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Clinic_city_state_idx";

-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "state",
DROP COLUMN "zipCode",
ADD COLUMN     "province" TEXT;

-- CreateIndex
CREATE INDEX "Clinic_city_province_idx" ON "Clinic"("city", "province");

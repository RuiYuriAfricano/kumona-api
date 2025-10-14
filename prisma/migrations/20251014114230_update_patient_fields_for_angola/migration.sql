/*
  Warnings:

  - You are about to drop the column `state` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "state",
DROP COLUMN "zipCode",
ADD COLUMN     "province" TEXT;

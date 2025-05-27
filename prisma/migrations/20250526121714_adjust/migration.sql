-- AlterTable
ALTER TABLE "User" ALTER COLUMN "profileImage" SET DEFAULT 'https://www.w3schools.com/howto/img_avatar.png';

-- CreateTable
CREATE TABLE "EyeImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "diagnosisId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EyeImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EyeImage" ADD CONSTRAINT "EyeImage_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

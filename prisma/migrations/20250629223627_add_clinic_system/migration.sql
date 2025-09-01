-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'CLINIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Clinic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "specialties" TEXT[],
    "description" TEXT,
    "logo" TEXT,
    "status" "ClinicStatus" NOT NULL DEFAULT 'PENDING',
    "responsibleName" TEXT NOT NULL,
    "responsibleCpf" TEXT NOT NULL,
    "responsibleCrm" TEXT,
    "userId" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clinicId" INTEGER NOT NULL,
    "addedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDiagnosis" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "recommendations" TEXT[],
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validatedBy" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "specialistNotes" TEXT,
    "correctedCondition" TEXT,
    "correctedSeverity" TEXT,
    "patientId" INTEGER NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistFeedback" (
    "id" SERIAL NOT NULL,
    "diagnosisId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "correctCondition" TEXT,
    "correctSeverity" TEXT,
    "confidence" INTEGER NOT NULL,
    "notes" TEXT,
    "specialistName" TEXT NOT NULL,
    "specialistCrm" TEXT NOT NULL,
    "specialistSpecialty" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialistFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_cnpj_key" ON "Clinic"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_email_key" ON "Clinic"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_userId_key" ON "Clinic"("userId");

-- CreateIndex
CREATE INDEX "Clinic_status_idx" ON "Clinic"("status");

-- CreateIndex
CREATE INDEX "Clinic_city_state_idx" ON "Clinic"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");

-- CreateIndex
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");

-- CreateIndex
CREATE INDEX "Patient_cpf_idx" ON "Patient"("cpf");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_patientId_idx" ON "PatientDiagnosis"("patientId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_clinicId_idx" ON "PatientDiagnosis"("clinicId");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_validated_idx" ON "PatientDiagnosis"("validated");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialistFeedback_diagnosisId_key" ON "SpecialistFeedback"("diagnosisId");

-- CreateIndex
CREATE INDEX "SpecialistFeedback_isCorrect_idx" ON "SpecialistFeedback"("isCorrect");

-- CreateIndex
CREATE INDEX "SpecialistFeedback_processed_idx" ON "SpecialistFeedback"("processed");

-- CreateIndex
CREATE INDEX "SpecialistFeedback_specialistCrm_idx" ON "SpecialistFeedback"("specialistCrm");

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistFeedback" ADD CONSTRAINT "SpecialistFeedback_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "PatientDiagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

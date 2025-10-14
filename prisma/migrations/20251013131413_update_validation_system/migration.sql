-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'CLINIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "about" TEXT,
    "phone" TEXT,
    "profileImage" TEXT DEFAULT 'https://www.w3schools.com/howto/img_avatar.png',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "selectedClinicId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" SERIAL NOT NULL,
    "existingConditions" TEXT[],
    "familyHistory" TEXT[],
    "medications" TEXT[],
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" SERIAL NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderFrequency" TEXT NOT NULL DEFAULT 'daily',
    "language" TEXT NOT NULL DEFAULT 'pt',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "recommendations" TEXT[],
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventionActivity" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreventionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventionTip" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreventionTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EyeImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "diagnosisId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EyeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTip" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "generatedBy" TEXT NOT NULL DEFAULT 'ai',
    "userId" INTEGER NOT NULL,
    "dailyDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTip" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tipId" INTEGER,
    "userTipId" INTEGER,
    "tipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
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
    "responsibleBi" TEXT NOT NULL,
    "responsibleOrmed" TEXT,
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
    "bi" TEXT,
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

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "dailyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "totalTips" INTEGER NOT NULL DEFAULT 0,
    "totalReminders" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPoints" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "activityName" TEXT,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "days" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSent" TIMESTAMP(3),
    "nextScheduled" TIMESTAMP(3),
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reminderId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalHistory_userId_key" ON "MedicalHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "PreventionTip_display_idx" ON "PreventionTip"("display");

-- CreateIndex
CREATE INDEX "UserTip_userId_dailyDate_idx" ON "UserTip"("userId", "dailyDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserTip_userId_dailyDate_id_key" ON "UserTip"("userId", "dailyDate", "id");

-- CreateIndex
CREATE INDEX "SavedTip_userId_idx" ON "SavedTip"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTip_userId_tipId_tipType_key" ON "SavedTip"("userId", "tipId", "tipType");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTip_userId_userTipId_tipType_key" ON "SavedTip"("userId", "userTipId", "tipType");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_nif_key" ON "Clinic"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_email_key" ON "Clinic"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_userId_key" ON "Clinic"("userId");

-- CreateIndex
CREATE INDEX "Clinic_status_idx" ON "Clinic"("status");

-- CreateIndex
CREATE INDEX "Clinic_city_state_idx" ON "Clinic"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_bi_key" ON "Patient"("bi");

-- CreateIndex
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");

-- CreateIndex
CREATE INDEX "Patient_bi_idx" ON "Patient"("bi");

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

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "UserProgress_totalPoints_idx" ON "UserProgress"("totalPoints");

-- CreateIndex
CREATE INDEX "UserProgress_level_idx" ON "UserProgress"("level");

-- CreateIndex
CREATE INDEX "UserPoints_userId_idx" ON "UserPoints"("userId");

-- CreateIndex
CREATE INDEX "UserPoints_activityType_idx" ON "UserPoints"("activityType");

-- CreateIndex
CREATE INDEX "UserPoints_createdAt_idx" ON "UserPoints"("createdAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "Reminder_type_idx" ON "Reminder"("type");

-- CreateIndex
CREATE INDEX "Reminder_isActive_idx" ON "Reminder"("isActive");

-- CreateIndex
CREATE INDEX "Reminder_nextScheduled_idx" ON "Reminder"("nextScheduled");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_sent_idx" ON "NotificationLog"("sent");

-- CreateIndex
CREATE INDEX "NotificationLog_read_idx" ON "NotificationLog"("read");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedClinicId_fkey" FOREIGN KEY ("selectedClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventionActivity" ADD CONSTRAINT "PreventionActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeImage" ADD CONSTRAINT "EyeImage_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTip" ADD CONSTRAINT "UserTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTip" ADD CONSTRAINT "SavedTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPoints" ADD CONSTRAINT "UserPoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

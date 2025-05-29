-- CreateTable
CREATE TABLE "UserTip" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "generatedBy" TEXT NOT NULL DEFAULT 'ai',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserExercise" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT[],
    "duration" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "display" BOOLEAN NOT NULL DEFAULT true,
    "generatedBy" TEXT NOT NULL DEFAULT 'ai',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExercise_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "UserTip_userId_display_idx" ON "UserTip"("userId", "display");

-- CreateIndex
CREATE INDEX "UserTip_createdAt_idx" ON "UserTip"("createdAt");

-- CreateIndex
CREATE INDEX "UserExercise_userId_display_idx" ON "UserExercise"("userId", "display");

-- CreateIndex
CREATE INDEX "UserExercise_createdAt_idx" ON "UserExercise"("createdAt");

-- CreateIndex
CREATE INDEX "SavedTip_userId_idx" ON "SavedTip"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTip_userId_tipId_tipType_key" ON "SavedTip"("userId", "tipId", "tipType");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTip_userId_userTipId_tipType_key" ON "SavedTip"("userId", "userTipId", "tipType");

-- AddForeignKey
ALTER TABLE "UserTip" ADD CONSTRAINT "UserTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExercise" ADD CONSTRAINT "UserExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTip" ADD CONSTRAINT "SavedTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

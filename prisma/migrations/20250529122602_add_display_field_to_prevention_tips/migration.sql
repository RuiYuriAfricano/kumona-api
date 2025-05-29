-- AlterTable
ALTER TABLE "PreventionTip" ADD COLUMN     "display" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "PreventionTip_display_idx" ON "PreventionTip"("display");

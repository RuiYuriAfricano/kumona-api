-- Migration: Add display field to prevention tips
-- This field controls whether the tip should be displayed daily

ALTER TABLE "PreventionTip" ADD COLUMN "display" BOOLEAN NOT NULL DEFAULT true;

-- Update existing tips to be displayed by default
UPDATE "PreventionTip" SET "display" = true WHERE "display" IS NULL;

-- Add index for better performance when filtering by display
CREATE INDEX "PreventionTip_display_idx" ON "PreventionTip"("display");

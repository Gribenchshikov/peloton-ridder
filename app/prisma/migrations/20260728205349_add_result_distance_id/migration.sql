-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "distanceId" TEXT;

-- CreateIndex
CREATE INDEX "Result_distanceId_idx" ON "Result"("distanceId");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

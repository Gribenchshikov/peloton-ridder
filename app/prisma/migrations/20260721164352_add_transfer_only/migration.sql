-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_distanceId_fkey";

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "isTransferOnly" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "distanceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

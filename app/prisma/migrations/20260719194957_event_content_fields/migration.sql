-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "dayProgram" JSONB,
ADD COLUMN     "distanceEquipment" JSONB,
ADD COLUMN     "howToGet" TEXT,
ADD COLUMN     "photoLinks" JSONB;

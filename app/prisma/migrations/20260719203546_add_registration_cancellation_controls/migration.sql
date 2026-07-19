-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "adminComment" TEXT,
ADD COLUMN     "allowReregistration" BOOLEAN NOT NULL DEFAULT false;

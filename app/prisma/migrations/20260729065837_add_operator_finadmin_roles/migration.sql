-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isFinAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOperator" BOOLEAN NOT NULL DEFAULT false;

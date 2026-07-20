-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('INJURY', 'CANT_ATTEND', 'FINANCIAL', 'FAMILY', 'CONFLICT', 'NOT_READY', 'DEFER', 'OTHER');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "cancelComment" TEXT,
ADD COLUMN     "cancelReason" "CancelReason";

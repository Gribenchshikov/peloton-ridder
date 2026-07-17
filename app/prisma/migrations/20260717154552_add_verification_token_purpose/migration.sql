-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "purpose" "TokenPurpose" NOT NULL DEFAULT 'EMAIL_VERIFY';

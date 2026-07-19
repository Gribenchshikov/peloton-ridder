-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('TEAM', 'VOLUNTEER');

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "type" "MemberType" NOT NULL DEFAULT 'TEAM';

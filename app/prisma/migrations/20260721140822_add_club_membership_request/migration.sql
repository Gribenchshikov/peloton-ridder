-- CreateEnum
CREATE TYPE "ClubMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "runningClubId" TEXT;

-- CreateTable
CREATE TABLE "ClubMembershipRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "status" "ClubMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "runningClubId" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMembershipRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_runningClubId_fkey" FOREIGN KEY ("runningClubId") REFERENCES "RunningClub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembershipRequest" ADD CONSTRAINT "ClubMembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembershipRequest" ADD CONSTRAINT "ClubMembershipRequest_runningClubId_fkey" FOREIGN KEY ("runningClubId") REFERENCES "RunningClub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

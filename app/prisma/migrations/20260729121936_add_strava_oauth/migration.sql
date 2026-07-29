-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stravaAccessToken" TEXT,
ADD COLUMN     "stravaAthleteId" TEXT,
ADD COLUMN     "stravaAthleteName" TEXT,
ADD COLUMN     "stravaRefreshToken" TEXT,
ADD COLUMN     "stravaTokenExpiresAt" TIMESTAMP(3);

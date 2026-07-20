-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "runningClubId" TEXT;

-- CreateTable
CREATE TABLE "RunningClub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunningClub_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_runningClubId_fkey" FOREIGN KEY ("runningClubId") REFERENCES "RunningClub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

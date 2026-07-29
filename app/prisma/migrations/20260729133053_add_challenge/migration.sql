-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "challengeWindowEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "isChallenge" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChallengeActivity" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "stravaActivityId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "movingTimeSec" INTEGER NOT NULL,
    "elapsedTimeSec" INTEGER NOT NULL,
    "avgPaceSecPerKm" DOUBLE PRECISION NOT NULL,
    "hasGps" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "invalidReason" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeActivity_stravaActivityId_key" ON "ChallengeActivity"("stravaActivityId");

-- CreateIndex
CREATE INDEX "ChallengeActivity_registrationId_idx" ON "ChallengeActivity"("registrationId");

-- AddForeignKey
ALTER TABLE "ChallengeActivity" ADD CONSTRAINT "ChallengeActivity_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

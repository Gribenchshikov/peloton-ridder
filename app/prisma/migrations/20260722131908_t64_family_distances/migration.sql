-- AlterTable
ALTER TABLE "Distance" ADD COLUMN     "participantRules" JSONB,
ADD COLUMN     "participantsPerSlot" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "additionalParticipants" JSONB;

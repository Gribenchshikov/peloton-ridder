/*
  Warnings:

  - Added the required column `eventId` to the `VolunteerApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `experience` to the `VolunteerApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "volunteerChatUrl" TEXT;

-- AlterTable
ALTER TABLE "VolunteerApplication" ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "experience" TEXT NOT NULL,
ADD COLUMN     "stravaUrl" TEXT;

-- AddForeignKey
ALTER TABLE "VolunteerApplication" ADD CONSTRAINT "VolunteerApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

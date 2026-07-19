-- AlterTable
ALTER TABLE "Distance" ADD COLUMN     "maxSlots" INTEGER,
ADD COLUMN     "qualificationNote" TEXT,
ADD COLUMN     "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresQualification" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MerchItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresSize" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationMerch" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "merchItemId" TEXT NOT NULL,
    "size" TEXT,

    CONSTRAINT "RegistrationMerch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMerch_registrationId_merchItemId_key" ON "RegistrationMerch"("registrationId", "merchItemId");

-- AddForeignKey
ALTER TABLE "MerchItem" ADD CONSTRAINT "MerchItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMerch" ADD CONSTRAINT "RegistrationMerch_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMerch" ADD CONSTRAINT "RegistrationMerch_merchItemId_fkey" FOREIGN KEY ("merchItemId") REFERENCES "MerchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

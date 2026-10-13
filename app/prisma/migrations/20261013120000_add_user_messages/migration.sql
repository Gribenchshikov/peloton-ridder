-- CreateEnum
CREATE TYPE "UserMessageType" AS ENUM ('REGISTRATION', 'PAYMENT', 'ADMIN_CANCEL', 'REREGISTRATION_ALLOWED', 'REFUND_SLOT', 'REFUND_TRANSFER');

-- CreateTable
CREATE TABLE "UserMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserMessageType" NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMessage_userId_createdAt_idx" ON "UserMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMessage_userId_readAt_idx" ON "UserMessage"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

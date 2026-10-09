-- AlterTable
ALTER TABLE "RefundRequest" ADD COLUMN     "amount" INTEGER;
ALTER TABLE "RefundRequest" ADD COLUMN     "apipayRefundId" TEXT;
ALTER TABLE "RefundRequest" ADD COLUMN     "payoutStatus" TEXT;

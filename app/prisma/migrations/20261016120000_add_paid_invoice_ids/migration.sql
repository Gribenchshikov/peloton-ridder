-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "paidInvoiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

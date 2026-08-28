-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refunds_shopId_idempotencyKey_key" ON "refunds"("shopId", "idempotencyKey");

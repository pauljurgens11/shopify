-- One webhook_deliveries row per (subscription, event): BullMQ retries the whole
-- job, so without this the five attempts of a failing delivery become five rows.
-- Safe as a NOT NULL add — no deliveries exist before webhook delivery ships.
ALTER TABLE "webhook_deliveries" ADD COLUMN     "eventId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_subscriptionId_eventId_key" ON "webhook_deliveries"("subscriptionId", "eventId");

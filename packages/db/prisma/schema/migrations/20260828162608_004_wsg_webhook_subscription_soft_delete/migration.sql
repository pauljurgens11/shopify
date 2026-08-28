-- DropIndex
DROP INDEX "webhook_subscriptions_appId_topic_url_key";

-- AlterTable
ALTER TABLE "webhook_subscriptions" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6);

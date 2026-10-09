-- Newsletter subscribers, campaigns, and the site address emails link to.
--
-- Additive: two new tables, two enums, and nullable columns on the two email
-- tables created by the previous migration. Nothing the site already stored
-- is touched. Every statement is guarded so a replay is harmless.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'PAUSED', 'SENT', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "EmailSettings" ADD COLUMN IF NOT EXISTS "privacyPolicyUrl" TEXT;
ALTER TABLE "EmailSettings" ADD COLUMN IF NOT EXISTS "signature" JSONB;
ALTER TABLE "EmailSettings" ADD COLUMN IF NOT EXISTS "siteUrl" TEXT;

-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "EmailMessage" ADD COLUMN IF NOT EXISTS "headers" JSONB;
ALTER TABLE "EmailMessage" ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "source" TEXT NOT NULL DEFAULT 'footer',
    "consentAt" TIMESTAMP(3),
    "consentText" TEXT,
    "confirmTokenHash" TEXT,
    "confirmTokenExpiresAt" TIMESTAMP(3),
    "confirmSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribedCampaignId" TEXT,
    "lastCampaignAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "blocks" JSONB NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "audience" JSONB NOT NULL,
    "fromName" TEXT,
    "replyTo" TEXT,
    "includeSignature" BOOLEAN NOT NULL DEFAULT true,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "siteUrl" TEXT,
    "recipientCount" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_confirmTokenHash_key" ON "NewsletterSubscriber"("confirmTokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_status_scheduledAt_idx" ON "Campaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailMessage_campaignId_idx" ON "EmailMessage"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_campaignId_subscriberId_key" ON "EmailMessage"("campaignId", "subscriberId");


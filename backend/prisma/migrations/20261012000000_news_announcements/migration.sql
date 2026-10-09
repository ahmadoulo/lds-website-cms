-- Announcements: optional fields on News.
--
-- Additive only. Every column is nullable or has a default, so existing
-- articles are untouched and read exactly as before: no banner, not in the
-- "À venir" block, not featured, not archived. Guarded so a replay is harmless.

ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "actions" JSONB;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "bannerScope" TEXT NOT NULL DEFAULT 'home';
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "bannerText" JSONB;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "contact" JSONB;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "eventEndsAt" TIMESTAMP(3);
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "eventStartsAt" TIMESTAMP(3);
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "location" JSONB;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "practicalInfo" JSONB;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "showInBanner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "showInUpcoming" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "visibleFrom" TIMESTAMP(3);
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "visibleUntil" TIMESTAMP(3);

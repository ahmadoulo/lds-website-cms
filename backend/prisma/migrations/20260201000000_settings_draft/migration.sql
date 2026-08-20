-- Site settings gain a draft layer: edits are stored aside and only copied into
-- `value` when the administrator publishes them. All three columns are nullable,
-- so existing rows keep serving their published value untouched.
ALTER TABLE "SiteSettings" ADD COLUMN "draftValue" JSONB;
ALTER TABLE "SiteSettings" ADD COLUMN "draftUpdatedAt" TIMESTAMP(3);
ALTER TABLE "SiteSettings" ADD COLUMN "publishedAt" TIMESTAMP(3);

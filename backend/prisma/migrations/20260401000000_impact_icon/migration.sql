-- A pictogram above each key figure. Nullable, so existing statistics keep
-- rendering exactly as before until an icon is chosen for them.
ALTER TABLE "ImpactStatistic" ADD COLUMN "icon" TEXT;

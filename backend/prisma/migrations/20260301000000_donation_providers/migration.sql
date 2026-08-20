-- Mobile money details for the "Nous soutenir" section. All nullable, so the
-- existing donation methods keep working exactly as before.
ALTER TABLE "DonationMethod" ADD COLUMN "provider" TEXT;
ALTER TABLE "DonationMethod" ADD COLUMN "beneficiary" TEXT;
ALTER TABLE "DonationMethod" ADD COLUMN "paymentLink" TEXT;

ALTER TABLE "leads" DROP COLUMN "ip_hash";--> statement-breakpoint
-- I vecchi hash degli IP (SHA-256 senza chiave) erano reversibili: si azzerano. I nuovi sono HMAC con chiave segreta.
UPDATE "audit_log" SET "ip_hash" = NULL;

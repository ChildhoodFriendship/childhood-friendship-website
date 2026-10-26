ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "paid_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "payment_deadline" text;

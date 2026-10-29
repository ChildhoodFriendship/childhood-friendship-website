-- 0010: valuta del preventivo per progetto (EUR/USD). Gli importi non vengono mai convertiti.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_currency_valid') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_currency_valid" CHECK ("projects"."currency" in ('EUR', 'USD'));
  END IF;
END $$;

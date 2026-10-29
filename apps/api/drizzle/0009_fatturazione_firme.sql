-- 0009: firme del contratto, incassi e fatture elettroniche.
-- Idempotente: in produzione alcune parti (colonne 0007, password_resets 0008) esistono già.

-- Stati progetto ridotti a in_sviluppo / lanciato (allineamento al catalogo)
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "projects" SET "status" = 'in_sviluppo' WHERE "status" NOT IN ('in_sviluppo', 'lanciato');--> statement-breakpoint
DROP TYPE IF EXISTS "public"."project_status";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('in_sviluppo', 'lanciato');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_status" USING "status"::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'in_sviluppo'::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "paid_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "payment_deadline" text;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE "public"."payment_status" AS ENUM('in_attesa', 'riuscito', 'fallito', 'rimborsato', 'annullato');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_tranche') THEN
    CREATE TYPE "public"."payment_tranche" AS ENUM('acconto', 'saldo', 'canone', 'altro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE "public"."invoice_status" AS ENUM('bozza', 'emessa', 'consegnata', 'scartata', 'annullata');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_uq" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "contract_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE cascade,
	"contract_version" text DEFAULT '1.0' NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signer_role" text DEFAULT 'client' NOT NULL,
	"signer_ip" text NOT NULL,
	"signer_user_agent" text NOT NULL,
	"signature_hash" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"legal_consent_text" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contract_signatures_project_idx" ON "contract_signatures" USING btree ("project_id","signed_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE restrict,
	"client_id" uuid NOT NULL REFERENCES "public"."clients"("id") ON DELETE restrict,
	"tranche" "payment_tranche" DEFAULT 'altro' NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" DEFAULT 'in_attesa' NOT NULL,
	"paid_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_uq" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_project_idx" ON "payments" USING btree ("project_id","created_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE restrict,
	"client_id" uuid NOT NULL REFERENCES "public"."clients"("id") ON DELETE restrict,
	"payment_id" uuid REFERENCES "public"."payments"("id") ON DELETE set null,
	"provider" text NOT NULL,
	"provider_invoice_id" text,
	"number" text,
	"issue_date" date,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "invoice_status" DEFAULT 'bozza' NOT NULL,
	"sdi_status" text,
	"pdf_url" text,
	"xml_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_amount_positive" CHECK ("invoices"."amount_cents" > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_provider_uq" ON "invoices" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_project_idx" ON "invoices" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_payment_idx" ON "invoices" USING btree ("payment_id");--> statement-breakpoint

-- Ruolo applicativo a privilegi minimi (esiste solo in produzione).
-- Firme, incassi e fatture: niente DELETE per cf_app (registri da conservare).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cf_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "password_resets" TO cf_app;
    GRANT SELECT, INSERT ON "contract_signatures" TO cf_app;
    GRANT SELECT, INSERT, UPDATE ON "payments" TO cf_app;
    GRANT SELECT, INSERT, UPDATE ON "invoices" TO cf_app;
  END IF;
END $$;

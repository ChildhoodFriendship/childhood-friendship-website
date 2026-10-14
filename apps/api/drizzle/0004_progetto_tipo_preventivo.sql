ALTER TABLE "projects" ADD COLUMN "type" "lead_service" DEFAULT 'altro' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "quote_items" jsonb DEFAULT '[]'::jsonb NOT NULL;
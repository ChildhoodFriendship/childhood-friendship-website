CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"uploaded_by_id" uuid,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "message" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "place_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "maps_url" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outreach_message" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "wa_link" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "offered_service" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_files_project_idx" ON "project_files" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_files_pathname_uq" ON "project_files" USING btree ("pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_place_id_uq" ON "leads" USING btree ("place_id");
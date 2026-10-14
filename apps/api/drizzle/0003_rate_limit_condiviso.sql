CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- Il ruolo applicativo (privilegi minimi) esiste solo in produzione
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cf_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "rate_limits" TO cf_app;
  END IF;
END $$;

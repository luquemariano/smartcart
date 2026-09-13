CREATE TYPE "public"."shopping_session_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "shopping_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"store_id" text,
	"status" "shopping_session_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_sessions" ADD CONSTRAINT "shopping_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_sessions_one_active_per_owner_idx" ON "shopping_sessions" USING btree ("owner_user_id") WHERE "shopping_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "shopping_sessions_owner_started_at_idx" ON "shopping_sessions" USING btree ("owner_user_id","started_at");
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"branch_name" text,
	"normalized_branch_name" text,
	"address" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_owner_name_branch_unique" UNIQUE("owner_user_id","normalized_name","normalized_branch_name")
);
--> statement-breakpoint
CREATE INDEX "stores_owner_user_id_idx" ON "stores" USING btree ("owner_user_id");
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"brand" text,
	"normalized_brand" text,
	"barcode" text,
	"normalized_barcode" text,
	"quantity_value" numeric(19, 4),
	"quantity_unit" text,
	"duplicate_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_owner_barcode_unique" UNIQUE("owner_user_id","normalized_barcode"),
	CONSTRAINT "products_owner_duplicate_key_unique" UNIQUE("owner_user_id","duplicate_key")
);
--> statement-breakpoint
CREATE INDEX "products_owner_user_id_idx" ON "products" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "products_owner_name_idx" ON "products" USING btree ("owner_user_id","normalized_name");
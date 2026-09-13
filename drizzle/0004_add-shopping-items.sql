CREATE TABLE "shopping_items" (
	"id" text PRIMARY KEY NOT NULL,
	"shopping_session_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_brand" text,
	"product_barcode" text,
	"product_quantity_value" numeric(19, 4),
	"product_quantity_unit" text,
	"quantity" numeric(12, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_items_session_product_unique" UNIQUE("shopping_session_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_session_id_fkey" FOREIGN KEY ("shopping_session_id") REFERENCES "public"."shopping_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopping_items_session_id_idx" ON "shopping_items" USING btree ("shopping_session_id");--> statement-breakpoint
CREATE INDEX "shopping_items_product_id_idx" ON "shopping_items" USING btree ("product_id");
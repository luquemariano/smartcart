CREATE TABLE IF NOT EXISTS "shopping_lists" ("id" text PRIMARY KEY NOT NULL, "owner_user_id" text NOT NULL, "name" text NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "shopping_list_items" ("id" text PRIMARY KEY NOT NULL, "shopping_list_id" text NOT NULL, "product_id" text, "product_name" text NOT NULL, "product_brand" text, "product_barcode" text, "product_quantity_value" numeric(19,4), "product_quantity_unit" text, "quantity" numeric(12,3) NOT NULL, "is_checked" boolean DEFAULT false NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL);
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE cascade;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict;
CREATE INDEX IF NOT EXISTS "shopping_lists_owner_updated_at_idx" ON "shopping_lists" ("owner_user_id", "updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "shopping_list_items_list_product_unique" ON "shopping_list_items" ("shopping_list_id", "product_id") WHERE "product_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "shopping_list_items_list_id_idx" ON "shopping_list_items" ("shopping_list_id");
CREATE INDEX IF NOT EXISTS "shopping_list_items_product_id_idx" ON "shopping_list_items" ("product_id");

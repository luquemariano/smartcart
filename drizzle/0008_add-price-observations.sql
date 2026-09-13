CREATE TABLE IF NOT EXISTS "price_observations" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "store_id" text NOT NULL,
  "unit_price" numeric(19,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'ARS' NOT NULL,
  "observed_at" timestamptz NOT NULL,
  "source" varchar(40) NOT NULL,
  "shopping_session_id" text,
  "shopping_item_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict;
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE restrict;
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_session_id_fkey" FOREIGN KEY ("shopping_session_id") REFERENCES "shopping_sessions"("id") ON DELETE set null;
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_item_id_fkey" FOREIGN KEY ("shopping_item_id") REFERENCES "shopping_items"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "price_observations_owner_product_observed_idx" ON "price_observations" ("owner_user_id", "product_id", "observed_at");
CREATE INDEX IF NOT EXISTS "price_observations_owner_store_product_observed_idx" ON "price_observations" ("owner_user_id", "store_id", "product_id", "observed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "price_observations_item_unique" ON "price_observations" ("shopping_item_id") WHERE "shopping_item_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "guest_imports" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL,
  "guest_id_hash" text NOT NULL,
  "imported_at" timestamptz DEFAULT now() NOT NULL,
  "version" integer NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "guest_imports_owner_guest_unique" ON "guest_imports" ("owner_user_id", "guest_id_hash");
CREATE INDEX IF NOT EXISTS "guest_imports_owner_user_id_idx" ON "guest_imports" ("owner_user_id");

CREATE TABLE IF NOT EXISTS client_operations (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL,
  operation_id text NOT NULL,
  operation_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  result_entity_id text,
  CONSTRAINT client_operations_owner_operation_unique UNIQUE (owner_user_id, operation_id)
);
CREATE INDEX IF NOT EXISTS client_operations_owner_idx ON client_operations(owner_user_id);

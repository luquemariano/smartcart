CREATE TABLE IF NOT EXISTS promotions (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL,
  store_id text NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  product_id text NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type text NOT NULL,
  value numeric(19,2),
  buy_quantity numeric(9,0),
  pay_quantity numeric(9,0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_dates_check CHECK (starts_at < ends_at),
  CONSTRAINT promotions_type_check CHECK (type IN ('percentage','fixed_price','buy_n_pay_m'))
);
CREATE INDEX IF NOT EXISTS promotions_owner_store_product_idx ON promotions(owner_user_id, store_id, product_id);
CREATE INDEX IF NOT EXISTS promotions_owner_dates_idx ON promotions(owner_user_id, starts_at, ends_at);

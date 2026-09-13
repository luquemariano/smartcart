import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query(`
    INSERT INTO price_observations
      (id, owner_user_id, product_id, store_id, unit_price, currency, observed_at, source, shopping_session_id, shopping_item_id)
    SELECT gen_random_uuid()::text, s.owner_user_id, i.product_id, s.store_id, i.unit_price,
      s.currency, COALESCE(s.finished_at, s.updated_at), 'shopping_session', s.id, i.id
    FROM shopping_sessions s
    JOIN shopping_items i ON i.shopping_session_id = s.id
    JOIN products p ON p.id = i.product_id AND p.owner_user_id = s.owner_user_id
    JOIN stores st ON st.id = s.store_id AND st.owner_user_id = s.owner_user_id
    WHERE s.status = 'completed' AND s.store_id IS NOT NULL AND i.product_id IS NOT NULL
      AND i.unit_price IS NOT NULL AND s.currency = 'ARS'
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  const eligible = await pool.query(
    `SELECT count(*)::int AS count FROM shopping_sessions s JOIN shopping_items i ON i.shopping_session_id=s.id WHERE s.status='completed' AND s.store_id IS NOT NULL AND i.product_id IS NOT NULL AND i.unit_price IS NOT NULL AND s.currency='ARS'`,
  );
  console.log(
    JSON.stringify({
      sessionsCompleted: (
        await pool.query(
          "SELECT count(*)::int AS count FROM shopping_sessions WHERE status='completed' AND store_id IS NOT NULL",
        )
      ).rows[0].count,
      eligibleItems: eligible.rows[0].count,
      observationsCreated: result.rowCount ?? 0,
      observationsSkipped: Math.max(
        0,
        eligible.rows[0].count - (result.rowCount ?? 0),
      ),
    }),
  );
} finally {
  await pool.end();
}

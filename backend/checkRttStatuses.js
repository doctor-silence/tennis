const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  try {
    const result = await pool.query(`
      SELECT id, name, status, stage_status, rtt_link, target_group_id, start_date, end_date
      FROM tournaments
      WHERE COALESCE(rtt_link, '') != ''
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

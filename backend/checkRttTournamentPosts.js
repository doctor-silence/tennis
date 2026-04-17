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
    const tournaments = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.status,
        t.stage_status,
        t.rtt_link,
        t.target_group_id,
        t.group_name,
        (
          SELECT COUNT(*)
          FROM posts p
          WHERE p.content ->> 'tournamentId' = t.id::text
            AND p.type = 'match_result'
        ) AS match_result_posts,
        (
          SELECT COUNT(*)
          FROM posts p
          WHERE p.content ->> 'tournamentId' = t.id::text
            AND p.type = 'tournament_result'
        ) AS tournament_result_posts,
        (
          SELECT COUNT(*)
          FROM posts p
          WHERE p.content ->> 'tournamentId' = t.id::text
            AND p.type = 'tournament_stage_update'
        ) AS tournament_stage_posts
      FROM tournaments t
      WHERE COALESCE(t.rtt_link, '') != ''
      ORDER BY t.id DESC
      LIMIT 40;
    `);

    console.log('\nRTT tournaments:');
    tournaments.rows.forEach((row) => {
      console.log(JSON.stringify(row, null, 2));
    });

    const latestPosts = await pool.query(`
      SELECT id, type, group_id, created_at, content
      FROM posts
      WHERE type IN ('match_result', 'tournament_result', 'tournament_stage_update')
      ORDER BY created_at DESC
      LIMIT 30;
    `);

    console.log('\nLatest tournament-related posts:');
    latestPosts.rows.forEach((row) => {
      console.log(JSON.stringify({
        id: row.id,
        type: row.type,
        group_id: row.group_id,
        created_at: row.created_at,
        tournamentId: row.content?.tournamentId,
        tournamentName: row.content?.tournamentName,
        stageLabel: row.content?.stageLabel,
        winnerName: row.content?.winnerName,
      }, null, 2));
    });
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

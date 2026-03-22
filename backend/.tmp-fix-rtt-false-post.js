const pool = require('./db');

(async () => {
  const tournamentNeedle = 'Региональные Соревнования Ханты-Мансийского автономного округа';

  const postsResult = await pool.query(
    `SELECT id, type, content
     FROM posts
     WHERE type IN ('tournament_result', 'match_result', 'tournament_stage_update')
       AND (
         content ->> 'tournamentName' ILIKE $1
         OR content ->> 'winnerName' ~ '^\\d+$'
       )
     ORDER BY id DESC`,
    [`%${tournamentNeedle}%`]
  );

  const tournamentsResult = await pool.query(
    `SELECT id, name, status, stage_status, start_date, end_date, rtt_link
     FROM tournaments
     WHERE name ILIKE $1
     ORDER BY id DESC`,
    [`%${tournamentNeedle}%`]
  );

  console.log(JSON.stringify({
    posts: postsResult.rows,
    tournaments: tournamentsResult.rows,
  }, null, 2));

  const falsePostIds = postsResult.rows
    .filter((row) => {
      const winnerName = row.content?.winnerName || '';
      const note = row.content?.note || '';
      return /^\d+$/.test(String(winnerName)) || String(note).includes('автоматически');
    })
    .map((row) => row.id);

  if (falsePostIds.length > 0) {
    await pool.query('DELETE FROM posts WHERE id = ANY($1::int[])', [falsePostIds]);
  }

  if (tournamentsResult.rows.length > 0) {
    const tournament = tournamentsResult.rows[0];
    await pool.query(
      `UPDATE tournaments
       SET status = 'open',
           stage_status = 'Турнир еще не начался'
       WHERE id = $1`,
      [tournament.id]
    );
  }

  console.log(JSON.stringify({
    deletedPostIds: falsePostIds,
    updatedTournamentId: tournamentsResult.rows[0]?.id || null,
  }, null, 2));

  await pool.end();
})().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

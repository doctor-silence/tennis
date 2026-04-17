const { Pool } = require('pg');
const rttParser = require('./rttParser');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const normalizeComparableText = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/[«»"']/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const extractCleanPlayerName = (rawName = '') => {
  let name = String(rawName || '').replace(/\s+/g, ' ').trim();
  name = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  name = name.replace(/\s+\d+\s*лет.*$/i, '').trim();
  name = name.replace(/\s*,.*$/g, '').trim();
  return name.replace(/\s+/g, ' ').trim();
};

const isLikelyHumanName = (value = '') => {
  const cleaned = extractCleanPlayerName(value);
  if (!cleaned || cleaned.length < 3) return false;
  if (/^\d+$/.test(cleaned)) return false;
  return /[A-Za-zА-Яа-яЁё]/.test(cleaned);
};

const parseRuDateToTimestamp = (value = '') => {
  const matched = String(value || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!matched) return 0;
  return new Date(`${matched[3]}-${matched[2]}-${matched[1]}T00:00:00Z`).getTime();
};

const pickTournamentWinner = (participants = []) => {
  const winnerRow = participants.find((participant) => /^1([.)]|$)/.test(String(participant.place || participant.placement || '').trim()));
  if (!winnerRow) return '';
  const winnerName = extractCleanPlayerName(winnerRow.name);
  return isLikelyHumanName(winnerName) ? winnerName : '';
};

const findRelevantFinalMatch = ({ tournament, detailsTournament, recentMatches, winnerName }) => {
  const tournamentNameNeedle = normalizeComparableText(detailsTournament?.name || tournament.name || '');
  const cityNeedle = normalizeComparableText(detailsTournament?.city || tournament.city || '');
  const ageGroupNeedle = normalizeComparableText(detailsTournament?.ageGroup || tournament.age_group || tournament.ageGroup || '');

  const filteredMatches = (recentMatches || [])
    .filter((match) => {
      const matchTournament = normalizeComparableText(match.tournament || '');
      const matchCity = normalizeComparableText(match.city || '');
      const matchAgeGroup = normalizeComparableText(match.ageGroup || '');

      const tournamentMatches = tournamentNameNeedle && matchTournament.includes(tournamentNameNeedle);
      const cityMatches = !cityNeedle || !matchCity || matchCity.includes(cityNeedle) || cityNeedle.includes(matchCity);
      const ageGroupMatches = !ageGroupNeedle || !matchAgeGroup || matchAgeGroup.includes(ageGroupNeedle) || ageGroupNeedle.includes(matchAgeGroup);

      return tournamentMatches && cityMatches && ageGroupMatches;
    })
    .sort((left, right) => parseRuDateToTimestamp(right.date) - parseRuDateToTimestamp(left.date));

  if (!filteredMatches.length) return null;

  if (winnerName) {
    const normalizedWinner = normalizeComparableText(winnerName);
    const byWinner = filteredMatches.find((match) => (
      normalizeComparableText(match.player1Name) === normalizedWinner
      || normalizeComparableText(match.player2Name) === normalizedWinner
    ));
    if (byWinner) return byWinner;
  }

  return filteredMatches[0];
};

const resolveTournamentGroupId = (targetGroupId) => {
  if (!targetGroupId || !/^\d+$/.test(String(targetGroupId))) return null;
  return parseInt(String(targetGroupId), 10);
};

const hasTournamentPost = async (client, tournamentId, type) => {
  const result = await client.query(
    `SELECT 1 FROM posts WHERE type = $1 AND content ->> 'tournamentId' = $2 LIMIT 1`,
    [type, String(tournamentId)]
  );
  return result.rows.length > 0;
};

const hasTournamentStagePost = async (client, tournamentId, stageLabel) => {
  const result = await client.query(
    `SELECT 1
     FROM posts
     WHERE type = 'tournament_stage_update'
       AND content ->> 'tournamentId' = $1
       AND content ->> 'stageLabel' = $2
     LIMIT 1`,
    [String(tournamentId), stageLabel]
  );
  return result.rows.length > 0;
};

const hasTournamentAnnouncementPost = async (client, tournamentId, announcementKind) => {
  const result = await client.query(
    `SELECT 1
     FROM posts
     WHERE type = 'tournament_announcement'
       AND content ->> 'tournamentId' = $1
       AND content ->> 'announcementKind' = $2
     LIMIT 1`,
    [String(tournamentId), announcementKind]
  );
  return result.rows.length > 0;
};

async function main() {
  const recentMatchesResult = await rttParser.getRecentMatches(250);
  const recentMatches = recentMatchesResult?.success ? recentMatchesResult.data : [];

  const tournamentsResult = await pool.query(`
    SELECT id, user_id, name, group_name, target_group_id, rtt_link, status, stage_status,
           start_date, end_date, prize_pool, category, tournament_type, gender,
           age_group, system, match_format, participants_count, creator_role
    FROM tournaments
    WHERE COALESCE(rtt_link, '') != ''
    ORDER BY id DESC
  `);

  let changed = 0;

  for (const tournament of tournamentsResult.rows) {
    const details = await rttParser.getTournamentDetails(tournament.rtt_link);
    if (!details?.success) continue;

    const detailsTournament = details.tournament || {};
    if (detailsTournament.lifecycleStatus !== 'finished') continue;

    const winnerName = pickTournamentWinner(detailsTournament.participants || []);
    const finalMatch = findRelevantFinalMatch({
      tournament,
      detailsTournament,
      recentMatches,
      winnerName,
    });

    const finalWinnerName = winnerName || (finalMatch?.score
      ? (rttParser.determineMatchResult(finalMatch.score) ? finalMatch.player1Name : finalMatch.player2Name)
      : '');

    const groupId = resolveTournamentGroupId(tournament.target_group_id);
    const groupName = tournament.group_name || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!(await hasTournamentAnnouncementPost(client, tournament.id, 'started'))) {
        await client.query(
          `INSERT INTO posts (user_id, group_id, type, content)
           VALUES ($1, $2, 'tournament_announcement', $3::jsonb)`,
          [
            tournament.user_id,
            groupId,
            JSON.stringify({
              tournamentId: String(tournament.id),
              announcementKind: 'started',
              title: tournament.name,
              name: tournament.name,
              groupName,
              prizePool: tournament.prize_pool || null,
              date: tournament.start_date || null,
              authorName: 'Администрация',
              status: 'live',
              stageStatus: detailsTournament.statusLabel || detailsTournament.stageStatus || tournament.stage_status || 'Турнир идет',
              category: detailsTournament.category || tournament.category || null,
              tournamentType: detailsTournament.type || tournament.tournament_type || null,
              gender: detailsTournament.gender || tournament.gender || null,
              ageGroup: detailsTournament.ageGroup || tournament.age_group || null,
              system: detailsTournament.system || tournament.system || null,
              matchFormat: tournament.match_format || null,
              participantsCount: Array.isArray(detailsTournament.participants)
                ? detailsTournament.participants.length
                : Number(detailsTournament.participantsCount || tournament.participants_count || 0) || null,
              startDate: tournament.start_date || null,
              endDate: tournament.end_date || null,
              creatorRole: tournament.creator_role || 'admin',
              rttLink: tournament.rtt_link || null,
              rtt_link: tournament.rtt_link || null,
            })
          ]
        );
        changed += 1;
      }

      if (finalMatch && !(await hasTournamentPost(client, tournament.id, 'match_result'))) {
        await client.query(
          `INSERT INTO posts (user_id, group_id, type, content)
           VALUES ($1, $2, 'match_result', $3::jsonb)`,
          [
            tournament.user_id,
            groupId,
            JSON.stringify({
              tournamentId: String(tournament.id),
              tournamentName: tournament.name,
              groupName,
              round: 'Финал',
              player1Name: finalMatch.player1Name,
              player2Name: finalMatch.player2Name,
              score: finalMatch.score,
              winnerName: finalWinnerName || undefined,
              note: 'Результат финала автоматически загружен из РТТ',
              authorLabel: 'Администрация',
              rttLink: tournament.rtt_link || null,
            })
          ]
        );
        changed += 1;
      }

      if (isLikelyHumanName(finalWinnerName) && !(await hasTournamentPost(client, tournament.id, 'tournament_result'))) {
        await client.query(
          `INSERT INTO posts (user_id, group_id, type, content)
           VALUES ($1, $2, 'tournament_result', $3::jsonb)`,
          [
            tournament.user_id,
            groupId,
            JSON.stringify({
              tournamentId: String(tournament.id),
              tournamentName: tournament.name,
              groupName,
              winnerName: extractCleanPlayerName(finalWinnerName),
              winnerAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(extractCleanPlayerName(finalWinnerName))}&background=f59e0b&color=fff`,
              note: 'Победитель автоматически определён по данным РТТ',
              authorLabel: 'Администрация',
              rttLink: tournament.rtt_link || null,
            })
          ]
        );
        changed += 1;
      }

      if (!(await hasTournamentStagePost(client, tournament.id, 'Турнир завершён'))) {
        await client.query(
          `INSERT INTO posts (user_id, group_id, type, content)
           VALUES ($1, $2, 'tournament_stage_update', $3::jsonb)`,
          [
            tournament.user_id,
            groupId,
            JSON.stringify({
              tournamentId: String(tournament.id),
              tournamentName: tournament.name,
              groupName,
              stageLabel: 'Турнир завершён',
              message: `Турнир «${tournament.name}» завершён.${finalWinnerName ? ` Победитель: ${extractCleanPlayerName(finalWinnerName)}.` : ''}`,
              winnerName: finalWinnerName ? extractCleanPlayerName(finalWinnerName) : undefined,
              rttLink: tournament.rtt_link || null,
            })
          ]
        );
        changed += 1;
      }

      await client.query(
        `UPDATE tournaments
         SET status = 'finished',
             stage_status = COALESCE($1, stage_status)
         WHERE id = $2`,
        [detailsTournament.statusLabel || 'Турнир завершен', tournament.id]
      );

      await client.query('COMMIT');
      console.log(`Processed tournament ${tournament.id}: ${tournament.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed tournament ${tournament.id}:`, error.message);
    } finally {
      client.release();
    }
  }

  console.log(`Backfill complete. New/updated records: ${changed}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

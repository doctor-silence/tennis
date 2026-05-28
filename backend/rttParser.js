const cheerio = require('cheerio');
const mytennis = require('./rttMytennisClient');
const { WEB_ORIGIN } = require('./rttMytennisClient');

/**
 * RTT Parser — данные игроков и турниров из rtt.mytennis.online (API apirtt.mytennis.online).
 */

class RTTParser {
  constructor() {
    this.baseURL = WEB_ORIGIN;
    this.requestTimeout = Number(process.env.RTT_MYTENNIS_TIMEOUT_MS || 20000);
    this.source = 'rtt.mytennis.online';
    // Кэш для списка турниров: key → { data, expireAt }
    this._tourCache = new Map();
    this._tourCacheTTL = Number(process.env.RTT_TOUR_CACHE_TTL_MS || 15 * 60 * 1000);
    this._tourStaleTTL = 60 * 60 * 1000; // устаревший кэш — отдаём при таймауте API
    this._tourInFlight = new Map();
    this._tourDetailsCache = new Map();
    this._tourDetailsCacheTTL = Number(process.env.RTT_TOUR_DETAILS_CACHE_TTL_MS || 30 * 60 * 1000);
    this._tourFilterCache = { data: null, expireAt: 0 };
    this._playerIdCache = new Map();
  }

  getTourListTimeoutMs() {
    return Number(process.env.RTT_MYTENNIS_TOUR_TIMEOUT_MS || 45000);
  }

  getTourListPeriod() {
    const now = new Date();
    return {
      begin: this.addMonthsIso(now, -1),
      end: this.addMonthsIso(now, 3)
    };
  }

  applyTourLocationFilters(payload, filters = {}) {
    if (filters.city) {
      payload.location_id = filters.city;
    } else if (filters.subject) {
      payload.location_id = filters.subject;
    } else if (filters.district) {
      payload.location_id = filters.district;
    }
  }

  sortFilterOptions(options = []) {
    return [...options].sort((left, right) => left.label.localeCompare(right.label, 'ru'));
  }

  calculateAverageParticipantRating(participants = []) {
    const values = participants
      .map((participant) => parseInt(String(participant.rating || participant.points || '').replace(/[^\d]/g, ''), 10))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!values.length) return '';
    return String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  }

  async getTournamentFilterOptions() {
    if (this._tourFilterCache.data && Date.now() < this._tourFilterCache.expireAt) {
      return this._tourFilterCache.data;
    }

    const limit = Number(process.env.RTT_LOCATION_FILTER_LIMIT || 3000);
    const timeout = Number(process.env.RTT_LOCATION_FILTER_TIMEOUT_MS || 25000);
    const data = await mytennis.callPublic(
      { 'method[0]': 'location.search.term', term: '', limit },
      { timeout }
    );
    const rows = Array.isArray(data['location.search.term']) ? data['location.search.term'] : [];

    const districts = new Map();
    const subjects = new Map();
    const cities = new Map();

    for (const row of rows) {
      const id = String(row.location_id || '').trim();
      const label = String(row.name || '').trim();
      const type = String(row.type || '').trim();
      const path = String(row.path || '').trim();
      const parentIds = String(row.parents || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!id || !label) continue;
      if (path && !path.includes('Россия') && !path.includes('RUS')) continue;

      if (type === '1') {
        districts.set(id, { value: id, label });
      } else if (type === '2') {
        const parent = parentIds[0] || '';
        subjects.set(id, { value: id, label, parent });
      } else if (type === '5') {
        const parent = parentIds[0] || '';
        cities.set(id, { value: id, label, parent });
      }
    }

    const result = {
      districts: this.sortFilterOptions([...districts.values()]),
      subjects: this.sortFilterOptions([...subjects.values()]),
      cities: this.sortFilterOptions([...cities.values()])
    };

    this._tourFilterCache = {
      data: result,
      expireAt: Date.now() + Number(process.env.RTT_LOCATION_FILTER_TTL_MS || 12 * 60 * 60 * 1000)
    };

    return result;
  }

  mapTourListRecords(records = []) {
    return records.map((row, index) => {
      const tourId = String(row.tour_id || row.wizard_id || '').trim();
      const startDate = this.formatIsoToRuDate(row.begin_date);
      const endDate = this.formatIsoToRuDate(row.end_date || row.begin_date);

      return {
        id: index,
        city: row.location || row.location_full || '',
        type: row.tour_type || '',
        ageGroup: row.player_age || '',
        category: row.tour_category || '',
        startDate,
        endDate,
        surface: Array.isArray(row.covers) ? row.covers.join(', ') : '',
        applications: row.tour_members || '',
        avgRating: row.tour_rating || '',
        status: String(row.is_finished) === '1' ? 'Завершен' : 'Открыт',
        name: row.name || '',
        link: this.buildTourLink(tourId)
      };
    }).filter((row) => row.name && row.city);
  }

  async fetchTourRosterRecords(payload, options = {}) {
    const timeout = options.timeout ?? this.getTourListTimeoutMs();
    const maxPages = Number(options.maxPages || process.env.RTT_TOUR_LIST_MAX_PAGES || 3);
    const perPage = Number(options.perPage || process.env.RTT_TOUR_LIST_PER_PAGE || 50);

    const first = await mytennis.callPublic(
      { ...payload, page_no: 1, per_page: perPage },
      { timeout }
    );
    const roster = first['tour.roster'] || {};
    let records = roster.records || [];
    const navigator = roster.navigator || {};
    const pageMax = Number(navigator.page_max || 1);
    const totalCount = Number(navigator.count || records.length);

    const pagesToFetch = Math.min(pageMax, Math.max(1, maxPages));
    if (pagesToFetch > 1) {
      const pageRequests = [];
      for (let pageNo = 2; pageNo <= pagesToFetch; pageNo += 1) {
        pageRequests.push(
          mytennis.callPublic({ ...payload, page_no: pageNo, per_page: perPage }, { timeout })
        );
      }
      const pages = await Promise.all(pageRequests);
      for (const pageData of pages) {
        records = records.concat(pageData['tour.roster']?.records || []);
      }
    }

    return {
      records,
      totalCount,
      truncated: pageMax > pagesToFetch,
      pageMax,
      pagesLoaded: pagesToFetch
    };
  }

  formatIsoToRuDate(value = '') {
    const matched = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!matched) {
      return String(value || '').trim();
    }
    return `${matched[3]}.${matched[2]}.${matched[1]}`;
  }

  formatIsoRangeToRu(begin = '', end = '') {
    const start = this.formatIsoToRuDate(begin);
    const finish = this.formatIsoToRuDate(end || begin);
    if (start && finish && start !== finish) {
      return `${start} - ${finish}`;
    }
    return start || finish || '';
  }

  addMonthsIso(date, months) {
    const copy = new Date(date.getTime());
    copy.setMonth(copy.getMonth() + months);
    return copy.toISOString().slice(0, 10);
  }

  extractTourIdFromUrl(tournamentUrl = '') {
    const raw = String(tournamentUrl || '').trim();
    if (!raw) return null;

    const mytennisMatch = raw.match(/\/tours\/(\d{4,})/i);
    if (mytennisMatch) return mytennisMatch[1];

    const legacyMatch = raw.match(/\/tour\/(\d{4,})/i);
    if (legacyMatch) return legacyMatch[1];

    const digits = raw.match(/\d{5,}/);
    return digits ? digits[0] : null;
  }

  buildTourLink(tourId) {
    return tourId ? `${WEB_ORIGIN}/public/tours/${tourId}/dashboard` : null;
  }

  buildPlayerLink(playerId, rni) {
    if (playerId) {
      return `${WEB_ORIGIN}/players/${playerId}`;
    }
    return rni ? `${WEB_ORIGIN}/public/ranking/solo` : null;
  }

  computeAgeFromBirthDate(birthDate = '') {
    const matched = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!matched) return null;
    const birth = new Date(`${matched[1]}-${matched[2]}-${matched[3]}T00:00:00Z`);
    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }

  normalizeRatingRosterKey(ratingItem = {}) {
    if (ratingItem.rating_date) {
      return String(ratingItem.rating_date).replace(/-/g, '');
    }

    const ratingId = String(ratingItem.rating_id || '');
    if (ratingId.length === 9) {
      return ratingId.slice(0, 8);
    }

    return ratingId;
  }

  async getLatestRatingContext() {
    const data = await mytennis.callPublic({ 'method[0]': 'rating.list' });
    const list = data['rating.list'] || [];
    const preferred = list.find((item) => String(item.rank) === '1') || list[0];

    if (!preferred) {
      return { ratingId: null, rosterKey: null, rank: 1 };
    }

    return {
      ratingId: preferred.rating_id || null,
      rosterKey: this.normalizeRatingRosterKey(preferred),
      rank: parseInt(preferred.rank, 10) || 1
    };
  }

  async getLatestRatingId() {
    const context = await this.getLatestRatingContext();
    return context.ratingId;
  }

  async resolvePlayerByRni(rni) {
    const normalizedRni = String(rni || '').trim();
    if (!normalizedRni) return null;

    const cached = this._playerIdCache.get(normalizedRni);
    if (cached && Date.now() < cached.expireAt) {
      return cached.data;
    }

    try {
      const linked = await mytennis.callEntry({ 'method[0]': 'player.list' });
      const linkedPlayers = linked['player.list'] || [];
      const linkedRecord = linkedPlayers.find((row) => String(row.rtt_number) === normalizedRni);
      if (linkedRecord) {
        const mapped = {
          player_id: linkedRecord.player_id,
          rtt_number: linkedRecord.rtt_number,
          name: [linkedRecord.name_f, linkedRecord.name_i, linkedRecord.name_o].filter(Boolean).join(' '),
          birth_date: linkedRecord.birth_date,
          city: ''
        };
        this._playerIdCache.set(normalizedRni, {
          data: mapped,
          expireAt: Date.now() + 10 * 60 * 1000
        });
        return mapped;
      }
    } catch (linkedError) {
      console.warn('player.list недоступен:', linkedError.message);
    }

    const { ratingId, rosterKey, rank } = await this.getLatestRatingContext();
    if (!rosterKey) return null;

    const data = await mytennis.callPublic({
      'method[0]': 'rating.roster',
      page_no: 1,
      per_page: 10,
      rating: rosterKey,
      rank,
      rtt_number: normalizedRni,
      name: ''
    });

    const records = data['rating.roster']?.records || [];
    const record = records.find((row) => String(row.rtt_number) === normalizedRni) || records[0] || null;

    if (record) {
      record.rating_id = record.rating_id || ratingId;
      this._playerIdCache.set(normalizedRni, {
        data: record,
        expireAt: Date.now() + 10 * 60 * 1000
      });
    }

    return record;
  }

  mapPlayerSearchRecord(record = {}) {
    const name = String(record.name || '').trim();
    const rni = String(record.rtt_number || '').trim();
    const points = parseInt(record.points, 10) || 0;
    const rank = parseInt(record.position, 10) || 0;
    const age = record.age ? `${record.age} лет` : '—';

    return {
      name,
      rni,
      city: record.city || '—',
      points,
      rank,
      category: age,
      link: this.buildPlayerLink(record.player_id, rni)
    };
  }

  getTourRosterDedupeKey(record = {}) {
    const wizardId = String(record.wizard_id || '').trim();
    if (wizardId && wizardId !== '0') {
      return `w:${wizardId}`;
    }

    const tourId = String(record.tour_id || '').trim();
    if (tourId) {
      return `t:${tourId}`;
    }

    const name = this.normalizeComparableText(record.name || '');
    const begin = String(record.begin_date || '').trim();
    return `n:${name}|${begin}`;
  }

  pickPreferredTourRosterRecord(current, candidate) {
    if (!current) return candidate;
    if (!candidate) return current;

    const currentFinished = String(current.is_finished) === '1';
    const candidateFinished = String(candidate.is_finished) === '1';
    if (currentFinished !== candidateFinished) {
      return candidateFinished ? candidate : current;
    }

    const currentTourId = Number(current.tour_id) || 0;
    const candidateTourId = Number(candidate.tour_id) || 0;
    return candidateTourId >= currentTourId ? candidate : current;
  }

  dedupeTourRosterRecords(records = []) {
    const byKey = new Map();

    for (const row of records) {
      const key = this.getTourRosterDedupeKey(row);
      if (!key) continue;
      byKey.set(key, this.pickPreferredTourRosterRecord(byKey.get(key), row));
    }

    return [...byKey.values()];
  }

  dedupePlayerMatches(matches = []) {
    const seen = new Set();
    const unique = [];

    for (const match of matches) {
      const key = match.matchKey
        || [
          match.tourId || '',
          match.matchId || '',
          match.date || '',
          this.normalizeComparableText(match.opponent || ''),
          match.score || '',
          this.normalizeComparableText(match.tournament || '')
        ].join('\0');

      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(match);
    }

    return unique.map((match, index) => {
      const { matchKey, matchId, tourId, ...rest } = match;
      return { ...rest, id: index };
    });
  }

  mapTourRosterRecord(record = {}, index = 0) {
    const tourId = String(record.tour_id || record.wizard_id || '').trim();
    const begin = record.begin_date || '';
    const end = record.end_date || begin;

    return {
      id: index,
      city: record.location || record.location_full || record.org_short || '',
      category: record.player_age || record.tour_category || '',
      ageGroup: record.player_age || '',
      tournamentCategory: record.tour_category || '',
      date: this.formatIsoRangeToRu(begin, end),
      applicationsCount: record.tour_members || '',
      avgRating: record.tour_rating || record.rating_points || '',
      tournament: record.name || '',
      link: this.buildTourLink(tourId),
      status: String(record.is_finished) === '1' ? 'finished' : 'accepted',
      tourId
    };
  }

  mapScheduleCellToMatch(cell = {}, rni, tournamentMeta = {}) {
    const normalizedRni = String(rni || '').trim();
    const playerIsM1 = String(cell.m1p1_number || '') === normalizedRni;
    const playerIsM2 = String(cell.m2p1_number || '') === normalizedRni;

    if (!playerIsM1 && !playerIsM2) {
      return null;
    }

    if (String(cell.match_finished) !== '1' || !cell.score) {
      return null;
    }

    const opponent = playerIsM1
      ? (cell.m2p1_name || cell.m2name || '')
      : (cell.m1p1_name || cell.m1name || '');
    const opponentPoints = playerIsM1 ? cell.m2p1_number : cell.m1p1_number;
    const opponentCity = playerIsM1 ? cell.m2p1_city : cell.m1p1_city;
    const score1 = parseInt(cell.score1, 10) || 0;
    const score2 = parseInt(cell.score2, 10) || 0;
    const isWin = playerIsM1 ? score1 > score2 : score2 > score1;

    const tourId = String(tournamentMeta.tourId || '').trim();
    const matchId = String(cell.match_id || cell.cell_id || '').trim();

    return {
      tourId,
      matchId,
      matchKey: `${tourId}:${matchId}`,
      opponent: this.extractCleanPlayerName(opponent),
      opponentPoints: opponentPoints ? parseInt(opponentPoints, 10) || null : null,
      opponentAge: '',
      opponentCity: opponentCity || '',
      score: String(cell.score || '').trim(),
      result: isWin ? 'win' : 'loss',
      date: this.formatIsoToRuDate(cell.match_date),
      ageGroup: tournamentMeta.ageGroup || '',
      tournament: tournamentMeta.name || '',
      city: tournamentMeta.city || ''
    };
  }

  mapTourCardParticipant(player = {}, index = 0) {
    return {
      place: String(player.tour_pos1 || player.tour_pos2 || index + 1),
      name: this.extractCleanPlayerName(player.name || ''),
      rating: String(player.rating_points || player.entry_points || '').trim(),
      city: player.doc_city || '',
      age: this.computeAgeFromBirthDate(player.birth_date) ? `${this.computeAgeFromBirthDate(player.birth_date)} лет` : '',
      points: String(player.rating_points || player.entry_points || '').trim(),
      rni: String(player.rtt_number || '').trim()
    };
  }

  buildStageStatusFromTourCard(main = {}) {
    const stages = Array.isArray(main.stages) ? main.stages : [];
    const fragments = [];

    if (String(main.is_finished) === '1') {
      fragments.push('турнир завершен');
    }

    for (const stage of stages) {
      if (stage.pub_schedule_dt) {
        fragments.push('расписание на основной этап турнира');
      }
      if (stage.pub_entry_dt) {
        fragments.push('начало регистрации на основной этап турнира');
      }
      if (stage.run_dt) {
        fragments.push('жеребьевка на основной этап турнира');
      }
    }

    return this.detectTournamentStageStatus(fragments.join(' '));
  }

  normalizeComparableText(value = '') {
    return String(value || '')
      .toLowerCase()
      .replace(/[«»"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildPlayerSearchQueries(query = '') {
    const normalizedQuery = String(query || '').replace(/\s+/g, ' ').trim();

    if (!normalizedQuery) {
      return [];
    }

    const queries = [normalizedQuery];
    const parts = normalizedQuery.split(' ').filter(Boolean);

    if (parts.length > 1) {
      const reversedQuery = [...parts].reverse().join(' ');

      if (reversedQuery !== normalizedQuery) {
        queries.push(reversedQuery);
      }
    }

    return queries;
  }

  extractPlayersFromSearchHtml(html) {
    const $ = cheerio.load(html);
    const players = [];
    const seenRni = new Set();

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 7) {
        return;
      }

      const profileLink = $(cells[1]).find('a').attr('href') || '';
      const name = $(cells[1]).text().replace(/\s+/g, ' ').trim();
      const rni = $(cells[2]).text().replace(/\D/g, '').trim();
      const city = $(cells[3]).text().replace(/\s+/g, ' ').trim();
      const pointsText = $(cells[4]).text().replace(/\s+/g, ' ').trim();
      const rankText = $(cells[5]).text().replace(/\s+/g, ' ').trim();
      const category = $(cells[6]).text().replace(/\s+/g, ' ').trim();

      if (!name || !rni || seenRni.has(rni)) {
        return;
      }

      seenRni.add(rni);
      players.push({
        name,
        rni,
        city: city || '—',
        points: pointsText ? parseInt(pointsText, 10) || 0 : 0,
        rank: rankText ? parseInt(rankText, 10) || 0 : 0,
        category: category || '—',
        link: profileLink ? `${this.baseURL}${profileLink}` : `${this.baseURL}/player/${rni}`
      });
    });

    return players;
  }

  scorePlayersForQuery(players = [], query = '') {
    const queryParts = String(query || '')
      .toLowerCase()
      .split(' ')
      .map(part => part.trim())
      .filter(Boolean);

    if (queryParts.length === 0 || !Array.isArray(players) || players.length === 0) {
      return 0;
    }

    return players.reduce((totalScore, player) => {
      const nameParts = this.extractCleanPlayerName(player?.name || '')
        .toLowerCase()
        .split(' ')
        .map(part => part.trim())
        .filter(Boolean);

      const playerScore = queryParts.reduce((score, queryPart, index) => {
        const namePart = nameParts[index] || '';
        return namePart.startsWith(queryPart) ? score + 1 : score;
      }, 0);

      return totalScore + playerScore;
    }, 0);
  }

  extractCleanPlayerName(rawName = '') {
    let name = String(rawName || '').replace(/\s+/g, ' ').trim();
    name = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    name = name.replace(/\s+\d+\s*лет.*$/i, '').trim();
    name = name.replace(/\s*,.*$/g, '').trim();
    return name.replace(/\s+/g, ' ').trim();
  }

  isLikelyHumanName(value = '') {
    const cleaned = this.extractCleanPlayerName(value);
    if (!cleaned || cleaned.length < 3) {
      return false;
    }

    if (/^\d+$/.test(cleaned)) {
      return false;
    }

    return /[A-Za-zА-Яа-яЁё]/.test(cleaned);
  }

  extractParticipantName(cells = [], rowLinks = []) {
    const linkName = rowLinks
      .map(linkText => this.extractCleanPlayerName(linkText))
      .find(linkText => this.isLikelyHumanName(linkText));

    if (linkName) {
      return linkName;
    }

    return cells
      .map(cell => this.extractCleanPlayerName(cell))
      .find((cellText, index) => index > 0 && this.isLikelyHumanName(cellText)) || '';
  }

  isLikelyDateValue(value = '') {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/.test(normalized);
  }

  isLikelyScoreValue(value = '') {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    return /^(\d+[-:]\d+(?:\([^)]*\))?(?:,\d+[-:]\d+(?:\([^)]*\))?)*)$/.test(normalized);
  }

  extractApplicantMeta(rawValue = '') {
    const normalized = String(rawValue || '').replace(/\s+/g, ' ').trim();
    const ageMatch = normalized.match(/(\d+\s*лет|до\s*\d+\s*лет)/i);
    const cityMatch = normalized.match(/,\s*([^,]+)$/);

    return {
      age: ageMatch ? ageMatch[1].trim() : '',
      city: cityMatch ? cityMatch[1].trim() : ''
    };
  }

  getHeaderIndex(headers = [], patterns = []) {
    return headers.findIndex(header => patterns.some(pattern => header.includes(pattern)));
  }

  isApplicationsTable(headers = []) {
    const headerText = headers.join(' ');
    const hasNameColumn = headers.some(header => ['имя', 'фио', 'участник', 'игрок'].some(pattern => header.includes(pattern)));
    const hasSupportColumn = headers.some(header => ['место', '№', 'рейтинг', 'очк', 'город', 'возраст', 'рни'].some(pattern => header.includes(pattern)));
    const hasMatchOnlyColumns = ['дата', 'счет', 'счёт', 'результ', 'турнир', 'раунд', 'круг', 'матч', 'сет', 'гейм']
      .some(pattern => headerText.includes(pattern));

    return hasNameColumn && hasSupportColumn && !hasMatchOnlyColumns;
  }

  parseApplicationsTable($table, headers = [], $) {
    const participants = [];
    const seenParticipants = new Set();

    const placeIndex = this.getHeaderIndex(headers, ['место', '№']);
    const nameIndex = this.getHeaderIndex(headers, ['имя', 'фио', 'участник', 'игрок']);
    const ratingIndex = this.getHeaderIndex(headers, ['рейтинг', 'очк']);
    const cityIndex = this.getHeaderIndex(headers, ['город']);
    const ageIndex = this.getHeaderIndex(headers, ['возраст']);

    $table.find('tbody tr, tr').each((rowIndex, row) => {
      if (rowIndex === 0 && headers.length > 0) return;

      const $row = $(row);
      const cells = [];

      $row.find('td').each((_, cell) => {
        cells.push($(cell).text().replace(/\s+/g, ' ').trim());
      });

      if (cells.length < 2) {
        return;
      }

      const rowLinks = [];
      $row.find('td a').each((_, link) => {
        const linkText = $(link).text().replace(/\s+/g, ' ').trim();
        if (linkText) {
          rowLinks.push(linkText);
        }
      });

      let rni = '';
      $row.find('td a').each((_, link) => {
        const href = $(link).attr('href');
        if (href && href.includes('/player/')) {
          const match = href.match(/\/player\/(\d+)/);
          if (match) {
            rni = match[1];
          }
        }
      });

      const rowHeaderProbe = String(cells[0] || '').toLowerCase();
      if (rowHeaderProbe.includes('место') || rowHeaderProbe.includes('фио') || rowHeaderProbe.includes('участник') || rowHeaderProbe.includes('игрок')) {
        return;
      }

      const rawPrimaryCell = cells[0] || '';
      const fallbackMeta = this.extractApplicantMeta(rawPrimaryCell);
      const name = this.extractCleanPlayerName(nameIndex >= 0 ? cells[nameIndex] : this.extractParticipantName(cells, rowLinks));
      const placeRaw = placeIndex >= 0 ? cells[placeIndex] : rawPrimaryCell;
      const rating = ratingIndex >= 0 ? String(cells[ratingIndex] || '').trim() : '';
      const city = cityIndex >= 0 ? String(cells[cityIndex] || '').trim() : fallbackMeta.city;
      const age = ageIndex >= 0 ? String(cells[ageIndex] || '').trim() : fallbackMeta.age;
      const place = String(placeRaw || '').match(/\d+/)?.[0] || '';

      if (!this.isLikelyHumanName(name)) {
        return;
      }

      if (rating && this.isLikelyScoreValue(rating)) {
        return;
      }

      if (city && this.isLikelyDateValue(city)) {
        return;
      }

      if (age && !/(лет|до\s*\d+)/i.test(age)) {
        return;
      }

      const participantKey = `${rni || ''}|${name.toLowerCase()}|${city.toLowerCase()}`;
      if (seenParticipants.has(participantKey)) {
        return;
      }

      seenParticipants.add(participantKey);
      participants.push({
        place,
        name,
        rating,
        city,
        age,
        points: rating,
        rni
      });
    });

    return participants;
  }

  extractTournamentCity(tournamentLabel = '') {
    const normalized = String(tournamentLabel || '').trim();
    if (!normalized.includes('.')) return '';
    return normalized.split('.')[0].trim();
  }

  extractLabeledValue(text, labels, stopLabels = []) {
    const escapedLabels = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const stopPattern = stopLabels.length
      ? `(?=\\s*(?:${stopLabels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b|$)`
      : '$';
    const regex = new RegExp(`(?:${escapedLabels.join('|')})\\s*:?\\s*(.+?)${stopPattern}`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  sanitizeTournamentMetaValue(value = '', stopLabels = []) {
    const normalizedValue = String(value || '').replace(/\s+/g, ' ').trim();

    if (!normalizedValue) {
      return '';
    }

    const earliestStopIndex = stopLabels.reduce((closestIndex, label) => {
      const labelIndex = normalizedValue.toLowerCase().indexOf(label.toLowerCase());
      if (labelIndex === -1) {
        return closestIndex;
      }
      if (closestIndex === -1 || labelIndex < closestIndex) {
        return labelIndex;
      }
      return closestIndex;
    }, -1);

    const trimmedValue = earliestStopIndex === -1
      ? normalizedValue
      : normalizedValue.slice(0, earliestStopIndex).trim();

    return trimmedValue.replace(/[,:;\-–—\s]+$/g, '').trim();
  }

  parseRuDateToTimestamp(value = '') {
    const matched = String(value || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!matched) {
      return 0;
    }

    return new Date(`${matched[3]}-${matched[2]}-${matched[1]}T00:00:00Z`).getTime();
  }

  deriveTournamentLifecycle({ normalizedText = '', startDate = '', endDate = '', stageStatus = '' } = {}) {
    const text = String(normalizedText || '').toLowerCase();
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startTimestamp = this.parseRuDateToTimestamp(startDate);
    const endTimestamp = this.parseRuDateToTimestamp(endDate || startDate);

    if (
      text.includes('турнир завершен') ||
      text.includes('турнир завершён') ||
      text.includes('завершен') ||
      text.includes('завершён')
    ) {
      return {
        status: 'finished',
        label: 'Турнир завершен'
      };
    }

    if (startTimestamp && todayUtc < startTimestamp) {
      return {
        status: 'open',
        label: stageStatus || 'Турнир еще не начался'
      };
    }

    if (endTimestamp && todayUtc > (endTimestamp + oneDayMs - 1)) {
      return {
        status: 'finished',
        label: 'Турнир завершен'
      };
    }

    if (startTimestamp && todayUtc >= startTimestamp) {
      return {
        status: 'live',
        label: stageStatus || 'Турнир идет'
      };
    }

    if (stageStatus) {
      return {
        status: 'open',
        label: stageStatus
      };
    }

    return {
      status: null,
      label: ''
    };
  }

  normalizeTournamentTableHeader(value = '') {
    return String(value || '')
      .toLowerCase()
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\*/g, '')
      .replace(/\(new\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  detectTournamentStageStatus(text = '') {
    const normalizedText = text.toLowerCase();
    const stageDefinitions = [
      {
        label: 'Расписание на основной этап турнира',
        patterns: [
          'расписание на основной этап турнира',
          'опубликовано расписание на основной этап турнира',
          'расписание основного этапа турнира'
        ]
      },
      {
        label: 'Жеребьевка на основной этап турнира',
        patterns: [
          'жеребьевка на основной этап турнира',
          'жеребьёвка на основной этап турнира',
          'жеребьевка основного этапа турнира',
          'жеребьёвка основного этапа турнира'
        ]
      },
      {
        label: 'Начало регистрации на основной этап турнира',
        patterns: [
          'начало регистрации на основной этап турнира',
          'открыта регистрация на основной этап турнира',
          'регистрация на основной этап турнира'
        ]
      }
    ];

    const matchedStage = stageDefinitions.find(stage =>
      stage.patterns.some(pattern => normalizedText.includes(pattern))
    );

    return matchedStage ? matchedStage.label : '';
  }

  /**
   * Получить данные спортсмена по РНИ (Регистрационный номер игрока)
   * @param {string} rni - РНИ спортсмена
   * @returns {Promise<Object>} Данные спортсмена
   */
  async getPlayerByRNI(rni) {
    try {
      console.log(`Запрос данных для РНИ: ${rni} (${this.source})`);

      if (!this.validateRNI(rni)) {
        return {
          success: false,
          error: 'Неверный формат РНИ. Введите номер из цифр'
        };
      }

      const record = await this.resolvePlayerByRni(rni);
      if (!record?.player_id) {
        return {
          success: false,
          error: 'Спортсмен с таким РНИ не найден в базе РТТ'
        };
      }

      const ratingId = record.rating_id || await this.getLatestRatingId();
      const detailsData = await mytennis.callPublic({
        'method[0]': 'rating.details',
        rating_id: ratingId,
        player_id: record.player_id
      });

      const details = detailsData['rating.details'] || {};
      const player = details.player || record;
      const rating = details.rating || record;
      const name = String(player.name || record.name || '').trim();

      if (!name || name.length < 3) {
        return {
          success: false,
          error: 'Спортсмен с таким РНИ не найден в базе РТТ'
        };
      }

      const age = this.computeAgeFromBirthDate(player.birth_date || record.birth_date);
      const category = rating.age ? `${rating.age} лет` : (record.age ? `${record.age} лет` : '');

      console.log(`✅ Найден игрок: ${name}, очки: ${rating.points}, позиция: ${rating.position}`);

      return {
        success: true,
        data: {
          rni: String(player.rtt_number || record.rtt_number || rni),
          name,
          age,
          city: player.city || record.city || '',
          points: parseInt(rating.points, 10) || parseInt(record.points, 10) || 0,
          rank: parseInt(rating.position, 10) || parseInt(record.position, 10) || 0,
          category,
          winRate: null,
          wins: null,
          totalMatches: null,
          verified: true,
          source: this.source
        }
      };
    } catch (error) {
      console.error('Ошибка при получении данных РТТ:', error.message);

      return {
        success: false,
        error: error.message?.includes('RTT_MYTENNIS')
          ? 'Сервис РТТ не настроен (учётные данные)'
          : 'Ошибка соединения с сервером РТТ'
      };
    }
  }

  /**
   * Валидация формата РНИ
   * @param {string} rni 
   * @returns {boolean}
   */
  validateRNI(rni) {
    // РНИ в РТТ - это только цифры (например 53699)
    // Минимум 4 цифры, максимум 10
    const rniPattern = /^[0-9]{4,10}$/;
    return rniPattern.test(rni);
  }

  /**
   * Получить заявки на турниры и историю матчей игрока
   * @param {string} rni - РНИ спортсмена
   * @returns {Promise<Object>} Турниры и матчи
   */
  async getPlayerTournamentsAndMatches(rni) {
    try {
      console.log(`🎾 Запрос турниров и матчей для РНИ: ${rni}`);

      const record = await this.resolvePlayerByRni(rni);
      if (!record?.player_id) {
        return {
          success: true,
          data: { tournaments: [], matches: [] }
        };
      }

      const now = new Date();
      const begin = this.addMonthsIso(now, -24);
      const end = this.addMonthsIso(now, 6);

      const rosterData = await mytennis.callPublic({
        'method[0]': 'tour.roster',
        page_no: 1,
        per_page: 50,
        sort_field: 'begin_date',
        sort_order: 'DESC',
        range: 'period',
        begin,
        end,
        forplayer_id: record.player_id
      });

      const rosterRecords = this.dedupeTourRosterRecords(rosterData['tour.roster']?.records || []);
      const tournaments = rosterRecords.map((row, index) => this.mapTourRosterRecord(row, index));

      const matches = [];
      const finishedTours = rosterRecords
        .filter((row) => String(row.is_finished) === '1' && row.tour_id)
        .slice(0, 15);

      for (const tour of finishedTours) {
        const tourId = String(tour.tour_id);
        const tournamentMeta = {
          tourId,
          name: tour.name || '',
          city: tour.location || tour.location_full || '',
          ageGroup: tour.player_age || ''
        };

        try {
          const scheduleData = await mytennis.callPublic({
            'method[0]': 'tour.card.schedule.main',
            tour_id: tourId,
            for_referee: '',
            'part[0]': 'courts',
            'part[1]': 'cells',
            'part[2]': 'days'
          });

          const cells = scheduleData['tour.card.schedule.main']?.cells || [];
          for (const cell of cells) {
            const mapped = this.mapScheduleCellToMatch(cell, rni, tournamentMeta);
            if (mapped) {
              matches.push({ id: matches.length, ...mapped });
            }
          }
        } catch (scheduleError) {
          console.warn(`Не удалось загрузить матчи турнира ${tourId}:`, scheduleError.message);
        }
      }

      const uniqueMatches = this.dedupePlayerMatches(matches);

      uniqueMatches.sort((left, right) => {
        const leftTs = this.parseRuDateToTimestamp(left.date);
        const rightTs = this.parseRuDateToTimestamp(right.date);
        return rightTs - leftTs;
      });

      console.log(`✅ Найдено турниров: ${tournaments.length}, матчей: ${uniqueMatches.length}`);

      return {
        success: true,
        data: {
          tournaments,
          matches: uniqueMatches
        }
      };
    } catch (error) {
      console.error('Ошибка при получении турниров и матчей:', error.message);
      return {
        success: false,
        error: 'Ошибка при получении данных турниров',
        data: {
          tournaments: [],
          matches: []
        }
      };
    }
  }

  /**
   * Определить результат матча по счету
   * @param {string} score - Счет матча
   * @returns {boolean} true если победа
   */
  determineMatchResult(score) {
    // Простая эвристика: если первое число больше второго в большинстве сетов - победа
    const sets = score.split(/[,;]\s*/);
    let wins = 0;
    let losses = 0;
    
    sets.forEach(set => {
      const scores = set.match(/(\d+)[:–-](\d+)/);
      if (scores) {
        const first = parseInt(scores[1]);
        const second = parseInt(scores[2]);
        if (first > second) wins++;
        else if (second > first) losses++;
      }
    });
    
    return wins > losses;
  }

  async getRecentMatches(limit = 200) {
    try {
      const now = new Date();
      const begin = this.addMonthsIso(now, -3);
      const end = this.addMonthsIso(now, 1);

      const rosterData = await mytennis.callPublic({
        'method[0]': 'tour.roster',
        page_no: 1,
        per_page: 30,
        sort_field: 'begin_date',
        sort_order: 'DESC',
        range: 'period',
        begin,
        end
      });

      const rosterRecords = this.dedupeTourRosterRecords(rosterData['tour.roster']?.records || [])
        .filter((row) => String(row.is_finished) === '1')
        .slice(0, 12);

      const matches = [];

      for (const tour of rosterRecords) {
        if (matches.length >= limit) break;

        const tourId = String(tour.tour_id || '');
        if (!tourId) continue;

        const tournamentMeta = {
          name: tour.name || '',
          city: tour.location || tour.location_full || '',
          ageGroup: tour.player_age || ''
        };

        try {
          const scheduleData = await mytennis.callPublic({
            'method[0]': 'tour.card.schedule.main',
            tour_id: tourId,
            for_referee: '',
            'part[0]': 'cells'
          });

          const cells = scheduleData['tour.card.schedule.main']?.cells || [];
          for (const cell of cells) {
            if (matches.length >= limit) break;
            if (String(cell.match_finished) !== '1' || !cell.score) continue;

            const rawPlayer1 = cell.m1p1_name || cell.m1name || '';
            const rawPlayer2 = cell.m2p1_name || cell.m2name || '';
            if (!rawPlayer1 || !rawPlayer2) continue;

            matches.push({
              id: `${tourId}-${cell.match_id || matches.length}`,
              player1Raw: rawPlayer1,
              player2Raw: rawPlayer2,
              player1Name: this.extractCleanPlayerName(rawPlayer1),
              player2Name: this.extractCleanPlayerName(rawPlayer2),
              score: String(cell.score || '').trim(),
              date: this.formatIsoToRuDate(cell.match_date),
              ageGroup: tournamentMeta.ageGroup,
              tournament: tournamentMeta.name,
              city: tournamentMeta.city || this.extractTournamentCity(tournamentMeta.name)
            });
          }
        } catch (scheduleError) {
          console.warn(`getRecentMatches: турнир ${tourId}:`, scheduleError.message);
        }
      }

      return {
        success: true,
        data: matches.slice(0, limit)
      };
    } catch (error) {
      console.error('Ошибка при получении последних матчей RTT:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Поиск спортсменов по имени (для автокомплита)
   * @param {string} query - Поисковый запрос
   * @returns {Promise<Array>} Список найденных спортсменов
   */
  async searchPlayers(query) {
    try {
      const normalizedQuery = String(query || '').trim();
      console.log(`Поиск спортсменов: ${normalizedQuery}`);

      if (normalizedQuery.length < 2) {
        return {
          success: false,
          error: 'Минимум 2 символа для поиска'
        };
      }

      const queriesToTry = this.buildPlayerSearchQueries(normalizedQuery);
      let players = [];
      let matchedQuery = normalizedQuery;
      let bestScore = -1;
      const { ratingId, rosterKey, rank } = await this.getLatestRatingContext();

      for (const candidateQuery of queriesToTry) {
        let candidatePlayers = [];

        if (/^\d{4,10}$/.test(candidateQuery)) {
          const record = await this.resolvePlayerByRni(candidateQuery);
          if (record) {
            candidatePlayers = [this.mapPlayerSearchRecord({ ...record, rating_id: ratingId })];
          }
        } else if (rosterKey) {
          const data = await mytennis.callPublic({
            'method[0]': 'rating.roster',
            page_no: 1,
            per_page: 20,
            rating: rosterKey,
            rank,
            name: candidateQuery,
            rtt_number: ''
          });
          const records = data['rating.roster']?.records || [];
          candidatePlayers = records.map((record) => this.mapPlayerSearchRecord(record));
        }

        const candidateScore = this.scorePlayersForQuery(candidatePlayers, candidateQuery);

        if (
          candidateScore > bestScore ||
          (candidateScore === bestScore && candidatePlayers.length > players.length)
        ) {
          players = candidatePlayers;
          matchedQuery = candidateQuery;
          bestScore = candidateScore;
        }
      }

      return {
        success: true,
        data: players,
        query: normalizedQuery,
        effectiveQuery: matchedQuery,
        source: this.source
      };

    } catch (error) {
      console.error('Ошибка при поиске:', error.message);
      return {
        success: false,
        error: 'Ошибка при поиске спортсменов'
      };
    }
  }

  /**
   * Получить детальную информацию о турнире
   * @param {string} tournamentUrl - URL турнира (полный или относительный)
   * @returns {Promise<Object>} Детальная информация о турнире
   */
  async getTournamentDetails(tournamentUrl) {
    try {
      console.log(`🎾 Запрос детальной информации о турнире: ${tournamentUrl}`);

      const tourId = this.extractTourIdFromUrl(tournamentUrl);
      if (!tourId) {
        return {
          success: false,
          error: 'Не удалось определить ID турнира из ссылки'
        };
      }

      const cached = this._tourDetailsCache.get(String(tourId));
      if (cached && Date.now() < cached.expireAt) {
        return cached.data;
      }

      const cardData = await mytennis.callPublic({
        'method[0]': 'tour.card.main',
        tour_id: tourId,
        'part[0]': 'members',
        'part[1]': 'players',
        'part[2]': 'stages',
        'part[3]': 'contacts',
        'part[4]': 'org'
      });

      const main = cardData['tour.card.main'] || {};
      const tournamentName = String(main.name || main.original || '').trim();
      const startDate = this.formatIsoToRuDate(main.begin_date);
      const endDate = this.formatIsoToRuDate(main.end_date || main.begin_date);
      const stageStatus = this.buildStageStatusFromTourCard(main);

      const org = main.org || {};
      const contacts = main.contacts || {};

      const tournamentInfo = {
        date: this.formatIsoRangeToRu(main.begin_date, main.end_date),
        startDate,
        endDate,
        stageStatus,
        city: main.location || main.location_full || '',
        organizerName: org.org_full || org.org_short || '',
        organizerPhone: contacts.phone || contacts.tel || '',
        organizerEmail: contacts.email || '',
        organizerContacts: contacts.address || '',
        surface: Array.isArray(main.covers) ? main.covers.map((c) => c.name || c).filter(Boolean).join(', ') : '',
        ageGroup: main.player_age || '',
        gender: main.tour_gender || '',
        type: main.tour_type || '',
        category: main.tour_category || '',
        participantsCount: String((main.players || main.members || []).length || main.tour_members || ''),
        avgRating: ''
      };

      const normalizedText = [
        tournamentName,
        stageStatus,
        String(main.is_finished) === '1' ? 'турнир завершен' : ''
      ].join(' ');

      const lifecycle = this.deriveTournamentLifecycle({
        normalizedText,
        startDate,
        endDate,
        stageStatus
      });

      if (lifecycle.status) tournamentInfo.lifecycleStatus = lifecycle.status;
      if (lifecycle.label) tournamentInfo.statusLabel = lifecycle.label;

      const players = Array.isArray(main.players) ? main.players : [];
      const members = Array.isArray(main.members) ? main.members : [];
      const sourceList = players.length >= members.length ? players : members;
      const participants = sourceList.map((player, index) => this.mapTourCardParticipant(player, index));
      const avgRatingFromParticipants = this.calculateAverageParticipantRating(participants);
      tournamentInfo.avgRating = avgRatingFromParticipants || '';

      const pointsTable = [];
      const stages = Array.isArray(main.stages) ? main.stages : [];
      for (const stage of stages) {
        const drawSize = parseInt(stage.member_count, 10);
        if (Number.isFinite(drawSize) && drawSize > 0) {
          pointsTable.push({ stage: String(drawSize), points: '', description: stage.name || '' });
        }
      }

      const result = {
        success: true,
        tournament: {
          name: tournamentName,
          ...tournamentInfo,
          participants,
          pointsTable,
          participantsCount: participants.length,
          url: this.buildTourLink(tourId)
        }
      };
      this._tourDetailsCache.set(String(tourId), {
        data: result,
        expireAt: Date.now() + this._tourDetailsCacheTTL
      });
      return result;
    } catch (error) {
      console.error('❌ Ошибка при получении данных турнира:', error.message);
      return {
        success: false,
        error: 'Не удалось загрузить информацию о турнире: ' + error.message
      };
    }
  }

  /**
   * Получить список турниров с фильтрами
   * @param {Object} filters - Фильтры (age, gender, district, subject, city)
   * @returns {Promise<Object>} Список турниров
   */
  async getTournamentsList(filters = {}) {
    const cacheKey = JSON.stringify(filters || {});

    if (this._tourInFlight.has(cacheKey)) {
      return this._tourInFlight.get(cacheKey);
    }

    const task = this._loadTournamentsList(filters, cacheKey);
    this._tourInFlight.set(cacheKey, task);

    try {
      return await task;
    } finally {
      this._tourInFlight.delete(cacheKey);
    }
  }

  async _loadTournamentsList(filters = {}, cacheKey = '') {
    try {
      console.log('🎾 Запрос списка турниров с фильтрами:', filters);

      const cached = this._tourCache.get(cacheKey);
      if (cached && Date.now() < cached.expireAt) {
        console.log('✅ Турниры из кэша:', cached.data.tournaments.length);
        return { success: true, data: cached.data, cached: true };
      }

      const period = this.getTourListPeriod();
      const payload = {
        'method[0]': 'tour.roster',
        sort_field: 'begin_date',
        sort_order: 'ASC',
        range: 'period',
        begin: period.begin,
        end: period.end
      };

      if (filters.age) payload.player_age = filters.age;
      if (filters.gender) payload.tour_gender = filters.gender;
      this.applyTourLocationFilters(payload, filters);

      const { records, totalCount, truncated } = await this.fetchTourRosterRecords(payload);
      const uniqueRecords = this.dedupeTourRosterRecords(records);
      const tournaments = this.mapTourListRecords(uniqueRecords);

      console.log(`✅ Найдено турниров: ${tournaments.length}${truncated ? ` (из ${totalCount})` : ''}`);

      let filterOptions = { districts: [], subjects: [], cities: [] };
      try {
        filterOptions = await this.getTournamentFilterOptions();
      } catch (filtersError) {
        console.warn('Не удалось загрузить справочник гео-фильтров РТТ:', filtersError.message);
      }

      const resultData = {
        tournaments,
        filters: filterOptions,
        totalCount,
        truncated: Boolean(truncated)
      };
      this._tourCache.set(cacheKey, { data: resultData, expireAt: Date.now() + this._tourCacheTTL });

      return {
        success: true,
        data: resultData
      };
    } catch (error) {
      const timeoutMs = this.getTourListTimeoutMs();
      const timeoutMessage = error.code === 'ECONNABORTED'
        ? `RTT не ответил за ${Math.round(timeoutMs / 1000)} сек.`
        : error.message;
      console.error('❌ Ошибка при получении списка турниров:', error.message);

      const stale = this._tourCache.get(cacheKey);
      if (stale && Date.now() < stale.expireAt + this._tourStaleTTL) {
        console.warn('⚠️ Отдаём устаревший кэш турниров после ошибки API');
        return {
          success: true,
          data: { ...stale.data, stale: true },
          warning: 'Показаны сохранённые данные — РТТ ответил с задержкой'
        };
      }

      return {
        success: false,
        error: 'Ошибка при получении списка турниров: ' + timeoutMessage,
        data: { tournaments: [], filters: {}, totalCount: 0, truncated: false }
      };
    }
  }

  /**
   * Проверка доступности сервиса РТТ
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      await mytennis.ping();
      return true;
    } catch (error) {
      console.error('RTT сервис недоступен:', error.message);
      return false;
    }
  }
}

module.exports = new RTTParser();


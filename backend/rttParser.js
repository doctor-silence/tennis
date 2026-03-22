const axios = require('axios');
const cheerio = require('cheerio');

/**
 * RTT Parser - для получения данных спортсменов из rttstat.ru
 * Сайт: https://rttstat.ru/
 */

class RTTParser {
  constructor() {
    this.baseURL = 'https://rttstat.ru';
    this.requestTimeout = 15000;
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: this.requestTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    // Кэш для списка турниров: key → { data, expireAt }
    this._tourCache = new Map();
    this._tourCacheTTL = 5 * 60 * 1000; // 5 минут
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
      console.log(`Запрос данных для РНИ: ${rni} с сайта ${this.baseURL}/player/${rni}`);
      
      // Валидация РНИ (только цифры)
      if (!this.validateRNI(rni)) {
        return {
          success: false,
          error: 'Неверный формат РНИ. Введите номер из цифр'
        };
      }

      // Запрос к rttstat.ru
      const response = await this.axios.get(`/player/${rni}`);
      const html = response.data;
      const $ = cheerio.load(html);

      // Парсинг данных со страницы
      const name = $('h1').first().text().replace('Теннисист: ', '').replace('Теннисистка: ', '').replace('Добавить в избранное', '').trim();
      
      if (!name || name.length < 3) {
        return {
          success: false,
          error: 'Спортсмен с таким РНИ не найден в базе РТТ'
        };
      }

      // Извлекаем данные из текста на странице
      const pageText = $('body').text();
      
      // РНИ
      const rniMatch = pageText.match(/РНИ:\s*(\d+)/);
      const playerRNI = rniMatch ? rniMatch[1] : rni;

      // Очки РТТ (одиночный разряд)
      const pointsMatch = pageText.match(/Одиночный\s+Очки:\s*([\d]+)/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

      // Позиция (рейтинг) в возрастной группе
      const rankMatch = pageText.match(/Одиночный[\s\S]*?Рейтинг:\s*([\d]+)/);
      const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

      // Возраст
      const ageMatch = pageText.match(/Возраст РТТ:\s*(\d+)\s*лет/);
      const age = ageMatch ? parseInt(ageMatch[1]) : null;

      // Возрастная категория
      const categoryMatch = pageText.match(/Возрастная группа:\s*([^\n]+)/);
      const category = categoryMatch ? categoryMatch[1].trim() : '';

      // Город
      const cityMatch = pageText.match(/Город:\s*([^\n]+)/);
      const city = cityMatch ? cityMatch[1].trim() : '';

      // Процент побед в матчах (если есть на странице)
      const winRateMatch = pageText.match(/Побед в матчах:\s*(\d+)%\s*\((\d+)\s*из\s*(\d+)\)/);
      let winRate = null;
      let wins = null;
      let totalMatches = null;
      
      if (winRateMatch) {
        winRate = parseInt(winRateMatch[1]);
        wins = parseInt(winRateMatch[2]);
        totalMatches = parseInt(winRateMatch[3]);
        console.log(`📊 Найдена статистика матчей: ${winRate}% (${wins} из ${totalMatches})`);
      }

      console.log(`✅ Найден игрок: ${name}, город: ${city}, очки: ${points}, позиция: ${rank}`);

      return {
        success: true,
        data: {
          rni: playerRNI,
          name: name,
          age: age,
          city: city,
          points: points,
          rank: rank,
          category: category,
          winRate: winRate,
          wins: wins,
          totalMatches: totalMatches,
          verified: true,
          source: 'rttstat.ru'
        }
      };

    } catch (error) {
      console.error('Ошибка при получении данных РТТ:', error.message);
      
      if (error.response && error.response.status === 404) {
        return {
          success: false,
          error: 'Спортсмен с таким РНИ не найден в базе РТТ'
        };
      }
      
      return {
        success: false,
        error: 'Ошибка соединения с сервером РТТ'
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
      
      const response = await this.axios.get(`/player/${rni}`);
      const html = response.data;
      const $ = cheerio.load(html);

      console.log(`📄 HTML получен, длина: ${html.length} символов`);
      console.log(`📊 Всего таблиц на странице: ${$('table').length}`);

      // Парсим турниры (заявки) из таблицы "Заявки на турниры"
      const tournaments = [];
      
      // Ищем заголовок "Заявки на турниры" и берем первую таблицу после него
      let foundTournamentsTable = false;
      
      $('*').each((index, element) => {
        if (foundTournamentsTable) return;
        
        const $el = $(element);
        const text = $el.text().trim();
        
        // Ищем заголовок "Заявки на турниры" (может быть с лишними пробелами)
        if (text.includes('Заявки на турниры')) {
          console.log(`✅ Найден заголовок с текстом: "${text}"`);
          
          // Ищем ближайшую таблицу после этого элемента
          let $table = $el.next('table');
          
          // Если таблица не сразу после, ищем в следующих элементах
          if ($table.length === 0) {
            $table = $el.nextAll('table').first();
          }
          
          // Если не нашли, возможно таблица внутри следующего элемента
          if ($table.length === 0) {
            $table = $el.next().find('table').first();
          }
          
          if ($table.length > 0) {
            console.log(`✅ Найдена таблица турниров, строк: ${$table.find('tr').length}`);
            foundTournamentsTable = true;
            
            // Парсим строки таблицы
            $table.find('tr').each((i, row) => {
              const $row = $(row);
              const cells = $row.find('td');
              
              console.log(`  Строка ${i}: ${cells.length} ячеек`);
              
              if (cells.length >= 6) {
                // Структура: [Город, Возрастная группа, Категория, Дата, Заявок, Средний рейтинг, Название]
                const city = cells.eq(0).text().trim();
                const ageGroup = cells.eq(1).text().trim();
                const category = cells.eq(2).text().trim();
                const date = cells.eq(3).text().trim();
                const applicationsCount = cells.eq(4).text().trim();
                const avgRating = cells.eq(5).text().trim();
                const tournamentName = cells.eq(6).text().trim();
                const tournamentLink = cells.eq(6).find('a').attr('href');
                
                console.log(`    ${city} | ${ageGroup} | ${date} | ${applicationsCount} | ${avgRating} | ${tournamentName}`);
                
                // Проверяем, что это не заголовок и есть название турнира
                if (tournamentName && tournamentName !== 'Название' && tournamentName !== 'НАЗВАНИЕ' && tournamentName !== 'Средний рейтинг' && tournamentName.length > 3) {
                  tournaments.push({
                    id: tournaments.length,
                    city: city,
                    category: ageGroup,
                    ageGroup: ageGroup,
                    tournamentCategory: category,
                    date: date,
                    applicationsCount: applicationsCount,
                    avgRating: avgRating,
                    tournament: tournamentName,
                    link: tournamentLink ? `https://rttstat.ru${tournamentLink}` : null,
                    status: 'accepted'
                  });
                  console.log(`    ✅ Добавлен турнир: ${tournamentName}`);
                }
              }
            });
          } else {
            console.log(`❌ Таблица не найдена после заголовка`);
          }
        }
      });

      // Парсим матчи из таблицы "Матчи РТТ"
      const matches = [];
      
      // Ищем таблицу с матчами
      $('table').each((tableIndex, table) => {
        const $table = $(table);
        const tableText = $table.text();
        
        // Проверяем, что это таблица с матчами (содержит колонки Соперник, Очки, Счет, Результат, Дата)
        if (tableText.includes('Соперник') && tableText.includes('Результат') && tableText.includes('Счет')) {
          console.log(`✅ Найдена таблица матчей (таблица ${tableIndex + 1})`);
          
          // Парсим строки таблицы
          $table.find('tr').each((i, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 5) {
              // Структура: [Соперник, Очки, Возраст РТТ, Город, Счет, Результат, Дата, Возрастная группа, Турнир, Город]
              const opponent = cells.eq(0).text().trim();
              const opponentPoints = cells.eq(1).text().trim();
              const opponentAge = cells.eq(2).text().trim();
              const opponentCity = cells.eq(3).text().trim();
              const score = cells.eq(4).text().trim();
              const result = cells.eq(5).text().trim();
              const date = cells.eq(6).text().trim();
              const ageGroup = cells.eq(7).text().trim();
              const tournament = cells.eq(8).text().trim();
              const city = cells.eq(9).text().trim();
              
              console.log(`  Строка ${i}: ${opponent} | ${score} | ${result} | ${date}`);
              
              // Проверяем, что это не заголовок и есть имя соперника
              if (opponent && opponent !== 'Соперник' && opponent.length > 3) {
                const isWin = result.toLowerCase().includes('побед');
                
                matches.push({
                  id: matches.length,
                  opponent: opponent,
                  opponentPoints: opponentPoints ? parseInt(opponentPoints) : null,
                  opponentAge: opponentAge,
                  opponentCity: opponentCity,
                  score: score,
                  result: isWin ? 'win' : 'loss',
                  date: date,
                  ageGroup: ageGroup,
                  tournament: tournament,
                  city: city
                });
                console.log(`  ✅ Добавлен матч: ${opponent} (${result})`);
              }
            }
          });
        }
      });

      console.log(`📊 Итого найдено турниров: ${tournaments.length}`);
      console.log(`🎾 Итого найдено матчей: ${matches.length}`);

      // Если данные не найдены через таблицы, парсим текст страницы
      if (tournaments.length === 0 && matches.length === 0) {
        console.log('⚠️ Таблицы не найдены, пробуем парсить текст страницы...');
        const pageText = $('body').text();
        
        // Ищем упоминания турниров в тексте
        const tournamentMatches = pageText.match(/Турнир[:\s]+([^\n]+)/gi);
        if (tournamentMatches) {
          tournamentMatches.forEach((match, i) => {
            tournaments.push({
              id: i,
              tournament: match.replace(/Турнир[:\s]+/i, '').trim(),
              date: 'Уточняется',
              status: 'accepted',
              category: ''
            });
          });
        }
      }

      console.log(`✅ Найдено турниров: ${tournaments.length}, матчей: ${matches.length}`);

      return {
        success: true,
        data: {
          tournaments: tournaments,
          matches: matches
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
      const response = await this.axios.get('/');
      const $ = cheerio.load(response.data);
      const matches = [];

      $('table').each((tableIndex, table) => {
        if (matches.length >= limit) return false;

        $(table).find('tr').each((rowIndex, row) => {
          if (matches.length >= limit) return false;

          const cells = $(row).find('td');
          if (cells.length < 6) return;

          const rawPlayer1 = cells.eq(0).text().trim();
          const rawPlayer2 = cells.eq(1).text().trim();
          const score = cells.eq(2).text().trim();
          const date = cells.eq(3).text().trim();
          const ageGroup = cells.eq(4).text().trim();
          const tournament = cells.eq(5).text().trim();

          if (!rawPlayer1 || !rawPlayer2 || !score || !date || !tournament) return;
          if (!/(\d+[:\-–]\d+|\[\d+[-–:]\d+\])/.test(score) || !/\d{2}\.\d{2}\.\d{4}/.test(date)) return;

          matches.push({
            id: `${tableIndex}-${rowIndex}`,
            player1Raw: rawPlayer1,
            player2Raw: rawPlayer2,
            player1Name: this.extractCleanPlayerName(rawPlayer1),
            player2Name: this.extractCleanPlayerName(rawPlayer2),
            score,
            date,
            ageGroup,
            tournament,
            city: this.extractTournamentCity(tournament)
          });
        });
      });

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

      for (const candidateQuery of queriesToTry) {
        const response = await this.axios.get(`/search/${encodeURIComponent(candidateQuery)}`);
        const candidatePlayers = this.extractPlayersFromSearchHtml(response.data);
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
        source: 'rttstat.ru'
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
      
      // Если передан полный URL, извлекаем путь
      let path = tournamentUrl;
      if (tournamentUrl.startsWith('http')) {
        const url = new URL(tournamentUrl);
        path = url.pathname;
      }

      // Запрос к странице турнира
      const response = await this.axios.get(path);
      const html = response.data;
      const $ = cheerio.load(html);

      console.log('📄 HTML страницы получен, начинаем парсинг...');

      // Получаем название турнира
      const tournamentName = $('h1').first().text().trim();
      console.log(`📌 Название турнира: ${tournamentName}`);

      // Информация о турнире из блоков
      let tournamentInfo = {};
      const allText = $('body').text();
      const normalizedText = allText.replace(/\s+/g, ' ').trim();
      const metaStopLabels = [
        'Город',
        'Покрытие',
        'Дата',
        'Дата начала',
        'Дата окончания',
        'Сроки проведения',
        'Период проведения',
        'Возрастная группа',
        'Пол',
        'Тип',
        'Категория',
        'Категория турнира',
        'Заявок',
        'Количество участников',
        'Средний рейтинг',
        'Сайт РТТ',
        'Таблица очков',
        'Название'
      ];

      const explicitStartDate = this.extractLabeledValue(normalizedText, ['Дата начала'], metaStopLabels).match(/\d{2}\.\d{2}\.\d{4}/)?.[0] || '';
      const explicitEndDate = this.extractLabeledValue(normalizedText, ['Дата окончания'], metaStopLabels).match(/\d{2}\.\d{2}\.\d{4}/)?.[0] || '';
      const rangeFromMeta = this.extractLabeledValue(normalizedText, ['Дата', 'Сроки проведения', 'Период проведения', 'Сроки'], metaStopLabels);

      if (explicitStartDate && explicitEndDate) {
        tournamentInfo.date = `${explicitStartDate} - ${explicitEndDate}`;
      } else if (rangeFromMeta) {
        tournamentInfo.date = rangeFromMeta;
      }

      const detectedStageStatus = this.detectTournamentStageStatus(normalizedText);
      if (detectedStageStatus) tournamentInfo.stageStatus = detectedStageStatus;

      const cityValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Город'], metaStopLabels.filter(label => label !== 'Город')),
        metaStopLabels.filter(label => label !== 'Город')
      );
      if (cityValue) tournamentInfo.city = cityValue;

      const surfaceValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Покрытие'], metaStopLabels.filter(label => label !== 'Покрытие')),
        metaStopLabels.filter(label => label !== 'Покрытие')
      );
      if (surfaceValue) tournamentInfo.surface = surfaceValue;

      const ageGroupValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Возрастная группа'], metaStopLabels.filter(label => label !== 'Возрастная группа')),
        metaStopLabels.filter(label => label !== 'Возрастная группа')
      );
      if (ageGroupValue) tournamentInfo.ageGroup = ageGroupValue;

      const genderValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Пол'], metaStopLabels.filter(label => label !== 'Пол')),
        metaStopLabels.filter(label => label !== 'Пол')
      );
      if (genderValue) tournamentInfo.gender = genderValue;

      const typeValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Тип'], metaStopLabels.filter(label => label !== 'Тип')),
        metaStopLabels.filter(label => label !== 'Тип')
      );
      if (typeValue) tournamentInfo.type = typeValue;

      const categoryValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Категория турнира', 'Категория'], metaStopLabels.filter(label => label !== 'Категория турнира' && label !== 'Категория')),
        metaStopLabels.filter(label => label !== 'Категория турнира' && label !== 'Категория')
      );
      if (categoryValue) tournamentInfo.category = categoryValue;

      const participantsMetaValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Количество участников', 'Заявок'], metaStopLabels.filter(label => label !== 'Количество участников' && label !== 'Заявок')),
        metaStopLabels.filter(label => label !== 'Количество участников' && label !== 'Заявок')
      );
      const participantsCount = participantsMetaValue.match(/\d+/)?.[0] || '';
      if (participantsCount) tournamentInfo.participantsCount = participantsCount;

      const avgRatingValue = this.sanitizeTournamentMetaValue(
        this.extractLabeledValue(normalizedText, ['Средний рейтинг'], metaStopLabels.filter(label => label !== 'Средний рейтинг')),
        metaStopLabels.filter(label => label !== 'Средний рейтинг')
      );
      if (avgRatingValue) tournamentInfo.avgRating = avgRatingValue.match(/\d+/)?.[0] || avgRatingValue;

      console.log('📋 Информация о турнире:', tournamentInfo);

      // Парсим ВСЕ таблицы на странице
      const participants = [];
      const pointsTable = [];
      let tablesParsed = 0;

      $('table').each((tableIndex, table) => {
        const $table = $(table);
        const headers = [];
        
        // Собираем заголовки таблицы
        $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((i, th) => {
          headers.push($(th).text().trim().toLowerCase());
        });

        console.log(`📊 Таблица ${tableIndex + 1}, заголовки:`, headers.join(', '));

        // Если нет явных заголовков в thead, пробуем первую строку
        if (headers.length === 0) {
          $table.find('tr:first-child td').each((i, td) => {
            headers.push($(td).text().trim().toLowerCase());
          });
        }

        const headerText = headers.join(' ');

        // Парсинг участников - ищем таблицы с игроками/участниками
        if (headerText.includes('участник') || headerText.includes('игрок') || headerText.includes('фио') || 
            headerText.includes('место') || headerText.includes('рейтинг') || headerText.includes('очки')) {
          
          console.log(`👥 Найдена таблица участников (таблица ${tableIndex + 1})`);
          
          $table.find('tbody tr, tr').each((rowIndex, row) => {
            if (rowIndex === 0 && headers.length > 0) return; // Пропускаем заголовок
            
            const $row = $(row);
            const cells = [];
            $row.find('td').each((i, cell) => {
              cells.push($(cell).text().trim());
            });

            // Ищем РНИ в ссылках (обычно в первой или второй ячейке)
            let rni = null;
            $row.find('td a').each((i, link) => {
              const href = $(link).attr('href');
              if (href && href.includes('/player/')) {
                const match = href.match(/\/player\/(\d+)/);
                if (match) {
                  rni = match[1];
                }
              }
            });

            // Нужно минимум 2 ячейки (место/имя или имя/рейтинг)
            if (cells.length >= 2 && cells[0] && cells[1]) {
              // Пропускаем строки-заголовки
              const firstCell = cells[0].toLowerCase();
              if (firstCell.includes('место') || firstCell.includes('№') || 
                  firstCell.includes('фио') || firstCell.includes('участник')) {
                return;
              }

              const participant = {
                place: cells[0] || '',
                name: cells[1] || '',
                rating: cells[2] || '',
                city: cells[3] || '',
                age: cells[4] || '',
                points: cells[5] || ''
              };

              // Проверяем, что это реальный участник (есть имя длиной больше 2 символов)
              if (participant.name.length > 2) {
                participants.push(participant);
                console.log(`✅ Участник ${participants.length}:`, participant.name);
              }
            }
          });
        }

        // Парсинг таблицы очков/этапов турнира
        if (headerText.includes('этап') || headerText.includes('раунд') || headerText.includes('место') ||
            (headerText.includes('очки') || headerText.includes('1/2') || headerText.includes('1/4'))) {
          
          console.log(`🏆 Найдена таблица очков (таблица ${tableIndex + 1})`);
          
          $table.find('tbody tr, tr').each((rowIndex, row) => {
            const $row = $(row);
            const cells = [];
            $row.find('td').each((i, cell) => {
              cells.push($(cell).text().trim());
            });

            // Для таблицы очков первая ячейка - название сетки (32, 24, 16, 8)
            // Остальные ячейки - очки для каждого места
            if (cells.length >= 2 && cells[0]) {
              const firstCell = cells[0].toLowerCase();
              
              // Пропускаем строки-заголовки
              if (firstCell.includes('этап') || firstCell.includes('место') || firstCell === 'п' || firstCell === 'ф') {
                return;
              }

              // Собираем все очки из ячеек в одну строку через запятую
              const allPoints = cells.slice(1).filter(c => c && c.length > 0).join(',');

              if (allPoints) {
                pointsTable.push({
                  stage: cells[0] || '',
                  points: allPoints,
                  description: ''
                });
                console.log(`📊 Сетка ${cells[0]}: ${allPoints}`);
              }
            }
          });
        }

        tablesParsed++;
      });

      console.log(`✅ Обработано таблиц: ${tablesParsed}`);
      console.log(`👥 Найдено участников: ${participants.length}`);
      console.log(`🏆 Найдено этапов: ${pointsTable.length}`);

      // Если участников не найдено, парсим списки <ul>, <ol>
      if (participants.length === 0) {
        console.log('🔍 Ищем участников в списках...');
        $('ul, ol').each((i, list) => {
          $(list).find('li').each((j, item) => {
            const text = $(item).text().trim();
            if (text.length > 5) {
              participants.push({
                place: (j + 1).toString(),
                name: text,
                rating: '',
                city: '',
                age: '',
                points: ''
              });
            }
          });
        });
        console.log(`📝 Найдено участников в списках: ${participants.length}`);
      }

      return {
        success: true,
        tournament: {
          name: tournamentName,
          ...tournamentInfo,
          participants: participants,
          pointsTable: pointsTable,
          participantsCount: participants.length,
          url: path
        }
      };

    } catch (error) {
      console.error('❌ Ошибка при получении данных турнира:', error.message);
      console.error('Stack trace:', error.stack);
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
    try {
      console.log('🎾 Запрос списка турниров с фильтрами:', filters);

      // Строим параметры запроса к rttstat.ru/tours/
      const params = new URLSearchParams();
      if (filters.age)      params.set('age', filters.age);
      if (filters.gender)   params.set('g', filters.gender);
      if (filters.district) params.set('l1', filters.district);
      if (filters.subject)  params.set('l2', filters.subject);
      if (filters.city)     params.set('l3', filters.city);

      const cacheKey = params.toString();

      // Проверяем кэш
      const cached = this._tourCache.get(cacheKey);
      if (cached && Date.now() < cached.expireAt) {
        console.log('✅ Турниры из кэша:', cached.data.tournaments.length);
        return { success: true, data: cached.data };
      }

      const url = `/tours/${cacheKey ? '?' + cacheKey : ''}`;
      console.log('📡 URL запроса:', url);

      const response = await this.axios.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

      const tournaments = [];

      // Парсим опции фильтров из формы
      const districts = [];
      const subjects = [];
      const cities = [];
      $('select[name="l1"] option').each((i, el) => {
        const val = $(el).attr('value');
        const text = $(el).text().trim();
        if (val) districts.push({ value: val, label: text });
      });
      $('select[name="l2"] option').each((i, el) => {
        const val = $(el).attr('value');
        const text = $(el).text().trim();
        const parent = $(el).attr('data-parent');
        if (val) subjects.push({ value: val, label: text, parent });
      });
      $('select[name="l3"] option').each((i, el) => {
        const val = $(el).attr('value');
        const text = $(el).text().trim();
        const parent = $(el).attr('data-parent');
        if (val) cities.push({ value: val, label: text, parent });
      });

      // Парсим строки таблицы .tours-table
      $('table.tours-table tr').each((i, row) => {
        if (i === 0) return; // пропускаем заголовок

        const cells = $(row).find('td');
        if (cells.length < 10) return;

        // td[0] = звёздочка, td[1] = город, td[2] = тип, td[3] = возраст,
        // td[4] = категория, td[5] = начало, td[6] = корты, td[7] = заявок,
        // td[8] = средний рейтинг, td[9] = статус, td[10] = название
        const city        = cells.eq(1).text().trim();
        const type        = cells.eq(2).text().trim();
        const ageGroup    = cells.eq(3).text().trim();
        const category    = cells.eq(4).text().trim();
        const startDate   = cells.eq(5).text().trim();
        const surface     = cells.eq(6).text().trim();
        const applications= cells.eq(7).text().trim();
        const avgRating   = cells.eq(8).text().trim();
        const status      = cells.eq(9).text().trim();
        const nameCell    = cells.eq(10);
        const name        = nameCell.text().trim();
        const link        = nameCell.find('a').attr('href');

        if (city && name && name.length > 2) {
          tournaments.push({
            id: tournaments.length,
            city, type, ageGroup, category, startDate,
            surface, applications, avgRating, status, name,
            link: link ? (link.startsWith('http') ? link : `https://rttstat.ru${link}`) : null
          });
        }
      });

      console.log(`✅ Найдено турниров: ${tournaments.length}`);

      const resultData = { tournaments, filters: { districts, subjects, cities } };

      // Сохраняем в кэш
      this._tourCache.set(cacheKey, { data: resultData, expireAt: Date.now() + this._tourCacheTTL });

      return {
        success: true,
        data: resultData
      };

    } catch (error) {
      const timeoutMessage = error.code === 'ECONNABORTED'
        ? `RTT не ответил за ${Math.round(this.requestTimeout / 1000)} сек.`
        : error.message;
      console.error('❌ Ошибка при получении списка турниров:', error.message);
      return {
        success: false,
        error: 'Ошибка при получении списка турниров: ' + timeoutMessage,
        data: { tournaments: [], filters: {} }
      };
    }
  }

  /**
   * Проверка доступности сервиса РТТ
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      const response = await this.axios.get('/');
      return response.status === 200;
    } catch (error) {
      console.error('RTT сервис недоступен:', error.message);
      return false;
    }
  }
}

module.exports = new RTTParser();

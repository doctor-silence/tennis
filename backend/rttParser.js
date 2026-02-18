const axios = require('axios');
const cheerio = require('cheerio');

/**
 * RTT Parser - для получения данных спортсменов из rttstat.ru
 * Сайт: https://rttstat.ru/
 */

class RTTParser {
  constructor() {
    this.baseURL = 'https://rttstat.ru';
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
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

      // Очки РТТ
      const pointsMatch = pageText.match(/Очки РТТ:\s*(\d+)/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

      // Позиция в возрастной группе
      const rankMatch = pageText.match(/Позиция в своей возрастной группе:\s*(\d+)/);
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
              
              if (cells.length >= 5) {
                // Структура: [Город, Возрастная группа, Дата, Заявок, Средний рейтинг, Название]
                const city = cells.eq(0).text().trim();
                const ageGroup = cells.eq(1).text().trim();
                const date = cells.eq(2).text().trim();
                const applicationsCount = cells.eq(3).text().trim();
                const avgRating = cells.eq(4).text().trim();
                const tournamentName = cells.eq(5).text().trim();
                const tournamentLink = cells.eq(5).find('a').attr('href');
                
                console.log(`    ${city} | ${ageGroup} | ${date} | ${applicationsCount} | ${avgRating} | ${tournamentName}`);
                
                // Проверяем, что это не заголовок и есть название турнира
                if (tournamentName && tournamentName !== 'Название' && tournamentName !== 'НАЗВАНИЕ' && tournamentName.length > 3) {
                  tournaments.push({
                    id: tournaments.length,
                    city: city,
                    category: ageGroup,
                    ageGroup: ageGroup,
                    date: date,
                    applicationsCount: applicationsCount,
                    avgRating: avgRating,
                    tournament: tournamentName,
                    link: tournamentLink ? `https://rttstat.ru${tournamentLink}` : null,
                    status: 'accepted' // По умолчанию считаем принятой
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

  /**
   * Поиск спортсменов по имени (для автокомплита)
   * @param {string} query - Поисковый запрос
   * @returns {Promise<Array>} Список найденных спортсменов
   */
  async searchPlayers(query) {
    try {
      console.log(`Поиск спортсменов: ${query}`);
      
      // TODO: Реализовать поиск через API rttstat.ru если доступен
      // Пока функция не реализована полностью
      
      return {
        success: true,
        data: [],
        message: 'Поиск по имени пока не реализован. Используйте РНИ для поиска.'
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
      
      // Ищем дату
      const dateMatch = allText.match(/Дата[:\s]+([^\n]+)/i);
      if (dateMatch) tournamentInfo.date = dateMatch[1].trim();
      
      // Ищем город
      const cityMatch = allText.match(/Город[:\s]+([^\n]+)/i);
      if (cityMatch) tournamentInfo.city = cityMatch[1].trim();
      
      // Ищем покрытие
      const surfaceMatch = allText.match(/Покрытие[:\s]+([^\n]+)/i);
      if (surfaceMatch) tournamentInfo.surface = surfaceMatch[1].trim();

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

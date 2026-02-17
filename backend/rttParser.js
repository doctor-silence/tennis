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

      console.log(`✅ Найден игрок: ${name}, город: ${city}, очки: ${points}, позиция: ${rank}`);

      return {
        success: true,
        data: {
          rni: playerRNI,
          name: name,
          age: age,
          city: city,
          rating: {
            points: points,
            rank: rank,
            category: category
          },
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

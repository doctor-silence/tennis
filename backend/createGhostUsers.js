/**
 * createGhostUsers.js
 * 
 * Создаёт таблицу ghost_users и вставляет 50 фиктивных пользователей.
 * Они показываются в поиске партнёров, рейтинге и сообществе,
 * но НЕ попадают в таблицу users и не влияют на статистику админки.
 * 
 * Запуск: node backend/createGhostUsers.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./db');

const GHOST_USERS = [
  // Москва — 15 человек (только любители)
  { name: 'Алексей Воронов',    city: 'Москва',          level: '4.0', age: 28, role: 'player', rating: 1420, xp: 820  },
  { name: 'Мария Соколова',     city: 'Москва',          level: '3.5', age: 32, role: 'player', rating: 1280, xp: 540  },
  { name: 'Дмитрий Новиков',    city: 'Москва',          level: '4.5', age: 25, role: 'player', rating: 1480, xp: 960  },
  { name: 'Екатерина Лебедева', city: 'Москва',          level: '3.0', age: 41, role: 'player', rating: 1100, xp: 210  },
  { name: 'Павел Козлов',       city: 'Москва',          level: '4.0', age: 35, role: 'player', rating: 1390, xp: 710  },
  { name: 'Анастасия Морозова', city: 'Москва',          level: '3.5', age: 27, role: 'player', rating: 1240, xp: 480  },
  { name: 'Сергей Попов',       city: 'Москва',          level: '4.5', age: 30, role: 'player', rating: 1550, xp: 1150 },
  { name: 'Ольга Захарова',     city: 'Москва',          level: '2.5', age: 55, role: 'player', rating: 950,  xp: 120  },
  { name: 'Николай Семёнов',    city: 'Москва',          level: '4.0', age: 22, role: 'player', rating: 1410, xp: 790  },
  { name: 'Виктория Громова',   city: 'Москва',          level: '3.5', age: 38, role: 'coach',  rating: 1350, xp: 930  },
  { name: 'Игорь Федотов',      city: 'Москва',          level: '4.5', age: 29, role: 'player', rating: 1510, xp: 1080 },
  { name: 'Татьяна Орлова',     city: 'Москва',          level: '3.0', age: 45, role: 'player', rating: 1050, xp: 180  },
  { name: 'Антон Белов',        city: 'Москва',          level: '4.0', age: 31, role: 'player', rating: 1380, xp: 660  },
  { name: 'Юлия Крылова',       city: 'Москва',          level: '2.5', age: 48, role: 'player', rating: 900,  xp: 90   },
  { name: 'Роман Волков',       city: 'Москва',          level: '4.5', age: 26, role: 'player', rating: 1620, xp: 1300 },

  // Санкт-Петербург — 9 человек
  { name: 'Андрей Соловьёв',    city: 'Санкт-Петербург', level: '4.0', age: 33, role: 'player', rating: 1430, xp: 840  },
  { name: 'Елена Кузнецова',    city: 'Санкт-Петербург', level: '3.5', age: 29, role: 'player', rating: 1260, xp: 510  },
  { name: 'Михаил Тихонов',     city: 'Санкт-Петербург', level: '4.5', age: 27, role: 'player', rating: 1530, xp: 1120 },
  { name: 'Ксения Фролова',     city: 'Санкт-Петербург', level: '3.0', age: 36, role: 'player', rating: 1080, xp: 170  },
  { name: 'Владимир Зайцев',    city: 'Санкт-Петербург', level: '4.0', age: 40, role: 'player', rating: 1360, xp: 620  },
  { name: 'Дарья Пономарёва',   city: 'Санкт-Петербург', level: '3.5', age: 24, role: 'player', rating: 1220, xp: 440  },
  { name: 'Артём Никифоров',    city: 'Санкт-Петербург', level: '4.0', age: 31, role: 'player', rating: 1460, xp: 890  },
  { name: 'Светлана Макарова',  city: 'Санкт-Петербург', level: '2.5', age: 52, role: 'player', rating: 870,  xp: 70   },
  { name: 'Борис Самойлов',     city: 'Санкт-Петербург', level: '4.0', age: 29, role: 'player', rating: 1450, xp: 860  },

  // Краснодар — 6 человек
  { name: 'Евгений Ершов',      city: 'Краснодар',       level: '4.0', age: 34, role: 'player', rating: 1400, xp: 750  },
  { name: 'Алина Медведева',    city: 'Краснодар',       level: '3.5', age: 26, role: 'player', rating: 1230, xp: 460  },
  { name: 'Константин Шубин',   city: 'Краснодар',       level: '4.5', age: 28, role: 'player', rating: 1490, xp: 980  },
  { name: 'Надежда Рогова',     city: 'Краснодар',       level: '3.0', age: 43, role: 'player', rating: 1020, xp: 150  },
  { name: 'Вячеслав Осипов',    city: 'Краснодар',       level: '4.0', age: 37, role: 'player', rating: 1370, xp: 640  },
  { name: 'Марина Крупина',     city: 'Краснодар',       level: '2.5', age: 50, role: 'player', rating: 920,  xp: 95   },

  // Екатеринбург — 5 человек
  { name: 'Юлия Тарасова',      city: 'Екатеринбург',    level: '3.5', age: 35, role: 'player', rating: 1270, xp: 520  },
  { name: 'Денис Чернов',       city: 'Екатеринбург',    level: '4.5', age: 23, role: 'player', rating: 1560, xp: 1180 },
  { name: 'Вера Архипова',      city: 'Екатеринбург',    level: '3.0', age: 47, role: 'player', rating: 1040, xp: 140  },
  { name: 'Максим Жуков',       city: 'Екатеринбург',    level: '4.0', age: 32, role: 'player', rating: 1390, xp: 700  },
  { name: 'Ирина Лазарева',     city: 'Екатеринбург',    level: '3.5', age: 28, role: 'player', rating: 1240, xp: 470  },

  // Казань — 4 человека
  { name: 'Лариса Батракова',   city: 'Казань',          level: '3.5', age: 31, role: 'player', rating: 1250, xp: 490  },
  { name: 'Геннадий Устинов',   city: 'Казань',          level: '4.0', age: 39, role: 'player', rating: 1420, xp: 800  },
  { name: 'Наталья Ковалёва',   city: 'Казань',          level: '3.0', age: 44, role: 'player', rating: 1060, xp: 160  },
  { name: 'Степан Горбунов',    city: 'Казань',          level: '4.5', age: 26, role: 'player', rating: 1500, xp: 1000 },

  // Новосибирск — 4 человека
  { name: 'Пётр Абрамов',       city: 'Новосибирск',     level: '4.0', age: 30, role: 'player', rating: 1410, xp: 760  },
  { name: 'Олег Мухин',         city: 'Новосибирск',     level: '4.5', age: 33, role: 'player', rating: 1470, xp: 920  },
  { name: 'Галина Суворова',    city: 'Новосибирск',     level: '2.5', age: 56, role: 'player', rating: 860,  xp: 65   },
  { name: 'Фёдор Колесников',   city: 'Новосибирск',     level: '3.5', age: 42, role: 'player', rating: 1200, xp: 390  },

  // Сочи — 3 человека
  { name: 'Кирилл Панин',       city: 'Сочи',            level: '4.0', age: 27, role: 'player', rating: 1440, xp: 830  },
  { name: 'Полина Сидорова',    city: 'Сочи',            level: '3.5', age: 30, role: 'player', rating: 1260, xp: 500  },
  { name: 'Руслан Ефимов',      city: 'Сочи',            level: '4.5', age: 25, role: 'player', rating: 1520, xp: 1100 },

  // Ростов-на-Дону — 2 человека
  { name: 'Тимур Хасанов',      city: 'Ростов-на-Дону',  level: '4.0', age: 34, role: 'player', rating: 1380, xp: 680  },
  { name: 'Людмила Нестерова',  city: 'Ростов-на-Дону',  level: '3.0', age: 46, role: 'player', rating: 1030, xp: 135  },

  // Нижний Новгород — 2 человека
  { name: 'Зинаида Путилова',   city: 'Нижний Новгород', level: '3.5', age: 38, role: 'player', rating: 1220, xp: 415  },
  { name: 'Леонид Шаров',       city: 'Нижний Новгород', level: '4.0', age: 36, role: 'player', rating: 1400, xp: 730  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Создаём таблицу ghost_users, если не существует
    await client.query(`
      CREATE TABLE IF NOT EXISTS ghost_users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        city        TEXT,
        level       TEXT,
        age         INTEGER,
        role        TEXT DEFAULT 'player',
        rating      INTEGER DEFAULT 1000,
        xp          INTEGER DEFAULT 0,
        rtt_rank    INTEGER,
        rtt_category TEXT,
        avatar      TEXT,
        is_ghost    BOOLEAN DEFAULT TRUE  -- маркер, чтоб отличать от реальных
      )
    `);
    console.log('✅ Таблица ghost_users готова');

    // 2. Очищаем старых призраков (идемпотентный запуск)
    await client.query('DELETE FROM ghost_users');

    // 3. Вставляем 50 призраков
    for (const u of GHOST_USERS) {
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&size=128`;
      await client.query(
        `INSERT INTO ghost_users (name, city, level, age, role, rating, xp, rtt_rank, rtt_category, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [u.name, u.city, u.level, u.age, u.role, u.rating, u.xp, null, null, avatar]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Вставлено ${GHOST_USERS.length} фиктивных пользователей в ghost_users`);
    console.log('📊 Статистика в admin/stats НЕ изменится — ghost_users отдельная таблица');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

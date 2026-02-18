const { Pool } = require('pg');

// Скрипт для проверки состояния продакшн базы данных

async function checkDatabase() {
  console.log('🔍 Проверка базы данных на сервере...\n');
  
  // Создаём подключение с учётом .env переменных
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  try {
    // 1. Проверка подключения и версии PostgreSQL
    const versionResult = await pool.query('SELECT version();');
    console.log('✅ Подключение успешно!');
    console.log('📦 PostgreSQL версия:', versionResult.rows[0].version.split(',')[0]);
    console.log('');

    // 2. Информация о текущей базе данных
    const dbInfo = await pool.query(`
      SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
    `);
    console.log('📊 Информация о подключении:');
    console.log('   База данных:', dbInfo.rows[0].current_database);
    console.log('   Пользователь:', dbInfo.rows[0].current_user);
    console.log('   Хост:', dbInfo.rows[0].inet_server_addr);
    console.log('   Порт:', dbInfo.rows[0].inet_server_port);
    console.log('');

    // 3. Список всех баз данных на сервере
    const databases = await pool.query(`
      SELECT datname, pg_size_pretty(pg_database_size(datname)) as size 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY pg_database_size(datname) DESC;
    `);
    console.log('📁 Все базы данных на сервере:');
    databases.rows.forEach(db => {
      console.log(`   ${db.datname} (${db.size})`);
    });
    console.log('');

    // 4. Проверка таблиц в текущей базе
    const tables = await pool.query(`
      SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);
    console.log('📋 Таблицы в базе данных:', dbInfo.rows[0].current_database);
    if (tables.rows.length === 0) {
      console.log('   ⚠️  Таблиц не найдено!');
    } else {
      tables.rows.forEach(table => {
        console.log(`   ${table.tablename} (${table.size})`);
      });
    }
    console.log('');

    // 5. Количество записей в основных таблицах
    console.log('📈 Количество записей:');
    const tablesToCheck = ['users', 'partners', 'courts', 'tournaments', 'lessons', 'students', 'groups'];
    
    for (const table of tablesToCheck) {
      try {
        const count = await pool.query(`SELECT COUNT(*) FROM ${table};`);
        console.log(`   ${table}: ${count.rows[0].count} записей`);
      } catch (err) {
        console.log(`   ${table}: таблица не существует`);
      }
    }
    console.log('');

    // 6. Информация о пользователях
    try {
      const users = await pool.query(`
        SELECT id, name, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 10;
      `);
      console.log('👥 Последние пользователи:');
      users.rows.forEach(user => {
        const date = user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A';
        console.log(`   ${user.id} | ${user.name} | ${user.email} | ${user.role} | ${date}`);
      });
      console.log('');
    } catch (err) {
      console.log('⚠️  Ошибка при получении пользователей:', err.message);
    }

    // 7. Проверка времени создания таблиц (приблизительно)
    console.log('🕒 Анализ данных:');
    try {
      const oldestUser = await pool.query(`
        SELECT MIN(created_at) as oldest_user_date 
        FROM users 
        WHERE created_at IS NOT NULL;
      `);
      if (oldestUser.rows[0].oldest_user_date) {
        console.log('   Самый старый пользователь создан:', new Date(oldestUser.rows[0].oldest_user_date).toLocaleString('ru-RU'));
      }

      const newestUser = await pool.query(`
        SELECT MAX(created_at) as newest_user_date 
        FROM users 
        WHERE created_at IS NOT NULL;
      `);
      if (newestUser.rows[0].newest_user_date) {
        console.log('   Самый новый пользователь создан:', new Date(newestUser.rows[0].newest_user_date).toLocaleString('ru-RU'));
      }
    } catch (err) {
      console.log('   Не удалось получить информацию о датах');
    }

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    console.error('');
    console.error('Проверьте переменные окружения:');
    console.error('   DB_HOST:', process.env.DB_HOST);
    console.error('   DB_PORT:', process.env.DB_PORT);
    console.error('   DB_NAME:', process.env.DB_NAME);
    console.error('   DB_USER:', process.env.DB_USER);
    console.error('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'не установлен');
  } finally {
    await pool.end();
  }
}

// Запускаем проверку
checkDatabase();

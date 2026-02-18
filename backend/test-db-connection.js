require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ\n');

console.log('📋 Переменные окружения:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'не установлен');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'не установлен');
console.log('');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function diagnose() {
  try {
    console.log('🔌 Попытка подключения...\n');
    
    // 1. Базовая информация о подключении
    const connInfo = await pool.query(`
      SELECT 
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_host,
        inet_server_port() as server_port,
        pg_backend_pid() as backend_pid,
        version() as pg_version
    `);
    
    const info = connInfo.rows[0];
    
    console.log('✅ Подключение успешно!');
    console.log('');
    console.log('📊 Информация о сервере PostgreSQL:');
    console.log('   Имя базы данных:', info.database_name);
    console.log('   Пользователь:', info.username);
    console.log('   IP-адрес сервера:', info.server_host || 'Unix socket (локальное соединение)');
    console.log('   Порт сервера:', info.server_port || 'Unix socket');
    console.log('   Backend PID:', info.backend_pid);
    console.log('   PostgreSQL:', info.pg_version.split(',')[0]);
    console.log('');
    
    // 2. Путь к сокету (для Unix socket подключений)
    try {
      const socketInfo = await pool.query(`
        SELECT setting FROM pg_settings WHERE name = 'unix_socket_directories';
      `);
      if (socketInfo.rows.length > 0) {
        console.log('   Unix Socket Path:', socketInfo.rows[0].setting);
      }
    } catch (err) {
      // Игнорируем
    }
    
    // 3. Размер базы данных
    const dbSize = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    console.log('💾 Размер базы данных:', dbSize.rows[0].size);
    console.log('');
    
    // 4. Количество записей в основных таблицах
    console.log('📈 Содержимое базы данных:');
    
    const tables = ['users', 'tournaments', 'lessons', 'students', 'groups', 'partners', 'courts'];
    let hasData = false;
    
    for (const table of tables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) FROM ${table};`);
        const num = parseInt(count.rows[0].count);
        if (num > 0) {
          console.log(`   ${table}: ${num} записей`);
          hasData = true;
        }
      } catch (err) {
        // Таблица не существует
      }
    }
    
    if (!hasData) {
      console.log('   ⚠️  База данных пустая или таблицы не созданы');
    }
    console.log('');
    
    // 5. Список пользователей
    try {
      const users = await pool.query(`
        SELECT id, name, email, role, created_at 
        FROM users 
        ORDER BY id 
        LIMIT 10;
      `);
      
      if (users.rows.length > 0) {
        console.log('👥 Пользователи в базе данных:');
        users.rows.forEach(user => {
          const date = user.created_at ? 
            new Date(user.created_at).toISOString().split('T')[0] : 
            'N/A';
          console.log(`   ${user.id} | ${user.name.padEnd(20)} | ${user.email.padEnd(25)} | ${user.role} | ${date}`);
        });
        console.log('');
        
        // Даты создания
        const dateRange = await pool.query(`
          SELECT 
            MIN(created_at) as first_user,
            MAX(created_at) as last_user
          FROM users 
          WHERE created_at IS NOT NULL;
        `);
        
        if (dateRange.rows[0].first_user) {
          console.log('📅 Временной диапазон пользователей:');
          console.log('   Первый пользователь:', new Date(dateRange.rows[0].first_user).toLocaleString('ru-RU'));
          console.log('   Последний пользователь:', new Date(dateRange.rows[0].last_user).toLocaleString('ru-RU'));
          console.log('');
        }
      } else {
        console.log('⚠️  В таблице users нет записей');
        console.log('');
      }
    } catch (err) {
      console.log('⚠️  Таблица users не существует');
      console.log('');
    }
    
    // 6. Информация о системе
    console.log('🖥️  Информация о системе:');
    console.log('   Платформа:', process.platform);
    console.log('   Архитектура:', process.arch);
    console.log('   Node.js:', process.version);
    console.log('   Рабочая директория:', process.cwd());
    console.log('');
    
    // 7. Активные подключения к БД
    try {
      const connections = await pool.query(`
        SELECT count(*) as total,
               count(*) FILTER (WHERE state = 'active') as active,
               count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `);
      console.log('🔌 Активные подключения к этой БД:');
      console.log('   Всего:', connections.rows[0].total);
      console.log('   Активные:', connections.rows[0].active);
      console.log('   Ожидающие:', connections.rows[0].idle);
      console.log('');
    } catch (err) {
      // Недостаточно прав
    }
    
    // 8. Проверка на конфликт сред
    console.log('⚠️  ПРОВЕРКА КОНФИГУРАЦИИ:');
    
    const warnings = [];
    
    if (process.env.NODE_ENV === 'production' && info.database_name.includes('local')) {
      warnings.push('   ⚠️  Продакшн использует БД с "local" в названии!');
    }
    
    if (process.env.NODE_ENV === 'development' && info.database_name.includes('production')) {
      warnings.push('   ⚠️  Разработка использует БД с "production" в названии!');
    }
    
    if (process.env.DB_HOST === 'localhost' && !info.server_host) {
      warnings.push('   ℹ️  Используется Unix socket (нормально для локальных подключений)');
    }
    
    if (info.database_name === 'tennis_pro' && !info.database_name.includes('prod') && !info.database_name.includes('local')) {
      warnings.push('   ⚠️  База называется "tennis_pro" - возможен конфликт между prod и dev');
      warnings.push('   💡 Рекомендация: переименуйте в tennis_pro_local или tennis_pro_production');
    }
    
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(w));
    } else {
      console.log('   ✅ Конфигурация выглядит корректно');
    }
    console.log('');
    
    // 9. Итоговая информация
    console.log('═══════════════════════════════════════════════════════');
    console.log('📍 РЕЗЮМЕ:');
    console.log(`   Вы подключены к базе "${info.database_name}" на ${info.server_host || 'локальном сервере'}`);
    console.log(`   Окружение: ${process.env.NODE_ENV || 'не указано'}`);
    
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   Пользователей: ${userCount.rows[0].count}`);
    
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (err) {
    console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ:', err.message);
    console.error('');
    console.error('Проверьте:');
    console.error('1. Запущен ли PostgreSQL');
    console.error('2. Правильность параметров в .env');
    console.error('3. Существует ли база данных:', process.env.DB_NAME);
    console.error('');
    console.error('Полная ошибка:', err);
  } finally {
    await pool.end();
  }
}

diagnose();

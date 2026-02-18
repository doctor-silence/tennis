const { Pool } = require('pg');

// Скрипт для поиска данных во всех базах данных на сервере

async function scanAllDatabases() {
  console.log('🔍 Сканирование всех баз данных на сервере...\n');
  
  // Подключаемся к postgres (системная БД) для получения списка всех баз
  const systemPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Системная БД
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Получаем список всех баз данных
    const databases = await systemPool.query(`
      SELECT datname, pg_size_pretty(pg_database_size(datname)) as size,
             pg_database_size(datname) as size_bytes
      FROM pg_database 
      WHERE datistemplate = false 
        AND datname NOT IN ('postgres', 'template0', 'template1')
      ORDER BY pg_database_size(datname) DESC;
    `);

    console.log('📁 Найдено баз данных:', databases.rows.length);
    console.log('');

    // Проверяем каждую базу данных
    for (const db of databases.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 База данных: ${db.datname}`);
      console.log(`   Размер: ${db.size}`);
      
      // Подключаемся к каждой базе
      const dbPool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: db.datname,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
      });

      try {
        // Проверяем наличие таблицы users
        const hasUsers = await dbPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          ) as exists;
        `);

        if (hasUsers.rows[0].exists) {
          console.log('   ✅ Таблица users найдена');

          // Получаем количество пользователей
          const userCount = await dbPool.query('SELECT COUNT(*) FROM users;');
          console.log(`   👥 Пользователей: ${userCount.rows[0].count}`);

          if (parseInt(userCount.rows[0].count) > 2) {
            console.log('   🎯 ВНИМАНИЕ: Найдено больше 2 пользователей!');
            
            // Получаем список пользователей
            const users = await dbPool.query(`
              SELECT id, name, email, role, created_at 
              FROM users 
              ORDER BY created_at DESC 
              LIMIT 10;
            `);
            
            console.log('   📋 Последние пользователи:');
            users.rows.forEach(user => {
              const date = user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A';
              console.log(`      ${user.id} | ${user.name} | ${user.email} | ${user.role} | ${date}`);
            });

            // Проверяем другие таблицы
            const tablesToCheck = ['tournaments', 'lessons', 'students', 'groups', 'partners'];
            console.log('   📊 Другие таблицы:');
            
            for (const table of tablesToCheck) {
              try {
                const count = await dbPool.query(`SELECT COUNT(*) FROM ${table};`);
                if (parseInt(count.rows[0].count) > 0) {
                  console.log(`      ${table}: ${count.rows[0].count} записей`);
                }
              } catch (err) {
                // Таблица не существует, пропускаем
              }
            }
          }

          // Даты создания пользователей
          try {
            const dateRange = await dbPool.query(`
              SELECT 
                MIN(created_at) as oldest,
                MAX(created_at) as newest
              FROM users 
              WHERE created_at IS NOT NULL;
            `);
            
            if (dateRange.rows[0].oldest) {
              console.log('   🕒 Период:');
              console.log(`      Первый пользователь: ${new Date(dateRange.rows[0].oldest).toLocaleString('ru-RU')}`);
              console.log(`      Последний пользователь: ${new Date(dateRange.rows[0].newest).toLocaleString('ru-RU')}`);
            }
          } catch (err) {
            // Игнорируем ошибки
          }

        } else {
          console.log('   ⚪ Таблица users не найдена');
        }

      } catch (err) {
        console.log('   ❌ Ошибка при проверке:', err.message);
      } finally {
        await dbPool.end();
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Сканирование завершено!');
    console.log('');
    console.log('💡 Рекомендации:');
    console.log('   1. Если найдена база с пользователями > 2 - это может быть ваша рабочая БД');
    console.log('   2. Проверьте .env файл и убедитесь, что DB_NAME указывает на правильную базу');
    console.log('   3. Создайте резервную копию найденной базы перед любыми операциями');
    console.log('      pg_dump -U admin -h localhost имя_базы > backup_$(date +%Y%m%d).sql');

  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message);
  } finally {
    await systemPool.end();
  }
}

// Запускаем сканирование
scanAllDatabases();

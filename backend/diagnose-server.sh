#!/bin/bash
# Скрипт для диагностики базы данных на продакшн-сервере

echo "🔍 Диагностика базы данных tennis_pro"
echo "========================================"
echo ""

# 1. Проверка текущей конфигурации
echo "📋 1. Проверка .env файла:"
echo "   DB_NAME: $DB_NAME"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PORT: $DB_PORT"
echo "   DB_USER: $DB_USER"
echo ""

# 2. Список всех баз данных
echo "📊 2. Все базы данных на сервере:"
sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size FROM pg_database WHERE datistemplate = false ORDER BY pg_database_size(datname) DESC;"
echo ""

# 3. Количество пользователей в tennis_pro
echo "👥 3. Пользователи в tennis_pro:"
PGPASSWORD='Vek19866891!' psql -U admin -d tennis_pro -h localhost -t -c "SELECT COUNT(*) FROM users;"
echo ""

# 4. Проверка содержимого tennis_pro
echo "📈 4. Содержимое базы tennis_pro:"
PGPASSWORD='Vek19866891!' psql -U admin -d tennis_pro -h localhost -c "
SELECT 
  'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'tournaments', COUNT(*) FROM tournaments
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
ORDER BY table_name;
"
echo ""

# 5. Последние пользователи
echo "👤 5. Последние созданные пользователи:"
PGPASSWORD='Vek19866891!' psql -U admin -d tennis_pro -h localhost -c "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
echo ""

# 6. Поиск резервных копий
echo "💾 6. Поиск резервных копий:"
echo "   Ищем в стандартных местах..."
find /var/lib/postgresql /var/backups ~/backups -name "*.dump" -o -name "*.sql" 2>/dev/null | grep -i tennis | head -10
echo ""

# 7. Проверка логов PostgreSQL
echo "📝 7. Последние записи в логах PostgreSQL (последние 20 строк):"
sudo tail -20 /var/log/postgresql/postgresql-*.log 2>/dev/null | grep -i "tennis\|CREATE\|DROP" || echo "   Логи недоступны или не содержат релевантной информации"
echo ""

# 8. История команд (может показать, что запускалось)
echo "🕒 8. История команд, связанных с БД:"
history | grep -i "initDb\|psql\|pg_dump\|node" | tail -10
echo ""

echo "✅ Диагностика завершена!"
echo ""
echo "Следующие шаги:"
echo "  1. Если нашлись другие базы с большим размером - проверьте их"
echo "  2. Если нашлись резервные копии - можно восстановить данные"
echo "  3. Запустите: node checkProductionDb.js для детальной информации"

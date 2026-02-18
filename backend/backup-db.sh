#!/bin/bash

# Скрипт для быстрого создания резервной копии базы данных tennis_pro

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Создание резервной копии базы данных...${NC}\n"

# Параметры подключения
DB_NAME="${DB_NAME:-tennis_pro}"
DB_USER="${DB_USER:-admin}"
DB_HOST="${DB_HOST:-localhost}"
DB_PASSWORD="${DB_PASSWORD}"
DB_PORT="${DB_PORT:-5432}"

# Директория для бэкапов
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Имя файла с датой и временем
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo "📋 Параметры:"
echo "   База данных: $DB_NAME"
echo "   Пользователь: $DB_USER"
echo "   Хост: $DB_HOST"
echo "   Порт: $DB_PORT"
echo "   Файл бэкапа: $BACKUP_FILE_GZ"
echo ""

# Проверка подключения
echo -e "${YELLOW}🔍 Проверка подключения...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Ошибка подключения к базе данных!${NC}"
    echo "Проверьте параметры подключения в .env файле"
    exit 1
fi
echo -e "${GREEN}✅ Подключение успешно${NC}\n"

# Получение статистики базы данных
echo -e "${YELLOW}📊 Статистика базы данных:${NC}"
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -t -c "
SELECT 
    'Размер базы: ' || pg_size_pretty(pg_database_size('$DB_NAME'))
UNION ALL
SELECT 
    'Пользователей: ' || COUNT(*)::text FROM users
UNION ALL
SELECT 
    'Турниров: ' || COUNT(*)::text FROM tournaments
UNION ALL
SELECT 
    'Уроков: ' || COUNT(*)::text FROM lessons
UNION ALL
SELECT 
    'Студентов: ' || COUNT(*)::text FROM students;
" 2>/dev/null || echo "   Не удалось получить статистику"
echo ""

# Создание дампа
echo -e "${YELLOW}💾 Создание резервной копии...${NC}"
if PGPASSWORD="$DB_PASSWORD" pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" > "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Дамп создан${NC}"
else
    echo -e "${RED}❌ Ошибка при создании дампа!${NC}"
    exit 1
fi

# Сжатие
echo -e "${YELLOW}🗜️  Сжатие файла...${NC}"
if gzip "$BACKUP_FILE"; then
    ORIGINAL_SIZE=$(wc -c < "$BACKUP_FILE_GZ")
    READABLE_SIZE=$(numfmt --to=iec-i --suffix=B "$ORIGINAL_SIZE" 2>/dev/null || echo "$ORIGINAL_SIZE bytes")
    echo -e "${GREEN}✅ Файл сжат: $READABLE_SIZE${NC}"
else
    echo -e "${RED}❌ Ошибка при сжатии!${NC}"
    exit 1
fi

# Список всех бэкапов
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Резервная копия успешно создана!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📁 Файл: $BACKUP_FILE_GZ"
echo ""

# Показать все бэкапы
if ls "$BACKUP_DIR"/*.sql.gz 1> /dev/null 2>&1; then
    echo "📦 Все резервные копии в $BACKUP_DIR:"
    ls -lh "$BACKUP_DIR"/*.sql.gz | awk '{print "   " $9 " (" $5 ")"}'
    echo ""
fi

# Инструкции по восстановлению
echo -e "${YELLOW}💡 Для восстановления из этого бэкапа:${NC}"
echo ""
echo "   # Распаковать:"
echo "   gunzip $BACKUP_FILE_GZ"
echo ""
echo "   # Восстановить:"
echo "   PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -h $DB_HOST -d $DB_NAME < ${BACKUP_FILE}"
echo ""
echo "   # Или одной командой:"
echo "   gunzip < $BACKUP_FILE_GZ | PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -h $DB_HOST -d $DB_NAME"
echo ""

# Очистка старых бэкапов (старше 30 дней)
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 2>/dev/null)
if [ -n "$OLD_BACKUPS" ]; then
    echo -e "${YELLOW}🗑️  Найдены старые бэкапы (>30 дней):${NC}"
    echo "$OLD_BACKUPS"
    echo ""
    read -p "Удалить старые бэкапы? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
        echo -e "${GREEN}✅ Старые бэкапы удалены${NC}"
    fi
fi

echo -e "${GREEN}✨ Готово!${NC}"

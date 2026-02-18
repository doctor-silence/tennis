# Руководство по деплою TennisPro на VPS

Полная инструкция по развертыванию приложения TennisPro на VPS сервере с использованием Node.js, PostgreSQL, Nginx и PM2.

## Содержание

- [Требования](#требования)
- [1. Подготовка VPS](#1-подготовка-vps)
- [2. Установка необходимого ПО](#2-установка-необходимого-по)
- [3. Настройка PostgreSQL](#3-настройка-postgresql)
- [4. Клонирование проекта](#4-клонирование-проекта)
- [5. Настройка Backend](#5-настройка-backend)
- [6. Настройка Frontend](#6-настройка-frontend)
- [7. Настройка Nginx](#7-настройка-nginx)
- [8. Настройка PM2](#8-настройка-pm2)
- [9. Настройка SSL (HTTPS)](#9-настройка-ssl-https)
- [10. Мониторинг и обслуживание](#10-мониторинг-и-обслуживание)

---

## Требования

- **VPS сервер** с Ubuntu 20.04/22.04 или Debian 11/12
- **Минимум 2GB RAM** (рекомендуется 4GB)
- **20GB дисковое пространство**
- **Root или sudo доступ**
- **Доменное имя** (опционально, для SSL)

---

## 1. Подготовка VPS

### 1.1 Подключение к серверу

```bash
ssh root@your_server_ip
# или
ssh your_user@your_server_ip
```

### 1.2 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Создание пользователя для приложения (опционально)

```bash
# Создаем нового пользователя
sudo adduser tennis

# Добавляем в группу sudo
sudo usermod -aG sudo tennis

# Переключаемся на нового пользователя
su - tennis
```

### 1.4 Настройка файрвола

```bash
# Разрешаем SSH
sudo ufw allow OpenSSH

# Разрешаем HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включаем файрвол
sudo ufw enable

# Проверяем статус
sudo ufw status
```

---

## 2. Установка необходимого ПО

### 2.1 Установка Node.js (v20 LTS)

```bash
# Устанавливаем Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверяем установку
node --version
npm --version
```

### 2.2 Установка PostgreSQL

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Проверка статуса
sudo systemctl status postgresql
```

### 2.3 Установка Nginx

```bash
sudo apt install -y nginx

# Проверка статуса
sudo systemctl status nginx
```

### 2.4 Установка PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Проверка установки
pm2 --version
```

### 2.5 Установка Git

```bash
sudo apt install -y git

# Проверка установки
git --version
```

---

## 3. Настройка PostgreSQL

### 3.1 Создание базы данных и пользователя

```bash
# Переключаемся на пользователя postgres
sudo -u postgres psql

# В psql выполняем:
CREATE DATABASE tennis_pro;
CREATE USER admin WITH PASSWORD '';
GRANT ALL PRIVILEGES ON DATABASE tennis_pro TO admin;

# Даем права на схему public
\c tennis_pro
GRANT ALL ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

# Выходим
\q
```

### 3.2 Настройка удаленного доступа (если требуется)

Редактируем `/etc/postgresql/*/main/postgresql.conf`:

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf

# Находим и изменяем:
listen_addresses = 'localhost'  # Для безопасности оставляем localhost
```

Редактируем `/etc/postgresql/*/main/pg_hba.conf`:

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Добавляем строку для локального доступа:
local   all             admin                                   md5
```

Перезапускаем PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3.3 Тестирование подключения

```bash
psql -U admin -d tennis_pro -h localhost
# Вводим пароль

# Если подключение успешно:
\q
```

---

## 4. Клонирование проекта

### 4.1 Создание директории для проекта

```bash
# Создаем директорию
sudo mkdir -p /var/www/tennispro
sudo chown -R $USER:$USER /var/www/tennispro

# Переходим в директорию
cd /var/www/tennispro
```

### 4.2 Клонирование репозитория

```bash
# Если проект в Git
git clone https://github.com/your-username/tennis.git .

# Или загружаем через SCP/SFTP
# scp -r /local/path/to/tennis/* user@server:/var/www/tennispro/
```

### 4.3 Проверка структуры

```bash
ls -la
# Должны увидеть: backend/, frontend/, README.md и т.д.
```

---

## 5. Настройка Backend

### 5.1 Установка зависимостей

```bash
cd /var/www/tennispro/backend
npm install --production
```

### 5.2 Создание .env файла

```bash
nano .env
```

Содержимое `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_USER=admin
DB_HOST=localhost
DB_NAME=tennis_pro
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Admin Credentials
ADMIN_EMAIL=admin@tennis.pro
ADMIN_PASSWORD=your_secure_admin_password

# API Keys
API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# CORS (если фронтенд на другом домене)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Сохраняем (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 5.3 Инициализация базы данных

```bash
# Запускаем скрипт инициализации
node initDb.js

# Проверяем логи
cat server.log
```

### 5.4 Тестовый запуск

```bash
# ВАЖНО: Убедитесь, что вы находитесь в директории backend!
pwd  # Должен показать /var/www/tennispro/backend (или ваш путь к backend)

# Если нет, перейдите в директорию backend:
cd /var/www/tennispro/backend

# Запускаем сервер в тестовом режиме
node server.js

# Если все OK, останавливаем (Ctrl+C)
```

---

## 6. Настройка Frontend

### 6.1 Установка зависимостей

```bash
cd /var/www/tennispro/frontend
npm install
```

### 6.2 Создание .env файла для сборки

```bash
nano .env
```

Содержимое `.env`:

```env
VITE_API_URL=https://yourdomain.com/api
# или http://your_server_ip:3001 для тестирования
```

### 6.3 Сборка production версии

```bash
npm run build

# Проверяем, что создалась папка dist
ls -la dist/
```

### 6.4 Настройка прав доступа

```bash
sudo chown -R www-data:www-data /var/www/tennispro/frontend/dist
```

---

## 7. Настройка Nginx

### 7.1 Создание конфигурационного файла

```bash
sudo nano /etc/nginx/sites-available/tennispro
```

Содержимое конфигурации:

```nginx
# Upstream для backend
upstream backend {
    server localhost:3001;
    keepalive 64;
}

# HTTP Server - редирект на HTTPS (после настройки SSL)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Временно разрешаем HTTP (закомментируйте после настройки SSL)
    location / {
        root /var/www/tennispro/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Раскомментируйте после настройки SSL:
    # return 301 https://$server_name$request_uri;
}

# HTTPS Server (раскомментируйте после настройки SSL)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name yourdomain.com www.yourdomain.com;
#
#     # SSL сертификаты (Let's Encrypt)
#     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
#
#     # SSL настройки
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     # Security headers
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#
#     # Frontend
#     location / {
#         root /var/www/tennispro/frontend/dist;
#         try_files $uri $uri/ /index.html;
#         
#         # Cache static assets
#         location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
#             expires 1y;
#             add_header Cache-Control "public, immutable";
#         }
#     }
#
#     # Backend API
#     location /api {
#         proxy_pass http://backend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#         
#         # Timeouts
#         proxy_connect_timeout 60s;
#         proxy_send_timeout 60s;
#         proxy_read_timeout 60s;
#     }
#
#     # WebSocket
#     location /socket.io {
#         proxy_pass http://backend;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         
#         # WebSocket timeouts
#         proxy_connect_timeout 7d;
#         proxy_send_timeout 7d;
#         proxy_read_timeout 7d;
#     }
# }
```

### 7.2 Активация конфигурации

```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/tennispro /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

### 7.3 Проверка

Откройте браузер и перейдите на `http://your_server_ip` или `http://yourdomain.com`

---

## 8. Настройка PM2

### 8.1 Создание ecosystem файла

```bash
cd /var/www/tennispro
nano ecosystem.config.js
```

Содержимое `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'tennispro-backend',
      cwd: '/var/www/tennispro/backend',
      script: 'server.js',
      instances: 1, // или 'max' для использования всех CPU
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/tennispro/backend/logs/error.log',
      out_file: '/var/www/tennispro/backend/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    }
  ]
};
```

### 8.2 Создание директории для логов

```bash
mkdir -p /var/www/tennispro/backend/logs
```

### 8.3 Запуск приложения через PM2

```bash
# Запускаем приложение
pm2 start ecosystem.config.js

# Проверяем статус
pm2 status

# Просмотр логов
pm2 logs tennispro-backend

# Остановка просмотра логов (Ctrl+C)
```

### 8.4 Автозапуск при перезагрузке

```bash
# Сохраняем текущие процессы
pm2 save

# Генерируем startup скрипт
pm2 startup systemd

# Выполняем команду, которую выдаст PM2 (примерно такую):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u tennis --hp /home/tennis
```

### 8.5 Полезные команды PM2

```bash
# Рестарт приложения
pm2 restart tennispro-backend

# Остановка
pm2 stop tennispro-backend

# Удаление из списка
pm2 delete tennispro-backend

# Мониторинг
pm2 monit

# Информация о процессе
pm2 info tennispro-backend

# Логи в реальном времени
pm2 logs tennispro-backend --lines 100
```

---

## 9. Настройка SSL (HTTPS)

### 9.1 Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 Получение SSL сертификата

```bash
# Останавливаем Nginx (или убедитесь, что порт 80 свободен)
sudo systemctl stop nginx

# Получаем сертификат
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям Certbot
# Укажите email для уведомлений
# Согласитесь с условиями
```

### 9.3 Обновление конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/tennispro
```

Раскомментируйте HTTPS секцию и включите редирект с HTTP на HTTPS (см. конфигурацию выше).

```bash
# Проверяем конфигурацию
sudo nginx -t

# Запускаем Nginx
sudo systemctl start nginx
```

### 9.4 Автоматическое обновление сертификата

```bash
# Certbot автоматически добавляет задание в cron
# Проверяем:
sudo certbot renew --dry-run

# Если все OK, сертификаты будут обновляться автоматически
```

---

## 10. Мониторинг и обслуживание

### 10.1 Мониторинг логов

```bash
# PM2 логи
pm2 logs tennispro-backend

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Системные логи
sudo journalctl -u nginx -f
```

### 10.2 Мониторинг ресурсов

```bash
# CPU и память через PM2
pm2 monit

# Общий мониторинг системы
htop
# или
top

# Использование диска
df -h

# Проверка подключений к базе данных
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### 10.3 Резервное копирование базы данных

Создаем скрипт бэкапа:

```bash
sudo nano /usr/local/bin/backup-tennis-db.sh
```

Содержимое скрипта:

```bash
#!/bin/bash

# Настройки
BACKUP_DIR="/var/backups/tennis"
DB_NAME="tennis_pro"
DB_USER="admin"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/tennis_backup_$DATE.sql.gz"

# Создаем директорию если не существует
mkdir -p $BACKUP_DIR

# Экспорт пароля (или используйте .pgpass)
export PGPASSWORD='your_secure_password'

# Создаем бэкап
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -name "tennis_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Даем права на выполнение:

```bash
sudo chmod +x /usr/local/bin/backup-tennis-db.sh
```

Добавляем в cron (ежедневно в 3:00):

```bash
sudo crontab -e

# Добавляем строку:
0 3 * * * /usr/local/bin/backup-tennis-db.sh >> /var/log/tennis-backup.log 2>&1
```

### 10.4 Обновление приложения

Создаем скрипт деплоя:

```bash
nano /var/www/tennispro/deploy.sh
```

Содержимое:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Переходим в директорию проекта
cd /var/www/tennispro

# Получаем последние изменения
echo "📥 Pulling latest changes..."
git pull origin main

# Backend
echo "🔧 Updating backend..."
cd backend
npm install --production
pm2 restart tennispro-backend

# Frontend
echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

# Обновляем права
sudo chown -R www-data:www-data dist/

# Перезагружаем Nginx
echo "🔄 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed!"

# Проверяем статус
pm2 status
```

Даем права:

```bash
chmod +x /var/www/tennispro/deploy.sh
```

Запуск обновления:

```bash
cd /var/www/tennispro
./deploy.sh
```

### 10.5 Проверка здоровья системы

```bash
# Статус всех сервисов
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Проверка портов
sudo netstat -tulpn | grep LISTEN

# Проверка API
curl http://localhost:3001/api/health
# или создайте эндпоинт /api/health в backend
```

---

## Troubleshooting

### Проблема: Ошибка "relation 'groups' does not exist" при инициализации БД

Эта ошибка возникает из-за неправильного порядка создания таблиц. Таблица `posts` ссылается на `groups`, но `groups` создается позже.

**Решение:**

```bash
# 1. Удалите существующую базу данных (ВНИМАНИЕ: это удалит все данные!)
sudo -u postgres psql

DROP DATABASE tennis_pro;
CREATE DATABASE tennis_pro;
GRANT ALL PRIVILEGES ON DATABASE tennis_pro TO admin;

\c tennis_pro
GRANT ALL ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

\q

# 2. Убедитесь, что используете исправленную версию initDb.js
cd /var/www/tennispro/backend

# 3. Запустите инициализацию заново
node initDb.js

# 4. Проверьте, что все таблицы созданы
psql -U admin -d tennis_pro -h localhost -c "\dt"
```

**Альтернативное решение (если нужно сохранить данные):**

```bash
# Создайте таблицу groups вручную перед posts
sudo -u postgres psql -d tennis_pro

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar TEXT,
    location VARCHAR(255),
    contact VARCHAR(255),
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

\q

# Затем запустите initDb.js
node initDb.js
```

### Проблема: Backend не запускается

```bash
# Проверяем логи
pm2 logs tennispro-backend --err

# Проверяем подключение к БД
psql -U admin -d tennis_pro -h localhost

# Проверяем .env файл
cat /var/www/tennispro/backend/.env
```

### Проблема: Nginx ошибки 502

```bash
# Проверяем, запущен ли backend
pm2 status

# Проверяем порт
sudo netstat -tulpn | grep 3001

# Перезапускаем backend
pm2 restart tennispro-backend
```

### Проблема: WebSocket не работает

Убедитесь, что в Nginx конфигурации присутствуют заголовки для WebSocket:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Проблема: SSL сертификат не обновляется

```bash
# Проверяем автоматическое обновление
sudo certbot renew --dry-run

# Проверяем cron задачи
sudo systemctl status certbot.timer
```

---

## Безопасность

### Рекомендации:

1. **Измените все пароли по умолчанию**
2. **Настройте SSH ключи** вместо паролей
3. **Отключите root login** через SSH
4. **Настройте fail2ban** для защиты от брутфорса
5. **Регулярно обновляйте систему**: `sudo apt update && sudo apt upgrade`
6. **Используйте сильные пароли** для БД и админ-панели
7. **Настройте регулярные бэкапы**
8. **Мониторьте логи** на подозрительную активность

---

## Полезные ссылки

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Поддержка

При возникновении проблем:

1. Проверьте логи (PM2, Nginx, PostgreSQL)
2. Убедитесь, что все сервисы запущены
3. Проверьте файрвол и порты
4. Проверьте .env файлы
5. Обратитесь к разделу Troubleshooting

---

**Последнее обновление:** 18 февраля 2026  
**Версия:** 1.0

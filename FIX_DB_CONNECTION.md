# 🔧 ИСПРАВЛЕНИЕ: Сервер подключается к локальной БД

## Проблема
Продакшн-сервер использует **локальную базу данных** вместо продакшн-базы.
Все изменения в локальной БД появляются на проде, потому что это одна и та же база!

---

## ✅ РЕШЕНИЕ

### 1️⃣ Проверьте `.env` на сервере

```bash
ssh tennis@sixoreuntp
cd /var/www/tennispro/tennis/backend
cat .env
```

**Вы увидите что-то вроде:**
```env
DB_HOST=localhost
DB_NAME=tennis_pro
```

Проблема в том, что `localhost` на сервере указывает на вашу **локальную машину**, если вы используете SSH-туннель или проброс портов!

---

### 2️⃣ Найдите правильный хост базы данных

На сервере выполните:

```bash
# Проверьте, где реально запущен PostgreSQL на сервере
sudo systemctl status postgresql

# Посмотрите, какие базы есть на СЕРВЕРНОМ PostgreSQL
sudo -u postgres psql -c "\l"

# Проверьте текущее подключение вашего приложения
netstat -tunlp 2>/dev/null | grep 5432
```

**Возможные варианты:**

#### Вариант А: PostgreSQL на том же сервере
Если PostgreSQL запущен на самом сервере, правильная конфигурация:

```env
DB_HOST=localhost  # или 127.0.0.1
DB_NAME=tennis_pro
DB_USER=admin
DB_PASSWORD=Vek19866891!
DB_PORT=5432
```

НО! Проверьте, что порт 5432 **НЕ** пробрасывается к вашей локальной машине.

#### Вариант Б: Вы используете SSH-туннель
Если вы подключаетесь через SSH-туннель типа:
```bash
ssh -L 5432:localhost:5432 tennis@sixoreuntp
```

То на **СЕРВЕРЕ** нужно явно указать:
```env
DB_HOST=127.0.0.1  # НЕ localhost!
DB_NAME=tennis_pro
DB_PORT=5432
```

Или лучше использовать сокет Unix:
```env
DB_HOST=/var/run/postgresql  # путь к сокету
DB_NAME=tennis_pro
```

#### Вариант В: Внешняя база данных
Если БД на отдельном сервере:
```env
DB_HOST=<IP_адрес_БД_сервера>
DB_NAME=tennis_pro
DB_PORT=5432
```

---

### 3️⃣ Проверьте, куда реально подключается приложение

Создайте тестовый скрипт на сервере:

```bash
cd /var/www/tennispro/tennis/backend
nano test-db-connection.js
```

Вставьте:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function test() {
  try {
    const result = await pool.query(`
      SELECT 
        current_database() as db,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port,
        version()
    `);
    
    console.log('🔍 Подключение к БД:');
    console.log('   База:', result.rows[0].db);
    console.log('   Пользователь:', result.rows[0].user);
    console.log('   Хост:', result.rows[0].host || 'Unix socket');
    console.log('   Порт:', result.rows[0].port || 'Unix socket');
    console.log('   PostgreSQL:', result.rows[0].version.split(',')[0]);
    console.log('');
    
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('👥 Пользователей в БД:', users.rows[0].count);
    
    const userList = await pool.query('SELECT id, name, email FROM users ORDER BY id LIMIT 5');
    console.log('📋 Первые пользователи:');
    userList.rows.forEach(u => console.log(`   ${u.id} | ${u.name} | ${u.email}`));
    
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await pool.end();
  }
}

test();
```

Запустите:
```bash
node test-db-connection.js
```

**Затем запустите ТОТ ЖЕ СКРИПТ на локальной машине:**
```bash
# На вашем компьютере
cd /Users/admin/Documents/xxx/tennis/tennis/backend
node test-db-connection.js
```

Если вывод **одинаковый** - значит они подключаются к одной БД!

---

### 4️⃣ Исправление конфигурации

#### На сервере:

```bash
cd /var/www/tennispro/tennis/backend
nano .env
```

Убедитесь, что:
1. `DB_HOST` указывает на **локальный PostgreSQL сервера** (не вашей машины)
2. `DB_NAME` - это уникальная продакшн-база
3. Нет конфликтов с SSH-туннелями

```env
# ПРАВИЛЬНАЯ конфигурация для сервера
PORT=3001
NODE_ENV=production

# База данных НА СЕРВЕРЕ
DB_USER=admin
DB_HOST=127.0.0.1
DB_NAME=tennis_pro_production  # Другое имя!
DB_PASSWORD=Vek19866891!
DB_PORT=5432

ADMIN_EMAIL=admin@tennis.pro
ADMIN_PASSWORD=123Qwe123!123Qwe123!
```

#### На локальной машине:

```bash
cd /Users/admin/Documents/xxx/tennis/tennis/backend
nano .env
```

```env
# ПРАВИЛЬНАЯ конфигурация для разработки
PORT=3001
NODE_ENV=development

# Локальная база данных
DB_USER=admin
DB_HOST=localhost
DB_NAME=tennis_pro_local  # Другое имя!
DB_PASSWORD=Vek19866891!
DB_PORT=5432

ADMIN_EMAIL=admin@tennis.pro
ADMIN_PASSWORD=123Qwe123!123Qwe123!
```

---

### 5️⃣ Создайте отдельные базы данных

**На сервере:**
```bash
# Создайте продакшн-базу
sudo -u postgres psql -c "CREATE DATABASE tennis_pro_production OWNER admin;"

# Скопируйте данные из текущей (если нужно)
pg_dump -U admin -h localhost tennis_pro | PGPASSWORD='Vek19866891!' psql -U admin -h localhost tennis_pro_production

# Проверьте
PGPASSWORD='Vek19866891!' psql -U admin -h localhost -d tennis_pro_production -c "SELECT COUNT(*) FROM users;"
```

**На локальной машине:**
```bash
# Создайте локальную базу для разработки
psql -U admin -h localhost -c "CREATE DATABASE tennis_pro_local OWNER admin;"

# Инициализируйте её
cd /Users/admin/Documents/xxx/tennis/tennis/backend
NODE_ENV=development node initDb.js
```

---

### 6️⃣ Перезапустите приложения

**На сервере:**
```bash
pm2 restart all
pm2 logs
```

**Локально:**
```bash
# Перезапустите backend
```

---

### 7️⃣ Проверка

**На сервере:**
```bash
curl http://localhost:3001/api/users | jq
```

**Локально:**
```bash
curl http://localhost:3001/api/users | jq
```

Теперь они должны показывать **разные данные**!

---

## 🔒 Защита на будущее

### 1. Разные имена баз данных

- Локально: `tennis_pro_local` или `tennis_pro_dev`
- Продакшн: `tennis_pro_production` или `tennis_pro`

### 2. Проверка окружения в коде

Добавьте в `server.js`:

```javascript
console.log('🚀 Запуск сервера...');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   PORT:', process.env.PORT);

if (process.env.NODE_ENV === 'production' && process.env.DB_HOST === 'localhost') {
  console.warn('⚠️  ВНИМАНИЕ: Продакшн использует localhost - проверьте конфигурацию!');
}
```

### 3. Отключите SSH-туннели

Если вы используете что-то вроде:
```bash
ssh -L 5432:localhost:5432 tennis@sixoreuntp
```

**Остановите этот туннель!** Он пробрасывает локальный PostgreSQL на сервер.

---

## 📋 Контрольный список

- [ ] Запущен `test-db-connection.js` на сервере
- [ ] Запущен `test-db-connection.js` локально
- [ ] Подтверждено, что они подключаются к разным БД
- [ ] Созданы отдельные базы данных (если нужно)
- [ ] Обновлены `.env` файлы (сервер и локально)
- [ ] Перезапущены приложения
- [ ] Проверено, что данные различаются

---

## 🆘 Если не помогло

Проверьте:

```bash
# На сервере
echo "=== СЕРВЕР ==="
env | grep DB_
netstat -tunlp | grep 5432
sudo lsof -i :5432

# Локально
echo "=== ЛОКАЛЬНО ==="
env | grep DB_
lsof -i :5432
```

Пришлите вывод этих команд!

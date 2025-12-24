const pool = require('./db');
const bcrypt = require('bcryptjs');

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Initializing database...');

    await client.query('BEGIN');

    // 1. Create Partners Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        level VARCHAR(50),
        city VARCHAR(100),
        is_pro BOOLEAN DEFAULT FALSE,
        image TEXT
      );
    `);
    console.log('✅ Table "partners" checked.');

    // 2. Create Courts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        surface JSONB,
        price_per_hour INTEGER,
        rating NUMERIC(3, 1),
        image TEXT,
        website TEXT
      );
    `);
    await client.query(`ALTER TABLE courts ADD COLUMN IF NOT EXISTS website TEXT;`);
    console.log('✅ Table "courts" checked.');

    // 3. Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'amateur',
        city VARCHAR(100),
        avatar TEXT,
        rating INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        age INTEGER,
        level VARCHAR(50),
        rtt_rank INTEGER DEFAULT 0,
        rtt_category VARCHAR(50),
        is_private BOOLEAN DEFAULT FALSE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_bonus DATE
      );
    `);
    
    // --- MIGRATIONS (Fix for existing tables) ---
    // Ensure new columns exist even if table was created previously
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rtt_rank INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rtt_category VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_bonus DATE;`);
    
    console.log('✅ Table "users" checked and updated.');

    // 4. Create Students Table (CRM)
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        coach_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        level VARCHAR(50),
        balance INTEGER DEFAULT 0,
        next_lesson VARCHAR(100),
        avatar TEXT,
        status VARCHAR(20) DEFAULT 'active',
        goals TEXT,
        notes TEXT,
        skill_level_xp INTEGER DEFAULT 0
      );
    `);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS skill_level_xp INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';`);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';`);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS racket_hours INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS last_restring_date DATE;`);
    
    // --- Data Migration for goals/notes columns ---
    // 1. Clean up existing invalid data
    await client.query(`UPDATE students SET goals = '[]' WHERE goals IS NULL OR goals = '' OR goals = '""';`);
    await client.query(`UPDATE students SET notes = '[]' WHERE notes IS NULL OR notes = '' OR notes = '""';`);
    
    // 2. Now, safely alter the column type
    try {
        await client.query(`ALTER TABLE students ALTER COLUMN goals SET DEFAULT '[]', ALTER goals TYPE JSONB USING goals::jsonb;`);
        await client.query(`ALTER TABLE students ALTER COLUMN notes SET DEFAULT '[]', ALTER notes TYPE JSONB USING notes::jsonb;`);
    } catch (e) {
        // Ignore error if columns are already JSONB
        if (e.code !== '42804') { // 42804 is 'Datatype Mismatch'
            throw e;
        }
    }

    console.log('✅ Table "students" checked and updated.');

    // Create student_skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_skills (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        skill_name VARCHAR(100) NOT NULL,
        skill_value INTEGER DEFAULT 0,
        UNIQUE(student_id, skill_name)
      );
    `);
    console.log('✅ Table "student_skills" checked.');

    // Create lesson_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_history (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        location TEXT
      );
    `);
    console.log('✅ Table "lesson_history" checked.');

    // Create scheduled_lessons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_lessons (
        id SERIAL PRIMARY KEY,
        coach_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        student_name VARCHAR(100),
        type VARCHAR(50),
        start_time VARCHAR(10),
        day_index INTEGER,
        duration INTEGER,
        status VARCHAR(20),
        court_name VARCHAR(100),
        use_cannon BOOLEAN,
        use_racket_rental BOOLEAN,
        court_cost INTEGER,
        lesson_price INTEGER
      );
    `);
    console.log('✅ Table "scheduled_lessons" checked.');

    // 5. Create Matches Table (Statistics)
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        opponent_name VARCHAR(100),
        score VARCHAR(50),
        date DATE DEFAULT CURRENT_DATE,
        result VARCHAR(10),
        surface VARCHAR(20),
        stats JSONB
      );
    `);
    console.log('✅ Table "matches" checked.');

    // 6. Create System Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20),
        message TEXT,
        module VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "system_logs" checked.');

    // 7. Create Products Table (Shop)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(50),
        price INTEGER NOT NULL,
        old_price INTEGER,
        image TEXT,
        rating NUMERIC(3, 1) DEFAULT 5.0,
        reviews INTEGER DEFAULT 0,
        is_new BOOLEAN DEFAULT FALSE,
        is_hit BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('✅ Table "products" checked.');

    // 8. Create Tactics Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tactics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        tactics_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "tactics" checked.');

    // 9. Create Conversations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      );
    `);
    console.log('✅ Table "conversations" checked.');

    // 10. Create Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "messages" checked.');

    // 11. Create Challenges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        challenger_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        defender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        deadline DATE,
        match_date DATE,
        winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        score VARCHAR(50),
        event_type VARCHAR(20) DEFAULT 'friendly',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
    await client.query(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS score VARCHAR(50);`);
    await client.query(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'friendly';`);
    console.log('✅ Table "challenges" checked.');
    
    // 12. Create Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        reference_id VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "notifications" checked.');

    // 13. Create Post-related Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ "posts" table created or already exists.');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, user_id)
      );
    `);
    console.log('✅ "post_likes" table created or already exists.');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ "post_comments" table created or already exists.');


    await client.query('COMMIT');

    // --- SEED DATA ---
    
    // Seed Default User (Coach) if none exist
    const coachEmail = 'coach@test.com';
    const coachCheck = await pool.query('SELECT id FROM users WHERE email = $1', [coachEmail]);
    
    if (coachCheck.rows.length === 0) {
        console.log('🌱 Seeding default Coach user...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        await pool.query(`
            INSERT INTO users (name, email, password, role, city, avatar, rating, age, level)
            VALUES ('Тренер Демо', $1, $2, 'coach', 'Москва', 'https://ui-avatars.com/api/?name=Coach+Demo&background=0D8ABC&color=fff', 1500, 30, 'Coach')
        `, [coachEmail, hashedPassword]);
    }

    // Seed Admin from Environment Variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
        const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        
        if (adminCheck.rows.length === 0) {
            console.log(`🌱 Creating Admin User (${adminEmail}) from .env...`);
            await pool.query(`
                INSERT INTO users (name, email, password, role, city, avatar, rating, age, level)
                VALUES ('Супер Админ', $1, $2, 'admin', 'HQ', 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff', 9999, 99, 'GOD MODE')
            `, [adminEmail, hashedAdminPassword]);
        } else {
            // Update admin password/role if env changed
            await pool.query(`
                UPDATE users SET password = $1, role = 'admin' WHERE email = $2
            `, [hashedAdminPassword, adminEmail]);
        }
    } else {
        console.warn('⚠️  ADMIN_EMAIL или ADMIN_PASSWORD не установлены в .env. Проверка пользователя Admin пропущена.');
    }

    // Seed Courts (Real Moscow Data - Extended List)
    // We only seed if the courts table is empty
    const courtCount = await pool.query('SELECT count(*) FROM courts');
    if (parseInt(courtCount.rows[0].count) === 0) {
        console.log('🌱 Заполнение расширенного списка московских кортов...');
        
        const courts = [
            {
                name: 'Мультиспорт (Лужники)',
                address: 'ул. Лужники, 24, стр. 10, Москва',
                surface: ['hard', 'clay'],
                price: 4500,
                rating: 5.0,
                image: 'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop',
                website: 'https://multisport.ru'
            },
            {
                name: 'Теннис Парк',
                address: 'Рязанский просп., 4, Москва',
                surface: ['clay'],
                price: 2800,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop',
                website: 'https://tennis-park.ru'
            },
            {
                name: 'Национальный Теннисный Центр',
                address: 'Ленинградское ш., 45-47, Москва',
                surface: ['hard'],
                price: 3500,
                rating: 4.9,
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
                website: 'https://lovetennis.ru'
            },
            {
                name: 'Спартак (Ширяевка)',
                address: 'Майский просек, 7, Москва',
                surface: ['clay', 'grass'],
                price: 2200,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop',
                website: 'https://tennis-spartak.ru'
            },
            {
                name: 'Теннисный клуб "Чайка"',
                address: 'Коробейников пер., 1/2, Москва',
                surface: ['carpet'],
                price: 3200,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop',
                website: 'https://www.chayka-sport.ru/tennis'
            },
            {
                name: 'Теннисный клуб ЦСКА',
                address: 'Ленинградский пр-т, 39, Москва',
                surface: ['hard', 'clay'],
                price: 3000,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop',
                website: 'http://cska-tennis.ru/'
            }
        ];

        for (const c of courts) {
            await pool.query(
                'INSERT INTO courts (name, address, surface, price_per_hour, rating, image, website) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [c.name, c.address, c.surface, c.price, c.rating, c.image, c.website]
            );
        }
    }

    // Seed Products
    const prodCount = await pool.query('SELECT count(*) FROM products');
    if (parseInt(prodCount.rows[0].count) === 0) {
       console.log('🌱 Заполнение товаров...');
       const products = [
          ['Wilson Blade 98 v8', 'rackets', 24990, 'https://images.unsplash.com/photo-1617083934555-52951271b273?q=80&w=800&auto=format&fit=crop', true],
          ['Babolat Pure Aero 2023', 'rackets', 26500, 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop', false],
          ['Nike Court Zoom Vapor', 'shoes', 14990, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', false]
       ];
       for (const p of products) {
           await pool.query(
               'INSERT INTO products (title, category, price, image, is_hit) VALUES ($1, $2, $3, $4, $5)',
               p
           );
       }
    }

    // Seed CRM data only if students table is empty for the demo coach
    const coachRes = await pool.query("SELECT id FROM users WHERE email = 'coach@test.com'");
    if (coachRes.rows.length > 0) {
        const coachId = coachRes.rows[0].id;
        const studentCountRes = await pool.query('SELECT COUNT(*) FROM students WHERE coach_id = $1', [coachId]);
        
        if (parseInt(studentCountRes.rows[0].count) === 0) {
            console.log('🌱 Seeding CRM data for demo coach...');
            
            // Student 1: Александр П.
            const student1Res = await pool.query(
                `INSERT INTO students (coach_id, name, age, level, balance, next_lesson, avatar, status, skill_level_xp) 
                 VALUES ($1, 'Александр П.', 28, 'NTRP 4.0', 5000, 'Завтра, 10:00', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', 'active', 1200) 
                 RETURNING id`,
                [coachId]
            );
            const student1Id = student1Res.rows[0].id;
            await pool.query(
                `INSERT INTO student_skills (student_id, skill_name, skill_value) VALUES 
                 ($1, 'serve', 75), ($1, 'forehand', 85), ($1, 'backhand', 60), ($1, 'stamina', 90), ($1, 'tactics', 70)`,
                [student1Id]
            );
            await pool.query(
                `INSERT INTO lesson_history (student_id, date, description, amount, location) VALUES
                 ($1, '2025-12-11 10:00', 'Индивидуальная тренировка', -2500, 'ТК СПАРТАК'),
                 ($1, '2025-12-12 10:00', 'Индивидуальная тренировка', -2500, 'ТК СПАРТАК'),
                 ($1, '2025-12-13 10:00', 'Индивидуальная тренировка', -2500, 'ТК СПАРТАК')`,
                [student1Id]
            );

            // Student 2: Мария Ш.
            const student2Res = await pool.query(
                `INSERT INTO students (coach_id, name, age, level, balance, next_lesson, avatar, status, skill_level_xp) 
                 VALUES ($1, 'Мария Ш.', 24, 'NTRP 5.0', -1500, 'Ср, 18:00', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', 'active', 3400) 
                 RETURNING id`,
                [coachId]
            );
            const student2Id = student2Res.rows[0].id;
            await pool.query(
                `INSERT INTO student_skills (student_id, skill_name, skill_value) VALUES 
                 ($1, 'serve', 80), ($1, 'forehand', 90), ($1, 'backhand', 85), ($1, 'stamina', 75), ($1, 'tactics', 88)`,
                [student2Id]
            );

             // Student 3: Даниил М.
            const student3Res = await pool.query(
                `INSERT INTO students (coach_id, name, age, level, balance, next_lesson, avatar, status, skill_level_xp) 
                 VALUES ($1, 'Даниил М.', 26, 'PRO', 12000, 'Пт, 15:00', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', 'active', 5600) 
                 RETURNING id`,
                [coachId]
            );
            const student3Id = student3Res.rows[0].id;
            await pool.query(
                `INSERT INTO student_skills (student_id, skill_name, skill_value) VALUES 
                 ($1, 'serve', 95), ($1, 'forehand', 92), ($1, 'backhand', 88), ($1, 'stamina', 94), ($1, 'tactics', 91)`,
                [student3Id]
            );
        }
    }


    console.log('🚀 Инициализация базы данных завершена.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка инициализации базы данных:', error);
  } finally {
    client.release();
  }
};

module.exports = initDb;
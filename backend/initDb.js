
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
        surface VARCHAR(50),
        price_per_hour INTEGER,
        rating NUMERIC(3, 1),
        image TEXT
      );
    `);
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
        age INTEGER,
        level VARCHAR(50),
        rtt_rank INTEGER DEFAULT 0,
        rtt_category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // --- MIGRATIONS (Fix for existing tables) ---
    // Ensure new columns exist even if table was created previously
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rtt_rank INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rtt_category VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    
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
        notes TEXT
      );
    `);
    console.log('✅ Table "students" checked.');

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
        console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Admin user check skipped.');
    }

    // Seed Courts (Real Moscow Data - Extended List)
    // We check if we have less than 6 courts, if so, we seed the full list to update old dbs
    const courtCount = await pool.query('SELECT count(*) FROM courts');
    if (parseInt(courtCount.rows[0].count) < 6) {
        console.log('🌱 Seeding extended list of Moscow courts...');
        
        // Clear old small list to avoid duplicates if re-seeding
        if (parseInt(courtCount.rows[0].count) > 0) {
             await pool.query('DELETE FROM courts');
        }

        const courts = [
            {
                name: 'Мультиспорт (Лужники)',
                address: 'ул. Лужники, 24, стр. 10, Москва',
                surface: 'hard',
                price: 4500,
                rating: 5.0,
                image: 'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннис Парк',
                address: 'Рязанский просп., 4, Москва',
                surface: 'clay',
                price: 2800,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Национальный Теннисный Центр',
                address: 'Ленинградское ш., 45-47, Москва',
                surface: 'hard',
                price: 3500,
                rating: 4.9,
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Спартак (Ширяевка)',
                address: 'Майский просек, 7, Москва',
                surface: 'clay',
                price: 2200,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннисный клуб "Чайка"',
                address: 'Коробейников пер., 1/2, Москва',
                surface: 'carpet',
                price: 3200,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннисный клуб ЦСКА',
                address: 'Ленинградский пр-т, 39, Москва',
                surface: 'hard',
                price: 3000,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннисный центр "Динамо"',
                address: 'Ленинградский пр-т, 36, Москва',
                surface: 'hard',
                price: 3500,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1588611910629-68897b69c693?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'ТК "Коломенский"',
                address: 'Коломенская наб., 20, Москва',
                surface: 'hard',
                price: 2200,
                rating: 4.5,
                image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннис.ру',
                address: 'Ленинский проспект, 101, Москва',
                surface: 'carpet',
                price: 2500,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Академия Островского',
                address: 'Химки, ул. Юннатов, 1А',
                surface: 'hard',
                price: 3800,
                rating: 5.0,
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Корты Парка Горького',
                address: 'Крымский Вал, 9, Москва',
                surface: 'hard',
                price: 1500,
                rating: 4.4,
                image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннис-Арт',
                address: 'ул. Мосфильмовская, 41, Москва',
                surface: 'clay',
                price: 2800,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Sport Station',
                address: 'Новоостаповская ул., 5, стр. 2, Москва',
                surface: 'hard',
                price: 3200,
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'ТК "Магия Спорта"',
                address: 'Крылатская ул., 2, Москва',
                surface: 'hard',
                price: 2900,
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1588611910629-68897b69c693?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'Теннисный центр "Жуковка"',
                address: 'Рублево-Успенское ш., Жуковка',
                surface: 'hard',
                price: 5000,
                rating: 4.9,
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'ТК "Пироговский"',
                address: 'Мытищи, ул. Совхозная, 2',
                surface: 'clay',
                price: 2400,
                rating: 4.5,
                image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop'
            },
            {
                name: 'PRO CLUB',
                address: 'ул. Лобачевского, 114, Москва',
                surface: 'clay',
                price: 3100,
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop'
            }
        ];

        for (const c of courts) {
            await pool.query(
                'INSERT INTO courts (name, address, surface, price_per_hour, rating, image) VALUES ($1, $2, $3, $4, $5, $6)',
                [c.name, c.address, c.surface, c.price, c.rating, c.image]
            );
        }
    }

    // Seed Products
    const prodCount = await pool.query('SELECT count(*) FROM products');
    if (parseInt(prodCount.rows[0].count) === 0) {
       console.log('🌱 Seeding products...');
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

    console.log('🚀 Database initialization complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
  } finally {
    client.release();
  }
};

module.exports = initDb;

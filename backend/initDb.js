
const pool = require('./db');

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
    console.log('✅ Table "partners" checked/created.');

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
    console.log('✅ Table "courts" checked/created.');

    // 3. Create Users Table (Updated with created_at)
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
    console.log('✅ Table "users" checked/created.');

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
    console.log('✅ Table "students" checked/created.');

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
    console.log('✅ Table "matches" checked/created.');

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
    console.log('✅ Table "system_logs" checked/created.');

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
    console.log('✅ Table "products" checked/created.');

    await client.query('COMMIT');

    // --- SEED DATA ---
    
    // Seed Default User (Coach) if none exist
    // Check if we need to seed the Coach
    const coachEmail = 'coach@test.com';
    const coachCheck = await pool.query('SELECT id FROM users WHERE email = $1', [coachEmail]);
    
    if (coachCheck.rows.length === 0) {
        console.log('🌱 Seeding default Coach user...');
        await pool.query(`
            INSERT INTO users (name, email, password, role, city, avatar, rating, age, level)
            VALUES ('Тренер Демо', $1, '123456', 'coach', 'Москва', 'https://ui-avatars.com/api/?name=Coach+Demo&background=0D8ABC&color=fff', 1500, 30, 'Coach')
        `, [coachEmail]);
    }

    // Seed Admin from Environment Variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
        const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        
        if (adminCheck.rows.length === 0) {
            console.log(`🌱 Creating Admin User (${adminEmail}) from .env...`);
            await pool.query(`
                INSERT INTO users (name, email, password, role, city, avatar, rating, age, level)
                VALUES ('Супер Админ', $1, $2, 'admin', 'HQ', 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff', 9999, 99, 'GOD MODE')
            `, [adminEmail, adminPassword]);
        } else {
            console.log(`🔄 Updating Admin User (${adminEmail}) password from .env...`);
            // Ensure the existing admin has the correct password and role from .env
            await pool.query(`
                UPDATE users SET password = $1, role = 'admin' WHERE email = $2
            `, [adminPassword, adminEmail]);
        }
    } else {
        console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Admin user check skipped.');
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


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

    // 3. Create Users Table
    // Updated with RTT specific fields
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
        rtt_category VARCHAR(50)
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

    await client.query('COMMIT');

    // --- SEED DATA ---
    
    // Seed Default User (Coach) if none exist
    const userCount = await pool.query('SELECT count(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
        console.log('🌱 Seeding default user...');
        await pool.query(`
            INSERT INTO users (name, email, password, role, city, avatar, rating, age, level)
            VALUES ('Тренер Демо', 'coach@test.com', '123456', 'coach', 'Москва', 'https://ui-avatars.com/api/?name=Coach+Demo&background=0D8ABC&color=fff', 1500, 30, 'Coach')
        `);
    }

    // Seed Partners
    const partnerCount = await pool.query('SELECT count(*) FROM partners');
    if (parseInt(partnerCount.rows[0].count) === 0) {
      console.log('🌱 Seeding partners...');
      const partners = [
        ['Алексей Иванов', 28, 'NTRP 4.5', 'Москва', true, 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'],
        ['Мария Петрова', 24, 'NTRP 4.0', 'Москва', false, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'],
        ['Дмитрий Сидоров', 32, 'РТТ Топ-100', 'Санкт-Петербург', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80']
      ];
      
      for (const p of partners) {
        await pool.query(
          'INSERT INTO partners (name, age, level, city, is_pro, image) VALUES ($1, $2, $3, $4, $5, $6)',
          p
        );
      }
    }

    // Seed Courts
    const courtCount = await pool.query('SELECT count(*) FROM courts');
    if (parseInt(courtCount.rows[0].count) === 0) {
      console.log('🌱 Seeding courts...');
      const courts = [
        ['Теннис Парк', 'ул. Ленина 12, Москва', 'hard', 2500, 4.8, 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=600&auto=format&fit=crop'],
        ['Академия Островского', 'Химки, Парковая 4', 'clay', 3000, 4.9, 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop']
      ];

      for (const c of courts) {
        await pool.query(
          'INSERT INTO courts (name, address, surface, price_per_hour, rating, image) VALUES ($1, $2, $3, $4, $5, $6)',
          c
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

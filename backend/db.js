
require('dotenv').config();
const { Pool } = require('pg');

// Проверка наличия критических переменных
if (!process.env.DB_PASSWORD) {
    console.warn("⚠️  WARNING: DB_PASSWORD is not set in .env file. Database connection may fail.");
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD, // Пароль берется ТОЛЬКО из .env
  port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;

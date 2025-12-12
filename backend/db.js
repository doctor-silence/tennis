
require('dotenv').config();
const { Pool } = require('pg');

// Используем переменные окружения или стандартные настройки
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres', // Changed from 'admin' to 'postgres'
  password: process.env.DB_PASSWORD || 'Vek19866891!', 
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

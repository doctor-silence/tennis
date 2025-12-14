
require('dotenv').config({ path: 'backend/.env' });
const pool = require('./db');

const createTacticsTable = async () => {
    const client = await pool.connect();
    try {
        console.log('Creating tactics table...');
        await client.query(`
            CREATE TABLE tactics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                tactics_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tactics table created successfully.');
    } catch (error) {
        console.error('Error creating tactics table:', error);
    } finally {
        client.release();
        pool.end();
    }
};

createTacticsTable();

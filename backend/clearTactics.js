
require('dotenv').config({ path: 'backend/.env' });
const pool = require('./db');

const clearTactics = async () => {
    const client = await pool.connect();
    try {
        console.log('Dropping tactics table...');
        await client.query('DROP TABLE IF EXISTS tactics;');
        console.log('Tactics table dropped.');
    } catch (error) {
        console.error('Error dropping tactics table:', error);
    } finally {
        client.release();
        pool.end();
    }
};

clearTactics();

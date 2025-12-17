
require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./db');

const setAllUsersPublic = async () => {
    const client = await pool.connect();
    try {
        console.log('Setting all users to be public (is_private = false)...');
        await client.query('UPDATE users SET is_private = false');
        console.log('✅ All users have been set to public.');
    } catch (e) {
        console.error('❌ Failed to set users to public:', e);
    } finally {
        await client.release();
        await pool.end();
    }
};

setAllUsersPublic();

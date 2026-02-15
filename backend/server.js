require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const OpenAI = require('openai');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const initDb = require('./initDb');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Constants
const SUPPORT_ADMIN_ID = 1;

// Initialize DeepSeek AI
if (!process.env.DEEPSEEK_API_KEY) {
  console.warn("⚠️  WARNING: DEEPSEEK_API_KEY is missing in .env file. AI Coach will not work.");
}
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

// Check for Admin Credentials
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn("⚠️  WARNING: ADMIN_EMAIL or ADMIN_PASSWORD is missing in .env. Admin user might not be created or updated.");
}

// --- HELPERS ---
const logSystemEvent = async (level, message, moduleName) => {
    try {
        await pool.query('INSERT INTO system_logs (level, message, module) VALUES ($1, $2, $3)', [level, message, moduleName]);
    } catch (e) {
        console.error("Failed to write log to DB", e);
    }
};

// --- API ROUTES ---

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', message: 'Backend + DB Connected', time: result.rows[0].now });
    } catch (err) {
        logSystemEvent('error', `Health check failed: ${err.message}`, 'System');
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: err.message });
    }
});


// --- AUTHROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, city, role, age, rating, level, rttRank, rttCategory } = req.body;
    
    try {
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`;
        
        const result = await pool.query(
            `INSERT INTO users (name, email, password, city, avatar, role, rating, age, level, rtt_rank, rtt_category, xp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0) 
             RETURNING id, name, email, role, city, avatar, rating, age, level, rtt_rank, rtt_category, xp`,
            [
                name, 
                email, 
                hashedPassword, 
                city, 
                defaultAvatar, 
                role || 'amateur', 
                rating || 0,
                age || null,
                level || '',
                rttRank || 0,
                rttCategory || null
            ]
        );

        const user = result.rows[0];
        await logSystemEvent('info', `New user registered: ${email}`, 'Auth');
        
        res.json( 
            { 
            ...user, 
            id: user.id.toString(),
            rttRank: user.rtt_rank,
            rttCategory: user.rtt_category 
        } );
    } catch (err) {
        // Detailed logging for debugging
        console.error("❌ Registration Error:", err);
        await logSystemEvent('error', `Registration failed: ${err.message}`, 'Auth');
        res.status(500).json({ error: 'Ошибка регистрации: ' + err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        const authError = 'Неверный логин или пароль';

        if (result.rows.length === 0) {
            return res.status(401).json({ error: authError });
        }

        const user = result.rows[0];
        
        if (!user.password) {
             return res.status(401).json({ error: 'Ошибка учетной записи. Обратитесь в поддержку.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            await logSystemEvent('warning', `Failed login attempt for ${email}`, 'Auth');
            return res.status(401).json({ error: authError });
        }

        await logSystemEvent('info', `User logged in: ${email}`, 'Auth');

        const { password: _, ...userInfo } = user;
        
        res.json({
            ...userInfo,
            id: userInfo.id.toString(),
            rttRank: userInfo.rtt_rank,
            rttCategory: userInfo.rtt_category
        });

    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ error: 'Ошибка при входе: ' + err.message });
    }
});

// --- SUPPORT CHAT API ROUTES (NEW) ---

// Admin: Get all support conversations
app.get('/api/support/conversations', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id,
                p.id AS "partnerId",
                p.name AS "partnerName",
                p.avatar AS "partnerAvatar",
                (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS "timestamp",
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != $1) AS "unread"
            FROM conversations c
            JOIN users p ON p.id = (CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
            WHERE (c.user1_id = $1 OR c.user2_id = $1)
            ORDER BY (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) DESC NULLS LAST
        `, [SUPPORT_ADMIN_ID]);
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString(), partnerId: r.partnerId.toString(), unread: parseInt(r.unread) })));
    } catch (error) {
        console.error('Error fetching admin support conversations:', error);
        res.status(500).json({ error: 'Failed to fetch support conversations' });
    }
});

// User or Admin: Get message history for a support conversation
app.get('/api/support/history/:userId/:partnerId', async (req, res) => {
    const { userId, partnerId } = req.params;
    try {
        const parsedUserId = parseInt(userId, 10);
        const parsedPartnerId = parseInt(partnerId, 10);

        if (isNaN(parsedUserId) || isNaN(parsedPartnerId)) {
            return res.status(400).json({ error: 'Invalid user or partner ID' });
        }

        const conversation = await pool.query(
            `SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [parsedUserId, parsedPartnerId]
        );

        if (conversation.rows.length === 0) {
            return res.json([]);
        }
        const conversationId = conversation.rows[0].id;

        // Mark messages as read now that the conversation is being viewed
        await pool.query(
            `UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2`,
            [conversationId, parsedUserId]
        );

        const messagesResult = await pool.query(
            `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
            [conversationId]
        );
        
        // Explicitly set role for frontend.
        const messagesWithRoles = messagesResult.rows.map(msg => ({
            ...msg,
            role: msg.sender_id.toString() === parsedUserId.toString() ? 'user' : 'partner'
        }));

        res.json(messagesWithRoles);
    } catch (error) {
        console.error('Error fetching support message history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// User or Admin: Send a support message
app.post('/api/support/messages', async (req, res) => {
    let { senderId, recipientId, text } = req.body;

    const parsedRecipientId = parseInt(recipientId, 10);
    let parsedSenderId = parseInt(senderId, 10);
    
    if (isNaN(parsedSenderId) || isNaN(parsedRecipientId) || !text) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // --- FIX: Alias any admin sender to the official SUPPORT_ADMIN_ID ---
        const senderInfo = await client.query('SELECT role FROM users WHERE id = $1', [parsedSenderId]);
        const senderRole = senderInfo.rows.length > 0 ? senderInfo.rows[0].role : 'amateur';
        
        if (senderRole === 'admin') {
            parsedSenderId = SUPPORT_ADMIN_ID;
        }
        // --- END FIX ---

        let convRes = await client.query(
            `SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [parsedSenderId, parsedRecipientId]
        );

        let conversationId;
        if (convRes.rows.length > 0) {
            conversationId = convRes.rows[0].id;
            await client.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
        } else {
            const newConvRes = await client.query('INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id', [parsedSenderId, parsedRecipientId]);
            conversationId = newConvRes.rows[0].id;
        }

        const msgRes = await client.query(
            'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3) RETURNING *',
            [conversationId, parsedSenderId, text]
        );
        const newMessage = msgRes.rows[0];

        await client.query('COMMIT');
        
        // The role is from the perspective of the original sender.
        // If an admin sent it, their role is 'user' for their own client.
        res.status(201).json({ ...newMessage, role: 'user' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error sending support message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    } finally {
        client.release();
    }
});


// --- ADMIN ROUTES ---

app.get('/api/admin/stats', async (req, res) => {
    try {
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const newSignups = await pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'");
        const revenue = 1450000;
        
        res.json({
            revenue: revenue,
            activeUsers: parseInt(usersCount.rows[0].count),
            newSignups: parseInt(newSignups.rows[0].count),
            serverLoad: Math.floor(Math.random() * 20) + 10
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 50');
        res.json(result.rows.map(r => ({
            id: r.id.toString(),
            level: r.level,
            message: r.message,
            module: r.module,
            timestamp: new Date(r.timestamp).toLocaleTimeString()
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, city, avatar, rating, level, age, rtt_rank, rtt_category, xp FROM users ORDER BY id DESC');
        res.json(result.rows.map(u => ({
            ...u, 
            id: u.id.toString(),
            rttRank: u.rtt_rank,
            rttCategory: u.rtt_category
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users', async (req, res) => {
    const { name, email, password, role, city, age, rating, level, rttRank, rttCategory } = req.body;
    try {
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const plainPassword = password || '123456';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`;
        
        const result = await pool.query(
            `INSERT INTO users (name, email, password, city, avatar, role, rating, age, level, rtt_rank, rtt_category, xp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0) 
             RETURNING id, name, email, role, city, avatar, rating, age, level, rtt_rank, rtt_category, xp`,
            [
                name, 
                email, 
                hashedPassword, 
                city || 'Москва', 
                defaultAvatar, 
                role || 'amateur', 
                rating || 0, 
                age || null, 
                level || '', 
                rttRank || 0, 
                rttCategory || null
            ]
        );
        const user = result.rows[0];
        await logSystemEvent('info', `Admin created user: ${email}`, 'Admin');
        res.json({ ...user, id: user.id.toString(), rttRank: user.rtt_rank, rttCategory: user.rtt_category });
    } catch (err) {
        console.error("Admin Create User Error:", err);
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, city, rating, level, rttRank, rttCategory, age, xp, avatar, is_private, notifications_enabled } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (name !== undefined) await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
        if (role !== undefined) await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        if (city !== undefined) await client.query('UPDATE users SET city = $1 WHERE id = $2', [city, id]);
        if (rating !== undefined) await client.query('UPDATE users SET rating = $1 WHERE id = $2', [rating, id]);
        if (level !== undefined) await client.query('UPDATE users SET level = $1 WHERE id = $2', [level, id]);
        if (rttRank !== undefined) await client.query('UPDATE users SET rtt_rank = $1 WHERE id = $2', [rttRank, id]);
        if (rttCategory !== undefined) await client.query('UPDATE users SET rtt_category = $1 WHERE id = $2', [rttCategory, id]);
        if (age !== undefined) await client.query('UPDATE users SET age = $1 WHERE id = $2', [age, id]);
        if (xp !== undefined) await client.query('UPDATE users SET xp = $1 WHERE id = $2', [xp, id]);
        if (avatar !== undefined) await client.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, id]);
        if (is_private !== undefined) await client.query('UPDATE users SET is_private = $1 WHERE id = $2', [is_private, id]);
        if (notifications_enabled !== undefined) await client.query('UPDATE users SET notifications_enabled = $1 WHERE id = $2', [notifications_enabled, id]);

        await client.query('COMMIT');
        await logSystemEvent('warning', `Admin updated user ${id}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update user error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});


app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await logSystemEvent('warning', `Admin deleted user ${id}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/groups', async (req, res) => {
    const {userId} = req.query;

    try {
        let user;
        if (userId) {
            const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                user = userRes.rows[0];
            }
        }

        let query = `
            SELECT 
                g.*, 
                u.name as creator_name, 
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as members_count
            FROM groups g
            LEFT JOIN users u ON g.creator_id = u.id
        `;
        const queryParams = [];

        if (user && user.role === 'coach') {
            query += ' WHERE g.creator_id = $1';
            queryParams.push(user.id);
        }

        query += ' ORDER BY g.id DESC';

        const result = await pool.query(query, queryParams);

        res.json(result.rows.map(row => ({
            ...row,
            id: row.id.toString(),
            creator_id: row.creator_id ? row.creator_id.toString() : null,
            members_count: parseInt(row.members_count, 10)
        })));
    } catch (err) {
        console.error("Admin Get Groups Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/groups', async (req, res) => {
    const { name, description, location, contact, creatorId } = req.body;
    if (!name || !creatorId) {
        return res.status(400).json({ error: 'Name and creatorId are required' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const groupResult = await client.query(
            'INSERT INTO groups (name, description, location, contact, creator_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, location, contact, creatorId]
        );
        const newGroup = groupResult.rows[0];
        await client.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [newGroup.id, creatorId, 'admin']
        );
        await client.query('COMMIT');
        await logSystemEvent('info', `Admin ${creatorId} created group: ${name}`, 'Admin');
        res.status(201).json({ ...newGroup, id: newGroup.id.toString() });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Admin Create Group Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/admin/groups/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, location, contact } = req.body;
    try {
        const result = await pool.query(
            'UPDATE groups SET name = $1, description = $2, location = $3, contact = $4 WHERE id = $5 RETURNING *',
            [name, description, location, contact, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        await logSystemEvent('info', `Admin updated group ${id}`, 'Admin');
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Admin Update Group Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/groups/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM group_members WHERE group_id = $1', [id]);
        await client.query('DELETE FROM posts WHERE group_id = $1', [id]);
        await client.query('DELETE FROM groups WHERE id = $1', [id]);
        await client.query('COMMIT');
        await logSystemEvent('warning', `Admin deleted group ${id}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Admin Delete Group Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/admin/tournaments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tournaments ORDER BY start_date DESC NULLS LAST, id DESC');
        res.json(result.rows.map(t => ({ ...t, id: t.id.toString() })));
    } catch (err) {
        console.error("Admin Get Tournaments Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/tournaments', async (req, res) => {
    const { 
        name, groupName, prizePool, status, type, target_group_id, rounds, userId,
        category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate 
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tournaments (
                user_id, name, group_name, prize_pool, status, type, target_group_id, rounds,
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [
                userId, name, groupName, prizePool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate
            ]
        );
        await logSystemEvent('info', `Admin created tournament: ${name}`, 'Admin');
        const newTournament = result.rows[0];
        res.status(201).json({ ...newTournament, id: newTournament.id.toString() });
    } catch (err) {
        console.error("Admin Create Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        name, groupName, prizePool, status, type, target_group_id, rounds,
        category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate
    } = req.body;
    try {
        const result = await pool.query(
            `UPDATE tournaments 
             SET name = $1, group_name = $2, prize_pool = $3, status = $4, type = $5, target_group_id = $6, rounds = $7,
                 category = $8, tournament_type = $9, gender = $10, age_group = $11, system = $12, match_format = $13, start_date = $14, end_date = $15
             WHERE id = $16 RETURNING *`,
            [
                name, groupName, prizePool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate,
                id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        await logSystemEvent('info', `Admin updated tournament ${id}`, 'Admin');
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Admin Update Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
        await logSystemEvent('warning', `Admin deleted tournament ${id}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        console.error("Admin Delete Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- COURTSROUTES (Public & Admin) ---

app.get('/api/courts', async (req, res) => {
    const { name, city } = req.query;
    try {
        let query = 'SELECT * FROM courts';
        const queryParams = [];
        let paramIndex = 1;

        if (name || city) {
            query += ' WHERE';
            if (name) {
                queryParams.push(`%${name}%`);
                query += ` name ILIKE $${paramIndex++}`;
            }
            if (city) {
                if (name) query += ' AND';
                queryParams.push(`%${city}%`);
                query += ` address ILIKE $${paramIndex++}`;
            }
        }
        query += ' ORDER BY id ASC';

        const result = await pool.query(query, queryParams);
        const courts = result.rows.map(row => ({
            id: row.id.toString(),
            name: row.name,
            address: row.address,
            surface: row.surface,
            pricePerHour: row.price_per_hour,
            image: row.image,
            rating: parseFloat(row.rating),
            website: row.website
        }));
        res.json(courts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/courts', async (req, res) => {
    const { name, address, surface, pricePerHour, image, rating, website } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO courts (name, address, surface, price_per_hour, image, rating, website) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, address, surface, pricePerHour, image, rating, website]
        );
        await logSystemEvent('info', `New court added: ${name}`, 'Admin');
        const row = result.rows[0];
        res.json({
            id: row.id.toString(),
            name: row.name,
            address: row.address,
            surface: row.surface,
            pricePerHour: row.price_per_hour,
            image: row.image,
            rating: parseFloat(row.rating),
            website: row.website
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/courts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, surface, pricePerHour, image, rating, website } = req.body;
    try {
        await pool.query(
            'UPDATE courts SET name=$1, address=$2, surface=$3, price_per_hour=$4, image=$5, rating=$6, website=$7 WHERE id=$8',
            [name, address, surface, pricePerHour, image, rating, website, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/courts/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM courts WHERE id = $1', [req.params.id]);
        await logSystemEvent('warning', `Court deleted: ${req.params.id}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCT ROUTES (Shop & Admin) ---

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        const products = result.rows.map(row => ({
            id: row.id.toString(),
            title: row.title,
            category: row.category,
            price: row.price,
            oldPrice: row.old_price,
            image: row.image,
            rating: parseFloat(row.rating),
            reviews: row.reviews,
            isNew: row.is_new,
            isHit: row.is_hit
        }));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { title, category, price, image } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (title, category, price, image) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, category, price, image]
        );
        await logSystemEvent('info', `New product added: ${title}`, 'Shop');
        const row = result.rows[0];
        res.json({...row, id: row.id.toString()});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { title, category, price, image } = req.body;
    try {
        await pool.query(
            'UPDATE products SET title=$1, category=$2, price=$3, image=$4 WHERE id=$5',
            [title, category, price, image, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        await logSystemEvent('warning', `Product deleted: ${req.params.id}`, 'Shop');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New route to get unique cities
app.get('/api/cities', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT city FROM users WHERE city IS NOT NULL AND city != \'\' ORDER BY city');
        res.json(result.rows.map(row => row.city));
    } catch (err) {
        console.error("Fetch Cities Error:", err);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

app.get('/api/partners', async (req, res) => {
    const { city, level, search } = req.query;

    try {
        let query = "SELECT id, name, age, level, city, avatar as image, (role = 'rtt_pro' or role = 'coach') as isPro, rtt_rank, rating, role FROM users WHERE role != 'admin' AND (is_private IS NULL OR is_private = FALSE)";
        const queryParams = [];

        if (city) {
            queryParams.push(city);
            query += ` AND city = $${queryParams.length}`;
        }

        if (level && level !== 'all') {
            queryParams.push(level);
            query += ` AND level = $${queryParams.length}`;
        }

        if (search) {
            queryParams.push(`%${search}%`);
            query += ` AND name ILIKE $${queryParams.length}`;
        }
        
        query += ' ORDER BY xp DESC, name ASC';

        const result = await pool.query(query, queryParams);
        
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString() })));

    } catch (err) {
        console.error("Fetch Partners Error:", err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// --- LADDER ROUTES ---

app.get('/api/ladder/rankings', async (req, res) => {
    const { type } = req.query; // 'club_elo' or 'rtt_rating'

    try {
        let orderByClause = '';
        let whereClause = 'WHERE u.role != \'admin\'' ;
        const queryParams = [];

        if (type === 'rtt_rating') {
            orderByClause = 'ORDER BY u.rtt_rank ASC, u.rtt_category ASC, u.rating DESC'; // For professional (RTT) players
            whereClause += ' AND u.rtt_rank IS NOT NULL AND u.rtt_rank > 0'; // Only show players with an RTT rank
        } else { // Default to 'club_elo'
            orderByClause = 'ORDER BY u.xp DESC, u.rating DESC, u.name ASC'; // For amateur (Club ELO) players
        }

        // Get all users ordered by rank
        const usersResult = await pool.query(`
            SELECT 
                u.id, u.name, u.avatar, u.xp as points, u.role, u.level, u.rating, u.rtt_rank, u.rtt_category,
                COUNT(m.id) AS total_matches,
                COUNT(m.id) FILTER (WHERE m.result = 'win') AS wins
            FROM users u
            LEFT JOIN matches m ON u.id = m.user_id
            ${whereClause}
            GROUP BY u.id
            ${orderByClause}
        `, queryParams);

        // Get all active defenders' IDs
        const activeChallengesResult = await pool.query(
            "SELECT defender_id FROM challenges WHERE status = 'pending' OR status = 'scheduled'"
        );
        const defendingPlayerIds = new Set(activeChallengesResult.rows.map(r => r.defender_id));

        // Map to LadderPlayer structure
        const ladderPlayers = usersResult.rows.map((row, index) => {
            const totalMatches = parseInt(row.total_matches, 10) || 0;
            const wins = parseInt(row.wins, 10) || 0;
            const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

            return {
                id: row.id.toString(),
                rank: index + 1,
                userId: row.id.toString(),
                name: row.name,
                avatar: row.avatar,
                points: row.points,
                matches: totalMatches,
                winRate: winRate,
                status: defendingPlayerIds.has(row.id) ? 'defending' : 'idle'
            };
        });
        
        res.json(ladderPlayers);
    } catch (err) {
        console.error("Fetch Ladder Rankings Error:", err);
        res.status(500).json({ error: 'Failed to fetch ladder rankings' });
    }
});

app.get('/api/ladder/challenges', async (req, res) => {
    const { userId } = req.query;

    try {
        let query = `
            SELECT 
                c.id, 
                c.challenger_id, 
                c.defender_id, 
                c.status, 
                c.deadline, 
                c.match_date,
                c.event_type,
                uc.name as challenger_name,
                uc.avatar as challenger_avatar,
                ud.name as defender_name,
                ud.avatar as defender_avatar,
                (uc.xp - ud.xp) as rank_gap_xp
            FROM challenges c
            JOIN users uc ON c.challenger_id = uc.id
            JOIN users ud ON c.defender_id = ud.id
        `;
        const params = [];

        if (userId) {
            query += ' WHERE c.challenger_id = $1 OR c.defender_id = $1';
            params.push(userId);
        }

        query += ' ORDER BY c.deadline ASC';

        const result = await pool.query(query, params);

        const challenges = result.rows.map(row => ({
            id: row.id.toString(),
            challengerId: row.challenger_id.toString(),
            defenderId: row.defender_id.toString(),
            challengerName: row.challenger_name,
            defenderName: row.defender_name,
            rankGap: row.rank_gap_xp, // Using XP difference as rank gap
            status: row.status,
            deadline: row.deadline,
            matchDate: row.match_date,
            eventType: row.event_type
        }));
        res.json(challenges);
    } catch (err) {
        console.error("Fetch Ladder Challenges Error:", err);
        res.status(500).json({ error: 'Failed to fetch ladder challenges' });
    }
});

app.post('/api/ladder/challenges', async (req, res) => {
    const { challengerId, defenderId, eventType } = req.body;
    if (!challengerId || !defenderId) {
        return res.status(400).json({ error: 'Challenger and defender IDs are required' });
    }

    const parsedChallengerId = parseInt(challengerId, 10);
    const parsedDefenderId = parseInt(defenderId, 10);

    if (isNaN(parsedChallengerId) || isNaN(parsedDefenderId)) {
        console.error(`Invalid challenge IDs: challengerId=${challengerId}, defenderId=${defenderId}`);
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7); // 7 days from now

        const result = await pool.query(
            `INSERT INTO challenges (challenger_id, defender_id, status, deadline, event_type)
             VALUES ($1, $2, 'pending', $3, $4)
             RETURNING *`,
            [parsedChallengerId, parsedDefenderId, deadline.toISOString().split('T')[0], eventType || 'friendly']
        );
        const newChallenge = result.rows[0];

        // Fetch challenger and defender names for the response
        const challenger = await pool.query('SELECT name FROM users WHERE id = $1', [newChallenge.challenger_id]);
        const defender = await pool.query('SELECT name FROM users WHERE id = $1', [newChallenge.defender_id]);

        // Create notification for the defender
        await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id) VALUES ($1, $2, $3, $4)`,
            [parsedDefenderId, 'new_challenge', `${challenger.rows[0].name} бросил(а) вам вызов!`, newChallenge.id]
        );

        res.status(201).json({
            id: newChallenge.id.toString(),
            challengerId: newChallenge.challenger_id.toString(),
            defenderId: newChallenge.defender_id.toString(),
            challengerName: challenger.rows[0].name,
            defenderName: defender.rows[0].name,
            rankGap: 0, // Will be calculated on frontend based on rankings
            status: newChallenge.status,
            deadline: newChallenge.deadline,
            matchDate: newChallenge.match_date,
            eventType: newChallenge.event_type
        });
    } catch (err) {
        console.error("Create Ladder Challenge Error:", err);
        res.status(500).json({ error: 'Failed to create ladder challenge' });
    }
});

app.put('/api/ladder/challenges/:challengeId/accept', async (req, res) => {
    const { challengeId } = req.params;
    // The user ID is sent in the body to confirm who is accepting.
    const { userId } = req.body;
    const parsedChallengeId = parseInt(challengeId, 10);

    if (isNaN(parsedChallengeId) || !userId) {
        return res.status(400).json({ error: 'Invalid challenge ID or missing user ID' });
    }

    try {
        const challengeRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [parsedChallengeId]);
        if (challengeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        const challenge = challengeRes.rows[0];

        // Ensure the person accepting is the defender.
        if (challenge.defender_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Only the defender can accept the challenge' });
        }

        // Update status to 'scheduled'
        const result = await pool.query(
            "UPDATE challenges SET status = 'scheduled' WHERE id = $1 RETURNING *",
            [parsedChallengeId]
        );
        const updatedChallenge = result.rows[0];

        // Create a notification for the challenger.
        const defender = await pool.query('SELECT name FROM users WHERE id = $1', [challenge.defender_id]);
        await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id) VALUES ($1, $2, $3, $4)`,
            [challenge.challenger_id, 'challenge_accepted', `${defender.rows[0].name} принял(а) ваш вызов!`, updatedChallenge.id]
        );

        await logSystemEvent('info', `Challenge ${challengeId} was accepted by user ${userId}.`, 'Ladder');

        res.status(200).json(updatedChallenge);
    } catch (err) {
        console.error("Accept Ladder Challenge Error:", err);
        res.status(500).json({ error: 'Failed to accept ladder challenge' });
    }
});

app.post('/api/ladder/challenges/:challengeId/result', async (req, res) => {
    const { challengeId } = req.params;
    const { score, winnerId } = req.body;
    const parsedChallengeId = parseInt(challengeId, 10);

    if (isNaN(parsedChallengeId) || !score || !winnerId) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const challengeRes = await client.query('SELECT * FROM challenges WHERE id = $1', [parsedChallengeId]);
        if (challengeRes.rows.length === 0) {
            throw new Error('Challenge not found');
        }
        const challenge = challengeRes.rows[0];

        const challengerId = challenge.challenger_id;
        const defenderId = challenge.defender_id;
        const parsedWinnerId = parseInt(winnerId, 10);
        const loserId = parsedWinnerId === challengerId ? defenderId : challengerId;

        // Get full user objects to check roles and current XP
        const winnerRes = await client.query('SELECT * FROM users WHERE id = $1', [parsedWinnerId]);
        const loserRes = await client.query('SELECT * FROM users WHERE id = $1', [loserId]);
        const winner = winnerRes.rows[0];
        const loser = loserRes.rows[0];
        
        // Check if both players are amateurs to apply the new ELO logic
        if (winner.role === 'amateur' && loser.role === 'amateur') {
            const { winnerXpGained, loserXpLost } = calculateEloPoints(winner, loser, score, challenge.event_type); // Assuming calculateEloPoints is defined elsewhere
            
            // Update XP for both players
            await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [winnerXpGained, winner.id]);
            await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [loserXpLost, loser.id]);

            // Streak Bonus Check
            const lastTwoMatches = await client.query(
                `SELECT result FROM matches WHERE user_id = $1 ORDER BY date DESC LIMIT 2`,
                [winner.id]
            );

            if (lastTwoMatches.rows.length === 2 && lastTwoMatches.rows.every(m => m.result === 'win')) {
                await client.query('UPDATE users SET xp = xp + 25 WHERE id = $1', [winner.id]);
                await logSystemEvent('info', `3-win streak bonus (+25) for ${winner.name}.`, 'Ladder');
            }

            await logSystemEvent('info', `ELO calculated for ${winner.name} (+${winnerXpGained}) and ${loser.name} (${loserXpLost}).`, 'Ladder');

        } else {
            // Fallback to the old, simple XP logic for pro players or mixed matches
            if (parsedWinnerId === challengerId) { // Challenger won
                if (loser.xp <= winner.xp) {
                    await client.query('UPDATE users SET xp = xp + 1 WHERE id = $1', [loserId]);
                } else {
                    // Challenger takes defender's XP, defender takes challenger's.
                    await client.query('UPDATE users SET xp = $1 WHERE id = $2', [loser.xp, challengerId]);
                    await client.query('UPDATE users SET xp = $1 WHERE id = $2', [winner.xp, defenderId]);
                }
            } else if (parsedWinnerId === defenderId) { // Defender won
                // Defender gets a bonus for a successful defense.
                await client.query('UPDATE users SET xp = xp + 5 WHERE id = $1', [defenderId]);
            }
             await logSystemEvent('info', `Simple XP update for pro match. Winner: ${winner.id}`, 'Ladder');
        }

        // Update challenge status
        await client.query("UPDATE challenges SET status = 'completed', winner_id = $1, score = $2 WHERE id = $3", [parsedWinnerId, score, parsedChallengeId]);

        // Mark related notifications as read
        await client.query(
            `UPDATE notifications SET is_read = TRUE WHERE type = 'new_challenge' AND reference_id = $1`,
            [parsedChallengeId]
        );
        await client.query(
            `UPDATE notifications SET is_read = TRUE WHERE type = 'challenge_accepted' AND reference_id = $1`,
            [parsedChallengeId]
        );

        // Add match record for both players
        const winnerData = await client.query('SELECT name FROM users WHERE id = $1', [parsedWinnerId]);
        const loserData = await client.query('SELECT name FROM users WHERE id = $1', [loserId]);

        await client.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface)
             VALUES ($1, $2, $3, 'win', 'hard')`, // Assuming hard court for now
            [parsedWinnerId, loserData.rows[0].name, score]
        );
         await client.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface)
             VALUES ($1, $2, $3, 'loss', 'hard')`,
            [loserId, winnerData.rows[0].name, score]
        );

        // Activity Bonus Check for both players
        for (const player of [winner, loser]) {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Check if bonus was already awarded this month
            if (player.last_activity_bonus) {
                const bonusDate = new Date(player.last_activity_bonus);
                if (bonusDate.getMonth() + 1 === currentMonth && bonusDate.getFullYear() === currentYear) {
                    continue; // Already awarded this month, skip
                }
            }
            
            // Count matches in the current month
            const matchesThisMonth = await client.query(
                `SELECT COUNT(*) FROM matches WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
                [player.id, currentMonth, currentYear]
            );

            if (parseInt(matchesThisMonth.rows[0].count) >= 5) {
                await client.query(
                    'UPDATE users SET xp = xp + 50, last_activity_bonus = CURRENT_DATE WHERE id = $1',
                    [player.id]
                );
                await logSystemEvent('info', `Monthly activity bonus (+50) for ${player.name}.`, 'Ladder');
            }
        }

        await logSystemEvent('info', `Score entered for challenge ${challengeId}. Winner: ${winnerId}`, 'Ladder');
        
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Enter Score Error:", err);
        res.status(500).json({ error: 'Failed to enter score' });
    }
});

app.delete('/api/ladder/challenges/:challengeId', async (req, res) => {
    const { challengeId } = req.params;
    const parsedChallengeId = parseInt(challengeId, 10);

    if (isNaN(parsedChallengeId)) {
        return res.status(400).json({ error: 'Invalid challenge ID' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM challenges WHERE id = $1 RETURNING *',
            [parsedChallengeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // We should also delete the notification sent to the defender
        await pool.query(
            "DELETE FROM notifications WHERE type = 'new_challenge' AND reference_id = $1",
            [parsedChallengeId]
        );
        
        await logSystemEvent('info', `Challenge ${challengeId} was cancelled.`, 'Ladder');

        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Cancel Ladder Challenge Error:", err);
        res.status(500).json({ error: 'Failed to cancel ladder challenge' });
    }
});

app.get('/api/notifications/unread-count/:userId', async (req, res) => {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [parsedUserId]
        );
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error("Fetch Unread Count Error:", err);
        res.status(500).json({ error: 'Failed to fetch unread notification count' });
    }
});

app.get('/api/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [parsedUserId]
        );
        res.json(result.rows.map(n => ({...n, id: n.id.toString()})));
    } catch (err) {
        console.error("Fetch Notifications Error:", err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.post('/api/notifications/mark-read/:notificationId', async (req, res) => {
    const { notificationId } = req.params;
    const parsedNotificationId = parseInt(notificationId, 10);
    if (isNaN(parsedNotificationId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
    }
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1',
            [parsedNotificationId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Mark Notification Read Error:", err);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

app.get('/api/ladder/player/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const userResult = await pool.query(
            `SELECT 
                id, name, avatar, xp as points, role, level, rating, rtt_rank, rtt_category, created_at as join_date
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const userRow = userResult.rows[0];

        // Fetch user's matches to calculate win/loss stats
        const matchesResult = await pool.query(
            `SELECT result, opponent_name, score, date, id FROM matches WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
        );

        let wins = 0;
        let losses = 0;
        matchesResult.rows.forEach(match => {
            if (match.result === 'win') wins++;
            else losses++;
        });

        let currentStreak = 0;
        if (matchesResult.rows.length > 0) {
            const lastResult = matchesResult.rows[0].result;
            let streak = 0;
            for (const match of matchesResult.rows) {
                if (match.result === lastResult) {
                    streak++;
                } else {
                    break;
                }
            }
            currentStreak = lastResult === 'win' ? streak : -streak;
        }

        const recentMatches = matchesResult.rows.slice(0, 5).map(m => ({
            id: m.id.toString(),
            userId: userId,
            opponentName: m.opponent_name,
            score: m.score,
            date: m.date,
            result: m.result,
            surface: 'hard' // placeholder
        }));

        const playerProfile = {
            id: userRow.id.toString(),
            userId: userRow.id.toString(),
            name: userRow.name,
            avatar: userRow.avatar,
            points: userRow.points,
            rank: 0, // This will be dynamically set by the frontend based on overall ladder ranking
            matches: wins + losses,
            winRate: (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
            status: 'idle', // This will be dynamically set by the frontend
            joinDate: userRow.join_date,
            bio: 'Нет дополнительной информации об этом игроке.', // Placeholder
            stats: { wins, losses, bestRank: userRow.rtt_rank || 0, currentStreak: currentStreak },
            rankHistory: [], // Placeholder
            recentMatches: recentMatches
        };

        res.json(playerProfile);
    } catch (err) {
        console.error("Fetch Player Profile Error:", err);
        res.status(500).json({ error: 'Failed to fetch player profile' });
    }
});

// --- POSTS (Community Feed) ROUTES ---

app.get('/api/posts', async (req, res) => {
    const { userId } = req.query; // Get userId from query params

    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.type,
                p.content,
                p.created_at,
                json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as author,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_user,
                (SELECT json_agg(json_build_object(
                    'id', c.id, 
                    'text', c.text, 
                    'created_at', c.created_at,
                    'author', json_build_object('id', cu.id, 'name', cu.name, 'avatar', cu.avatar)
                ) ORDER BY c.created_at ASC) FROM post_comments c JOIN users cu ON c.user_id = cu.id WHERE c.post_id = p.id) as comments
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE (p.type = 'match' AND p.group_id IS NOT NULL AND p.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)) OR (p.type != 'match' AND (p.group_id IS NULL OR p.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)))
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId || null]);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Posts Error:", err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { userId, type, content, groupId } = req.body;
    if (!userId || !type || !content) {
        return res.status(400).json({ error: 'userId, type, and content are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO posts (user_id, type, content, group_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, type, content, groupId]
        );
        res.status(201).json({ success: true, postId: result.rows[0].id });
    } catch (err) {
        console.error("Create Post Error:", err);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

app.post('/api/posts/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const likeCheck = await pool.query(
            'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (likeCheck.rows.length > 0) {
            // Unlike
            await pool.query(
                'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
                [id, userId]
            );
            res.json({ success: true, action: 'unliked' });
        } else {
            // Like
            await pool.query(
                'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );
            res.json({ success: true, action: 'liked' });
        }
    } catch (err) {
        console.error('Like Post Error:', err);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

app.post('/api/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { userId, text } = req.body;

    if (!userId || !text) {
        return res.status(400).json({ error: 'userId and text are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, text) VALUES ($1, $2, $3) RETURNING *',
            [id, userId, text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Add Comment Error:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; 

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
        if (postRes.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const authorId = postRes.rows[0].user_id;

        if (authorId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this post' });
        }

        // Before deleting post, delete related likes and comments
        await pool.query('DELETE FROM post_likes WHERE post_id = $1', [id]);
        await pool.query('DELETE FROM post_comments WHERE post_id = $1', [id]);
        await pool.query('DELETE FROM posts WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Post Error:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; 

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
        if (postRes.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const authorId = postRes.rows[0].user_id;

        if (authorId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this post' });
        }

        // Before deleting post, delete related likes and comments
        await pool.query('DELETE FROM post_likes WHERE post_id = $1', [id]);
        await pool.query('DELETE FROM post_comments WHERE post_id = $1', [id]);
        await pool.query('DELETE FROM posts WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Post Error:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

app.post('/api/groups', async (req, res) => {
    const { name, description, location, avatar, userId, contact } = req.body;
    console.log('Received request to create group:', { name, description, location, avatar, userId, contact });

    if (!name || !userId) {
        console.error('Validation failed: Name or userId missing.');
        return res.status(400).json({ error: 'Name and userId are required to create a group.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) {
            console.error('Validation failed: Invalid userId provided:', userId);
            return res.status(400).json({ error: 'Invalid userId provided.' });
        }

        const groupResult = await client.query(
            'INSERT INTO groups (name, description, location, avatar, contact, creator_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, location, avatar, contact, parsedUserId]
        );
        const newGroup = groupResult.rows[0];

        await client.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [newGroup.id, parsedUserId, 'admin']
        );

        await client.query('COMMIT');
        
        await logSystemEvent('info', `User ${parsedUserId} created new group: ${name}`, 'Groups');
        res.status(201).json(newGroup);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Group Error:", err);
        res.status(500).json({ error: 'Failed to create group.' });
    } finally {
        client.release();
    }
});

app.get('/api/groups', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                g.id, g.name, g.description, g.avatar, g.location, g.contact, g.created_at, g.creator_id::TEXT as creator_id,
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as members_count
            FROM groups g 
            ORDER BY g.name ASC
        `);
        res.json(result.rows.map(g => ({
            ...g, 
            id: g.id.toString(), 
            creatorId: g.creator_id, 
            members_count: parseInt(g.members_count)
        })));
    } catch (err) {
        console.error("Fetch Groups Error:", err);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

app.get('/api/users/:userId/groups', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT g.*, gm.role FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.user_id = $1
             ORDER BY g.name ASC`,
            [userId]
        );
        res.json(result.rows.map(g => ({ ...g, id: g.id.toString() })));
    } catch (err) {
        console.error("Fetch User Groups Error:", err);
        res.status(500).json({ error: 'Failed to fetch user groups' });
    }
});

app.post('/api/groups/:groupId/join', async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    const parsedUserId = parseInt(userId, 10);
    const parsedGroupId = parseInt(groupId, 10);

    if (isNaN(parsedUserId) || isNaN(parsedGroupId)) {
        return res.status(400).json({ error: 'Invalid user ID or group ID' });
    }

    try {
        // Check if user is already a member
        const memberCheck = await pool.query(
            'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
            [parsedGroupId, parsedUserId]
        );

        if (memberCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User is already a member of this group.' });
        }

        // Add user to the group with 'member' role
        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [parsedGroupId, parsedUserId, 'member']
        );

        await logSystemEvent('info', `User ${parsedUserId} joined group ${parsedGroupId}`, 'Groups');
        res.status(200).json({ success: true, message: 'Successfully joined group.' });
    } catch (err) {
        console.error("Join Group Error:", err);
        res.status(500).json({ error: 'Failed to join group.' });
    }
});

app.get('/api/tournaments', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const query = `
            SELECT 
                t.*, 
                u.role as creator_role, 
                g.name as "groupName",
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'pending') as pending_applications_count
            FROM tournaments t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN groups g ON t.target_group_id IS NOT NULL AND t.target_group_id != '' AND CAST(t.target_group_id AS INTEGER) = g.id
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
            WHERE
                t.user_id = $1 -- It's a tournament created by the current user
                OR u.role = 'admin' -- It's a public tournament from an admin
                OR gm.user_id IS NOT NULL -- The current user is a member of the tournament's target group
            GROUP BY t.id, u.role, g.name
            ORDER BY t.start_date DESC NULLS LAST, t.id DESC
        `;
        
        const result = await pool.query(query, [userId]);
        res.json(result.rows.map(t => ({ ...t, id: t.id.toString(), pending_applications_count: parseInt(t.pending_applications_count) })));
    } catch (err) {
        console.error("Fetch Tournaments Error:", err);
        res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
});

app.post('/api/tournaments', async (req, res) => {
    const { 
        userId, name, groupName, prize_pool, status, type, target_group_id, rounds,
        category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count
    } = req.body;
    if (!userId || !name) {
        return res.status(400).json({ error: 'userId and name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO tournaments (
                user_id, name, group_name, prize_pool, status, type, target_group_id, rounds,
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
            [
                userId, name, groupName, prize_pool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count
            ]
        );
        const newTournament = result.rows[0];
        res.status(201).json({ ...newTournament, id: newTournament.id.toString() });
    } catch (err) {
        console.error("Create Tournament Error:", err);
        res.status(500).json({ error: 'Failed to create tournament' });
    }
});

app.get('/api/users/:userId/applications', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT ta.*, t.name as tournament_name, t.start_date
             FROM tournament_applications ta
             JOIN tournaments t ON ta.tournament_id = t.id
             WHERE ta.user_id = $1
             ORDER BY ta.created_at DESC`,
            [userId]
        );
        res.json(result.rows.map(row => ({ ...row, id: row.id.toString(), tournament_id: row.tournament_id.toString(), user_id: row.user_id.toString() })));
    } catch (err) {
        console.error("Fetch User Applications Error:", err);
        res.status(500).json({ error: 'Failed to fetch user applications' });
    }
});

app.get('/api/tournaments/:id/applications', async (req, res) => {
    const { id: tournamentId } = req.params;
    const { userId } = req.query; // Coach's user ID making the request

    try {
        // Verify the requesting user is the coach of this tournament
        const tournamentRes = await pool.query('SELECT user_id FROM tournaments WHERE id = $1', [tournamentId]);
        if (tournamentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        if (tournamentRes.rows[0].user_id.toString() !== userId) {
            return res.status(403).json({ error: 'You are not authorized to view applications for this tournament' });
        }

        const result = await pool.query(
            `SELECT ta.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
             FROM tournament_applications ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.tournament_id = $1
             ORDER BY ta.created_at ASC`,
            [tournamentId]
        );
        res.json(result.rows.map(row => ({
            ...row,
            id: row.id.toString(),
            tournament_id: row.tournament_id.toString(),
            user_id: row.user_id.toString(),
        })));
    } catch (err) {
        console.error("Fetch Tournament Applications Error:", err);
        res.status(500).json({ error: 'Failed to fetch tournament applications' });
    }
});


app.post('/api/tournaments/:id/apply', async (req, res) => {
    const { id: tournamentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get tournament and user info
        const tournamentRes = await client.query('SELECT user_id, name FROM tournaments WHERE id = $1', [tournamentId]);
        if (tournamentRes.rows.length === 0) {
            throw new Error('Tournament not found');
        }
        const { user_id: coachId, name: tournamentName } = tournamentRes.rows[0];

        const userRes = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            throw new Error('Applicant user not found');
        }
        const { name: userName } = userRes.rows[0];

        // 2. Create the application
        const applicationRes = await client.query(
            `INSERT INTO tournament_applications (tournament_id, user_id, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (tournament_id, user_id) DO NOTHING
             RETURNING id`,
            [tournamentId, userId]
        );
        
        if (applicationRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Вы уже подали заявку на этот турнир' });
        }
        
        const applicationId = applicationRes.rows[0].id;

        // 3. Create a notification for the coach
        await client.query(
            `INSERT INTO notifications (user_id, type, message, reference_id) VALUES ($1, $2, $3, $4)`,
            [coachId, 'tournament_application', `${userName} хочет участвовать в турнире "${tournamentName}"`, applicationId]
        );

        await client.query('COMMIT');
        await logSystemEvent('info', `User ${userId} applied for tournament ${tournamentId}`, 'Tournaments');
        res.status(201).json({ success: true, message: 'Application submitted' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Apply to Tournament Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        name, groupName, prize_pool, status, type, target_group_id, rounds,
        category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tournaments 
             SET name = $1, group_name = $2, prize_pool = $3, status = $4, type = $5, target_group_id = $6, rounds = $7,
                 category = $8, tournament_type = $9, gender = $10, age_group = $11, system = $12, match_format = $13, start_date = $14, end_date = $15, participants_count = $17
             WHERE id = $16 RETURNING *`,
            [
                name, groupName, prize_pool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date,
                id, participants_count
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Update Tournament Error:", err);
        res.status(500).json({ error: 'Failed to update tournament' });
    }
});

// --- STUDENTS CRM ROUTES ---

app.get('/api/crm/stats/:coachId', async (req, res) => {
    const { coachId } = req.params;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const coachIdInt = parseInt(coachId);
    if (isNaN(coachIdInt)) {
        return res.status(400).json({ error: 'Invalid coachId' });
    }

    try {
        const activePlayersRes = await pool.query(
            `SELECT COUNT(*) FROM students WHERE coach_id = $1 AND status = 'active'`, 
            [coachIdInt]
        );

        const debtRes = await pool.query(
            `SELECT SUM(balance) as total_debt, COUNT(*) as players_in_debt FROM students WHERE coach_id = $1 AND balance < 0`,
            [coachIdInt]
        );

        res.json({
            activePlayers: parseInt(activePlayersRes.rows[0].count, 10),
            totalDebt: parseInt(debtRes.rows[0].total_debt || 0, 10),
            playersInDebt: parseInt(debtRes.rows[0].players_in_debt, 10)
        });
    } catch (err) {
        console.error("Get CRM Stats Error:", err);
        res.status(500).json({ error: 'Db error' });
    }
});

app.get('/api/students', async (req, res) => {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId is required' });

    const coachIdInt = parseInt(coachId, 10);
    if (isNaN(coachIdInt)) {
        return res.status(400).json({ error: 'Invalid coachId' });
    }

    try {
        const query = `
            SELECT 
                s.*,
                COALESCE(
                    (
                        SELECT jsonb_object_agg(sk.skill_name, sk.skill_value)
                        FROM student_skills sk
                        WHERE sk.student_id = s.id
                    ),
                    '{"serve": 0, "forehand": 0, "backhand": 0, "stamina": 0, "tactics": 0}'::jsonb
                ) as skills
            FROM students s
            WHERE s.coach_id = $1
            ORDER BY s.id DESC
        `;
        const result = await pool.query(query, [coachIdInt]);
        
        res.json(result.rows.map(row => ({
            id: row.id.toString(),
            coachId: row.coach_id,
            name: row.name,
            age: row.age,
            level: row.level,
            balance: row.balance,
            nextLesson: row.next_lesson,
            avatar: row.avatar,
            status: row.status,
            xp: row.skill_level_xp || 0,
            skills: row.skills,
            goals: row.goals || [],
            notes: row.notes || [],
            videos: row.videos || [],
            badges: row.badges || [],
            racketHours: row.racket_hours || 0,
            lastRestringDate: row.last_restring_date || null
        })));
    } catch (err) {
        console.error("Get Students Error:", err);
        res.status(500).json({ error: 'Database error while fetching students' });
    }
});

app.get('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const studentId = parseInt(id);
    if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
    }

    try {
        const studentRes = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
        if (studentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const skillsRes = await pool.query('SELECT skill_name, skill_value FROM student_skills WHERE student_id = $1', [studentId]);
        const historyRes = await pool.query('SELECT * FROM lesson_history WHERE student_id = $1 ORDER BY date DESC', [studentId]);

        const student = {
            ...mapStudent(studentRes.rows[0]), // Assuming mapStudent is defined elsewhere
            skillLevelXp: studentRes.rows[0].skill_level_xp,
            skills: skillsRes.rows.map(r => ({ name: r.skill_name, value: r.skill_value })),
            lessonHistory: historyRes.rows.map(r => ({
                id: r.id.toString(),
                date: r.date,
                description: r.description,
                amount: r.amount,
                location: r.location
            }))
        };

        res.json(student);

    } catch (err) {
        console.error("Get Student Details Error:", err);
        res.status(500).json({ error: 'Db error' });
    }
});

app.post('/api/students', async (req, res) => {
    const { coachId, name, age, level, avatar, balance, status, skills, xp, badges, notes, goals, racketHours } = req.body;
    
    const coachIdInt = parseInt(coachId);
    if (isNaN(coachIdInt)) {
        return res.status(400).json({ error: 'Ошибка авторизации.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const studentRes = await client.query(
            `INSERT INTO students (coach_id, name, age, level, avatar, balance, status, notes, goals, skill_level_xp, badges, racket_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                coachIdInt, name, age, level, avatar, balance || 0, status || 'active', 
                JSON.stringify(notes || []), JSON.stringify(goals || []), xp || 0, 
                JSON.stringify(badges || []), racketHours || 0
            ]
        );
        const newStudent = studentRes.rows[0];

        if (skills) {
            for (const [skillName, skillValue] of Object.entries(skills)) {
                await client.query(
                    'INSERT INTO student_skills (student_id, skill_name, skill_value) VALUES ($1, $2, $3)',
                    [newStudent.id, skillName, skillValue]
                );
            }
        }

        await client.query('COMMIT');
        
        // Re-fetch the student with aggregated skills to ensure consistency
        const finalStudentQuery = `
            SELECT s.*,
                COALESCE((SELECT jsonb_object_agg(sk.skill_name, sk.skill_value) FROM student_skills sk WHERE sk.student_id = s.id), '{}'::jsonb) as skills
            FROM students s
            WHERE s.id = $1
        `;
        const finalResult = await client.query(finalStudentQuery, [newStudent.id]);
        const finalStudentRow = finalResult.rows[0];


        await logSystemEvent('info', `Coach ${coachId} added student ${name}`, 'CRM');
        res.status(201).json({
            id: finalStudentRow.id.toString(),
            coachId: finalStudentRow.coach_id,
            name: finalStudentRow.name,
            age: finalStudentRow.age,
            level: finalStudentRow.level,
            balance: finalStudentRow.balance,
            nextLesson: finalStudentRow.next_lesson,
            avatar: finalStudentRow.avatar,
            status: finalStudentRow.status,
            xp: finalStudentRow.skill_level_xp,
            skills: finalStudentRow.skills,
            goals: finalStudentRow.goals,
            notes: finalStudentRow.notes,
            videos: finalStudentRow.videos,
            badges: finalStudentRow.badges,
            racketHours: finalStudentRow.racket_hours,
            lastRestringDate: finalStudentRow.last_restring_date,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Student Error:", err);
        res.status(500).json({ error: 'Ошибка БД: ' + err.message });
    } finally {
        client.release();
    }
});

app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const studentId = parseInt(id);
    if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
    }

    const { skills, xp, ...studentFields } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Update main students table
        const dbMap = { name: 'name', age: 'age', level: 'level', balance: 'balance', nextLesson: 'next_lesson', status: 'status', goals: 'goals', notes: 'notes', badges: 'badges', racketHours: 'racket_hours', lastRestringDate: 'last_restring_date', videos: 'videos' };
        const setClauses = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(studentFields)) {
            if (dbMap[key]) {
                setClauses.push(`${dbMap[key]} = $${idx}`);
                // Handle JSON fields
                if (['goals', 'notes', 'badges', 'videos'].includes(key)) {
                    values.push(JSON.stringify(value || []));
                } else {
                    values.push(value);
                }
                idx++;
            }
        }

        if (xp !== undefined) {
             setClauses.push(`skill_level_xp = $${idx}`);
             values.push(xp);
             idx++;
        }

        if (setClauses.length > 0) {
            values.push(studentId);
            const query = `UPDATE students SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
            await client.query(query, values);
        }
        
        // Update skills table
        if (skills) {
            for (const [skillName, skillValue] of Object.entries(skills)) {
                await client.query(
                    `INSERT INTO student_skills (student_id, skill_name, skill_value)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (student_id, skill_name) 
                     DO UPDATE SET skill_value = $3`,
                    [studentId, skillName, skillValue]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // Fetch the fully updated student to return
        const finalStudentQuery = `
            SELECT s.*,
                COALESCE((SELECT jsonb_object_agg(sk.skill_name, sk.skill_value) FROM student_skills sk WHERE sk.student_id = s.id), '{}'::jsonb) as skills
            FROM students s
            WHERE s.id = $1
        `;
        const finalResult = await client.query(finalStudentQuery, [studentId]);
        
        if (finalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found after update' });
        }
        const updatedStudentRow = finalResult.rows[0];

        res.json({
            id: updatedStudentRow.id.toString(),
            coachId: updatedStudentRow.coach_id,
            name: updatedStudentRow.name,
            age: updatedStudentRow.age,
            level: updatedStudentRow.level,
            balance: updatedStudentRow.balance,
            nextLesson: updatedStudentRow.next_lesson,
            avatar: updatedStudentRow.avatar,
            status: updatedStudentRow.status,
            xp: updatedStudentRow.skill_level_xp,
            skills: updatedStudentRow.skills,
            goals: updatedStudentRow.goals || [],
            notes: updatedStudentRow.notes || [],
            videos: updatedStudentRow.videos || [],
            badges: updatedStudentRow.badges || [],
            racketHours: updatedStudentRow.racket_hours || 0,
            lastRestringDate: updatedStudentRow.last_restring_date,
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Student Error:", err);
        res.status(500).json({ error: 'Db error: ' + err.message });
    } finally {
        client.release();
    }
});

// --- SCHEDULED LESSONS ROUTES ---

app.get('/api/lessons', async (req, res) => {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    try {
        const result = await pool.query('SELECT * FROM scheduled_lessons WHERE coach_id = $1', [coachId]);
        res.json(result.rows.map(row => {
            // Format date as YYYY-MM-DD string
            const dateObj = new Date(row.date);
            const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            
            return {
                id: row.id.toString(),
                coachId: row.coach_id,
                studentId: row.student_id,
                studentName: row.student_name,
                type: row.type,
                startTime: row.start_time,
                dayIndex: row.day_index,
                date: formattedDate,
                duration: row.duration,
                status: row.status,
                courtName: row.court_name,
                useCannon: row.use_cannon,
                useRacketRental: row.use_racket_rental,
                courtCost: row.court_cost,
                lessonPrice: row.lesson_price,
            };
        }));
    } catch (err) {
        console.error("Get Lessons Error:", err);
        res.status(500).json({ error: 'Database error while fetching lessons' });
    }
});

app.post('/api/lessons', async (req, res) => {
    const { 
        coachId, studentId, studentName, type, startTime, dayIndex, date,
        duration, status, courtName, useCannon, useRacketRental, 
        courtCost, lessonPrice 
    } = req.body;

    console.log('Creating lesson with data:', req.body);
    console.log('Date field received:', date, 'Type:', typeof date);

    try {
        const result = await pool.query(
            `INSERT INTO scheduled_lessons (
                coach_id, student_id, student_name, type, start_time, day_index, date,
                duration, status, court_name, use_cannon, use_racket_rental, 
                court_cost, lesson_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [
                coachId, studentId, studentName, type, startTime, dayIndex, date,
                duration, status, courtName, useCannon, useRacketRental, 
                courtCost, lessonPrice
            ]
        );
        
        const newLesson = result.rows[0];
        console.log('Lesson created in DB:', newLesson);
        console.log('Date stored in DB:', newLesson.date, 'Type:', typeof newLesson.date);
        await logSystemEvent('info', `Coach ${coachId} booked lesson for student ${studentId}`, 'CRM');

        // Format date as YYYY-MM-DD string
        const dateObj = new Date(newLesson.date);
        const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        res.status(201).json({
            id: newLesson.id.toString(),
            coachId: newLesson.coach_id,
            studentId: newLesson.student_id,
            studentName: newLesson.student_name,
            type: newLesson.type,
            startTime: newLesson.start_time,
            dayIndex: newLesson.day_index,
            date: formattedDate,
            duration: newLesson.duration,
            status: newLesson.status,
            courtName: newLesson.court_name,
            useCannon: newLesson.use_cannon,
            useRacketRental: newLesson.use_racket_rental,
            courtCost: newLesson.court_cost,
            lessonPrice: newLesson.lesson_price,
        });
    } catch (err) {
        console.error("Create Lesson Error:", err);
        console.error("Error details:", err.message, err.stack);
        res.status(500).json({ error: 'Database error while creating lesson', details: err.message });
    }
});

// Create multiple recurring lessons
app.post('/api/lessons/recurring', async (req, res) => {
    const { lessons } = req.body;
    
    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
        return res.status(400).json({ error: 'lessons array is required' });
    }

    try {
        const createdLessons = [];
        
        for (const lessonData of lessons) {
            const { 
                coachId, studentId, studentName, type, startTime, dayIndex, date,
                duration, status, courtName, useCannon, useRacketRental, 
                courtCost, lessonPrice 
            } = lessonData;
            
            const result = await pool.query(
                `INSERT INTO scheduled_lessons (
                    coach_id, student_id, student_name, type, start_time, day_index, date,
                    duration, status, court_name, use_cannon, use_racket_rental, 
                    court_cost, lesson_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING *`,
                [
                    coachId, studentId, studentName, type, startTime, dayIndex, date,
                    duration, status, courtName, useCannon, useRacketRental, 
                    courtCost, lessonPrice
                ]
            );
            
            const newLesson = result.rows[0];
            
            // Format date as YYYY-MM-DD string
            const dateObj = new Date(newLesson.date);
            const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            
            createdLessons.push({
                id: newLesson.id.toString(),
                coachId: newLesson.coach_id,
                studentId: newLesson.student_id,
                studentName: newLesson.student_name,
                type: newLesson.type,
                startTime: newLesson.start_time,
                dayIndex: newLesson.day_index,
                date: formattedDate,
                duration: newLesson.duration,
                status: newLesson.status,
                courtName: newLesson.court_name,
                useCannon: newLesson.use_cannon,
                useRacketRental: newLesson.use_racket_rental,
                courtCost: newLesson.court_cost,
                lessonPrice: newLesson.lesson_price,
            });
        }
        
        await logSystemEvent('info', `Created ${createdLessons.length} recurring lessons`, 'CRM');
        res.status(201).json(createdLessons);
    } catch (err) {
        console.error("Create Recurring Lessons Error:", err);
        res.status(500).json({ error: 'Database error while creating recurring lessons' });
    }
});

// Delete a lesson
app.delete('/api/lessons/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('DELETE FROM scheduled_lessons WHERE id = $1 RETURNING *', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        
        await logSystemEvent('info', `Deleted lesson ${id}`, 'CRM');
        res.status(200).json({ message: 'Lesson deleted successfully' });
    } catch (err) {
        console.error("Delete Lesson Error:", err);
        res.status(500).json({ error: 'Database error while deleting lesson' });
    }
});

// --- MATCH STATISTICS ROUTES ---

app.get('/api/matches', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const result = await pool.query('SELECT * FROM matches WHERE user_id = $1 ORDER BY date DESC LIMIT 10', [userId]);
        const matches = result.rows.map(row => ({
            id: row.id.toString(),
            userId: row.user_id,
            opponentName: row.opponent_name,
            score: row.score,
            date: row.date,
            result: row.result,
            surface: row.surface,
            stats: row.stats
        }));
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Db error' });
    }
});

app.post('/api/matches', async (req, res) => {
    const { userId, opponentName, score, result, surface, stats } = req.body;

    try {
        const insert = await pool.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface, stats)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, opponentName, score, result, surface, stats]
        );
        await logSystemEvent('info', `Match added for user ${userId} vs ${opponentName}`, 'Stats');
        const row = insert.rows[0];
        res.json({
            id: row.id.toString(),
            userId: row.user_id,
            opponentName: row.opponent_name,
            score: row.score,
            date: row.date,
            result: row.result,
            surface: row.surface,
            stats: row.stats
        });
    } catch (err) {
        res.status(500).json({ error: 'Db error' });
    }
});


// --- TACTICSROUTES ---

// GET a list of all tactic schemes for a user
app.get('/api/tactics/list/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log('Fetching tactics for user:', userId);
    try {
        const result = await pool.query('SELECT * FROM tactics WHERE user_id = $1 ORDER BY updated_at DESC', [parseInt(userId)]);
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString() })));
    } catch (err) {
        console.error("Fetch Tactics Error:", err);
        res.status(500).json({ error: 'Failed to fetch tactics list' });
    }
});

// GET a single tactic by its ID
app.get('/api/tactic/:tacticId', async (req, res) => {
    const { tacticId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM tactics WHERE id = $1', [tacticId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tactic not found' });
        }
        res.json(result.rows[0] || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tactic' });
    }
});

// POST (create) a new tactic
app.post('/api/tactics', async (req, res) => {
    console.log('Received request to save tactic:', req.body);
    const { userId, name, trajectories } = req.body;

    if (!userId || !name || !trajectories) {
        console.error('Validation failed:', { userId, name, trajectories });
        return res.status(400).json({ error: 'userId, name, and trajectories are required' });
    }
    
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
        console.error('Invalid userId:', userId);
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
        console.log('Executing INSERT query with:', { userId: parsedUserId, name, trajectories: JSON.stringify(trajectories).substring(0, 100) + '...' });
        const result = await pool.query(
            'INSERT INTO tactics (user_id, name, tactics_data) VALUES ($1, $2, $3) RETURNING *',
            [parsedUserId, name, JSON.stringify(trajectories)]
        );
        console.log('Query successful, result:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Save New Tactic Error:", err);
        res.status(500).json({ error: 'Failed to save new tactic' });
    }
});

// PUT (update) an existing tactic
app.put('/api/tactic/:tacticId', async (req, res) => {
    const { tacticId } = req.params;
    const { name, trajectories } = req.body;
    try {
        const result = await pool.query(
            'UPDATE tactics SET name = $1, tactics_data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, JSON.stringify(trajectories), tacticId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tactic not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Tactic Error:", err);
        res.status(500).json({ error: 'Failed to update tactic' });
    }
});

// DELETE a tactic
app.delete('/api/tactic/:tacticId', async (req, res) => {
    const { tacticId } = req.params;
    try {
        await pool.query('DELETE FROM tactics WHERE id = $1', [tacticId]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Delete Tactic Error:", err);
        res.status(500).json({ error: 'Failed to delete tactic' });
    }
});


// AI Coach Route (Actually using the Gemini API)
app.post('/api/ai-coach', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }
    if (!process.env.DEEPSEEK_API_KEY) {
        return res.status(500).json({ error: 'AI Coach is not configured on the server.' });
    }
    try {
        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Ты профессиональный теннисный тренер. Ответь кратко и по делу." },
            { role: "user", content: query }
          ],
        });
        res.json({ text: completion.choices[0].message.content });
    } catch (error) {
        console.error('DeepSeek API error:', error);
        res.status(500).json({ error: 'Failed to get advice from AI coach' });
    }
});

// --- MESSAGING ROUTES (REAL) ---

app.get('/api/conversations', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const result = await pool.query(`
            SELECT 
                c.id,
                c.updated_at,
                p.id as "partnerId",
                p.name as "partnerName",
                p.avatar as "partnerAvatar",
                (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as "lastMessage",
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != $1) as "unread"
            FROM conversations c
            JOIN users p ON (p.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
            WHERE (c.user1_id = $1 OR c.user2_id = $1)
              AND (c.user1_id != $2 AND c.user2_id != $2)
            ORDER BY c.updated_at DESC
        `, [userId, SUPPORT_ADMIN_ID]);
        
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString(), partnerId: r.partnerId.toString(), unread: parseInt(r.unread) })));
    } catch (err) {
        console.error("Fetch Conversations Error:", err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});


app.get('/api/messages', async (req, res) => {
    const { conversationId, userId } = req.query;
    if (!conversationId || !userId) {
        return res.status(400).json({ error: 'conversationId and userId are required' });
    }

    try {
        // Mark messages as read
        await pool.query(
            'UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2',
            [conversationId, userId]
        );

        const result = await pool.query(
            `SELECT 
                m.id, 
                m.sender_id, 
                m.text, 
                m.created_at,
                CASE WHEN m.sender_id = $2 THEN 'user' ELSE 'partner' END as role
            FROM messages m
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC`,
            [conversationId, userId]
        );
        res.json(result.rows.map(r => ({...r, id: r.id.toString(), sender_id: r.sender_id.toString()})));
    } catch (err) {
        console.error("Fetch Messages Error:", err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/messages', async (req, res) => {
    const { senderId, partnerId, text } = req.body;
    if (!senderId || !partnerId || !text) {
        return res.status(400).json({ error: 'senderId, partnerId, and text are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find or create conversation
        let conversationResult = await client.query(
            `SELECT id FROM conversations 
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [senderId, partnerId]
        );

        let conversationId;
        if (conversationResult.rows.length > 0) {
            conversationId = conversationResult.rows[0].id;
            // Update timestamp
            await client.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
        } else {
            const newConversationResult = await client.query(
                'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
                [senderId, partnerId]
            );
            conversationId = newConversationResult.rows[0].id;
        }

        // Insert message
        const messageResult = await client.query(
            `INSERT INTO messages (conversation_id, sender_id, text) 
             VALUES ($1, $2, $3) 
             RETURNING id, sender_id, text, created_at`,
            [conversationId, senderId, text]
        );

        const newMessage = messageResult.rows[0];

        await client.query('COMMIT');
        
        res.status(201).json({
            ...newMessage, 
            id: newMessage.id.toString(),
            sender_id: newMessage.sender_id.toString(),
            role: 'user'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Send Message Error:", err);
        res.status(500).json({ error: 'Failed to send message' });
    } finally {
        client.release();
    }
});

app.post('/api/conversations', async (req, res) => {
    const { userId, partnerId } = req.body;
    if (!userId || !partnerId) {
        return res.status(400).json({ error: 'userId and partnerId are required' });
    }

    const client = await pool.connect();
    try {
        // Find or create conversation
        let conversationResult = await client.query(
            `SELECT c.id, 
                c.updated_at,
                p.id as "partnerId",
                p.name as "partnerName",
                p.avatar as "partnerAvatar",
                (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as "lastMessage",
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != $1) as "unread"
             FROM conversations c
             JOIN users p ON (p.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
             WHERE (c.user1_id = $1 AND c.user2_id = $2) OR (c.user1_id = $2 AND c.user2_id = $1)`,
            [userId, partnerId]
        );

        let conversation;
        if (conversationResult.rows.length > 0) {
            conversation = conversationResult.rows[0];
        } else {
            const newConversationResult = await client.query(
                'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id, updated_at',
                [userId, partnerId]
            );
            const newConversationId = newConversationResult.rows[0].id;
            
            const partnerInfo = await client.query('SELECT id, name, avatar FROM users WHERE id = $1', [partnerId]);

            conversation = {
                id: newConversationId,
                updated_at: newConversationResult.rows[0].updated_at,
                partnerId: partnerInfo.rows[0].id,
                partnerName: partnerInfo.rows[0].name,
                partnerAvatar: partnerInfo.rows[0].avatar,
                lastMessage: null,
                unread: 0
            };
        }
        
        res.status(200).json({ ...conversation, id: conversation.id.toString(), partnerId: conversation.partnerId.toString() });

    } catch (err) {
        console.error("Find/Create Conversation Error:", err);
        res.status(500).json({ error: 'Failed to find or create conversation' });
    } finally {
        client.release();
    }
});



app.post('/api/groups/:groupId/leave', async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    try {
        await pool.query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Leave Group Error:", err);
        res.status(500).json({ error: 'Failed to leave group.' });
    }
});

app.get('/api/groups/:groupId/members', async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.avatar, gm.role 
             FROM group_members gm 
             JOIN users u ON gm.user_id = u.id 
             WHERE gm.group_id = $1`,
            [groupId]
        );
        res.json(result.rows.map(r => ({...r, id: r.id.toString()})));
    } catch (err) {
        console.error("Fetch Group Members Error:", err);
        res.status(500).json({ error: 'Failed to fetch group members.' });
    }
});


// Start Server and Init DB
server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Attempting to connect to DB at ${process.env.DB_HOST || 'localhost'}...`);
    await initDb();
});

// --- TOURNAMENT AND GROUPS ROUTES ---
app.put('/api/applications/:applicationId/status', async (req, res) => {
    const { applicationId } = req.params;
    const { status, coachId } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const applicationRes = await client.query(
            `SELECT ta.tournament_id, ta.user_id, t.user_id as creator_id, t.name as tournament_name
             FROM tournament_applications ta
             JOIN tournaments t ON ta.tournament_id = t.id
             WHERE ta.id = $1`,
            [applicationId]
        );

        if (applicationRes.rows.length === 0) {
            throw new Error('Application not found');
        }
        const { tournament_id, user_id: applicantId, creator_id, tournament_name } = applicationRes.rows[0];

        if (creator_id.toString() !== coachId) {
            return res.status(403).json({ error: 'You are not authorized to modify this application' });
        }

        const result = await client.query(
            'UPDATE tournament_applications SET status = $1 WHERE id = $2 RETURNING *',
            [status, applicationId]
        );

        let notificationMessage = '';
        let notificationType = 'tournament_application';
        if (status === 'approved') {
            notificationMessage = `Ваша заявка на турнир "${tournament_name}" принята!`;
            notificationType = 'tournament_application_approved';
            
            // NOTE: The 'participants' column does not exist in the current schema.
            // This block is commented out to prevent a server error until the database is migrated.
            /*
            const applicantUser = await client.query('SELECT id, name FROM users WHERE id = $1', [applicantId]);
            const applicantIdString = applicantUser.rows[0].id.toString();
            const applicantName = applicantUser.rows[0].name;

            await client.query(
                `UPDATE tournaments 
                 SET participants = JSONB_INSERT(COALESCE(participants, '[]'::jsonb), '{0}', $1::jsonb, TRUE)
                 WHERE id = $2`,
                [JSON.stringify({ id: applicantIdString, name: applicantName }), tournament_id]
            );
            */

        } else if (status === 'rejected') {
            notificationMessage = `Ваша заявка на турнир "${tournament_name}" отклонена.`;
            notificationType = 'tournament_application_rejected';
        }
        
        if (notificationMessage) {
            await client.query(
                `INSERT INTO notifications (user_id, type, message, reference_id) VALUES ($1, $2, $3, $4)`,
                [applicantId, notificationType, notificationMessage, applicationId]
            );
        }

        await client.query('COMMIT');
        await logSystemEvent('info', `Application ${applicationId} status updated to ${status} by coach ${coachId}`, 'Tournaments');
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Application Status Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

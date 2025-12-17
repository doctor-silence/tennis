
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const initDb = require('./initDb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Increased limit to 50mb to allow base64 image uploads
app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI
// CRITICAL: API Key must come from environment variables
if (!process.env.API_KEY) {
  console.error("❌ FATAL: API_KEY is missing in .env file");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Check for Admin Credentials
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn("⚠️  WARNING: ADMIN_EMAIL or ADMIN_PASSWORD is missing in .env. Admin user might not be created or updated.");
}

// --- HELPERS ---

// Helper to log system events to DB
const logSystemEvent = async (level, message, moduleName) => {
    try {
        await pool.query(
            'INSERT INTO system_logs (level, message, module) VALUES ($1, $2, $3)',
            [level, message, moduleName]
        );
    } catch (e) {
        console.error("Failed to write log to DB", e);
    }
};

const mapStudent = (row) => ({
    id: row.id.toString(),
    coachId: row.coach_id,
    name: row.name,
    age: row.age,
    level: row.level,
    balance: row.balance,
    nextLesson: row.next_lesson,
    avatar: row.avatar,
    status: row.status,
    goals: row.goals,
    notes: row.notes
});

// --- ROUTES ---

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', message: 'Backend + DB Connected', time: result.rows[0].now });
    } catch (err) {
        logSystemEvent('error', `Health check failed: ${err.message}`, 'System');
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: err.message });
    }
});

// --- AUTH ROUTES ---

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
        
        res.json({ 
            ...user, 
            id: user.id.toString(),
            rttRank: user.rtt_rank,
            rttCategory: user.rtt_category 
        });
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

// --- COURTS ROUTES (Public & Admin) ---

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
    try {
        // Get all users ordered by rank
        const usersResult = await pool.query(`
            SELECT 
                u.id, u.name, u.avatar, u.xp as points, u.role, u.level, u.rating, u.rtt_rank, u.rtt_category,
                COUNT(m.id) AS total_matches,
                COUNT(m.id) FILTER (WHERE m.result = 'win') AS wins
            FROM users u
            LEFT JOIN matches m ON u.id = m.user_id
            WHERE u.role != 'admin'
            GROUP BY u.id
            ORDER BY u.xp DESC, u.rating DESC, u.name ASC
        `);

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
    try {
        const result = await pool.query(`
            SELECT 
                c.id, 
                c.challenger_id, 
                c.defender_id, 
                c.status, 
                c.deadline, 
                c.match_date,
                uc.name as challenger_name,
                uc.avatar as challenger_avatar,
                ud.name as defender_name,
                ud.avatar as defender_avatar,
                (uc.xp - ud.xp) as rank_gap_xp
            FROM challenges c
            JOIN users uc ON c.challenger_id = uc.id
            JOIN users ud ON c.defender_id = ud.id
            ORDER BY c.deadline ASC
        `);

        const challenges = result.rows.map(row => ({
            id: row.id.toString(),
            challengerId: row.challenger_id.toString(),
            defenderId: row.defender_id.toString(),
            challengerName: row.challenger_name,
            defenderName: row.defender_name,
            rankGap: row.rank_gap_xp, // Using XP difference as rank gap
            status: row.status,
            deadline: row.deadline,
            matchDate: row.match_date
        }));
        res.json(challenges);
    } catch (err) {
        console.error("Fetch Ladder Challenges Error:", err);
        res.status(500).json({ error: 'Failed to fetch ladder challenges' });
    }
});

app.post('/api/ladder/challenges', async (req, res) => {
    const { challengerId, defenderId } = req.body;
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
            `INSERT INTO challenges (challenger_id, defender_id, status, deadline)
             VALUES ($1, $2, 'pending', $3)
             RETURNING *`,
            [parsedChallengerId, parsedDefenderId, deadline.toISOString().split('T')[0]]
        );
        const newChallenge = result.rows[0];

        // Fetch challenger and defender names for the response
        const challenger = await pool.query('SELECT name FROM users WHERE id = $1', [newChallenge.challenger_id]);
        const defender = await pool.query('SELECT name FROM users WHERE id = $1', [newChallenge.defender_id]);

        // Create notification for the defender
        await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id)
             VALUES ($1, 'new_challenge', $2, $3)`,
            [parsedDefenderId, `${challenger.rows[0].name} бросил(а) вам вызов!`, newChallenge.id]
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
            matchDate: newChallenge.match_date
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
            `INSERT INTO notifications (user_id, type, message, reference_id)
             VALUES ($1, 'challenge_accepted', $2, $3)`,
            [challenge.challenger_id, `${defender.rows[0].name} принял(а) ваш вызов!`, updatedChallenge.id]
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

        // Logic for XP change
        if (parsedWinnerId === challengerId) { // Challenger won
            const challengerRes = await client.query('SELECT xp FROM users WHERE id = $1', [challengerId]);
            const defenderRes = await client.query('SELECT xp FROM users WHERE id = $1', [defenderId]);
            let challengerXp = challengerRes.rows[0].xp;
            let defenderXp = defenderRes.rows[0].xp;

            if (defenderXp <= challengerXp) {
                defenderXp = challengerXp + 1;
            }

            // Challenger takes defender's XP, defender takes challenger's.
            await client.query('UPDATE users SET xp = $1 WHERE id = $2', [defenderXp, challengerId]);
            await client.query('UPDATE users SET xp = $1 WHERE id = $2', [challengerXp, defenderId]);

        } else if (parsedWinnerId === defenderId) { // Defender won
            // Defender gets a bonus for a successful defense.
            await client.query('UPDATE users SET xp = xp + 5 WHERE id = $1', [defenderId]);
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
        const winner = await client.query('SELECT name FROM users WHERE id = $1', [parsedWinnerId]);
        const loser = await client.query('SELECT name FROM users WHERE id = $1', [loserId]);

        await client.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface)
             VALUES ($1, $2, $3, 'win', 'hard')`, // Assuming hard court for now
            [parsedWinnerId, loser.rows[0].name, score]
        );
         await client.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface)
             VALUES ($1, $2, $3, 'loss', 'hard')`,
            [loserId, winner.rows[0].name, score]
        );

        await logSystemEvent('info', `Score entered for challenge ${challengeId}. Winner: ${winnerId}`, 'Ladder');
        
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Enter Score Error:", err);
        res.status(500).json({ error: 'Failed to enter score' });
    } finally {
        client.release();
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
            `INSERT INTO notifications (user_id, type, message, reference_id)
             VALUES ($1, 'challenge_accepted', $2, $3)`,
            [challenge.challenger_id, `${defender.rows[0].name} принял(а) ваш вызов!`, updatedChallenge.id]
        );

        await logSystemEvent('info', `Challenge ${challengeId} was accepted by user ${userId}.`, 'Ladder');

        res.status(200).json(updatedChallenge);
    } catch (err) {
        console.error("Accept Ladder Challenge Error:", err);
        res.status(500).json({ error: 'Failed to accept ladder challenge' });
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
    const { userId, type, content } = req.body;
    if (!userId || !type || !content) {
        return res.status(400).json({ error: 'userId, type, and content are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO posts (user_id, type, content) VALUES ($1, $2, $3) RETURNING id',
            [userId, type, content]
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


// --- STUDENTS CRM ROUTES ---

app.get('/api/students', async (req, res) => {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const coachIdInt = parseInt(coachId);
    if (isNaN(coachIdInt)) {
        return res.json([]);
    }

    try {
        const result = await pool.query('SELECT * FROM students WHERE coach_id = $1 ORDER BY id DESC', [coachIdInt]);
        res.json(result.rows.map(mapStudent));
    } catch (err) {
        console.error("Get Students Error:", err);
        res.status(500).json({ error: 'Db error' });
    }
});

app.post('/api/students', async (req, res) => {
    const { coachId, name, age, level, avatar } = req.body;
    
    const coachIdInt = parseInt(coachId);
    if (isNaN(coachIdInt)) {
        return res.status(400).json({ error: 'Ошибка авторизации.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO students (coach_id, name, age, level, avatar, balance, next_lesson, status, goals, notes)
             VALUES ($1, $2, $3, $4, $5, 0, 'Не назначено', 'active', '', '')
             RETURNING *`,
            [coachIdInt, name, age, level, avatar]
        );
        await logSystemEvent('info', `Coach ${coachId} added student ${name}`, 'CRM');
        res.json(mapStudent(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: 'Ошибка БД: ' + err.message });
    }
});

app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    
    const dbMap = {
        name: 'name', age: 'age', level: 'level', balance: 'balance',
        nextLesson: 'next_lesson', status: 'status', goals: 'goals', notes: 'notes'
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
        if (dbMap[key]) {
            setClauses.push(`${dbMap[key]} = $${idx}`);
            values.push(value);
            idx++;
        }
    }

    if (setClauses.length === 0) return res.json({ message: 'No changes' });

    values.push(parseInt(id));
    const query = `UPDATE students SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({error: 'Student not found'});
        res.json(mapStudent(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: 'Db error' });
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


// --- TACTICS ROUTES ---

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
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Ты профессиональный теннисный тренер. Ответь кратко и по делу на вопрос: "${query}"`,
        });
        res.json({ text: response.text });
    } catch (err) {
        console.error('Gemini API Error:', err);
        res.status(500).json({ error: 'Failed to generate advice' });
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
            WHERE c.user1_id = $1 OR c.user2_id = $1
            ORDER BY c.updated_at DESC
        `, [userId]);
        
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

// Start Server and Init DB
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Attempting to connect to DB at ${process.env.DB_HOST || 'localhost'}...`);
    // Run DB Init only after server starts to catch errors better
    await initDb();
});

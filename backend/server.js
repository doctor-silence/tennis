
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const pool = require('./db');
const initDb = require('./initDb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const defaultAvatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`;
        const result = await pool.query(
            `INSERT INTO users (name, email, password, city, avatar, role, rating, age, level, rtt_rank, rtt_category) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING id, name, email, role, city, avatar, rating, age, level, rtt_rank, rtt_category`,
            [
                name, 
                email, 
                password, 
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
        await logSystemEvent('error', `Registration failed: ${err.message}`, 'Auth');
        res.status(500).json({ error: 'Ошибка регистрации: ' + err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            await logSystemEvent('warning', `Failed login attempt for ${email}`, 'Auth');
            return res.status(401).json({ error: 'Неверный пароль' });
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
        res.status(500).json({ error: 'Ошибка при входе: ' + err.message });
    }
});


// --- ADMIN ROUTES ---

app.get('/api/admin/stats', async (req, res) => {
    try {
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const newSignups = await pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'");
        
        // Mock revenue logic (e.g., sum of positive student balances + imaginary subscriptions)
        const revenue = 1450000; // Hardcoded base for demo + logic
        
        res.json({
            revenue: revenue,
            activeUsers: parseInt(usersCount.rows[0].count),
            newSignups: parseInt(newSignups.rows[0].count),
            serverLoad: Math.floor(Math.random() * 20) + 10 // Mock load
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
        const result = await pool.query('SELECT id, name, email, role, city, avatar, rating, level FROM users ORDER BY id DESC');
        res.json(result.rows.map(u => ({...u, id: u.id.toString()})));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role } = req.body;
    try {
        await pool.query('UPDATE users SET name = $1, role = $2 WHERE id = $3', [name, role, id]);
        await logSystemEvent('warning', `Admin updated user ${id} role to ${role}`, 'Admin');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// --- STUDENTS CRM ROUTES ---

app.get('/api/students', async (req, res) => {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const coachIdInt = parseInt(coachId);
    if (isNaN(coachIdInt)) {
        console.warn(`Invalid coachId received: ${coachId}. Likely a mock ID.`);
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

// Start Server and Init DB
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Attempting to connect to DB at ${process.env.DB_HOST || 'localhost'}...`);
    // Run DB Init only after server starts to catch errors better
    await initDb();
});

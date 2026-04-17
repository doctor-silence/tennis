require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const OpenAI = require('openai');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
// const initDb = require('./initDb');
const rttParser = require('./rttParser');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const v8 = require('v8');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const TOURNAMENT_DIRECTOR_ROLE = 'tournament_director';

app.set('trust proxy', 1);

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'https://onthecourt.ru'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-id', 'x-user-id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20, // не более 20 попыток
    message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 200,
    message: { error: 'Слишком много запросов.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Constants
const SUPPORT_ADMIN_ID = 1;
const TOURNAMENT_STAGE_SYNC_INTERVAL_MS = Number(process.env.TOURNAMENT_STAGE_SYNC_INTERVAL_MS || 30 * 60 * 1000);

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

const isGhostIdentifier = (value) => /^ghost_\d+$/.test(String(value || ''));

const extractGhostNumericId = (value) => {
    const matched = String(value || '').match(/^ghost_(\d+)$/);
    return matched ? Number(matched[1]) : null;
};

const ensureGhostCommunityTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ghost_posts (
            id SERIAL PRIMARY KEY,
            ghost_user_id INTEGER NOT NULL REFERENCES ghost_users(id) ON DELETE CASCADE,
            group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            content JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ghost_post_comments (
            id SERIAL PRIMARY KEY,
            ghost_post_id INTEGER NOT NULL REFERENCES ghost_posts(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            ghost_user_id INTEGER REFERENCES ghost_users(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ghost_post_likes (
            id SERIAL PRIMARY KEY,
            ghost_post_id INTEGER NOT NULL REFERENCES ghost_posts(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            ghost_user_id INTEGER REFERENCES ghost_users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CHECK (user_id IS NOT NULL OR ghost_user_id IS NOT NULL)
        )
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ghost_post_likes_user_unique
        ON ghost_post_likes (ghost_post_id, user_id)
        WHERE user_id IS NOT NULL
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ghost_post_likes_ghost_unique
        ON ghost_post_likes (ghost_post_id, ghost_user_id)
        WHERE ghost_user_id IS NOT NULL
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ghost_conversations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ghost_user_id INTEGER NOT NULL REFERENCES ghost_users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (user_id, ghost_user_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ghost_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES ghost_conversations(id) ON DELETE CASCADE,
            sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ghost')),
            sender_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            sender_ghost_user_id INTEGER REFERENCES ghost_users(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

const getLogLevelLabel = (level) => {
    switch (level) {
        case 'info':
            return 'Инфо';
        case 'warning':
            return 'Внимание';
        case 'error':
            return 'Ошибка';
        case 'success':
            return 'Успешно';
        default:
            return 'Событие';
    }
};

const getLogModuleLabel = (moduleName) => {
    switch (moduleName) {
        case 'Admin':
            return 'Админка';
        case 'Auth':
            return 'Авторизация';
        case 'RTT':
            return 'РТТ';
        case 'Shop':
            return 'Магазин';
        case 'News':
            return 'Новости';
        case 'Groups':
            return 'Группы';
        case 'Tournaments':
            return 'Турниры';
        case 'CRM':
            return 'CRM';
        case 'Ladder':
            return 'Ладдер';
        case 'Stats':
            return 'Статистика';
        case 'System':
            return 'Система';
        default:
            return moduleName || 'Система';
    }
};

const formatLogTimestamp = (timestamp) => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
}).format(new Date(timestamp));

const getAdminActorLabel = (admin) => {
    if (!admin) return 'Администратор';
    if (admin.name) return `Администратор ${admin.name}`;
    if (admin.email) return `Администратор ${admin.email}`;
    if (admin.id) return `Администратор #${admin.id}`;
    return 'Администратор';
};

const logAdminAction = async (req, level, actionText, entityText, targetText, detailsText = '') => {
    const actorLabel = getAdminActorLabel(req.admin);
    const targetLabel = targetText ? ` «${targetText}»` : '';
    const detailsSuffix = detailsText ? `. ${detailsText}` : '';
    await logSystemEvent(level, `${actorLabel} ${actionText} ${entityText}${targetLabel}${detailsSuffix}`, 'Admin');
};

const VALID_GENERIC_TLDS = new Set(
    `academy app art ai biz blog club com dev edu email expert info io me mobi name net online org page pro ru shop site space store team tech top tv website xyz xn--p1ai рф`.split(' ')
);

const VALID_COUNTRY_CODE_TLDS = new Set(
    `ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et eu fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw`.split(' ')
);

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const isValidDomainLabel = (label = '') => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);

const validateEmailAddress = (value) => {
    const normalized = normalizeEmail(value);

    if (!normalized) {
        return { isValid: false, normalized, error: 'Введите email' };
    }

    if (normalized.length > 254) {
        return { isValid: false, normalized, error: 'Email слишком длинный' };
    }

    const parts = normalized.split('@');
    if (parts.length !== 2) {
        return { isValid: false, normalized, error: 'Введите корректный email' };
    }

    const [localPart, domain] = parts;
    if (!localPart || !domain) {
        return { isValid: false, normalized, error: 'Введите корректный email' };
    }

    if (localPart.length > 64 || /\s/.test(localPart) || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
        return { isValid: false, normalized, error: 'Введите корректный email' };
    }

    const domainParts = domain.split('.');
    if (domainParts.length < 2 || domainParts.some((part) => !part)) {
        return { isValid: false, normalized, error: 'Введите корректный email' };
    }

    const tld = domainParts[domainParts.length - 1];
    const hasValidTld = VALID_GENERIC_TLDS.has(tld) || VALID_COUNTRY_CODE_TLDS.has(tld);
    if (!hasValidTld) {
        return { isValid: false, normalized, error: 'Проверьте домен email — такое окончание не поддерживается' };
    }

    const domainIsValid = domainParts.every((part, index) => (index === domainParts.length - 1 && part === 'рф') || isValidDomainLabel(part));
    if (!domainIsValid) {
        return { isValid: false, normalized, error: 'Введите корректный email' };
    }

    return { isValid: true, normalized, error: '' };
};

const extractFirstNumericMatch = (text, regexp) => {
    const matched = String(text || '').match(regexp);
    if (!matched) return null;
    return Number(matched[1]);
};

const collectLogReferenceIds = (rows = []) => {
    const references = {
        users: new Set(),
        groups: new Set(),
        tournaments: new Set(),
        challenges: new Set(),
        students: new Set(),
        applications: new Set()
    };

    for (const row of rows) {
        const message = String(row.message || '');

        const userPatterns = [
            /2FA enabled for user (\d+)/i,
            /2FA disabled for user (\d+)/i,
            /accepted by user (\d+)/i,
            /User (\d+) created new group/i,
            /User (\d+) joined group/i,
            /User (\d+) applied for tournament/i,
            /Coach (\d+) added student/i,
            /Coach (\d+) booked lesson/i,
            /matches added for user (\d+)/i,
            /Match added for user (\d+)/i,
            /by coach (\d+)/i,
            /Winner: (\d+)/i
        ];

        userPatterns.forEach((pattern) => {
            const value = extractFirstNumericMatch(message, pattern);
            if (Number.isInteger(value)) references.users.add(value);
        });

        const secondUserMatch = message.match(/Challenge (\d+) was accepted by user (\d+)/i);
        if (secondUserMatch) {
            references.challenges.add(Number(secondUserMatch[1]));
            references.users.add(Number(secondUserMatch[2]));
        }

        const groupId = extractFirstNumericMatch(message, /joined group (\d+)/i);
        if (Number.isInteger(groupId)) references.groups.add(groupId);

        const tournamentId = extractFirstNumericMatch(message, /applied for tournament (\d+)/i);
        if (Number.isInteger(tournamentId)) references.tournaments.add(tournamentId);

        const challengeId = extractFirstNumericMatch(message, /Challenge (\d+)/i) || extractFirstNumericMatch(message, /challenge (\d+)/i);
        if (Number.isInteger(challengeId)) references.challenges.add(challengeId);

        const studentId = extractFirstNumericMatch(message, /student (\d+)/i);
        if (Number.isInteger(studentId)) references.students.add(studentId);

        const applicationId = extractFirstNumericMatch(message, /Application (\d+)/i);
        if (Number.isInteger(applicationId)) references.applications.add(applicationId);
    }

    return references;
};

const queryNamedMap = async (sql, ids, mapRow) => {
    if (!ids.length) return new Map();
    const result = await pool.query(sql, [ids]);
    return new Map(result.rows.map(mapRow));
};

const formatUserLogLabel = (row) => {
    const baseLabel = row.name || row.email || `Пользователь #${row.id}`;
    return row.rni ? `${baseLabel} (RNI: ${row.rni})` : baseLabel;
};

const buildLogReferenceContext = async (rows = []) => {
    const referenceIds = collectLogReferenceIds(rows);
    const userIds = Array.from(referenceIds.users);
    const groupIds = Array.from(referenceIds.groups);
    const tournamentIds = Array.from(referenceIds.tournaments);
    const challengeIds = Array.from(referenceIds.challenges);
    const studentIds = Array.from(referenceIds.students);
    const applicationIds = Array.from(referenceIds.applications);

    const [users, groups, tournaments, challenges, students, applications] = await Promise.all([
        queryNamedMap(
            'SELECT id, name, email, rni FROM users WHERE id = ANY($1::int[])',
            userIds,
            (row) => [Number(row.id), formatUserLogLabel(row)]
        ),
        queryNamedMap(
            'SELECT id, name FROM groups WHERE id = ANY($1::int[])',
            groupIds,
            (row) => [Number(row.id), row.name || `Группа #${row.id}`]
        ),
        queryNamedMap(
            'SELECT id, name FROM tournaments WHERE id = ANY($1::int[])',
            tournamentIds,
            (row) => [Number(row.id), row.name || `Турнир #${row.id}`]
        ),
        challengeIds.length
            ? queryNamedMap(
                `SELECT c.id,
                        CONCAT(COALESCE(challenger.name, 'Игрок'), ' vs ', COALESCE(defender.name, 'Игрок')) AS label
                 FROM challenges c
                 LEFT JOIN users challenger ON challenger.id = c.challenger_id
                 LEFT JOIN users defender ON defender.id = c.defender_id
                 WHERE c.id = ANY($1::int[])`,
                challengeIds,
                (row) => [Number(row.id), row.label || `Вызов #${row.id}`]
            )
            : Promise.resolve(new Map()),
        queryNamedMap(
            'SELECT id, name FROM students WHERE id = ANY($1::int[])',
            studentIds,
            (row) => [Number(row.id), row.name || `Ученик #${row.id}`]
        ),
        applicationIds.length
            ? queryNamedMap(
                `SELECT ta.id,
                        CONCAT(COALESCE(u.name, 'Пользователь'), ' → ', COALESCE(t.name, 'Турнир')) AS label
                 FROM tournament_applications ta
                 LEFT JOIN users u ON u.id = ta.user_id
                 LEFT JOIN tournaments t ON t.id = ta.tournament_id
                 WHERE ta.id = ANY($1::int[])`,
                applicationIds,
                (row) => [Number(row.id), row.label || `Заявка #${row.id}`]
            )
            : Promise.resolve(new Map())
    ]);

    return { users, groups, tournaments, challenges, students, applications };
};

const getContextLabel = (map, id, fallbackPrefix) => {
    if (!Number.isInteger(id)) return '';
    return map.get(id) || `${fallbackPrefix} #${id}`;
};

const humanizeSystemLog = (row, context = {}) => {
    const message = String(row.message || '');
    let title = message;
    let details = '';
    let actor = '';
    const users = context.users || new Map();
    const groups = context.groups || new Map();
    const tournaments = context.tournaments || new Map();
    const challenges = context.challenges || new Map();
    const students = context.students || new Map();
    const applications = context.applications || new Map();

    const legacyPatterns = [
        {
            match: /^Admin created user: (.+)$/,
            map: ([, email]) => ({
                title: `Создан пользователь ${email}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin updated user (.+)$/,
            map: ([, id]) => ({
                title: `Обновлён пользователь #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin deleted user (.+)$/,
            map: ([, id]) => ({
                title: `Удалён пользователь #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin (.+) created group: (.+)$/,
            map: ([, adminId, name]) => ({
                title: `Создана группа «${name}»`,
                details: `Инициатор: администратор #${adminId}`,
                actor: `Администратор #${adminId}`
            })
        },
        {
            match: /^Admin updated group (.+)$/,
            map: ([, id]) => ({
                title: `Обновлена группа #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin deleted group (.+)$/,
            map: ([, id]) => ({
                title: `Удалена группа #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin created tournament: (.+)$/,
            map: ([, name]) => ({
                title: `Создан турнир «${name}»`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin updated tournament (.+) status=(.+)$/,
            map: ([, id, status]) => ({
                title: `Обновлён турнир #${id}`,
                details: `Новый статус: ${status}`,
                actor: 'Администратор'
            })
        },
        {
            match: /^Admin deleted tournament (.+)$/,
            map: ([, id]) => ({
                title: `Удалён турнир #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^New court added: (.+)$/,
            map: ([, name]) => ({
                title: `Добавлен корт «${name}»`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Court deleted: (.+)$/,
            map: ([, id]) => ({
                title: `Удалён корт #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^New product added: (.+)$/,
            map: ([, titleText]) => ({
                title: `Добавлен товар «${titleText}»`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^Product deleted: (.+)$/,
            map: ([, id]) => ({
                title: `Удалён товар #${id}`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^News created: (.+)$/,
            map: ([, titleText]) => ({
                title: `Создана новость «${titleText}»`,
                details: 'Действие выполнено администратором',
                actor: 'Администратор'
            })
        },
        {
            match: /^2FA enabled for user (\d+)$/i,
            map: ([, userId]) => ({
                title: `Пользователь «${getContextLabel(users, Number(userId), 'Пользователь')}» включил двухфакторную аутентификацию`,
                details: `ID пользователя: ${userId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^2FA disabled for user (\d+)$/i,
            map: ([, userId]) => ({
                title: `Пользователь «${getContextLabel(users, Number(userId), 'Пользователь')}» отключил двухфакторную аутентификацию`,
                details: `ID пользователя: ${userId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^User (\d+) created new group: (.+)$/i,
            map: ([, userId, groupName]) => ({
                title: `Создана группа «${groupName}»`,
                details: `Создатель: ${getContextLabel(users, Number(userId), 'Пользователь')}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^User (\d+) joined group (\d+)$/i,
            map: ([, userId, groupId]) => ({
                title: `Пользователь «${getContextLabel(users, Number(userId), 'Пользователь')}» вступил в группу «${getContextLabel(groups, Number(groupId), 'Группа')}»`,
                details: `ID пользователя: ${userId}, ID группы: ${groupId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^User (\d+) applied for tournament (\d+)$/i,
            map: ([, userId, tournamentId]) => ({
                title: `Пользователь «${getContextLabel(users, Number(userId), 'Пользователь')}» подал заявку на турнир «${getContextLabel(tournaments, Number(tournamentId), 'Турнир')}»`,
                details: `ID пользователя: ${userId}, ID турнира: ${tournamentId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^Challenge (\d+) was accepted by user (\d+)\.$/i,
            map: ([, challengeId, userId]) => ({
                title: `Принят вызов «${getContextLabel(challenges, Number(challengeId), 'Вызов')}»`,
                details: `Принял: ${getContextLabel(users, Number(userId), 'Пользователь')}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^Score entered for challenge (\d+)\. Winner: (\d+)$/i,
            map: ([, challengeId, winnerId]) => ({
                title: `Вызов «${getContextLabel(challenges, Number(challengeId), 'Вызов')}» завершён с внесением счёта`,
                details: `Победитель: ${getContextLabel(users, Number(winnerId), 'Пользователь')}`,
                actor: getContextLabel(users, Number(winnerId), 'Пользователь')
            })
        },
        {
            match: /^Challenge (\d+) was cancelled\.$/i,
            map: ([, challengeId]) => ({
                title: `Отменён вызов «${getContextLabel(challenges, Number(challengeId), 'Вызов')}»`,
                details: `ID вызова: ${challengeId}`,
                actor: ''
            })
        },
        {
            match: /^Coach (\d+) added student (.+)$/i,
            map: ([, coachId, studentName]) => ({
                title: `Тренер «${getContextLabel(users, Number(coachId), 'Тренер')}» добавил ученика «${studentName}»`,
                details: `ID тренера: ${coachId}`,
                actor: getContextLabel(users, Number(coachId), 'Тренер')
            })
        },
        {
            match: /^Coach (\d+) booked lesson for student (\d+)$/i,
            map: ([, coachId, studentId]) => ({
                title: `Тренер «${getContextLabel(users, Number(coachId), 'Тренер')}» запланировал занятие для ученика «${getContextLabel(students, Number(studentId), 'Ученик')}»`,
                details: `ID ученика: ${studentId}`,
                actor: getContextLabel(users, Number(coachId), 'Тренер')
            })
        },
        {
            match: /^RTT sync: (\d+) matches added for user (\d+)$/i,
            map: ([, addedCount, userId]) => ({
                title: `Синхронизация РТТ добавила ${addedCount} матч(а/ей) пользователю «${getContextLabel(users, Number(userId), 'Пользователь')}»`,
                details: `ID пользователя: ${userId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^Match added for user (\d+) vs (.+)$/i,
            map: ([, userId, opponentName]) => ({
                title: `Пользователю «${getContextLabel(users, Number(userId), 'Пользователь')}» добавлен матч против «${opponentName}»`,
                details: `ID пользователя: ${userId}`,
                actor: getContextLabel(users, Number(userId), 'Пользователь')
            })
        },
        {
            match: /^Application (\d+) status updated to (.+) by coach (\d+)$/i,
            map: ([, applicationId, status, coachId]) => ({
                title: `Обновлён статус заявки «${getContextLabel(applications, Number(applicationId), 'Заявка')}»`,
                details: `Новый статус: ${status}. Изменил: ${getContextLabel(users, Number(coachId), 'Тренер')}`,
                actor: getContextLabel(users, Number(coachId), 'Тренер')
            })
        }
    ];

    const matchedPattern = legacyPatterns.find((pattern) => pattern.match.test(message));
    if (matchedPattern) {
        const parsed = matchedPattern.map(message.match(matchedPattern.match));
        title = parsed.title;
        details = parsed.details;
        actor = parsed.actor;
    } else if (message.startsWith('Администратор ')) {
        const [firstSentence, ...rest] = message.split('. ');
        title = firstSentence;
        details = rest.join('. ');
        const actorMatch = message.match(/^(Администратор[^«]+?)(?: создал| обновил| удалил| добавил| изменил| опубликовал)/i);
        actor = actorMatch ? actorMatch[1].trim() : 'Администратор';
    }

    return {
        id: row.id.toString(),
        level: row.level,
        levelLabel: getLogLevelLabel(row.level),
        message: title,
        details,
        actor,
        module: row.module,
        moduleLabel: getLogModuleLabel(row.module),
        timestamp: formatLogTimestamp(row.timestamp),
        timestampRaw: new Date(row.timestamp).toISOString()
    };
};

const humanizeSystemLogs = async (rows = []) => {
    const context = await buildLogReferenceContext(rows);
    return rows.map((row) => humanizeSystemLog(row, context));
};

const ensureSystemLogsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id SERIAL PRIMARY KEY,
            level VARCHAR(20),
            message TEXT,
            module VARCHAR(50),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const PLAYER_PROGRESS_VERSION = 3;
const EMPTY_PLAYER_PROGRESS_SKILLS = Object.freeze({
    serve: 0,
    forehand: 0,
    backhand: 0,
    stamina: 0,
    psychology: 0
});

const ensurePlayerProgressTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS player_progress_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            version INTEGER NOT NULL DEFAULT ${PLAYER_PROGRESS_VERSION},
            skills JSONB NOT NULL DEFAULT '{}'::jsonb,
            goal JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

const WEARABLE_PROVIDER_LABELS = {
    garmin: 'Garmin',
    samsung_watch: 'Samsung Watch'
};

const WEARABLE_ALLOWED_PROVIDERS = Object.keys(WEARABLE_PROVIDER_LABELS);

const ensureWearableConnectionsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wearable_connections (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
            external_user_id VARCHAR(255),
            access_token TEXT,
            refresh_token TEXT,
            token_expires_at TIMESTAMPTZ,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_synced_at TIMESTAMPTZ,
            connected_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (user_id, provider)
        )
    `);
};

const ensureWearableActivitiesTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wearable_activities (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            external_activity_id VARCHAR(255) NOT NULL,
            activity_type VARCHAR(100) NOT NULL DEFAULT 'workout',
            title VARCHAR(255),
            started_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            duration_seconds INTEGER,
            distance_km NUMERIC(10, 2),
            calories INTEGER,
            average_heart_rate INTEGER,
            max_heart_rate INTEGER,
            steps INTEGER,
            source_device VARCHAR(255),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (user_id, provider, external_activity_id)
        )
    `);
};

const ensureTournamentDirectorTables = async () => {
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS director_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS director_phone VARCHAR(100);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS director_email VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS director_telegram VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS director_max VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10, 2);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS club_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS court_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS address TEXT;`);
    await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS surface VARCHAR(100);`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tournament_regulations (
            id SERIAL PRIMARY KEY,
            tournament_id INTEGER NOT NULL UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
            file_size INTEGER NOT NULL DEFAULT 0,
            file_data TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const getPublicApiBaseUrl = (req) => {
    const configuredBase = process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL;
    if (configuredBase) {
        return configuredBase.replace(/\/$/, '');
    }

    return `${req.protocol}://${req.get('host')}/api`;
};

const isGarminOAuthConfigured = () => Boolean(
    process.env.GARMIN_CLIENT_ID &&
    process.env.GARMIN_CLIENT_SECRET &&
    process.env.GARMIN_OAUTH_AUTHORIZE_URL &&
    process.env.GARMIN_OAUTH_TOKEN_URL &&
    process.env.GARMIN_OAUTH_CALLBACK_URL
);

const isGarminActivitySyncConfigured = () => Boolean(process.env.GARMIN_ACTIVITIES_URL);

const sanitizeWearableMetadata = (metadata = {}) => {
    const safeMetadata = {};

    if (typeof metadata.message === 'string' && metadata.message.trim()) {
        safeMetadata.message = metadata.message;
    }
    if (typeof metadata.bridgeTokenPreview === 'string' && metadata.bridgeTokenPreview.trim()) {
        safeMetadata.bridgeTokenPreview = metadata.bridgeTokenPreview;
    }
    if (typeof metadata.bridgeTokenExpiresAt === 'string' && metadata.bridgeTokenExpiresAt.trim()) {
        safeMetadata.bridgeTokenExpiresAt = metadata.bridgeTokenExpiresAt;
    }
    if (typeof metadata.bridgeIngestUrl === 'string' && metadata.bridgeIngestUrl.trim()) {
        safeMetadata.bridgeIngestUrl = metadata.bridgeIngestUrl;
    }
    if (metadata.lastSyncResult && typeof metadata.lastSyncResult === 'object') {
        safeMetadata.lastSyncResult = metadata.lastSyncResult;
    }

    return safeMetadata;
};

const normalizeWearableConnectionRow = (row, overrides = {}) => {
    const safeMetadata = sanitizeWearableMetadata(row.metadata || {});

    return {
        provider: row.provider,
        displayName: WEARABLE_PROVIDER_LABELS[row.provider] || row.provider,
        status: row.status || 'disconnected',
        externalUserId: row.external_user_id || null,
        connectedAt: row.connected_at ? new Date(row.connected_at).toISOString() : null,
        lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
        authConfigured: row.provider === 'garmin' ? isGarminOAuthConfigured() : false,
        requiresMobileBridge: row.provider === 'samsung_watch',
        message: safeMetadata.message || null,
        metadata: safeMetadata,
        ...overrides
    };
};

const clampInteger = (value, minimum, maximum, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.round(numeric)));
};

const parseOptionalPositiveNumber = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return numeric;
};

const parseOptionalDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const normalizeWearableActivityType = (value) => {
    const source = String(value || 'workout').trim().toLowerCase();

    if (source.includes('tennis')) return 'tennis';
    if (source.includes('run')) return 'running';
    if (source.includes('walk')) return 'walking';
    if (source.includes('ride') || source.includes('bike') || source.includes('cycle')) return 'cycling';
    if (source.includes('strength')) return 'strength';
    if (source.includes('swim')) return 'swimming';
    if (source.includes('cardio')) return 'cardio';

    return source || 'workout';
};

const buildWearableSecretHash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const createWearableBridgeToken = () => crypto.randomBytes(24).toString('hex');

const maskWearableBridgeToken = (token) => `${token.slice(0, 6)}…${token.slice(-4)}`;

const buildSamsungBridgeOnboardingUrl = (req, { bridgeToken, bridgeIngestUrl, bridgeTokenExpiresAt }) => {
    const onboardingUrl = new URL(`${getPublicApiBaseUrl(req)}/integrations/samsung-watch/onboard`);
    onboardingUrl.searchParams.set('token', bridgeToken);
    onboardingUrl.searchParams.set('ingestUrl', bridgeIngestUrl);
    onboardingUrl.searchParams.set('expiresAt', bridgeTokenExpiresAt);
    return onboardingUrl.toString();
};

const extractActivitiesFromPayload = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;

    const candidates = [
        payload.activities,
        payload.items,
        payload.data,
        payload.data?.activities,
        payload.data?.items,
        payload.summaries,
        payload.results,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
};

const normalizeWearableActivityPayload = (provider, rawActivity = {}) => {
    const startedAt = parseOptionalDate(
        rawActivity.startedAt ||
        rawActivity.startTime ||
        rawActivity.start_time ||
        rawActivity.startDate ||
        rawActivity.start_date ||
        rawActivity.beginTime ||
        rawActivity.beginTimestamp
    );
    const durationSeconds = parseOptionalPositiveNumber(
        rawActivity.durationSeconds ??
        rawActivity.duration ??
        rawActivity.durationInSeconds ??
        rawActivity.elapsedDuration ??
        rawActivity.movingDuration
    );
    const endedAt = parseOptionalDate(
        rawActivity.endedAt ||
        rawActivity.endTime ||
        rawActivity.end_time ||
        rawActivity.endDate ||
        rawActivity.end_date
    ) || (startedAt && durationSeconds !== null ? new Date(startedAt.getTime() + durationSeconds * 1000) : null);

    const rawDistance = parseOptionalPositiveNumber(
        rawActivity.distanceKm ??
        rawActivity.distance_km ??
        rawActivity.distanceInKm ??
        rawActivity.distance ??
        rawActivity.distanceMeters ??
        rawActivity.distanceInMeters
    );
    const distanceKm = rawDistance === null
        ? null
        : rawDistance > 100
            ? Number((rawDistance / 1000).toFixed(2))
            : Number(rawDistance.toFixed(2));

    const title = String(rawActivity.title || rawActivity.name || rawActivity.activityName || rawActivity.summary || '').trim();
    const activityType = normalizeWearableActivityType(
        rawActivity.activityType ||
        rawActivity.activity_type ||
        rawActivity.type ||
        rawActivity.typeKey ||
        rawActivity.sport ||
        rawActivity.sportType
    );

    const externalActivityId = String(
        rawActivity.externalActivityId ||
        rawActivity.activityId ||
        rawActivity.activity_id ||
        rawActivity.id ||
        rawActivity.uuid ||
        buildWearableSecretHash([
            provider,
            startedAt ? startedAt.toISOString() : 'no-start',
            durationSeconds ?? 'no-duration',
            distanceKm ?? 'no-distance',
            title || activityType,
        ].join('|')).slice(0, 32)
    );

    return {
        provider,
        externalActivityId,
        activityType,
        title: title || null,
        startedAt,
        endedAt,
        durationSeconds: durationSeconds === null ? null : Math.round(durationSeconds),
        distanceKm,
        calories: parseOptionalPositiveNumber(rawActivity.calories ?? rawActivity.kilocalories ?? rawActivity.activeKilocalories),
        averageHeartRate: parseOptionalPositiveNumber(rawActivity.averageHeartRate ?? rawActivity.avgHeartRate ?? rawActivity.heartRateAverage),
        maxHeartRate: parseOptionalPositiveNumber(rawActivity.maxHeartRate ?? rawActivity.heartRateMax),
        steps: parseOptionalPositiveNumber(rawActivity.steps ?? rawActivity.stepCount),
        sourceDevice: String(rawActivity.deviceName || rawActivity.sourceDevice || rawActivity.device || '').trim() || null,
        metadata: {
            sourceType: rawActivity.activityType || rawActivity.type || rawActivity.sport || null,
            providerPayloadVersion: rawActivity.payloadVersion || null,
        }
    };
};

const normalizeWearableActivityRow = (row) => ({
    id: row.id,
    provider: row.provider,
    externalActivityId: row.external_activity_id,
    activityType: row.activity_type,
    title: row.title || null,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    calories: row.calories === null ? null : Number(row.calories),
    averageHeartRate: row.average_heart_rate === null ? null : Number(row.average_heart_rate),
    maxHeartRate: row.max_heart_rate === null ? null : Number(row.max_heart_rate),
    steps: row.steps === null ? null : Number(row.steps),
    sourceDevice: row.source_device || null,
    metadata: row.metadata || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
});

const saveWearableActivities = async (userId, provider, activities = []) => {
    if (!activities.length) return 0;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const activity of activities) {
            await client.query(
                `INSERT INTO wearable_activities (
                    user_id,
                    provider,
                    external_activity_id,
                    activity_type,
                    title,
                    started_at,
                    ended_at,
                    duration_seconds,
                    distance_km,
                    calories,
                    average_heart_rate,
                    max_heart_rate,
                    steps,
                    source_device,
                    metadata,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    $9, $10, $11, $12, $13, $14, $15::jsonb, NOW()
                )
                ON CONFLICT (user_id, provider, external_activity_id)
                DO UPDATE SET
                    activity_type = EXCLUDED.activity_type,
                    title = EXCLUDED.title,
                    started_at = EXCLUDED.started_at,
                    ended_at = EXCLUDED.ended_at,
                    duration_seconds = EXCLUDED.duration_seconds,
                    distance_km = EXCLUDED.distance_km,
                    calories = EXCLUDED.calories,
                    average_heart_rate = EXCLUDED.average_heart_rate,
                    max_heart_rate = EXCLUDED.max_heart_rate,
                    steps = EXCLUDED.steps,
                    source_device = EXCLUDED.source_device,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()`,
                [
                    userId,
                    provider,
                    activity.externalActivityId,
                    activity.activityType,
                    activity.title,
                    activity.startedAt,
                    activity.endedAt,
                    activity.durationSeconds,
                    activity.distanceKm,
                    activity.calories,
                    activity.averageHeartRate,
                    activity.maxHeartRate,
                    activity.steps,
                    activity.sourceDevice,
                    JSON.stringify(activity.metadata || {})
                ]
            );
        }
        await client.query('COMMIT');
        return activities.length;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const refreshGarminAccessToken = async (connectionRow) => {
    if (!connectionRow?.refresh_token) {
        return connectionRow;
    }

    const tokenResponse = await fetch(process.env.GARMIN_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connectionRow.refresh_token,
            client_id: process.env.GARMIN_CLIENT_ID,
            client_secret: process.env.GARMIN_CLIENT_SECRET,
        }),
    });

    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenPayload.access_token) {
        throw new Error(tokenPayload.error_description || tokenPayload.error || 'Garmin token refresh failed');
    }

    const expiresInSeconds = Number(tokenPayload.expires_in || 0);
    const tokenExpiry = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;

    await pool.query(
        `UPDATE wearable_connections
         SET access_token = $2,
             refresh_token = COALESCE($3, refresh_token),
             token_expires_at = $4,
             metadata = $5::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [
            connectionRow.id,
            tokenPayload.access_token,
            tokenPayload.refresh_token || null,
            tokenExpiry,
            JSON.stringify({ ...(connectionRow.metadata || {}), message: 'Garmin токен обновлён.' })
        ]
    );

    return {
        ...connectionRow,
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token || connectionRow.refresh_token,
        token_expires_at: tokenExpiry,
        metadata: { ...(connectionRow.metadata || {}), message: 'Garmin токен обновлён.' }
    };
};

const ensureGarminAccessToken = async (connectionRow) => {
    const expiresAt = connectionRow?.token_expires_at ? new Date(connectionRow.token_expires_at) : null;
    const shouldRefresh = !connectionRow?.access_token || (expiresAt && expiresAt.getTime() <= Date.now() + 60 * 1000);

    if (!shouldRefresh) {
        return connectionRow;
    }

    return refreshGarminAccessToken(connectionRow);
};

const buildWearableConnectionsResponse = (rows = []) => {
    const byProvider = new Map(rows.map((row) => [row.provider, row]));

    return WEARABLE_ALLOWED_PROVIDERS.map((provider) => {
        const row = byProvider.get(provider);
        if (row) return normalizeWearableConnectionRow(row);

        return normalizeWearableConnectionRow(
            { provider, status: 'disconnected', metadata: {} },
            {
                authConfigured: provider === 'garmin' ? isGarminOAuthConfigured() : false,
                requiresMobileBridge: provider === 'samsung_watch',
                message: provider === 'samsung_watch'
                    ? 'Для Samsung Watch нужен мобильный bridge через Samsung Health / Android.'
                    : (isGarminOAuthConfigured() ? null : 'Garmin OAuth ещё не настроен на сервере.')
            }
        );
    });
};

const requireSelfAccess = (req, res) => {
    const requestUserId = req.headers['x-user-id'];
    if (!requestUserId || String(requestUserId) !== String(req.params.id)) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
};

const clampProgressMetric = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeProgressGoal = (goal = {}) => {
    const targetPoints = Number(goal.targetPoints);
    const targetRank = Number(goal.targetRank);

    return {
        title: typeof goal.title === 'string' ? goal.title.trim().slice(0, 200) : '',
        targetDate: typeof goal.targetDate === 'string' ? goal.targetDate.slice(0, 20) : '',
        targetPoints: Number.isFinite(targetPoints) ? Math.max(0, Math.round(targetPoints)) : 0,
        targetRank: Number.isFinite(targetRank) ? Math.max(1, Math.round(targetRank)) : null
    };
};

const normalizePlayerProgress = (payload = {}) => ({
    version: Number.isFinite(Number(payload.version)) ? Math.max(1, Math.round(Number(payload.version))) : PLAYER_PROGRESS_VERSION,
    skills: {
        serve: clampProgressMetric(payload.skills?.serve),
        forehand: clampProgressMetric(payload.skills?.forehand),
        backhand: clampProgressMetric(payload.skills?.backhand),
        stamina: clampProgressMetric(payload.skills?.stamina),
        psychology: clampProgressMetric(payload.skills?.psychology)
    },
    goal: normalizeProgressGoal(payload.goal)
});

const TOURNAMENT_STAGE_DEFINITIONS = [
    {
        label: 'Расписание на основной этап турнира',
        patterns: ['расписание на основной этап турнира', 'расписание основного этапа турнира']
    },
    {
        label: 'Жеребьевка на основной этап турнира',
        patterns: ['жеребьевка на основной этап турнира', 'жеребьёвка на основной этап турнира', 'жеребьевка основного этапа турнира', 'жеребьёвка основного этапа турнира']
    },
    {
        label: 'Начало регистрации на основной этап турнира',
        patterns: ['начало регистрации на основной этап турнира', 'открыта регистрация на основной этап турнира', 'регистрация на основной этап турнира']
    }
];

const normalizeTournamentStageStatus = (value = '') => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const matchedStage = TOURNAMENT_STAGE_DEFINITIONS.find(stage =>
        stage.patterns.some(pattern => normalizedValue.includes(pattern)) || normalizedValue === stage.label.toLowerCase()
    );

    return matchedStage ? matchedStage.label : null;
};

const normalizeCurrencyNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const normalizedValue = Number(String(value).replace(',', '.'));
    return Number.isFinite(normalizedValue) ? normalizedValue : null;
};

const normalizeParticipantCount = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    return Math.max(2, Math.round(numericValue));
};

const normalizeDirectorTournamentStatus = (value = '') => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (['draft', 'open', 'live', 'finished'].includes(normalizedValue)) {
        return normalizedValue;
    }
    return 'draft';
};

const parsePdfDataUrl = (rawValue) => {
    if (!rawValue) return null;

    const value = String(rawValue);
    const match = value.match(/^data:(application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) return null;

    const fileData = match[2].replace(/\s+/g, '');
    const buffer = Buffer.from(fileData, 'base64');

    return {
        mimeType: match[1].toLowerCase(),
        fileData,
        fileSize: buffer.length
    };
};

const buildDirectorTournamentPayload = (body = {}, fallbackDirector = {}) => ({
    name: String(body.name || '').trim(),
    startDate: body.start_date || body.startDate || null,
    endDate: body.end_date || body.endDate || null,
    directorName: String(body.director_name || body.directorName || fallbackDirector.name || '').trim(),
    directorPhone: String(body.director_phone || body.directorPhone || '').trim(),
    directorEmail: normalizeEmail(body.director_email || body.directorEmail || fallbackDirector.email || ''),
    directorTelegram: String(body.director_telegram || body.directorTelegram || '').trim(),
    directorMax: String(body.director_max || body.directorMax || '').trim(),
    prizePool: String(body.prize_pool || body.prizePool || '').trim(),
    entryFee: normalizeCurrencyNumber(body.entry_fee || body.entryFee),
    clubName: String(body.club_name || body.clubName || '').trim(),
    courtName: String(body.court_name || body.courtName || '').trim(),
    address: String(body.address || '').trim(),
    surface: String(body.surface || '').trim(),
    category: String(body.category || body.ntrp_category || body.ntrpCategory || '').trim(),
    gender: String(body.gender || '').trim(),
    participantsCount: normalizeParticipantCount(body.participants_count || body.participantsCount),
    status: normalizeDirectorTournamentStatus(body.status),
    tournamentType: String(body.tournament_type || body.tournamentType || 'Одиночный').trim() || 'Одиночный',
    matchFormat: String(body.match_format || body.matchFormat || '').trim()
});

const mapDirectorTournamentRow = (row) => ({
    ...row,
    id: row.id.toString(),
    user_id: row.user_id ? row.user_id.toString() : null,
    entry_fee: row.entry_fee !== null && row.entry_fee !== undefined ? Number(row.entry_fee) : null,
    participants_count: row.participants_count !== null && row.participants_count !== undefined ? Number(row.participants_count) : null,
    pending_applications_count: row.pending_applications_count !== null && row.pending_applications_count !== undefined ? Number(row.pending_applications_count) : 0,
    approved_applications_count: row.approved_applications_count !== null && row.approved_applications_count !== undefined ? Number(row.approved_applications_count) : 0,
    total_applications_count: row.total_applications_count !== null && row.total_applications_count !== undefined ? Number(row.total_applications_count) : 0,
    has_regulation: Boolean(row.has_regulation),
    regulation_file_name: row.regulation_file_name || null,
    regulation_uploaded_at: row.regulation_uploaded_at || null
});

const requireTournamentDirector = async (req, res, next) => {
    const rawId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
    const userId = rawId && /^\d+$/.test(String(rawId)) ? String(rawId) : null;

    if (!userId) {
        return res.status(401).json({ error: 'User authorization required' });
    }

    try {
        const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
        if (!result.rows.length) {
            return res.status(401).json({ error: 'User not found' });
        }

        const actor = result.rows[0];
        if (actor.role !== TOURNAMENT_DIRECTOR_ROLE && actor.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ только для директоров турниров' });
        }

        req.tournamentDirector = {
            id: String(actor.id),
            name: actor.name,
            email: actor.email,
            role: actor.role
        };
        next();
    } catch (error) {
        console.error('requireTournamentDirector error:', error.message);
        return res.status(500).json({ error: 'Auth check failed' });
    }
};

const ensureDirectorTournamentAccess = async (tournamentId, actor) => {
    const result = await pool.query('SELECT id, user_id, name FROM tournaments WHERE id = $1', [tournamentId]);
    if (!result.rows.length) {
        return { error: { status: 404, message: 'Tournament not found' } };
    }

    const tournament = result.rows[0];
    if (actor.role !== 'admin' && String(tournament.user_id) !== String(actor.id)) {
        return { error: { status: 403, message: 'Нет доступа к этому турниру' } };
    }

    return { tournament };
};

const mapRttLifecycleToTournamentStatus = (value = '') => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;
    if (normalizedValue === 'finished') return 'finished';
    if (normalizedValue === 'live') return 'live';
    if (normalizedValue === 'open') return 'open';
    return null;
};

const buildTournamentStageMessage = ({ tournamentName, groupName, stageStatus }) => {
    const groupSuffix = groupName ? ` · группа «${groupName}»` : '';
    return `Турнир «${tournamentName}»: ${stageStatus}${groupSuffix}`;
};

const normalizeComparableText = (value = '') => String(value || '')
    .toLowerCase()
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractCleanPlayerName = (rawName = '') => {
    let name = String(rawName || '').replace(/\s+/g, ' ').trim();
    name = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    name = name.replace(/\s+\d+\s*лет.*$/i, '').trim();
    name = name.replace(/\s*,.*$/g, '').trim();
    return name.replace(/\s+/g, ' ').trim();
};

const isLikelyHumanName = (value = '') => {
    const cleaned = extractCleanPlayerName(value);
    if (!cleaned || cleaned.length < 3) return false;
    if (/^\d+$/.test(cleaned)) return false;
    return /[A-Za-zА-Яа-яЁё]/.test(cleaned);
};

const parseRuDateToTimestamp = (value = '') => {
    const matched = String(value || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!matched) return 0;
    return new Date(`${matched[3]}-${matched[2]}-${matched[1]}T00:00:00Z`).getTime();
};

const pickTournamentWinner = (participants = []) => {
    const winnerRow = participants.find((participant) => /^1([.)]|$)/.test(String(participant.place || '').trim()));
    if (!winnerRow) return '';
    const winnerName = extractCleanPlayerName(winnerRow.name);
    return isLikelyHumanName(winnerName) ? winnerName : '';
};

const findRelevantFinalMatch = ({ tournament, detailsTournament, recentMatches, winnerName }) => {
    const tournamentNameNeedle = normalizeComparableText(detailsTournament?.name || tournament.name || '');
    const cityNeedle = normalizeComparableText(detailsTournament?.city || tournament.city || '');
    const ageGroupNeedle = normalizeComparableText(detailsTournament?.ageGroup || tournament.age_group || tournament.ageGroup || '');

    const filteredMatches = (recentMatches || [])
        .filter((match) => {
            const matchTournament = normalizeComparableText(match.tournament || '');
            const matchCity = normalizeComparableText(match.city || '');
            const matchAgeGroup = normalizeComparableText(match.ageGroup || '');

            const tournamentMatches = tournamentNameNeedle && matchTournament.includes(tournamentNameNeedle);
            const cityMatches = !cityNeedle || !matchCity || matchCity.includes(cityNeedle) || cityNeedle.includes(matchCity);
            const ageGroupMatches = !ageGroupNeedle || !matchAgeGroup || matchAgeGroup.includes(ageGroupNeedle) || ageGroupNeedle.includes(matchAgeGroup);

            return tournamentMatches && cityMatches && ageGroupMatches;
        })
        .sort((left, right) => parseRuDateToTimestamp(right.date) - parseRuDateToTimestamp(left.date));

    if (!filteredMatches.length) return null;

    if (winnerName) {
        const normalizedWinner = normalizeComparableText(winnerName);
        const byWinner = filteredMatches.find((match) => {
            return normalizeComparableText(match.player1Name) === normalizedWinner || normalizeComparableText(match.player2Name) === normalizedWinner;
        });
        if (byWinner) return byWinner;
    }

    return filteredMatches[0];
};

const hasTournamentPost = async (client, tournamentId, type) => {
    const existingPost = await client.query(
        `SELECT 1
         FROM posts
         WHERE type = $1
           AND content ->> 'tournamentId' = $2
         LIMIT 1`,
        [type, String(tournamentId)]
    );

    return existingPost.rows.length > 0;
};

const hasTournamentStagePost = async (client, tournamentId, stageLabel) => {
    const existingPost = await client.query(
        `SELECT 1
         FROM posts
         WHERE type = 'tournament_stage_update'
           AND content ->> 'tournamentId' = $1
           AND content ->> 'stageLabel' = $2
         LIMIT 1`,
        [String(tournamentId), String(stageLabel || '')]
    );

    return existingPost.rows.length > 0;
};

const hasTournamentAnnouncementPost = async (client, tournamentId, announcementKind) => {
    const existingPost = await client.query(
        `SELECT 1
         FROM posts
         WHERE type = 'tournament_announcement'
           AND content ->> 'tournamentId' = $1
           AND content ->> 'announcementKind' = $2
         LIMIT 1`,
        [String(tournamentId), String(announcementKind || '')]
    );

    return existingPost.rows.length > 0;
};

const resolveTournamentGroupId = (targetGroupId) => {
    if (!targetGroupId || !/^\d+$/.test(String(targetGroupId))) {
        return null;
    }

    return parseInt(String(targetGroupId), 10);
};

const publishTournamentStartedAnnouncement = async (client, tournament, detailsTournament = {}) => {
    if (await hasTournamentAnnouncementPost(client, tournament.id, 'started')) {
        return 0;
    }

    const numericGroupId = resolveTournamentGroupId(tournament.target_group_id);
    const groupName = tournament.group_name || tournament.groupName || null;
    const authorName = 'Администрация';
    const participantsCount = Array.isArray(detailsTournament.participants)
        ? detailsTournament.participants.length
        : Number(detailsTournament.participantsCount || tournament.participants_count || 0) || null;

    await client.query(
        `INSERT INTO posts (user_id, group_id, type, content)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
            tournament.user_id,
            numericGroupId,
            'tournament_announcement',
            JSON.stringify({
                tournamentId: String(tournament.id),
                announcementKind: 'started',
                title: tournament.name,
                name: tournament.name,
                groupName,
                prizePool: tournament.prize_pool || null,
                date: tournament.start_date || tournament.startDate || null,
                authorName,
                status: 'live',
                stageStatus: detailsTournament.statusLabel || detailsTournament.stageStatus || tournament.stage_status || 'Турнир идет',
                category: detailsTournament.category || tournament.category || null,
                tournamentType: detailsTournament.type || tournament.tournament_type || tournament.tournamentType || null,
                gender: detailsTournament.gender || tournament.gender || null,
                ageGroup: detailsTournament.ageGroup || tournament.age_group || tournament.ageGroup || null,
                system: detailsTournament.system || tournament.system || null,
                matchFormat: tournament.match_format || tournament.matchFormat || null,
                participantsCount,
                startDate: tournament.start_date || tournament.startDate || null,
                endDate: tournament.end_date || tournament.endDate || null,
                creatorRole: tournament.creator_role || 'admin',
                rttLink: tournament.rtt_link || null,
                rtt_link: tournament.rtt_link || null,
            })
        ]
    );

    return 1;
};

const publishTournamentCompletionPosts = async (client, tournament, completionData) => {
    const numericGroupId = resolveTournamentGroupId(tournament.target_group_id);
    const groupName = tournament.group_name || tournament.groupName || null;
    const authorLabel = 'Администрация';
    const safeWinnerName = isLikelyHumanName(completionData.finalWinnerName) ? extractCleanPlayerName(completionData.finalWinnerName) : '';
    let publishedCount = 0;

    if (completionData.finalMatch && !(await hasTournamentPost(client, tournament.id, 'match_result'))) {
        await client.query(
            `INSERT INTO posts (user_id, group_id, type, content)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [
                tournament.user_id,
                numericGroupId,
                'match_result',
                JSON.stringify({
                    tournamentId: String(tournament.id),
                    tournamentName: tournament.name,
                    groupName,
                    round: 'Финал',
                    player1Name: completionData.finalMatch.player1Name,
                    player2Name: completionData.finalMatch.player2Name,
                    score: completionData.finalMatch.score,
                    winnerName: safeWinnerName || undefined,
                    note: 'Результат финала автоматически загружен из РТТ',
                    authorLabel,
                    rttLink: tournament.rtt_link || null
                })
            ]
        );
        publishedCount += 1;
    }

    if (safeWinnerName && !(await hasTournamentPost(client, tournament.id, 'tournament_result'))) {
        await client.query(
            `INSERT INTO posts (user_id, group_id, type, content)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [
                tournament.user_id,
                numericGroupId,
                'tournament_result',
                JSON.stringify({
                    tournamentId: String(tournament.id),
                    tournamentName: tournament.name,
                    groupName,
                    winnerName: safeWinnerName,
                    winnerAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeWinnerName)}&background=f59e0b&color=fff`,
                    note: 'Победитель автоматически определён по данным РТТ',
                    authorLabel,
                    rttLink: tournament.rtt_link || null
                })
            ]
        );
        publishedCount += 1;
    }

    if (!(await hasTournamentStagePost(client, tournament.id, 'Турнир завершён'))) {
        const finishMessage = `Турнир «${tournament.name}» завершён.${safeWinnerName ? ` Победитель: ${safeWinnerName}.` : ''}`;

        await client.query(
            `INSERT INTO posts (user_id, group_id, type, content)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [
                tournament.user_id,
                numericGroupId,
                'tournament_stage_update',
                JSON.stringify({
                    tournamentId: String(tournament.id),
                    tournamentName: tournament.name,
                    groupName,
                    stageLabel: 'Турнир завершён',
                    message: finishMessage,
                    winnerName: safeWinnerName || undefined,
                    rttLink: tournament.rtt_link || null,
                })
            ]
        );
        publishedCount += 1;
    }

    if (publishedCount > 0 && numericGroupId) {
        const message = `Турнир «${tournament.name}» завершён. Результаты финала опубликованы автоматически.`;
        await client.query(
            `INSERT INTO notifications (user_id, type, message, reference_id)
             SELECT gm.user_id, $1, $2, $3
             FROM group_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.group_id = $4
               AND COALESCE(u.notifications_enabled, TRUE) = TRUE`,
            ['tournament_result', message, String(tournament.id), numericGroupId]
        );
    }

    return { published: publishedCount };
};

const publishTournamentStageUpdate = async (client, tournament, stageStatus) => {
    const numericGroupId = resolveTournamentGroupId(tournament.target_group_id);
    const groupName = tournament.group_name || tournament.groupName || null;
    const message = buildTournamentStageMessage({
        tournamentName: tournament.name,
        groupName,
        stageStatus
    });

    await client.query(
        `INSERT INTO posts (user_id, group_id, type, content)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
            tournament.user_id,
            numericGroupId,
            'tournament_stage_update',
            JSON.stringify({
                tournamentId: String(tournament.id),
                tournamentName: tournament.name,
                groupName,
                stageLabel: stageStatus,
                message,
                rttLink: tournament.rtt_link || null
            })
        ]
    );

    if (numericGroupId) {
        await client.query(
            `INSERT INTO notifications (user_id, type, message, reference_id)
             SELECT gm.user_id, $1, $2, $3
             FROM group_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.group_id = $4
               AND COALESCE(u.notifications_enabled, TRUE) = TRUE`,
            ['tournament_stage_update', message, String(tournament.id), numericGroupId]
        );
    }
};

let isTournamentStageSyncRunning = false;

const syncTrackedTournamentStages = async () => {
    if (isTournamentStageSyncRunning) {
        return;
    }

    isTournamentStageSyncRunning = true;

    try {
        const recentMatchesResult = await rttParser.getRecentMatches(250);
        const recentMatches = recentMatchesResult?.success ? recentMatchesResult.data : [];

        const trackedTournaments = await pool.query(
            `SELECT t.id, t.user_id, t.name, t.group_name, t.target_group_id, t.rtt_link, t.stage_status, t.status,
                t.start_date, t.end_date, t.prize_pool, t.category, t.tournament_type, t.gender,
                t.age_group, t.system, t.match_format, t.participants_count, t.creator_role,
                    COALESCE(g.name, t.group_name) AS "groupName"
             FROM tournaments t
             LEFT JOIN groups g
               ON t.target_group_id IS NOT NULL
              AND t.target_group_id != ''
              AND t.target_group_id ~ '^\\d+$'
              AND CAST(t.target_group_id AS INTEGER) = g.id
             WHERE COALESCE(t.rtt_link, '') != ''
             ORDER BY t.id DESC`
        );

        let publishedCount = 0;
        let completionPublishedCount = 0;

        for (const tournament of trackedTournaments.rows) {
            try {
                const details = await rttParser.getTournamentDetails(tournament.rtt_link);
                if (!details?.success) {
                    continue;
                }

                const detailsTournament = details.tournament || {};
                const detectedStageStatus = normalizeTournamentStageStatus(detailsTournament.stageStatus || '');
                const previousStageStatus = normalizeTournamentStageStatus(tournament.stage_status || '');
                const detectedTournamentStatus = mapRttLifecycleToTournamentStatus(detailsTournament.lifecycleStatus || '');
                const previousTournamentStatus = String(tournament.status || '').trim().toLowerCase();
                const tournamentMarkedFinished = detectedTournamentStatus === 'finished';
                const winnerName = tournamentMarkedFinished ? pickTournamentWinner(detailsTournament.participants || []) : '';
                const finalMatch = tournamentMarkedFinished
                    ? findRelevantFinalMatch({
                        tournament,
                        detailsTournament,
                        recentMatches,
                        winnerName
                    })
                    : null;

                let finalWinnerName = winnerName;
                if (!finalWinnerName && finalMatch?.score) {
                    finalWinnerName = rttParser.determineMatchResult(finalMatch.score)
                        ? finalMatch.player1Name
                        : finalMatch.player2Name;
                }

                const tournamentCompleted = tournamentMarkedFinished;
                const nextStageStatus = detailsTournament.statusLabel || detectedStageStatus || tournament.stage_status || null;

                if (
                    !tournamentCompleted &&
                    detectedTournamentStatus === previousTournamentStatus &&
                    (!detectedStageStatus || detectedStageStatus === previousStageStatus)
                ) {
                    continue;
                }

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    if (detectedTournamentStatus && detectedTournamentStatus !== previousTournamentStatus) {
                        await client.query(
                            `UPDATE tournaments
                             SET status = $1,
                                 stage_status = COALESCE($2, stage_status)
                             WHERE id = $3`,
                            [detectedTournamentStatus, nextStageStatus, tournament.id]
                        );
                    }

                    const tournamentForPosting = {
                        ...tournament,
                        status: detectedTournamentStatus || tournament.status,
                        stage_status: nextStageStatus || tournament.stage_status,
                    };

                    if (detectedTournamentStatus === 'live' && previousTournamentStatus !== 'live') {
                        publishedCount += await publishTournamentStartedAnnouncement(client, tournamentForPosting, detailsTournament);
                    }

                    if (tournamentCompleted && previousTournamentStatus !== 'finished') {
                        publishedCount += await publishTournamentStartedAnnouncement(client, tournamentForPosting, detailsTournament);

                        const completionResult = await publishTournamentCompletionPosts(client, tournamentForPosting, {
                            finalMatch,
                            finalWinnerName
                        });
                        completionPublishedCount += completionResult.published;
                    } else if (detectedStageStatus && detectedStageStatus !== previousStageStatus) {
                        await client.query(
                            'UPDATE tournaments SET stage_status = $1 WHERE id = $2',
                            [detectedStageStatus, tournament.id]
                        );
                        await publishTournamentStageUpdate(client, tournamentForPosting, detectedStageStatus);
                        publishedCount += 1;
                    }

                    await client.query('COMMIT');
                } catch (syncErr) {
                    await client.query('ROLLBACK');
                    console.error(`Tournament stage sync failed for ${tournament.id}:`, syncErr.message);
                } finally {
                    client.release();
                }
            } catch (tournamentErr) {
                console.error(`Tournament RTT sync error for ${tournament.id}:`, tournamentErr.message);
            }
        }

        if (publishedCount > 0) {
            await logSystemEvent('info', `RTT stage sync published ${publishedCount} tournament updates`, 'RTT');
        }
        if (completionPublishedCount > 0) {
            await logSystemEvent('info', `RTT auto-published ${completionPublishedCount} tournament result posts`, 'RTT');
        }
    } catch (err) {
        console.error('RTT tracked tournaments sync error:', err.message);
    } finally {
        isTournamentStageSyncRunning = false;
    }
};

// --- API ROUTES ---

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', message: 'Backend + DB Connected', time: result.rows[0].now });
    } catch (err) {
        logSystemEvent('error', `Health check failed: ${err.message}`, 'System');
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});


// --- AUTHROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, city, role, age, rating, level, rttRank, rttCategory, rni } = req.body;
    
    try {
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        const emailValidation = validateEmailAddress(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        const normalizedEmail = emailValidation.normalized;

        const ageNum = age !== undefined && age !== null ? parseInt(age) : null;
        if (ageNum !== null && (isNaN(ageNum) || ageNum < 5 || ageNum > 99)) {
            return res.status(400).json({ error: 'Укажите корректный возраст (5–99 лет)' });
        }

        const userCheck = await pool.query('SELECT * FROM users WHERE LOWER(BTRIM(email)) = $1', [normalizedEmail]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`;

        let resolvedRating = Number(rating) || 0;
        let resolvedRttRank = Number(rttRank) || 0;
        let resolvedRttCategory = rttCategory || null;
        let resolvedRole = role || 'amateur';
        let resolvedLevel = level || '';
        let resolvedRni = rni || null;

        if (resolvedRole === 'rtt_pro') {
            if (!resolvedRni) {
                return res.status(400).json({ error: 'Укажите РНИ для профи РТТ' });
            }

            const rttVerification = await rttParser.getPlayerByRNI(resolvedRni);
            if (!rttVerification.success || !rttVerification.data) {
                return res.status(400).json({ error: rttVerification.error || 'Не удалось подтвердить РНИ' });
            }

            resolvedRating = Number(rttVerification.data.points) || 0;
            resolvedRttRank = Number(rttVerification.data.rank) || 0;
            resolvedRttCategory = rttVerification.data.category || resolvedRttCategory;
            resolvedLevel = '';
        } else {
            resolvedRni = null;
            resolvedRttCategory = null;
            resolvedRttRank = 0;
            resolvedRating = resolvedRole === 'amateur' ? resolvedRating : 0;
        }
        
        const result = await pool.query(
            `INSERT INTO users (name, email, password, city, avatar, role, rating, age, level, rtt_rank, rtt_category, rni, xp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0) 
             RETURNING id, name, email, role, city, avatar, rating, age, level, rtt_rank, rtt_category, rni, xp`,
            [
                name, 
                normalizedEmail, 
                hashedPassword, 
                city, 
                defaultAvatar, 
                resolvedRole, 
                resolvedRating,
                ageNum,
                resolvedLevel,
                resolvedRttRank,
                resolvedRttCategory,
                resolvedRni
            ]
        );

        const user = result.rows[0];
        await logSystemEvent('info', `New user registered: ${normalizedEmail}`, 'Auth');
        
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
    const { email, password, totpCode } = req.body;

    try {
        const normalizedEmail = normalizeEmail(email);
        const result = await pool.query('SELECT * FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1', [normalizedEmail]);
        
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
            await logSystemEvent('warning', `Failed login attempt for ${normalizedEmail}`, 'Auth');
            return res.status(401).json({ error: authError });
        }

        // 2FA: если включена — требуем TOTP код
        if (user.totp_enabled && user.totp_secret) {
            if (!totpCode) {
                return res.status(200).json({ requires2fa: true });
            }
            const valid = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token: totpCode,
                window: 1
            });
            if (!valid) {
                await logSystemEvent('warning', `Invalid 2FA code for ${normalizedEmail}`, 'Auth');
                return res.status(401).json({ error: 'Неверный код 2FA' });
            }
        }

        await logSystemEvent('info', `User logged in: ${normalizedEmail}`, 'Auth');

        // Обновляем время последнего входа
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const { password: _, totp_secret: __, ...userInfo } = user;
        
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

// --- 2FA ROUTES ---

// Шаг 1: генерируем секрет и QR-код
app.post('/api/auth/2fa/setup', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
        const userRes = await pool.query('SELECT role, totp_enabled FROM users WHERE id = $1', [userId]);
        if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
        if (userRes.rows[0].role !== 'admin') return res.status(403).json({ error: 'Только для admin' });
        if (userRes.rows[0].totp_enabled) return res.status(400).json({ error: '2FA уже включена' });

        const secret = speakeasy.generateSecret({ name: `НаКорте (${userId})`, length: 20 });
        await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, userId]);

        const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
        res.json({ qrCode: qrUrl, secret: secret.base32 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Шаг 2: подтверждаем первый код и включаем 2FA
app.post('/api/auth/2fa/enable', async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'userId и token обязательны' });
    try {
        const userRes = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [userId]);
        if (!userRes.rows.length || !userRes.rows[0].totp_secret) return res.status(400).json({ error: 'Сначала выполните setup' });

        const valid = speakeasy.totp.verify({
            secret: userRes.rows[0].totp_secret,
            encoding: 'base32',
            token,
            window: 1
        });
        if (!valid) return res.status(400).json({ error: 'Неверный код. Проверьте приложение.' });

        await pool.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [userId]);
        await logSystemEvent('info', `2FA enabled for user ${userId}`, 'Auth');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Отключение 2FA
app.post('/api/auth/2fa/disable', async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'userId и token обязательны' });
    try {
        const userRes = await pool.query('SELECT totp_secret, totp_enabled FROM users WHERE id = $1', [userId]);
        if (!userRes.rows.length || !userRes.rows[0].totp_enabled) return res.status(400).json({ error: '2FA не включена' });

        const valid = speakeasy.totp.verify({
            secret: userRes.rows[0].totp_secret,
            encoding: 'base32',
            token,
            window: 1
        });
        if (!valid) return res.status(400).json({ error: 'Неверный код' });

        await pool.query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [userId]);
        await logSystemEvent('warning', `2FA disabled for user ${userId}`, 'Auth');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- RTT INTEGRATION API ROUTES ---

// Get player data by RNI
app.post('/api/rtt/verify', async (req, res) => {
    const { rni } = req.body;
    
    try {
        if (!rni) {
            return res.status(400).json({ error: 'РНИ обязателен для проверки' });
        }

        const result = await rttParser.getPlayerByRNI(rni);
        
        if (result.success) {
            await logSystemEvent('info', `RTT verification successful for RNI: ${rni}`, 'RTT');
            res.json(result);
        } else {
            await logSystemEvent('warning', `RTT verification failed for RNI: ${rni} - ${result.error}`, 'RTT');
            res.status(404).json(result);
        }

    } catch (err) {
        console.error("❌ RTT Verification Error:", err);
        await logSystemEvent('error', `RTT verification error: ${err.message}`, 'RTT');
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при проверке РНИ: ' + err.message 
        });
    }
});

// Search players in RTT
app.get('/api/rtt/search', async (req, res) => {
    const { query } = req.query;
    
    try {
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Минимум 2 символа для поиска' });
        }

        const result = await rttParser.searchPlayers(query);
        res.json(result);

    } catch (err) {
        console.error("❌ RTT Search Error:", err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при поиске: ' + err.message 
        });
    }
});

// Маппинг городов → федеральный округ (district id на rttstat.ru)
const CITY_TO_DISTRICT = {
    // Центральный ФО
    'Москва': '2', 'Московская область': '2', 'Воронеж': '2', 'Ярославль': '2',
    'Тула': '2', 'Рязань': '2', 'Тверь': '2', 'Брянск': '2', 'Калуга': '2',
    'Орёл': '2', 'Липецк': '2', 'Тамбов': '2', 'Иваново': '2', 'Кострома': '2',
    'Смоленск': '2', 'Курск': '2', 'Белгород': '2', 'Владимир': '2',
    // Северо-Западный ФО
    'Санкт-Петербург': '374', 'Петербург': '374', 'Мурманск': '374',
    'Архангельск': '374', 'Вологда': '374', 'Псков': '374', 'Новгород': '374',
    'Калининград': '374', 'Петрозаводск': '374', 'Сыктывкар': '374',
    // Приволжский ФО
    'Казань': '834', 'Нижний Новгород': '834', 'Самара': '834', 'Уфа': '834',
    'Пермь': '834', 'Оренбург': '834', 'Саратов': '834', 'Тольятти': '834',
    'Пенза': '834', 'Киров': '834', 'Ульяновск': '834', 'Чебоксары': '834',
    'Ижевск': '834', 'Йошкар-Ола': '834', 'Саранск': '834',
    // Сибирский ФО
    'Новосибирск': '1237', 'Омск': '1237', 'Красноярск': '1237', 'Барнаул': '1237',
    'Иркутск': '1237', 'Томск': '1237', 'Кемерово': '1237', 'Новокузнецк': '1237',
    'Чита': '1237', 'Улан-Удэ': '1237', 'Абакан': '1237', 'Кызыл': '1237',
    // Уральский ФО
    'Екатеринбург': '1090', 'Челябинск': '1090', 'Тюмень': '1090', 'Сургут': '1090',
    'Нижний Тагил': '1090', 'Магнитогорск': '1090', 'Курган': '1090',
    'Ханты-Мансийск': '1090', 'Салехард': '1090',
    // Южный ФО
    'Краснодар': '593', 'Ростов-на-Дону': '593', 'Волгоград': '593', 'Астрахань': '593',
    'Ставрополь': '593', 'Сочи': '593', 'Новороссийск': '593', 'Симферополь': '593',
    'Севастополь': '593', 'Элиста': '593', 'Майкоп': '593',
    // Северо-Кавказский ФО
    'Махачкала': '755', 'Грозный': '755', 'Владикавказ': '755', 'Нальчик': '755',
    'Пятигорск': '755', 'Черкесск': '755', 'Назрань': '755',
    // Дальневосточный ФО
    'Хабаровск': '1419', 'Владивосток': '1419', 'Якутск': '1419', 'Благовещенск': '1419',
    'Южно-Сахалинск': '1419', 'Петропавловск-Камчатский': '1419', 'Магадан': '1419',
};

function getDistrictByCity(city) {
    if (!city) return null;
    for (const [key, val] of Object.entries(CITY_TO_DISTRICT)) {
        if (city.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return null;
}

// Ближайшие турниры по округу пользователя
app.get('/api/rtt/nearby-tournaments/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const userResult = await pool.query('SELECT city, rtt_category FROM users WHERE id = $1', [userId]);
        if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

        const { city, rtt_category } = userResult.rows[0];
        const district = getDistrictByCity(city);

        const filters = {};
        if (district) filters.district = district;

        const data = await rttParser.getTournamentsList(filters);
        if (!data.success) return res.status(500).json({ error: data.error });

        // Берём ближайшие 10 турниров (сортируем по дате)
        const sorted = data.data.tournaments
            .filter(t => t.startDate)
            .sort((a, b) => {
                const parseDate = d => {
                    const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
                    return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : new Date(0);
                };
                return parseDate(a.startDate) - parseDate(b.startDate);
            })
            .slice(0, 10);

        res.json({ success: true, district, city, tournaments: sorted });
    } catch (err) {
        console.error('nearby-tournaments error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get player full stats (tournaments and matches)
app.get('/api/rtt/stats/:rni', async (req, res) => {
    const { rni } = req.params;
    
    try {
        if (!rni) {
            return res.status(400).json({ error: 'РНИ обязателен' });
        }

        const playerData = await rttParser.getPlayerByRNI(rni);
        
        if (!playerData.success) {
            return res.status(404).json(playerData);
        }

        const statsData = await rttParser.getPlayerTournamentsAndMatches(rni);

        res.json({
            success: true,
            data: {
                ...playerData.data,
                tournaments: statsData.data.tournaments,
                matches: statsData.data.matches
            }
        });

    } catch (err) {
        console.error('❌ RTT Stats Error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении статистики: ' + err.message 
        });
    }
});

// Get tournament details
app.get('/api/rtt/tournament', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                success: false,
                error: 'URL турнира не указан' 
            });
        }

        let parsedUrl;
        try { parsedUrl = new URL(url); } catch { return res.status(400).json({ success: false, error: 'Некорректный URL' }); }
        if (!['rttstat.ru', 'www.rttstat.ru'].includes(parsedUrl.hostname)) {
            return res.status(400).json({ success: false, error: 'Недопустимый домен' });
        }

        console.log('🎾 Запрос детальной информации о турнире:', url);
        const result = await rttParser.getTournamentDetails(url);
        res.json(result);
    } catch (err) {
        console.error('❌ RTT Tournament Error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении информации о турнире: ' + err.message 
        });
    }
});

// Get tournaments list with filters
app.get('/api/rtt/tournaments', async (req, res) => {
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(504).json({
                success: false,
                error: 'RTT не ответил вовремя при загрузке турниров',
                data: { tournaments: [], filters: {} }
            });
        }
    }, 20000);

    try {
        const { age, g, l1, l2, l3 } = req.query;
        const result = await rttParser.getTournamentsList({ age, gender: g, district: l1, subject: l2, city: l3 });
        clearTimeout(timeout);
        if (!res.headersSent) res.json(result);
    } catch (err) {
        clearTimeout(timeout);
        console.error('❌ RTT Tournaments List Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении списка турниров РТТ',
                data: { tournaments: [], filters: {} }
            });
        }
    }
});

// Check RTT service availability
app.get('/api/rtt/status', async (req, res) => {
    try {
        const isAvailable = await rttParser.checkAvailability();
        res.json({ 
            available: isAvailable,
            message: isAvailable ? 'RTT сервис доступен' : 'RTT сервис недоступен'
        });
    } catch (err) {
        res.status(500).json({ 
            available: false,
            message: 'Ошибка проверки статуса RTT'
        });
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

// Get unread support message count for a user (without marking as read)
app.get('/api/support/unread/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) return res.status(400).json({ error: 'Invalid user ID' });

        const result = await pool.query(
            `SELECT COUNT(*) as count FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE (c.user1_id = $1 OR c.user2_id = $1)
               AND m.sender_id != $1
               AND m.is_read = FALSE`,
            [parsedUserId]
        );
        res.json({ unread: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Error fetching unread support count:', err);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// User or Admin: Get message history for a support conversation
app.get('/api/support/history/:userId/:partnerId', async (req, res) => {
    const { userId, partnerId } = req.params;
    const markRead = req.query.markRead !== 'false';
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

        // Mark messages as read only when actually viewing the chat
        if (markRead) {
            await pool.query(
                `UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2`,
                [conversationId, parsedUserId]
            );
        }

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

        // --- AI AUTO-REPLY via DeepSeek (fire-and-forget, only for user messages) ---
        if (senderRole !== 'admin' && process.env.DEEPSEEK_API_KEY) {
            (async () => {
                try {
                    // Fetch last 10 messages for context
                    const historyRes = await pool.query(
                        `SELECT m.text, m.sender_id, u.role
                         FROM messages m
                         JOIN users u ON u.id = m.sender_id
                         WHERE m.conversation_id = $1
                         ORDER BY m.created_at DESC LIMIT 10`,
                        [conversationId]
                    );
                    const history = historyRes.rows.reverse();
                    const aiMessages = [
                        {
                            role: 'system',
                            content: `Ты — дружелюбный и внимательный помощник поддержки платформы NAKORTE (сайт nakorte.ru).
NAKORTE — это теннисная платформа для любителей и профессионалов в России.

Отвечай ТОЛЬКО на русском языке. Будь кратким, конкретным и дружелюбным.
Никогда не называй себя TennisApp, OpenAI, DeepSeek или другим именем — ты помощник NAKORTE.
Если не знаешь точного ответа — скажи что уточнишь у оператора и попросишь его ответить.
Не придумывай данные конкретного пользователя, которых у тебя нет.
ВАЖНО: не используй markdown-разметку в ответах (никаких **, *, # и т.д.) — пиши обычным текстом.

=== ФУНКЦИИ ПЛАТФОРМЫ NAKORTE ===

ПОИСК ПАРТНЁРА
— Поиск теннисных партнёров по городу, уровню NTRP и имени
— Фильтр «Только РТТ» — показывает игроков с рейтингом РТТ
— Можно написать партнёру в чат или бросить вызов на матч

КОРТЫ
— Поиск теннисных кортов по городу и названию
— Бронирование корта через платформу

ТУРНИРЫ
— Внутренние турниры платформы
— Интеграция с турнирами РТТ (Российский Теннисный Тур) — синхронизация результатов
— Подача заявок, сетки, стадии, результаты матчей

РЕЙТИНГ / ЛЕСТНИЦА
— Клубный рейтинг (Club ELO) — начисляется за матчи внутри платформы
— Рейтинг РТТ — официальный рейтинг для верифицированных игроков

ПРОФИЛЬ
— Редактирование имени, города, уровня NTRP, аватара
— Статистика: матчи, победы, XP, рейтинг
— Карта прогресса по навыкам (подача, форхенд, бэкхенд и т.д.)
— Дневник тенниса — записи тренировок и матчей
— Подключение устройств: Garmin, Samsung Watch, Apple Watch (в разработке)

ТАКТИКА (3D-корт)
— Интерактивная 3D-модель теннисного корта
— Инструмент для отработки тактики и стратегии игры
— Можно расставлять игроков, прокладывать траектории мячей, разбирать розыгрыши
— Помогает тренерам и игрокам визуализировать и планировать тактические схемы

AI-ТРЕНЕР
— Персональные советы по технике, тактике и физподготовке от искусственного интеллекта
— Доступен в разделе «AI-тренер» в личном кабинете

РАСПИСАНИЕ
— Умное расписание тренировок
— Планирование занятий с тренером

СООБЩЕСТВО
— Лента активности, группы по интересам

ЧАТЫ
— Личные сообщения с другими игроками
— Чат поддержки (этот чат)

ТРЕНЕР / CRM
— Тренеры могут вести список учеников, планировать занятия, отслеживать прогресс

PRO-ПОДПИСКА
— Расширенные функции для тренеров и серьёзных игроков, подробности на странице /pro

=== УРОВНИ ИГРОКОВ (NTRP) ===
2.0 — Новичок, 3.0 — Начальный, 3.5 — Средний, 4.0 — Продвинутый, 4.5 — Полупрофи, 5.0+ — Профи/РТТ

=== РОЛИ ПОЛЬЗОВАТЕЛЕЙ ===
amateur — обычный игрок-любитель
coach — тренер (доступен CRM)
rtt_pro — игрок с официальным рейтингом РТТ (верифицирован)
admin — администратор платформы`
                        },
                        ...history.map(m => ({
                            role: m.role === 'admin' ? 'assistant' : 'user',
                            content: m.text
                        }))
                    ];

                    // Small delay for natural feel
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    const completion = await deepseek.chat.completions.create({
                        model: 'deepseek-chat',
                        messages: aiMessages,
                        max_tokens: 300,
                        temperature: 0.7,
                    });

                    const aiReply = completion.choices?.[0]?.message?.content?.trim();
                    if (aiReply) {
                        await pool.query(
                            'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3)',
                            [conversationId, SUPPORT_ADMIN_ID, aiReply]
                        );
                        await pool.query(
                            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                            [conversationId]
                        );
                    }
                } catch (aiErr) {
                    console.error('Support AI auto-reply error:', aiErr.message);
                }
            })();
        }
        // --- END AI AUTO-REPLY ---

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error sending support message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    } finally {
        client.release();
    }
});


// --- ONLINE PRESENCE ---

// Добавляем колонку last_seen если её ещё нет
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP`).catch(() => {});

// Добавляем колонку last_login если её ещё нет
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`).catch(() => {});

// Добавляем колонку avatar в groups если её ещё нет
pool.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS avatar TEXT`).catch(() => {});

// Добавляем RTT tracking-поля в tournaments, если их ещё нет
pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS stage_status VARCHAR(255)`).catch(() => {});
pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rtt_link TEXT`).catch(() => {});

// Создаём таблицу ghost_users если не существует
pool.query(`
    CREATE TABLE IF NOT EXISTS ghost_users (
        id           SERIAL PRIMARY KEY,
        name         TEXT NOT NULL,
        city         TEXT,
        level        TEXT,
        age          INTEGER,
        role         TEXT DEFAULT 'player',
        rating       INTEGER DEFAULT 1000,
        xp           INTEGER DEFAULT 0,
        rtt_rank     INTEGER,
        rtt_category TEXT,
        avatar       TEXT,
        is_ghost     BOOLEAN DEFAULT TRUE
    )
`).catch(() => {});

// Пинг: обновляет last_seen текущего пользователя (вызывается с фронта каждые 30 сек)
app.post('/api/users/ping', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
        await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление своего профиля (без прав админа)
app.put('/api/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const requestUserId = req.headers['x-user-id'];
    if (!requestUserId || String(requestUserId) !== String(id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, city, age, avatar, xp, is_private, notifications_enabled } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (name !== undefined) await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
        if (city !== undefined) await client.query('UPDATE users SET city = $1 WHERE id = $2', [city, id]);
        if (age !== undefined) await client.query('UPDATE users SET age = $1 WHERE id = $2', [age, id]);
        if (avatar !== undefined) await client.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, id]);
        if (xp !== undefined) await client.query('UPDATE users SET xp = $1 WHERE id = $2', [xp, id]);
        if (is_private !== undefined) await client.query('UPDATE users SET is_private = $1 WHERE id = $2', [is_private, id]);
        if (notifications_enabled !== undefined) await client.query('UPDATE users SET notifications_enabled = $1 WHERE id = $2', [notifications_enabled, id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/users/:id/wearables', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    try {
        const result = await pool.query(
            `SELECT provider, status, external_user_id, connected_at, last_synced_at, metadata
             FROM wearable_connections
             WHERE user_id = $1`,
            [req.params.id]
        );

        res.json(buildWearableConnectionsResponse(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/wearables/activities', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    const limit = clampInteger(req.query.limit, 1, 50, 12);
    const provider = req.query.provider ? String(req.query.provider) : null;

    if (provider && !WEARABLE_ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({ error: 'Unsupported wearable provider' });
    }

    try {
        const activityResult = await pool.query(
            `SELECT id, provider, external_activity_id, activity_type, title, started_at, ended_at,
                    duration_seconds, distance_km, calories, average_heart_rate, max_heart_rate,
                    steps, source_device, metadata, created_at
             FROM wearable_activities
             WHERE user_id = $1
               AND ($2::text IS NULL OR provider = $2)
             ORDER BY COALESCE(started_at, created_at) DESC
             LIMIT $3`,
            [req.params.id, provider, limit]
        );

        const summaryResult = await pool.query(
            `SELECT COUNT(*)::int AS activity_count,
                    COALESCE(SUM(duration_seconds), 0)::int AS duration_seconds,
                    COALESCE(SUM(distance_km), 0)::numeric AS distance_km,
                    COALESCE(SUM(calories), 0)::int AS calories,
                    COALESCE(MAX(COALESCE(started_at, created_at)), NULL) AS latest_activity_at
             FROM wearable_activities
             WHERE user_id = $1
               AND ($2::text IS NULL OR provider = $2)
               AND COALESCE(started_at, created_at) >= NOW() - INTERVAL '30 days'`,
            [req.params.id, provider]
        );

        const summary = summaryResult.rows[0] || {};
        res.json({
            activities: activityResult.rows.map(normalizeWearableActivityRow),
            summary: {
                activityCount: Number(summary.activity_count || 0),
                durationSeconds: Number(summary.duration_seconds || 0),
                distanceKm: Number(summary.distance_km || 0),
                calories: Number(summary.calories || 0),
                latestActivityAt: summary.latest_activity_at ? new Date(summary.latest_activity_at).toISOString() : null,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/wearables/garmin/start', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    if (!isGarminOAuthConfigured()) {
        await pool.query(
            `INSERT INTO wearable_connections (user_id, provider, status, metadata, updated_at)
             VALUES ($1, 'garmin', 'setup_required', $2::jsonb, NOW())
             ON CONFLICT (user_id, provider)
             DO UPDATE SET status = 'setup_required', metadata = EXCLUDED.metadata, updated_at = NOW()`,
            [req.params.id, JSON.stringify({ message: 'Garmin OAuth ещё не настроен на сервере.' })]
        );

        return res.status(501).json({ error: 'Garmin OAuth is not configured on the server yet.' });
    }

    const state = crypto.randomUUID();
    const authorizeUrl = new URL(process.env.GARMIN_OAUTH_AUTHORIZE_URL);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', process.env.GARMIN_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', process.env.GARMIN_OAUTH_CALLBACK_URL);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', process.env.GARMIN_OAUTH_SCOPE || 'activity wellness');

    await pool.query(
        `INSERT INTO wearable_connections (user_id, provider, status, metadata, updated_at)
         VALUES ($1, 'garmin', 'pending', $2::jsonb, NOW())
         ON CONFLICT (user_id, provider)
         DO UPDATE SET status = 'pending', metadata = EXCLUDED.metadata, updated_at = NOW()`,
        [req.params.id, JSON.stringify({ oauth_state: state, message: 'Ожидаем подтверждение Garmin OAuth.' })]
    );

    res.json({ authUrl: authorizeUrl.toString() });
});

app.post('/api/users/:id/wearables/garmin/sync', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    if (!isGarminActivitySyncConfigured()) {
        return res.status(501).json({ error: 'Garmin activities endpoint is not configured on the server yet.' });
    }

    try {
        const lookup = await pool.query(
            `SELECT id, user_id, provider, status, access_token, refresh_token, token_expires_at, metadata
             FROM wearable_connections
             WHERE user_id = $1 AND provider = 'garmin'
             LIMIT 1`,
            [req.params.id]
        );

        if (lookup.rowCount === 0) {
            return res.status(404).json({ error: 'Garmin is not connected yet.' });
        }

        let connection = lookup.rows[0];
        if (connection.status !== 'connected' && connection.status !== 'pending') {
            return res.status(400).json({ error: 'Garmin connection is not ready for sync.' });
        }

        connection = await ensureGarminAccessToken(connection);

        const days = clampInteger(req.body?.days, 1, 90, 30);
        const limit = clampInteger(req.body?.limit, 1, 100, 25);
        const activitiesUrl = new URL(process.env.GARMIN_ACTIVITIES_URL);
        activitiesUrl.searchParams.set('limit', String(limit));
        activitiesUrl.searchParams.set('days', String(days));
        activitiesUrl.searchParams.set('startDate', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

        let activityResponse = await fetch(activitiesUrl, {
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                Accept: 'application/json',
            },
        });

        if (activityResponse.status === 401 && connection.refresh_token) {
            connection = await refreshGarminAccessToken(connection);
            activityResponse = await fetch(activitiesUrl, {
                headers: {
                    Authorization: `Bearer ${connection.access_token}`,
                    Accept: 'application/json',
                },
            });
        }

        const activityPayload = await activityResponse.json().catch(() => ({}));
        if (!activityResponse.ok) {
            await pool.query(
                `UPDATE wearable_connections
                 SET metadata = $2::jsonb, updated_at = NOW()
                 WHERE id = $1`,
                [connection.id, JSON.stringify({ ...(connection.metadata || {}), message: 'Не удалось синхронизировать Garmin.' })]
            );
            return res.status(activityResponse.status).json({ error: activityPayload.error || activityPayload.message || 'Garmin sync failed' });
        }

        const normalizedActivities = extractActivitiesFromPayload(activityPayload)
            .map((item) => normalizeWearableActivityPayload('garmin', item))
            .filter((activity) => activity.startedAt || activity.durationSeconds !== null || activity.distanceKm !== null);

        const syncedCount = await saveWearableActivities(req.params.id, 'garmin', normalizedActivities);
        const metadata = {
            ...(connection.metadata || {}),
            message: syncedCount > 0 ? `Garmin синхронизирован: ${syncedCount} активностей.` : 'Garmin синхронизирован, новых активностей нет.',
            lastSyncResult: {
                syncedCount,
                syncedAt: new Date().toISOString(),
            }
        };

        await pool.query(
            `UPDATE wearable_connections
             SET status = 'connected', last_synced_at = NOW(), metadata = $2::jsonb, updated_at = NOW()
             WHERE id = $1`,
            [connection.id, JSON.stringify(metadata)]
        );

        res.json({
            success: true,
            syncedCount,
            message: metadata.message,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/integrations/garmin/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const redirectBase = `${getFrontendBaseUrl().replace(/\/$/, '')}/?integration=garmin`;

    if (error) {
        return res.redirect(`${redirectBase}&status=error&message=${encodeURIComponent(String(error))}`);
    }

    if (!code || !state) {
        return res.redirect(`${redirectBase}&status=error&message=${encodeURIComponent('Missing Garmin OAuth code/state')}`);
    }

    try {
        const lookup = await pool.query(
            `SELECT user_id, metadata
             FROM wearable_connections
             WHERE provider = 'garmin' AND metadata->>'oauth_state' = $1
             LIMIT 1`,
            [String(state)]
        );

        if (lookup.rowCount === 0) {
            return res.redirect(`${redirectBase}&status=error&message=${encodeURIComponent('Garmin OAuth state not found')}`);
        }

        const connection = lookup.rows[0];
        const tokenResponse = await fetch(process.env.GARMIN_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: process.env.GARMIN_OAUTH_CALLBACK_URL,
                client_id: process.env.GARMIN_CLIENT_ID,
                client_secret: process.env.GARMIN_CLIENT_SECRET,
            }),
        });

        const tokenPayload = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok) {
            await pool.query(
                `UPDATE wearable_connections
                 SET status = 'error', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{message}', to_jsonb($2::text), true), updated_at = NOW()
                 WHERE user_id = $1 AND provider = 'garmin'`,
                [connection.user_id, tokenPayload.error_description || tokenPayload.error || 'Garmin token exchange failed']
            );
            return res.redirect(`${redirectBase}&status=error&message=${encodeURIComponent(tokenPayload.error_description || tokenPayload.error || 'Garmin token exchange failed')}`);
        }

        const expiresInSeconds = Number(tokenPayload.expires_in || 0);
        const tokenExpiry = expiresInSeconds > 0 ? new Date(Date.now() + expiresInSeconds * 1000) : null;
        await pool.query(
            `UPDATE wearable_connections
             SET status = 'connected',
                 access_token = $2,
                 refresh_token = $3,
                 token_expires_at = $4,
                 external_user_id = COALESCE($5, external_user_id),
                 connected_at = COALESCE(connected_at, NOW()),
                 metadata = $6::jsonb,
                 updated_at = NOW()
             WHERE user_id = $1 AND provider = 'garmin'`,
            [
                connection.user_id,
                tokenPayload.access_token || null,
                tokenPayload.refresh_token || null,
                tokenExpiry,
                tokenPayload.user_id || tokenPayload.sub || null,
                JSON.stringify({ message: 'Garmin успешно подключён.' })
            ]
        );

        res.redirect(`${redirectBase}&status=success`);
    } catch (err) {
        res.redirect(`${redirectBase}&status=error&message=${encodeURIComponent(err.message || 'Garmin callback failed')}`);
    }
});

app.post('/api/users/:id/wearables/samsung-watch/start', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    const bridgeToken = createWearableBridgeToken();
    const bridgeTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const bridgeIngestUrl = `${getPublicApiBaseUrl(req)}/integrations/samsung-watch/ingest`;
    const onboardingUrl = buildSamsungBridgeOnboardingUrl(req, {
        bridgeToken,
        bridgeIngestUrl,
        bridgeTokenExpiresAt
    });
    const qrCodeDataUrl = await QRCode.toDataURL(onboardingUrl, {
        margin: 1,
        width: 320,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        }
    });
    const bridgeMetadata = {
        message: 'Bridge-ключ создан. Передайте его в Android bridge для Samsung Health.',
        bridgeTokenHash: buildWearableSecretHash(bridgeToken),
        bridgeTokenPreview: maskWearableBridgeToken(bridgeToken),
        bridgeTokenExpiresAt,
        bridgeIngestUrl
    };

    await pool.query(
        `INSERT INTO wearable_connections (user_id, provider, status, metadata, updated_at)
         VALUES ($1, 'samsung_watch', 'bridge_required', $2::jsonb, NOW())
         ON CONFLICT (user_id, provider)
         DO UPDATE SET status = 'bridge_required', metadata = EXCLUDED.metadata, updated_at = NOW()`,
        [req.params.id, JSON.stringify(bridgeMetadata)]
    );

    res.json({
        success: true,
        message: bridgeMetadata.message,
        bridgeToken,
        bridgeTokenPreview: bridgeMetadata.bridgeTokenPreview,
        expiresAt: bridgeTokenExpiresAt,
                ingestUrl: bridgeMetadata.bridgeIngestUrl,
                onboardingUrl,
                qrCodeDataUrl
    });
});

app.get('/api/integrations/samsung-watch/onboard', async (req, res) => {
        const token = String(req.query.token || '');
        const ingestUrl = String(req.query.ingestUrl || '');
        const expiresAt = String(req.query.expiresAt || '');

        if (!token || !ingestUrl || !expiresAt) {
                return res.status(400).send('Samsung bridge onboarding data is incomplete.');
        }

        const safeIngestUrl = ingestUrl.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeToken = token.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeExpiresAt = expiresAt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const samplePayload = JSON.stringify({
                bridgeToken: token,
                externalUserId: 'samsung-health-user-id',
                activities: [
                        {
                                id: 'session-123',
                                activityType: 'tennis',
                                title: 'Тренировка Samsung Health',
                                startTime: new Date().toISOString(),
                                durationSeconds: 3600,
                                calories: 540,
                                averageHeartRate: 138,
                                steps: 6200,
                        }
                ]
        }, null, 2)
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Samsung Watch Bridge Setup</title>
    <style>
        body { font-family: Inter, system-ui, -apple-system, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
        .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 20px; box-shadow: 0 8px 30px rgba(15,23,42,.05); }
        .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #ecfccb; color: #365314; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
        code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        pre { background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 18px; overflow: auto; font-size: 12px; }
        .muted { color: #475569; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 6px; }
        .value { font-weight: 700; word-break: break-all; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="pill">Samsung Watch Bridge</div>
            <h1>Подключение через мобильник</h1>
            <p class="muted">Этот QR не синхронизирует часы сам по себе — он передаёт конфиг мобильному bridge, который уже читает Samsung Health и отправляет активности в backend.</p>

            <div style="margin-top:20px;">
                <div class="label">Bridge token</div>
                <div class="value">${safeToken}</div>
            </div>

            <div style="margin-top:16px;">
                <div class="label">POST endpoint</div>
                <div class="value">${safeIngestUrl}</div>
            </div>

            <div style="margin-top:16px;">
                <div class="label">Действует до</div>
                <div class="value">${safeExpiresAt}</div>
            </div>

            <div style="margin-top:20px;">
                <div class="label">Пример payload для mobile bridge</div>
                <pre>${samplePayload}</pre>
            </div>
        </div>
    </div>
</body>
</html>`);
});

app.post('/api/integrations/samsung-watch/ingest', async (req, res) => {
    const bridgeToken = req.headers['x-bridge-token'] || req.body?.bridgeToken;
    if (!bridgeToken) {
        return res.status(401).json({ error: 'Samsung bridge token is required.' });
    }

    try {
        const tokenHash = buildWearableSecretHash(String(bridgeToken));
        const lookup = await pool.query(
            `SELECT id, user_id, metadata, connected_at
             FROM wearable_connections
             WHERE provider = 'samsung_watch'
               AND metadata->>'bridgeTokenHash' = $1
             LIMIT 1`,
            [tokenHash]
        );

        if (lookup.rowCount === 0) {
            return res.status(401).json({ error: 'Samsung bridge token is invalid.' });
        }

        const connection = lookup.rows[0];
        const expiresAt = parseOptionalDate(connection.metadata?.bridgeTokenExpiresAt);
        if (!expiresAt || expiresAt.getTime() < Date.now()) {
            return res.status(401).json({ error: 'Samsung bridge token has expired.' });
        }

        const payloadActivities = Array.isArray(req.body?.activities)
            ? req.body.activities
            : (req.body?.activity ? [req.body.activity] : []);

        if (!payloadActivities.length) {
            return res.status(400).json({ error: 'No Samsung activities provided.' });
        }

        const normalizedActivities = payloadActivities
            .map((item) => normalizeWearableActivityPayload('samsung_watch', item))
            .filter((activity) => activity.startedAt || activity.durationSeconds !== null || activity.distanceKm !== null);

        const syncedCount = await saveWearableActivities(connection.user_id, 'samsung_watch', normalizedActivities);
        const metadata = {
            ...(connection.metadata || {}),
            message: syncedCount > 0 ? `Samsung Watch синхронизирован: ${syncedCount} активностей.` : 'Samsung Watch синхронизирован, новых активностей нет.',
            lastSyncResult: {
                syncedCount,
                syncedAt: new Date().toISOString(),
                source: 'mobile_bridge'
            }
        };

        await pool.query(
            `UPDATE wearable_connections
             SET status = 'connected',
                 external_user_id = COALESCE($2, external_user_id),
                 connected_at = COALESCE(connected_at, NOW()),
                 last_synced_at = NOW(),
                 metadata = $3::jsonb,
                 updated_at = NOW()
             WHERE id = $1`,
            [
                connection.id,
                req.body?.externalUserId || req.body?.userId || null,
                JSON.stringify(metadata)
            ]
        );

        res.json({ success: true, syncedCount, message: metadata.message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id/wearables/:provider', async (req, res) => {
    if (!requireSelfAccess(req, res)) return;

    const { provider } = req.params;
    if (!WEARABLE_ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({ error: 'Unsupported wearable provider' });
    }

    try {
        await pool.query(
            `DELETE FROM wearable_connections
             WHERE user_id = $1 AND provider = $2`,
            [req.params.id, provider]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/progress', async (req, res) => {
    const { id } = req.params;
    const requestUserId = req.headers['x-user-id'];
    if (!requestUserId || String(requestUserId) !== String(id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const result = await pool.query(
            `SELECT version, skills, goal, updated_at
             FROM player_progress_profiles
             WHERE user_id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.json({ progress: null });
        }

        const row = result.rows[0];
        res.json({
            progress: normalizePlayerProgress({
                version: row.version,
                skills: row.skills || EMPTY_PLAYER_PROGRESS_SKILLS,
                goal: row.goal || {}
            }),
            updatedAt: row.updated_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id/progress', async (req, res) => {
    const { id } = req.params;
    const requestUserId = req.headers['x-user-id'];
    if (!requestUserId || String(requestUserId) !== String(id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const normalizedProgress = normalizePlayerProgress(req.body || {});

    try {
        await pool.query(
            `INSERT INTO player_progress_profiles (user_id, version, skills, goal, updated_at)
             VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
                version = EXCLUDED.version,
                skills = EXCLUDED.skills,
                goal = EXCLUDED.goal,
                updated_at = NOW()`,
            [
                id,
                normalizedProgress.version,
                JSON.stringify(normalizedProgress.skills),
                JSON.stringify(normalizedProgress.goal)
            ]
        );

        res.json({ success: true, progress: normalizedProgress });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Статистика онлайна: реальные (last_seen < 2 мин) и всего зарегистрированных
app.get('/api/users/online-stats', async (req, res) => {
    try {
        const online = await pool.query(
            `SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '2 minutes'`
        );
        const realUsers = await pool.query(`SELECT COUNT(*) FROM users`);
        // Ghost users считаем отдельно (могут отсутствовать таблица)
        let ghostCount = 0;
        try {
            const ghosts = await pool.query(`SELECT COUNT(*) FROM ghost_users`);
            ghostCount = parseInt(ghosts.rows[0].count);
        } catch {}

        res.json({
            online: parseInt(online.rows[0].count),
            total: parseInt(realUsers.rows[0].count) + ghostCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN MIDDLEWARE ---
const requireAdmin = async (req, res, next) => {
    // В dev-режиме можно задать DEV_ADMIN_ID в .env чтобы не менять аккаунт
    const devFallback = process.env.NODE_ENV !== 'production' ? process.env.DEV_ADMIN_ID : null;
    const rawId = req.headers['x-admin-id'] || req.body?.adminId || req.query?.adminId;
    // Если id невалидный (мок, пустой) — используем devFallback
    const parsedId = rawId && /^\d+$/.test(String(rawId)) ? rawId : null;
    const adminId = parsedId || devFallback;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const result = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [adminId]);
        if (!result.rows.length || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden', hint: `User ${adminId} is not admin` });
        }
        req.admin = {
            id: String(result.rows[0].id),
            name: result.rows[0].name,
            email: result.rows[0].email,
            role: result.rows[0].role
        };
        next();
    } catch (e) {
        console.error('requireAdmin error:', e.message);
        return res.status(500).json({ error: 'Auth check failed' });
    }
};

// --- ADMIN ROUTES ---

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const dbStart = Date.now();
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const dbPing = Date.now() - dbStart;

        const newSignups = await pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'");
        const activeToday = await pool.query("SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '1 day'");
        const onlineNow = await pool.query("SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '2 minutes'");
        const dbTimeRes = await pool.query('SELECT NOW() as db_time');

        const uptimeSeconds = Math.floor(process.uptime());
        const uptimeDays = Math.floor(uptimeSeconds / 86400);
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
        const uptimeMins = Math.floor((uptimeSeconds % 3600) / 60);

        const memUsage = process.memoryUsage();
        const v8Stats = v8.getHeapStatistics();
        const heapSizeLimitMb = Math.round(v8Stats.heap_size_limit / 1024 / 1024);

        res.json({
            activeUsers: parseInt(usersCount.rows[0].count),
            newSignups: parseInt(newSignups.rows[0].count),
            activeToday: parseInt(activeToday.rows[0].count),
            onlineNow: parseInt(onlineNow.rows[0].count),
            serverLoad: Math.floor(Math.random() * 20) + 10,
            // Health-check данные
            health: {
                dbPingMs: dbPing,
                dbTime: dbTimeRes.rows[0].db_time,
                nodeVersion: process.version,
                platform: process.platform,
                uptimeSeconds,
                uptimeFormatted: `${uptimeDays}д ${uptimeHours}ч ${uptimeMins}м`,
                memoryUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
                memoryTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapSizeLimitMb: heapSizeLimitMb,
                rssMemoryMb: Math.round(memUsage.rss / 1024 / 1024),
                status: 'ok'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/logs', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 50');
        res.json(await humanizeSystemLogs(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, city, avatar, rating, level, age, rtt_rank, rtt_category, rni, xp FROM users ORDER BY id DESC');
        res.json(result.rows.map(u => ({
            ...u, 
            id: u.id.toString(),
            rttRank: u.rtt_rank,
            rttCategory: u.rtt_category,
            rni: u.rni
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const { name, email, password, role, city, age, rating, level, rttRank, rttCategory, rni } = req.body;
    try {
        const emailValidation = validateEmailAddress(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        const normalizedEmail = emailValidation.normalized;

        const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(BTRIM(email)) = $1', [normalizedEmail]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const plainPassword = password || '123456';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`;
        
        const result = await pool.query(
            `INSERT INTO users (name, email, password, city, avatar, role, rating, age, level, rtt_rank, rtt_category, rni, xp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0) 
             RETURNING id, name, email, role, city, avatar, rating, age, level, rtt_rank, rtt_category, rni, xp`,
            [
                name, 
                normalizedEmail, 
                hashedPassword, 
                city || 'Москва', 
                defaultAvatar, 
                role || 'amateur', 
                rating || 0, 
                age || null, 
                level || '', 
                rttRank || 0, 
                rttCategory || null,
                rni || null
            ]
        );
        const user = result.rows[0];
        await logAdminAction(req, 'info', 'создал', 'пользователя', name || normalizedEmail, `Email: ${normalizedEmail}, роль: ${role || 'amateur'}`);
        res.json({ ...user, id: user.id.toString(), rttRank: user.rtt_rank, rttCategory: user.rtt_category, rni: user.rni });
    } catch (err) {
        console.error("Admin Create User Error:", err);
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role, city, rating, level, rttRank, rttCategory, rni, age, xp, avatar, is_private, notifications_enabled } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (email !== undefined) {
            const emailValidation = validateEmailAddress(email);
            if (!emailValidation.isValid) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: emailValidation.error });
            }

            const duplicateUser = await client.query('SELECT id FROM users WHERE LOWER(BTRIM(email)) = $1 AND id != $2', [emailValidation.normalized, id]);
            if (duplicateUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Email already exists' });
            }

            await client.query('UPDATE users SET email = $1 WHERE id = $2', [emailValidation.normalized, id]);
        }

        if (name !== undefined) await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
        if (role !== undefined) await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        if (city !== undefined) await client.query('UPDATE users SET city = $1 WHERE id = $2', [city, id]);
        if (rating !== undefined) await client.query('UPDATE users SET rating = $1 WHERE id = $2', [rating, id]);
        if (level !== undefined) await client.query('UPDATE users SET level = $1 WHERE id = $2', [level, id]);
        if (rttRank !== undefined) await client.query('UPDATE users SET rtt_rank = $1 WHERE id = $2', [rttRank, id]);
        if (rttCategory !== undefined) await client.query('UPDATE users SET rtt_category = $1 WHERE id = $2', [rttCategory, id]);
        if (rni !== undefined) await client.query('UPDATE users SET rni = $1 WHERE id = $2', [rni || null, id]);
        if (age !== undefined) await client.query('UPDATE users SET age = $1 WHERE id = $2', [age, id]);
        if (xp !== undefined) await client.query('UPDATE users SET xp = $1 WHERE id = $2', [xp, id]);
        if (avatar !== undefined) await client.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, id]);
        if (is_private !== undefined) await client.query('UPDATE users SET is_private = $1 WHERE id = $2', [is_private, id]);
        if (notifications_enabled !== undefined) await client.query('UPDATE users SET notifications_enabled = $1 WHERE id = $2', [notifications_enabled, id]);

        await client.query('COMMIT');
        await logAdminAction(req, 'info', 'обновил', 'пользователя', name || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update user error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});


app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [id]);
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        const userLabel = userResult.rows[0]?.name || userResult.rows[0]?.email || `#${id}`;
        await logAdminAction(req, 'warning', 'удалил', 'пользователя', userLabel, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/groups', requireAdmin, async (req, res) => {
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

app.post('/api/admin/groups', requireAdmin, async (req, res) => {
    const { name, description, location, contact, avatar, creatorId } = req.body;
    if (!name || !creatorId) {
        return res.status(400).json({ error: 'Name and creatorId are required' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const groupResult = await client.query(
            'INSERT INTO groups (name, description, location, contact, avatar, creator_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, location, contact, avatar || null, creatorId]
        );
        const newGroup = groupResult.rows[0];
        await client.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [newGroup.id, creatorId, 'admin']
        );
        await client.query('COMMIT');
        await logAdminAction(req, 'info', 'создал', 'группу', name, `Создатель группы ID: ${creatorId}`);
        res.status(201).json({ ...newGroup, id: newGroup.id.toString() });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Admin Create Group Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/admin/groups/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, location, contact, avatar } = req.body;
    try {
        const result = await pool.query(
            'UPDATE groups SET name = $1, description = $2, location = $3, contact = $4, avatar = $5 WHERE id = $6 RETURNING *',
            [name, description, location, contact, avatar || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        await logAdminAction(req, 'info', 'обновил', 'группу', name || `#${id}`, `ID: ${id}`);
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Admin Update Group Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/groups/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const groupResult = await client.query('SELECT name FROM groups WHERE id = $1', [id]);
        await client.query('DELETE FROM group_members WHERE group_id = $1', [id]);
        await client.query('DELETE FROM posts WHERE group_id = $1', [id]);
        await client.query('DELETE FROM groups WHERE id = $1', [id]);
        await client.query('COMMIT');
        await logAdminAction(req, 'warning', 'удалил', 'группу', groupResult.rows[0]?.name || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Admin Delete Group Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/admin/tournaments', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tournaments ORDER BY start_date DESC NULLS LAST, id DESC');
        res.json(result.rows.map(t => ({ ...t, id: t.id.toString() })));
    } catch (err) {
        console.error("Admin Get Tournaments Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/tournaments', requireAdmin, async (req, res) => {
    const { 
        name, groupName, prizePool, status, type, target_group_id, rounds, userId,
        category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate, stageStatus, rttLink 
    } = req.body;
    const normalizedStageStatus = normalizeTournamentStageStatus(stageStatus || '');
    try {
        const result = await pool.query(
            `INSERT INTO tournaments (
                user_id, name, group_name, prize_pool, status, type, target_group_id, rounds,
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date, stage_status, rtt_link
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [
                userId, name, groupName, prizePool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate, normalizedStageStatus, rttLink || null
            ]
        );
        await logAdminAction(req, 'info', 'создал', 'турнир', name, status ? `Статус: ${status}` : '');
        const newTournament = result.rows[0];
        res.status(201).json({ ...newTournament, id: newTournament.id.toString() });
    } catch (err) {
        console.error("Admin Create Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/tournaments/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { 
        name, groupName, prizePool, status, type, target_group_id, rounds,
        category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate, stageStatus, rttLink
    } = req.body;
    const normalizedStageStatus = normalizeTournamentStageStatus(stageStatus || '');
    try {
        // Safely serialize rounds: avoid double-serialization if already a string
        let roundsJson = null;
        if (rounds !== undefined && rounds !== null) {
            roundsJson = typeof rounds === 'string' ? rounds : JSON.stringify(rounds);
        }

        // Build query dynamically: only update rounds if explicitly provided
        let query, params;
        if (roundsJson !== null) {
            query = `UPDATE tournaments 
                 SET name = $1, group_name = $2, prize_pool = $3, status = $4, type = $5, target_group_id = $6, rounds = $7,
                     category = $8, tournament_type = $9, gender = $10, age_group = $11, system = $12, match_format = $13, start_date = $14, end_date = $15,
                     stage_status = COALESCE($16, stage_status), rtt_link = COALESCE($17, rtt_link)
                 WHERE id = $18 RETURNING *`;
            params = [name, groupName, prizePool, status, type, target_group_id, roundsJson,
                category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate, normalizedStageStatus, rttLink || null, id];
        } else {
            // Don't overwrite rounds — only update meta fields
            query = `UPDATE tournaments 
                 SET name = $1, group_name = $2, prize_pool = $3, status = $4, type = $5, target_group_id = $6,
                     category = $7, tournament_type = $8, gender = $9, age_group = $10, system = $11, match_format = $12, start_date = $13, end_date = $14,
                     stage_status = COALESCE($15, stage_status), rtt_link = COALESCE($16, rtt_link)
                 WHERE id = $17 RETURNING *`;
            params = [name, groupName, prizePool, status, type, target_group_id,
                category, tournamentType, gender, ageGroup, system, matchFormat, startDate, endDate, normalizedStageStatus, rttLink || null, id];
        }

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        await logAdminAction(req, 'info', 'обновил', 'турнир', name || `#${id}`, `ID: ${id}${status ? `, статус: ${status}` : ''}`);
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Admin Update Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/tournaments/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const tournamentResult = await pool.query('SELECT name FROM tournaments WHERE id = $1', [id]);
        await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
        await logAdminAction(req, 'warning', 'удалил', 'турнир', tournamentResult.rows[0]?.name || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Admin Delete Tournament Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/director/tournaments', requireTournamentDirector, async (req, res) => {
    try {
        const targetUserId = req.tournamentDirector.role === 'admin' && /^\d+$/.test(String(req.query.userId || ''))
            ? String(req.query.userId)
            : req.tournamentDirector.id;

        const result = await pool.query(
            `SELECT
                t.*,
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id) AS total_applications_count,
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'pending') AS pending_applications_count,
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'approved') AS approved_applications_count,
                (tr.id IS NOT NULL) AS has_regulation,
                tr.file_name AS regulation_file_name,
                tr.updated_at AS regulation_uploaded_at
             FROM tournaments t
             LEFT JOIN tournament_regulations tr ON tr.tournament_id = t.id
             WHERE t.user_id = $1
             ORDER BY t.start_date DESC NULLS LAST, t.id DESC`,
            [targetUserId]
        );

        res.json(result.rows.map(mapDirectorTournamentRow));
    } catch (error) {
        console.error('Director tournaments fetch error:', error);
        res.status(500).json({ error: 'Не удалось получить турниры директора' });
    }
});

app.post('/api/director/tournaments', requireTournamentDirector, async (req, res) => {
    const payload = buildDirectorTournamentPayload(req.body, req.tournamentDirector);
    const regulationSource = req.body.regulationFile?.dataUrl || req.body.regulation_file?.dataUrl || null;
    const regulationFileName = String(req.body.regulationFile?.fileName || req.body.regulation_file?.fileName || '').trim();

    if (!payload.name) {
        return res.status(400).json({ error: 'Укажите название турнира' });
    }

    if (!payload.startDate || !payload.endDate) {
        return res.status(400).json({ error: 'Укажите даты проведения турнира' });
    }

    if (!payload.directorName || !payload.directorPhone || !payload.directorEmail) {
        return res.status(400).json({ error: 'Заполните контакты директора турнира' });
    }

    if (!payload.clubName || !payload.surface || !payload.category || !payload.gender || !payload.participantsCount) {
        return res.status(400).json({ error: 'Заполните клуб, покрытие, категорию, пол и количество участников' });
    }

    const parsedRegulation = regulationSource ? parsePdfDataUrl(regulationSource) : null;
    if (regulationSource && !parsedRegulation) {
        return res.status(400).json({ error: 'Регламент должен быть загружен в формате PDF' });
    }

    if (parsedRegulation && parsedRegulation.fileSize > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Размер PDF не должен превышать 5 МБ' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tournamentResult = await client.query(
            `INSERT INTO tournaments (
                user_id, name, prize_pool, status, type, rounds,
                category, tournament_type, gender, match_format, start_date, end_date, participants_count,
                director_name, director_phone, director_email, director_telegram, director_max, entry_fee, club_name, court_name, address, surface
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            ) RETURNING *`,
            [
                req.tournamentDirector.id,
                payload.name,
                payload.prizePool,
                payload.status,
                'single_elimination',
                JSON.stringify([]),
                payload.category,
                payload.tournamentType,
                payload.gender,
                payload.matchFormat,
                payload.startDate,
                payload.endDate,
                payload.participantsCount,
                payload.directorName,
                payload.directorPhone,
                payload.directorEmail,
                payload.directorTelegram,
                payload.directorMax,
                payload.entryFee,
                payload.clubName,
                payload.courtName,
                payload.address,
                payload.surface
            ]
        );

        const createdTournament = tournamentResult.rows[0];

        if (parsedRegulation) {
            await client.query(
                `INSERT INTO tournament_regulations (tournament_id, file_name, mime_type, file_size, file_data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    createdTournament.id,
                    regulationFileName || `${payload.name}.pdf`,
                    parsedRegulation.mimeType,
                    parsedRegulation.fileSize,
                    parsedRegulation.fileData
                ]
            );
        }

        await client.query('COMMIT');
        await logSystemEvent('info', `Директор турниров «${req.tournamentDirector.name}» создал турнир «${payload.name}»`, 'Tournaments');

        res.status(201).json(mapDirectorTournamentRow({
            ...createdTournament,
            has_regulation: Boolean(parsedRegulation),
            regulation_file_name: parsedRegulation ? (regulationFileName || `${payload.name}.pdf`) : null,
            regulation_uploaded_at: parsedRegulation ? new Date().toISOString() : null
        }));
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Director tournament create error:', error);
        res.status(500).json({ error: 'Не удалось создать турнир' });
    } finally {
        client.release();
    }
});

app.put('/api/director/tournaments/:id', requireTournamentDirector, async (req, res) => {
    const { id } = req.params;
    const access = await ensureDirectorTournamentAccess(id, req.tournamentDirector);
    if (access.error) {
        return res.status(access.error.status).json({ error: access.error.message });
    }

    const payload = buildDirectorTournamentPayload(req.body, req.tournamentDirector);
    const regulationSource = req.body.regulationFile?.dataUrl || req.body.regulation_file?.dataUrl || null;
    const regulationFileName = String(req.body.regulationFile?.fileName || req.body.regulation_file?.fileName || '').trim();
    const removeRegulation = Boolean(req.body.removeRegulation || req.body.remove_regulation);
    const parsedRegulation = regulationSource ? parsePdfDataUrl(regulationSource) : null;

    if (!payload.name) {
        return res.status(400).json({ error: 'Укажите название турнира' });
    }

    if (!payload.startDate || !payload.endDate) {
        return res.status(400).json({ error: 'Укажите даты проведения турнира' });
    }

    if (!payload.directorName || !payload.directorPhone || !payload.directorEmail) {
        return res.status(400).json({ error: 'Заполните контакты директора турнира' });
    }

    if (!payload.clubName || !payload.surface || !payload.category || !payload.gender || !payload.participantsCount) {
        return res.status(400).json({ error: 'Заполните клуб, покрытие, категорию, пол и количество участников' });
    }

    if (regulationSource && !parsedRegulation) {
        return res.status(400).json({ error: 'Регламент должен быть загружен в формате PDF' });
    }

    if (parsedRegulation && parsedRegulation.fileSize > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Размер PDF не должен превышать 5 МБ' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE tournaments
             SET name = $1,
                 prize_pool = $2,
                 status = $3,
                 category = $4,
                 tournament_type = $5,
                 gender = $6,
                 match_format = $7,
                 start_date = $8,
                 end_date = $9,
                 participants_count = $10,
                 director_name = $11,
                 director_phone = $12,
                 director_email = $13,
                 director_telegram = $14,
                 director_max = $15,
                 entry_fee = $16,
                 club_name = $17,
                 court_name = $18,
                 address = $19,
                 surface = $20
             WHERE id = $21 RETURNING *`,
            [
                payload.name,
                payload.prizePool,
                payload.status,
                payload.category,
                payload.tournamentType,
                payload.gender,
                payload.matchFormat,
                payload.startDate,
                payload.endDate,
                payload.participantsCount,
                payload.directorName,
                payload.directorPhone,
                payload.directorEmail,
                payload.directorTelegram,
                payload.directorMax,
                payload.entryFee,
                payload.clubName,
                payload.courtName,
                payload.address,
                payload.surface,
                id
            ]
        );

        if (removeRegulation) {
            await client.query('DELETE FROM tournament_regulations WHERE tournament_id = $1', [id]);
        }

        if (parsedRegulation) {
            await client.query(
                `INSERT INTO tournament_regulations (tournament_id, file_name, mime_type, file_size, file_data, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 ON CONFLICT (tournament_id)
                 DO UPDATE SET
                    file_name = EXCLUDED.file_name,
                    mime_type = EXCLUDED.mime_type,
                    file_size = EXCLUDED.file_size,
                    file_data = EXCLUDED.file_data,
                    updated_at = NOW()`,
                [
                    id,
                    regulationFileName || `${payload.name}.pdf`,
                    parsedRegulation.mimeType,
                    parsedRegulation.fileSize,
                    parsedRegulation.fileData
                ]
            );
        }

        const regulationMeta = await client.query(
            `SELECT file_name, updated_at FROM tournament_regulations WHERE tournament_id = $1`,
            [id]
        );

        await client.query('COMMIT');
        await logSystemEvent('info', `Директор турниров «${req.tournamentDirector.name}» обновил турнир «${payload.name || access.tournament.name}»`, 'Tournaments');

        res.json(mapDirectorTournamentRow({
            ...result.rows[0],
            has_regulation: regulationMeta.rows.length > 0,
            regulation_file_name: regulationMeta.rows[0]?.file_name || null,
            regulation_uploaded_at: regulationMeta.rows[0]?.updated_at || null
        }));
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Director tournament update error:', error);
        res.status(500).json({ error: 'Не удалось обновить турнир' });
    } finally {
        client.release();
    }
});

app.delete('/api/director/tournaments/:id', requireTournamentDirector, async (req, res) => {
    const { id } = req.params;
    const access = await ensureDirectorTournamentAccess(id, req.tournamentDirector);
    if (access.error) {
        return res.status(access.error.status).json({ error: access.error.message });
    }

    try {
        await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
        await logSystemEvent('warning', `Директор турниров «${req.tournamentDirector.name}» удалил турнир «${access.tournament.name}»`, 'Tournaments');
        res.json({ success: true });
    } catch (error) {
        console.error('Director tournament delete error:', error);
        res.status(500).json({ error: 'Не удалось удалить турнир' });
    }
});

app.get('/api/director/tournaments/:id/regulation', requireTournamentDirector, async (req, res) => {
    const { id } = req.params;
    const access = await ensureDirectorTournamentAccess(id, req.tournamentDirector);
    if (access.error) {
        return res.status(access.error.status).json({ error: access.error.message });
    }

    try {
        const result = await pool.query(
            `SELECT file_name, mime_type, file_size, file_data, updated_at
             FROM tournament_regulations
             WHERE tournament_id = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Регламент не найден' });
        }

        const regulation = result.rows[0];
        res.json({
            fileName: regulation.file_name,
            mimeType: regulation.mime_type,
            fileSize: regulation.file_size,
            uploadedAt: regulation.updated_at,
            dataUrl: `data:${regulation.mime_type};base64,${regulation.file_data}`
        });
    } catch (error) {
        console.error('Director regulation fetch error:', error);
        res.status(500).json({ error: 'Не удалось получить регламент турнира' });
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

app.post('/api/courts', requireAdmin, async (req, res) => {
    let { name, address, surface, pricePerHour, image, rating, website } = req.body;
    // Если base64 > 800KB — слишком большое, отклоняем
    if (image && image.startsWith('data:') && image.length > 800000) {
        return res.status(413).json({ error: 'Изображение слишком большое. Максимум ~600KB. Сожмите фото перед загрузкой.' });
    }
    try {
        const surfaceJson = Array.isArray(surface) ? JSON.stringify(surface) : surface;
        const result = await pool.query(
            'INSERT INTO courts (name, address, surface, price_per_hour, image, rating, website) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, address, surfaceJson, pricePerHour, image, rating, website]
        );
        await logAdminAction(req, 'info', 'добавил', 'корт', name, address ? `Адрес: ${address}` : '');
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

app.put('/api/courts/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    let { name, address, surface, pricePerHour, image, rating, website } = req.body;
    if (image && image.startsWith('data:') && image.length > 800000) {
        return res.status(413).json({ error: 'Изображение слишком большое. Максимум ~600KB. Сожмите фото перед загрузкой.' });
    }
    try {
        const surfaceJson = Array.isArray(surface) ? JSON.stringify(surface) : surface;
        await pool.query(
            'UPDATE courts SET name=$1, address=$2, surface=$3, price_per_hour=$4, image=$5, rating=$6, website=$7 WHERE id=$8',
            [name, address, surfaceJson, pricePerHour, image, rating, website, id]
        );
        await logAdminAction(req, 'info', 'обновил', 'корт', name || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error updating court:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/courts/:id', requireAdmin, async (req, res) => {
    try {
        const courtResult = await pool.query('SELECT name FROM courts WHERE id = $1', [req.params.id]);
        await pool.query('DELETE FROM courts WHERE id = $1', [req.params.id]);
        await logAdminAction(req, 'warning', 'удалил', 'корт', courtResult.rows[0]?.name || `#${req.params.id}`, `ID: ${req.params.id}`);
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

app.post('/api/products', requireAdmin, async (req, res) => {
    const { title, category, price, image } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (title, category, price, image) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, category, price, image]
        );
        await logAdminAction(req, 'info', 'добавил', 'товар', title, category ? `Категория: ${category}` : '');
        const row = result.rows[0];
        res.json({...row, id: row.id.toString()});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, category, price, image } = req.body;
    try {
        await pool.query(
            'UPDATE products SET title=$1, category=$2, price=$3, image=$4 WHERE id=$5',
            [title, category, price, image, id]
        );
        await logAdminAction(req, 'info', 'обновил', 'товар', title || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
        const productResult = await pool.query('SELECT title FROM products WHERE id = $1', [req.params.id]);
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        await logAdminAction(req, 'warning', 'удалил', 'товар', productResult.rows[0]?.title || `#${req.params.id}`, `ID: ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New route to get unique cities
app.get('/api/cities', async (req, res) => {
    try {
        const defaultCities = [
            'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
            'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
            'Краснодар', 'Пермь', 'Воронеж', 'Волгоград', 'Красноярск',
            'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул',
            'Иркутск', 'Ульяновск', 'Хабаровск', 'Ярославль', 'Владивосток',
            'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Рязань',
            'Подольск', 'Балашиха', 'Химки', 'Мытищи', 'Люберцы', 'Сочи'
        ];
        const result = await pool.query('SELECT DISTINCT city FROM users WHERE city IS NOT NULL AND city != \'\' ORDER BY city');
        const dbCities = result.rows.map(row => row.city);
        const merged = [...new Set([...dbCities, ...defaultCities])].sort((a, b) => a.localeCompare(b, 'ru'));
        res.json(merged);
    } catch (err) {
        console.error("Fetch Cities Error:", err);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

app.get('/api/partners', async (req, res) => {
    const { city, level, search, rtt_only } = req.query;

    try {
        // --- Реальные пользователи ---
        let query = "SELECT id, name, age, level, city, avatar as image, (role = 'rtt_pro' or role = 'coach') as isPro, rtt_rank, rating, role, xp FROM users WHERE role != 'admin' AND (is_private IS NULL OR is_private = FALSE)";
        const queryParams = [];

        if (rtt_only === 'true') {
            query += " AND role = 'rtt_pro'";
        }
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
        const realResult = await pool.query(query, queryParams);

        // --- Призраки из ghost_users (не в реальной таблице users) ---
        let ghostQuery = "SELECT id, name, age, level, city, avatar as image, (role = 'rtt_pro' or role = 'coach') as isPro, rtt_rank, rating, role, xp FROM ghost_users WHERE TRUE";
        const ghostParams = [];
        if (rtt_only === 'true') {
            ghostQuery += " AND role = 'rtt_pro'";
        }
        if (city) {
            ghostParams.push(city);
            ghostQuery += ` AND city = $${ghostParams.length}`;
        }
        if (level && level !== 'all') {
            ghostParams.push(level);
            ghostQuery += ` AND level = $${ghostParams.length}`;
        }
        if (search) {
            ghostParams.push(`%${search}%`);
            ghostQuery += ` AND name ILIKE $${ghostParams.length}`;
        }
        ghostQuery += ' ORDER BY xp DESC, name ASC';
        const ghostResult = await pool.query(ghostQuery, ghostParams);

        // Объединяем: реальные + призраки, сортируем по xp
        const all = [
            ...realResult.rows.map(r => ({ ...r, id: r.id.toString(), isGhost: false })),
            ...ghostResult.rows.map(r => ({ ...r, id: `ghost_${r.id}`, isGhost: true })),
        ].sort((a, b) => (b.xp || 0) - (a.xp || 0) || a.name.localeCompare(b.name));

        res.json(all);

    } catch (err) {
        console.error("Fetch Partners Error:", err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// --- LADDER ROUTES ---

app.get('/api/ladder/rankings', async (req, res) => {
    const { type, category } = req.query; // 'club_elo' or 'rtt_rating' and optional category

    try {
        let orderByClause = '';
        let whereClause = 'WHERE u.role != \'admin\'' ;
        let selectPointsClause = 'u.xp as points'; // Default to XP for club players
        const queryParams = [];

        if (type === 'rtt_rating') {
            orderByClause = 'ORDER BY u.rating DESC, u.name ASC'; // For professional (RTT) players, sort by rating
            whereClause += ' AND u.role = \'rtt_pro\''; // Only show RTT professional players
            selectPointsClause = 'u.rating as points'; // Use RTT rating as points
            
            // Add category filter if specified
            if (category && category !== 'Взрослые') {
                queryParams.push(category);
                whereClause += ` AND u.rtt_category = $${queryParams.length}`;
            } else if (category === 'Взрослые') {
                // For Взрослые, show players without category or with "Взрослые"
                whereClause += ' AND (u.rtt_category IS NULL OR u.rtt_category = \'Взрослые\' OR u.rtt_category = \'\')';
            }
        } else { // Default to 'club_elo'
            orderByClause = 'ORDER BY u.xp DESC, u.rating DESC, u.name ASC'; // For amateur (Club ELO) players
        }

        // Get all users ordered by rank
        const usersResult = await pool.query(`
            SELECT 
                u.id, u.name, u.avatar, ${selectPointsClause}, u.role, u.level, u.rating, u.rtt_rank, u.rtt_category, u.rni,
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

        // Map to LadderPlayer structure and fetch RTT stats if needed
        const ladderPlayers = await Promise.all(usersResult.rows.map(async (row, index) => {
            let totalMatches = parseInt(row.total_matches, 10) || 0;
            let wins = parseInt(row.wins, 10) || 0;
            
            // For RTT players, try to get real stats from RTT API
            if (type === 'rtt_rating' && row.rni) {
                try {
                    const rttStats = await rttParser.getPlayerTournamentsAndMatches(row.rni);
                    if (rttStats.success && rttStats.data.matches) {
                        const rttMatches = rttStats.data.matches;
                        totalMatches = rttMatches.length;
                        wins = rttMatches.filter(m => m.result === 'win').length;
                    }
                } catch (err) {
                    console.warn(`Failed to fetch RTT stats for ${row.name} (RNI: ${row.rni}):`, err.message);
                    // Fallback to DB data
                }
            }
            
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
        }));

        // --- Добавляем призраков из ghost_users ---
        // Для рейтинга 'club_elo' — все призраки, для 'rtt_rating' — только rtt_pro с rtt_rank
        let ghostWhereClause = type === 'rtt_rating'
            ? "WHERE role = 'rtt_pro' AND rtt_rank IS NOT NULL"
            : "WHERE TRUE";
        if (type === 'rtt_rating' && category && category !== 'Взрослые') {
            ghostWhereClause += ` AND rtt_category = '${category.replace(/'/g, "''")}'`;
        } else if (type === 'rtt_rating' && category === 'Взрослые') {
            ghostWhereClause += ` AND (rtt_category IS NULL OR rtt_category = 'Взрослые' OR rtt_category = '')`;
        }
        const ghostLadderResult = await pool.query(
            `SELECT id, name, avatar, xp, rating, rtt_rank, rtt_category, role FROM ghost_users ${ghostWhereClause}`
        );
        const ghostLadderPlayers = ghostLadderResult.rows.map(row => ({
            id: `ghost_${row.id}`,
            userId: `ghost_${row.id}`,
            name: row.name,
            avatar: row.avatar,
            points: type === 'rtt_rating' ? row.rating : row.xp,
            matches: Math.floor(Math.random() * 30) + 5,  // случайное число матчей для вида
            winRate: Math.floor(Math.random() * 40) + 40, // случайный win rate 40-80%
            status: 'idle',
            rank: 0 // будет пересчитан ниже
        }));

        // Объединяем реальных + призраков и пересчитываем rank по points
        const combined = [...ladderPlayers, ...ghostLadderPlayers]
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .map((p, i) => ({ ...p, rank: i + 1 }));

        res.json(combined);
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
        const notificationResult = await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id, is_read) VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
            [parsedDefenderId, 'new_challenge', `${challenger.rows[0].name} бросил(а) вам вызов!`, newChallenge.id]
        );
        console.log("Notification created for user:", parsedDefenderId, notificationResult.rows[0]);

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
            `INSERT INTO matches (user_id, opponent_name, score, result, surface, date)
             VALUES ($1, $2, $3, 'win', 'hard', CURRENT_DATE)`,
            [parsedWinnerId, loserData.rows[0].name, score]
        );
         await client.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface, date)
             VALUES ($1, $2, $3, 'loss', 'hard', CURRENT_DATE)`,
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
        const count = parseInt(result.rows[0].count, 10);
        console.log(`Unread count for user ${parsedUserId}:`, count);
        res.json({ count });
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
        if (String(userId).startsWith('ghost_')) {
            const ghostId = String(userId).replace('ghost_', '');
            const ghostResult = await pool.query(
                `SELECT id, name, avatar, xp, role, level, rating, rtt_rank
                 FROM ghost_users
                 WHERE id = $1`,
                [ghostId]
            );

            if (ghostResult.rows.length === 0) {
                return res.status(404).json({ error: 'Player not found' });
            }

            const ghostRow = ghostResult.rows[0];
            return res.json({
                id: `ghost_${ghostRow.id}`,
                userId: `ghost_${ghostRow.id}`,
                name: ghostRow.name,
                avatar: ghostRow.avatar,
                points: ghostRow.rating || ghostRow.xp || 0,
                rank: ghostRow.rtt_rank || 0,
                matches: 0,
                winRate: 0,
                status: 'idle',
                role: ghostRow.role,
                joinDate: new Date().toISOString(),
                bio: 'Статистика доступна только по матчам внутри системы.',
                rni: null,
                isRttProfile: false,
                profileSource: 'ghost',
                stats: { wins: 0, losses: 0, bestRank: ghostRow.rtt_rank || 0, currentStreak: 0 },
                rankHistory: [],
                recentMatches: []
            });
        }

        const userResult = await pool.query(
            `SELECT 
                id, name, avatar, xp as points, role, level, rating, rtt_rank, rtt_category, rni, created_at as join_date
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const userRow = userResult.rows[0];

        const isRttProfile = Boolean(userRow.rni && userRow.role === 'rtt_pro');

        if (isRttProfile) {
            const [playerData, statsData] = await Promise.all([
                rttParser.getPlayerByRNI(userRow.rni),
                rttParser.getPlayerTournamentsAndMatches(userRow.rni)
            ]);

            if (playerData?.success && statsData?.success) {
                const cleanedMatches = (statsData.data?.matches || [])
                    .map((match, index) => ({
                        id: `rtt-${userRow.id}-${index}`,
                        opponentName: extractCleanPlayerName(match.opponent || ''),
                        score: String(match.score || '').trim(),
                        date: String(match.date || '').trim(),
                        result: match.result,
                        surface: match.surface || 'unknown'
                    }))
                    .filter((match) => {
                        if (!match.opponentName || match.opponentName.length < 3) return false;
                        if (/^(partner|партнер|партнёр|город|соперник)$/i.test(match.opponentName)) return false;
                        if (!/\d{2}\.\d{2}\.\d{4}/.test(match.date)) return false;
                        if (!match.score || !/\d/.test(match.score)) return false;
                        return match.result === 'win' || match.result === 'loss';
                    })
                    .sort((left, right) => parseRuDateToTimestamp(right.date) - parseRuDateToTimestamp(left.date));

                const wins = cleanedMatches.filter(match => match.result === 'win').length;
                const losses = cleanedMatches.filter(match => match.result === 'loss').length;

                let currentStreak = 0;
                if (cleanedMatches.length > 0) {
                    const lastResult = cleanedMatches[0].result;
                    let streak = 0;
                    for (const match of cleanedMatches) {
                        if (match.result === lastResult) {
                            streak += 1;
                        } else {
                            break;
                        }
                    }
                    currentStreak = lastResult === 'win' ? streak : -streak;
                }

                const bestRank = Number(userRow.rtt_rank || playerData.data?.rank || 0) || 0;
                const rankHistory = (statsData.data?.rankHistory || []).filter(item => item && item.rank > 0);

                return res.json({
                    id: userRow.id.toString(),
                    userId: userRow.id.toString(),
                    name: userRow.name,
                    avatar: userRow.avatar,
                    points: userRow.rating,
                    rank: bestRank,
                    matches: cleanedMatches.length,
                    winRate: cleanedMatches.length > 0 ? Math.round((wins / cleanedMatches.length) * 100) : 0,
                    status: 'idle',
                    role: userRow.role,
                    joinDate: userRow.join_date,
                    bio: [playerData.data?.city, playerData.data?.category].filter(Boolean).join(' • ') || 'Профиль игрока РТТ',
                    rni: userRow.rni,
                    isRttProfile: true,
                    profileSource: 'rtt',
                    stats: {
                        wins,
                        losses,
                        bestRank,
                        currentStreak
                    },
                    rankHistory,
                    recentMatches: cleanedMatches.slice(0, 5).map((match) => ({
                        id: match.id,
                        userId: userRow.id.toString(),
                        opponentName: match.opponentName,
                        score: match.score,
                        date: match.date,
                        result: match.result,
                        surface: match.surface
                    }))
                });
            }
        }

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
            role: userRow.role,
            joinDate: userRow.join_date,
            bio: 'Статистика доступна только по матчам внутри системы.',
            rni: userRow.rni || null,
            isRttProfile: false,
            profileSource: 'internal',
            stats: { wins, losses, bestRank: userRow.rtt_rank || 0, currentStreak: currentStreak },
            rankHistory: [],
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
        const realPostsResult = await pool.query(`
            SELECT 
                p.id,
                p.type,
                p.content,
                p.created_at,
                json_build_object('id', u.id::text, 'name', u.name, 'avatar', u.avatar, 'role', u.role, 'city', u.city) as author,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_user,
                (SELECT json_agg(json_build_object(
                    'id', c.id, 
                    'text', c.text, 
                    'created_at', c.created_at,
                    'author', json_build_object('id', cu.id::text, 'name', cu.name, 'avatar', cu.avatar)
                ) ORDER BY c.created_at ASC) FROM post_comments c JOIN users cu ON c.user_id = cu.id WHERE c.post_id = p.id) as comments
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE (p.type = 'match' AND p.group_id IS NOT NULL AND p.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)) OR (p.type != 'match' AND (p.group_id IS NULL OR p.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)))
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId || null]);

        const ghostPostsResult = await pool.query(`
            SELECT
                CONCAT('ghost_', gp.id::text) as id,
                gp.type,
                gp.content,
                gp.created_at,
                json_build_object(
                    'id', CONCAT('ghost_', gu.id::text),
                    'name', gu.name,
                    'avatar', gu.avatar,
                    'role', gu.role,
                    'city', gu.city
                ) as author,
                (SELECT COUNT(*) FROM ghost_post_likes WHERE ghost_post_id = gp.id) as likes_count,
                EXISTS(SELECT 1 FROM ghost_post_likes WHERE ghost_post_id = gp.id AND user_id = $1) as liked_by_user,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', gc.id,
                            'text', gc.text,
                            'created_at', gc.created_at,
                            'author', json_build_object(
                                'id', CASE WHEN gcu.id IS NOT NULL THEN gcu.id::text ELSE CONCAT('ghost_', gcgu.id::text) END,
                                'name', COALESCE(gcu.name, gcgu.name),
                                'avatar', COALESCE(gcu.avatar, gcgu.avatar)
                            )
                        ) ORDER BY gc.created_at ASC
                    )
                    FROM ghost_post_comments gc
                    LEFT JOIN users gcu ON gc.user_id = gcu.id
                    LEFT JOIN ghost_users gcgu ON gc.ghost_user_id = gcgu.id
                    WHERE gc.ghost_post_id = gp.id
                ) as comments
            FROM ghost_posts gp
            JOIN ghost_users gu ON gp.ghost_user_id = gu.id
            WHERE (gp.type = 'match' AND gp.group_id IS NOT NULL AND gp.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)) OR (gp.type != 'match' AND (gp.group_id IS NULL OR gp.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)))
            ORDER BY gp.created_at DESC
            LIMIT 50
        `, [userId || null]);

        const posts = [...realPostsResult.rows, ...ghostPostsResult.rows]
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
            .slice(0, 50);

        res.json(posts);
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
        if (isGhostIdentifier(id)) {
            const ghostPostId = extractGhostNumericId(id);

            const likeCheck = await pool.query(
                'SELECT id FROM ghost_post_likes WHERE ghost_post_id = $1 AND user_id = $2',
                [ghostPostId, userId]
            );

            if (likeCheck.rows.length > 0) {
                await pool.query(
                    'DELETE FROM ghost_post_likes WHERE ghost_post_id = $1 AND user_id = $2',
                    [ghostPostId, userId]
                );
                return res.json({ success: true, action: 'unliked' });
            }

            await pool.query(
                'INSERT INTO ghost_post_likes (ghost_post_id, user_id) VALUES ($1, $2)',
                [ghostPostId, userId]
            );
            return res.json({ success: true, action: 'liked' });
        }

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
        if (isGhostIdentifier(id)) {
            const ghostPostId = extractGhostNumericId(id);
            const result = await pool.query(
                `INSERT INTO ghost_post_comments (ghost_post_id, user_id, text)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [ghostPostId, userId, text]
            );
            return res.status(201).json(result.rows[0]);
        }

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

    if (isGhostIdentifier(id)) {
        return res.status(403).json({ error: 'Ghost posts cannot be deleted by users' });
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

        const creatorRes = await client.query('SELECT name FROM users WHERE id = $1', [parsedUserId]);
        const creatorName = creatorRes.rows[0]?.name || `Пользователь #${parsedUserId}`;

        await client.query('COMMIT');
        
        await logSystemEvent('info', `Пользователь «${creatorName}» создал новую группу «${name}»`, 'Groups');
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

        const [userRes, groupRes] = await Promise.all([
            pool.query('SELECT name FROM users WHERE id = $1', [parsedUserId]),
            pool.query('SELECT name FROM groups WHERE id = $1', [parsedGroupId])
        ]);

        const memberName = userRes.rows[0]?.name || `Пользователь #${parsedUserId}`;
        const groupName = groupRes.rows[0]?.name || `Группа #${parsedGroupId}`;

        // Add user to the group with 'member' role
        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [parsedGroupId, parsedUserId, 'member']
        );

        await logSystemEvent('info', `Пользователь «${memberName}» вступил в группу «${groupName}»`, 'Groups');
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
                u.name as creator_name,
                u.role as creator_role, 
                g.name as "groupName",
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'pending') as pending_applications_count,
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'approved') as approved_applications_count
            FROM tournaments t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN groups g ON t.target_group_id IS NOT NULL AND t.target_group_id != '' AND t.target_group_id ~ '^\d+$' AND CAST(t.target_group_id AS INTEGER) = g.id
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
            WHERE
                t.user_id = $1 -- It's a tournament created by the current user
                OR u.role IN ('admin', 'tournament_director') -- It's a public tournament from an admin or tournament director
                OR gm.user_id IS NOT NULL -- The current user is a member of the tournament's target group
            GROUP BY t.id, u.name, u.role, g.name
            ORDER BY t.start_date DESC NULLS LAST, t.id DESC
        `;
        
        const result = await pool.query(query, [userId]);
        res.json(result.rows.map(t => ({
            ...t,
            id: t.id.toString(),
            pending_applications_count: parseInt(t.pending_applications_count, 10) || 0,
            approved_applications_count: parseInt(t.approved_applications_count, 10) || 0,
        })));
    } catch (err) {
        console.error("Fetch Tournaments Error:", err);
        res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
});

app.post('/api/tournaments', async (req, res) => {
    const { 
        userId, name, groupName, prize_pool, status, type, target_group_id, rounds,
        category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count, stage_status, rtt_link
    } = req.body;
    const normalizedStageStatus = normalizeTournamentStageStatus(stage_status || '');
    if (!userId || !name) {
        return res.status(400).json({ error: 'userId and name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO tournaments (
                user_id, name, group_name, prize_pool, status, type, target_group_id, rounds,
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count, stage_status, rtt_link
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
            [
                userId, name, groupName, prize_pool, status, type, target_group_id, JSON.stringify(rounds),
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count, normalizedStageStatus, rtt_link || null
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
        const tournamentRes = await client.query(
            `SELECT
                t.user_id,
                t.name,
                t.participants_count,
                (SELECT COUNT(*) FROM tournament_applications ta WHERE ta.tournament_id = t.id AND ta.status = 'approved') AS approved_applications_count
             FROM tournaments t
             WHERE t.id = $1`,
            [tournamentId]
        );
        if (tournamentRes.rows.length === 0) {
            throw new Error('Tournament not found');
        }
        const {
            user_id: coachId,
            name: tournamentName,
            participants_count: participantsCount,
            approved_applications_count: approvedApplicationsCount,
        } = tournamentRes.rows[0];

        const normalizedParticipantsCount = Number(participantsCount) || 0;
        const normalizedApprovedApplicationsCount = Number(approvedApplicationsCount) || 0;

        if (normalizedParticipantsCount > 0 && normalizedApprovedApplicationsCount >= normalizedParticipantsCount) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Прием заявок не ведется' });
        }

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
        await logSystemEvent('info', `Пользователь «${userName}» подал заявку на турнир «${tournamentName}»`, 'Tournaments');
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
        category, tournament_type, gender, age_group, system, match_format, start_date, end_date, participants_count, stage_status, rtt_link
    } = req.body;
    const normalizedStageStatus = normalizeTournamentStageStatus(stage_status || '');

    try {
        // Safely serialize rounds: avoid double-serialization if already a string
        const roundsJson = typeof rounds === 'string' ? rounds : JSON.stringify(rounds);
        const result = await pool.query(
            `UPDATE tournaments 
             SET name = $1, group_name = $2, prize_pool = $3, status = $4, type = $5, target_group_id = $6, rounds = $7,
                 category = $8, tournament_type = $9, gender = $10, age_group = $11, system = $12, match_format = $13, start_date = $14, end_date = $15, participants_count = $17,
                 stage_status = COALESCE($18, stage_status), rtt_link = COALESCE($19, rtt_link)
             WHERE id = $16 RETURNING *`,
            [
                name, groupName, prize_pool, status, type, target_group_id, roundsJson,
                category, tournament_type, gender, age_group, system, match_format, start_date, end_date,
                id, participants_count, normalizedStageStatus, rtt_link || null
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

        const coachRes = await client.query('SELECT name FROM users WHERE id = $1', [coachIdInt]);
        const coachName = coachRes.rows[0]?.name || `Тренер #${coachIdInt}`;

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


    await logSystemEvent('info', `Тренер «${coachName}» добавил ученика «${name}»`, 'CRM');
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
        const coachRes = await pool.query('SELECT name FROM users WHERE id = $1', [coachId]);
        const coachName = coachRes.rows[0]?.name || `Тренер #${coachId}`;
        await logSystemEvent('info', `Тренер «${coachName}» запланировал занятие для ученика «${studentName || `#${studentId}`}»`, 'CRM');

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
        
        const coachId = lessons[0]?.coachId;
        const coachRes = coachId ? await pool.query('SELECT name FROM users WHERE id = $1', [coachId]) : null;
        const coachName = coachRes?.rows?.[0]?.name || (coachId ? `Тренер #${coachId}` : 'Тренер');
        await logSystemEvent('info', `Тренер «${coachName}» создал ${createdLessons.length} повторяющихся занятий`, 'CRM');
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
        
        const deletedLesson = result.rows[0];
        await logSystemEvent('info', `Удалено занятие${deletedLesson?.student_name ? ` ученика «${deletedLesson.student_name}»` : ''}${deletedLesson?.date ? ` на ${new Date(deletedLesson.date).toLocaleDateString('ru-RU')}` : ''}`, 'CRM');
        res.status(200).json({ message: 'Lesson deleted successfully' });
    } catch (err) {
        console.error("Delete Lesson Error:", err);
        res.status(500).json({ error: 'Database error while deleting lesson' });
    }
});

// --- MATCH STATISTICS ROUTES ---

// Синхронизация матчей из РТТ в личный кабинет
app.post('/api/rtt/sync-matches/:userId', async (req, res) => {
    const { userId } = req.params;
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId || String(requestUserId) !== String(userId)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Берём RНИ пользователя
        const userResult = await pool.query('SELECT rni FROM users WHERE id = $1', [userId]);
        if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

        const rni = userResult.rows[0].rni;
        if (!rni) return res.status(400).json({ error: 'У пользователя не привязан РНИ' });

        // Парсим матчи с rttstat.ru
        const statsData = await rttParser.getPlayerTournamentsAndMatches(rni);
        const rttMatches = statsData?.data?.matches || [];

        if (!rttMatches.length) {
            return res.json({ success: true, added: 0, message: 'Матчи на rttstat.ru не найдены' });
        }

        // Получаем уже существующие матчи пользователя чтобы не дублировать
        const existing = await pool.query(
            'SELECT opponent_name, date FROM matches WHERE user_id = $1',
            [userId]
        );
        const existingSet = new Set(
            existing.rows.map(r => `${r.opponent_name}__${r.date}`)
        );

        let added = 0;
        for (const m of rttMatches) {
            const key = `${m.opponent}__${m.date}`;
            if (existingSet.has(key)) continue;

            // Конвертируем дату из ДД.ММ.ГГГГ → ГГГГ-ММ-ДД
            let parsedDate = null;
            if (m.date) {
                const parts = m.date.split('.');
                if (parts.length === 3) {
                    parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else {
                    // Попробуем как есть
                    const d = new Date(m.date);
                    if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
                }
            }

            const stats = {
                tournament: m.tournament || null,
                ageGroup: m.ageGroup || null,
                opponentPoints: m.opponentPoints || null,
                opponentCity: m.opponentCity || null,
                source: 'rtt'
            };

            try {
                await pool.query(
                    `INSERT INTO matches (user_id, opponent_name, score, result, surface, date, stats)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, m.opponent, m.score || '', m.result, 'hard', parsedDate, JSON.stringify(stats)]
                );
                existingSet.add(key);
                added++;
            } catch (insertErr) {
                console.error(`RTT sync: skip match ${m.opponent} ${m.date}:`, insertErr.message);
            }
        }

        await logSystemEvent('info', `RTT sync: ${added} matches added for user ${userId}`, 'RTT');
        res.json({ success: true, added, total: rttMatches.length });

    } catch (err) {
        console.error('RTT sync-matches error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/matches', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const result = await pool.query('SELECT * FROM matches WHERE user_id = $1 ORDER BY date DESC LIMIT 100', [userId]);
        const matches = result.rows.map(row => ({
            id: row.id.toString(),
            userId: row.user_id,
            opponentName: row.opponent_name,
            score: row.score,
            date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
            result: row.result,
            surface: row.surface,
            stats: row.stats
        }));
        res.json(matches);
    } catch (err) {
        console.error('GET /api/matches error:', err);
        res.status(500).json({ error: 'Db error' });
    }
});

app.post('/api/matches', async (req, res) => {
    const { userId, opponentName, score, result, surface, stats, date } = req.body;

    const normalizedDate = (() => {
        if (!date) return null;
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString().split('T')[0];
    })();

    try {
        const insert = await pool.query(
            `INSERT INTO matches (user_id, opponent_name, score, result, surface, date, stats)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
             RETURNING *`,
            [userId, opponentName, score, result, surface, normalizedDate, stats]
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
    const { name, trajectories, userId } = req.body;
    if (!userId) return res.status(401).json({ error: 'userId required' });
    try {
        // Проверяем владельца
        const own = await pool.query('SELECT user_id FROM tactics WHERE id = $1', [tacticId]);
        if (own.rows.length === 0) return res.status(404).json({ error: 'Tactic not found' });
        if (String(own.rows[0].user_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });

        const result = await pool.query(
            'UPDATE tactics SET name = $1, tactics_data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, JSON.stringify(trajectories), tacticId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update Tactic Error:", err);
        res.status(500).json({ error: 'Failed to update tactic' });
    }
});

// DELETE a tactic
app.delete('/api/tactic/:tacticId', async (req, res) => {
    const { tacticId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(401).json({ error: 'userId required' });
    try {
        const own = await pool.query('SELECT user_id FROM tactics WHERE id = $1', [tacticId]);
        if (own.rows.length === 0) return res.status(404).json({ error: 'Tactic not found' });
        if (String(own.rows[0].user_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });

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
                p.role as "partnerRole",
                p.rating as "partnerRating",
                p.rtt_rank as "partnerRttRank",
                (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as "lastMessage",
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != $1) as "unread"
            FROM conversations c
            JOIN users p ON (p.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
            WHERE (c.user1_id = $1 OR c.user2_id = $1)
              AND (c.user1_id != $2 AND c.user2_id != $2)
            ORDER BY c.updated_at DESC
        `, [userId, SUPPORT_ADMIN_ID]);

        const ghostResult = await pool.query(`
            SELECT
                CONCAT('ghost_', gc.id::text) as id,
                gc.updated_at,
                CONCAT('ghost_', gu.id::text) as "partnerId",
                gu.name as "partnerName",
                gu.avatar as "partnerAvatar",
                gu.role as "partnerRole",
                gu.rating as "partnerRating",
                gu.rtt_rank as "partnerRttRank",
                (
                    SELECT text
                    FROM ghost_messages gm
                    WHERE gm.conversation_id = gc.id
                    ORDER BY gm.created_at DESC
                    LIMIT 1
                ) as "lastMessage",
                (
                    SELECT COUNT(*)
                    FROM ghost_messages gm
                    WHERE gm.conversation_id = gc.id
                      AND gm.is_read = FALSE
                      AND gm.sender_type = 'ghost'
                ) as "unread"
            FROM ghost_conversations gc
            JOIN ghost_users gu ON gu.id = gc.ghost_user_id
            WHERE gc.user_id = $1
            ORDER BY gc.updated_at DESC
        `, [userId]);

        const conversations = result.rows.map(r => ({ 
            ...r, 
            id: r.id.toString(), 
            partnerId: r.partnerId.toString(), 
            unread: parseInt(r.unread),
            partnerRating: r.partnerRating || 0,
            partnerRttRank: r.partnerRttRank || null
        }));

        const ghostConversations = ghostResult.rows.map(r => ({
            ...r,
            unread: parseInt(r.unread),
            partnerRating: r.partnerRating || 0,
            partnerRttRank: r.partnerRttRank || null
        }));

        res.json([...conversations, ...ghostConversations].sort((a, b) => new Date(b.updated_at || b.timestamp || 0).getTime() - new Date(a.updated_at || a.timestamp || 0).getTime()));
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
        if (isGhostIdentifier(conversationId)) {
            const ghostConversationId = extractGhostNumericId(conversationId);

            await pool.query(
                `UPDATE ghost_messages
                 SET is_read = TRUE
                 WHERE conversation_id = $1 AND sender_type = 'ghost'`,
                [ghostConversationId]
            );

            const result = await pool.query(
                `SELECT
                    gm.id,
                    gm.text,
                    gm.created_at,
                    CASE WHEN gm.sender_type = 'user' THEN 'user' ELSE 'partner' END as role
                 FROM ghost_messages gm
                 WHERE gm.conversation_id = $1
                 ORDER BY gm.created_at ASC`,
                [ghostConversationId]
            );

            return res.json(result.rows.map(row => ({
                ...row,
                id: `ghost_message_${row.id}`
            })));
        }

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

        if (isGhostIdentifier(partnerId)) {
            const ghostUserId = extractGhostNumericId(partnerId);
            let conversationResult = await client.query(
                `SELECT id FROM ghost_conversations WHERE user_id = $1 AND ghost_user_id = $2`,
                [senderId, ghostUserId]
            );

            let conversationId;
            if (conversationResult.rows.length > 0) {
                conversationId = conversationResult.rows[0].id;
                await client.query('UPDATE ghost_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
            } else {
                const newConversationResult = await client.query(
                    'INSERT INTO ghost_conversations (user_id, ghost_user_id) VALUES ($1, $2) RETURNING id',
                    [senderId, ghostUserId]
                );
                conversationId = newConversationResult.rows[0].id;
            }

            const messageResult = await client.query(
                `INSERT INTO ghost_messages (conversation_id, sender_type, sender_user_id, text)
                 VALUES ($1, 'user', $2, $3)
                 RETURNING id, text, created_at`,
                [conversationId, senderId, text]
            );

            await client.query('COMMIT');

            return res.status(201).json({
                ...messageResult.rows[0],
                id: `ghost_message_${messageResult.rows[0].id}`,
                role: 'user'
            });
        }

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
        if (isGhostIdentifier(partnerId)) {
            const ghostUserId = extractGhostNumericId(partnerId);
            let conversationResult = await client.query(
                `SELECT
                    gc.id,
                    gc.updated_at,
                    CONCAT('ghost_', gu.id::text) as "partnerId",
                    gu.name as "partnerName",
                    gu.avatar as "partnerAvatar",
                    gu.role as "partnerRole",
                    gu.rating as "partnerRating",
                    gu.rtt_rank as "partnerRttRank",
                    (
                        SELECT text
                        FROM ghost_messages gm
                        WHERE gm.conversation_id = gc.id
                        ORDER BY gm.created_at DESC
                        LIMIT 1
                    ) as "lastMessage",
                    (
                        SELECT COUNT(*)
                        FROM ghost_messages gm
                        WHERE gm.conversation_id = gc.id
                          AND gm.is_read = FALSE
                          AND gm.sender_type = 'ghost'
                    ) as "unread"
                 FROM ghost_conversations gc
                 JOIN ghost_users gu ON gu.id = gc.ghost_user_id
                 WHERE gc.user_id = $1 AND gc.ghost_user_id = $2`,
                [userId, ghostUserId]
            );

            let conversation;
            if (conversationResult.rows.length > 0) {
                conversation = conversationResult.rows[0];
            } else {
                const newConversationResult = await client.query(
                    'INSERT INTO ghost_conversations (user_id, ghost_user_id) VALUES ($1, $2) RETURNING id, updated_at',
                    [userId, ghostUserId]
                );
                const partnerInfo = await client.query('SELECT id, name, avatar, role, rating, rtt_rank FROM ghost_users WHERE id = $1', [ghostUserId]);

                conversation = {
                    id: `ghost_${newConversationResult.rows[0].id}`,
                    updated_at: newConversationResult.rows[0].updated_at,
                    partnerId: `ghost_${partnerInfo.rows[0].id}`,
                    partnerName: partnerInfo.rows[0].name,
                    partnerAvatar: partnerInfo.rows[0].avatar,
                    partnerRole: partnerInfo.rows[0].role,
                    partnerRating: partnerInfo.rows[0].rating,
                    partnerRttRank: partnerInfo.rows[0].rtt_rank,
                    lastMessage: '',
                    unread: 0
                };
            }

            return res.json({
                ...conversation,
                id: String(conversation.id),
                unread: Number(conversation.unread || 0),
                isPro: ['rtt_pro', 'coach'].includes(String(conversation.partnerRole || ''))
            });
        }

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

// --- NEWS ROUTES ---

// Ensure news table exists (safety net if initDb was skipped or failed)
const ensureNewsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS news (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            image TEXT DEFAULT '',
            author VARCHAR(200) DEFAULT 'Редакция',
            category VARCHAR(50) DEFAULT 'general',
            is_published BOOLEAN DEFAULT TRUE,
            views INTEGER DEFAULT 0,
            published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0`);
};
// ensureNewsTable вызывается внутри server.listen (см. ниже)

// Public: Get all published news
app.get('/api/news', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, summary, content, image, author, category, published_at, is_published, views
             FROM news WHERE is_published = true ORDER BY published_at DESC`
        );
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString() })));
    } catch (err) {
        console.error("Get News Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Public: Get one news article
app.get('/api/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        // Increment views
        await pool.query('UPDATE news SET views = views + 1 WHERE id = $1', [id]);
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public: Create news article
app.post('/api/news', requireAdmin, async (req, res) => {
    const { title, summary, content, image, author, category, is_published, views } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO news (title, summary, content, image, author, category, is_published, views, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING *`,
            [title, summary, content, image || '', author || 'Редакция', category || 'general', is_published ?? true, views ?? 0]
        );
        await logAdminAction(req, 'info', 'создал', 'новость', title, category ? `Категория: ${category}` : '');
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        console.error("Create News Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Public: Update news article
app.put('/api/news/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, summary, content, image, author, category, is_published, views } = req.body;
    try {
        const result = await pool.query(
            `UPDATE news SET title=$1, summary=$2, content=$3, image=$4, author=$5, category=$6, is_published=$7, views=$8
             WHERE id=$9 RETURNING *`,
            [title, summary, content, image, author, category, is_published, views ?? 0, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        await logAdminAction(req, 'info', 'обновил', 'новость', title || `#${id}`, `ID: ${id}`);
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public: Delete news article
app.delete('/api/news/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const newsResult = await pool.query('SELECT title FROM news WHERE id = $1', [id]);
        await pool.query('DELETE FROM news WHERE id = $1', [id]);
        await logAdminAction(req, 'warning', 'удалил', 'новость', newsResult.rows[0]?.title || `#${id}`, `ID: ${id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get ALL news (including drafts)
app.get('/api/admin/news', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, summary, content, image, author, category, published_at, is_published, views
             FROM news ORDER BY published_at DESC`
        );
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString() })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Start Server and Init DB
server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
        await ensureSystemLogsTable();
        console.log('✅ System logs table ready');
        await ensureNewsTable();
        console.log('✅ News table ready');
        await ensureGhostCommunityTables();
        console.log('✅ Ghost community tables ready');
        await ensurePlayerProgressTable();
        console.log('✅ Player progress table ready');
        await ensureWearableConnectionsTable();
        console.log('✅ Wearable connections table ready');
        await ensureWearableActivitiesTable();
        console.log('✅ Wearable activities table ready');
        await ensureTournamentDirectorTables();
        console.log('✅ Tournament director tables ready');
        setTimeout(() => {
            syncTrackedTournamentStages().catch(err => console.error('Initial RTT tournament sync failed:', err.message));
        }, 15000);
        setInterval(() => {
            syncTrackedTournamentStages().catch(err => console.error('Scheduled RTT tournament sync failed:', err.message));
        }, TOURNAMENT_STAGE_SYNC_INTERVAL_MS);
    } catch (err) {
        console.error('Failed to ensure startup tables:', err.message);
    }
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

        const applicantRes = await client.query('SELECT name FROM users WHERE id = $1', [applicantId]);
        const coachRes = await client.query('SELECT name FROM users WHERE id = $1', [coachId]);
        const applicantName = applicantRes.rows[0]?.name || `Пользователь #${applicantId}`;
        const coachName = coachRes.rows[0]?.name || `Тренер #${coachId}`;

        await client.query('COMMIT');
        await logSystemEvent('info', `Тренер «${coachName}» изменил статус заявки пользователя «${applicantName}» на «${status}» для турнира «${tournament_name}»`, 'Tournaments');
        res.json({ ...result.rows[0], id: result.rows[0].id.toString() });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Application Status Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

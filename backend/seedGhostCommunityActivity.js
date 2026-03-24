require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./db');

const FALLBACK_GHOSTS = [
  { name: 'Илья Власов', city: 'Москва', level: '4.0', age: 29, role: 'player', rating: 1380, xp: 650 },
  { name: 'Марина Белова', city: 'Сочи', level: '3.5', age: 33, role: 'player', rating: 1240, xp: 430 },
  { name: 'Егор Сафронов', city: 'Казань', level: '4.5', age: 27, role: 'player', rating: 1490, xp: 910 },
  { name: 'Оксана Ларионова', city: 'Санкт-Петербург', level: '3.0', age: 41, role: 'player', rating: 1090, xp: 220 },
  { name: 'Никита Громов', city: 'Екатеринбург', level: '4.0', age: 31, role: 'player', rating: 1410, xp: 720 },
  { name: 'Анна Демина', city: 'Краснодар', level: '3.5', age: 28, role: 'player', rating: 1260, xp: 470 }
];

const textPosts = [
  'Кто сегодня играет вечером на харде в Лужниках? Есть час с 20:00 до 21:00.',
  'Собрал мини-группу на утренние спарринги по вторникам и четвергам. Нужен ещё один стабильный игрок.',
  'Ищу компанию на выходные: разминка, сет, кофе и разбор по тактике после матча.',
  'Подскажите, кто недавно перетягивал ракетку в центре Москвы и остался доволен?',
  'Есть идея сделать любительский мини-лист ожидания на вечерние корты. Кому интересно — отпишитесь.'
];

const partnerPosts = [
  { when: 'Сегодня 20:30', where: 'Лужники', text: 'Нужен партнёр на ровный темп и 1-2 сета.', requirement: 'NTRP 3.5-4.0' },
  { when: 'Завтра 08:00', where: 'СК Остров', text: 'Ищу спарринг перед турниром, хочется плотных розыгрышей.', requirement: 'NTRP 4.0+' },
  { when: 'Суббота 18:00', where: 'Чайка', text: 'Можно сыграть тренировочный матч с тай-брейком.', requirement: 'Любой' },
  { when: 'Воскресенье 10:00', where: 'Олимпиец', text: 'Нужен левша или просто неудобный соперник для практики приёма.', requirement: 'NTRP 3.0-4.0' }
];

const marketplacePosts = [];

const TEXT_COMMENT_RULES = [
  {
    match: [/хард/i, /лужник/i, /20:00/i, /вечер/i],
    comments: [
      'Если крытый хард, я бы вписался. После 20:00 как раз удобно.',
      'В Лужниках вечером обычно нормальный темп, могу на сет-полтора.',
      'Если окно ещё актуально, смогу подъехать к 20:15.'
    ]
  },
  {
    match: [/утрен/i, /спарринг/i, /вторник/i, /четверг/i],
    comments: [
      'По вторникам могу стабильно, по четвергам иногда плаваю по работе.',
      'Если уровень около 3.5-4.0, я бы присоединился к группе.'
    ]
  },
  {
    match: [/кросс/i, /форхенд/i],
    comments: [
      'Тоже часто открываю корт коротким кроссом с форхенда, если соперник остаётся далеко.',
      'У меня это стало работать после того, как начал раньше входить в мяч.',
      'Главное не передавливать кистью, тогда короткий кросс реально держится.'
    ]
  },
  {
    match: [/кофе/i, /тактик/i, /выходн/i],
    comments: [
      'Вот такой формат люблю: сет, потом спокойно разобрать пару геймов.',
      'На выходных это идеально, особенно если играть без спешки и потом обсудить тактику.',
      'Я бы на такое пришёл, если ближе к центру.'
    ]
  },
  {
    match: [/перетяг/i, /ракетк/i, /центр/i],
    comments: [
      'Делал недавно возле Белорусской, натянули аккуратно и за день.',
      'Если нужно, могу скинуть контакт мастера — мне там уже несколько раз хорошо делали.',
      'Я бы смотрел, чтобы сразу проверили баланс после перетяжки.'
    ]
  },
  {
    match: [/лист ожидания/i, /вечерн/i, /корт/i],
    comments: [
      'Лист ожидания на вечерние корты — хорошая идея, особенно когда кто-то слетает в последний момент.',
      'Я бы подписался, потому что вечером найти окно день в день почти нереально.',
      'Если сделать чат с быстрым подтверждением, формат точно полетит.'
    ]
  }
];

const PARTNER_SEARCH_COMMENT_POOL = [
  'Время подходит, могу сыграть в хороший ровный темп.',
  'Локация удобная, если ещё ищешь партнёра — я на связи.',
  'Под такой запрос формат 1-2 сетов как раз отличный.',
  'Если уровень попадает, можно быстро договориться без долгих переписок.'
];

const MARKETPLACE_COMMENT_RULES = [
  {
    match: [/yonex|ezone|grip/i],
    comments: [
      'Для Ezone цена выглядит адекватно, если без скрытых трещин.',
      'Есть чехол и когда последний раз меняли струны?',
      'Grip 3 как раз мой размер, если рама целая — вариант интересный.'
    ]
  },
  {
    match: [/сумка|babolat|6r/i],
    comments: [
      'Для 6R состояние выглядит очень прилично, особенно если термоотделение живое.',
      'Удобно носить как рюкзак или только за ручки?',
      'Если молнии все целые, цена вполне рабочая.'
    ]
  },
  {
    match: [/кроссовк|asics|resolution/i],
    comments: [
      'Gel Resolution обычно быстро уходят, если подошва почти без износа.',
      'На какой они реально стопе — не маломерят?',
      'Если игрались только в зале, то состояние должно быть хорошее.'
    ]
  }
];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const FEMALE_FIRST_NAMES = new Set([
  'Марина', 'Оксана', 'Анна', 'Мария', 'Екатерина', 'Анастасия', 'Ольга', 'Виктория', 'Татьяна', 'Юлия',
  'Елена', 'Ксения', 'Светлана', 'Алина', 'Надежда', 'Вера', 'Ирина', 'Лариса', 'Наталья', 'Галина',
  'Полина', 'Людмила', 'Зинаида', 'Дарья'
]);

const MALE_FIRST_NAMES = new Set([
  'Илья', 'Егор', 'Никита', 'Алексей', 'Дмитрий', 'Павел', 'Сергей', 'Николай', 'Игорь', 'Антон',
  'Роман', 'Андрей', 'Михаил', 'Владимир', 'Артём', 'Борис', 'Евгений', 'Константин', 'Вячеслав',
  'Денис', 'Максим', 'Геннадий', 'Степан', 'Пётр', 'Олег', 'Фёдор', 'Кирилл', 'Руслан', 'Тимур', 'Леонид'
]);

const getGhostGender = (fullName = '') => {
  const firstName = String(fullName || '').trim().split(/\s+/)[0];

  if (FEMALE_FIRST_NAMES.has(firstName)) {
    return 'female';
  }

  if (MALE_FIRST_NAMES.has(firstName)) {
    return 'male';
  }

  return /[ая]$/.test(firstName) ? 'female' : 'male';
};

const CUSTOM_GHOST_AVATARS = {
  'Анастасия Морозова': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop',
  'Екатерина Лебедева': '/ghost-avatars/ekaterina-lebedeva.jpg',
  'Дмитрий Новиков': '/ghost-avatars/dmitriy-novikov.jpg'
};

const getGhostAvatar = (name = '') => (
  CUSTOM_GHOST_AVATARS[name]
  || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`
);

const adaptTextByGender = (text = '', gender = 'male') => {
  if (gender !== 'female') {
    return text;
  }

  return String(text || '')
    .replace(/Собрал/g, 'Собрала')
    .replace(/подсел/g, 'подсела')
    .replace(/перетягивал/g, 'перетягивала')
    .replace(/остался доволен/g, 'осталась довольна')
    .replace(/я бы вписался/g, 'я бы вписалась')
    .replace(/Я бы вписался/g, 'Я бы вписалась')
    .replace(/я бы присоединился/g, 'я бы присоединилась')
    .replace(/Я бы присоединился/g, 'Я бы присоединилась')
    .replace(/Я бы на такое пришёл/g, 'Я бы на такое пришла')
    .replace(/я бы на такое пришёл/g, 'я бы на такое пришла')
    .replace(/Делал недавно/g, 'Делала недавно')
    .replace(/Я бы смотрел/g, 'Я бы смотрела')
    .replace(/я бы смотрел/g, 'я бы смотрела')
    .replace(/Я бы подписался/g, 'Я бы подписалась')
    .replace(/я бы подписался/g, 'я бы подписалась')
    .replace(/Я бы тоже вписался/g, 'Я бы тоже вписалась')
    .replace(/я бы тоже вписался/g, 'я бы тоже вписалась')
    .replace(/я готов/g, 'я готова')
    .replace(/Я готов/g, 'Я готова');
};

const pickCommentsByRules = (sourceText, rules, fallback = []) => {
  const normalizedText = String(sourceText || '');
  let bestRule = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = rule.match.reduce((count, pattern) => count + (pattern.test(normalizedText) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestRule && bestScore >= 2 ? bestRule.comments : fallback;
};

const buildCommentPoolForPost = (post) => {
  if (post.type === 'text_post') {
    const text = post.content?.text || '';
    const matchedComments = pickCommentsByRules(text, TEXT_COMMENT_RULES, [
      'Хорошая мысль, я бы поддержал такой формат.',
      'В целом звучит нормально, особенно если быстро собрать людей.',
      'Я бы тоже вписался, если по времени совпадём.'
    ]);
    return matchedComments;
  }

  if (post.type === 'partner_search') {
    const details = post.content?.details || {};
    return [
      `На ${details.when || 'это время'} мне подходит, ${details.where ? `до ${details.where} тоже удобно добираться.` : 'локация тоже норм.'}`,
      `${details.requirement ? `По уровню ${details.requirement.toLowerCase()} прохожу.` : 'По уровню должен подойти.'} Можно сыграть без долгих пауз.`,
      `Если запрос ещё актуален, формат "${details.text || '1-2 сета'}" звучит отлично.`,
      ...PARTNER_SEARCH_COMMENT_POOL
    ];
  }

  if (post.type === 'marketplace') {
    const sourceText = `${post.content?.title || ''} ${post.content?.description || ''}`;
    const matchedComments = pickCommentsByRules(sourceText, MARKETPLACE_COMMENT_RULES, [
      'По фото выглядит аккуратно, если состояние совпадает с описанием — хороший вариант.',
      'Цена выглядит живой, особенно если вещь без скрытых нюансов.',
      'Я бы уточнил пару деталей и дальше уже можно договариваться.'
    ]);
    return matchedComments;
  }

  return [
    'Нормальный пост, спасибо за детали.',
    'Звучит по делу, думаю быстро найдёшь отклик.',
    'Если ещё актуально, я бы тоже присмотрелся.'
  ];
};

const createNaturalTimestamp = ({ minDaysAgo = 0, maxDaysAgo = 20, preferredHours = [8, 10, 12, 14, 18, 20, 21] }) => {
  const timestamp = new Date();
  timestamp.setSeconds(0, 0);
  timestamp.setDate(timestamp.getDate() - randomInt(minDaysAgo, maxDaysAgo));
  timestamp.setHours(randomItem(preferredHours), randomItem([5, 12, 18, 27, 34, 41, 48, 56]), 0, 0);
  return timestamp;
};

const clampToNow = (date) => {
  const now = Date.now();
  return new Date(Math.min(date.getTime(), now - 60 * 1000));
};

async function ensureGhostUsers(client) {
  const existingGhosts = await client.query('SELECT id, name, city, avatar, role FROM ghost_users ORDER BY id');

  if (existingGhosts.rows.length > 0) {
    return existingGhosts.rows;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS ghost_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      level TEXT,
      age INTEGER,
      role TEXT DEFAULT 'player',
      rating INTEGER DEFAULT 1000,
      xp INTEGER DEFAULT 0,
      rtt_rank INTEGER,
      rtt_category TEXT,
      avatar TEXT,
      is_ghost BOOLEAN DEFAULT TRUE
    )
  `);

  for (const ghost of FALLBACK_GHOSTS) {
    const avatar = getGhostAvatar(ghost.name);
    await client.query(
      `INSERT INTO ghost_users (name, city, level, age, role, rating, xp, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ghost.name, ghost.city, ghost.level, ghost.age, ghost.role, ghost.rating, ghost.xp, avatar]
    );
  }

  const seededGhosts = await client.query('SELECT id, name, city, avatar, role FROM ghost_users ORDER BY id');
  return seededGhosts.rows;
}

async function syncGhostAvatars(client) {
  const ghostUsers = await client.query('SELECT id, name FROM ghost_users ORDER BY id');

  for (const ghost of ghostUsers.rows) {
    const avatar = getGhostAvatar(ghost.name);
    await client.query(
      'UPDATE ghost_users SET avatar = $1 WHERE id = $2',
      [avatar, ghost.id]
    );
  }
}

async function ensureGhostCommunityTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ghost_posts (
      id SERIAL PRIMARY KEY,
      ghost_user_id INTEGER NOT NULL REFERENCES ghost_users(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ghost_post_comments (
      id SERIAL PRIMARY KEY,
      ghost_post_id INTEGER NOT NULL REFERENCES ghost_posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ghost_user_id INTEGER REFERENCES ghost_users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ghost_post_likes (
      id SERIAL PRIMARY KEY,
      ghost_post_id INTEGER NOT NULL REFERENCES ghost_posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ghost_user_id INTEGER REFERENCES ghost_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (user_id IS NOT NULL OR ghost_user_id IS NOT NULL)
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ghost_post_likes_user_unique
    ON ghost_post_likes (ghost_post_id, user_id)
    WHERE user_id IS NOT NULL
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ghost_post_likes_ghost_unique
    ON ghost_post_likes (ghost_post_id, ghost_user_id)
    WHERE ghost_user_id IS NOT NULL
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ghost_conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ghost_user_id INTEGER NOT NULL REFERENCES ghost_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, ghost_user_id)
    )
  `);

  await client.query(`
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
}

async function createPost(client, ghostUserId, type, content, createdAt) {
  const result = await client.query(
    `INSERT INTO ghost_posts (ghost_user_id, type, content, created_at)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id`,
    [ghostUserId, type, JSON.stringify(content), createdAt]
  );

  return result.rows[0].id;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await ensureGhostUsers(client);
    await syncGhostAvatars(client);
    const ghostsResult = await client.query('SELECT id, name, city, avatar, role FROM ghost_users ORDER BY id');
    const ghosts = ghostsResult.rows;
    await ensureGhostCommunityTables(client);

    await client.query('DELETE FROM ghost_post_likes');
    await client.query('DELETE FROM ghost_post_comments');
    await client.query('DELETE FROM ghost_posts');
    await client.query('DELETE FROM ghost_messages');
    await client.query('DELETE FROM ghost_conversations');

    const createdPosts = [];

    for (let index = 0; index < textPosts.length; index += 1) {
      const ghost = ghosts[index % ghosts.length];
      const createdAt = createNaturalTimestamp({ minDaysAgo: 3, maxDaysAgo: 18, preferredHours: [8, 9, 12, 19, 20, 21] });
      const content = { text: adaptTextByGender(textPosts[index], getGhostGender(ghost.name)) };
      const postId = await createPost(client, ghost.id, 'text_post', content, createdAt);
      createdPosts.push({ id: postId, type: 'text_post', content, createdAt });
    }

    for (let index = 0; index < partnerPosts.length; index += 1) {
      const ghost = ghosts[(index + 2) % ghosts.length];
      const createdAt = createNaturalTimestamp({ minDaysAgo: 0, maxDaysAgo: 8, preferredHours: [7, 8, 10, 18, 19, 20, 21] });
      const content = {
        details: {
          ...partnerPosts[index],
          ntrp: randomItem(['3.0', '3.5', '4.0', '4.5'])
        }
      };
      const postId = await createPost(client, ghost.id, 'partner_search', content, createdAt);
      createdPosts.push({ id: postId, type: 'partner_search', content, createdAt });
    }

    for (let index = 0; index < marketplacePosts.length; index += 1) {
      const ghost = ghosts[(index + 4) % ghosts.length];
      const createdAt = createNaturalTimestamp({ minDaysAgo: 1, maxDaysAgo: 22, preferredHours: [9, 11, 13, 17, 19, 20] });
      const content = marketplacePosts[index];
      const postId = await createPost(client, ghost.id, 'marketplace', content, createdAt);
      createdPosts.push({ id: postId, type: 'marketplace', content, createdAt });
    }

    for (const post of createdPosts) {
      const commentPool = shuffle(buildCommentPoolForPost(post));
      const commenters = shuffle(ghosts).slice(0, Math.min(randomInt(2, 4), commentPool.length));
      for (const [commentIndex, ghost] of commenters.entries()) {
        const commentTime = clampToNow(new Date(post.createdAt.getTime() + randomInt(40, 72 * 60) * 60 * 1000 + commentIndex * 30 * 60 * 1000));
        await client.query(
          `INSERT INTO ghost_post_comments (ghost_post_id, ghost_user_id, text, created_at)
           VALUES ($1, $2, $3, $4)`,
          [
            post.id,
            ghost.id,
            adaptTextByGender(commentPool[commentIndex % commentPool.length], getGhostGender(ghost.name)),
            commentTime
          ]
        );
      }

      const likers = shuffle(ghosts).slice(0, randomInt(3, 7));
      for (const ghost of likers) {
        await client.query(
          `INSERT INTO ghost_post_likes (ghost_post_id, ghost_user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [post.id, ghost.id]
        );
      }
    }

    const usersResult = await client.query(`SELECT id FROM users ORDER BY id ASC LIMIT 3`);
    const targetUsers = usersResult.rows;
    const dialogGhosts = shuffle(ghosts).slice(0, Math.min(4, ghosts.length));

    for (const userRow of targetUsers) {
      for (const ghost of dialogGhosts) {
        const conversationBaseTime = createNaturalTimestamp({ minDaysAgo: 0, maxDaysAgo: 12, preferredHours: [8, 10, 13, 17, 19, 21] });
        const conversationResult = await client.query(
          `INSERT INTO ghost_conversations (user_id, ghost_user_id, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, ghost_user_id)
           DO UPDATE SET updated_at = EXCLUDED.updated_at
           RETURNING id`,
          [userRow.id, ghost.id, conversationBaseTime]
        );

        const conversationId = conversationResult.rows[0].id;
        const firstGhostMessage = adaptTextByGender(randomItem([
          'Привет! Видел твой профиль в сообществе, как насчёт лёгкого спарринга на неделе?',
          'Есть свободное окно на корте завтра вечером, если актуально — можем сыграть.',
          'Ты писал про поиск партнёра. Если ещё нужно, я готов на 1-2 сета.',
          'Смотрю, ты тоже играешь по утрам. Я обычно беру корт в 8:00.'
        ]), getGhostGender(ghost.name));

        await client.query(
          `INSERT INTO ghost_messages (conversation_id, sender_type, sender_ghost_user_id, text, is_read, created_at)
           VALUES ($1, 'ghost', $2, $3, FALSE, $4)`,
          [conversationId, ghost.id, firstGhostMessage, clampToNow(new Date(conversationBaseTime.getTime() + randomInt(10, 180) * 60 * 1000))]
        );

        if (Math.random() > 0.35) {
          await client.query(
            `INSERT INTO ghost_messages (conversation_id, sender_type, sender_user_id, text, is_read, created_at)
             VALUES ($1, 'user', $2, $3, TRUE, $4)`,
            [conversationId, userRow.id, randomItem([
              'Привет! Да, давай попробуем договориться.',
              'Звучит отлично, я как раз ищу матч на этой неделе.',
              'Спасибо, мне подходит такой формат.',
              'Могу после работы, если корт крытый.'
            ]), clampToNow(new Date(conversationBaseTime.getTime() + randomInt(45, 420) * 60 * 1000))]
          );
        }

        await client.query(
          `UPDATE ghost_conversations
           SET updated_at = (
             SELECT MAX(created_at) FROM ghost_messages WHERE conversation_id = $1
           )
           WHERE id = $1`,
          [conversationId]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Создано ${createdPosts.length} ghost-постов для Сообщества`);
    console.log('✅ Добавлены комментарии, лайки, объявления в барахолке и демо-переписки');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Не удалось засеять активность сообщества:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
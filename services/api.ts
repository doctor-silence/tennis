import { Partner, Court, User, Student, SystemLog, LadderPlayer, Challenge, Match, Product, PlayerProfile, Trajectory, Conversation, ChatMessage, MarketplaceItem, CrmStats, Skill, Lesson, Tournament, Group } from '../types';
import * as THREE from 'three'; // Import THREE for Vector3 deserialization

// Frontend API Service
const API_URL = 'http://localhost:3001/api';

// --- MOCK DATA FALLBACKS (For Demo/Offline Mode) ---

const MOCK_USER: User = {
  id: 'mock-user-1',
  name: 'Гость (Демо Режим)',
  email: 'demo@tennis.pro',
  role: 'coach',
  city: 'Москва',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  rating: 1200,
  xp: 150,
  age: 25,
  level: 'NTRP 3.5'
};

const MOCK_ADMIN: User = {
  id: 'mock-admin-1',
  name: 'Евгений Смирнов',
  email: 'admin@tennis.pro',
  role: 'admin',
  city: 'HQ',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  rating: 9999,
  xp: 9999,
  age: 99,
  level: 'GOD MODE'
};

let MOCK_STUDENTS: Student[] = [
    {
        id: 'mock-student-1',
        coachId: 'mock-admin-1', // Assuming the admin is the coach in demo
        name: 'Екатерина Сидорова',
        age: 14,
        level: 'NTRP 3.0',
        balance: -2500,
        avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400',
        status: 'active',
        goals: [],
        notes: [{id: 'note-1', date: '20.12.2025', text: 'Отличный форхенд на последней тренировке.', coachId: 'mock-admin-1'}],
        xp: 1250,
        skills: { serve: 60, forehand: 75, backhand: 50, stamina: 80, tactics: 65 },
        badges: ['early_bird'],
        racketHours: 15,
        videos: [],
    },
    {
        id: 'mock-student-2',
        coachId: 'mock-admin-1',
        name: 'Алексей Петров',
        age: 18,
        level: 'NTRP 4.0',
        balance: 5000,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
        status: 'active',
        goals: [],
        notes: [],
        xp: 3400,
        skills: { serve: 70, forehand: 65, backhand: 70, stamina: 85, tactics: 75 },
        badges: ['marathon', 'pro_mindset'],
        racketHours: 5,
        videos: [],
    }
];

let MOCK_PARTNERS: Partner[] = [];

let MOCK_PRODUCTS: Product[] = [
    { 
        id: '1', 
        title: 'Wilson Blade 98 v8', 
        category: 'rackets', 
        price: 24990, 
        image: 'https://images.unsplash.com/photo-1617083934555-52951271b273?q=80&w=800&auto=format&fit=crop', 
        isNew: true, 
        isHit: false, 
        rating: 5, 
        reviews: 120 
    },
    { 
        id: '2', 
        title: 'Babolat Pure Aero 2023', 
        category: 'rackets', 
        price: 26500, 
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop', 
        isNew: false, 
        isHit: true, 
        rating: 4.8, 
        reviews: 90 
    },
    { 
        id: '3', 
        title: 'Nike Court Zoom Vapor', 
        category: 'shoes', 
        price: 14990, 
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', 
        isNew: false, 
        isHit: false, 
        rating: 4.5, 
        reviews: 150 
    }
];

const MOCK_MARKETPLACE_ITEMS: MarketplaceItem[] = [
    {
        id: 'mkt-1',
        title: 'Ракетка Babolat Pure Aero (б/у)',
        description: 'Состояние хорошее, есть небольшие потертости. Струны новые. Ручка 3.',
        price: 8000,
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
        sellerName: 'Алексей Иванов',
        sellerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        city: 'Москва'
    },
    {
        id: 'mkt-2',
        title: 'Кроссовки Asics Gel-Resolution 8',
        description: 'Размер 43. Почти новые, играл 2 раза. Не подошел размер.',
        price: 6500,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
        sellerName: 'Мария Петрова',
        sellerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        city: 'Санкт-Петербург'
    }
];

let MOCK_COURTS: Court[] = [
    { 
        id: '1', 
        name: 'Мультиспорт (Лужники)', 
        address: 'ул. Лужники, 24, стр. 10, Москва', 
        surface: ['hard'], 
        pricePerHour: 4500, 
        rating: 5.0, 
        image: 'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop',
        website: 'https://multisport.ru'
    },
    { 
        id: '2', 
        name: 'Теннис Парк', 
        address: 'Рязанский просп., 4, Москва', 
        surface: ['clay'], 
        pricePerHour: 2800, 
        rating: 4.8, 
        image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop',
        website: 'https://tennis-park.ru'
    },
    { 
        id: '3', 
        name: 'Национальный Теннисный Центр', 
        address: 'Ленинградское ш., 45-47, Москва', 
        surface: ['hard'], 
        pricePerHour: 3500, 
        rating: 4.9, 
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
        website: 'https://lovetennis.ru'
    },
    { 
        id: '4', 
        name: 'Спартак (Ширяевка)', 
        address: 'Майский просек, 7, Москва', 
        surface: ['clay'], 
        pricePerHour: 2200, 
        rating: 4.7, 
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop',
        website: 'https://tennis-spartak.ru'
    },
    { 
        id: '5', 
        name: 'Теннисный клуб "Чайка"', 
        address: 'Коробейников пер., 1/2, Москва', 
        surface: ['carpet'], 
        pricePerHour: 3200, 
        rating: 4.6, 
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '6', 
        name: 'Теннисный клуб ЦСКА', 
        address: 'Ленинградский пр-т, 39, Москва', 
        surface: ['hard'], 
        pricePerHour: 3000, 
        rating: 4.8, 
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '7', 
        name: 'Теннисный центр "Динамо"', 
        address: 'Ленинградский пр-т, 36, Москва', 
        surface: ['hard'], 
        pricePerHour: 3500, 
        rating: 4.7, 
        image: 'https://images.unsplash.com/photo-1588611910629-68897b69c693?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '8', 
        name: 'ТК "Коломенский"', 
        address: 'Коломенская наб., 20, Москва', 
        surface: ['hard'], 
        pricePerHour: 2200, 
        rating: 4.5, 
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '9', 
        name: 'Теннис.ру', 
        address: 'Ленинский проспект, 101, Москва', 
        surface: ['carpet'], 
        pricePerHour: 2500, 
        rating: 4.6, 
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '10', 
        name: 'Академия Островского', 
        address: 'Химки, ул. Юннатов, 1А', 
        surface: ['hard'], 
        pricePerHour: 3800, 
        rating: 5.0, 
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '11', 
        name: 'Корты Парка Горького', 
        address: 'Крымский Вал, 9, Москва', 
        surface: ['hard'], 
        pricePerHour: 1500, 
        rating: 4.4, 
        image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '12', 
        name: 'Теннис-Арт', 
        address: 'ул. Мосфильмовская, 41, Москва', 
        surface: ['clay'], 
        pricePerHour: 2800, 
        rating: 4.7, 
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '13', 
        name: 'Sport Station', 
        address: 'Новоостаповская ул., 5, стр. 2, Москва', 
        surface: ['hard'], 
        pricePerHour: 3200, 
        rating: 4.8, 
        image: 'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '14', 
        name: 'ТК "Магия Спорта"', 
        address: 'Крылатская ул., 2, Москва', 
        surface: ['hard'], 
        pricePerHour: 2900, 
        rating: 4.6, 
        image: 'https://images.unsplash.com/photo-1588611910629-68897b69c693?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '15', 
        name: 'Теннисный центр "Жуковка"', 
        address: 'Рублево-Успенское ш., Жуковка', 
        surface: ['hard'], 
        pricePerHour: 5000, 
        rating: 4.9, 
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '16', 
        name: 'ТК "Пироговский"', 
        address: 'Мытищи, ул. Совхозная, 2', 
        surface: ['clay'], 
        pricePerHour: 2400, 
        rating: 4.5, 
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop' 
    },
    { 
        id: '17', 
        name: 'PRO CLUB', 
        address: 'ул. Лобачевского, 114, Москва', 
        surface: ['clay'], 
        pricePerHour: 3100, 
        rating: 4.7, 
        image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop' 
    }
];

let MOCK_LADDER: LadderPlayer[] = [
    { id: 'l1', rank: 1, userId: 'u10', name: 'Даниил М.', avatar: 'https://i.pravatar.cc/150?u=10', points: 2450, matches: 45, winRate: 88, status: 'idle' },
    { id: 'l2', rank: 2, userId: 'u12', name: 'Андрей Р.', avatar: 'https://i.pravatar.cc/150?u=12', points: 2100, matches: 38, winRate: 82, status: 'defending' },
    { id: 'l3', rank: 3, userId: 'u15', name: 'Карен Х.', avatar: 'https://i.pravatar.cc/150?u=15', points: 1950, matches: 40, winRate: 75, status: 'idle' },
    { id: 'l4', rank: 4, userId: 'u1', name: 'Алексей Иванов', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', points: 1800, matches: 32, winRate: 70, status: 'idle' },
    { id: 'l5', rank: 5, userId: 'mock-user-1', name: 'Вы (Демо)', avatar: MOCK_USER.avatar, points: 1650, matches: 28, winRate: 65, status: 'idle' },
];

let MOCK_CHALLENGES: Challenge[] = [
    { id: 'c1', challengerId: 'u22', defenderId: 'u20', challengerName: 'Дмитрий В.', defenderName: 'Сергей К.', rankGap: 1, status: 'scheduled', deadline: '2024-11-01', matchDate: '2024-10-30' },
    { id: 'c2', challengerId: 'u12', defenderId: 'u10', challengerName: 'Андрей Р.', defenderName: 'Даниил М.', rankGap: 1, status: 'pending', deadline: '2024-11-05' },
];

const MOCK_MATCHES: Match[] = [
    { 
        id: '1', 
        userId: 'mock-user-1', 
        opponentName: 'Дмитрий С.', 
        score: '6:4, 7:5', 
        date: '2024-10-20', 
        result: 'win', 
        surface: 'hard', 
        stats: { firstServePercent: 65, doubleFaults: 3, unforcedErrors: 12, winners: 18, aces: 5, breakPointsWon: 3, totalBreakPoints: 5 } 
    }
];

const MOCK_PLAYER_PROFILES: { [key: string]: PlayerProfile } = {
    'u10': {
        ...MOCK_LADDER[0],
        joinDate: '2023-05-12',
        bio: 'Профессиональный игрок, специализируется на быстрых кортах. Агрессивный стиль игры с мощной подачей.',
        stats: { wins: 40, losses: 5, bestRank: 1, currentStreak: 8 },
        rankHistory: [
            { month: 'Май', rank: 10 }, { month: 'Июнь', rank: 8 }, { month: 'Июль', rank: 5 },
            { month: 'Авг', rank: 3 }, { month: 'Сен', rank: 2 }, { month: 'Окт', rank: 1 }
        ],
        recentMatches: [
            { id: 'm1', userId: 'u10', opponentName: 'Андрей Р.', score: '6:3, 6:4', date: '2024-10-15', result: 'win', surface: 'hard' },
            { id: 'm2', userId: 'u10', opponentName: 'Карен Х.', score: '7:6, 6:2', date: '2024-10-02', result: 'win', surface: 'hard' },
        ]
    },
    'mock-user-1': {
        ...MOCK_LADDER[4],
        joinDate: '2024-08-01',
        bio: 'Любитель, активно улучшающий свою игру. Предпочитает играть на задней линии.',
        stats: { wins: 18, losses: 10, bestRank: 5, currentStreak: -1 },
        rankHistory: [
            { month: 'Май', rank: 25 }, { month: 'Июнь', rank: 18 }, { month: 'Июль', rank: 15 },
            { month: 'Авг', rank: 9 }, { month: 'Сен', rank: 7 }, { month: 'Окт', rank: 5 }
        ],
        recentMatches: [
             { id: 'm3', userId: 'mock-user-1', opponentName: 'Игрок №6', score: '6:4, 2:6, 4:6', date: '2024-10-22', result: 'loss', surface: 'clay' },
             { id: 'm4', userId: 'mock-user-1', opponentName: 'Игрок №8', score: '6:3, 7:5', date: '2024-10-18', result: 'win', surface: 'hard' },
        ]
    }
};

const MOCK_TACTICS: Trajectory[] = [
    {
        id: 'mock-tactic-1',
        points: [
            new THREE.Vector3(-5, 0.01, -10),
            new THREE.Vector3(0, 0.01, 0),
            new THREE.Vector3(5, 0.01, 10)
        ],
        color: '#FFFFFF',
        arcHeight: 2.5,
        name: 'Подача',
        annotation: 'Подача в левый угол, высокий отскок',
        playerType: 'user',
        playerName: 'Гость (Демо Режим)'
    }
];

const MOCK_CONVERSATIONS: Conversation[] = [
    { id: '1', partnerId: '1', partnerName: 'Алексей Иванов', partnerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', lastMessage: 'Привет! Готов к матчу в субботу?', timestamp: '10:45 AM', unread: 2, isPro: true },
    { id: '2', partnerId: '2', partnerName: 'Мария Петрова', partnerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', lastMessage: 'Да, давай в 16:00 на кортах "Чайка"', timestamp: 'Вчера', unread: 0, isPro: false },
];

const MOCK_MESSAGES: { [key: string]: ChatMessage[] } = {
    '1': [
        { role: 'partner', text: 'Привет! Готов к матчу в субботу?' },
        { role: 'user', text: 'Привет! Да, конечно. Во сколько?' },
        { role: 'partner', text: 'Думаю, в 12:00 будет отлично.' },
    ],
    '2': [
        { role: 'partner', text: 'Да, давай в 16:00 на кортах "Чайка"' },
    ],
};

const MOCK_GROUPS: Group[] = [
    { id: 'g1', name: 'UTR Pro League', location: 'Москва' },
    { id: 'g2', name: 'Weekend Warriors', location: 'Москва' },
    { id: 'g3', name: 'Новички (Лужники)', location: 'Москва' }
];

let MOCK_TOURNAMENTS: Tournament[] = [];


export const api = {
    auth: {
        register: async (userData: any): Promise<User> => {
            let res;
            try {
                res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
            } catch (networkError) {
                console.warn("Backend offline. Falling back to Demo Mode.");
                return { ...MOCK_USER, ...userData, xp: 0 };
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка регистрации. Проверьте сервер.');
            return data;
        },
        login: async (credentials: any): Promise<User> => {
            let res;
            try {
                res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
            } catch (networkError) {
                console.warn("Backend offline. Falling back to Demo Mode.");
                
                if (credentials.email === 'admin@tennis.pro') {
                    return MOCK_ADMIN;
                }
                
                return MOCK_USER;
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка входа');
            
            return data;
        }
    },

    messages: {
        getConversations: async (userId: string): Promise<Conversation[]> => {
            try {
                const res = await fetch(`${API_URL}/conversations?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch conversations');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch conversations. Returning mock data.");
                return MOCK_CONVERSATIONS;
            }
        },
        getMessages: async (conversationId: string, userId: string): Promise<ChatMessage[]> => {
            try {
                const res = await fetch(`${API_URL}/messages?conversationId=${conversationId}&userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch messages');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch messages. Returning mock data.");
                return MOCK_MESSAGES[conversationId] || [];
            }
        },
        getOrCreateConversation: async (userId: string, partnerId: string): Promise<Conversation> => {
            try {
                const res = await fetch(`${API_URL}/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, partnerId })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to get or create conversation');
                }
                return await res.json();
            } catch (e) {
                console.error("Get/Create Conversation Error:", e);
                // Fallback for demo mode
                const existing = MOCK_CONVERSATIONS.find(c => c.partnerId === partnerId);
                if (existing) return existing;
                const newConvo: Conversation = {
                    id: Math.random().toString(),
                    partnerId: partnerId,
                    partnerName: 'Новый собеседник',
                    partnerAvatar: 'https://ui-avatars.com/api/?name=?',
                    lastMessage: '',
                    timestamp: new Date().toISOString(),
                    unread: 0,
                    isPro: false,
                };
                MOCK_CONVERSATIONS.push(newConvo);
                return newConvo;
            }
        },
        sendMessage: async (senderId: string, partnerId: string, text: string): Promise<ChatMessage> => {
            try {
                const res = await fetch(`${API_URL}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senderId, partnerId, text })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to send message');
                }
                return await res.json();
            } catch (e) {
                console.error("Send Message Error:", e);
                // Fallback for demo mode
                const newMessage: ChatMessage = { role: 'user', text };
                return new Promise(resolve => setTimeout(() => resolve(newMessage), 300));
            }
        }
    },

    matches: {
        getAll: async (userId: string): Promise<Match[]> => {
            try {
                const res = await fetch(`${API_URL}/matches?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch matches');
                return await res.json();
            } catch (e) {
                return MOCK_MATCHES;
            }
        },
        add: async (matchData: any): Promise<Match> => {
            try {
                const res = await fetch(`${API_URL}/matches`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(matchData)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Failed to add match');
                return json;
            } catch (e) {
                return { id: Math.random().toString(), ...matchData };
            }
        }
    },

    students: {
        getAll: async (coachId: string): Promise<Student[]> => {
            try {
                const res = await fetch(`${API_URL}/students?coachId=${coachId}`);
                if (!res.ok) throw new Error('Failed to fetch students');
                return await res.json();
            } catch (e) { 
                console.warn(`Backend offline. Serving in-memory students for coachId: ${coachId}`);
                return MOCK_STUDENTS;
            }
        },
        getOne: async (studentId: string): Promise<Student> => {
            try {
                const res = await fetch(`${API_URL}/students/${studentId}`);
                if (!res.ok) throw new Error('Failed to fetch student details');
                return await res.json();
            } catch (e) {
                console.warn(`Backend offline. Serving in-memory student for id: ${studentId}`);
                const student = MOCK_STUDENTS.find(s => s.id === studentId);
                if (student) return student;
                throw new Error("Mock student not found");
            }
        },
        create: async (data: Partial<Student>): Promise<Student> => {
            try {
                const res = await fetch(`${API_URL}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Error');
                return json;
            } catch (e) {
                console.warn("Backend offline. Mocking student creation.");
                const newStudent: Student = {
                    id: `mock-student-${Date.now()}`,
                    name: data.name || 'No Name',
                    age: data.age || 18,
                    level: data.level || 'NTRP 3.0',
                    balance: data.balance || 0,
                    avatar: data.avatar || '',
                    status: 'active',
                    goals: [],
                    notes: [],
                    xp: 0,
                    skills: { serve: 0, forehand: 0, backhand: 0, stamina: 0, tactics: 0 },
                    badges: [],
                    racketHours: 0,
                    videos: [],
                    ...data,
                };
                MOCK_STUDENTS.push(newStudent);
                return newStudent;
            }
        },
        update: async (id: string, updates: Partial<Student>): Promise<Student> => {
            try {
                const res = await fetch(`${API_URL}/students/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                if (!res.ok) throw new Error('Failed to update student');
                return await res.json();
            } catch (e) { 
                console.warn(`Backend offline. Mocking student update for id: ${id}`);
                const studentIndex = MOCK_STUDENTS.findIndex(s => s.id === id);
                if (studentIndex !== -1) {
                    MOCK_STUDENTS[studentIndex] = { ...MOCK_STUDENTS[studentIndex], ...updates };
                    return MOCK_STUDENTS[studentIndex];
                }
                return updates as Student;
            }
        }
    },

    lessons: {
        getAll: async (coachId: string): Promise<Lesson[]> => {
            try {
                const res = await fetch(`${API_URL}/lessons?coachId=${coachId}`);
                if (!res.ok) throw new Error('Failed to fetch lessons');
                return await res.json();
            } catch (e) {
                console.error("Fetch Lessons Error:", e);
                return [];
            }
        },
        add: async (lessonData: any): Promise<Lesson> => {
            try {
                const res = await fetch(`${API_URL}/lessons`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lessonData)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Error');
                return json;
            } catch (e) { throw e; }
        }
    },

    crm: {
        getStats: async (coachId: string): Promise<CrmStats> => {
            try {
                const res = await fetch(`${API_URL}/crm/stats/${coachId}`);
                if (!res.ok) throw new Error('Failed to fetch CRM stats');
                return await res.json();
            } catch (e) {
                console.error("Fetch CRM Stats Error:", e);
                // Fallback for demo mode or error
                return { activePlayers: 3, totalDebt: 1500, playersInDebt: 1 };
            }
        }
    },

    groups: {
        getAll: async (): Promise<Group[]> => {
            try {
                const res = await fetch(`${API_URL}/groups`);
                if (!res.ok) throw new Error('Failed to fetch groups');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline, returning mock groups", e);
                return MOCK_GROUPS;
            }
        },
        create: async (groupData: Partial<Group>): Promise<Group> => {
            const res = await fetch(`${API_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData)
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to create group');
            }
            return await res.json();
        },
        leave: async (groupId: string, userId: string): Promise<void> => {
            const res = await fetch(`${API_URL}/groups/${groupId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to leave group');
            }
        },
        getMembers: async (groupId: string): Promise<User[]> => {
            const res = await fetch(`${API_URL}/groups/${groupId}/members`);
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to get group members');
            }
            return await res.json();
        },
        getOne: async (groupId: string): Promise<Group> => {
            try {
                const res = await fetch(`${API_URL}/groups/${groupId}`);
                if (!res.ok) throw new Error('Failed to fetch group');
                return await res.json();
            } catch (e) {
                console.warn(`Backend offline, returning mock group for id: ${groupId}`, e);
                const group = MOCK_GROUPS.find(g => g.id === groupId);
                if (group) return group;
                throw new Error("Mock group not found");
            }
        }
    },

    tournaments: {
        getAll: async (userId: string): Promise<Tournament[]> => {
            try {
                const res = await fetch(`${API_URL}/tournaments?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch tournaments');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline, returning mock tournaments", e);
                return MOCK_TOURNAMENTS;
            }
        },
        create: async (data: Partial<Tournament> & { userId: string }): Promise<Tournament> => {
            try {
                const res = await fetch(`${API_URL}/tournaments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Failed to create tournament');
                return json;
            } catch (e) {
                console.warn("Backend offline, mocking tournament creation", e);
                const newTournament = { id: `mock-tourney-${Date.now()}`, ...data } as Tournament;
                MOCK_TOURNAMENTS.push(newTournament);
                return newTournament;
            }
        },
        update: async (id: string, data: Partial<Tournament>): Promise<Tournament> => {
            try {
                const res = await fetch(`${API_URL}/tournaments/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error('Failed to update tournament');
                return await res.json();
            } catch (e) {
                console.warn(`Backend offline, mocking tournament update for id: ${id}`, e);
                const index = MOCK_TOURNAMENTS.findIndex(t => t.id === id);
                if (index > -1) {
                    MOCK_TOURNAMENTS[index] = { ...MOCK_TOURNAMENTS[index], ...data };
                    return MOCK_TOURNAMENTS[index];
                }
                throw new Error("Mock tournament not found for update");
            }
        }
    },

    getPartners: async (params?: { city?: string; level?: string; search?: string }) => {
        try {
            const searchParams = new URLSearchParams();
            if (params?.city) searchParams.append('city', params.city);
            if (params?.level) searchParams.append('level', params.level);
            if (params?.search) searchParams.append('search', params.search);

            const res = await fetch(`${API_URL}/partners?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch partners');
            return await res.json();
        } catch (e) { return MOCK_PARTNERS; }
    },

    getCourts: async (name?: string, city?: string) => {
        try {
            const searchParams = new URLSearchParams();
            if (name) searchParams.append('name', name);
            if (city) searchParams.append('city', city);

            const res = await fetch(`${API_URL}/courts?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch courts');
            return await res.json();
        } catch (e) { 
            console.warn("Backend offline. Serving in-memory courts.");
            // Filter MOCK_COURTS based on name and city
            let filteredMocks = MOCK_COURTS;
            if (name) {
                filteredMocks = filteredMocks.filter(court => court.name.toLowerCase().includes(name.toLowerCase()));
            }
            if (city) {
                filteredMocks = filteredMocks.filter(court => court.address.toLowerCase().includes(city.toLowerCase()));
            }
            return filteredMocks;
        }
    },
    
    getCities: async (): Promise<string[]> => {
        try {
            const res = await fetch(`${API_URL}/cities`);
            if (!res.ok) throw new Error('Failed to fetch cities');
            return await res.json();
        } catch (e) {
            console.warn("Backend offline or failed to fetch cities. Returning mock data.");
            // Fallback to a mock list of cities if backend is offline or request fails
            return ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи'];
        }
    },

    getMarketplaceItems: async (): Promise<MarketplaceItem[]> => {
        try {
            // In the future, this will fetch from a real backend endpoint
            // const res = await fetch(`${API_URL}/marketplace`);
            // if (!res.ok) throw new Error('Failed to fetch marketplace items');
            // return await res.json();
            return new Promise(resolve => setTimeout(() => resolve(MOCK_MARKETPLACE_ITEMS), 500));
        } catch (e) {
            console.warn("Backend offline. Serving in-memory marketplace items.");
            return MOCK_MARKETPLACE_ITEMS;
        }
    },

    getAdvice: async (query: string) => {
        try {
            const res = await fetch(`${API_URL}/ai-coach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            if (!res.ok) throw new Error('AI Service Error');
            const data = await res.json();
            return data.text;
        } catch (e) { return "Демо-режим: Сервер AI недоступен."; }
    },

    // --- ADMIN API ---
    admin: {
        getLogs: async (): Promise<SystemLog[]> => {
             try {
                 const res = await fetch(`${API_URL}/admin/logs`);
                 if (!res.ok) return [];
                 return await res.json();
             } catch(e) { return []; }
        },
        getStats: async () => {
            try {
                 const res = await fetch(`${API_URL}/admin/stats`);
                 if (!res.ok) throw new Error("Failed");
                 return await res.json();
            } catch(e) { 
                return { revenue: 0, activeUsers: 0, newSignups: 0, serverLoad: 0 }; 
            }
        },
        getUsers: async (): Promise<User[]> => {
            try {
                const res = await fetch(`${API_URL}/admin/users`);
                if (!res.ok) return [];
                return await res.json();
            } catch(e) { return []; }
        },
        createUser: async (data: Partial<User> & { password?: string }): Promise<User | null> => {
            try {
                const res = await fetch(`${API_URL}/admin/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error('Failed to create user');
                return await res.json();
            } catch (e) {
                console.error(e);
                return null;
            }
        },
        updateUser: async (id: string, data: Partial<User>): Promise<void> => {
            try {
                const res = await fetch(`${API_URL}/admin/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to update user');
                }
            } catch (e) {
                console.error(e);
                throw e; // Re-throw the error to be caught by the calling component
            }
        },
        deleteUser: async (id: string) => {
            try {
                await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
            } catch (e) { console.error(e); }
        },
        // Products
        getProducts: async (): Promise<Product[]> => {
            try {
                const res = await fetch(`${API_URL}/products`);
                if (!res.ok) return [];
                return await res.json();
            } catch(e) { return []; }
        },
        saveProduct: async (product: Partial<Product>) => {
            try {
                let res;
                // Create or Update
                if (product.id && !product.id.startsWith('0.')) { 
                    res = await fetch(`${API_URL}/products/${product.id}`, {
                         method: 'PUT',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify(product)
                     });
                 } else {
                    res = await fetch(`${API_URL}/products`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify(product)
                     });
                 }
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to save product');
                }
                
                return await res.json();
            } catch (e) { 
                console.warn("Backend offline. Saving to in-memory mocks.");
                
                // Simulate backend logic for Offline Mode
                const newProduct = { ...product, id: product.id || `mock-${Date.now()}` } as Product;
                if (product.id) {
                    const index = MOCK_PRODUCTS.findIndex(p => p.id === product.id);
                    if (index !== -1) {
                        MOCK_PRODUCTS[index] = { ...MOCK_PRODUCTS[index], ...newProduct };
                    } else {
                        MOCK_PRODUCTS.push(newProduct);
                    }
                } else {
                    MOCK_PRODUCTS.push(newProduct);
                }
                
                return newProduct;
            }
        },
        deleteProduct: async (id: string) => {
            try {
                await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
            } catch (e) { 
                console.warn("Backend offline. Deleting from in-memory mocks.");
                MOCK_PRODUCTS = MOCK_PRODUCTS.filter(p => p.id !== id);
            }
        }
        ,
        // Courts Management
        saveCourt: async (court: Partial<Court>) => {
            try {
                let res;
                // Check if ID is present and valid (not temp '0.' or 'mock-')
                if (court.id && !court.id.startsWith('0.')) { 
                    res = await fetch(`${API_URL}/courts/${court.id}`, {
                         method: 'PUT',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify(court)
                     });
                 } else {
                    res = await fetch(`${API_URL}/courts`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify(court)
                     });
                 }
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to save court');
                }
                
                return await res.json();
            } catch (e) { 
                console.warn("Backend offline. Saving to in-memory mocks.");
                
                // Simulate backend logic for Offline Mode
                const newCourt = {
                    ...court,
                    id: court.id || `mock-${Date.now()}`, // Generate mock ID
                    rating: court.rating || 5.0,
                    // Ensure defaults
                    name: court.name || 'New Court',
                    address: court.address || 'Address',
                    surface: court.surface || ['hard'],
                    pricePerHour: court.pricePerHour || 0,
                    image: court.image || ''
                } as Court;

                if (court.id) {
                    const index = MOCK_COURTS.findIndex(c => c.id === court.id);
                    if (index !== -1) {
                        MOCK_COURTS[index] = { ...MOCK_COURTS[index], ...newCourt };
                    } else {
                        MOCK_COURTS.push(newCourt);
                    }
                } else {
                    MOCK_COURTS.push(newCourt);
                }
                
                return newCourt;
            }
        },
        deleteCourt: async (id: string) => {
            try {
                await fetch(`${API_URL}/courts/${id}`, { method: 'DELETE' });
            } catch (e) { 
                console.warn("Backend offline. Deleting from in-memory mocks.");
                MOCK_COURTS = MOCK_COURTS.filter(c => c.id !== id);
            }
        }
    },

    ladder: {
        getRankings: async (ladderType: 'club_elo' | 'rtt_rating'): Promise<LadderPlayer[]> => {
            try {
                const res = await fetch(`${API_URL}/ladder/rankings?type=${ladderType}`);
                if (!res.ok) throw new Error('Failed to fetch ladder rankings');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch rankings. Returning mock data.");
                return MOCK_LADDER;
            }
        },
        getChallenges: async (userId: string): Promise<Challenge[]> => {
            try {
                const res = await fetch(`${API_URL}/ladder/challenges?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch ladder challenges');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch challenges. Returning mock data.");
                return MOCK_CHALLENGES;
            }
        },
        getPlayerProfile: async (userId: string): Promise<PlayerProfile | null> => {
            console.log(`Fetching profile for ${userId}`);
            try {
                const res = await fetch(`${API_URL}/ladder/player/${userId}`);
                if (!res.ok) throw new Error('Failed to fetch player profile');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch player profile. Returning mock data.");
                const profile = MOCK_PLAYER_PROFILES[userId];
                // If no specific profile, create a generic one from the ladder list
                if (!profile) {
                    const ladderInfo = MOCK_LADDER.find(p => p.userId === userId);
                    if (!ladderInfo) return null;
                    return {
                        ...ladderInfo,
                        joinDate: '2023-05-12',
                        bio: 'Нет дополнительной информации об этом игроке.',
                        stats: { wins: Math.round(ladderInfo.matches * (ladderInfo.winRate/100)), losses: Math.round(ladderInfo.matches * (1-(ladderInfo.winRate/100))), bestRank: ladderInfo.rank, currentStreak: 1 },
                        rankHistory: [{ month: 'Окт', rank: ladderInfo.rank }],
                        recentMatches: []
                    };
                }
                return profile;
            }
        },
        createChallenge: async (challenger: LadderPlayer, defender: LadderPlayer, eventType: 'friendly' | 'cup' | 'masters'): Promise<Challenge> => {
            try {
                const res = await fetch(`${API_URL}/ladder/challenges`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        challengerId: challenger.userId, 
                        defenderId: defender.userId,
                        eventType: eventType
                    })
                });
                if (!res.ok) throw new Error('Failed to create challenge');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to create challenge. Returning mock data.");
                return {
                    id: Math.random().toString(),
                    challengerId: challenger.userId,
                    defenderId: defender.userId,
                    challengerName: challenger.name,
                    defenderName: defender.name,
                    rankGap: challenger.rank - defender.rank,
                    status: 'pending',
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    eventType: eventType
                };
            }
        },
        acceptChallenge: async (challengeId: string, userId: string): Promise<Challenge> => {
            try {
                const res = await fetch(`${API_URL}/ladder/challenges/${challengeId}/accept`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });
                if (!res.ok) throw new Error('Failed to accept challenge');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to accept challenge.", e);
                // Mock behavior
                const challenge = MOCK_CHALLENGES.find(c => c.id === challengeId);
                if (challenge) {
                    challenge.status = 'scheduled';
                    return challenge;
                }
                throw e;
            }
        },
        cancelChallenge: async (challengeId: string): Promise<void> => {
            try {
                const res = await fetch(`${API_URL}/ladder/challenges/${challengeId}`, {
                    method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to cancel challenge');
            } catch (e) {
                console.warn("Backend offline or failed to cancel challenge.", e);
                // Mock behavior
                MOCK_CHALLENGES = MOCK_CHALLENGES.filter(c => c.id !== challengeId);
            }
        },
        enterScore: async (challengeId: string, score: string, winnerId: string): Promise<void> => {
            try {
                const res = await fetch(`${API_URL}/ladder/challenges/${challengeId}/result`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score, winnerId })
                });
                if (!res.ok) throw new Error('Failed to enter score');
            } catch (e) {
                console.error("Enter score error:", e);
                throw e;
            }
        },
    },

    posts: {
        getAll: async (userId: string): Promise<any[]> => {
            try {
                const res = await fetch(`${API_URL}/posts?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch posts');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch posts. Returning empty array.");
                return [];
            }
        },
        create: async (postData: { userId: string, type: string, content: any }): Promise<{ success: boolean, postId: number }> => {
            const res = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to create post');
            }
            return await res.json();
        },
        toggleLike: async (postId: string, userId: string): Promise<{ success: boolean, action: 'liked' | 'unliked' }> => {
            const res = await fetch(`${API_URL}/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to toggle like');
            }
            return await res.json();
        },
        addComment: async (postId: string, userId: string, text: string): Promise<any> => {
            const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, text })
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to add comment');
            }
            return await res.json();
        }
    },

    tactics: {
        list: async (userId: string): Promise<any[]> => {
            try {
                const res = await fetch(`${API_URL}/tactics/list/${userId}`);
                if (!res.ok) throw new Error('Failed to fetch tactics list');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline or failed to fetch tactics. Returning mock data.", e);
                return MOCK_TACTICS; 
            }
        },
        create: async (data: { userId: string, name: string, trajectories: any[] }): Promise<Trajectory> => {
            const res = await fetch(`${API_URL}/tactics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error || 'Failed to create tactic');
            }
            return await res.json();
        },
        update: async (tacticId: string, data: { name: string, trajectories: any[] }): Promise<Trajectory> => {
            const res = await fetch(`${API_URL}/tactic/${tacticId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update tactic');
            }
            return await res.json();
        },
        delete: async (tacticId: string): Promise<void> => {
            const res = await fetch(`${API_URL}/tactic/${tacticId}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete tactic');
            }
        }
    },

    notifications: {
        getUnreadCount: async (userId: string): Promise<{ count: number }> => {
            try {
                const res = await fetch(`${API_URL}/notifications/unread-count/${userId}`);
                if (!res.ok) throw new Error('Failed to fetch unread notification count');
                return await res.json();
            } catch (e) {
                console.error("Get unread notifications error:", e);
                return { count: 0 };
            }
        },
        getAll: async (userId: string): Promise<Notification[]> => {
            try {
                const res = await fetch(`${API_URL}/notifications/${userId}`);
                if (!res.ok) throw new Error('Failed to fetch notifications');
                return await res.json();
            } catch (e) {
                 console.error("Get all notifications error:", e);
                return [];
            }
        },
        markAsRead: async (notificationId: string): Promise<void> => {
            try {
                const res = await fetch(`${API_URL}/notifications/mark-read/${notificationId}`, {
                    method: 'POST'
                });
                if (!res.ok) throw new Error('Failed to mark notification as read');
            } catch (e) {
                console.error("Mark notification as read error:", e);
            }
        }
    }
};
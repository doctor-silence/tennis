
import { Partner, Court, User, Student, SystemLog, LadderPlayer, Challenge, Match } from '../types';

// Frontend API Service
const API_URL = 'http://localhost:3001/api';

// --- MOCK DATA FALLBACKS (For Demo/Offline Mode) ---

const MOCK_USER: User = {
  id: 'mock-user-1',
  name: 'Гость (Демо Режим)',
  email: 'demo@tennis.pro',
  role: 'amateur',
  city: 'Москва',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  rating: 1200,
  age: 25,
  level: 'NTRP 3.5'
};

const MOCK_ADMIN: User = {
    id: 'admin-1',
    name: 'Администратор',
    email: 'admin@tennis.pro',
    role: 'admin',
    city: 'HQ',
    avatar: 'https://ui-avatars.com/api/?name=Admin+Panel&background=0f172a&color=bef264',
    rating: 9999,
    age: 99,
    level: 'GOD MODE'
};

const MOCK_PARTNERS: Partner[] = [
    { id: '1', name: 'Алексей Иванов', age: 28, level: 'NTRP 4.5', city: 'Москва', isPro: true, image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    { id: '2', name: 'Мария Петрова', age: 24, level: 'NTRP 4.0', city: 'Москва', isPro: false, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
];

const MOCK_COURTS: Court[] = [
    { id: '1', name: 'Теннис Парк', address: 'ул. Ленина 12, Москва', surface: 'hard', pricePerHour: 2500, rating: 4.8, image: 'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=600&auto=format&fit=crop' },
];

const MOCK_LOGS: SystemLog[] = [
    { id: '1', level: 'info', message: 'User login: alex@mail.ru', timestamp: '10:42:15', module: 'Auth' },
    { id: '2', level: 'success', message: 'Payment processed: Order #4921 (24,990 ₽)', timestamp: '10:40:00', module: 'Shop' },
    { id: '3', level: 'warning', message: 'High memory usage detected (85%)', timestamp: '10:35:12', module: 'Server' },
    { id: '4', level: 'info', message: 'New court booking: Court #3', timestamp: '10:30:45', module: 'Booking' },
    { id: '5', level: 'error', message: 'Failed to sync with Gemini API: Timeout', timestamp: '10:15:20', module: 'AI_Coach' },
    { id: '6', level: 'success', message: 'Backup completed successfully', timestamp: '09:00:00', module: 'System' },
];

const MOCK_LADDER: LadderPlayer[] = [
    { id: 'l1', rank: 1, userId: 'u10', name: 'Даниил М.', avatar: 'https://i.pravatar.cc/150?u=10', points: 2450, matches: 45, winRate: 88, status: 'idle' },
    { id: 'l2', rank: 2, userId: 'u12', name: 'Андрей Р.', avatar: 'https://i.pravatar.cc/150?u=12', points: 2100, matches: 38, winRate: 82, status: 'defending' },
    { id: 'l3', rank: 3, userId: 'u15', name: 'Карен Х.', avatar: 'https://i.pravatar.cc/150?u=15', points: 1950, matches: 40, winRate: 75, status: 'idle' },
    { id: 'l4', rank: 4, userId: 'u1', name: 'Алексей Иванов', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', points: 1800, matches: 32, winRate: 70, status: 'idle' },
    { id: 'l5', rank: 5, userId: 'mock-user-1', name: 'Вы (Демо)', avatar: MOCK_USER.avatar, points: 1650, matches: 28, winRate: 65, status: 'idle' },
    { id: 'l6', rank: 6, userId: 'u20', name: 'Сергей К.', avatar: 'https://i.pravatar.cc/150?u=20', points: 1500, matches: 25, winRate: 60, status: 'idle' },
    { id: 'l7', rank: 7, userId: 'u22', name: 'Дмитрий В.', avatar: 'https://i.pravatar.cc/150?u=22', points: 1400, matches: 20, winRate: 55, status: 'challenging' },
];

const MOCK_CHALLENGES: Challenge[] = [
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
    },
    { 
        id: '2', 
        userId: 'mock-user-1', 
        opponentName: 'Алексей И.', 
        score: '3:6, 4:6', 
        date: '2024-10-15', 
        result: 'loss', 
        surface: 'clay',
        stats: { firstServePercent: 55, doubleFaults: 6, unforcedErrors: 20, winners: 10, aces: 2, breakPointsWon: 1, totalBreakPoints: 4 }
    }
];

export const api = {
    auth: {
        register: async (userData: any): Promise<User> => {
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Ошибка регистрации. Проверьте сервер.');
                return data;
            } catch (e: any) {
                console.warn("Backend offline. Falling back to Demo Mode.");
                // Return mock user with the provided data
                return { 
                    ...MOCK_USER, 
                    name: userData.name || 'Demo User',
                    role: userData.role || 'amateur',
                    city: userData.city || 'Москва',
                    age: userData.age,
                    rating: userData.rating,
                    level: userData.level,
                    rttCategory: userData.rttCategory,
                    rttRank: userData.rttRank
                };
            }
        },
        login: async (credentials: any): Promise<User> => {
            // ADMIN BACKDOOR FOR DEMO
            if (credentials.email === 'admin@tennis.pro') {
                return MOCK_ADMIN;
            }

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Ошибка входа');
                return data;
            } catch (e: any) {
                console.warn("Backend offline. Falling back to Demo Mode.");
                return MOCK_USER;
            }
        }
    },

    // Matches
    matches: {
        getAll: async (userId: string): Promise<Match[]> => {
            try {
                const res = await fetch(`${API_URL}/matches?userId=${userId}`);
                if (!res.ok) throw new Error('Failed to fetch matches');
                return await res.json();
            } catch (e) {
                console.warn("Matches offline fallback");
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

    // Students CRM
    students: {
        getAll: async (coachId: string): Promise<Student[]> => {
            try {
                const res = await fetch(`${API_URL}/students?coachId=${coachId}`);
                if (!res.ok) throw new Error('Failed to fetch students');
                return await res.json();
            } catch (e) {
                console.warn("Using mock students data (Server offline?)");
                return []; 
            }
        },
        create: async (data: any): Promise<Student> => {
            try {
                const res = await fetch(`${API_URL}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Не удалось создать ученика');
                return json;
            } catch (e) {
                // Return a mock created student for UI preview
                 return {
                    id: Math.random().toString(),
                    coachId: data.coachId,
                    name: data.name,
                    age: data.age,
                    level: data.level,
                    avatar: data.avatar,
                    balance: 0,
                    nextLesson: 'Не назначено',
                    status: 'active',
                    goals: '',
                    notes: ''
                };
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
                // Mock update return
                return { id, ...updates } as Student;
            }
        }
    },

    // Partners (Read Only - safe to mock if needed)
    getPartners: async (params?: { city?: string; level?: string; search?: string }) => {
        try {
            const searchParams = new URLSearchParams();
            if (params?.city) searchParams.append('city', params.city);
            if (params?.level) searchParams.append('level', params.level);
            if (params?.search) searchParams.append('search', params.search);

            const res = await fetch(`${API_URL}/partners?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch partners');
            return await res.json();
        } catch (e) {
            console.warn("Backend unavailable, using mock data for Partners");
            return MOCK_PARTNERS;
        }
    },

    // Courts (Read Only - safe to mock if needed)
    getCourts: async () => {
        try {
            const res = await fetch(`${API_URL}/courts`);
            if (!res.ok) throw new Error('Failed to fetch courts');
            return await res.json();
        } catch (e) {
            console.warn("Backend unavailable, using mock data for Courts");
            return MOCK_COURTS;
        }
    },

    // AI Coach
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
        } catch (e) {
            return "Демо-режим: Сервер AI недоступен. Подключите backend для реальных ответов.";
        }
    },

    admin: {
        getLogs: async (): Promise<SystemLog[]> => {
             return new Promise(resolve => setTimeout(() => resolve(MOCK_LOGS), 500));
        },
        getStats: async () => {
            return {
                revenue: 1450000,
                activeUsers: 15420,
                newSignups: 124,
                serverLoad: 34
            };
        }
    },

    ladder: {
        getRankings: async (): Promise<LadderPlayer[]> => {
            return new Promise(resolve => setTimeout(() => resolve(MOCK_LADDER), 400));
        },
        getChallenges: async (): Promise<Challenge[]> => {
             return new Promise(resolve => setTimeout(() => resolve(MOCK_CHALLENGES), 400));
        },
        createChallenge: async (challenger: LadderPlayer, defender: LadderPlayer): Promise<Challenge> => {
            return {
                id: Math.random().toString(),
                challengerId: challenger.userId,
                defenderId: defender.userId,
                challengerName: challenger.name,
                defenderName: defender.name,
                rankGap: challenger.rank - defender.rank,
                status: 'pending',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // + 7 days
            };
        }
    }
};

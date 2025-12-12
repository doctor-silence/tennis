
import { Partner, Court, User, Student, SystemLog, LadderPlayer, Challenge, Match, Product } from '../types';

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
  id: 'mock-admin-1',
  name: 'Супер Админ (Демо)',
  email: 'admin@tennis.pro',
  role: 'admin',
  city: 'HQ',
  avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
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

const MOCK_LADDER: LadderPlayer[] = [
    { id: 'l1', rank: 1, userId: 'u10', name: 'Даниил М.', avatar: 'https://i.pravatar.cc/150?u=10', points: 2450, matches: 45, winRate: 88, status: 'idle' },
    { id: 'l2', rank: 2, userId: 'u12', name: 'Андрей Р.', avatar: 'https://i.pravatar.cc/150?u=12', points: 2100, matches: 38, winRate: 82, status: 'defending' },
    { id: 'l3', rank: 3, userId: 'u15', name: 'Карен Х.', avatar: 'https://i.pravatar.cc/150?u=15', points: 1950, matches: 40, winRate: 75, status: 'idle' },
    { id: 'l4', rank: 4, userId: 'u1', name: 'Алексей Иванов', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', points: 1800, matches: 32, winRate: 70, status: 'idle' },
    { id: 'l5', rank: 5, userId: 'mock-user-1', name: 'Вы (Демо)', avatar: MOCK_USER.avatar, points: 1650, matches: 28, winRate: 65, status: 'idle' },
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
    }
];

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
                // Если fetch упал (нет сети), только тогда используем Mock
                console.warn("Backend offline. Falling back to Demo Mode.");
                return { ...MOCK_USER, ...userData };
            }

            const data = await res.json();
            // Если сервер ответил ошибкой (например, email занят), выбрасываем её, чтобы UI показал ошибку
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
                // Если fetch упал (нет сети), используем Mock
                console.warn("Backend offline. Falling back to Demo Mode.");
                
                // ИСПРАВЛЕНИЕ: Если ввели email админа, возвращаем MOCK_ADMIN
                if (credentials.email === 'admin@tennis.pro') {
                    return MOCK_ADMIN;
                }
                
                return MOCK_USER;
            }

            const data = await res.json();
            // Если сервер ответил 401 (неверный пароль), мы выбрасываем ошибку
            if (!res.ok) throw new Error(data.error || 'Ошибка входа');
            
            return data;
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
            } catch (e) { return []; }
        },
        create: async (data: any): Promise<Student> => {
            try {
                const res = await fetch(`${API_URL}/students`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Error');
                return json;
            } catch (e) { throw e; }
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
            } catch (e) { throw e; }
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

    getCourts: async () => {
        try {
            const res = await fetch(`${API_URL}/courts`);
            if (!res.ok) throw new Error('Failed to fetch courts');
            return await res.json();
        } catch (e) { return MOCK_COURTS; }
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
                 return await res.json();
             } catch(e) { return []; }
        },
        getStats: async () => {
            try {
                 const res = await fetch(`${API_URL}/admin/stats`);
                 return await res.json();
            } catch(e) { 
                return { revenue: 0, activeUsers: 0, newSignups: 0, serverLoad: 0 }; 
            }
        },
        getUsers: async (): Promise<User[]> => {
            try {
                const res = await fetch(`${API_URL}/admin/users`);
                return await res.json();
            } catch(e) { return []; }
        },
        updateUser: async (id: string, data: Partial<User>) => {
            await fetch(`${API_URL}/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },
        deleteUser: async (id: string) => {
            await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        },
        // Products
        getProducts: async (): Promise<Product[]> => {
            try {
                const res = await fetch(`${API_URL}/products`);
                return await res.json();
            } catch(e) { return []; }
        },
        saveProduct: async (product: Partial<Product>) => {
             // Create or Update
             if (product.id && !product.id.startsWith('0.')) { // Assuming real IDs are not random floats
                 await fetch(`${API_URL}/products/${product.id}`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(product)
                 });
             } else {
                 await fetch(`${API_URL}/products`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(product)
                 });
             }
        },
        deleteProduct: async (id: string) => {
            await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
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
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
        }
    }
};

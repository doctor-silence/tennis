import React, { useState, useEffect } from 'react';
import { Users, Tag, ShoppingCart, Plus, Lock, Globe, Rss, Swords, Search, Award, MessageCircle, Trophy, Calendar } from 'lucide-react';
import { MarketplaceItem, User, LadderPlayer } from '../../types';
import { api } from '../../services/api';
import Button from '../Button';

const MOCK_LADDER: LadderPlayer[] = [
    { id: 'l1', rank: 1, userId: 'u10', name: 'Даниил М.', avatar: 'https://i.pravatar.cc/150?u=10', points: 2450, matches: 45, winRate: 88, status: 'idle' },
    { id: 'l2', rank: 2, userId: 'u12', name: 'Андрей Р.', avatar: 'https://i.pravatar.cc/150?u=12', points: 2100, matches: 38, winRate: 82, status: 'defending' },
    { id: 'l3', rank: 3, userId: 'u15', name: 'Карен Х.', avatar: 'https://i.pravatar.cc/150?u=15', points: 1950, matches: 40, winRate: 75, status: 'idle' },
    { id: 'l4', rank: 4, userId: 'u1', name: 'Алексей Иванов', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', points: 1800, matches: 32, winRate: 70, status: 'idle' },
    { id: 'l5', rank: 5, userId: 'mock-user-1', name: 'Вы (Демо)', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', points: 1650, matches: 28, winRate: 65, status: 'idle' },
];

const MOCK_USER: User = {
  id: 'mock-user-1',
  name: 'Гость (Демо Режим)',
  email: 'demo@tennis.pro',
  role: 'amateur',
  city: 'Москва',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  rating: 1200,
  xp: 150,
  age: 25,
  level: 'NTRP 3.5'
};

const mockFeed = [
    { 
        type: 'match', 
        id: 'f1',
        user1: { name: 'Иван П.', avatar: 'https://i.pravatar.cc/150?u=a' },
        user2: { name: 'Алексей С.', avatar: 'https://i.pravatar.cc/150?u=b' },
        score: '6:4, 6:2',
        timestamp: '2 часа назад'
    },
    {
        type: 'achievement',
        id: 'f2',
        user: { name: 'Елена В.', avatar: 'https://i.pravatar.cc/150?u=c' },
        achievement: 'Выиграла 3 матча подряд!',
        timestamp: '5 часов назад'
    },
    {
        type: 'search',
        id: 'f3',
        user: { name: 'Сергей Н.', avatar: 'https://i.pravatar.cc/150?u=d' },
        message: 'Нужен партнер сегодня в 20:00, корты "Спартак", уровень 3.5-4.0. Оплата корта пополам.',
        timestamp: '8 часов назад'
    }
];

const mockGroups = [
    { id: 1, name: 'Теннис Хамовники', members: 1240, type: 'public', avatar: 'T' },
    { id: 2, name: 'Игроки Севера', members: 856, type: 'private', avatar: 'И' },
    { id: 3, name: 'Спарринг Москва', members: 3400, type: 'public', avatar: 'С' },
];

const CommunityView2 = () => {
    const [activeTab, setActiveTab] = useState('Все события');

    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <Button 
                    onClick={() => setActiveTab('Все события')}
                    variant={activeTab === 'Все события' ? 'primary' : 'light'}
                >
                    Все события
                </Button>
                <Button 
                    onClick={() => setActiveTab('Результаты матчей')}
                    variant={activeTab === 'Результаты матчей' ? 'primary' : 'light'}
                >
                    Результаты матчей
                </Button>
                <Button 
                    onClick={() => setActiveTab('Поиск игры')}
                    variant={activeTab === 'Поиск игры' ? 'primary' : 'light'}
                >
                    Поиск игры
                </Button>
                <Button 
                    onClick={() => setActiveTab('Барахолка')}
                    variant={activeTab === 'Барахолка' ? 'primary' : 'light'}
                >
                    Барахолка
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <PostStatus />
                    <Feed />
                </div>
                <div className="space-y-6">
                    <TournamentsWidget />
                    <TopPlayersWidget />
                    <GroupsWidget />
                    <MarketplaceWidget />
                </div>
            </div>
        </div>
    );
};

const PostStatus = () => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex gap-4 items-center">
            <img src={'https://i.pravatar.cc/150?u=us'} alt="user avatar" className="w-10 h-10 rounded-full" />
            <input className="w-full bg-transparent p-3 text-sm outline-none border-none" placeholder="Что нового, чемпион?" />
        </div>
        <div className="flex justify-between items-center mt-3">
            <div className="flex gap-4 text-slate-400">
                <button className="hover:text-lime-500"><Tag size={20} /></button>
                <button className="hover:text-lime-500"><Swords size={20} /></button>
                <button className="hover:text-lime-500"><Trophy size={20} /></button>
                <button className="hover:text-lime-500"><ShoppingCart size={20} /></button>
            </div>
            <Button>Опубликовать</Button>
        </div>
    </div>
);

const Feed = () => {
    // In a real app, you'd fetch a combined feed.
    // Here we'll just alternate between mock feed and market items.
    const [feedItems, setFeedItems] = useState(mockFeed);
    const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);

    useEffect(() => {
        api.getMarketplaceItems().then(data => {
            setMarketItems(data.slice(0, 1)); // Take one for the feed
        });
    }, []);

    return (
        <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-lime-200">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" alt="user" className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-bold">Дмитрий Смирнов</p>
                            <p className="text-xs text-slate-400">15 мин назад・NTRP 4.0</p>
                        </div>
                    </div>
                    <div className="text-xs font-bold bg-lime-100 text-lime-700 px-2 py-1 rounded">ПОИСК ПАРТНЕРА</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 my-4">
                    <div className="flex justify-around">
                        <div>
                            <p className="text-xs text-slate-400">КОГДА</p>
                            <p className="font-bold flex items-center gap-2"><Calendar size={16}/> Завтра, 20:00</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">ГДЕ</p>
                            <p className="font-bold flex items-center gap-2"><Globe size={16}/> ТК "Спартак"</p>
                        </div>
                    </div>
                     <p className="text-center text-sm mt-3 text-slate-600">"Ищу партнера на 2 часа. Корт забронирован. Оплата пополам."</p>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-sm"><span className="text-slate-500">Требование:</span> <span className="font-bold">3.5 - 4.0</span></p>
                    <Button><Swords size={16}/>Сыграть</Button>
                </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
                <div className="flex gap-4 items-center">
                     <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" alt="user" className="w-10 h-10 rounded-full" />
                     <div>
                         <p className="font-bold">Андрей Рублев</p>
                         <p className="text-xs text-slate-400">4 часа назад</p>
                     </div>
                </div>
                <div className="flex items-center gap-4 my-4">
                    <div className="w-16 h-16 bg-lime-400/20 rounded-xl flex items-center justify-center">
                        <Trophy size={32} className="text-lime-400"/>
                    </div>
                    <div>
                        <p className="font-bold text-lime-400 text-lg">Серия побед</p>
                        <p className="text-sm text-slate-300">Выиграл 5 матчей подряд в лиге "Взрослые PRO"</p>
                    </div>
                </div>
                <div className="border-t border-slate-700 pt-3">
                    <button className="text-sm text-amber-400 font-bold">Поздравить (890)</button>
                </div>
                <Trophy size={128} className="absolute -right-8 -bottom-8 text-white/5" />
            </div>

            {/* Placeholder for merged feed */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>РЕЗУЛЬТАТ МАТЧА</span>
                    <span>Сегодня, 10:30</span>
                </div>
                 <p>результат матча</p>
            </div>
            
            {marketItems.map(item => (
                <div  key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                        <span>БАРАХОЛКА - МОСКВА</span>
                        <span>30 мин назад</span>
                    </div>
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <img src={'https://images.unsplash.com/photo-1617083934555-52951271b273?q=80&w=800&auto=format&fit=crop'} alt={item.title} className="h-80 w-full object-cover rounded-xl" />
                        <div className="py-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">Б/У, отличное</div>
                                    <h4 className="font-bold text-xl mt-2">Ракетка Wilson Blade 98 v8</h4>
                                </div>
                                <div className="text-2xl font-bold text-slate-800">14 000 ₽</div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2">
                                    <img src={'https://i.pravatar.cc/150?u=e'} alt={item.sellerName} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">Елена В.</div>
                                    </div>
                                </div>
                                <Button>Написать продавцу</Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const TournamentsWidget = () => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar size={20} className="text-slate-400"/>
                Турниры
            </h3>
            <a href="#" className="text-sm font-bold text-lime-600">Все</a>
        </div>
        <div className="space-y-4">
            {/* Mock tournament data */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-red-600">ОКТ</span>
                    <span className="font-bold text-lg">24</span>
                </div>
                <div>
                    <p className="font-bold text-sm">Weekend Cup Amateur</p>
                    <p className="text-xs text-slate-500">Теннис Парк</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-red-600">НОЯ</span>
                    <span className="font-bold text-lg">01</span>
                </div>
                <div>
                    <p className="font-bold text-sm">Autumn Indoor Open</p>
                    <p className="text-xs text-slate-500">Мультиспорт</p>
                </div>
            </div>
        </div>
    </div>
);

const TopPlayersWidget = () => (
    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Trophy size={20} className="text-amber-400"/>
                Топ игроков
            </h3>
            <a href="#" className="text-sm font-bold text-lime-400">&rarr;</a>
        </div>
        <div className="space-y-3">
            {MOCK_LADDER.slice(0, 3).map(p => (
                 <div key={p.id} className="flex justify-between items-center text-sm">
                     <div className="flex items-center gap-2">
                         <span className="font-bold bg-amber-400 text-slate-900 rounded-md w-6 h-6 flex items-center justify-center">{p.rank}</span>
                         <span className="font-bold">{p.name}</span>
                     </div>
                     <span className="font-bold text-lime-400">{p.points}</span>
                 </div>
            ))}
            <div className="border-t border-slate-700 my-3 pt-3">
             <div className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2">
                     <span className="font-normal text-slate-400">Вы: #{MOCK_LADDER[4].rank}</span>
                 </div>
                 <span className="font-normal text-slate-400">{MOCK_LADDER[4].points} pts</span>
             </div>
             </div>
        </div>
    </div>
);

const GroupsWidget = () => (
     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Users size={20} className="text-slate-400"/>
                Группы
            </h3>
        </div>
        <div className="space-y-3">
            {mockGroups.map(g => (
                <div key={g.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500">
                             {g.avatar}
                         </div>
                         <div>
                            <p className="font-bold text-sm">{g.name}</p>
                            <p className="text-xs text-slate-400">{g.members} уч.</p>
                         </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-8 h-8 p-0 text-xl font-normal">+</Button>
                </div>
            ))}
        </div>
    </div>
);

const MarketplaceWidget = () => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center">
             <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart size={20} className="text-slate-400"/>
                Барахолка
            </h3>
        </div>
    </div>
);

export default CommunityView2;
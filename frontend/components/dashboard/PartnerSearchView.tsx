
import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Radar, CheckCircle2, Loader2 } from 'lucide-react';
import { Partner, DashboardTab, User, PlayerProfile } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import PlayerProfileFlyout from './PlayerProfileFlyout';

interface PartnerSearchViewProps {
    user: User;
    onNavigate: (tab: DashboardTab) => void;
    onStartConversation: (partnerId: string) => void;
    onCreateChallenge: (opponentId: string) => void;
}

const PartnerSearchView = ({ user, onNavigate, onStartConversation, onCreateChallenge }: PartnerSearchViewProps) => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [filter, setFilter] = useState({ city: '', level: 'all', search: '', rtt_only: false });
    const [cities, setCities] = useState<string[]>([]);
    const [onlineStats, setOnlineStats] = useState<{ online: number; total: number } | null>(null);
    const [fakeOnline, setFakeOnline] = useState(Math.floor(Math.random() * 11) + 20);

    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [selectedProfileAnchorY, setSelectedProfileAnchorY] = useState<number | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState<string | null>(null); // stores partnerId being loaded

    // Анимированный счётчик онлайна: меняется каждые 4-7 секунд
    useEffect(() => {
        const tick = () => {
            setFakeOnline(prev => {
                const delta = Math.random() < 0.5 ? 1 : -1;
                const next = prev + delta;
                return Math.min(30, Math.max(20, next));
            });
        };
        const id = setInterval(tick, Math.random() * 10000 + 15000);
        return () => clearInterval(id);
    }, []);

    // Пинг сервера каждые 30 секунд + загрузка статистики
    useEffect(() => {
        const ping = () => {
            if (user?.id) api.pingOnline(user.id);
            api.getOnlineStats().then(setOnlineStats);
        };
        ping();
        const interval = setInterval(ping, 30000);
        return () => clearInterval(interval);
    }, [user?.id]);

    // Fetch partners when filter changes
    useEffect(() => {
        api.getPartners(filter).then(setPartners);
    }, [filter]);

    // Fetch cities once on component mount
    useEffect(() => {
        const fetchCities = async () => {
            const fetchedCities = await api.getCities();
            setCities(fetchedCities);
        };
        fetchCities();
    }, []);

    const handlePartnerClick = async (partner: Partner, event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSelectedProfileAnchorY(rect.top);
        setIsProfileLoading(partner.id);
        const profile = await api.ladder.getPlayerProfile(partner.id);
        if (profile) {
            setSelectedProfile(profile);
        } else {
            setSelectedProfileAnchorY(null);
        }
        setIsProfileLoading(null);
    };

    const renderPartnerAvatar = (partner: Partner) => (
        <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {partner.image ? (
                    <img src={partner.image} className="w-full h-full object-cover rounded-full" alt={partner.name} />
                ) : null}
            </div>
            {partner.role === 'rtt_pro' && (
                <div className="absolute bottom-0 right-0 z-10 translate-x-1 translate-y-1">
                    <CheckCircle2 className="text-blue-500 fill-blue-100 drop-shadow-sm" size={26} strokeWidth={2} />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {selectedProfile && (
                <PlayerProfileFlyout
                    profile={selectedProfile}
                    anchorY={selectedProfileAnchorY}
                    onClose={() => { setSelectedProfile(null); setSelectedProfileAnchorY(null); }}
                />
            )}
            {/* Контейнер баннера */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[32px] p-8 text-white h-44 flex items-center shadow-xl">
                
                {/* Декоративное фото на фоне */}
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=800&auto=format&fit=crop" 
                         className="w-full h-full object-cover grayscale" alt="Court" />
                </div>

                {/* Летающие мячи (Анимация из шага 1) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="animate-tennis-fly absolute text-4xl" style={{ top: '20%', left: '0' }}>🎾</div>
                    <div className="animate-tennis-fly absolute text-2xl opacity-40" style={{ top: '50%', left: '-10%', animationDelay: '1.5s' }}>🎾</div>
                </div>

                {/* Контент */}
                <div className="relative z-10 flex w-full items-center justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3">
                            <div className="relative flex items-center justify-center">
                                {/* Радар анимация */}
                                <div className="absolute w-6 h-6 bg-lime-400/30 rounded-full animate-radar"></div>
                                <Radar className="text-lime-400 w-4 h-4 relative z-10" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400">Matchmaking Live</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none mb-1">
                            Найди <span className="text-lime-400">Пару</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Твой идеальный сет начнется здесь</p>
                    </div>
                    
                    {/* Статистика */}
                    <div className="hidden md:flex gap-8 items-center bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[24px]">
                        <div className="text-center">
                            <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Онлайн сейчас</div>
                            <div className="text-2xl font-black text-white flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                {fakeOnline}
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Всего игроков</div>
                            <div className="text-2xl font-black text-slate-400">
                                {onlineStats ? onlineStats.total : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                 <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-lime-400"
                        placeholder="Поиск по имени..."
                        value={filter.search}
                        onChange={e => setFilter({...filter, search: e.target.value})}
                    />
                 </div>
                <div className="flex-1 relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                    <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-lime-400"
                        value={filter.city}
                        onChange={e => setFilter({...filter, city: e.target.value})}
                    >
                        <option value="">Все города</option>
                        {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>
                 <div className="flex gap-4">
                     <select 
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none"
                        value={filter.level}
                        onChange={e => setFilter({...filter, level: e.target.value})}
                     >
                         <option value="all">Любой уровень</option>
                         <option value="2.0">NTRP 2.0 (Новичок)</option>
                         <option value="3.0">NTRP 3.0 (Начальный)</option>
                         <option value="3.5">NTRP 3.5 (Средний)</option>
                         <option value="4.0">NTRP 4.0 (Продвинутый)</option>
                         <option value="4.5">NTRP 4.5 (Полупрофи)</option>
                         <option value="5.0">NTRP 5.0+ (Профи)</option>
                     </select>
                     <button
                         onClick={() => setFilter(f => ({ ...f, rtt_only: !f.rtt_only }))}
                         className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all flex-shrink-0 ${
                             filter.rtt_only
                                 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-400/30'
                                 : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                         }`}
                     >
                         <CheckCircle2 size={16} />
                         Только РТТ
                     </button>
                     <button className="w-12 h-12 flex items-center justify-center bg-lime-400 hover:bg-lime-500 text-slate-900 rounded-xl shadow-lg shadow-lime-400/30 transition-all active:scale-95 flex-shrink-0"><Filter size={20}/></button>
                 </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map(partner => (
                    <div
                        key={partner.id}
                        onClick={(e) => handlePartnerClick(partner, e)}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-lime-400 hover:shadow-md transition-all group cursor-pointer"
                    >
                        <div className="relative">
                            {renderPartnerAvatar(partner)}
                            {isProfileLoading === partner.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg">{partner.name}</h3>
                        <p className="text-slate-500 text-sm mb-4 flex items-center justify-center gap-1"><MapPin size={12}/> {partner.city} • {partner.role === 'rtt_pro' ? `${partner.rating} очков РТТ` : partner.level}</p>
                        <div className="grid grid-cols-2 gap-2 w-full mt-auto" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" size="sm" onClick={() => onStartConversation(partner.id)}>Написать</Button>
                            <Button size="sm" onClick={() => onCreateChallenge(partner.id)}>Играть</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerSearchView;

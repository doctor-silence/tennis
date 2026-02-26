
import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Radar } from 'lucide-react';
import { Partner, DashboardTab } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

interface PartnerSearchViewProps {
    onNavigate: (tab: DashboardTab) => void;
    onStartConversation: (partnerId: string) => void;
    onCreateChallenge: (opponentId: string) => void;
}

const PartnerSearchView = ({ onNavigate, onStartConversation, onCreateChallenge }: PartnerSearchViewProps) => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [filter, setFilter] = useState({ city: '', level: 'all', search: '' });
    const [cities, setCities] = useState<string[]>([]); // New state for cities

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

    return (
        <div className="space-y-6">
            {/* Контейнер баннера */}
            <div class="relative overflow-hidden bg-slate-900 rounded-[32px] p-8 text-white h-44 flex items-center shadow-xl">
                
                {/* Декоративное фото на фоне */}
                <div class="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=800&auto=format&fit=crop" 
                         class="w-full h-full object-cover grayscale" alt="Court" />
                </div>

                {/* Летающие мячи (Анимация из шага 1) */}
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <div class="animate-tennis-fly absolute text-4xl" style={{ top: '20%', left: '0' }}>🎾</div>
                    <div class="animate-tennis-fly absolute text-2xl opacity-40" style={{ top: '50%', left: '-10%', animationDelay: '1.5s' }}>🎾</div>
                </div>

                {/* Контент */}
                <div class="relative z-10 flex w-full items-center justify-between">
                    <div>
                        <div class="inline-flex items-center gap-2 mb-3">
                            <div class="relative flex items-center justify-center">
                                {/* Радар анимация */}
                                <div class="absolute w-6 h-6 bg-lime-400/30 rounded-full animate-radar"></div>
                                <Radar class="text-lime-400 w-4 h-4 relative z-10" />
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400">Matchmaking Live</span>
                        </div>
                        <h2 class="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none mb-1">
                            Найди <span class="text-lime-400">Пару</span>
                        </h2>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Твой идеальный сет начнется здесь</p>
                    </div>
                    
                    {/* Статистика */}
                    <div class="hidden md:flex gap-8 items-center bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[24px]">
                        <div class="text-center">
                            <div class="text-[10px] font-black text-slate-500 uppercase mb-1">Онлайн</div>
                            <div class="text-2xl font-black text-white flex items-center gap-2">
                                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> 248
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
                     <Button variant="secondary" className="w-12 px-0"><Filter size={20}/></Button>
                 </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map(partner => (
                    <div key={partner.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-lime-400 transition-all group">
                        <div className="w-24 h-24 rounded-full bg-slate-100 mb-4 relative">
                            <img src={partner.image} className="w-full h-full object-cover rounded-full" alt={partner.name}/>
                            {partner.isPro && <div className="absolute bottom-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">PRO</div>}
                        </div>
                        <h3 className="font-bold text-lg">{partner.name}</h3>
                        <p className="text-slate-500 text-sm mb-4 flex items-center justify-center gap-1"><MapPin size={12}/> {partner.city} • {partner.role === 'rtt_pro' ? `${partner.rating} очков РТТ` : partner.level}</p>
                        <div className="grid grid-cols-2 gap-2 w-full mt-auto">
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

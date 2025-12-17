
import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { Partner, DashboardTab } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

interface PartnerSearchViewProps {
    onNavigate: (tab: DashboardTab) => void;
    onStartConversation: (partnerId: string) => void;
}

const PartnerSearchView = ({ onNavigate, onStartConversation }: PartnerSearchViewProps) => {
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
                         <option value="NTRP 2.0 (Новичок)">NTRP 2.0 (Новичок)</option>
                         <option value="NTRP 3.0 (Начальный)">NTRP 3.0 (Начальный)</option>
                         <option value="NTRP 3.5 (Средний)">NTRP 3.5 (Средний)</option>
                         <option value="NTRP 4.0 (Продвинутый)">NTRP 4.0 (Продвинутый)</option>
                         <option value="NTRP 4.5 (Полупрофи)">NTRP 4.5 (Полупрофи)</option>
                         <option value="NTRP 5.0+ (Профи)">NTRP 5.0+ (Профи)</option>
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
                            <Button size="sm">Играть</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerSearchView;

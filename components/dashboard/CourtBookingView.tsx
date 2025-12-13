
import React, { useState, useEffect } from 'react';
import { Search, Star, MapPin, Calendar, ArrowRight, Building2, HelpCircle, Filter, X, ExternalLink, Info, CheckCircle2, ChevronDown, ChevronUp, Clock, Phone, Globe } from 'lucide-react';
import { Court } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

const CITIES = [
    'Москва', 
    'Санкт-Петербург', 
    'Сочи', 
    'Казань', 
    'Екатеринбург',
    'Краснодар',
    'Новосибирск',
    'Нижний Новгород',
    'Ростов-на-Дону',
    'Самара',
    'Уфа',
    'Челябинск',
    'Омск',
    'Тюмень',
    'Владивосток',
    'Калининград'
];

const CourtBookingView = () => {
    const [courts, setCourts] = useState<Court[]>([]);
    const [activeCity, setActiveCity] = useState('Все города');
    const [filter, setFilter] = useState({ surface: 'Все покрытия', search: '' });
    // Use expanded state instead of modal state
    const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);

    useEffect(() => { 
        api.getCourts().then(setCourts); 
    }, []);

    const filteredCourts = courts.filter(c => {
        const matchesCity = activeCity === 'Все города' || c.address.includes(activeCity);
        const surfaceMap: Record<string, string> = { 'hard': 'Хард', 'clay': 'Грунт', 'grass': 'Трава', 'carpet': 'Ковер' };
        const matchesSurface = filter.surface === 'Все покрытия' || surfaceMap[c.surface] === filter.surface || c.surface === filter.surface; 
        const matchesSearch = c.name.toLowerCase().includes(filter.search.toLowerCase()) || 
                              c.address.toLowerCase().includes(filter.search.toLowerCase());
        return matchesCity && matchesSurface && matchesSearch;
    });

    const handleBookClick = (e: React.MouseEvent, court: Court) => {
        e.stopPropagation();
        if (court.website) {
            window.open(court.website, '_blank');
        } else {
            alert(`Переход на сайт бронирования для ${court.name}`);
        }
    };

    const toggleCourt = (id: string) => {
        setExpandedCourtId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
             {/* Unified Search Bar */}
             <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2 sticky top-0 z-20">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input 
                        className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-lime-400/50 transition-all placeholder:text-slate-400 text-slate-900 font-medium" 
                        placeholder="Название клуба или адрес..." 
                        value={filter.search}
                        onChange={e => setFilter({...filter, search: e.target.value})}
                    />
                </div>
                
                <div className="flex w-full md:w-auto gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    {/* City Dropdown */}
                    <div className="relative min-w-[180px]">
                        <select 
                            className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-xl px-4 py-3 outline-none font-bold text-slate-700 appearance-none cursor-pointer transition-colors"
                            value={activeCity}
                            onChange={e => setActiveCity(e.target.value)}
                        >
                            <option>Все города</option>
                            {CITIES.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16}/>
                    </div>

                    {/* Surface Dropdown */}
                    <div className="relative min-w-[180px]">
                        <select 
                            className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-xl px-4 py-3 outline-none font-bold text-slate-700 appearance-none cursor-pointer transition-colors"
                            value={filter.surface}
                            onChange={e => setFilter({...filter, surface: e.target.value})}
                        >
                            <option>Все покрытия</option>
                            <option value="hard">Хард</option>
                            <option value="clay">Грунт</option>
                            <option value="grass">Трава</option>
                            <option value="carpet">Ковер</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16}/>
                    </div>
                </div>
            </div>

            {/* Courts Grid (2 Columns) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredCourts.length > 0 ? (
                    filteredCourts.map(c => {
                        const isExpanded = expandedCourtId === c.id;
                        return (
                            <div 
                                key={c.id} 
                                className={`bg-white rounded-[32px] p-2 shadow-sm border border-slate-200 transition-all duration-700 overflow-hidden hover:shadow-lg flex flex-col ${isExpanded ? 'ring-2 ring-lime-400 shadow-xl' : ''}`}
                            >
                                {/* Image Section - Top of Card */}
                                <div 
                                    onClick={() => toggleCourt(c.id)}
                                    className="relative h-64 w-full rounded-[24px] overflow-hidden cursor-pointer group shrink-0"
                                >
                                    <img src={c.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={c.name} />
                                    
                                    {/* Surface Badge */}
                                    <div className="absolute top-4 left-4">
                                        <div className={`text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg shadow-md tracking-wider ${
                                            c.surface === 'clay' ? 'bg-orange-600' : c.surface === 'hard' ? 'bg-blue-600' : 'bg-green-600'
                                        }`}>
                                            {c.surface === 'clay' ? 'ГРУНТ' : c.surface === 'hard' ? 'ХАРД' : c.surface === 'grass' ? 'Трава' : 'КОВЕР'}
                                        </div>
                                    </div>

                                    {/* Rating Badge */}
                                    <div className="absolute bottom-4 left-4">
                                        <div className="bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
                                            <Star size={12} className="fill-amber-400 text-amber-400"/> {c.rating}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Section - Bottom of Card */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 
                                            onClick={() => toggleCourt(c.id)}
                                            className="font-bold text-2xl text-slate-900 cursor-pointer hover:text-lime-600 transition-colors pr-2 leading-tight"
                                        >
                                            {c.name}
                                        </h4>
                                        <button 
                                            onClick={() => toggleCourt(c.id)}
                                            className="text-slate-400 p-1 hover:bg-slate-50 rounded-full transition-colors shrink-0"
                                        >
                                            {isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                                        </button>
                                    </div>

                                    <p className="text-slate-500 font-medium flex items-center gap-2 mb-4 line-clamp-1">
                                        <MapPin size={18} className="shrink-0 text-slate-400"/> {c.address}
                                    </p>
                                    
                                    {/* Features Chips Removed */}
                                    <div className="mb-2"></div>
                                    
                                    <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-100">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">ЦЕНА</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="font-bold text-2xl text-slate-900">{c.pricePerHour} ₽</span>
                                                <span className="text-xs font-medium text-slate-400">/ час</span>
                                            </div>
                                        </div>
                                        
                                        {!isExpanded && (
                                            <button 
                                                onClick={(e) => handleBookClick(e, c)}
                                                className="bg-slate-900 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 rounded-xl hover:bg-lime-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                            >
                                                Забронировать
                                            </button>
                                        )}
                                    </div>

                                    {/* EXPANDED DETAILS - Slower Animation with Grid Trick */}
                                    <div 
                                        className={`grid transition-[grid-template-rows] duration-1000 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="mt-6 pt-4 border-t border-slate-100">
                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    {/* Block 1: Surface */}
                                                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Покрытие</div>
                                                        <div className="font-bold text-xs text-slate-900 flex justify-center items-center gap-1.5">
                                                            <div className={`w-2 h-2 rounded-full ${c.surface === 'clay' ? 'bg-orange-500' : c.surface === 'hard' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                            {c.surface === 'clay' ? 'Грунт' : c.surface === 'hard' ? 'Хард' : c.surface === 'grass' ? 'Трава' : 'Ковер'}
                                                        </div>
                                                    </div>

                                                    {/* Block 2: Rating */}
                                                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Рейтинг</div>
                                                        <div className="font-bold text-xs text-slate-900 flex justify-center items-center gap-1.5">
                                                            <Star size={12} className="fill-amber-400 text-amber-400"/>
                                                            {c.rating}
                                                        </div>
                                                    </div>

                                                    {/* Block 3: Status */}
                                                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Статус</div>
                                                        <div className="font-bold text-xs text-green-600 flex justify-center items-center gap-1.5">
                                                            <CheckCircle2 size={12}/>
                                                            Открыто
                                                        </div>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={(e) => handleBookClick(e, c)}
                                                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-lime-500 hover:text-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                                                >
                                                    <ExternalLink size={18}/>
                                                    Перейти к бронированию
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                        <MapPin size={48} className="mx-auto mb-4 opacity-20"/>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Корты не найдены</h3>
                        <p className="max-w-xs mx-auto mb-6">Попробуйте изменить параметры поиска.</p>
                        <Button variant="outline" onClick={() => { setActiveCity('Все города'); setFilter({surface: 'Все покрытия', search: ''}); }}>
                            Сбросить фильтры
                        </Button>
                    </div>
                )}
            </div>

            {/* Dark Footer Block */}
            <div className="bg-slate-900 rounded-3xl p-10 md:p-14 relative overflow-hidden text-center">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-lime-400/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
                
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Не нашли подходящий корт?</h3>
                    <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                        Мы постоянно добавляем новые локации. Оставьте заявку, и мы уведомим вас, когда в вашем районе появится партнерский клуб.
                    </p>
                    <button className="bg-lime-400 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl hover:bg-lime-500 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.5)] active:scale-95">
                        Оставить заявку
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourtBookingView;

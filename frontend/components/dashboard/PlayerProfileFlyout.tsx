
import React from 'react';
import { X, TrendingUp, TrendingDown, Award, Calendar, Swords, Shield } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PlayerProfile } from '../../types';

const StatCard = ({ icon, label, value, colorClass }) => {
    const Icon = icon;
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                <Icon size={20} />
            </div>
            <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</div>
                <div className="text-lg font-bold text-slate-800">{value}</div>
            </div>
        </div>
    );
}

const PlayerProfileFlyout = ({ profile, onClose }: { profile: PlayerProfile, onClose: () => void }) => {
    
    const rankData = profile.rankHistory.map(h => ({ ...h, rank: -h.rank })); // Invert rank for visual chart

    return (
        <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={onClose}>
            <div 
                className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-from-right"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Профиль игрока</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <img src={profile.avatar} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" alt={profile.name} />
                        <div>
                            <h3 className="text-2xl font-bold">{profile.name}</h3>
                            <p className="text-slate-500">В рейтинге с {new Date(profile.joinDate).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                    
                    {/* Bio */}
                    <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">{profile.bio}</p>

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <StatCard icon={Award} label="Лучший ранг" value={`#${profile.rank}`} colorClass="bg-amber-100 text-amber-600" />
                        <StatCard 
                            icon={profile.stats.currentStreak > 0 ? TrendingUp : TrendingDown} 
                            label="Текущая серия" 
                            value={`${Math.abs(profile.stats.currentStreak)} ${profile.stats.currentStreak > 0 ? 'W' : 'L'}`}
                            colorClass={profile.stats.currentStreak > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
                        />
                        <StatCard icon={Swords} label="Победы" value={profile.stats.wins} colorClass="bg-blue-100 text-blue-600" />
                        <StatCard icon={Shield} label="Поражения" value={profile.stats.losses} colorClass="bg-slate-200 text-slate-600" />
                    </div>

                    {/* Rank History Chart */}
                    <div className="mb-6">
                        <h4 className="font-bold mb-2">Динамика рейтинга</h4>
                        <div className="w-full h-48 bg-slate-50 p-2 rounded-xl border border-slate-200">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={rankData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        tickFormatter={(tick) => `#${-tick}`} 
                                        domain={['dataMin', 'dataMax']}
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        width={40}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                                    <Tooltip
                                        formatter={(value) => [`#${-value}`, 'Ранг']}
                                        labelClassName="font-bold"
                                        wrapperClassName="!rounded-xl !border-slate-300 !bg-white/80 !shadow-lg backdrop-blur-sm"
                                    />
                                    <Area type="monotone" dataKey="rank" stroke="#8884d8" fillOpacity={1} fill="url(#colorRank)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recent Matches */}
                    <div>
                         <h4 className="font-bold mb-2">Последние матчи</h4>
                         <div className="space-y-2">
                             {profile.recentMatches.map(match => (
                                <div key={match.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center text-sm">
                                    <div>
                                        <span className={`font-bold mr-2 px-2 py-0.5 rounded-md text-xs ${match.result === 'win' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {match.result === 'win' ? 'W' : 'L'}
                                        </span>
                                        <span className="font-medium">vs {match.opponentName}</span>
                                    </div>
                                    <div className="font-mono text-slate-700">{match.score}</div>
                                </div>
                             ))}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfileFlyout;

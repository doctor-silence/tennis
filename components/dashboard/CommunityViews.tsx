
import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Heart, MessageCircle, Share2, Swords, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { User, LadderPlayer, Challenge, PlayerProfile } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';
import PlayerProfileFlyout from './PlayerProfileFlyout';

export const MessagesView = () => (
    <div className="flex h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="w-80 border-r border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100 font-bold text-lg">Сообщения</div>
            <div className="flex-1 overflow-y-auto">
                 {/* Mock conversations */}
                 {[1,2,3].map(i => (
                     <div key={i} className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                         <div className="flex gap-3">
                             <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0"></div>
                             <div>
                                 <div className="font-bold text-sm">Александр К.</div>
                                 <div className="text-xs text-slate-500 truncate">Привет, сыграем в субботу?</div>
                             </div>
                         </div>
                     </div>
                 ))}
            </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20"/>
            <p>Выберите диалог</p>
        </div>
    </div>
);

export const NotificationsView = () => (
    <div className="max-w-2xl mx-auto space-y-4">
        {[1,2].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                <div className="w-10 h-10 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center shrink-0"><Bell size={20}/></div>
                <div>
                    <div className="font-bold text-sm">Напоминание о матче</div>
                    <p className="text-sm text-slate-600">Завтра в 18:00 игра с Иваном П. в ТК "Спартак".</p>
                    <div className="text-xs text-slate-400 mt-2">2 часа назад</div>
                </div>
            </div>
        ))}
    </div>
);

export const LadderView = ({ user }: { user: User }) => {
    const [ranking, setRanking] = useState<LadderPlayer[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [viewMode, setViewMode] = useState<'ranking' | 'challenges'>('ranking');
    const [selectedOpponent, setSelectedOpponent] = useState<LadderPlayer | null>(null);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    
    useEffect(() => {
        const loadData = async () => {
             const rankData = await api.ladder.getRankings();
             setRanking(rankData);
             const challengeData = await api.ladder.getChallenges();
             setChallenges(challengeData);
        };
        loadData();
    }, []);

    const handleChallengeClick = (opponent: LadderPlayer) => {
        setSelectedOpponent(opponent);
        setShowChallengeModal(true);
    };

    const handlePlayerClick = async (player: LadderPlayer) => {
        setIsProfileLoading(true);
        const profile = await api.ladder.getPlayerProfile(player.userId);
        if (profile) {
            setSelectedProfile(profile);
        }
        setIsProfileLoading(false);
    };

    const confirmChallenge = async () => {
        if (!selectedOpponent) return;
        // Mock API call
        const newChallenge: Challenge = {
            id: Math.random().toString(),
            challengerId: user.id,
            defenderId: selectedOpponent.userId,
            challengerName: user.name,
            defenderName: selectedOpponent.name,
            rankGap: Math.abs(selectedOpponent.rank - (ranking.find(r => r.userId === user.id)?.rank || 0)),
            status: 'pending',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
        setChallenges([newChallenge, ...challenges]);
        setShowChallengeModal(false);
        setViewMode('challenges');
    };

    return (
        <div className="space-y-6">
            {selectedProfile && <PlayerProfileFlyout profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}

            {/* Header / Tabs */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                <button 
                    onClick={() => setViewMode('ranking')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'ranking' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Рейтинг
                </button>
                <button 
                    onClick={() => setViewMode('challenges')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'challenges' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Вызовы
                    {challenges.length > 0 && <span className="bg-lime-500 text-slate-900 text-[10px] px-1.5 rounded-full">{challenges.length}</span>}
                </button>
            </div>

            {viewMode === 'ranking' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold mb-1">Турнирная лестница</h3>
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Сезон: Октябрь 2024</p>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
                            <div className="text-2xl font-bold text-lime-400">#{ranking.find(r => r.userId === user.id)?.rank || '-'}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Твой ранг</div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Ранг</th>
                                    <th className="px-6 py-4">Игрок</th>
                                    <th className="px-6 py-4 text-center">Матчи</th>
                                    <th className="px-6 py-4 text-center">Винрейт</th>
                                    <th className="px-6 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ranking.map((p, i) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => handlePlayerClick(p)}
                                        className={`transition-colors cursor-pointer ${p.userId === user.id ? 'bg-lime-50/50 hover:bg-lime-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {p.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={p.avatar} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm" alt=""/>
                                                    {p.status === 'defending' && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full" title="Защищает место"></div>}
                                                    {isProfileLoading && selectedProfile?.userId === p.userId && <Loader2 className="absolute inset-0 m-auto animate-spin text-white" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{p.name} {p.userId === user.id && '(Вы)'}</div>
                                                    <div className="text-xs text-slate-500">{p.points} pts</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{p.matches}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                {p.winRate}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.userId !== user.id && (
                                                <Button 
                                                    size="sm" 
                                                    variant={p.rank < (ranking.find(r => r.userId === user.id)?.rank || 999) ? "secondary" : "outline"} 
                                                    className="h-8 text-xs"
                                                    onClick={(e) => { e.stopPropagation(); handleChallengeClick(p); }}
                                                    disabled={p.status === 'defending'}
                                                >
                                                    {p.rank < (ranking.find(r => r.userId === user.id)?.rank || 999) ? 'Вызвать' : 'Спарринг'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'challenges' && (
                <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
                    {challenges.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                            <Swords size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>Активных вызовов нет</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setViewMode('ranking')}>Найти соперника</Button>
                        </div>
                    ) : (
                        challenges.map(c => (
                            <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-8 w-full md:w-auto">
                                    <div className="text-center w-24">
                                        <div className="font-bold text-slate-900 text-sm">{c.challengerName}</div>
                                        <div className="text-xs text-slate-400">Претендент</div>
                                    </div>
                                    <div className="flex flex-col items-center px-4">
                                        <div className="text-2xl font-black text-slate-200 font-mono">VS</div>
                                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-1 ${
                                            c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                            c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {c.status === 'pending' ? 'Ожидание' : c.status === 'scheduled' ? 'Назначен' : 'Завершен'}
                                        </div>
                                    </div>
                                    <div className="text-center w-24">
                                        <div className="font-bold text-slate-900 text-sm">{c.defenderName}</div>
                                        <div className="text-xs text-slate-400">Защитник</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                    <div className="text-right mr-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 justify-end">
                                            <Clock size={12}/> Дедлайн
                                        </div>
                                        <div className="font-bold text-slate-900">{new Date(c.deadline).toLocaleDateString()}</div>
                                    </div>
                                    {c.status === 'pending' && c.defenderId === user.id && (
                                        <Button size="sm">Принять</Button>
                                    )}
                                    {c.status === 'scheduled' && (
                                        <Button size="sm" variant="outline">Внести счет</Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <Modal isOpen={showChallengeModal} onClose={() => setShowChallengeModal(false)} title="Бросить вызов">
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 overflow-hidden">
                        <img src={selectedOpponent?.avatar} className="w-full h-full object-cover" alt=""/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Вызов игроку {selectedOpponent?.name}</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Вы собираетесь оспорить {selectedOpponent?.rank} место в рейтинге. 
                        Матч должен быть сыгран в течение 7 дней.
                    </p>
                    
                    <div className="bg-amber-50 p-4 rounded-xl text-left mb-6 border border-amber-100">
                        <div className="flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                            <div className="text-xs text-amber-800 leading-relaxed">
                                <span className="font-bold block mb-1">Правила Ladder:</span>
                                1. Проигравший защитник меняется местами с претендентом.<br/>
                                2. Отказ от игры = Техническое поражение.<br/>
                                3. Аренда корта оплачивается 50/50.
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowChallengeModal(false)}>Отмена</Button>
                        <Button className="flex-1" onClick={confirmChallenge}>Отправить вызов</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export const CommunityView = () => (
    <div className="max-w-2xl mx-auto">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0"></div>
            <input className="w-full bg-slate-50 rounded-xl px-4 outline-none" placeholder="Поделитесь результатами или мыслями..." />
        </div>
        
        {[1,2].map(i => (
             <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                     <div>
                         <div className="font-bold text-sm">Мария Шарапова</div>
                         <div className="text-xs text-slate-400">2 часа назад</div>
                     </div>
                 </div>
                 <p className="text-slate-800 mb-4 text-sm leading-relaxed">
                     Отличная тренировка сегодня! Отрабатывали бэкхенд по линии. Спасибо тренеру за терпение 💪🎾
                 </p>
                 <div className="h-64 bg-slate-100 rounded-xl mb-4 overflow-hidden">
                     <img src={`https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop`} className="w-full h-full object-cover" alt="post"/>
                 </div>
                 <div className="flex gap-6 text-slate-500 text-sm font-bold">
                     <button className="flex items-center gap-2 hover:text-red-500"><Heart size={18}/> 245</button>
                     <button className="flex items-center gap-2 hover:text-blue-500"><MessageCircle size={18}/> 12</button>
                     <button className="flex items-center gap-2 hover:text-green-500"><Share2 size={18}/></button>
                 </div>
             </div>
        ))}
    </div>
);

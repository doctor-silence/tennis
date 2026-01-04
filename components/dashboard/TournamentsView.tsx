import React, { useState, useEffect } from 'react';
import {
    Plus, Trophy, Users, Calendar, ChevronRight, Dices, ChevronLeft,
    ListChecks, CheckCircle2, Play, RefreshCw, UserPlus, Check, User as UserIcon, Zap,
    ChevronDown
} from 'lucide-react';
import { User, Student, Tournament, TournamentMatch, TournamentPlayer, Group } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';
import TournamentBanner from './TournamentBanner';

type BracketSize = 2 | 4 | 8 | 16 | 32 | 64;

export const TournamentsView = ({ user, onTournamentUpdate }: { user: User, onTournamentUpdate: () => void }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    
    const [activeMatch, setActiveMatch] = useState<TournamentMatch | null>(null);
    const [bulkNames, setBulkNames] = useState('');
    const [manualPlayerName, setManualPlayerName] = useState('');
    const [matchScore, setMatchScore] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [createForm, setCreateForm] = useState({
        name: '',
        groupName: '',
        date: new Date().toISOString().split('T')[0],
        prizePool: '50 000 ₽',
        bracketSize: 16 as BracketSize,
        target_group_id: ''
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [tData, sData, gData] = await Promise.all([
                    api.tournaments.getAll(user.id),
                    api.students.getAll(user.id),
                    api.groups.getAll()
                ]);
                setTournaments(tData);
                setStudents(sData);
                setGroups(gData);
            } catch (error) {
                console.error("Failed to load tournament data:", error);
                // Здесь можно было бы показать уведомление пользователю
            }
        };
        load();
    }, [user.id]);

    const syncTournament = async (tournament: Tournament): Promise<Tournament> => {
        const updatedTournament = await api.tournaments.update(tournament.id, tournament);
        setTournaments(prev => prev.map(t => t.id === updatedTournament.id ? updatedTournament : t));
        return updatedTournament;
    };

    const generateEmptyRounds = (size: number) => {
        const roundsCount = Math.log2(size);
        const rounds = [];
        let matchesCount = size / 2;
        
        for (let i = 0; i < roundsCount; i++) {
            const name = matchesCount === 1 ? 'ФИНАЛ' : matchesCount === 2 ? '1/2 ФИНАЛА' : `1/${matchesCount * 2} ФИНАЛА`;
            const matches: TournamentMatch[] = [];
            for (let j = 0; j < matchesCount; j++) {
                matches.push({ id: `m-${i}-${j}-${Math.random()}`, status: 'pending' });
            }
            rounds.push({ name, matches });
            matchesCount /= 2;
        }
        return rounds;
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.groupName) {
            alert('Пожалуйста, выберите группу сообщества');
            return;
        }
        setIsSubmitting(true);
        try {
            const rounds = generateEmptyRounds(createForm.bracketSize);
            console.log('Creating tournament with target_group_id:', createForm.target_group_id);
            const newTournament = await api.tournaments.create({
                ...createForm,
                userId: user.id,
                rounds, 
                status: 'draft',
                type: 'single_elimination'
            });
            setTournaments(prev => [newTournament, ...prev]);
            setIsCreateModalOpen(false);
            setSelectedTournament(newTournament);
        } finally { setIsSubmitting(false); }
    };

    const handleStartTournament = async () => {
        if (!selectedTournament) return;
        const updated = { ...selectedTournament, status: 'live' as const };
        const returnedTournament = await syncTournament(updated);
        setSelectedTournament(returnedTournament);

        if (returnedTournament) {
            await api.posts.create({
                userId: user.id,
                type: 'tournament_announcement',
                groupId: returnedTournament.target_group_id,
                content: {
                    title: returnedTournament.name,
                    groupName: returnedTournament.groupName,
                    prizePool: returnedTournament.prizePool,
                    date: returnedTournament.date,
                    authorName: user.name,
                }
            });
            onTournamentUpdate();
        }
    };

    const handleRandomize = async () => {
        if (!selectedTournament || !bulkNames.trim()) return;
        const names = bulkNames.split(/[,\n]+/).map(n => n.trim()).filter(n => n.length > 0);
        const shuffled = [...names].sort(() => Math.random() - 0.5);
        const updated = { ...selectedTournament };
        const firstRound = updated.rounds[0];
        
        shuffled.forEach((name, idx) => {
            const matchIdx = Math.floor(idx / 2);
            if (matchIdx >= firstRound.matches.length) return;
            const side = idx % 2 === 0 ? 'player1' : 'player2';
            firstRound.matches[matchIdx][side] = {
                id: `p-${Date.now()}-${idx}`,
                name: name,
                avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`
            };
        });
        const returnedTournament = await syncTournament(updated);
        setSelectedTournament(returnedTournament);
        setIsBulkAddOpen(false);
    };

    const handleMatchClick = (match: TournamentMatch) => {
        if (selectedTournament?.status === 'finished') return;
        setActiveMatch(match);
        if (selectedTournament?.status === 'draft') {
            setIsMatchModalOpen(true);
        } else if (selectedTournament?.status === 'live' && match.player1 && match.player2 && !match.winnerId) {
            setMatchScore('');
            setIsScoreModalOpen(true);
        }
    };

    const setWinner = async (winnerId: string) => {
        console.log('setWinner called with tournament:', selectedTournament);
        if (!activeMatch || !selectedTournament) return;
        const updated = { ...selectedTournament };
        let matchIdx = -1;
        let roundIdx = -1;

        updated.rounds.forEach((round, rI) => {
            const mI = round.matches.findIndex(m => m.id === activeMatch.id);
            if (mI !== -1) { roundIdx = rI; matchIdx = mI; }
        });

        if (roundIdx === -1) return;

        const match = updated.rounds[roundIdx].matches[matchIdx];
        match.winnerId = winnerId;
        match.score = matchScore;
        match.status = 'finished';

        const winner = winnerId === match.player1?.id ? match.player1 : match.player2;
        const loser = winnerId === match.player1?.id ? match.player2 : match.player1;

        // POST TO COMMUNITY FEED
        if (winner && loser && user) {
             await api.posts.create({
                userId: user.id,
                type: 'match',
                groupId: selectedTournament.target_group_id,
                content: {
                    title: selectedTournament.name,
                    author: user.name,
                    authorAvatar: user.avatar || `https://ui-avatars.com/api/?name=${user.name}`,
                    time: 'Только что',
                    matchData: {
                        winner: winner.name,
                        loser: loser.name,
                        score: matchScore || 'Победа',
                        groupName: selectedTournament.groupName || 'Общий турнир'
                    }
                }
            });
            onTournamentUpdate();
        }

        // Продвижение в следующий раунд
        if (winner && roundIdx < updated.rounds.length - 1) {
            const nextRound = updated.rounds[roundIdx + 1];
            const nextMatchIdx = Math.floor(matchIdx / 2);
            const side = matchIdx % 2 === 0 ? 'player1' : 'player2';
            nextRound.matches[nextMatchIdx][side] = { ...winner, lastMatchScore: matchScore };
        } else if (roundIdx === updated.rounds.length - 1) {
            updated.status = 'finished';
            // --- NEW: Create a post for the tournament result ---
            if (winner) {
                await api.posts.create({
                    userId: user.id, // Or a system user ID
                    type: 'tournament_result',
                    groupId: selectedTournament.target_group_id,
                    content: {
                        tournamentName: selectedTournament.name,
                        winnerName: winner.name,
                        winnerAvatar: winner.avatar,
                    }
                });
                onTournamentUpdate();
            }
            // --- END NEW ---
        }

        const returnedTournament = await syncTournament(updated);
        setSelectedTournament(returnedTournament);
        setIsScoreModalOpen(false);
    };

    const handleAddManualToMatch = async (side: 1 | 2) => {
        if (!manualPlayerName.trim() || !activeMatch || !selectedTournament) return;
        const player = {
            id: `p-${Date.now()}`,
            name: manualPlayerName,
            avatar: `https://ui-avatars.com/api/?name=${manualPlayerName.replace(' ', '+')}&background=random&color=fff`
        };
        const updated = { ...selectedTournament };
        updated.rounds[0].matches.forEach(m => {
            if (m.id === activeMatch.id) m[side === 1 ? 'player1' : 'player2'] = player;
        });
        const returnedTournament = await syncTournament(updated);
        setSelectedTournament(returnedTournament);
        setManualPlayerName('');
        setIsMatchModalOpen(false);
    };

    const PlayerSlot = ({ player, isWinner, isOpponentWinner, side }: { player?: TournamentPlayer, isWinner?: boolean, isOpponentWinner?: boolean, side: 1 | 2 }) => (
        <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${isWinner ? 'bg-lime-50' : isOpponentWinner ? 'bg-slate-50 opacity-40' : player ? 'bg-slate-50' : 'bg-slate-50/50 border border-dashed border-slate-200'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm overflow-hidden ${isWinner ? 'ring-2 ring-lime-400' : 'border border-slate-100'}`}>
                {player?.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-slate-200"/>}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className={`text-[11px] font-black uppercase truncate ${player ? 'text-slate-900' : 'text-slate-300'}`}>
                    {player?.name || `Ожидание...`}
                </div>
                {player?.lastMatchScore && <div className="text-[9px] font-bold text-lime-600">Прошлый счет: {player.lastMatchScore}</div>}
            </div>
            {isWinner && <Check size={16} className="text-lime-500" strokeWidth={4} />}
        </div>
    );

    const formatDate = (isoDate: string) => {
        if (!isoDate) return '';
        try {
            const date = new Date(isoDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        } catch (e) {
            console.error("Invalid date format", isoDate);
            return isoDate; // return original if parsing fails
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {!selectedTournament ? (
                <>
                    <TournamentBanner activeCount={tournaments.length} />
                    <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border shadow-sm mt-8">
                        <div><h2 className="text-3xl font-black text-slate-900 italic uppercase">Турниры</h2><p className="text-slate-400 font-bold uppercase text-[10px]">Управление сетками</p></div>
                        <Button className="h-14 px-8 rounded-2xl" onClick={() => setIsCreateModalOpen(true)}><Plus size={20} className="mr-2"/> Новый турнир</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map(t => (
                            <div key={t.id} onClick={() => setSelectedTournament(t)} className="bg-white rounded-[35px] border p-8 hover:shadow-xl transition-all cursor-pointer group hover:border-lime-400">
                                <div className="flex justify-between mb-4">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${t.status === 'live' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{t.status}</span>
                                    <span className="text-xs font-bold text-slate-300">{formatDate(t.date)}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-6">{t.name}</h3>
                                {t.groupName && <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Группа: {t.groupName}</div>}
                                <div className="flex items-center text-slate-400 gap-4"><Users size={16}/><span className="text-xs font-bold">{(t.rounds[0]?.matches.length || 0) * 2} игроков</span></div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none"><Trophy size={160}/></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <button onClick={() => setSelectedTournament(null)} className="p-3 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"><ChevronLeft size={24}/></button>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">{selectedTournament.name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-lime-400 text-xs font-black uppercase tracking-widest">{selectedTournament.groupName || 'Частный кубок'}</p>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">• {formatDate(selectedTournament.date)} • {selectedTournament.prizePool}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 relative z-10">
                            {selectedTournament.status === 'draft' && (
                                <>
                                    <Button variant="glass" onClick={() => setIsBulkAddOpen(true)} className="rounded-2xl h-12"><ListChecks size={20} className="mr-2"/> Жеребьевка</Button>
                                    <Button className="bg-lime-400 text-slate-900 hover:bg-white rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]" onClick={handleStartTournament}><Play size={18} fill="currentColor" className="mr-2"/> Начать</Button>
                                </>
                            )}
                            {selectedTournament.status === 'live' && (
                                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-2xl">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                    <span className="font-black text-emerald-500 text-[10px] uppercase tracking-widest italic">Live Tournament</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#f8fafc] rounded-[50px] border border-slate-100 p-12 overflow-x-auto custom-scrollbar shadow-inner min-h-[600px]">
                        <div className="flex gap-20 min-w-max px-10">
                            {selectedTournament.rounds.map((round, rI) => (
                                <div key={rI} className="flex flex-col w-72">
                                    <div className="text-center mb-10"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-6 py-2 rounded-full border shadow-sm">{round.name}</span></div>
                                    <div className="flex-1 flex flex-col justify-around gap-10">
                                        {round.matches.map((match) => (
                                            <div 
                                                key={match.id} 
                                                onClick={() => handleMatchClick(match)}
                                                className={`bg-white rounded-3xl p-4 shadow-sm border border-slate-100 transition-all ${selectedTournament.status === 'live' && match.player1 && match.player2 && !match.winnerId ? 'hover:shadow-lg cursor-pointer hover:border-lime-200' : ''}`}
                                            >
                                                {match.score && <div className="text-center mb-2"><span className="text-[10px] font-black bg-slate-900 text-white px-3 py-0.5 rounded-full">{match.score}</span></div>}
                                                <div className="space-y-2">
                                                    <PlayerSlot player={match.player1} isWinner={match.winnerId === match.player1?.id} isOpponentWinner={match.winnerId === match.player2?.id} side={1} />
                                                    <PlayerSlot player={match.player2} isWinner={match.winnerId === match.player2?.id} isOpponentWinner={match.winnerId === match.player1?.id} side={2} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isScoreModalOpen} onClose={() => setIsScoreModalOpen(false)} title="Результат матча">
                <div className="space-y-6">
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-black text-2xl text-center shadow-inner" placeholder="6:4, 7:5" value={matchScore} onChange={e => setMatchScore(e.target.value)} />
                    <div className="grid grid-cols-1 gap-3">
                        {[activeMatch?.player1, activeMatch?.player2].map((p, i) => p && (
                            <button key={i} onClick={() => setWinner(p.id)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-lime-400 group transition-all">
                                <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover" />
                                <span className="font-black text-slate-900 group-hover:text-white uppercase">{p.name}</span>
                                <ChevronRight className="ml-auto text-slate-300 group-hover:text-white"/>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Новый турнир">
                <form onSubmit={handleCreateTournament} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название кубка</label>
                        <input required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" placeholder=" Masters Novosibirsk" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Привязать к группе сообщества</label>
                        <div className="relative">
                            <select 
                                required 
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner appearance-none cursor-pointer pr-12 text-slate-700" 
                                value={createForm.groupName} 
                                onChange={e => {
                                    const group = groups.find(g => g.name === e.target.value);
                                    setCreateForm({...createForm, groupName: e.target.value, target_group_id: group?.id || ''});
                                }}
                            >
                                <option value="" disabled>Выберите группу из существующих</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.name}>{g.name} ({g.location})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-4.5 text-slate-400 pointer-events-none" size={20}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дата</label><input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" value={createForm.date} onChange={e => setCreateForm({...createForm, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Приз</label><input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" value={createForm.prizePool} onChange={e => setCreateForm({...createForm, prizePool: e.target.value})} /></div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Размер сетки</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[8, 16, 32].map(s => <button key={s} type="button" onClick={() => setCreateForm({...createForm, bracketSize: s as BracketSize})} className={`py-4 rounded-2xl font-black transition-all ${createForm.bracketSize === s ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>{s}</button>)}
                        </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[25px] font-black uppercase tracking-widest shadow-2xl mt-4">{isSubmitting ? <RefreshCw className="animate-spin"/> : 'Создать сетку'}</Button>
                </form>
            </Modal>

            <Modal isOpen={isBulkAddOpen} onClose={() => setIsBulkAddOpen(false)} title="Жеребьевка">
                <div className="space-y-4">
                    <textarea className="w-full h-48 bg-slate-50 rounded-[30px] p-8 outline-none font-bold shadow-inner text-sm leading-relaxed" placeholder="Имя Фамилия&#10;Имя Фамилия..." value={bulkNames} onChange={e => setBulkNames(e.target.value)} />
                    <Button className="w-full h-16 rounded-[25px] gap-2 shadow-xl font-black uppercase tracking-widest text-xs" onClick={handleRandomize}><Dices size={20}/> Случайное распределение</Button>
                </div>
            </Modal>

            <Modal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} title="Добавить игрока">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" placeholder="Имя игрока" value={manualPlayerName} onChange={e => setManualPlayerName(e.target.value)} />
                        <button onClick={() => handleAddManualToMatch(!activeMatch?.player1 ? 1 : 2)} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-lime-400 transition-all"><CheckCircle2 size={24}/></button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {students.map(s => (
                            <button key={s.id} onClick={() => { setManualPlayerName(s.name); handleAddManualToMatch(!activeMatch?.player1 ? 1 : 2); }} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-lime-400 transition-all group">
                                <img src={s.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                                <div className="text-left flex-1"><div className="font-black text-slate-900 text-sm group-hover:text-indigo-600">{s.name}</div><div className="text-[9px] text-slate-400 font-bold uppercase">{s.level}</div></div>
                                <UserPlus size={16} className="text-slate-200 group-hover:text-lime-500 transition-colors"/>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};
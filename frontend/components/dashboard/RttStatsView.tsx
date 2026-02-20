import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Loader2 } from 'lucide-react';
import { User } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

export const RttStatsView = ({ user }: { user: User }) => {
    const [rni, setRni] = useState('');
    const [loading, setLoading] = useState(false);
    const [playerData, setPlayerData] = useState<any>(null);
    const [error, setError] = useState('');
    const [showAllMatches, setShowAllMatches] = useState(false);
    const [showAllTournaments, setShowAllTournaments] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [tournamentModalOpen, setTournamentModalOpen] = useState(false);

    const handleSearch = async () => {
        if (!rni || rni.length < 4) {
            setError('Введите корректный РНИ (минимум 4 цифры)');
            return;
        }

        setLoading(true);
        setError('');
        setPlayerData(null);

        try {
            // Получаем полную статистику с сервера
            const response = await api.rtt.getPlayerStats(rni);
            
            if (response.success) {
                setPlayerData(response);
            } else {
                setError(response.error || 'Игрок не найден');
            }
        } catch (err) {
            setError('Ошибка при поиске игрока');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const winCount = playerData?.data?.wins ?? playerData?.data?.matches?.filter((m: any) => m.result === 'win').length ?? 0;
    const lossCount = playerData?.data?.matches?.filter((m: any) => m.result === 'loss').length || 0;
    const totalMatches = playerData?.data?.totalMatches ?? (winCount + lossCount);
    const winRate = playerData?.data?.winRate ?? (totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0);

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 text-white">
                <h1 className="text-3xl font-black mb-2">Статистика РТТ</h1>
                <p className="text-orange-100">Поиск статистики любого игрока по номеру РНИ</p>
            </div>

            {/* Search Box */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                            Номер РНИ
                        </label>
                        <input
                            type="text"
                            value={rni}
                            onChange={(e) => setRni(e.target.value.replace(/\D/g, ''))}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Введите РНИ (например, 53699)"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400 outline-none text-lg"
                        />
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                    <div className="flex items-end">
                        <Button 
                            onClick={handleSearch}
                            disabled={loading || !rni}
                            className="px-8 py-3 bg-orange-600 hover:bg-orange-700"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Найти'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Player Data */}
            {playerData && (
                <div className="space-y-4 animate-fade-in-up">
                    {/* Player Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm border border-orange-200 p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 mb-2">{playerData.data.name}</h2>
                                <div className="space-y-1 text-sm">
                                    <div>
                                        <span className="text-slate-500 font-medium">Возраст РТТ:</span>
                                        <span className="ml-2 font-bold text-slate-900">{playerData.data.age} лет</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">Город:</span>
                                        <span className="ml-2 font-bold text-slate-900">{playerData.data.city}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">Возрастная группа:</span>
                                        <span className="ml-2 font-bold text-orange-600">{playerData.data.category}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-orange-200">
                                <div className="text-xs font-bold text-orange-600 uppercase mb-0.5 text-center">РНИ</div>
                                <div className="text-2xl font-black text-orange-600 text-center">{rni}</div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl p-2 text-center shadow-lg flex flex-col justify-between min-h-[90px]">
                                <div className="text-xl font-black leading-tight break-all">{playerData.data.points}</div>
                                <div className="text-[10px] font-bold uppercase opacity-90 leading-tight mt-1">Очки РТТ</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl p-2 text-center shadow-lg flex flex-col justify-between min-h-[90px]">
                                <div className="text-xl font-black leading-tight break-all">#{playerData.data.rank}</div>
                                <div className="text-[10px] font-bold uppercase opacity-90 leading-tight mt-1">Позиция</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl p-2 text-center shadow-lg flex flex-col justify-between min-h-[90px]">
                                <div className="text-xl font-black leading-tight break-all">{winRate}%</div>
                                <div className="text-[10px] font-bold uppercase opacity-90 leading-tight mt-1">Побед в матчах</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-2 text-center shadow-lg flex flex-col justify-between min-h-[90px]">
                                <div className="text-xl font-black leading-tight break-all">{totalMatches}</div>
                                <div className="text-[10px] font-bold uppercase opacity-90 leading-tight mt-1">Матчей</div>
                            </div>
                        </div>
                    </div>

                    {/* Tournament Applications */}
                    {playerData.data.tournaments && playerData.data.tournaments.length > 0 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Заявки на турниры
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Город</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Возрастная группа</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Дата</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Название</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(showAllTournaments ? playerData.data.tournaments : playerData.data.tournaments.slice(0, 4)).map((tournament: any, index: number) => (
                                            <tr key={tournament.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                                                <td className="px-4 py-3 text-sm text-slate-900">{tournament.city || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900">{tournament.category || tournament.ageGroup || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{tournament.date}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTournament(tournament);
                                                            setTournamentModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-left"
                                                    >
                                                        {tournament.tournament}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {playerData.data.tournaments.length > 4 && (
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                                    <Button
                                        onClick={() => setShowAllTournaments(!showAllTournaments)}
                                        className="w-full bg-slate-600 hover:bg-slate-700"
                                    >
                                        {showAllTournaments ? 'Свернуть' : `Показать все (${playerData.data.tournaments.length})`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RTT Banner */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-400 via-lime-400 to-green-500 p-8 shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02] group"
                         onClick={() => window.open('https://rttstat.ru', '_blank')}>
                        {/* Animated Background Elements */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute w-64 h-64 bg-white/10 rounded-full -top-32 -left-32 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="absolute w-96 h-96 bg-white/5 rounded-full -bottom-48 -right-48 group-hover:scale-125 transition-transform duration-500"></div>
                            
                            {/* Tennis Balls */}
                            <div className="absolute w-12 h-12 bg-yellow-300 rounded-full top-8 right-24 shadow-lg opacity-70 group-hover:translate-y-2 transition-transform duration-300">
                                <div className="absolute inset-1 border-2 border-white/40 rounded-full"></div>
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40"></div>
                            </div>
                            <div className="absolute w-8 h-8 bg-yellow-300 rounded-full bottom-16 left-32 shadow-lg opacity-60 group-hover:-translate-y-1 transition-transform duration-500">
                                <div className="absolute inset-1 border-2 border-white/40 rounded-full"></div>
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40"></div>
                            </div>
                            
                            {/* Tennis Rackets */}
                            <div className="absolute top-12 left-1/4 w-16 h-20 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                                <svg viewBox="0 0 64 80" fill="none" className="w-full h-full">
                                    <ellipse cx="32" cy="28" rx="22" ry="26" stroke="white" strokeWidth="3" fill="none"/>
                                    <line x1="32" y1="54" x2="32" y2="75" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                                    <circle cx="32" cy="28" r="18" stroke="white" strokeWidth="1" opacity="0.3"/>
                                    <line x1="20" y1="28" x2="44" y2="28" stroke="white" strokeWidth="1" opacity="0.3"/>
                                    <line x1="32" y1="14" x2="32" y2="42" stroke="white" strokeWidth="1" opacity="0.3"/>
                                </svg>
                            </div>
                            <div className="absolute bottom-20 right-16 w-12 h-16 opacity-15 group-hover:-rotate-12 transition-transform duration-700">
                                <svg viewBox="0 0 64 80" fill="none" className="w-full h-full">
                                    <ellipse cx="32" cy="28" rx="22" ry="26" stroke="white" strokeWidth="3" fill="none"/>
                                    <line x1="32" y1="54" x2="32" y2="75" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                                </svg>
                            </div>
                            
                            <div className="absolute w-40 h-40 bg-white/10 rounded-full top-1/2 right-1/4 animate-pulse"></div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="text-white drop-shadow-lg">
                                    <h3 className="text-2xl font-black mb-1">Больше информации по статистике</h3>
                                    <p className="text-white/90 text-lg font-semibold">у нашего партнера <span className="font-black">RTTSTAT.RU</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <span className="text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">Перейти</span>
                                <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform duration-300 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* Shine Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
                        </div>
                    </div>

                    {/* Match History */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            История матчей
                        </h3>
                        {playerData.data.matches && playerData.data.matches.length > 0 ? (
                            <>
                                <div className="space-y-3">
                                    {(showAllMatches ? playerData.data.matches : playerData.data.matches.slice(0, 4)).map((match: any) => (
                                        <div key={match.id} className={`rounded-xl p-4 border-2 transition-all ${
                                            match.result === 'win' 
                                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                                : 'bg-red-50 border-red-200 hover:bg-red-100'
                                        }`}>
                                            {/* Верхняя строка: бейдж + дата */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                                    match.result === 'win' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                }`}>
                                                    {match.result === 'win' ? 'Победа' : 'Поражение'}
                                                </span>
                                                <div className="text-sm text-slate-500 ml-2 shrink-0">{match.date}</div>
                                            </div>
                                            {/* ФИО + очки соперника */}
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="font-bold text-base text-slate-900 leading-tight">vs {match.opponent}</div>
                                                {match.opponentPoints && (
                                                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium shrink-0">
                                                        {match.opponentPoints} очков
                                                    </span>
                                                )}
                                            </div>
                                            {/* Детали */}
                                            <div className="text-sm text-slate-600 space-y-0.5">
                                                {match.opponentAge && match.opponentCity && (
                                                    <div>👤 {match.opponentAge} • {match.opponentCity}</div>
                                                )}
                                                <div>🏆 {match.tournament}</div>
                                                {match.ageGroup && <div>📊 {match.ageGroup}</div>}
                                                {match.city && <div>📍 {match.city}</div>}
                                            </div>
                                            <div className="text-xl font-black text-orange-600 mt-2">{match.score}</div>
                                        </div>
                                    ))}
                                </div>
                                {playerData.data.matches.length > 4 && (
                                    <div className="text-center mt-4">
                                        <Button
                                            onClick={() => setShowAllMatches(!showAllMatches)}
                                            className="px-6 py-2 bg-slate-600 hover:bg-slate-700"
                                        >
                                            {showAllMatches ? 'Свернуть' : `Показать все (${playerData.data.matches.length})`}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p>Информация о матчах недоступна</p>
                                <p className="text-xs mt-2">Данные могут быть не опубликованы на сайте РТТ</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!playerData && !loading && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Введите РНИ для поиска</h3>
                    <p className="text-slate-500">Вы можете найти статистику любого игрока РТТ по его номеру РНИ</p>
                </div>
            )}
            </div>

            {/* Tournament Modal */}
            <TournamentModal 
                isOpen={tournamentModalOpen}
                onClose={() => setTournamentModalOpen(false)}
                tournament={selectedTournament}
            />
        </>
    );
};

const TournamentModal = ({ isOpen, onClose, tournament }: { isOpen: boolean; onClose: () => void; tournament: any }) => {
    const elRef = useRef<HTMLDivElement | null>(null);
    const modalRoot = document.getElementById('modal-root');
    const [tournamentDetails, setTournamentDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    if (!elRef.current) {
        elRef.current = document.createElement('div');
    }

    useEffect(() => {
        const el = elRef.current!;
        if (isOpen && modalRoot) {
            modalRoot.appendChild(el);
            document.body.style.overflow = 'hidden';
            
            // Загрузка детальной информации о турнире
            if (tournament?.link) {
                setLoadingDetails(true);
                api.rtt.getTournamentDetails(tournament.link)
                    .then(data => {
                        if (data.success) {
                            setTournamentDetails(data.tournament);
                        }
                    })
                    .catch(err => console.error('Error loading tournament details:', err))
                    .finally(() => setLoadingDetails(false));
            }
        }
        return () => {
            if (isOpen && modalRoot) {
                if (modalRoot.contains(el)) {
                    modalRoot.removeChild(el);
                }
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen, modalRoot, tournament]);

    if (!isOpen || !tournament) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-3xl font-black mb-2">{tournament.tournament}</h2>
                            <div className="flex gap-6 text-sm font-medium text-white/90">
                                <div>📍 {tournament.city}</div>
                                <div>📅 {tournament.date}</div>
                                <div>👥 {tournament.ageGroup}</div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-orange-500" size={48} />
                        </div>
                    ) : (
                        <>
                            {/* Tournament Info */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">Категория</div>
                                    <div className="text-2xl font-black text-blue-900">{tournament.category || tournament.ageGroup}</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                                    <div className="text-xs font-bold text-green-600 uppercase mb-1">Заявок</div>
                                    <div className="text-2xl font-black text-green-900">{tournamentDetails?.participantsCount || tournament.applicationsCount || '—'}</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                                    <div className="text-xs font-bold text-purple-600 uppercase mb-1">Ср. рейтинг</div>
                                    <div className="text-2xl font-black text-purple-900">{tournament.avgRating || '—'}</div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
                                    <div className="text-xs font-bold text-orange-600 uppercase mb-1">Город</div>
                                    <div className="text-lg font-black text-orange-900">{tournamentDetails?.city || tournament.city}</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Participants Table */}
                                {tournamentDetails?.participants && tournamentDetails.participants.length > 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                            <h3 className="text-xl font-bold text-white">Участники турнира</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Место</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Имя</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Рейтинг</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Город</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Возраст</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {tournamentDetails.participants.map((participant: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{participant.place}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{participant.name}</td>
                                                            <td className="px-6 py-4 text-sm font-semibold text-blue-600">{participant.rating}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{participant.city}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{participant.age}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
                                        <div className="flex items-center justify-center flex-col">
                                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-700 mb-2">Таблица участников</h3>
                                            <p className="text-slate-500 text-center">Информация о участниках недоступна</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Link to RTT */}
                            {tournament.link && (
                                <div className="mt-8 text-center">
                                    <a 
                                        href={tournament.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                    >
                                        Открыть на RTTSTAT.RU
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        elRef.current
    );
};

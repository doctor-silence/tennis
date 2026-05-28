import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Filter, RefreshCw } from 'lucide-react';
import { User } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

export const RttStatsView = ({ user }: { user: User }) => {
    const [activeTab, setActiveTab] = useState<'rni' | 'tournaments'>('rni');
    const tournamentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playerSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAutoQueryRef = useRef('');
    const abortRef = useRef<AbortController | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [playerData, setPlayerData] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [showAllMatches, setShowAllMatches] = useState(false);
    

    // Турниры РТТ
    const [tourList, setTourList] = useState<any[]>([]);
    const [tourLoading, setTourLoading] = useState(false);
    const [tourFiltersLoading, setTourFiltersLoading] = useState(false);
    const [tourError, setTourError] = useState('');
    const [tourNotice, setTourNotice] = useState('');
    const [tourFilters, setTourFilters] = useState({ age: '', gender: '', district: '', subject: '', city: '' });
    const [tourFilterOptions, setTourFilterOptions] = useState<{districts: any[], subjects: any[], cities: any[]}>({ districts: [], subjects: [], cities: [] });
    const [tourHasSearched, setTourHasSearched] = useState(false);
    const tourAvgCacheRef = useRef<Map<string, string>>(new Map());
    const [tourAvgOverrides, setTourAvgOverrides] = useState<Record<string, string>>({});
    const [tourAvgLoadingLinks, setTourAvgLoadingLinks] = useState<Record<string, boolean>>({});

    const loadTournaments = async (filters = tourFilters) => {
        // Отменяем предыдущий запрос если он ещё идёт
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setTourLoading(true);
        setTourError('');
        setTourNotice('');
        setTourHasSearched(true);
        try {
            const res = await api.rtt.getTournamentsList(filters);
            if (res.success) {
                setTourList(res.data.tournaments || []);
                if (res.data.filters && tourFilterOptions.districts.length === 0) {
                    setTourFilterOptions(res.data.filters);
                }
                if (res.warning) {
                    setTourNotice(res.warning);
                } else if (res.data.truncated && res.data.totalCount > (res.data.tournaments?.length || 0)) {
                    setTourNotice(`Показаны первые ${res.data.tournaments.length} из ${res.data.totalCount}. Уточните округ или город.`);
                }
            } else {
                setTourError(res.error || 'Не удалось загрузить турниры');
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') setTourError('Ошибка загрузки турниров');
        } finally {
            setTourLoading(false);
        }
    };

    const loadTourFilterOptions = async () => {
        if (tourFiltersLoading || tourFilterOptions.districts.length > 0) return;

        setTourFiltersLoading(true);
        try {
            const res = await api.rtt.getTournamentFilters();
            if (res.success && res.data) {
                setTourFilterOptions({
                    districts: res.data.districts || [],
                    subjects: res.data.subjects || [],
                    cities: res.data.cities || []
                });
            }
        } catch (err) {
            console.error('Не удалось загрузить RTT фильтры:', err);
        } finally {
            setTourFiltersLoading(false);
        }
    };

    const handleTourFilterChange = (key: string, value: string) => {
        const newFilters = { ...tourFilters, [key]: value };
        if (key === 'district') {
            newFilters.subject = '';
            newFilters.city = '';
        } else if (key === 'subject') {
            newFilters.city = '';
        }
        setTourFilters(newFilters);
        // Дебаунс: ждём 300мс после последнего изменения фильтра
        if (tournamentDebounceRef.current) clearTimeout(tournamentDebounceRef.current);
        tournamentDebounceRef.current = setTimeout(() => loadTournaments(newFilters), 600);
    };

    const resetTourFilters = () => {
        const empty = { age: '', gender: '', district: '', subject: '', city: '' };
        setTourFilters(empty);
        setTourList([]);
        setTourError('');
        setTourNotice('');
        setTourHasSearched(false);
    };

    useEffect(() => {
        if (activeTab !== 'tournaments' || !tourList.length) return;

        const visible = tourList.slice(0, 12);
        const cacheSnapshot: Record<string, string> = {};
        const toLoad = visible
            .map((t: any) => String(t?.link || t?.url || t?.rtt_link || '').trim())
            .filter((link: string) => {
                if (!link) return false;
                if (tourAvgCacheRef.current.has(link)) {
                    cacheSnapshot[link] = tourAvgCacheRef.current.get(link) || '';
                    return false;
                }
                return true;
            });

        if (Object.keys(cacheSnapshot).length > 0) {
            setTourAvgOverrides((prev) => ({ ...prev, ...cacheSnapshot }));
        }

        if (!toLoad.length) return;

        let cancelled = false;
        const normalizeAvg = (value: any) => {
            const numeric = Number(String(value || '').replace(',', '.'));
            if (Number.isFinite(numeric) && numeric >= 1) {
                return String(Math.round(numeric));
            }
            return '';
        };

        const run = async () => {
            const loadingPatch: Record<string, boolean> = {};
            toLoad.forEach((link) => { loadingPatch[link] = true; });
            setTourAvgLoadingLinks((prev) => ({ ...prev, ...loadingPatch }));

            const updates: Record<string, string> = {};
            for (let i = 0; i < toLoad.length; i += 4) {
                const chunk = toLoad.slice(i, i + 4);
                const detailsChunk = await Promise.allSettled(
                    chunk.map(async (link) => {
                        const data = await api.rtt.getTournamentDetails(link);
                        const avg = normalizeAvg(data?.tournament?.avgRating);
                        return { link, avg };
                    })
                );

                if (cancelled) return;

                detailsChunk.forEach((result, index) => {
                    const link = chunk[index];
                    const avg = result.status === 'fulfilled' ? result.value.avg : '';
                    tourAvgCacheRef.current.set(link, avg);
                    updates[link] = avg;
                });
            }

            if (!cancelled && Object.keys(updates).length > 0) {
                setTourAvgOverrides((prev) => ({ ...prev, ...updates }));
            }

            if (!cancelled) {
                const donePatch: Record<string, boolean> = {};
                toLoad.forEach((link) => { donePatch[link] = false; });
                setTourAvgLoadingLinks((prev) => ({ ...prev, ...donePatch }));
            }
        };

        run().catch(() => {
            if (cancelled) return;
            const donePatch: Record<string, boolean> = {};
            toLoad.forEach((link) => { donePatch[link] = false; });
            setTourAvgLoadingLinks((prev) => ({ ...prev, ...donePatch }));
        });

        return () => {
            cancelled = true;
        };
    }, [activeTab, tourList]);

    const loadPlayerStats = async (targetRni: string) => {
        if (!targetRni || targetRni.length < 4) {
            setError('Введите корректный РНИ (минимум 4 цифры)');
            return;
        }

        lastAutoQueryRef.current = targetRni;
        setLoading(true);
        setError('');
        setPlayerData(null);
        setSearchResults([]);

        try {
            const response = await api.rtt.getPlayerStats(targetRni);
            
            if (response.success) {
                setPlayerData(response);
                setSearchQuery(targetRni);
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

    const runPlayerNameSearch = async (query: string) => {
        lastAutoQueryRef.current = query;
        setLoading(true);
        setError('');
        setPlayerData(null);
        setSearchResults([]);

        try {
            const response = await api.rtt.searchPlayers(query);

            if (response.success) {
                const players = response.data || [];
                setSearchResults(players);

                if (players.length === 0) {
                    setError('Игроки по этому запросу не найдены');
                }
            } else {
                setError(response.error || 'Не удалось выполнить поиск');
            }
        } catch (err) {
            setError('Ошибка при поиске игрока');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        const query = searchQuery.trim();

        if (!query) {
            setError('Введите РНИ или ФИО игрока');
            return;
        }

        if (/^\d+$/.test(query)) {
            await loadPlayerStats(query);
            return;
        }

        await runPlayerNameSearch(query);
    };

    useEffect(() => {
        if (activeTab !== 'rni') {
            return;
        }

        const query = searchQuery.trim();

        if (playerSearchDebounceRef.current) {
            clearTimeout(playerSearchDebounceRef.current);
        }

        if (!query) {
            return;
        }

        if (lastAutoQueryRef.current === query) {
            return;
        }

        playerSearchDebounceRef.current = setTimeout(() => {
            if (/^\d+$/.test(query)) {
                if (query.length >= 4) {
                    loadPlayerStats(query);
                }
                return;
            }

            if (query.length >= 2) {
                runPlayerNameSearch(query);
            }
        }, /^\d+$/.test(query) ? 350 : 450);

        return () => {
            if (playerSearchDebounceRef.current) {
                clearTimeout(playerSearchDebounceRef.current);
            }
        };
    }, [activeTab, searchQuery]);

    useEffect(() => {
        if (activeTab === 'tournaments') {
            loadTourFilterOptions();
        }
    }, [activeTab]);

    useEffect(() => {
        return () => {
            if (tournamentDebounceRef.current) {
                clearTimeout(tournamentDebounceRef.current);
            }
            if (playerSearchDebounceRef.current) {
                clearTimeout(playerSearchDebounceRef.current);
            }
        };
    }, []);

    const winCount = playerData?.data?.wins ?? playerData?.data?.matches?.filter((m: any) => m.result === 'win').length ?? 0;
    const lossCount = playerData?.data?.matches?.filter((m: any) => m.result === 'loss').length || 0;
    const totalMatches = playerData?.data?.totalMatches ?? (winCount + lossCount);
    const winRate = playerData?.data?.winRate ?? (totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0);
    const parseTournamentStartDate = (rawDate: string) => {
        const matched = String(rawDate || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (!matched) return null;
        const ts = Date.UTC(Number(matched[3]), Number(matched[2]) - 1, Number(matched[1]));
        return Number.isFinite(ts) ? ts : null;
    };
    const nearestTournaments = (() => {
        const source = Array.isArray(playerData?.data?.tournaments) ? playerData.data.tournaments : [];
        if (!source.length) return [];

        const today = new Date();
        const todayStartTs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const withDate = source.map((tournament: any, index: number) => ({
            tournament,
            index,
            startTs: parseTournamentStartDate(tournament?.date || '')
        }));

        const upcoming = withDate
            .filter((item) => item.startTs !== null && item.startTs >= todayStartTs)
            .sort((left, right) => {
                if (left.startTs === right.startTs) return left.index - right.index;
                return (left.startTs as number) - (right.startTs as number);
            });

        const fallbackPast = withDate
            .filter((item) => item.startTs === null || item.startTs < todayStartTs)
            .sort((left, right) => {
                if (left.startTs === null && right.startTs === null) return left.index - right.index;
                if (left.startTs === null) return 1;
                if (right.startTs === null) return -1;
                return right.startTs - left.startTs;
            });

        return [...upcoming, ...fallbackPast].slice(0, 6).map((item) => item.tournament);
    })();

    return (
        <>
            <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 text-white">
                <h1 className="text-3xl font-black mb-2">Статистика РТТ</h1>
                <p className="text-orange-100">Поиск игроков и турниров</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('rni')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                            activeTab === 'rni'
                                ? 'bg-white text-orange-600 border-b-2 border-orange-500'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        🔍 Поиск игрока
                    </button>
                    <button
                        onClick={() => setActiveTab('tournaments')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                            activeTab === 'tournaments'
                                ? 'bg-white text-orange-600 border-b-2 border-orange-500'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        🏆 Турниры РТТ
                    </button>
                </div>

                {activeTab === 'rni' && (
                    <div className="p-6">
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                РНИ или ФИО игрока
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Введите РНИ или ФИО (например, 53699 или Иванов Иван)"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400 outline-none text-lg"
                            />
                            <p className="text-xs text-slate-400 mt-2">Поиск запускается автоматически и по ФИО, и по РНИ. Для РНИ карточка откроется после короткой паузы или по Enter.</p>
                            {loading && (
                                <div className="mt-3 inline-flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Загружаем данные РТТ...</span>
                                </div>
                            )}
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'tournaments' && <>
            <div className="overflow-hidden">
                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-end gap-3">
                    {tourHasSearched && (
                        <button
                            onClick={resetTourFilters}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg"
                            title="Сбросить фильтры"
                        >
                            <span>✕</span>
                            <span>Сбросить фильтры</span>
                        </button>
                    )}
                    {tourHasSearched && (
                        <button
                            onClick={() => loadTournaments()}
                            className="text-slate-400 hover:text-slate-700 transition-colors"
                            title="Обновить"
                        >
                            <RefreshCw size={16} className={tourLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>

                {/* Фильтры */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Возраст */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Возраст</label>
                        <select value={tourFilters.age} onChange={(e) => handleTourFilterChange('age', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                            <option value="">Все возраста</option>
                            <option value="131">9-10 лет</option>
                            <option value="132">до 13 лет</option>
                            <option value="133">до 15 лет</option>
                            <option value="134">до 17 лет</option>
                            <option value="135">до 19 лет</option>
                            <option value="136">19+ лет</option>
                        </select>
                    </div>
                    {/* Пол */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Пол</label>
                        <select value={tourFilters.gender} onChange={(e) => handleTourFilterChange('gender', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                            <option value="">Все</option>
                            <option value="1">М</option>
                            <option value="2">Ж</option>
                            <option value="3">Микст</option>
                        </select>
                    </div>
                    {/* Округ */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Округ</label>
                        <select value={tourFilters.district} onChange={(e) => handleTourFilterChange('district', e.target.value)}
                            disabled={tourFiltersLoading}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-slate-100 disabled:text-slate-400">
                            <option value="">Не выбрано</option>
                            {tourFilterOptions.districts.map((d: any) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>
                    {/* Субъект */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Субъект</label>
                        <select value={tourFilters.subject} onChange={(e) => handleTourFilterChange('subject', e.target.value)}
                            disabled={tourFiltersLoading}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-slate-100 disabled:text-slate-400">
                            <option value="">Не выбрано</option>
                            {tourFilterOptions.subjects
                                .filter((s: any) => !tourFilters.district || s.parent === tourFilters.district)
                                .map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    {/* Город */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Город</label>
                        <select value={tourFilters.city} onChange={(e) => handleTourFilterChange('city', e.target.value)}
                            disabled={tourFiltersLoading}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-slate-100 disabled:text-slate-400">
                            <option value="">Не выбрано</option>
                            {tourFilterOptions.cities
                                .filter((c: any) => !tourFilters.subject || c.parent === tourFilters.subject)
                                .map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                </div>
                {tourFiltersLoading && (
                    <div className="px-6 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-200 inline-flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Подгружаем округа, субъекты и города...</span>
                    </div>
                )}

                {/* Таблица */}
                {tourLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <span className="ml-3 text-slate-500 font-medium">Загружаем турниры...</span>
                    </div>
                ) : !tourHasSearched ? (
                    <div className="py-16 text-center text-slate-400">
                        <Filter size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Выберите фильтр для поиска турниров</p>
                        <p className="text-sm mt-1 text-slate-300">Выберите возраст, пол или регион</p>
                    </div>
                ) : tourError ? (
                    <div className="py-12 text-center text-red-500 font-medium">{tourError}</div>
                ) : tourList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">Турниры не найдены</div>
                ) : (
                    <div className="overflow-x-auto">
                        {tourNotice && (
                            <div className="px-6 py-2 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">{tourNotice}</div>
                        )}
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                                <tr>
                                    {['Город','Тип','Возраст','Категория','Начало','Корты','Заявок','Ср. рейтинг','Статус','Название'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tourList.map((t: any, i: number) => (
                                    <tr
                                        key={i}
                                        className={`border-b border-slate-100 hover:bg-orange-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-25'}`}
                                    >
                                        <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{t.city || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.type || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.ageGroup || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.category || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.startDate || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.surface || '—'}</td>
                                        <td className="px-3 py-2 text-center font-bold text-slate-700">{t.applications || '—'}</td>
                                        <td className="px-3 py-2 text-center text-slate-600">
                                            {(() => {
                                                const detailUrl = String(t?.link || t?.url || t?.rtt_link || '').trim();
                                                const value = detailUrl ? (tourAvgOverrides[detailUrl] ?? t.avgRating ?? '') : (t.avgRating || '');
                                                if (value) return value;
                                                if (detailUrl && tourAvgLoadingLinks[detailUrl]) return '...';
                                                return '—';
                                            })()}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                t.status?.toLowerCase().includes('подача') ? 'bg-green-100 text-green-700' :
                                                t.status?.toLowerCase().includes('идут') ? 'bg-blue-100 text-blue-700' :
                                                t.status?.toLowerCase().includes('завер') ? 'bg-slate-100 text-slate-500' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {t.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-800">
                                            <a
                                                href={String(t?.link || t?.url || t?.rtt_link || '#')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-left text-orange-600 hover:text-orange-800 hover:underline"
                                            >
                                                {t.name || '—'}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-3 text-xs text-slate-400 text-right">
                            Источник: сервис РТТ · Найдено: {tourList.length} турниров
                        </div>
                    </div>
                )}
            </div>
            </> }
            </div>{/* конец единого контейнера с вкладками */}

            {activeTab === 'rni' && searchResults.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Найденные игроки</h3>
                            <p className="text-sm text-slate-500">Выберите игрока, чтобы открыть полную статистику РТТ</p>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{searchResults.length} результатов</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {searchResults.map((player) => (
                            <button
                                key={player.rni}
                                onClick={() => loadPlayerStats(player.rni)}
                                className="w-full px-6 py-4 text-left hover:bg-orange-50 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div className="text-base font-bold text-slate-900">{player.name}</div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            РНИ: <span className="font-semibold text-slate-700">{player.rni}</span>
                                            <span className="mx-2 text-slate-300">•</span>
                                            {player.city}
                                            <span className="mx-2 text-slate-300">•</span>
                                            {player.category}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-slate-500">Очки: <span className="font-bold text-slate-900">{player.points}</span></div>
                                        <div className="text-slate-500">Позиция: <span className="font-bold text-orange-600">#{player.rank}</span></div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Player Data — вне вкладок, всегда видно на вкладке РНИ */}
            {activeTab === 'rni' && playerData && (
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
                                <div className="text-2xl font-black text-orange-600 text-center">{playerData.data.rni || searchQuery}</div>
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
                                        {nearestTournaments.map((tournament: any, index: number) => (
                                            <tr key={tournament.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                                                <td className="px-4 py-3 text-sm text-slate-900">{tournament.city || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900">{tournament.category || tournament.ageGroup || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{tournament.date}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <a
                                                        href={String(tournament?.link || tournament?.url || tournament?.rtt_link || '#')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-left"
                                                    >
                                                        {tournament.tournament}
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {playerData.data.tournaments.length > nearestTournaments.length && (
                                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                                    Показаны ближайшие 6 турниров
                                </div>
                            )}
                        </div>
                    )}

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
                                                        РНИ: {match.opponentPoints}
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
            {!playerData && loading && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
                    <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Получаем данные игрока</h3>
                    <p className="text-slate-500">Обычно занимает несколько секунд</p>
                </div>
            )}

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

        </>
    );
};

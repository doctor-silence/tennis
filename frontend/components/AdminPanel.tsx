import React, { useEffect, useMemo, useState } from 'react';
import { 
    LayoutDashboard, 
    Users, 
    ShoppingBag, 
    Terminal, 
    LogOut, 
    Search, 
    Plus, 
    Edit, 
    Trash2, 
    Save, 
    X,
    TrendingUp,
    DollarSign,
    Server,
    Activity,
    AlertCircle,
    CheckCircle2,
    Info,
    Image as ImageIcon,
    Map,
    ChevronDown,
    Shield,
    Trophy,
    MessageSquare,
    Menu,
    ExternalLink,
    Newspaper,
    Eye,
    EyeOff,
    Loader2,
    RefreshCw,
    Send,
    Megaphone
} from 'lucide-react';
import AdminTournamentsView from './dashboard/AdminTournamentsView';
import AdminSupportChat from './dashboard/AdminSupportChat';
import Button from './Button';
import { User, Product, SystemLog, Court, Group, Tournament, NewsArticle } from '../types';
import { api } from '../services/api';

interface AdminPanelProps {
    user: User;
    onLogout: () => void;
}

// Collection of high-quality tennis court images for auto-assignment
const COURT_IMAGES = [
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop', // Clay
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop', // Hard Blue
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop', // Hard Green/Blue
    'https://images.unsplash.com/photo-1575217985390-3375c3dbb908?q=80&w=1200&auto=format&fit=crop', // Indoor Hard
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200&auto=format&fit=crop', // Red Clay
    'https://images.unsplash.com/photo-1620202755294-8531732e7071?q=80&w=1200&auto=format&fit=crop', // Outdoor Clay
    'https://images.unsplash.com/photo-1588611910629-68897b69c693?q=80&w=1200&auto=format&fit=crop'  // Hard Green
];

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
    'Калининград',
    'Пермь',
    'Воронеж',
    'Красноярск',
    'Астрахань',
    'Архангельск',
    'Волгоград'
];

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'shop' | 'logs' | 'courts' | 'groups' | 'tournaments' | 'support' | 'news' | 'health'>('support');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Toast notifications
    const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
    const toast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    
    // Data State
    const [stats, setStats] = useState<any>({ revenue: 0, activeUsers: 0, newSignups: 0, serverLoad: 0 });
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthLastRefresh, setHealthLastRefresh] = useState<Date | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [logQuery, setLogQuery] = useState('');
    const [logLevelFilter, setLogLevelFilter] = useState<'all' | SystemLog['level']>('all');
    const [logModuleFilter, setLogModuleFilter] = useState('all');
    const [logActionFilter, setLogActionFilter] = useState<'all' | 'created' | 'updated' | 'deleted'>('all');
    const [logActorFilter, setLogActorFilter] = useState('all');
    const [logPeriodFilter, setLogPeriodFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [news, setNews] = useState<NewsArticle[]>([]);
    
    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Partial<Court> & { surface: string[] } | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
    const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Partial<Tournament> | null>(null);
    const [tournamentModalMode, setTournamentModalMode] = useState<'manual' | 'rtt'>('manual');
    const [rttTournamentFilters, setRttTournamentFilters] = useState({ age: '', gender: '', district: '', subject: '', city: '' });
    const [rttTournamentQuery, setRttTournamentQuery] = useState('');
    const [rttTournamentOptions, setRttTournamentOptions] = useState<{districts: any[], subjects: any[], cities: any[]}>({ districts: [], subjects: [], cities: [] });
    const [rttTournamentList, setRttTournamentList] = useState<any[]>([]);
    const [rttTournamentLoading, setRttTournamentLoading] = useState(false);
    const [rttTournamentError, setRttTournamentError] = useState('');
    const [rttTournamentHasSearched, setRttTournamentHasSearched] = useState(false);
    const [rttImportLoadingLink, setRttImportLoadingLink] = useState<string | null>(null);
    const [isPublishResultModalOpen, setIsPublishResultModalOpen] = useState(false);
    const [publishResultTournament, setPublishResultTournament] = useState<Tournament | null>(null);
    const [publishResultForm, setPublishResultForm] = useState({
        type: 'tournament_result' as 'tournament_result' | 'match_result_update',
        round: '' as '' | '1/16' | '1/8' | '1/4' | 'Полуфинал' | 'Финал',
        player1: '',
        player2: '',
        score: '',
        winnerName: '',
        note: '',
    });
    const [isPublishing, setIsPublishing] = useState(false);
    const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState<Partial<NewsArticle> | null>(null);
    
    // User Edit State
    const [editingUser, setEditingUser] = useState<(Partial<User> & { password?: string, rni?: string }) | null>(null);
    const [rttFetching, setRttFetching] = useState(false);
    const [rttFetchResult, setRttFetchResult] = useState<{ok: boolean; msg: string} | null>(null);

    const getLogActionType = (log: SystemLog): 'created' | 'updated' | 'deleted' | 'other' => {
        const text = `${log.message || ''} ${log.details || ''}`.toLowerCase();

        if (/(создал|создан|создана|добавил|добавлен|добавлена|опубликовал)/.test(text)) return 'created';
        if (/(обновил|обновл[её]н|обновлена|изменил|изменена)/.test(text)) return 'updated';
        if (/(удалил|удал[её]н|удалена)/.test(text)) return 'deleted';

        return 'other';
    };

    const logModuleOptions = useMemo(() => {
        const uniqueModules = Array.from(new Set((logs || []).map(log => log.moduleLabel || log.module).filter(Boolean)));
        return uniqueModules.sort((a, b) => a.localeCompare(b, 'ru'));
    }, [logs]);

    const logActorOptions = useMemo(() => {
        const uniqueActors = Array.from(new Set((logs || []).map(log => log.actor).filter(Boolean)));
        return uniqueActors.sort((a, b) => a.localeCompare(b, 'ru'));
    }, [logs]);

    const logModuleCounts = useMemo(() => {
        return (logs || []).reduce<Record<string, number>>((acc, log) => {
            const moduleName = log.moduleLabel || log.module;
            if (!moduleName) return acc;
            acc[moduleName] = (acc[moduleName] || 0) + 1;
            return acc;
        }, {});
    }, [logs]);

    const logActionCounts = useMemo(() => {
        return (logs || []).reduce(
            (acc, log) => {
                const actionType = getLogActionType(log);
                if (actionType !== 'other') acc[actionType] += 1;
                return acc;
            },
            { created: 0, updated: 0, deleted: 0 }
        );
    }, [logs]);

    const isLogInPeriod = (log: SystemLog) => {
        if (logPeriodFilter === 'all') return true;

        const rawDate = log.timestampRaw ? new Date(log.timestampRaw) : null;
        if (!rawDate || Number.isNaN(rawDate.getTime())) return false;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (logPeriodFilter === 'today') {
            return rawDate >= startOfToday;
        }

        const days = logPeriodFilter === '7d' ? 7 : 30;
        const threshold = new Date(now);
        threshold.setDate(threshold.getDate() - days);
        return rawDate >= threshold;
    };

    const filteredLogs = useMemo(() => {
        const query = logQuery.trim().toLowerCase();

        return (logs || []).filter((log) => {
            const levelMatches = logLevelFilter === 'all' || log.level === logLevelFilter;
            const moduleValue = log.moduleLabel || log.module;
            const moduleMatches = logModuleFilter === 'all' || moduleValue === logModuleFilter;
            const actionMatches = logActionFilter === 'all' || getLogActionType(log) === logActionFilter;
            const actorMatches = logActorFilter === 'all' || log.actor === logActorFilter;
            const periodMatches = isLogInPeriod(log);

            if (!levelMatches || !moduleMatches || !actionMatches || !actorMatches || !periodMatches) return false;
            if (!query) return true;

            const haystack = [
                log.message,
                log.details,
                log.actor,
                log.module,
                log.moduleLabel,
                log.level,
                log.levelLabel,
                log.timestamp
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [logs, logLevelFilter, logModuleFilter, logActionFilter, logActorFilter, logPeriodFilter, logQuery]);

    const handleFetchRtt = async () => {
        if (!editingUser?.rni) return;
        setRttFetching(true);
        setRttFetchResult(null);
        try {
            const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
            const res = await fetch(`${API_URL}/rtt/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rni: editingUser.rni })
            });
            const data = await res.json();
            if (data.success && data.data) {
                const d = data.data;
                setEditingUser(prev => ({
                    ...prev!,
                    role: 'rtt_pro',
                    rating: d.points ?? prev!.rating,
                    rttRank: d.rank ?? prev!.rttRank,
                    rttCategory: d.category ?? prev!.rttCategory,
                    level: d.points ? `РТТ ${d.points} очков` : prev!.level,
                }));
                setRttFetchResult({ ok: true, msg: `✓ ${d.name} — ${d.points ?? '?'} очков, позиция ${d.rank ?? '?'}` });
            } else {
                setRttFetchResult({ ok: false, msg: data.error || 'Игрок не найден' });
            }
        } catch {
            setRttFetchResult({ ok: false, msg: 'Ошибка соединения с сервером' });
        } finally {
            setRttFetching(false);
        }
    };

    // Search Filters
    const [courtSearchName, setCourtSearchName] = useState<string>('');
    const [courtSearchCity, setCourtSearchCity] = useState<string>('Все города');

    // Confirmation Modal State
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [deleteActionType, setDeleteActionType] = useState<'court' | 'user' | 'product' | 'group' | 'tournament' | 'news' | null>(null);

    // 2FA State
    const [twoFaStep, setTwoFaStep] = useState<'idle' | 'qr' | 'verify' | 'disable'>('idle');
    const [twoFaQrCode, setTwoFaQrCode] = useState<string>('');
    const [twoFaToken, setTwoFaToken] = useState<string>('');
    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(user?.totp_enabled ?? false);

    const normalizeRttDate = (rawDate?: string) => {
        if (!rawDate) return '';
        const match = rawDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (!match) return '';
        return `${match[3]}-${match[2]}-${match[1]}`;
    };

    const normalizeRttDateRange = (rawDate?: string) => {
        if (!rawDate) return { startDate: '', endDate: '' };

        const normalizedDate = rawDate.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

        const fullRangeMatch = normalizedDate.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);
        if (fullRangeMatch) {
            return {
                startDate: `${fullRangeMatch[3]}-${fullRangeMatch[2]}-${fullRangeMatch[1]}`,
                endDate: `${fullRangeMatch[6]}-${fullRangeMatch[5]}-${fullRangeMatch[4]}`
            };
        }

        const shortDayRangeMatch = normalizedDate.match(/(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);
        if (shortDayRangeMatch) {
            return {
                startDate: `${shortDayRangeMatch[4]}-${shortDayRangeMatch[3]}-${shortDayRangeMatch[1]}`,
                endDate: `${shortDayRangeMatch[4]}-${shortDayRangeMatch[3]}-${shortDayRangeMatch[2]}`
            };
        }

        const shortMonthRangeMatch = normalizedDate.match(/(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);
        if (shortMonthRangeMatch) {
            return {
                startDate: `${shortMonthRangeMatch[5]}-${shortMonthRangeMatch[2]}-${shortMonthRangeMatch[1]}`,
                endDate: `${shortMonthRangeMatch[5]}-${shortMonthRangeMatch[4]}-${shortMonthRangeMatch[3]}`
            };
        }

        const matches = [...rawDate.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
        if (matches.length === 0) return { startDate: '', endDate: '' };

        const toIso = (match: RegExpMatchArray) => `${match[3]}-${match[2]}-${match[1]}`;
        const startDate = toIso(matches[0]);
        const endDate = matches.length > 1 ? toIso(matches[matches.length - 1]) : '';

        return { startDate, endDate };
    };

    const getTournamentMetaFieldConfig = (value?: string) => {
        const normalizedValue = (value || '').trim();
        if (normalizedValue.toLowerCase().startsWith('средний рейтинг:')) {
            return {
                label: 'Средний рейтинг участников',
                placeholder: 'Например: Средний рейтинг: 269'
            };
        }

        return {
            label: 'Призовой фонд',
            placeholder: 'Например: 10000 RUB'
        };
    };

    const mapRttStatusToTournamentStatus = (status?: string): Tournament['status'] => {
        const normalized = (status || '').toLowerCase();
        if (normalized.includes('идут') || normalized.includes('в игре')) return 'live';
        if (normalized.includes('завер')) return 'finished';
        if (normalized.includes('подача') || normalized.includes('регистра')) return 'open';
        return 'draft';
    };

    const guessTournamentType = (value?: string): Tournament['tournamentType'] => {
        return (value || '').toLowerCase().includes('пар') ? 'Парный' : 'Одиночный';
    };

    const importRttTournamentToForm = async (rttTournament: any) => {
        try {
            setRttImportLoadingLink(rttTournament.link || rttTournament.name);
            let details: any = null;
            if (rttTournament.link) {
                const response = await api.rtt.getTournamentDetails(rttTournament.link);
                if (response?.success) {
                    details = response.tournament;
                }
            }

            const participantsCount = Number(String(rttTournament.applications || '').replace(/\D/g, '')) || details?.participants?.length || 16;
            const rawTournamentDate = details?.date || rttTournament.startDate || '';
            const tournamentDates = normalizeRttDateRange(rawTournamentDate);
            const mappedTournament: Partial<Tournament> = {
                ...editingTournament,
                name: rttTournament.name || details?.name || 'Турнир РТТ',
                category: rttTournament.category || details?.surface || '',
                tournamentType: guessTournamentType(rttTournament.type),
                gender: (rttTournament.type || '').toLowerCase().includes('жен') ? 'Женский' : (rttTournament.type || '').toLowerCase().includes('смеш') ? 'Смешанный' : 'Мужской',
                ageGroup: rttTournament.ageGroup || '',
                system: 'Олимпийская',
                matchFormat: details?.surface ? `Покрытие: ${details.surface}` : '',
                startDate: tournamentDates.startDate,
                endDate: tournamentDates.endDate,
                participantsCount,
                prizePool: rttTournament.avgRating ? `Средний рейтинг: ${rttTournament.avgRating}` : '',
                stageStatus: details?.stageStatus || rttTournament.status || '',
                status: mapRttStatusToTournamentStatus(rttTournament.status),
                type: 'single_elimination',
                rttLink: rttTournament.link || '',
                rounds: editingTournament?.rounds || [],
                userId: user.id,
            };

            setEditingTournament(mappedTournament);
            setTournamentModalMode('manual');
            toast(`Турнир «${mappedTournament.name}» импортирован в форму`);
        } catch (e: any) {
            toast('Ошибка импорта турнира РТТ: ' + e.message, 'error');
        } finally {
            setRttImportLoadingLink(null);
        }
    };

    const loadRttTournaments = async (filters = rttTournamentFilters) => {
        setRttTournamentLoading(true);
        setRttTournamentError('');
        setRttTournamentHasSearched(true);
        try {
            const res = await api.rtt.getTournamentsList(filters);
            if (res.success) {
                setRttTournamentList(res.data?.tournaments || []);
                if (res.data?.filters) {
                    setRttTournamentOptions(res.data.filters);
                }
            } else {
                setRttTournamentError(res.error || 'Не удалось загрузить турниры РТТ');
            }
        } catch (e: any) {
            setRttTournamentError(e?.message || 'Ошибка загрузки турниров РТТ');
        } finally {
            setRttTournamentLoading(false);
        }
    };

    const handleRttTournamentFilterChange = (key: 'age' | 'gender' | 'district' | 'subject' | 'city', value: string) => {
        const nextFilters = { ...rttTournamentFilters, [key]: value };
        if (key === 'district') {
            nextFilters.subject = '';
            nextFilters.city = '';
        }
        if (key === 'subject') {
            nextFilters.city = '';
        }
        setRttTournamentFilters(nextFilters);
        loadRttTournaments(nextFilters);
    };

    const resetRttTournamentFilters = () => {
        const empty = { age: '', gender: '', district: '', subject: '', city: '' };
        setRttTournamentFilters(empty);
        setRttTournamentQuery('');
        setRttTournamentList([]);
        setRttTournamentError('');
        setRttTournamentHasSearched(false);
    };

    const filteredRttTournamentList = rttTournamentList.filter((tournament: any) => {
        const query = rttTournamentQuery.trim().toLowerCase();
        if (!query) return true;

        const haystack = [
            tournament.name,
            tournament.city,
            tournament.ageGroup,
            tournament.category,
            tournament.type,
            tournament.status,
            tournament.startDate,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return haystack.includes(query);
    });

    const handle2faSetup = async () => {
        setTwoFaLoading(true);
        try {
            const data = await api.auth.setup2fa(String(user.id));
            setTwoFaQrCode(data.qrCode);
            setTwoFaStep('qr');
        } catch {
            toast('Ошибка при генерации 2FA', 'error');
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handle2faEnable = async () => {
        if (twoFaToken.length !== 6) return;
        setTwoFaLoading(true);
        try {
            await api.auth.enable2fa(String(user.id), twoFaToken);
            setTwoFaEnabled(true);
            setTwoFaStep('idle');
            setTwoFaToken('');
            toast('2FA успешно включена!');
        } catch {
            toast('Неверный код. Попробуйте снова.', 'error');
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handle2faDisable = async () => {
        if (twoFaToken.length !== 6) return;
        setTwoFaLoading(true);
        try {
            await api.auth.disable2fa(String(user.id), twoFaToken);
            setTwoFaEnabled(false);
            setTwoFaStep('idle');
            setTwoFaToken('');
            toast('2FA отключена');
        } catch {
            toast('Неверный код. Попробуйте снова.', 'error');
        } finally {
            setTwoFaLoading(false);
        }
    };

    // Initial Data Load
    useEffect(() => {
        loadData();
    }, [activeTab, courtSearchName, courtSearchCity]); // Refresh when tab changes or search filters change

    const loadData = async () => {
        if (activeTab === 'overview') {
            const s = await api.admin.getStats();
            setStats(s);
            const u = await api.admin.getUsers();
            if (Array.isArray(u)) setUsers(u);
        }
        if (activeTab === 'health') {
            setHealthLoading(true);
            try {
                const s = await api.admin.getStats();
                setStats(s);
                setHealthLastRefresh(new Date());
            } finally {
                setHealthLoading(false);
            }
        }
        if (activeTab === 'logs') {
            const l = await api.admin.getLogs();
            if (Array.isArray(l)) setLogs(l);
        }
        if (activeTab === 'users') {
            const u = await api.admin.getUsers();
            if (Array.isArray(u)) setUsers(u);
        }
        if (activeTab === 'shop') {
            const p = await api.admin.getProducts();
            if (Array.isArray(p)) setProducts(p);
        }
        if (activeTab === 'courts') {
            const c = await api.getCourts(courtSearchName, courtSearchCity === 'Все города' ? '' : courtSearchCity);
            if (Array.isArray(c)) setCourts(c);
        }
        if (activeTab === 'groups' || activeTab === 'tournaments') { // Also load groups for tournament editing
            const g = await api.admin.getGroups(user.id);
            if(Array.isArray(g)) setGroups(g);
        }
        if (activeTab === 'tournaments') {
            const t = await api.admin.getTournaments();
            if(Array.isArray(t)) setTournaments(t);
        }
        if (activeTab === 'news') {
            try {
                const n = await api.news.adminGetAll();
                if(Array.isArray(n)) setNews(n);
            } catch (e: any) {
                console.error('Ошибка загрузки новостей:', e);
                toast('Ошибка загрузки новостей: ' + e.message, 'error');
            }
        }
    };


    // Handlers for Confirmation Modal
    const handleConfirmDelete = async () => {
        if (!itemToDeleteId || !deleteActionType) return;

        try {
            if (deleteActionType === 'product') await api.admin.deleteProduct(itemToDeleteId);
            else if (deleteActionType === 'court') await api.admin.deleteCourt(itemToDeleteId);
            else if (deleteActionType === 'user') await api.admin.deleteUser(itemToDeleteId);
            else if (deleteActionType === 'group') await api.admin.deleteGroup(itemToDeleteId, user.id);
            else if (deleteActionType === 'tournament') await api.admin.deleteTournament(itemToDeleteId);
            else if (deleteActionType === 'news') await api.news.delete(itemToDeleteId);
            
            await loadData(); // Reload data after deletion
        } catch (e: any) {
            toast('Ошибка удаления: ' + e.message, 'error');
            console.error("Deletion failed", e);
        } finally {
            setShowConfirmDeleteModal(false);
            setItemToDeleteId(null);
            setDeleteActionType(null);
        }
    };

    // Product Handlers
    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            try {
                await api.admin.saveProduct(editingProduct);
                await loadData();
                setIsProductModalOpen(false);
                setEditingProduct(null);
            } catch (e: any) {
                toast('Ошибка сохранения: ' + e.message, 'error');
            }
        }
    };

    const handleDeleteProduct = (id: string) => {
        setDeleteActionType('product');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    // Court Handlers
    const handleSaveCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCourt) {
            try {
                const courtData = { ...editingCourt };
                if (!courtData.image || courtData.image.trim() === '') {
                    courtData.image = COURT_IMAGES[Math.floor(Math.random() * COURT_IMAGES.length)];
                }
                console.log('🏟️ Saving court:', courtData.id, 'Image:', courtData.image ? `${courtData.image.substring(0, 50)}... (${courtData.image.length} chars)` : 'NO IMAGE');
                await api.admin.saveCourt(courtData);
                await loadData();
                setIsCourtModalOpen(false);
                setEditingCourt(null);
            } catch (e: any) {
                toast('Ошибка сохранения: ' + e.message, 'error');
                console.error("Save failed", e);
            }
        }
    };

    const handleDeleteCourt = (id: string) => {
        setDeleteActionType('court');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };
    
    const handleSurfaceChange = (surface: string) => {
        if (editingCourt) {
            const newSurfaces = editingCourt.surface.includes(surface)
                ? editingCourt.surface.filter(s => s !== surface)
                : [...editingCourt.surface, surface];
            setEditingCourt({ ...editingCourt, surface: newSurfaces });
        }
    };

    // User Handlers
    const handleAddUser = () => {
        setEditingUser({
            name: '', email: '', password: '123', role: 'amateur',
            city: 'Москва', level: 'NTRP 3.0', rating: 0, rttRank: 0, rttCategory: 'Взрослые'
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            try {
                if (editingUser.id) await api.admin.updateUser(editingUser.id, editingUser);
                else await api.admin.createUser(editingUser);
                await loadData();
                setIsUserModalOpen(false);
                setEditingUser(null);
            } catch (e: any) {
                toast('Ошибка сохранения: ' + e.message, 'error');
            }
        }
    };

    const handleDeleteUser = (id: string) => {
        setDeleteActionType('user');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };
    
    // Group Handlers
    const handleAddGroup = () => {
        setEditingGroup({ name: '', location: 'Москва', description: '', contact: '' });
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;
        try {
            if (editingGroup.id) {
                await api.admin.updateGroup(editingGroup.id, editingGroup, user.id);
            } else {
                await api.admin.createGroup(editingGroup, user.id);
            }
            await loadData();
            setIsGroupModalOpen(false);
            setEditingGroup(null);
        } catch (e: any) {
            toast('Ошибка сохранения: ' + e.message, 'error');
        }
    };

    const handleDeleteGroup = (id: string) => {
        setDeleteActionType('group');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    // Tournament Handlers
    const handlePublishResult = (tournament: Tournament) => {
        setPublishResultTournament(tournament);
        setPublishResultForm({ type: 'tournament_result', round: '', player1: '', player2: '', score: '', winnerName: '', note: '' });
        setIsPublishResultModalOpen(true);
    };

    const handleSubmitPublishResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publishResultTournament) return;
        setIsPublishing(true);
        try {
            const groupId = publishResultTournament.target_group_id || (publishResultTournament as any).target_group_id || null;
            const isFullResult = publishResultForm.type === 'tournament_result';
            const content = isFullResult
                ? {
                    tournamentName: publishResultTournament.name,
                    winnerName: publishResultForm.winnerName,
                    winnerAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(publishResultForm.winnerName)}&background=f59e0b&color=fff`,
                    note: publishResultForm.note,
                }
                : {
                    tournamentName: publishResultTournament.name,
                    round: publishResultForm.round,
                    player1Name: publishResultForm.player1,
                    player2Name: publishResultForm.player2,
                    score: publishResultForm.score,
                    winnerName: publishResultForm.winnerName,
                    note: publishResultForm.note,
                };
            await api.posts.create({
                userId: user.id,
                type: isFullResult ? 'tournament_result' : 'match_result',
                groupId: groupId || undefined,
                content,
            });
            setIsPublishResultModalOpen(false);
            setPublishResultTournament(null);
            toast('Результат опубликован в сообществе!');
        } catch (e: any) {
            toast('Ошибка: ' + e.message, 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleAddTournament = () => {
        setTournamentModalMode('manual');
        setEditingTournament({
            name: 'Новый турнир',
            prizePool: '10000 RUB',
            status: 'draft',
            type: 'single_elimination',
            rounds: [],
            userId: user.id
        });
        setIsTournamentModalOpen(true);
    };

    const handleEditTournament = (tournament: Tournament) => {
        setTournamentModalMode('manual');
        setEditingTournament({
            ...tournament,
            // Map snake_case DB fields → camelCase form fields
            startDate: (tournament.startDate || (tournament as any).start_date || ''),
            endDate: (tournament.endDate || (tournament as any).end_date || ''),
            prizePool: (tournament.prizePool || (tournament as any).prize_pool || ''),
            stageStatus: (tournament.stageStatus || (tournament as any).stage_status || ''),
            tournamentType: (tournament.tournamentType || (tournament as any).tournament_type || 'Одиночный'),
            ageGroup: (tournament.ageGroup || (tournament as any).age_group || ''),
            matchFormat: (tournament.matchFormat || (tournament as any).match_format || ''),
            groupName: (tournament.groupName || (tournament as any).group_name || ''),
            participantsCount: (tournament.participantsCount || (tournament as any).participants_count || 16),
            target_group_id: (tournament.target_group_id || (tournament as any).target_group_id || ''),
            rttLink: (tournament.rttLink || (tournament as any).rtt_link || ''),
        });
        setIsTournamentModalOpen(true);
    };

    const handleSaveTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTournament) return;
        try {
            if (editingTournament.id) {
                await api.admin.updateTournament(editingTournament.id, editingTournament);
            } else {
                await api.admin.createTournament(editingTournament);
            }
            await loadData();
            setIsTournamentModalOpen(false);
            setEditingTournament(null);
        } catch (e: any) {
            toast('Ошибка сохранения: ' + e.message, 'error');
        }
    };

    const handleDeleteTournament = (id: string) => {
        setDeleteActionType('tournament');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    // News Handlers
    const handleAddNews = () => {
        setEditingNews({
            title: '',
            summary: '',
            content: '',
            image: '',
            author: 'Редакция НаКорте',
            category: 'general',
            is_published: true,
            views: 0,
        });
        setIsNewsModalOpen(true);
    };

    const handleEditNews = (article: NewsArticle) => {
        setEditingNews({ ...article });
        setIsNewsModalOpen(true);
    };

    const handleSaveNews = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingNews) return;
        try {
            if (editingNews.id) {
                await api.news.update(editingNews.id, editingNews);
            } else {
                await api.news.create(editingNews);
            }
            await loadData();
            setIsNewsModalOpen(false);
            setEditingNews(null);
        } catch (e: any) {
            toast('Ошибка сохранения: ' + e.message, 'error');
        }
    };

    const handleDeleteNews = (id: string) => {
        setDeleteActionType('news');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    const setActiveAdminTab = (tab: 'overview' | 'users' | 'shop' | 'logs' | 'courts' | 'groups' | 'tournaments' | 'support' | 'news' | 'health') => {
        setActiveTab(tab);
        setIsMobileSidebarOpen(false);
    };

    const handleToggleNewsPublished = async (article: NewsArticle) => {
        try {
            await api.news.update(article.id, { is_published: !article.is_published });
            await loadData();
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        }
    };


    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {isMobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Закрыть меню"
                    className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 lg:static lg:w-64 lg:max-w-none ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-slate-900 rounded-sm"></div>
                    </div>
                    <div>
                        <div className="font-black tracking-wider text-lg text-white">
                          НаКорте
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Admin Panel</div>
                    </div>
                    </div>
                    <button type="button" onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                    <SidebarLink icon={<LayoutDashboard size={20}/>} label="Обзор" active={activeTab === 'overview'} onClick={() => setActiveAdminTab('overview')} />
                    <SidebarLink icon={<Users size={20}/>} label="Пользователи" active={activeTab === 'users'} onClick={() => setActiveAdminTab('users')} />
                    <SidebarLink icon={<Shield size={20}/>} label="Группы" active={activeTab === 'groups'} onClick={() => setActiveAdminTab('groups')} />
                    <SidebarLink icon={<Trophy size={20}/>} label="Турниры" active={activeTab === 'tournaments'} onClick={() => setActiveAdminTab('tournaments')} />
                    <SidebarLink icon={<MessageSquare size={20}/>} label="Поддержка" active={activeTab === 'support'} onClick={() => setActiveAdminTab('support')} />
                    <SidebarLink icon={<Newspaper size={20}/>} label="Новости" active={activeTab === 'news'} onClick={() => setActiveAdminTab('news')} />
                    <SidebarLink icon={<Map size={20}/>} label="Корты" active={activeTab === 'courts'} onClick={() => setActiveAdminTab('courts')} />
                    <SidebarLink icon={<ShoppingBag size={20}/>} label="Магазин" active={activeTab === 'shop'} onClick={() => setActiveAdminTab('shop')} />
                    <SidebarLink icon={<Terminal size={20}/>} label="Системные логи" active={activeTab === 'logs'} onClick={() => setActiveAdminTab('logs')} />
                    <SidebarLink icon={<Activity size={20}/>} label="Статус сервера" active={activeTab === 'health'} onClick={() => setActiveAdminTab('health')} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                         <img src={user.avatar} className="w-8 h-8 rounded-full bg-slate-700" alt=""/>
                         <div className="text-sm">
                             <div className="font-bold">{user.name}</div>
                             <div className="text-xs text-lime-400">Администрация</div>
                         </div>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <LogOut size={18}/> <span>Выход</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
                <header className="min-h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        <button type="button" onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                            <Menu size={18} />
                        </button>
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 truncate">
                        {activeTab === 'overview' && 'Экономика приложения'}
                        {activeTab === 'users' && 'Управление пользователями'}
                        {activeTab === 'groups' && 'Управление группами'}
                        {activeTab === 'tournaments' && 'Управление турнирами'}
                        {activeTab === 'support' && 'Чат с пользователями'}
                        {activeTab === 'shop' && 'Управление товарами'}
                        {activeTab === 'courts' && 'Управление кортами'}
                        {activeTab === 'logs' && 'Системный мониторинг'}
                        {activeTab === 'news' && 'Управление новостями'}
                        {activeTab === 'health' && 'Статус сервера'}
                    </h2>
                    </div>
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200 whitespace-nowrap">
                            <Activity size={14}/> Systems Operational
                        </div>
                    </div>
                </header>

                <div className="p-4 sm:p-6 lg:p-8">
                    {activeTab === 'overview' && (() => {
                        const totalUsers = users.length;
                        const amateurs = users.filter(u => u.role === 'amateur').length;
                        const coaches = users.filter(u => u.role === 'coach').length;
                        const rttPros = users.filter(u => u.role === 'rtt_pro').length;
                        const admins = users.filter(u => u.role === 'admin').length;
                        const pct = (n: number) => totalUsers ? Math.round(n / totalUsers * 100) : 0;
                        return (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard title="Всего пользователей" value={totalUsers.toLocaleString()} change="" icon={<Users className="text-blue-600"/>} color="blue"/>
                                <StatCard title="Любители" value={amateurs.toLocaleString()} change="" icon={<Users className="text-lime-600"/>} color="lime"/>
                                <StatCard title="Тренеры" value={coaches.toLocaleString()} change="" icon={<Users className="text-purple-600"/>} color="purple"/>
                                <StatCard title="Нагрузка сервера" value={`${stats?.serverLoad || 0}%`} change="" icon={<Server className="text-amber-600"/>} color="amber"/>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Распределение по ролям */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-lg mb-2">Распределение по ролям</h3>
                                    <p className="text-sm text-slate-400 mb-6">Реальные данные · {totalUsers} пользователей</p>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Любитель', count: amateurs, color: 'bg-lime-400' },
                                            { label: 'Тренер', count: coaches, color: 'bg-purple-500' },
                                            { label: 'Профи РТТ', count: rttPros, color: 'bg-blue-500' },
                                            { label: 'Администратор', count: admins, color: 'bg-slate-800' },
                                        ].map(({ label, count, color }) => (
                                            <div key={label} className="space-y-1.5">
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span>{label}</span>
                                                    <span className="text-slate-500">{count} чел. · {pct(count)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct(count)}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Сводка */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-lg mb-2">Сводка платформы</h3>
                                    <p className="text-sm text-slate-400 mb-6">Всё бесплатно · Бета-версия</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { label: 'Новые регистрации', value: (stats?.newSignups || 0).toString(), sub: 'за последние 30 дн.' },
                                            { label: 'Активных сегодня', value: ((stats as any)?.activeToday ?? '—').toString(), sub: 'вошли за последние 24ч' },
                                            { label: 'Монетизация', value: '—', sub: 'платных тарифов нет' },
                                            { label: 'Статус', value: '✓ Бета', sub: 'открытый доступ' },
                                        ].map(({ label, value, sub }) => (
                                            <div key={label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
                                                <div className="text-xs font-bold text-slate-700 mb-0.5">{label}</div>
                                                <div className="text-xs text-slate-400">{sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 2FA Security */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                        <Shield size={20} className="text-slate-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Двухфакторная аутентификация</h3>
                                        <p className="text-sm text-slate-500">Защита аккаунта с помощью TOTP (Google Authenticator)</p>
                                    </div>
                                    <div className="sm:ml-auto">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${twoFaEnabled ? 'bg-lime-100 text-lime-700' : 'bg-red-100 text-red-600'}`}>
                                            {twoFaEnabled ? '✓ Включена' : '✗ Отключена'}
                                        </span>
                                    </div>
                                </div>

                                {twoFaStep === 'idle' && (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {!twoFaEnabled ? (
                                            <button onClick={handle2faSetup} disabled={twoFaLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                                                {twoFaLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                                Подключить 2FA
                                            </button>
                                        ) : (
                                            <button onClick={() => { setTwoFaStep('disable'); setTwoFaToken(''); }}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors">
                                                <X size={14} /> Отключить 2FA
                                            </button>
                                        )}
                                    </div>
                                )}

                                {twoFaStep === 'qr' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-600">1. Отсканируйте QR-код в <span className="font-bold">Google Authenticator</span> или совместимом приложении:</p>
                                        <div className="bg-slate-50 rounded-xl p-4 inline-block border border-slate-200">
                                            <img src={twoFaQrCode} alt="2FA QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
                                        </div>
                                        <p className="text-sm text-slate-600">2. Введите код из приложения для подтверждения:</p>
                                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                            <input type="text" inputMode="numeric" maxLength={6}
                                                value={twoFaToken} onChange={(e) => setTwoFaToken(e.target.value.replace(/\D/g, ''))}
                                                placeholder="000000"
                                                className="w-full sm:w-36 border border-slate-300 rounded-xl px-4 py-2 text-center text-xl tracking-widest focus:ring-2 focus:ring-lime-400 outline-none"
                                            />
                                            <button onClick={handle2faEnable} disabled={twoFaLoading || twoFaToken.length !== 6}
                                                className="px-4 py-2 bg-lime-500 text-white rounded-xl text-sm font-bold hover:bg-lime-600 disabled:opacity-50 transition-colors flex items-center gap-2">
                                                {twoFaLoading ? <Loader2 size={14} className="animate-spin" /> : null} Подтвердить
                                            </button>
                                            <button onClick={() => { setTwoFaStep('idle'); setTwoFaToken(''); }}
                                                className="text-sm text-slate-400 hover:text-slate-600">Отмена</button>
                                        </div>
                                    </div>
                                )}

                                {twoFaStep === 'disable' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-600">Введите текущий код из приложения для отключения 2FA:</p>
                                        <div className="flex gap-3 items-center">
                                            <input type="text" inputMode="numeric" maxLength={6}
                                                value={twoFaToken} onChange={(e) => setTwoFaToken(e.target.value.replace(/\D/g, ''))}
                                                placeholder="000000"
                                                className="w-36 border border-slate-300 rounded-xl px-4 py-2 text-center text-xl tracking-widest focus:ring-2 focus:ring-red-400 outline-none"
                                                autoFocus
                                            />
                                            <button onClick={handle2faDisable} disabled={twoFaLoading || twoFaToken.length !== 6}
                                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2">
                                                {twoFaLoading ? <Loader2 size={14} className="animate-spin" /> : null} Отключить
                                            </button>
                                            <button onClick={() => { setTwoFaStep('idle'); setTwoFaToken(''); }}
                                                className="text-sm text-slate-400 hover:text-slate-600">Отмена</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })()}

                    {activeTab === 'tournaments' && (
                        <AdminTournamentsView 
                            tournaments={tournaments.map(t => {
                                const group = groups.find(g => g.id === t.target_group_id);
                                return { ...t, groupName: group ? group.name : t.groupName };
                            })} 
                            onDelete={handleDeleteTournament} 
                            onEdit={handleEditTournament} 
                            onAdd={handleAddTournament}
                            onPublishResult={handlePublishResult}
                        />
                    )}

                    {activeTab === 'support' && (
                        <AdminSupportChat user={user} />
                    )}

                    {activeTab === 'health' && (() => {
                        const h = stats?.health;
                        const dbOk = h?.dbPingMs !== undefined;
                        const dbStatus = dbOk ? (h.dbPingMs < 50 ? 'Отлично' : h.dbPingMs < 200 ? 'Хорошо' : 'Медленно') : 'Нет данных';
                        const dbColor = dbOk ? (h.dbPingMs < 50 ? 'text-lime-600' : h.dbPingMs < 200 ? 'text-amber-500' : 'text-red-500') : 'text-slate-400';
                        const dbBg = dbOk ? (h.dbPingMs < 50 ? 'bg-lime-50 border-lime-200' : h.dbPingMs < 200 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200') : 'bg-slate-50 border-slate-200';
                        const memPct = h ? Math.round(h.memoryUsedMb / (h.heapSizeLimitMb || h.memoryTotalMb) * 100) : 0;
                        return (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Верхняя строка статусов */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Сервер */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${h?.status === 'ok' ? 'bg-lime-100' : 'bg-red-100'}`}>
                                        <Server size={22} className={h?.status === 'ok' ? 'text-lime-600' : 'text-red-500'} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Сервер</div>
                                        <div className={`text-lg font-black ${h?.status === 'ok' ? 'text-lime-600' : 'text-red-500'}`}>
                                            {h?.status === 'ok' ? '✓ Работает' : '✗ Ошибка'}
                                        </div>
                                        <div className="text-xs text-slate-400">Node.js {h?.nodeVersion || '—'}</div>
                                    </div>
                                </div>
                                {/* База данных */}
                                <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 ${dbBg}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dbOk ? 'bg-lime-100' : 'bg-slate-100'}`}>
                                        <Activity size={22} className={dbOk ? 'text-lime-600' : 'text-slate-400'} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">База данных</div>
                                        <div className={`text-lg font-black ${dbColor}`}>{dbStatus}</div>
                                        <div className="text-xs text-slate-400">{dbOk ? `${h.dbPingMs} мс ping` : 'нет данных'}</div>
                                    </div>
                                </div>
                                {/* Онлайн сейчас */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Users size={22} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">Онлайн сейчас</div>
                                        <div className="text-lg font-black text-slate-900">{stats?.onlineNow ?? '—'}</div>
                                        <div className="text-xs text-slate-400">активны {'<'} 2 мин назад</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Системная информация */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="font-bold text-lg">Системная информация</h3>
                                        <button
                                            onClick={() => loadData()}
                                            disabled={healthLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} />
                                            Обновить
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Node.js', value: h?.nodeVersion || '—' },
                                            { label: 'Платформа', value: h?.platform || '—' },
                                            { label: 'Аптайм', value: h?.uptimeFormatted || '—' },
                                            { label: 'Время БД', value: h?.dbTime ? new Date(h.dbTime).toLocaleString('ru') : '—' },
                                            { label: 'Ping БД', value: h?.dbPingMs !== undefined ? `${h.dbPingMs} мс` : '—' },
                                            { label: 'Обновлено', value: healthLastRefresh ? healthLastRefresh.toLocaleTimeString('ru') : '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                                <span className="text-sm text-slate-500">{label}</span>
                                                <span className="text-sm font-bold text-slate-800 font-mono">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Память */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="font-bold text-lg mb-5">Использование памяти</h3>
                                    <div className="space-y-5">
                                        {/* Heap */}
                                        <div>
                                            <div className="flex justify-between text-sm font-medium mb-1.5">
                                                <span>Heap (V8)</span>
                                                <span className="text-slate-500">{h?.memoryUsedMb || 0} / {h?.heapSizeLimitMb || h?.memoryTotalMb || 0} MB · {memPct}%</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-amber-400' : 'bg-lime-400'}`}
                                                    style={{ width: `${memPct}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">от V8 heap limit ({h?.heapSizeLimitMb || '?'} MB)</div>
                                        </div>
                                        {/* RSS */}
                                        <div>
                                            <div className="flex justify-between text-sm font-medium mb-1.5">
                                                <span>RSS (физическая)</span>
                                                <span className="text-slate-500">{h?.rssMemoryMb || 0} MB</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(100, ((h?.rssMemoryMb || 0) / 512) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">от ~512 MB лимита</div>
                                        </div>
                                        {/* Нагрузка CPU */}
                                        <div>
                                            <div className="flex justify-between text-sm font-medium mb-1.5">
                                                <span>Нагрузка CPU</span>
                                                <span className="text-slate-500">{stats?.serverLoad || 0}%</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${(stats?.serverLoad || 0) > 70 ? 'bg-red-500' : (stats?.serverLoad || 0) > 40 ? 'bg-amber-400' : 'bg-lime-400'}`}
                                                    style={{ width: `${stats?.serverLoad || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Эндпоинты */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="font-bold text-lg mb-5">Ключевые эндпоинты</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { method: 'GET', path: '/api/health', label: 'Health-check', ok: true },
                                        { method: 'POST', path: '/api/auth/login', label: 'Авторизация', ok: true },
                                        { method: 'GET', path: '/api/admin/stats', label: 'Статистика', ok: dbOk },
                                        { method: 'GET', path: '/api/admin/users', label: 'Пользователи', ok: true },
                                        { method: 'GET', path: '/api/courts', label: 'Корты', ok: true },
                                        { method: 'GET', path: '/api/rtt/status', label: 'RTT-интеграция', ok: true },
                                    ].map(({ method, path, label, ok }) => (
                                        <div key={path} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className={`text-xs font-black px-2 py-0.5 rounded ${method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{method}</span>
                                            <code className="text-xs text-slate-600 flex-1 truncate">{path}</code>
                                            <span className="text-xs text-slate-400">{label}</span>
                                            <span className={`w-2 h-2 rounded-full ${ok ? 'bg-lime-400' : 'bg-red-400'}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {activeTab === 'news' && (
                        <div className="animate-fade-in-up space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <h3 className="font-bold">Всего статей: {news.length}</h3>
                                    <Button size="sm" onClick={handleAddNews} className="gap-2">
                                        <Plus size={16}/> Добавить новость
                                    </Button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {news.length === 0 && (
                                        <div className="p-8 text-center text-slate-400">
                                            <Newspaper size={40} className="mx-auto mb-2 opacity-40" />
                                            <p>Новостей пока нет</p>
                                        </div>
                                    )}
                                    {news.map(article => (
                                        <div key={article.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
                                            <img
                                                src={article.image}
                                                alt={article.title}
                                                className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${article.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {article.is_published ? 'Опубликовано' : 'Черновик'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{article.category}</span>
                                                </div>
                                                <p className="font-semibold text-slate-900 text-sm truncate">{article.title}</p>
                                                <p className="text-xs text-slate-400">{article.author} · {new Date(article.published_at).toLocaleDateString('ru-RU')} · {article.views ?? 0} просм.</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                                                <button
                                                    onClick={() => handleToggleNewsPublished(article)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                                    title={article.is_published ? 'Скрыть' : 'Опубликовать'}
                                                >
                                                    {article.is_published ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </button>
                                                <button
                                                    onClick={() => handleEditNews(article)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-lime-600 transition-colors"
                                                >
                                                    <Edit size={16}/>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNews(article.id)}
                                                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <h3 className="font-bold">Всего групп: {groups.length}</h3>
                                    <Button size="sm" onClick={handleAddGroup} className="gap-2">
                                        <Plus size={16}/> Добавить группу
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Название</th>
                                            <th className="px-6 py-4">Город</th>
                                            <th className="px-6 py-4 text-center">Участники</th>
                                            <th className="px-6 py-4">Создатель</th>
                                            <th className="px-6 py-4 text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(groups || []).map(g => (
                                            <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold">{g.name}</td>
                                                <td className="px-6 py-4 text-slate-600">{g.location}</td>
                                                <td className="px-6 py-4 text-center font-medium">{g.members_count}</td>
                                                <td className="px-6 py-4 text-slate-600">{g.creator_name || 'N/A'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setEditingGroup(g); setIsGroupModalOpen(true); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16}/></button>
                                                        <button onClick={() => handleDeleteGroup(g.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                    <div className="relative w-full lg:w-64">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                        <input className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-slate-900" placeholder="Поиск пользователя..."/>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                         <Button size="sm" onClick={handleAddUser} className="gap-2"><Plus size={16}/> Добавить</Button>
                                         <Button size="sm" variant="outline">Экспорт CSV</Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Пользователь</th>
                                            <th className="px-6 py-4">Роль</th>
                                            <th className="px-6 py-4">Город</th>
                                            <th className="px-6 py-4">Рейтинг</th>
                                            <th className="px-6 py-4 text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(users || []).map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{u.name[0]}</div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{u.name}</div>
                                                        <div className="text-xs text-slate-400">{u.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                                                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                        u.role === 'coach' ? 'bg-purple-100 text-purple-700' :
                                                        u.role === 'rtt_pro' ? 'bg-lime-100 text-lime-800' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{u.city}</td>
                                                <td className="px-6 py-4 font-mono font-medium">
                                                    {u.role === 'rtt_pro' ? (
                                                        <div className="flex flex-col">
                                                            <span>Rank: #{u.rttRank}</span>
                                                            <span className="text-xs text-slate-400">Pts: {u.rating}</span>
                                                        </div>
                                                    ) : (
                                                        u.level || '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); setRttFetchResult(null); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16}/></button>
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shop' && (
                        <div className="animate-fade-in-up">
                            <div className="flex justify-stretch sm:justify-end mb-6">
                                <Button className="gap-2" onClick={() => {
                                    setEditingProduct({ title: '', price: 0, category: 'rackets', image: '', rating: 5, reviews: 0 });
                                    setIsProductModalOpen(true);
                                }}>
                                    <Plus size={18}/> Добавить товар
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {(products || []).map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 group hover:border-lime-400 transition-colors">
                                        <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                            <img src={p.image} className="w-full h-full object-cover" alt=""/>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{p.title}</h3>
                                                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded mt-1 inline-block">{p.category}</span>
                                                </div>
                                                <div className="text-xl font-bold">{p.price.toLocaleString()} ₽</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                                            <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'courts' && (
                         <div className="animate-fade-in-up">
                             <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3 mb-6">
                                 <div className="relative w-full xl:w-64">
                                     <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                     <input 
                                         className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-lime-400/50 transition-all placeholder:text-slate-400 text-slate-900 font-medium" 
                                         placeholder="Поиск по названию..."
                                         value={courtSearchName}
                                         onChange={e => setCourtSearchName(e.target.value)}
                                     />
                                 </div>
                                 <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                                     <div className="relative">
                                         <select
                                             className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium pr-8 appearance-none"
                                             value={courtSearchCity}
                                             onChange={e => setCourtSearchCity(e.target.value)}
                                         >
                                             <option value="Все города">Все города</option>
                                             {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                         </select>
                                         <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16}/>
                                     </div>
                                     <Button className="gap-2" onClick={() => {
                                         setEditingCourt({ name: '', address: '', surface: [], pricePerHour: 2000, rating: 5.0, image: '' });
                                         setIsCourtModalOpen(true);
                                     }}>
                                         <Plus size={18}/> Добавить корт
                                     </Button>
                                 </div>
                             </div>
                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                 <div className="overflow-x-auto">
                                 <table className="w-full min-w-[920px] text-sm text-left">
                                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                         <tr>
                                             <th className="px-6 py-4">Название</th>
                                             <th className="px-6 py-4">Адрес</th>
                                             <th className="px-6 py-4">Покрытие</th>
                                             <th className="px-6 py-4">Цена</th>
                                             <th className="px-6 py-4">Сайт</th>
                                             <th className="px-6 py-4 text-right">Действия</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                         {(courts || []).map(c => (
                                             <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                 <td className="px-6 py-4 flex items-center gap-3">
                                                     <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                                         <img src={c.image} className="w-full h-full object-cover" alt=""/>
                                                     </div>
                                                     <div className="font-bold text-slate-900">{c.name}</div>
                                                 </td>
                                                 <td className="px-6 py-4 text-slate-600">{c.address}</td>
                                                 <td className="px-6 py-4">
                                                     {(() => {
                                                         const primarySurface = Array.isArray(c.surface) ? c.surface[0] : c.surface;
                                                         return (
                                                     <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                                                         primarySurface === 'clay' ? 'bg-orange-100 text-orange-800' :
                                                         primarySurface === 'hard' ? 'bg-blue-100 text-blue-800' :
                                                         primarySurface === 'grass' ? 'bg-green-100 text-green-800' :
                                                         'bg-indigo-100 text-indigo-800'
                                                     }`}>
                                                         {Array.isArray(c.surface) ? c.surface.join(', ') : c.surface}
                                                     </span>
                                                         );
                                                     })()}
                                                 </td>
                                                 <td className="px-6 py-4 font-bold">{c.pricePerHour} ₽/ч</td>
                                                 <td className="px-6 py-4">
                                                     {c.website ? (
                                                         <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                                                             <ExternalLink size={14}/>
                                                             Сайт
                                                         </a>
                                                     ) : (
                                                         <span className="text-slate-400 text-sm">—</span>
                                                     )}
                                                 </td>
                                                 <td className="px-6 py-4 text-right">
                                                     <div className="flex justify-end gap-2">
                                                         <button onClick={() => { setEditingCourt({ ...c, surface: Array.isArray(c.surface) ? c.surface : [c.surface] }); setIsCourtModalOpen(true); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16}/></button>
                                                         <button onClick={() => handleDeleteCourt(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                                     </div>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                                 </div>
                             </div>
                         </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
                            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                                        <Terminal size={16}/> Журнал действий
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Понятная история изменений: кто, что и когда сделал.</p>
                                </div>
                                <div className="text-sm text-slate-400">Найдено {filteredLogs.length} из {(logs || []).length}</div>
                            </div>
                            <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
                                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr),180px,220px,180px,auto] gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={logQuery}
                                            onChange={(e) => setLogQuery(e.target.value)}
                                            placeholder="Поиск по действию, имени, детали или времени"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-lime-400"
                                        />
                                    </div>
                                    <select
                                        value={logLevelFilter}
                                        onChange={(e) => setLogLevelFilter(e.target.value as 'all' | SystemLog['level'])}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-lime-400"
                                    >
                                        <option value="all">Все уровни</option>
                                        <option value="info">Инфо</option>
                                        <option value="warning">Внимание</option>
                                        <option value="error">Ошибка</option>
                                        <option value="success">Успешно</option>
                                    </select>
                                    <select
                                        value={logActorFilter}
                                        onChange={(e) => setLogActorFilter(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-lime-400"
                                    >
                                        <option value="all">Все исполнители</option>
                                        {logActorOptions.map((actorName) => (
                                            <option key={actorName} value={actorName}>{actorName}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={logPeriodFilter}
                                        onChange={(e) => setLogPeriodFilter(e.target.value as 'all' | 'today' | '7d' | '30d')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-lime-400"
                                    >
                                        <option value="all">Весь период</option>
                                        <option value="today">Сегодня</option>
                                        <option value="7d">Последние 7 дней</option>
                                        <option value="30d">Последние 30 дней</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setLogQuery('');
                                            setLogLevelFilter('all');
                                            setLogModuleFilter('all');
                                            setLogActorFilter('all');
                                            setLogActionFilter('all');
                                            setLogPeriodFilter('all');
                                        }}
                                        className="w-full lg:w-auto"
                                    >
                                        Сбросить
                                    </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {[
                                        { key: 'all', label: 'Все действия' },
                                        { key: 'created', label: `Создал (${logActionCounts.created})` },
                                        { key: 'updated', label: `Обновил (${logActionCounts.updated})` },
                                        { key: 'deleted', label: `Удалил (${logActionCounts.deleted})` }
                                    ].map((chip) => {
                                        const active = logActionFilter === chip.key;
                                        return (
                                            <button
                                                key={chip.key}
                                                type="button"
                                                onClick={() => setLogActionFilter(chip.key as 'all' | 'created' | 'updated' | 'deleted')}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                                    active
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                }`}
                                            >
                                                {chip.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {[
                                        { key: 'all', label: 'Все модули' },
                                        ...logModuleOptions.map((moduleName) => ({
                                            key: moduleName,
                                            label: `${moduleName} (${logModuleCounts[moduleName] || 0})`
                                        }))
                                    ].map((chip) => {
                                        const active = logModuleFilter === chip.key;
                                        return (
                                            <button
                                                key={chip.key}
                                                type="button"
                                                onClick={() => setLogModuleFilter(chip.key)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                                    active
                                                        ? 'bg-lime-500 text-white border-lime-500'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                }`}
                                            >
                                                {chip.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto bg-slate-50">
                                {(logs || []).length === 0 && (
                                    <div className="text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center">
                                        Логи пока не найдены.
                                    </div>
                                )}
                                {(logs || []).length > 0 && filteredLogs.length === 0 && (
                                    <div className="text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center">
                                        По текущим фильтрам ничего не найдено.
                                    </div>
                                )}
                                {filteredLogs.map((log) => (
                                    <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">
                                            <div className="text-xs text-slate-500 shrink-0 min-w-[150px]">{log.timestamp}</div>
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <span className={`font-bold text-xs rounded-full px-2.5 py-1 ${
                                                    log.level === 'info' ? 'bg-blue-100 text-blue-700' :
                                                    log.level === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                    log.level === 'error' ? 'bg-red-100 text-red-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {log.levelLabel || log.level}
                                                </span>
                                                <span className="font-medium text-xs rounded-full px-2.5 py-1 bg-slate-100 text-slate-600">
                                                    {log.moduleLabel || log.module}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-slate-900 break-words">{log.message}</div>
                                                {log.actor && <div className="text-sm text-slate-500 mt-1">Кто: {log.actor}</div>}
                                                {log.details && <div className="text-sm text-slate-500 mt-1 break-words">{log.details}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Modal isOpen={isTournamentModalOpen} onClose={() => setIsTournamentModalOpen(false)} title="Редактировать турнир" maxWidthClass="max-w-5xl">
                {editingTournament && (
                    <form onSubmit={handleSaveTournament} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                            <button type="button" onClick={() => setTournamentModalMode('manual')} className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${tournamentModalMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                Ручное заполнение
                            </button>
                            <button type="button" onClick={() => { setTournamentModalMode('rtt'); if (!rttTournamentHasSearched) loadRttTournaments(); }} className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${tournamentModalMode === 'rtt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                Импорт из РТТ
                            </button>
                        </div>

                        {tournamentModalMode === 'rtt' && (
                            <div className="space-y-5 border border-slate-200 rounded-2xl p-5 md:p-6 bg-slate-50">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="max-w-2xl">
                                        <h4 className="font-bold text-slate-900">Поиск турнира РТТ</h4>
                                        <p className="text-sm text-slate-500">Найдите турнир в базе РТТ и подтяните его данные в форму создания.</p>
                                    </div>
                                    <button type="button" onClick={() => loadRttTournaments()} className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors" title="Обновить список">
                                        <RefreshCw size={16} className={rttTournamentLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Возраст</label>
                                        <select value={rttTournamentFilters.age} onChange={(e) => handleRttTournamentFilterChange('age', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white outline-none min-h-[48px]">
                                            <option value="">Все возраста</option>
                                            <option value="131">9-10 лет</option>
                                            <option value="132">до 13 лет</option>
                                            <option value="133">до 15 лет</option>
                                            <option value="134">до 17 лет</option>
                                            <option value="135">до 19 лет</option>
                                            <option value="136">19+ лет</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Пол</label>
                                        <select value={rttTournamentFilters.gender} onChange={(e) => handleRttTournamentFilterChange('gender', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white outline-none min-h-[48px]">
                                            <option value="">Все</option>
                                            <option value="1">М</option>
                                            <option value="2">Ж</option>
                                            <option value="3">Микст</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Округ</label>
                                        <select value={rttTournamentFilters.district} onChange={(e) => handleRttTournamentFilterChange('district', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white outline-none min-h-[48px]">
                                            <option value="">Не выбрано</option>
                                            {rttTournamentOptions.districts.map((d: any) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Субъект</label>
                                        <select value={rttTournamentFilters.subject} onChange={(e) => handleRttTournamentFilterChange('subject', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white outline-none min-h-[48px]">
                                            <option value="">Не выбрано</option>
                                            {rttTournamentOptions.subjects.filter((s: any) => !rttTournamentFilters.district || s.parent === rttTournamentFilters.district).map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Город</label>
                                        <select value={rttTournamentFilters.city} onChange={(e) => handleRttTournamentFilterChange('city', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white outline-none min-h-[48px]">
                                            <option value="">Не выбрано</option>
                                            {rttTournamentOptions.cities.filter((c: any) => !rttTournamentFilters.subject || c.parent === rttTournamentFilters.subject).map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-400 max-w-2xl">Используется тот же источник, что и во вкладке статистики РТТ.</p>
                                    {rttTournamentHasSearched && (
                                        <button type="button" onClick={resetRttTournamentFilters} className="text-sm text-slate-500 hover:text-red-500 transition-colors text-left sm:text-right">
                                            Сбросить фильтры
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={rttTournamentQuery}
                                        onChange={(e) => setRttTournamentQuery(e.target.value)}
                                        placeholder="Введите название, город, категорию или дату турнира"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>

                                {rttTournamentLoading ? (
                                    <div className="flex items-center justify-center py-10 text-slate-500 gap-3">
                                        <Loader2 size={20} className="animate-spin text-orange-500" />
                                        Загружаем турниры РТТ...
                                    </div>
                                ) : rttTournamentError ? (
                                    <div className="py-6 text-center text-sm text-red-500">{rttTournamentError}</div>
                                ) : !rttTournamentHasSearched ? (
                                    <div className="py-8 text-center text-sm text-slate-400">Выберите фильтры или нажмите обновить, чтобы загрузить турниры РТТ.</div>
                                ) : filteredRttTournamentList.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-400">Подходящие турниры не найдены.</div>
                                ) : (
                                    <div className="max-h-80 overflow-auto divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                                        {filteredRttTournamentList.map((tournament: any, index: number) => (
                                            <div key={tournament.link || `${tournament.name}-${index}`} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-orange-50 transition-colors">
                                                <div>
                                                    <div className="font-bold text-slate-900">{tournament.name}</div>
                                                    <div className="text-sm text-slate-500 mt-1">{[tournament.city, tournament.ageGroup, tournament.startDate].filter(Boolean).join(' • ')}</div>
                                                    <div className="text-xs text-slate-400 mt-1">{[tournament.type, tournament.category, tournament.status].filter(Boolean).join(' • ')}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {tournament.link && (
                                                        <a href={tournament.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors" title="Открыть турнир в РТТ">
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                    <Button type="button" onClick={() => importRttTournamentToForm(tournament)} disabled={rttImportLoadingLink === (tournament.link || tournament.name)} className="px-4 py-2 text-sm">
                                                        {rttImportLoadingLink === (tournament.link || tournament.name) ? <Loader2 size={16} className="animate-spin" /> : 'Импортировать'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tournamentModalMode === 'manual' && (
                            <>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Название</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.name || ''} onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Категория</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.category || ''} onChange={e => setEditingTournament({...editingTournament, category: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Разряд</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.tournamentType || 'Одиночный'} onChange={e => setEditingTournament({...editingTournament, tournamentType: e.target.value as any})}>
                                    <option>Одиночный</option>
                                    <option>Парный</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Пол</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.gender || 'Мужской'} onChange={e => setEditingTournament({...editingTournament, gender: e.target.value as any})}>
                                    <option>Мужской</option>
                                    <option>Женский</option>
                                    <option>Смешанный</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Возрастная группа</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.ageGroup || ''} onChange={e => setEditingTournament({...editingTournament, ageGroup: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Система</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.system || 'Олимпийская'} onChange={e => setEditingTournament({...editingTournament, system: e.target.value as any})}>
                                    <option>Олимпийская</option>
                                    <option>Круговая</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Формат матчей</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.matchFormat || ''} onChange={e => setEditingTournament({...editingTournament, matchFormat: e.target.value})} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Начало</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.startDate ? editingTournament.startDate.split('T')[0] : ''} onChange={e => setEditingTournament({...editingTournament, startDate: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Окончание</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.endDate ? editingTournament.endDate.split('T')[0] : ''} onChange={e => setEditingTournament({...editingTournament, endDate: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Кол-во участников</label>
                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.participantsCount || 16} onChange={e => setEditingTournament({...editingTournament, participantsCount: Number(e.target.value)})} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Этап RTT</label>
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
                                placeholder="Например: Жеребьевка на основной этап турнира"
                                value={editingTournament.stageStatus || ''}
                                onChange={e => setEditingTournament({ ...editingTournament, stageStatus: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Автообновляется для импортированных RTT-турниров и используется для уведомлений в группе.</p>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">{getTournamentMetaFieldConfig(editingTournament.prizePool).label}</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder={getTournamentMetaFieldConfig(editingTournament.prizePool).placeholder} value={editingTournament.prizePool || ''} onChange={e => setEditingTournament({...editingTournament, prizePool: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Группа</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
                                value={editingTournament.target_group_id || ''}
                                onChange={e => setEditingTournament({ ...editingTournament, target_group_id: e.target.value, groupName: groups.find(g => g.id === e.target.value)?.name || '' })}
                            >
                                <option value="">Без группы</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Статус</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.status} onChange={e => setEditingTournament({...editingTournament, status: e.target.value as any})}>
                                <option value="draft">Черновик (скрыт от игроков)</option>
                                <option value="open">Открыт (регистрация)</option>
                                <option value="live">В игре (идут матчи)</option>
                                <option value="finished">Завершен</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">⚠️ «Черновик» — турнир не виден игрокам. Для видимости выберите «Открыт» или «В игре».</p>
                        </div>
                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                            </>
                        )}
                    </form>
                )}
            </Modal>

            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={editingGroup?.id ? 'Редактировать группу' : 'Новая группа'}>
                {editingGroup && (
                    <form onSubmit={handleSaveGroup} className="space-y-4">
                        {/* Avatar upload */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Аватар группы</label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                                    {editingGroup.avatar
                                        ? <img src={editingGroup.avatar} className="w-full h-full object-cover" alt="avatar" />
                                        : <span className="text-2xl">🎾</span>
                                    }
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                        <span>📁 Выбрать фото</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (file.size > 500 * 1024) { toast('Файл слишком большой. Максимум 500 КБ', 'error'); return; }
                                                const reader = new FileReader();
                                                reader.onload = () => setEditingGroup({...editingGroup, avatar: reader.result as string});
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </label>
                                    {editingGroup.avatar && (
                                        <button type="button" onClick={() => setEditingGroup({...editingGroup, avatar: ''})} className="text-xs text-red-400 hover:text-red-600 font-bold">✕ Удалить фото</button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Название</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingGroup.name || ''} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Город</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingGroup.location || ''} onChange={e => setEditingGroup({...editingGroup, location: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Описание</label>
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingGroup.description || ''} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Контакты</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingGroup.contact || ''} onChange={e => setEditingGroup({...editingGroup, contact: e.target.value})} />
                        </div>
                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                    </form>
                )}
            </Modal>

            {/* Product Modal */}
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct?.id ? 'Редактировать товар' : 'Новый товар'}>
                {editingProduct && (
                    <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Название</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingProduct.title || ''} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Цена (₽)</label>
                                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Категория</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}>
                                    <option value="rackets">Ракетки</option>
                                    <option value="shoes">Кроссовки</option>
                                    <option value="apparel">Одежда</option>
                                    <option value="accessories">Аксессуары</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Ссылка на фото</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                                {editingProduct.image && <img src={editingProduct.image} className="w-10 h-10 rounded-lg object-cover border border-slate-200" alt=""/>}
                            </div>
                        </div>
                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                    </form>
                )}
            </Modal>

            {/* Court Modal */}
            <Modal isOpen={isCourtModalOpen} onClose={() => setIsCourtModalOpen(false)} title={editingCourt?.id ? 'Редактировать корт' : 'Новый корт'}>
                {editingCourt && (
                    <form onSubmit={handleSaveCourt} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Название клуба</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingCourt.name || ''} onChange={e => setEditingCourt({...editingCourt, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Адрес</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingCourt.address || ''} onChange={e => setEditingCourt({...editingCourt, address: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Сайт</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" placeholder="https://example.com" value={editingCourt.website || ''} onChange={e => setEditingCourt({...editingCourt, website: e.target.value})} />
                        </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Цена (₽/час)</label>
                                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingCourt.pricePerHour || ''} onChange={e => setEditingCourt({...editingCourt, pricePerHour: Number(e.target.value)})} />
                            </div>
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Рейтинг</label>
                                <input required type="number" step="0.1" max="5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingCourt.rating || ''} onChange={e => setEditingCourt({...editingCourt, rating: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Покрытие</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {['hard', 'clay', 'grass', 'carpet'].map(s => (
                                    <label key={s} className="flex items-center gap-2 text-sm font-medium">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                                            checked={editingCourt.surface.includes(s)}
                                            onChange={() => handleSurfaceChange(s)}
                                        />
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Фото</label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                    {editingCourt.image ? (
                                        <img src={editingCourt.image} className="w-full h-full object-cover" alt="preview"/>
                                    ) : (
                                        <ImageIcon size={32} className="text-slate-400"/>
                                    )}
                                </div>
                                <input 
                                    type="file"
                                    accept="image/*"
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            console.log('📸 File selected:', file.name, file.size, 'bytes');
                                            
                                            // Compress image before upload
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const img = new Image();
                                                img.onload = () => {
                                                    const canvas = document.createElement('canvas');
                                                    const MAX_WIDTH = 1200;
                                                    const MAX_HEIGHT = 1200;
                                                    let width = img.width;
                                                    let height = img.height;

                                                    if (width > height) {
                                                        if (width > MAX_WIDTH) {
                                                            height *= MAX_WIDTH / width;
                                                            width = MAX_WIDTH;
                                                        }
                                                    } else {
                                                        if (height > MAX_HEIGHT) {
                                                            width *= MAX_HEIGHT / height;
                                                            height = MAX_HEIGHT;
                                                        }
                                                    }

                                                    canvas.width = width;
                                                    canvas.height = height;
                                                    const ctx = canvas.getContext('2d');
                                                    ctx?.drawImage(img, 0, 0, width, height);
                                                    
                                                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                                    console.log('✅ Image compressed, length:', compressedDataUrl.length);
                                                    setEditingCourt({...editingCourt, image: compressedDataUrl});
                                                };
                                                img.src = event.target?.result as string;
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </div>
                             <p className="text-[11px] text-slate-400 mt-1">Оставьте пустым для авто-подбора случайного фото.</p>
                        </div>
                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                    </form>
                )}
            </Modal>

            {/* User Modal */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser?.id ? "Редактировать пользователя" : "Создать пользователя"}>
                {editingUser && (
                    <form onSubmit={handleSaveUser} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Имя</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <input 
                                disabled={!!editingUser.id} 
                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none ${!!editingUser.id ? 'text-slate-500 bg-slate-100' : ''}`}
                                value={editingUser.email} 
                                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                            />
                        </div>
                        {!editingUser.id && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Пароль</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
                                    value={editingUser.password}
                                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                />
                            </div>
                        )}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Роль</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                                        <option value="amateur">Любитель</option>
                                        <option value="rtt_pro">Игрок РТТ</option>
                                        <option value="coach">Тренер</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                            </div>
                            <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Город</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingUser.city} onChange={e => setEditingUser({...editingUser, city: e.target.value})} />
                            </div>
                        </div>

                        {/* Dynamic Fields based on Role */}
                        {editingUser.role === 'amateur' && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Уровень (NTRP)</label>
                                    <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none" value={editingUser.level} onChange={e => setEditingUser({...editingUser, level: e.target.value})}>
                                        <option value="NTRP 2.0">NTRP 2.0 (Новичок)</option>
                                        <option value="NTRP 3.0">NTRP 3.0 (Начальный)</option>
                                        <option value="NTRP 3.5">NTRP 3.5 (Средний)</option>
                                        <option value="NTRP 4.0">NTRP 4.0 (Продвинутый)</option>
                                        <option value="NTRP 4.5">NTRP 4.5 (Полупрофи)</option>
                                        <option value="NTRP 5.0">NTRP 5.0+ (Профи)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Очки рейтинга (Внутренний)</label>
                                    <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none" value={editingUser.rating} onChange={e => setEditingUser({...editingUser, rating: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}

                        {editingUser.role === 'rtt_pro' && (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                                <div className="text-xs font-bold text-amber-700 uppercase mb-2">Настройки РТТ</div>

                                {/* РНИ + кнопка */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Номер РНИ (РТТ)</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            placeholder="Например: 12345"
                                            className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 font-mono"
                                            value={editingUser.rni || ''}
                                            onChange={e => { setEditingUser({...editingUser, rni: e.target.value}); setRttFetchResult(null); }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleFetchRtt}
                                            disabled={rttFetching || !editingUser.rni}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                        >
                                            {rttFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                            Подтянуть
                                        </button>
                                    </div>
                                    {rttFetchResult && (
                                        <p className={`text-xs font-medium mt-1 ${rttFetchResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {rttFetchResult.msg}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Возрастная категория</label>
                                    <select className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none" value={editingUser.rttCategory || 'Взрослые'} onChange={e => setEditingUser({...editingUser, rttCategory: e.target.value})}>
                                        <option value="9-10 лет">9-10 лет</option>
                                        <option value="до 13 лет">до 13 лет</option>
                                        <option value="до 15 лет">до 15 лет</option>
                                        <option value="до 17 лет">до 17 лет</option>
                                        <option value="до 19 лет">до 19 лет</option>
                                        <option value="Взрослые">Взрослые</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Классиф. Очки (РТТ)</label>
                                        <input type="number" className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none" value={editingUser.rating} onChange={e => setEditingUser({...editingUser, rating: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Позиция (Rank)</label>
                                        <input type="number" className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none" value={editingUser.rttRank} onChange={e => setEditingUser({...editingUser, rttRank: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                    </form>
                )}
            </Modal>

            {/* News Modal */}
            <Modal isOpen={isNewsModalOpen} onClose={() => { setIsNewsModalOpen(false); setEditingNews(null); }} title={editingNews?.id ? 'Редактировать новость' : 'Добавить новость'}>
                {editingNews && (
                    <form onSubmit={handleSaveNews} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Заголовок *</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400"
                                value={editingNews.title || ''}
                                onChange={e => setEditingNews({...editingNews, title: e.target.value})}
                                placeholder="Заголовок новости"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Краткое описание *</label>
                            <textarea
                                required
                                rows={2}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400 resize-none"
                                value={editingNews.summary || ''}
                                onChange={e => setEditingNews({...editingNews, summary: e.target.value})}
                                placeholder="Краткое описание (анонс)"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Полный текст *</label>
                            <textarea
                                required
                                rows={6}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400 resize-none"
                                value={editingNews.content || ''}
                                onChange={e => setEditingNews({...editingNews, content: e.target.value})}
                                placeholder="Полный текст статьи"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">URL изображения</label>
                            <input
                                type="url"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400"
                                value={editingNews.image || ''}
                                onChange={e => setEditingNews({...editingNews, image: e.target.value})}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Категория</label>
                                <select
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400"
                                    value={editingNews.category || 'general'}
                                    onChange={e => setEditingNews({...editingNews, category: e.target.value as NewsArticle['category']})}
                                >
                                    <option value="tournament">Турниры</option>
                                    <option value="player">Игроки</option>
                                    <option value="training">Тренировки</option>
                                    <option value="equipment">Инвентарь</option>
                                    <option value="general">Общее</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Автор</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400"
                                    value={editingNews.author || ''}
                                    onChange={e => setEditingNews({...editingNews, author: e.target.value})}
                                    placeholder="Имя автора"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Просмотры</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-lime-400"
                                value={editingNews.views ?? 0}
                                onChange={e => setEditingNews({...editingNews, views: parseInt(e.target.value) || 0})}
                                placeholder="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="news-published"
                                checked={editingNews.is_published ?? true}
                                onChange={e => setEditingNews({...editingNews, is_published: e.target.checked})}
                                className="w-4 h-4 rounded accent-lime-500"
                            />
                            <label htmlFor="news-published" className="text-sm font-medium text-slate-700">Опубликовать сразу</label>
                        </div>
                        <Button type="submit" className="w-full mt-2">
                            <Save size={16} className="mr-2" />
                            {editingNews.id ? 'Сохранить изменения' : 'Создать новость'}
                        </Button>
                    </form>
                )}
            </Modal>

            {/* Confirmation Modal */}
            <Modal isOpen={showConfirmDeleteModal} onClose={() => setShowConfirmDeleteModal(false)} title="Подтверждение удаления">
                <div className="space-y-4">
                    <p>Вы уверены, что хотите удалить этот элемент?</p>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                            setShowConfirmDeleteModal(false);
                            setItemToDeleteId(null);
                            setDeleteActionType(null);
                        }}>
                            Отмена
                        </Button>
                        <Button onClick={handleConfirmDelete}>
                            Подтвердить
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Publish Tournament Result Modal */}
            <Modal isOpen={isPublishResultModalOpen} onClose={() => setIsPublishResultModalOpen(false)} title="📢 Опубликовать результат">
                {publishResultTournament && (
                    <form onSubmit={handleSubmitPublishResult} className="space-y-4">
                        {/* Tournament badge */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                            <Trophy size={18} className="text-amber-500 shrink-0"/>
                            <div>
                                <p className="text-xs text-amber-700 font-bold uppercase">Турнир</p>
                                <p className="font-black text-slate-900 text-sm">{publishResultTournament.name}</p>
                                {!(publishResultTournament.target_group_id || (publishResultTournament as any).target_group_id) && (
                                    <p className="text-xs text-red-500 mt-0.5">⚠️ Турнир без группы — пост увидят все</p>
                                )}
                            </div>
                        </div>

                        {/* Post type */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Тип публикации</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button type="button"
                                    onClick={() => setPublishResultForm(f => ({...f, type: 'match_result_update'}))}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${publishResultForm.type === 'match_result_update' ? 'border-lime-400 bg-lime-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <p className="font-bold text-sm">⚡ Результат матча</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Счёт между двумя игроками</p>
                                </button>
                                <button type="button"
                                    onClick={() => setPublishResultForm(f => ({...f, type: 'tournament_result'}))}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${publishResultForm.type === 'tournament_result' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <p className="font-bold text-sm">🏆 Турнир завершён</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Финальный победитель</p>
                                </button>
                            </div>
                        </div>

                        {publishResultForm.type === 'match_result_update' && (
                            <>
                                {/* Раунд */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Раунд</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(['1/16', '1/8', '1/4', 'Полуфинал', 'Финал'] as const).map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setPublishResultForm(f => ({...f, round: f.round === r ? '' : r}))}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                                                    publishResultForm.round === r
                                                        ? r === 'Финал'
                                                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                            : 'border-lime-400 bg-lime-50 text-lime-700'
                                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                {r === 'Финал' ? '🏆 ' : r === 'Полуфинал' ? '⚡ ' : ''}{r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Игроки */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Игрок 1</label>
                                        <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm" placeholder="Имя игрока" value={publishResultForm.player1} onChange={e => setPublishResultForm(f => ({...f, player1: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Игрок 2</label>
                                        <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm" placeholder="Имя игрока" value={publishResultForm.player2} onChange={e => setPublishResultForm(f => ({...f, player2: e.target.value}))} />
                                    </div>
                                </div>

                                {/* Счёт */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Счёт</label>
                                    <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm" placeholder="6:3 6:4" value={publishResultForm.score} onChange={e => setPublishResultForm(f => ({...f, score: e.target.value}))} />
                                </div>

                                {/* Победитель — кликабельный выбор */}
                                {publishResultForm.player1 && publishResultForm.player2 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Победитель</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {[publishResultForm.player1, publishResultForm.player2].map(name => (
                                                <button
                                                    key={name}
                                                    type="button"
                                                    onClick={() => setPublishResultForm(f => ({...f, winnerName: name}))}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                                                        publishResultForm.winnerName === name
                                                            ? 'border-lime-400 bg-lime-50 text-lime-800'
                                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                        publishResultForm.winnerName === name ? 'border-lime-500 bg-lime-400' : 'border-slate-300'
                                                    }`}>
                                                        {publishResultForm.winnerName === name && (
                                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </span>
                                                    <span className="truncate">{name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {publishResultForm.type === 'tournament_result' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Победитель турнира</label>
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm" placeholder="Имя победителя" value={publishResultForm.winnerName} onChange={e => setPublishResultForm(f => ({...f, winnerName: e.target.value}))} />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Комментарий (необязательно)</label>
                            <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm resize-none" placeholder="Отличный матч! Борьба до последнего..." value={publishResultForm.note} onChange={e => setPublishResultForm(f => ({...f, note: e.target.value}))} />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <Button variant="outline" type="button" className="flex-1" onClick={() => setIsPublishResultModalOpen(false)}>Отмена</Button>
                            <Button type="submit" className="flex-1 gap-2" disabled={isPublishing}>
                                {isPublishing ? <Loader2 size={16} className="animate-spin"/> : <Megaphone size={16}/>}
                                {isPublishing ? 'Публикую...' : 'Опубликовать'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up pointer-events-auto transition-all ${
                        t.type === 'success'
                            ? 'bg-slate-900 text-white'
                            : 'bg-red-500 text-white'
                    }`}>
                        <span className="text-base">{t.type === 'success' ? '✅' : '❌'}</span>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SidebarLink = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg transition-all text-left ${
            active ? 'bg-lime-400 text-slate-900 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
    >
        <span className="shrink-0">
        {icon}
        </span>
        <span className="text-sm leading-tight">{label}</span>
    </button>
);

const StatCard = ({ title, value, change, icon, color }: { title: string, value: string, change?: string, icon: React.ReactNode, color: 'lime' | 'blue' | 'purple' | 'amber' }) => {
    // Tailwind needs full class names to parse them. We cannot use dynamic string interpolation like `bg-${color}-50`.
    const bgColors = {
        lime: 'bg-lime-50',
        blue: 'bg-blue-50',
        purple: 'bg-purple-50',
        amber: 'bg-amber-50'
    };
    const accentColors = {
        lime: 'bg-lime-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500'
    };

    return (
        <div className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 ${accentColors[color]}`}></div>
            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bgColors[color]}`}>
                    {icon}
                </div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
                <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    {change && <div className={`text-xs font-bold mb-1 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</div>}
                </div>
            </div>
        </div>
    );
};

// Copied Modal from Dashboard to avoid export dependency issues
const Modal = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-lg' }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; maxWidthClass?: string }) => {
  if (!isOpen) return null;
  return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                        <div className={`relative bg-white rounded-2xl sm:rounded-3xl w-full ${maxWidthClass} max-h-[92vh] overflow-y-auto shadow-2xl animate-fade-in-up`}>
                <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
                <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
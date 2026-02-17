import React, { useState, useEffect } from 'react';
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
    MessageSquare
} from 'lucide-react';
import AdminTournamentsView from './dashboard/AdminTournamentsView';
import AdminSupportChat from './dashboard/AdminSupportChat';
import Button from './Button';
import { User, Product, SystemLog, Court, Group, Tournament } from '../types';
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
    'Калининград'
];

type AdminGroup = Group & { creator_name: string; members_count: number };

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'shop' | 'logs' | 'courts' | 'groups' | 'tournaments' | 'support'>('support');
    
    // Data State
    const [stats, setStats] = useState({ revenue: 0, activeUsers: 0, newSignups: 0, serverLoad: 0 });
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [groups, setGroups] = useState<AdminGroup[]>([]);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    
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
    
    // User Edit State
    const [editingUser, setEditingUser] = useState<(Partial<User> & { password?: string }) | null>(null);

    // Search Filters
    const [courtSearchName, setCourtSearchName] = useState<string>('');
    const [courtSearchCity, setCourtSearchCity] = useState<string>('Все города');

    // Confirmation Modal State
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [deleteActionType, setDeleteActionType] = useState<'court' | 'user' | 'product' | 'group' | 'tournament' | null>(null);

    // Initial Data Load
    useEffect(() => {
        loadData();
    }, [activeTab, courtSearchName, courtSearchCity]); // Refresh when tab changes or search filters change

    const loadData = async () => {
        if (activeTab === 'overview') {
            const s = await api.admin.getStats();
            setStats(s);
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
            
            await loadData(); // Reload data after deletion
        } catch (e: any) {
            alert('Ошибка удаления: ' + e.message);
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
            await api.admin.saveProduct(editingProduct);
            await loadData(); // Reload to get IDs
        }
        setIsProductModalOpen(false);
        setEditingProduct(null);
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
                await api.admin.saveCourt(courtData);
                await loadData();
                setIsCourtModalOpen(false);
                setEditingCourt(null);
            } catch (e: any) {
                alert('Ошибка сохранения: ' + e.message);
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
             if (editingUser.id) await api.admin.updateUser(editingUser.id, editingUser);
             else await api.admin.createUser(editingUser);
             await loadData();
        }
        setIsUserModalOpen(false);
        setEditingUser(null);
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
            alert('Ошибка сохранения: ' + e.message);
        }
    };

    const handleDeleteGroup = (id: string) => {
        setDeleteActionType('group');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };

    // Tournament Handlers
    const handleAddTournament = () => {
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
        setEditingTournament(tournament);
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
            alert('Ошибка сохранения: ' + e.message);
        }
    };

    const handleDeleteTournament = (id: string) => {
        setDeleteActionType('tournament');
        setItemToDeleteId(id);
        setShowConfirmDeleteModal(true);
    };


    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
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

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarLink icon={<LayoutDashboard size={20}/>} label="Обзор" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <SidebarLink icon={<Users size={20}/>} label="Пользователи" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <SidebarLink icon={<Shield size={20}/>} label="Группы" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
                    <SidebarLink icon={<Trophy size={20}/>} label="Турниры" active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')} />
                    <SidebarLink icon={<MessageSquare size={20}/>} label="Поддержка" active={activeTab === 'support'} onClick={() => setActiveTab('support')} />
                    <SidebarLink icon={<Map size={20}/>} label="Корты" active={activeTab === 'courts'} onClick={() => setActiveTab('courts')} />
                    <SidebarLink icon={<ShoppingBag size={20}/>} label="Магазин" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
                    <SidebarLink icon={<Terminal size={20}/>} label="Системные логи" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                         <img src={user.avatar} className="w-8 h-8 rounded-full bg-slate-700" alt=""/>
                         <div className="text-sm">
                             <div className="font-bold">{user.name}</div>
                             <div className="text-xs text-lime-400">Super Admin</div>
                         </div>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <LogOut size={18}/> <span>Выход</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800">
                        {activeTab === 'overview' && 'Экономика приложения'}
                        {activeTab === 'users' && 'Управление пользователями'}
                        {activeTab === 'groups' && 'Управление группами'}
                        {activeTab === 'tournaments' && 'Управление турнирами'}
                        {activeTab === 'support' && 'Чат с пользователями'}
                        {activeTab === 'shop' && 'Управление товарами'}
                        {activeTab === 'courts' && 'Управление кортами'}
                        {activeTab === 'logs' && 'Системный мониторинг'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                            <Activity size={14}/> Systems Operational
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard title="Общая выручка" value={`${((stats?.revenue || 0) / 1000).toFixed(0)}k ₽`} change="+12.5%" icon={<DollarSign className="text-lime-600"/>} color="lime"/>
                                <StatCard title="Активные пользователи" value={(stats?.activeUsers || 0).toLocaleString()} change="+5.2%" icon={<Users className="text-blue-600"/>} color="blue"/>
                                <StatCard title="Новые регистрации" value={(stats?.newSignups || 0).toString()} change="+18%" icon={<TrendingUp className="text-purple-600"/>} color="purple"/>
                                <StatCard title="Нагрузка сервера" value={`${stats?.serverLoad || 0}%`} change="-2%" icon={<Server className="text-amber-600"/>} color="amber"/>
                            </div>

                            {/* Charts Area (Mocked with CSS) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-bold text-lg mb-6">Динамика продаж</h3><div className="h-64 flex items-end justify-between gap-2">{[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 100].map((h, i) => (<div key={i} className="w-full bg-slate-100 rounded-t-lg relative group overflow-hidden"><div className="absolute bottom-0 w-full bg-slate-900 group-hover:bg-lime-500 transition-colors duration-300" style={{ height: `${h}%` }}></div></div>))}< /div><div className="flex justify-between mt-4 text-xs text-slate-400 font-bold uppercase"><span>Янв</span><span>Май</span><span>Дек</span></div></div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-bold text-lg mb-6">Распределение подписок</h3><div className="space-y-4"><div className="space-y-2"><div className="flex justify-between text-sm font-medium"><span>Amateur (Free)</span><span className="text-slate-500">65%</span></div><div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-300 w-[65%]"></div></div></div><div className="space-y-2"><div className="flex justify-between text-sm font-medium"><span>PRO Player</span><span className="text-slate-500">25%</span></div><div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-lime-400 w-[25%]"></div></div></div><div className="space-y-2"><div className="flex justify-between text-sm font-medium"><span>Coach PRO</span><span className="text-slate-500">10%</span></div><div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 w-[10%]"></div></div></div></div></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tournaments' && (
                        <AdminTournamentsView 
                            tournaments={tournaments.map(t => {
                                const group = groups.find(g => g.id === t.target_group_id);
                                return { ...t, groupName: group ? group.name : t.groupName };
                            })} 
                            onDelete={handleDeleteTournament} 
                            onEdit={handleEditTournament} 
                            onAdd={handleAddTournament}
                        />
                    )}

                    {activeTab === 'support' && (
                        <AdminSupportChat user={user} />
                    )}

                    {activeTab === 'groups' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-bold">Всего групп: {groups.length}</h3>
                                    <Button size="sm" onClick={handleAddGroup} className="gap-2">
                                        <Plus size={16}/> Добавить группу
                                    </Button>
                                </div>
                                <table className="w-full text-sm text-left">
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
                    )}

                    {activeTab === 'users' && (
                        <div className="animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                        <input className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-slate-900" placeholder="Поиск пользователя..."/>
                                    </div>
                                    <div className="flex gap-2">
                                         <Button size="sm" onClick={handleAddUser} className="gap-2"><Plus size={16}/> Добавить</Button>
                                         <Button size="sm" variant="outline">Экспорт CSV</Button>
                                    </div>
                                </div>
                                <table className="w-full text-sm text-left">
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
                                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16}/></button>
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shop' && (
                        <div className="animate-fade-in-up">
                            <div className="flex justify-end mb-6">
                                <Button className="gap-2" onClick={() => {
                                    setEditingProduct({ title: '', price: 0, category: 'rackets', image: '', rating: 5, reviews: 0 });
                                    setIsProductModalOpen(true);
                                }}>
                                    <Plus size={18}/> Добавить товар
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {(products || []).map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-lime-400 transition-colors">
                                        <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                            <img src={p.image} className="w-full h-full object-cover" alt=""/>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{p.title}</h3>
                                                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded mt-1 inline-block">{p.category}</span>
                                                </div>
                                                <div className="text-xl font-bold">{p.price.toLocaleString()} ₽</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                             <div className="flex justify-between items-center mb-6">
                                 <div className="relative w-64">
                                     <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                     <input 
                                         className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-lime-400/50 transition-all placeholder:text-slate-400 text-slate-900 font-medium" 
                                         placeholder="Поиск по названию..."
                                         value={courtSearchName}
                                         onChange={e => setCourtSearchName(e.target.value)}
                                     />
                                 </div>
                                 <div className="flex gap-2">
                                     <div className="relative">
                                         <select
                                             className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium pr-8 appearance-none"
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
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                         <tr>
                                             <th className="px-6 py-4">Название</th>
                                             <th className="px-6 py-4">Адрес</th>
                                             <th className="px-6 py-4">Покрытие</th>
                                             <th className="px-6 py-4">Цена</th>
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
                                                     <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                                                         c.surface === 'clay' ? 'bg-orange-100 text-orange-800' :
                                                         c.surface === 'hard' ? 'bg-blue-100 text-blue-800' :
                                                         c.surface === 'grass' ? 'bg-green-100 text-green-800' :
                                                         'bg-indigo-100 text-indigo-800'
                                                     }`}>
                                                         {Array.isArray(c.surface) ? c.surface.join(', ') : c.surface}
                                                     </span>
                                                 </td>
                                                 <td className="px-6 py-4 font-bold">{c.pricePerHour} ₽/ч</td>
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
                    )}

                    {activeTab === 'logs' && (
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl text-slate-300 font-mono text-sm h-[600px] overflow-y-auto animate-fade-in-up border border-slate-800">
                             <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-slate-800 pb-2">
                                 <Terminal size={16}/> System Logs / Live Stream
                             </div>
                             <div className="space-y-2">
                                 {(logs || []).length === 0 && <div className="text-slate-600">No logs found in database.</div>}
                                 {(logs || []).map((log) => (
                                     <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors">
                                         <span className="text-slate-500 shrink-0 w-20">{log.timestamp}</span>
                                         <span className={`font-bold uppercase text-xs w-16 text-center rounded px-1 py-0.5 shrink-0 h-fit ${
                                             log.level === 'info' ? 'bg-blue-900 text-blue-400' :
                                             log.level === 'warning' ? 'bg-amber-900 text-amber-400' :
                                             log.level === 'error' ? 'bg-red-900 text-red-400' :
                                             'bg-green-900 text-green-400'
                                         }`}>{log.level}</span>
                                         <span className="text-slate-400 w-24 shrink-0">[{log.module}]</span>
                                         <span className="text-slate-200">{log.message}</span>
                                     </div>
                                 ))}
                                 <div className="animate-pulse text-lime-400 mt-2">_</div>
                             </div>
                        </div>
                    )}
                </div>
            </main>

            <Modal isOpen={isTournamentModalOpen} onClose={() => setIsTournamentModalOpen(false)} title="Редактировать турнир">
                {editingTournament && (
                    <form onSubmit={handleSaveTournament} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Название</label>
                            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.name || ''} onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
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
                        
                        <div className="grid grid-cols-2 gap-4">
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
                            <label className="text-xs font-bold text-slate-500 uppercase">Приз</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" value={editingTournament.prizePool || ''} onChange={e => setEditingTournament({...editingTournament, prizePool: e.target.value})} />
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
                                <option value="draft">Черновик</option>
                                <option value="live">В игре</option>
                                <option value="finished">Завершен</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full mt-4">Сохранить</Button>
                    </form>
                )}
            </Modal>

            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={editingGroup?.id ? 'Редактировать группу' : 'Новая группа'}>
                {editingGroup && (
                    <form onSubmit={handleSaveGroup} className="space-y-4">
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
                        <div className="grid grid-cols-2 gap-4">
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
                            <div className="flex gap-2">
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
                        <div className="grid grid-cols-2 gap-4">
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
                            <div className="flex items-center gap-4">
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
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setEditingCourt({...editingCourt, image: reader.result as string});
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
                         <div className="grid grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-2 gap-3">
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

            {/* Confirmation Modal */}
            <Modal isOpen={showConfirmDeleteModal} onClose={() => setShowConfirmDeleteModal(false)} title="Подтверждение удаления">
                <div className="space-y-4">
                    <p>Вы уверены, что хотите удалить этот элемент?</p>
                    <div className="flex justify-end gap-2">
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
        </div>
    );
};

// Internal Components
const SidebarLink = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            active ? 'bg-lime-400 text-slate-900 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
    >
        {icon}
        <span className="text-sm">{label}</span>
    </button>
);

const StatCard = ({ title, value, change, icon, color }: { title: string, value: string, change: string, icon: React.ReactNode, color: 'lime' | 'blue' | 'purple' | 'amber' }) => {
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
                    <div className={`text-xs font-bold mb-1 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</div>
                </div>
            </div>
        </div>
    );
};

// Copied Modal from Dashboard to avoid export dependency issues
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
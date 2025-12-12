
import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  Search, 
  MapPin, 
  MessageSquare, 
  LogOut, 
  Trophy, 
  Activity, 
  Calendar,
  Bot,
  Send,
  Loader2,
  Settings,
  Bell,
  CheckCircle2,
  Zap,
  Star,
  ChevronRight,
  Shield,
  CreditCard,
  Lock,
  Phone,
  Mail,
  Camera,
  MoreVertical,
  Check,
  BookOpen,
  PenTool,
  Eraser,
  RotateCcw,
  MousePointer2,
  Download,
  Users,
  TrendingUp,
  Clock,
  Wallet,
  AlertCircle,
  X,
  FileText,
  Plus,
  Video,
  Play,
  ChevronDown,
  Frown,
  CloudSun,
  Wind,
  UserPlus,
  ArrowUpRight,
  Save,
  Trash2,
  Upload,
  Swords,
  Timer,
  Info,
  Globe,
  MessageCircle,
  BarChart2,
  Map,
  ExternalLink
} from 'lucide-react';
import { User, DashboardTab, Partner, Court, ChatMessage, Conversation, Notification, Student, LadderPlayer, Challenge, Match } from '../types';
import Button from './Button';
import { getTennisAdvice } from '../services/geminiService';
import { api } from '../services/api';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

// --- Shared Components ---

const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-center hover:bg-white hover:shadow-md transition-all duration-300">
    <div className="p-2 bg-white rounded-full shadow-sm">{icon}</div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
  </div>
);

const ProgressChart = ({ matches, type }: { matches: Match[], type: 'serve' | 'errors' }) => {
  const data = matches.slice(0, 10).reverse(); // Last 10 matches, chronological
  const maxVal = type === 'serve' ? 100 : 30;
  
  return (
    <div className="flex items-end justify-between h-24 gap-2">
      {data.map((m, i) => {
        const val = type === 'serve' ? m.stats?.firstServePercent || 0 : m.stats?.unforcedErrors || 0;
        const height = Math.max(10, Math.min((val / maxVal) * 100, 100));
        return (
          <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group">
             <div 
               className={`absolute bottom-0 w-full rounded-t-lg transition-all ${type === 'serve' ? 'bg-lime-400' : 'bg-red-400'}`}
               style={{ height: `${height}%` }}
             ></div>
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-1 rounded z-10 whitespace-nowrap">
                {val} {type === 'serve' ? '%' : ''}
             </div>
          </div>
        )
      })}
    </div>
  )
};

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

const NavButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`p-2 rounded-xl transition-colors ${active ? 'bg-slate-900 text-lime-400' : 'text-slate-400 hover:bg-slate-50'}`}
  >
    {icon}
  </button>
);

const SidebarItem = ({ icon, label, active, onClick, isSpecial = false, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
      active 
        ? isSpecial 
          ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-slate-900 font-bold shadow-lg shadow-lime-900/20' 
          : 'bg-slate-800 text-white font-medium border-l-4 border-lime-400' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    }`}
  >
    <span className={active ? 'text-inherit' : 'group-hover:text-white transition-colors'}>{icon}</span>
    <span className="font-medium">{label}</span>
    {isSpecial && !active && <div className="ml-auto w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>}
    {badge && (
      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
        {badge}
      </span>
    )}
  </button>
);

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');

  const handleNavigate = (tab: DashboardTab) => setActiveTab(tab);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col relative z-20 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
             <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border border-slate-700">
               <div className="w-4 h-4 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.5)]"></div>
             </div>
            <span className="text-2xl font-bold tracking-tight">TennisPro</span>
          </div>
          
          <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] hide-scrollbar pb-4">
            <SidebarItem icon={<UserIcon size={20} />} label="Мой Профиль" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            <SidebarItem icon={<Search size={20} />} label="Поиск Партнера" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
            <SidebarItem icon={<MapPin size={20} />} label="Бронирование" active={activeTab === 'courts'} onClick={() => setActiveTab('courts')} />
            <SidebarItem icon={<Swords size={20} />} label="Турнирная лестница" active={activeTab === 'ladder'} onClick={() => setActiveTab('ladder')} />
            <SidebarItem icon={<Globe size={20} />} label="Сообщество" active={activeTab === 'community'} onClick={() => setActiveTab('community')} />
            <SidebarItem icon={<BookOpen size={20} />} label="Тактика" active={activeTab === 'tactics'} onClick={() => setActiveTab('tactics')} />
            <SidebarItem icon={<Video size={20} />} label="Видео-анализ" active={activeTab === 'video_analysis'} onClick={() => setActiveTab('video_analysis')} isSpecial />
            {user.role === 'coach' && (
              <SidebarItem icon={<Users size={20} />} label="Ученики (CRM)" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
            )}
            <SidebarItem icon={<MessageSquare size={20} />} label="Сообщения" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} badge={2} />
            
            <div className="pt-6 pb-2">
              <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Инструменты</p>
              <SidebarItem icon={<Bot size={20} />} label="AI Тренер" active={activeTab === 'ai_coach'} onClick={() => setActiveTab('ai_coach')} />
            </div>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-2 rounded-lg hover:bg-slate-800">
            <LogOut size={20} />
            <span className="font-medium">Выйти из системы</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md">
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
             <div className="w-3 h-3 rounded-full bg-lime-400"></div>
           </div>
           <span className="font-bold">TennisPro</span>
         </div>
         <div className="flex gap-3">
             <button onClick={() => setActiveTab('messages')}><MessageSquare size={20}/></button>
             <button onClick={onLogout}><LogOut size={20}/></button>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 bg-[#F1F5F9]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
           <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 capitalize">
                  {activeTab === 'video_analysis' ? 'Видео-анализ ударов' : 
                   activeTab === 'ai_coach' ? 'AI Тренер' : 
                   activeTab === 'students' ? 'CRM Система' :
                   activeTab === 'ladder' ? 'Турнирная лестница' :
                   activeTab === 'community' ? 'Клубное сообщество' :
                   activeTab === 'profile' ? 'Личный кабинет' :
                   activeTab === 'search' ? 'Поиск партнера' :
                   activeTab === 'courts' ? 'Бронирование' :
                   activeTab === 'tactics' ? 'Тактическая доска' :
                   activeTab}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Добро пожаловать, {user.name}</p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                 <button onClick={() => setActiveTab('notifications')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm relative ${activeTab === 'notifications' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                   <Bell size={20} />
                   <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                 </button>
                 <button onClick={() => setActiveTab('settings')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${activeTab === 'settings' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                   <Settings size={20} />
                 </button>
              </div>
           </header>

          <div className="animate-fade-in-up">
            {activeTab === 'profile' && <ProfileView user={user} />}
            {activeTab === 'search' && <PartnerSearchView onNavigate={handleNavigate} />}
            {activeTab === 'courts' && <CourtBookingView />}
            {activeTab === 'ai_coach' && <AiCoachView user={user} />}
            {activeTab === 'messages' && <MessagesView />}
            {activeTab === 'settings' && <SettingsView user={user} />}
            {activeTab === 'notifications' && <NotificationsView />}
            {activeTab === 'tactics' && <TacticsView />}
            {activeTab === 'students' && <StudentsView user={user} />}
            {activeTab === 'video_analysis' && <VideoAnalysisView />}
            {activeTab === 'ladder' && <LadderView user={user} />}
            {activeTab === 'community' && <CommunityView />}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around p-4 z-50 safe-area-bottom">
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={24}/>} />
        <NavButton active={activeTab === 'ladder'} onClick={() => setActiveTab('ladder')} icon={<Swords size={24}/>} />
        <NavButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<Globe size={24}/>} />
        <NavButton active={activeTab === 'ai_coach'} onClick={() => setActiveTab('ai_coach')} icon={<Bot size={24}/>} />
      </div>
    </div>
  );
};

// --- VIEWS ---

// 1. ProfileView
const ProfileView = ({ user }: { user: User }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStatsModal, setShowAddStatsModal] = useState(false);
  
  // Data State
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // New Match Stats State
  const [newMatchStats, setNewMatchStats] = useState({
      opponentName: '',
      score: '',
      result: 'win' as 'win' | 'loss',
      surface: 'hard' as 'hard' | 'clay' | 'grass',
      stats: {
          firstServePercent: 60,
          doubleFaults: 2,
          unforcedErrors: 10,
          winners: 5,
          aces: 1,
          breakPointsWon: 0,
          totalBreakPoints: 0
      }
  });

  useEffect(() => {
      const fetchMatches = async () => {
          setLoadingMatches(true);
          try {
              const data = await api.matches.getAll(user.id);
              setMatches(data);
          } catch(e) {
              console.error(e);
          } finally {
              setLoadingMatches(false);
          }
      };
      fetchMatches();
  }, [user.id]);

  const handleSaveMatch = async () => {
      try {
          const matchPayload = {
              userId: user.id,
              ...newMatchStats,
              stats: newMatchStats.stats
          };
          const savedMatch = await api.matches.add(matchPayload);
          setMatches([savedMatch, ...matches]);
          setShowAddStatsModal(false);
      } catch (e) {
          alert('Ошибка сохранения');
      }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-32 bg-slate-900 w-full relative">
             <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
                 <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-lime-400/20 rounded-full blur-[60px]"></div>
             </div>
             <div className="absolute top-6 right-6 z-10">
                 <Button variant="glass" size="sm" onClick={() => setShowEditModal(true)}>Редактировать</Button>
             </div>
          </div>
          
          <div className="px-8 pb-8">
               <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16 sm:-mt-6 relative z-10">
                   <div className="relative">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md bg-slate-100" />
                   </div>
                   
                   <div className="flex-1 pt-2 sm:pt-0">
                       <div className="flex items-center justify-between">
                           <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h2 className="text-3xl font-bold text-slate-900">{user.name}</h2>
                                 {(user.role === 'rtt_pro' || user.role === 'coach') && <CheckCircle2 className="text-blue-500 fill-blue-100" size={24} />}
                               </div>
                               <p className="text-slate-500 font-medium flex items-center gap-2"><MapPin size={16}/> {user.city}</p>
                           </div>
                       </div>
                       <div className="mt-2 flex items-center gap-3">
                           <span className="bg-lime-100 text-lime-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-lime-200">
                               {user.role === 'coach' ? 'Тренер' : user.role === 'rtt_pro' ? 'Игрок РТТ' : 'Любитель'}
                           </span>
                           {user.rating && <span className="text-slate-400 text-sm font-bold">• {user.rating} очков</span>}
                       </div>
                   </div>
               </div>
  
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                <StatCard label="NTRP / РТТ" value={user.level || user.rating || "N/A"} icon={<Activity className="text-lime-600" />} />
                <StatCard label="Матчей" value={matches.length} icon={<Trophy className="text-blue-500" />} />
                <StatCard label="Побед" value={matches.filter(m => m.result === 'win').length} icon={<Zap className="text-amber-500" />} />
                <StatCard label="Возраст" value={user.age || "N/A"} icon={<Calendar className="text-purple-500" />} />
              </div>
          </div>
        </div>
        
        {/* Match Statistics & Analytics */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="text-lime-600"/> Аналитика игры</h3>
                <Button size="sm" onClick={() => setShowAddStatsModal(true)} className="gap-2"><Plus size={16}/> Внести матч</Button>
            </div>

            {matches.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="text-sm font-bold text-slate-500 uppercase mb-4">Процент 1-й подачи</div>
                            <ProgressChart matches={matches} type="serve" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-500 uppercase mb-4">Невынужденные ошибки</div>
                            <ProgressChart matches={matches} type="errors" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <Activity size={32} className="mx-auto mb-2 opacity-50"/>
                    <p>Нет данных. Добавьте статистику первого матча, чтобы увидеть графики.</p>
                </div>
            )}
        </div>

        {/* Recent Matches List */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold">История матчей</h3>
          </div>
          {loadingMatches ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div>
          ) : matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((m) => (
                  <div 
                    key={m.id} 
                    onClick={() => setExpandedMatchId(expandedMatchId === m.id ? null : m.id)}
                    className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer group ${expandedMatchId === m.id ? 'bg-white border-lime-400 shadow-md ring-1 ring-lime-400' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${m.result === 'win' ? 'bg-lime-500' : 'bg-red-500'}`}></div>
                        <div>
                            <div className="font-bold text-lg group-hover:text-lime-600 transition-colors">{m.score}</div>
                            <div className="text-sm text-slate-500">vs. {m.opponentName} • {m.surface === 'clay' ? 'Грунт' : m.surface === 'hard' ? 'Хард' : 'Трава'}</div>
                        </div>
                        </div>
                        <div className="text-right">
                        <div className="font-bold text-slate-900">{new Date(m.date).toLocaleDateString()}</div>
                        {!expandedMatchId && m.stats && <div className="text-xs text-slate-400 font-medium">UE: {m.stats.unforcedErrors} | Wins: {m.stats.winners}</div>}
                        <ChevronDown size={16} className={`ml-auto mt-1 text-slate-400 transition-transform duration-300 ${expandedMatchId === m.id ? 'rotate-180' : ''}`}/>
                        </div>
                    </div>

                    {expandedMatchId === m.id && m.stats && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in-up cursor-default" onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Эйсы</div>
                                    <div className="font-bold text-slate-900">{m.stats.aces}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Двойные</div>
                                    <div className="font-bold text-slate-900">{m.stats.doubleFaults}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">1-я подача</div>
                                    <div className="font-bold text-slate-900">{m.stats.firstServePercent}%</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Брейк-поинты</div>
                                    <div className="font-bold text-slate-900">{m.stats.breakPointsWon} / {m.stats.totalBreakPoints}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-lime-100 bg-lime-50 text-center">
                                    <div className="text-[10px] uppercase font-bold text-lime-700 mb-1">Winners</div>
                                    <div className="font-bold text-lime-900">{m.stats.winners}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-center">
                                    <div className="text-[10px] uppercase font-bold text-red-700 mb-1">Unforced Errors</div>
                                    <div className="font-bold text-red-900">{m.stats.unforcedErrors}</div>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                ))}
              </div>
          ) : (
              <p className="text-slate-400 text-sm">Пока нет сыгранных матчей.</p>
          )}
        </div>
      </div>
      
      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-lime-400 rounded-3xl p-6 relative overflow-hidden text-slate-900">
           <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2 font-bold uppercase text-xs tracking-wider opacity-70">
                   <Zap size={14}/> AI Coach Insight
               </div>
               <h3 className="font-bold text-xl mb-2">Стабильность подачи падает</h3>
               <p className="text-sm font-medium opacity-80 mb-4">
                   В последних 3 матчах процент первой подачи снизился на 12%. Рекомендую тренировку "Точность подачи".
               </p>
               <Button variant="glass" size="sm" className="bg-slate-900/10 text-slate-900 border-slate-900/20 hover:bg-slate-900 hover:text-white">
                   Открыть тренировку
               </Button>
           </div>
           <Zap className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 text-white rotate-12" />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={18}/> Ближайший турнир</h3>
            <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">24 Окт, Суббота</div>
                    <div className="font-bold text-slate-900">Weekend Cup Amateur</div>
                    <div className="text-sm text-slate-500 mt-1">Теннис Парк • Грунт</div>
                </div>
                <Button variant="outline" className="w-full text-sm">Календарь турниров</Button>
            </div>
        </div>
      </div>
    </div>

    {/* Add Match Modal */}
    <Modal isOpen={showAddStatsModal} onClose={() => setShowAddStatsModal(false)} title="Добавить матч">
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Соперник</label>
                <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                    value={newMatchStats.opponentName} 
                    onChange={e => setNewMatchStats({...newMatchStats, opponentName: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Счет</label>
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={newMatchStats.score} 
                        onChange={e => setNewMatchStats({...newMatchStats, score: e.target.value})}
                        placeholder="6:3, 6:4"
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Покрытие</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={newMatchStats.surface} 
                        onChange={e => setNewMatchStats({...newMatchStats, surface: e.target.value as any})}
                    >
                        <option value="hard">Хард</option>
                        <option value="clay">Грунт</option>
                        <option value="grass">Трава</option>
                    </select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Результат</label>
                <div className="flex gap-2">
                    <button 
                        className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${newMatchStats.result === 'win' ? 'bg-lime-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}
                        onClick={() => setNewMatchStats({...newMatchStats, result: 'win'})}
                    >Победа</button>
                    <button 
                         className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${newMatchStats.result === 'loss' ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-500'}`}
                         onClick={() => setNewMatchStats({...newMatchStats, result: 'loss'})}
                    >Поражение</button>
                </div>
            </div>
            
            <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-900 uppercase mb-3">Статистика (опционально)</div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">1-я подача (%)</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" value={newMatchStats.stats.firstServePercent} onChange={e => setNewMatchStats({...newMatchStats, stats: {...newMatchStats.stats, firstServePercent: Number(e.target.value)}})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Невынужденные</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" value={newMatchStats.stats.unforcedErrors} onChange={e => setNewMatchStats({...newMatchStats, stats: {...newMatchStats.stats, unforcedErrors: Number(e.target.value)}})} />
                    </div>
                </div>
            </div>

            <Button className="w-full mt-4" onClick={handleSaveMatch}>Сохранить результат</Button>
        </div>
    </Modal>
    </>
  );
};

// ... other views (PartnerSearchView) remain unchanged ...
// 2. PartnerSearchView
const PartnerSearchView = ({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: 'Все города', level: 'Все уровни' });

  const russiaCities = [
    "Все города", "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", 
    "Нижний Новгород", "Сочи", "Краснодар", "Самара", "Уфа", "Ростов-на-Дону", "Омск",
    "Красноярск", "Воронеж", "Пермь", "Волгоград"
  ].sort();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const queryParams: any = {};
        if (filters.city !== 'Все города') queryParams.city = filters.city;
        if (filters.level !== 'Все уровни') queryParams.level = filters.level;
        
        const data = await api.getPartners(queryParams);
        setPartners(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
           <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
           <input 
              type="text" 
              placeholder="Поиск по имени..." 
              className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              onChange={(e) => {
                 const val = e.target.value;
                 if (val.length > 2) {
                     api.getPartners({ search: val }).then(setPartners);
                 }
              }}
           />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none max-w-[150px] md:max-w-none"
              value={filters.city}
              onChange={e => setFilters({...filters, city: e.target.value})}
            >
               {russiaCities.map(city => (
                   <option key={city} value={city}>{city}</option>
               ))}
            </select>
            <select 
              className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none"
              value={filters.level}
              onChange={e => setFilters({...filters, level: e.target.value})}
            >
               <option>Все уровни</option>
               <option>Любитель (NTRP)</option>
               <option>Профи (РТТ)</option>
            </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
      ) : partners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {partners.map(p => (
             <div key={p.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex justify-center mb-4 relative">
                  <div className="w-24 h-24 rounded-full p-1 border-2 border-dashed border-slate-200 group-hover:border-lime-400 transition-colors">
                     <img src={p.image} alt={p.name} className="w-full h-full rounded-full object-cover" />
                  </div>
                  {p.isPro && <span className="absolute bottom-0 bg-slate-900 text-lime-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">PRO</span>}
                </div>
                
                <div className="text-center mb-6">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{p.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{p.age} лет • {p.city}</p>
                </div>
                
                <div className="flex justify-center mb-6">
                  <span className="bg-slate-50 border border-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-bold">{p.level}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm">Профиль</Button>
                  <Button variant="primary" size="sm" onClick={() => onNavigate('messages')}>Чат</Button>
                </div>
             </div>
           ))}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Frown size={40} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Партнеры не найдены</h3>
          </div>
      )}
    </div>
  );
};

// 3. CourtBookingView (UPDATED: Expandable Card Pattern)
const CourtBookingView = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
       setLoading(true);
       try {
         const data = await api.getCourts();
         setCourts(data);
       } catch (e) { console.error(e); } 
       finally { setLoading(false); }
    };
    load();
  }, []);

  const handleBook = (court: Court) => {
      // Use provided website or fallback to search query
      const url = court.website || `https://yandex.ru/search/?text=${encodeURIComponent(court.name + ' теннисный корт ' + court.address)}`;
      window.open(url, '_blank');
  };

  const toggleCourt = (id: string) => {
      if (selectedCourtId === id) setSelectedCourtId(null);
      else setSelectedCourtId(id);
  }

  return (
    <div className="space-y-6">
       {loading ? (
         <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-auto grid-flow-row-dense">
            {courts.map(c => {
              const isSelected = selectedCourtId === c.id;
              return (
              <div 
                key={c.id} 
                onClick={() => toggleCourt(c.id)}
                className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 cursor-pointer ${
                    isSelected ? 'lg:col-span-2 row-span-2 shadow-xl ring-1 ring-lime-400 z-10' : 'hover:shadow-xl flex flex-col sm:flex-row h-auto sm:h-56 group'
                }`}
              >
                 {isSelected ? (
                    // EXPANDED DETAILS VIEW
                    <div className="flex flex-col w-full h-full animate-fade-in-up">
                        <div className="h-64 sm:h-80 w-full relative shrink-0">
                            <img src={c.image} className="w-full h-full object-cover" alt={c.name} />
                            <button onClick={(e) => { e.stopPropagation(); setSelectedCourtId(null); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-slate-900 hover:bg-white transition-colors shadow-md z-20">
                                <X size={20}/>
                            </button>
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm">
                                <Star size={14} className="fill-amber-400 text-amber-400"/> {c.rating}
                            </div>
                        </div>
                        <div className="p-6 sm:p-8 flex flex-col justify-between flex-1">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                                <div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.name}</h3>
                                    <p className="text-slate-500 text-lg flex items-center gap-2 mt-2"><MapPin size={20} className="text-lime-500"/> {c.address}</p>
                                </div>
                                <div className="text-left sm:text-right shrink-0 bg-slate-50 p-3 rounded-xl sm:bg-transparent sm:p-0">
                                    <div className="text-3xl font-bold text-slate-900">{c.pricePerHour} ₽</div>
                                    <div className="text-xs text-slate-400 uppercase font-bold">за час</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Покрытие</div>
                                    <div className="font-bold text-slate-900 capitalize flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${c.surface === 'clay' ? 'bg-orange-500' : c.surface === 'hard' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                                        {c.surface}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Рейтинг клуба</div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1">
                                        <Star size={14} className="fill-amber-400 text-amber-400"/> {c.rating} / 5.0
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hidden sm:block">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Статус</div>
                                    <div className="font-bold text-green-600 flex items-center gap-1">
                                        <CheckCircle2 size={14}/> Открыто
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full gap-2 py-4 text-lg shadow-xl shadow-lime-400/20" onClick={(e) => { e.stopPropagation(); handleBook(c); }}>
                                <ExternalLink size={20}/> Перейти к бронированию
                            </Button>
                            <p className="text-center text-xs text-slate-400 mt-4">
                                Вы будете перенаправлены на сайт партнера для выбора времени.
                            </p>
                        </div>
                    </div>
                 ) : (
                    // COMPACT VIEW
                    <>
                        <div className="w-full sm:w-56 h-48 sm:h-full bg-slate-200 shrink-0 relative overflow-hidden">
                            <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={c.name} />
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm text-white ${c.surface === 'clay' ? 'bg-orange-600' : c.surface === 'hard' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                {c.surface === 'clay' ? 'Грунт' : c.surface === 'hard' ? 'Хард' : 'Ковер'}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-900 flex items-center gap-1">
                                <Star size={10} className="fill-amber-400 text-amber-400"/> {c.rating}
                            </span>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col justify-between w-full">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-lime-600 transition-colors">{c.name}</h3>
                                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1"><MapPin size={14}/> {c.address}</p>
                            </div>
                            
                            <div className="flex items-end justify-between mt-4">
                                <div>
                                <div className="text-xs text-slate-400 font-bold uppercase">Цена</div>
                                <div className="text-xl font-bold text-slate-900">{c.pricePerHour} ₽ <span className="text-sm font-normal text-slate-400">/ час</span></div>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBook(c);
                                    }}
                                >
                                    Забронировать
                                </Button>
                            </div>
                        </div>
                    </>
                 )}
              </div>
            )})}
         </div>
       )}
       
       <div className="bg-slate-900 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
             <h3 className="text-2xl font-bold mb-2">Не нашли подходящий корт?</h3>
             <p className="text-slate-400 mb-6 max-w-md mx-auto">Мы постоянно добавляем новые локации. Оставьте заявку, и мы уведомим вас, когда в вашем районе появится партнерский клуб.</p>
             <Button variant="secondary" onClick={() => setIsRequestModalOpen(true)}>Оставить заявку</Button>
          </div>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] bg-lime-400 rounded-full blur-[100px]"></div>
          </div>
       </div>

       {/* Request Modal */}
       <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Добавить новый корт">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsRequestModalOpen(false); }}>
             <p className="text-sm text-slate-500 mb-4">Помогите нам стать лучше! Расскажите о корте, которого не хватает в приложении.</p>
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Город</label>
                 <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Например: Сочи" />
             </div>
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Название клуба / Кортов</label>
                 <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Например: Адлер-Арена" />
             </div>
             <div className="pt-2">
                 <Button type="submit" className="w-full">Отправить заявку</Button>
             </div>
        </form>
       </Modal>
    </div>
  );
};

// ... Rest of the file remains unchanged ...
// 4. AiCoachView
const AiCoachView = ({ user }: { user: User }) => {
   const [messages, setMessages] = useState<ChatMessage[]>([
      { role: 'system', text: `Привет, ${user.name}! Я твой персональный AI-тренер. Спроси меня о тактике, технике или психологической подготовке.` }
   ]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
     if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
   }, [messages]);

   const handleSend = async () => {
      if (!input.trim()) return;
      
      const userMsg: ChatMessage = { role: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const advice = await getTennisAdvice(userMsg.text);
        setMessages(prev => [...prev, { role: 'model', text: advice }]);
      } catch (e) {
        setMessages(prev => [...prev, { role: 'system', text: 'Ошибка соединения с сервером.' }]);
      } finally {
        setLoading(false);
      }
   };

   return (
     <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center gap-3">
           <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center text-slate-900">
              <Bot size={24} />
           </div>
           <div>
              <div className="font-bold">AI Coach</div>
              <div className="text-xs text-slate-400">Powered by Gemini 2.5</div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
           {messages.map((msg, i) => (
             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                   msg.role === 'user' 
                   ? 'bg-slate-900 text-white rounded-tr-none shadow-md' 
                   : msg.role === 'system'
                   ? 'bg-transparent text-slate-400 text-xs font-bold uppercase tracking-wider py-2 text-center'
                   : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                }`}>
                   {msg.role !== 'system' && <div className="whitespace-pre-wrap">{msg.text}</div>}
                   {msg.role === 'system' && <span>{msg.text}</span>}
                </div>
             </div>
           ))}
           {loading && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="animate-spin text-lime-500" size={16}/>
                  <span className="text-slate-500 text-sm font-medium">Печатает...</span>
               </div>
             </div>
           )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
           <input 
             className="flex-1 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 border border-slate-200"
             placeholder="Спроси совета..."
             value={input}
             onChange={e => setInput(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleSend()}
             disabled={loading}
           />
           <Button onClick={handleSend} disabled={loading} size="sm"><Send size={18} /></Button>
        </div>
     </div>
   );
};

// 5. MessagesView
const MessagesView = () => {
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    
    // Mock Data
    const conversations: Conversation[] = [
        { id: '1', partnerId: '2', partnerName: 'Мария Петрова', partnerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', lastMessage: 'Договорились, в 18:00 на корте!', timestamp: '10:45', unread: 2, isPro: false },
        { id: '2', partnerId: '1', partnerName: 'Алексей Иванов', partnerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', lastMessage: 'Привет, сыграем в выходные?', timestamp: 'Вчера', unread: 0, isPro: true },
    ];

    return (
        <div className="flex h-[700px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* List */}
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900" placeholder="Поиск..."/>
                        <Search size={14} className="absolute left-3 top-3 text-slate-400"/>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1">
                    {conversations.map(c => (
                        <div key={c.id} onClick={() => setSelectedChat(c.id)} className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${selectedChat === c.id ? 'bg-slate-50' : ''}`}>
                            <div className="relative">
                                <img src={c.partnerAvatar} className="w-12 h-12 rounded-full object-cover" alt=""/>
                                {c.isPro && <div className="absolute -bottom-1 -right-1 bg-slate-900 text-lime-400 text-[8px] px-1 rounded font-bold">PRO</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-slate-900 truncate">{c.partnerName}</h4>
                                    <span className="text-xs text-slate-400">{c.timestamp}</span>
                                </div>
                                <p className="text-sm text-slate-500 truncate">{c.lastMessage}</p>
                            </div>
                            {c.unread > 0 && (
                                <div className="w-5 h-5 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{c.unread}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
                {selectedChat ? (
                    <>
                        <div className="h-16 border-b border-slate-100 flex items-center px-6 justify-between bg-white">
                             <div className="flex items-center gap-3">
                                <button className="md:hidden" onClick={() => setSelectedChat(null)}><ChevronRight className="rotate-180"/></button>
                                <h3 className="font-bold text-slate-900">Мария Петрова</h3>
                             </div>
                             <Button variant="ghost" size="sm"><MoreVertical size={18}/></Button>
                        </div>
                        <div className="flex-1 bg-slate-50 p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none max-w-xs shadow-sm text-sm">
                                    Привет! Свободна сегодня вечером?
                                </div>
                            </div>
                             <div className="flex justify-end">
                                <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-none max-w-xs shadow-sm text-sm">
                                    Да, могу после 18:00. В Теннис Парке?
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100">
                             <div className="flex gap-2">
                                <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" placeholder="Напишите сообщение..."/>
                                <Button size="sm" className="px-4"><Send size={18}/></Button>
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={48} className="mb-4 opacity-20"/>
                        <p>Выберите чат для начала общения</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 6. SettingsView
const SettingsView = ({ user }: { user: User }) => (
  <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
     <h2 className="text-2xl font-bold mb-6">Настройки</h2>
     <div className="space-y-6">
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
           <div>
              <div className="font-bold">Уведомления</div>
              <div className="text-sm text-slate-500">Получать оповещения о матчах</div>
           </div>
           <div className="w-12 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
        </div>
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
           <div>
              <div className="font-bold">Приватность</div>
              <div className="text-sm text-slate-500">Показывать мой профиль в поиске</div>
           </div>
           <div className="w-12 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
        </div>
        <div className="pt-4">
           <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 w-full">Удалить аккаунт</Button>
        </div>
     </div>
  </div>
);

// 7. NotificationsView
const NotificationsView = () => (
  <div className="max-w-2xl mx-auto space-y-4">
     <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 items-start">
        <div className="w-10 h-10 bg-lime-100 rounded-full flex items-center justify-center text-lime-600 flex-shrink-0"><Calendar size={20}/></div>
        <div>
           <div className="font-bold text-slate-900">Напоминание о матче</div>
           <p className="text-slate-500 text-sm">Завтра в 18:00 игра с Алексеем на корте "Искра".</p>
           <div className="text-xs text-slate-400 mt-2">2 часа назад</div>
        </div>
     </div>
     <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 items-start">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0"><Trophy size={20}/></div>
        <div>
           <div className="font-bold text-slate-900">Турнир Weekend Cup</div>
           <p className="text-slate-500 text-sm">Открыта регистрация на турнир выходного дня.</p>
           <div className="text-xs text-slate-400 mt-2">Вчера</div>
        </div>
     </div>
  </div>
);

// 8. TacticsView
const TacticsView = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#bef264'); // Lime-400
  const [selectedStrategy, setSelectedStrategy] = useState<{title: string, description: string} | null>(null);

  const strategies = [
      { 
          title: 'Подача и выход к сетке', 
          description: 'Классическая атакующая комбинация (Serve & Volley). Игрок подает и немедленно двигается к сетке, чтобы сыграть первый мяч с лёта (воллей). Эффективно на быстрых покрытиях.' 
      },
      { 
          title: 'Обратный кросс (Inside-Out)', 
          description: 'Удар форхендом (справа для правши) из левого угла корта по диагонали в левый угол соперника. Позволяет атаковать "сильной" стороной, заставляя соперника защищаться бэкхендом.' 
      },
      { 
          title: 'Двойной блок на сетке', 
          description: 'Тактика для парной игры. Оба игрока занимают позицию у сетки, создавая "стену". Требует хорошей реакции и сыгранности.' 
      },
      { 
          title: 'Защита свечой', 
          description: 'Высокий удар (свеча), отправляющий мяч под заднюю линию соперника. Используется, когда соперник находится у сетки или чтобы выиграть время для возвращения в позицию.' 
      },
      { 
          title: 'Атака по линии', 
          description: 'Удар параллельно боковой линии. Рискованный прием, так как сетка здесь выше, а корт короче, но при успешном исполнении часто приводит к виннеру.' 
      },
      { 
          title: 'Укороченный удар', 
          description: 'Дроп-шот — удар с нижним вращением, который падает сразу за сеткой. Эффективен, если соперник стоит далеко за задней линией.' 
      }
  ];
  
  useEffect(() => {
    drawCourt();
    window.addEventListener('resize', drawCourt);
    return () => window.removeEventListener('resize', drawCourt);
  }, []);

  const drawCourt = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 30;
    const courtWidth = canvas.width - (padding * 2);
    const courtHeight = canvas.height - (padding * 2);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(padding, padding, courtWidth, courtHeight);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.strokeRect(padding, padding, courtWidth, courtHeight);

    const alleyHeight = courtHeight * 0.10; 
    
    ctx.beginPath();
    ctx.moveTo(padding, padding + alleyHeight);
    ctx.lineTo(padding + courtWidth, padding + alleyHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding + courtHeight - alleyHeight);
    ctx.lineTo(padding + courtWidth, padding + courtHeight - alleyHeight);
    ctx.stroke();

    const serviceLineRatio = 0.27;
    const netX = padding + (courtWidth / 2);
    
    const leftServiceX = netX - (courtWidth * serviceLineRatio);
    ctx.beginPath();
    ctx.moveTo(leftServiceX, padding + alleyHeight);
    ctx.lineTo(leftServiceX, padding + courtHeight - alleyHeight);
    ctx.stroke();

    const rightServiceX = netX + (courtWidth * serviceLineRatio);
    ctx.beginPath();
    ctx.moveTo(rightServiceX, padding + alleyHeight);
    ctx.lineTo(rightServiceX, padding + courtHeight - alleyHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftServiceX, padding + (courtHeight / 2));
    ctx.lineTo(rightServiceX, padding + (courtHeight / 2));
    ctx.stroke();
    
    const centerMarkLength = 10;
    ctx.beginPath();
    ctx.moveTo(padding, padding + (courtHeight / 2));
    ctx.lineTo(padding + centerMarkLength, padding + (courtHeight / 2));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding + courtWidth, padding + (courtHeight / 2));
    ctx.lineTo(padding + courtWidth - centerMarkLength, padding + (courtHeight / 2));
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(netX, padding - 15);
    ctx.lineTo(netX, padding + courtHeight + 15);
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = tool === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    if (tool === 'eraser') {
        ctx.strokeStyle = '#3b82f6';
    } else {
        ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
        {/* Toolkit Sidebar */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4">Инструменты</h3>
                <div className="flex gap-2 mb-4">
                     <button onClick={() => setTool('pen')} className={`p-3 rounded-xl border transition-all ${tool === 'pen' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                         <PenTool size={20}/>
                     </button>
                     <button onClick={() => setTool('eraser')} className={`p-3 rounded-xl border transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                         <Eraser size={20}/>
                     </button>
                     <button onClick={drawCourt} className="p-3 rounded-xl border bg-slate-50 text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-500">
                         <RotateCcw size={20}/>
                     </button>
                </div>
                
                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Цвет маркера</label>
                    <div className="flex gap-2">
                        {['#bef264', '#f59e0b', '#ef4444', '#ffffff'].map(c => (
                            <button 
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <Button variant="outline" className="w-full mb-2" size="sm">
                        <Download size={16} className="mr-2"/> Сохранить схему
                    </Button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex-1 overflow-y-auto max-h-[400px]">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={18}/> Библиотека</h3>
                <div className="space-y-3">
                     {strategies.map((strategy, i) => (
                         <div 
                           key={i} 
                           onClick={() => setSelectedStrategy(strategy)}
                           className={`p-3 rounded-xl border cursor-pointer transition-all hover:bg-slate-50 bg-white border-slate-100 group`}
                         >
                             <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{strategy.title}</span>
                                <ChevronRight size={16} className="text-slate-400 group-hover:text-lime-500 transition-colors" />
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3 bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 relative cursor-crosshair">
            <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                className="w-full h-full block"
            />
            <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur text-white px-3 py-1 rounded-lg text-xs font-bold">
                Тактическая доска PRO
            </div>
        </div>

        {/* Strategy Detail Modal */}
        <Modal isOpen={!!selectedStrategy} onClose={() => setSelectedStrategy(null)} title={selectedStrategy?.title || ''}>
             <div className="space-y-6">
                 <div className="bg-slate-100 rounded-xl h-40 flex items-center justify-center mb-4 border border-slate-200">
                      <PenTool size={48} className="text-slate-300" />
                 </div>
                 <div>
                     <h4 className="text-sm font-bold uppercase text-slate-500 mb-2">Описание тактики</h4>
                     <p className="text-slate-800 text-lg leading-relaxed">
                         {selectedStrategy?.description}
                     </p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <h4 className="font-bold text-blue-800 text-sm mb-1 flex items-center gap-2">
                         <CheckCircle2 size={16}/> Когда применять?
                      </h4>
                      <p className="text-blue-700 text-sm">
                          Идеально подходит для изменения темпа игры или атаки против соперников, играющих глубоко за задней линией.
                      </p>
                 </div>
                 <Button className="w-full" onClick={() => setSelectedStrategy(null)}>Понятно</Button>
             </div>
        </Modal>
    </div>
  );
};

// 9. VideoAnalysisView
const VideoAnalysisView = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            setIsAnalyzed(false);
            
            setTimeout(() => {
                generateRandomAnalysis();
                setIsUploading(false);
                setIsAnalyzed(true);
            }, 2000);
        }
    };

    const generateRandomAnalysis = () => {
        const score = (Math.random() * (9.8 - 5.0) + 5.0).toFixed(1);
        const rpm = Math.floor(Math.random() * (3500 - 1800) + 1800);
        const contactStates = ['Отлично', 'Хорошо', 'Поздно', 'Слишком близко', 'Далеко'];
        const footworkStates = ['Отлично', 'Средне', 'Слабо', 'Нет разножки', 'В статике'];
        const contact = contactStates[Math.floor(Math.random() * contactStates.length)];
        const footwork = footworkStates[Math.floor(Math.random() * footworkStates.length)];
        const feedbackOptions = [
            { type: 'bad', text: 'Поздняя подготовка. Начинай замах, как только мяч отлетел от ракетки соперника.' },
            { type: 'good', text: 'Отличная проводка! Рука расслаблена в конечной фазе удара.' },
            { type: 'bad', text: 'Вес тела остается на задней ноге. Старайся шагать в мяч.' },
            { type: 'good', text: 'Хороший разгон головки ракетки (Lag & Snap).' },
            { type: 'bad', text: 'Точка контакта слишком низко. Сгибай ноги, а не спину.' },
            { type: 'good', text: 'Взгляд зафиксирован на точке удара. Отличная концентрация.' },
            { type: 'bad', text: 'Локоть слишком прижат к туловищу, нет свободы движения.' },
            { type: 'good', text: 'Мощное вращение! Кистевое движение выполнено верно.' }
        ];
        const recs = feedbackOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        const graphData = Array(12).fill(0).map(() => Math.floor(Math.random() * 80) + 20);

        setAnalysisResult({ score, rpm, contact, footwork, recs, graphData });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto min-h-[600px]">
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
            />

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center group border border-slate-800">
                    {!isAnalyzed && !isUploading && (
                        <div className="text-center p-8">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform cursor-pointer" onClick={triggerFileSelect}>
                                <Video size={32} className="text-slate-400"/>
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">Загрузите видео удара</h3>
                            <p className="text-slate-500 mb-6">Поддерживается MP4, MOV до 50MB. <br/>Для лучшего результата снимайте сбоку.</p>
                            <Button variant="secondary" onClick={triggerFileSelect}>Выбрать файл</Button>
                        </div>
                    )}

                    {isUploading && (
                        <div className="text-center">
                             <Loader2 size={48} className="text-lime-400 animate-spin mx-auto mb-4"/>
                             <p className="text-white font-bold animate-pulse">AI анализирует биомеханику...</p>
                        </div>
                    )}

                    {isAnalyzed && (
                        <div className="relative w-full h-full bg-slate-900">
                             <img src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Analysis"/>
                             <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450">
                                 <circle cx="400" cy="150" r="15" stroke="#bef264" strokeWidth="3" fill="transparent" />
                                 <line x1="400" y1="165" x2="400" y2="280" stroke="#bef264" strokeWidth="3" />
                                 <line x1="400" y1="180" x2="350" y2="230" stroke="#bef264" strokeWidth="3" />
                                 <line x1="350" y1="230" x2="320" y2="200" stroke="#bef264" strokeWidth="3" />
                                 <line x1="400" y1="180" x2="450" y2="230" stroke="#bef264" strokeWidth="3" />
                             </svg>
                             <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-lg text-lime-400 text-xs font-bold font-mono">
                                 FRAME: {Math.floor(Math.random() * 100)}/120
                             </div>
                             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 p-2 rounded-xl border border-slate-700 backdrop-blur">
                                 <button className="p-2 hover:bg-white/10 rounded-lg text-white" onClick={() => { setIsAnalyzed(false); }}><RotateCcw size={20}/></button>
                                 <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
                                     <div className="w-1/3 h-full bg-lime-400"></div>
                                 </div>
                                 <span className="text-xs text-slate-400 font-mono">00:04 / 00:12</span>
                             </div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-lg mb-4">График ускорения головки ракетки</h3>
                     <div className="h-32 flex items-end justify-between gap-1 px-2 border-b border-slate-200 pb-2">
                         {(analysisResult?.graphData || [20, 35, 45, 60, 85, 95, 100, 90, 70, 50, 40, 30]).map((h: number, i: number) => (
                             <div key={i} className={`w-full bg-slate-100 rounded-t-sm relative group`} style={{ height: `${h}%` }}>
                                 <div className="absolute bottom-0 w-full bg-lime-500 opacity-0 group-hover:opacity-100 transition-opacity h-full rounded-t-sm"></div>
                             </div>
                         ))}
                     </div>
                     <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                         <span>Замах</span>
                         <span>Контакт</span>
                         <span>Проводка</span>
                     </div>
                </div>
            </div>

            <div className="space-y-6">
                {isAnalyzed && analysisResult ? (
                    <>
                        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-sm text-slate-400 uppercase font-bold mb-1">Оценка удара</div>
                                <div className="text-5xl font-bold text-lime-400 mb-4">{analysisResult.score}</div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Точка контакта</span>
                                        <span className={`font-bold ${analysisResult.contact === 'Отлично' ? 'text-lime-400' : 'text-amber-400'}`}>{analysisResult.contact}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="w-[90%] bg-lime-400 h-full rounded-full"></div></div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span>Вращение (RPM)</span>
                                        <span className="text-amber-400 font-bold">{analysisResult.rpm}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className={`h-full rounded-full bg-amber-400`} style={{width: `${(analysisResult.rpm / 3500) * 100}%`}}></div></div>

                                    <div className="flex justify-between text-sm">
                                        <span>Работа ног</span>
                                        <span className={`font-bold ${analysisResult.footwork === 'Отлично' ? 'text-lime-400' : 'text-red-400'}`}>{analysisResult.footwork}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className="w-[40%] bg-red-400 h-full rounded-full"></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                             <h3 className="font-bold flex items-center gap-2 mb-4"><Bot className="text-blue-500"/> Рекомендации AI</h3>
                             <ul className="space-y-4 text-sm">
                                 {analysisResult.recs.map((rec: any, i: number) => (
                                     <li key={i} className="flex gap-3 items-start">
                                         {rec.type === 'good' ? (
                                             <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={16}/>
                                         ) : (
                                             <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16}/>
                                         )}
                                         <span className="text-slate-700">{rec.text}</span>
                                     </li>
                                 ))}
                             </ul>
                             <Button size="sm" variant="outline" className="w-full mt-6" onClick={() => triggerFileSelect()}>Загрузить другое видео</Button>
                        </div>
                    </>
                ) : (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center h-full flex flex-col justify-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                             <Activity size={24} className="text-slate-400"/>
                         </div>
                         <h3 className="font-bold text-slate-900">Ожидание анализа</h3>
                         <p className="text-slate-500 text-sm mt-2">Загрузите видео, чтобы получить разбор техники.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 10. StudentsView
const StudentsView = ({ user }: { user: User }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'profile' | 'schedule' | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // New Student State
    const [newStudent, setNewStudent] = useState({ name: '', age: '', level: 'Любитель' });
    
    // Edit States
    const [editNotes, setEditNotes] = useState('');
    const [editGoals, setEditGoals] = useState('');
    const [editNextLesson, setEditNextLesson] = useState('');

    useEffect(() => {
        loadStudents();
    }, [user.id]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await api.students.getAll(user.id);
            setStudents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const studentData = {
                coachId: user.id,
                name: newStudent.name,
                age: parseInt(newStudent.age) || 0,
                level: newStudent.level,
                avatar: `https://ui-avatars.com/api/?name=${newStudent.name.replace(' ', '+')}&background=random&color=fff`,
            };
            const created = await api.students.create(studentData);
            setStudents([created, ...students]);
            setIsAddModalOpen(false);
            setNewStudent({ name: '', age: '', level: 'Любитель' });
        } catch (e) {
            alert('Ошибка при создании ученика');
        }
    };

    const handleSaveProfile = async () => {
        if (!selectedStudent) return;
        try {
            const updated = await api.students.update(selectedStudent.id, {
                goals: editGoals,
                notes: editNotes
            });
            setStudents(students.map(s => s.id === updated.id ? updated : s));
            setActiveModal(null);
        } catch (e) {
            alert('Ошибка при сохранении');
        }
    };

    const handleSaveSchedule = async () => {
        if (!selectedStudent) return;
        try {
            const updated = await api.students.update(selectedStudent.id, {
                nextLesson: editNextLesson
            });
            setStudents(students.map(s => s.id === updated.id ? updated : s));
            setActiveModal(null);
        } catch (e) {
            alert('Ошибка при сохранении');
        }
    };

    const openProfile = (student: Student) => {
        setSelectedStudent(student);
        setEditGoals(student.goals || '');
        setEditNotes(student.notes || '');
        setActiveModal('profile');
    };

    const openSchedule = (student: Student) => {
        setSelectedStudent(student);
        setEditNextLesson(student.nextLesson);
        setActiveModal('schedule');
    };

    // Calculate Stats
    const totalIncome = students.reduce((acc, curr) => acc + (curr.balance > 0 ? curr.balance : 0), 0);
    // Logic for next lesson: Find first student with a valid future date string or just take first one if lazy
    // Since date format is loose text ("Tomorrow 18:00"), we'll pick the first student with a value != "Не назначено"
    const nextLessonStudent = students.find(s => s.nextLesson && s.nextLesson !== 'Не назначено');

    return (
        <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80}/></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Активные ученики</div>
                        <div className="text-4xl font-bold text-slate-900 flex items-baseline gap-2">
                             {students.length} <span className="text-sm font-normal text-green-500 flex items-center bg-green-50 px-2 py-0.5 rounded-full"><TrendingUp size={12} className="mr-1"/> {students.length > 0 ? '+1' : '0'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={80}/></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Доход (Месяц)</div>
                        <div className="text-4xl font-bold text-slate-900">
                             {(totalIncome / 1000).toFixed(0)}k <span className="text-sm font-normal text-slate-400">₽</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden text-white group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar size={80}/></div>
                    <div className="relative z-10">
                        <div className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">Следующая тренировка</div>
                        {nextLessonStudent ? (
                            <>
                                <div className="text-2xl font-bold text-white mb-1">
                                    {nextLessonStudent.nextLesson}
                                </div>
                                <div className="text-lime-400 text-sm font-bold">{nextLessonStudent.name}</div>
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white mb-1">
                                    Нет занятий
                                </div>
                                <div className="text-slate-500 text-sm font-bold">Расписание пусто</div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                 <div className="w-full sm:w-auto">
                     <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-lime-600"/> Мои спортсмены
                     </h2>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                     <div className="relative flex-1 sm:flex-initial">
                         <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 w-full sm:w-64 shadow-sm" 
                            placeholder="Поиск ученика..."
                         />
                         <Search size={14} className="absolute left-3 top-3 text-slate-400"/>
                     </div>
                     <Button size="sm" className="gap-2 shadow-lg shadow-slate-900/10" onClick={() => setIsAddModalOpen(true)}>
                        <UserPlus size={16}/> Добавить
                     </Button>
                 </div>
            </div>

            {/* Students Grid */}
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
                ) : filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <div key={student.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-6">
                             <div className="flex items-center gap-4">
                                 <div className="relative">
                                     <img src={student.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100" alt=""/>
                                     <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${student.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}>
                                         {student.status === 'active' ? <Check size={10} className="text-white"/> : <Activity size={10} className="text-white"/>}
                                     </div>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-lg text-slate-900">{student.name}</h3>
                                     <div className="flex items-center gap-2 text-sm text-slate-500">
                                         <span>{student.age} лет</span>
                                         <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                         <span className="font-medium text-slate-700">{student.level}</span>
                                     </div>
                                 </div>
                             </div>
                             <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                                 <MoreVertical size={20}/>
                             </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                 <div className="text-xs text-slate-400 font-bold uppercase mb-1">Баланс</div>
                                 <div className={`font-bold ${student.balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                     {student.balance > 0 ? '+' : ''}{student.balance} ₽
                                 </div>
                             </div>
                             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                 <div className="text-xs text-slate-400 font-bold uppercase mb-1">След. занятие</div>
                                 <div className="font-bold text-slate-900 truncate">
                                     {student.nextLesson}
                                 </div>
                             </div>
                        </div>

                        {student.goals && (
                            <div className="mb-6 bg-lime-50/50 rounded-xl p-3 border border-lime-100">
                                <div className="text-xs text-lime-600 font-bold uppercase mb-1 flex items-center gap-1"><Trophy size={12}/> Цель</div>
                                <p className="text-sm text-slate-700 leading-relaxed truncate">{student.goals}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2 border-t border-slate-50">
                             <Button variant="primary" size="sm" className="flex-1" onClick={() => openSchedule(student)}>Расписание</Button>
                             <Button variant="outline" size="sm" className="flex-1" onClick={() => openProfile(student)}>Профиль</Button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <Users size={48} className="mx-auto mb-3 opacity-20"/>
                        <p className="font-medium text-slate-500">Ученики не найдены. Добавьте первого!</p>
                        <Button size="sm" variant="outline" className="mt-4" onClick={() => setIsAddModalOpen(true)}>Добавить ученика</Button>
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Новый ученик">
                <form onSubmit={handleAddStudent} className="space-y-4">
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">ФИО</label>
                         <input 
                            required 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                            value={newStudent.name}
                            onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Возраст</label>
                             <input 
                                required 
                                type="number" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                                value={newStudent.age}
                                onChange={e => setNewStudent({...newStudent, age: e.target.value})}
                             />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Уровень</label>
                             <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                                value={newStudent.level}
                                onChange={e => setNewStudent({...newStudent, level: e.target.value})}
                             >
                                 <option value="Любитель">Любитель</option>
                                 <option value="Игрок РТТ">Игрок РТТ</option>
                             </select>
                        </div>
                    </div>
                    <Button type="submit" className="w-full mt-4">Создать карточку</Button>
                </form>
            </Modal>

            {/* Profile Modal */}
            <Modal isOpen={activeModal === 'profile' && !!selectedStudent} onClose={() => setActiveModal(null)} title="Профиль ученика">
                 {selectedStudent && (
                     <div className="space-y-6">
                         <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                             <img src={selectedStudent.avatar} className="w-20 h-20 rounded-full object-cover" alt=""/>
                             <div>
                                 <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                                 <div className="text-slate-500 text-sm">{selectedStudent.level}, {selectedStudent.age} лет</div>
                                 <div className={`text-sm font-bold mt-1 ${selectedStudent.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                     Баланс: {selectedStudent.balance} ₽
                                 </div>
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                             <div className="space-y-1">
                                 <label className="text-xs font-bold text-slate-500 uppercase">Цели на сезон</label>
                                 <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 min-h-[80px]"
                                    value={editGoals}
                                    onChange={e => setEditGoals(e.target.value)}
                                 />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-xs font-bold text-slate-500 uppercase">Заметки тренера</label>
                                 <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    placeholder="Над чем работать..."
                                 />
                             </div>
                         </div>
                         
                         <div className="flex gap-3">
                             <Button onClick={handleSaveProfile} className="flex-1"><Save size={16} className="mr-2"/> Сохранить</Button>
                             <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-500 hover:text-red-600"><Trash2 size={16}/></Button>
                         </div>
                     </div>
                 )}
            </Modal>

            {/* Schedule Modal */}
            <Modal isOpen={activeModal === 'schedule' && !!selectedStudent} onClose={() => setActiveModal(null)} title="Планирование">
                 {selectedStudent && (
                     <div className="space-y-6">
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                             <Clock className="text-slate-400"/>
                             <div>
                                 <div className="text-xs font-bold text-slate-400 uppercase">Текущая запись</div>
                                 <div className="font-bold text-slate-900">{selectedStudent.nextLesson}</div>
                             </div>
                         </div>

                         <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Новое время</label>
                             <input 
                                type="text" 
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Например: Завтра, 18:00"
                                value={editNextLesson}
                                onChange={e => setEditNextLesson(e.target.value)}
                             />
                         </div>
                         
                         <Button onClick={handleSaveSchedule} className="w-full">Подтвердить время</Button>
                     </div>
                 )}
            </Modal>
        </div>
    );
};

// 11. LadderView
const LadderView = ({ user }: { user: User }) => {
    const [players, setPlayers] = useState<LadderPlayer[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [selectedOpponent, setSelectedOpponent] = useState<LadderPlayer | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ladderData, challengesData] = await Promise.all([
                api.ladder.getRankings(),
                api.ladder.getChallenges()
            ]);
            setPlayers(ladderData);
            setChallenges(challengesData);
        } catch (e) {
            console.error("Failed to load ladder", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChallenge = (opponent: LadderPlayer) => {
        setSelectedOpponent(opponent);
        setIsChallengeModalOpen(true);
    };

    const confirmChallenge = async () => {
        if (!selectedOpponent) return;
        const challenger = players.find(p => p.userId === user.id) || players[players.length - 1];
        const newChallenge = await api.ladder.createChallenge(challenger, selectedOpponent);
        setChallenges([newChallenge, ...challenges]);
        setIsChallengeModalOpen(false);
    };

    const currentUserRank = players.find(p => p.userId === user.id)?.rank || 999;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400 rounded-full blur-[100px] opacity-20"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                         <div>
                             <div className="flex items-center gap-2 text-lime-400 font-bold uppercase tracking-wider text-xs mb-2">
                                 <Trophy size={14}/> Сезон 2024
                             </div>
                             <h2 className="text-3xl font-bold mb-1">Осенний Рейтинг</h2>
                             <p className="text-slate-400 text-sm">Ваша текущая позиция: <span className="text-white font-bold">#{currentUserRank}</span></p>
                         </div>
                         <div className="flex items-center gap-4 bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/10">
                             <div className="text-center">
                                 <div className="text-2xl font-bold">28</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-bold">Матчей</div>
                             </div>
                             <div className="w-px h-8 bg-white/10"></div>
                             <div className="text-center">
                                 <div className="text-2xl font-bold text-lime-400">65%</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-bold">Побед</div>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Таблица лидеров</h3>
                        <Button variant="ghost" size="sm">Правила</Button>
                    </div>
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {players.map((player) => {
                                const isCurrentUser = player.userId === user.id;
                                const canChallenge = !isCurrentUser && player.rank < currentUserRank;
                                return (
                                    <div key={player.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${isCurrentUser ? 'bg-lime-50' : ''}`}>
                                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg rounded-xl shrink-0 ${
                                            player.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                            player.rank === 2 ? 'bg-slate-200 text-slate-700' :
                                            player.rank === 3 ? 'bg-orange-100 text-orange-800' :
                                            'bg-slate-50 text-slate-500'
                                        }`}>
                                            #{player.rank}
                                        </div>
                                        <div className="relative">
                                            <img src={player.avatar} className="w-12 h-12 rounded-full object-cover border border-slate-200" alt=""/>
                                            {player.status === 'defending' && (
                                                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold border border-white" title="Защищает позицию">DEF</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold truncate ${isCurrentUser ? 'text-lime-700' : 'text-slate-900'}`}>{player.name} {isCurrentUser && '(Вы)'}</h4>
                                            </div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{player.points} очков</span>
                                                <span>•</span>
                                                <span>{player.matches} игр</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                           {canChallenge ? (
                                               <Button size="sm" variant="outline" className="border-slate-200 hover:border-lime-400 hover:text-lime-600 hover:bg-lime-50" onClick={() => handleChallenge(player)}>
                                                   <Swords size={16} className="mr-2"/> Вызвать
                                               </Button>
                                           ) : isCurrentUser ? (
                                               <span className="text-xs font-bold text-lime-600 bg-lime-100 px-2 py-1 rounded-md">Ваша позиция</span>
                                           ) : (
                                               <span className="text-xs text-slate-400 font-medium">Ниже вас</span>
                                           )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Swords size={18} className="text-red-500"/> Активные вызовы</h3>
                    {challenges.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p>Нет активных вызовов</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {challenges.map(c => (
                                <div key={c.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {c.status === 'pending' ? 'Ожидает ответа' : c.status === 'scheduled' ? 'Матч назначен' : 'Завершен'}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {c.status}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-between mb-4">
                                        <div className="font-bold text-sm text-slate-900">{c.challengerName}</div>
                                        <div className="text-xs text-slate-400">VS</div>
                                        <div className="font-bold text-sm text-slate-900">{c.defenderName}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                                        <Timer size={14} className="text-red-400"/>
                                        <span>Дедлайн: {new Date(c.deadline).toLocaleDateString()}</span>
                                    </div>
                                    {c.status === 'pending' && c.defenderId === user.id && (
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <Button size="sm" variant="outline" className="text-xs">Отклонить</Button>
                                            <Button size="sm" className="text-xs">Принять</Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Modal isOpen={isChallengeModalOpen} onClose={() => setIsChallengeModalOpen(false)} title="Бросить вызов">
                 {selectedOpponent && (
                     <div className="space-y-6">
                         <div className="text-center">
                             <img src={selectedOpponent.avatar} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-slate-100" alt=""/>
                             <h3 className="text-xl font-bold">{selectedOpponent.name}</h3>
                             <p className="text-slate-500">Позиция #{selectedOpponent.rank}</p>
                         </div>
                         <div className="bg-lime-50 p-4 rounded-xl border border-lime-100 text-sm text-lime-900">
                             <p>Если вы победите, вы займете место соперника (#{selectedOpponent.rank}), а он сместится на одну позицию вниз.</p>
                         </div>
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Предпочтительное время</label>
                             <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none">
                                 <option>Будние, вечер</option>
                                 <option>Выходные, утро</option>
                                 <option>Выходные, вечер</option>
                             </select>
                         </div>
                         <Button className="w-full gap-2" onClick={confirmChallenge}>
                             <Swords size={18}/> Отправить вызов
                         </Button>
                     </div>
                 )}
            </Modal>
        </div>
    );
};

// 12. CommunityView
const CommunityView = () => {
  const news = [
    { title: 'Итоги турнира Moscow Open 2024', category: 'Турниры', date: 'Сегодня', image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=400&auto=format&fit=crop' },
    { title: 'Как выбрать струны для вращения?', category: 'Экипировка', date: 'Вчера', image: 'https://images.unsplash.com/photo-1617083934555-52951271b273?q=80&w=400&auto=format&fit=crop' },
    { title: 'Мастер-класс от тренеров РТТ', category: 'Обучение', date: '22 Окт', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop' },
  ];

  const topics = [
    { title: 'Партнер на севере Москвы', author: 'Alex99', replies: 12 },
    { title: 'Отзывы о корте "Искра"', author: 'TennisFan', replies: 8 },
    { title: 'Продам Head Radical MP', author: 'ProSeller', replies: 3 },
  ];

  return (
    <div className="space-y-8">
        {/* Top Section: News Grid */}
        <section>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-lime-600"/> Главное сегодня</h2>
             <a href="#" className="text-sm font-bold text-slate-500 hover:text-slate-900">Все новости</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {news.map((item, i) => (
               <div key={i} className="group cursor-pointer">
                  <div className="rounded-3xl overflow-hidden h-48 mb-4 relative shadow-sm border border-slate-200">
                     <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                     <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{item.category}</div>
                  </div>
                  <div className="text-xs text-slate-400 font-bold mb-1">{item.date}</div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-lime-600 transition-colors">{item.title}</h3>
               </div>
             ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Forum Section */}
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="text-blue-500"/> Locker Room (Форум)</h2>
                    <Button variant="outline" size="sm">Новая тема</Button>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {topics.map((t, i) => (
                      <div key={i} className="py-4 flex items-center justify-between hover:bg-slate-50 transition-colors -mx-4 px-4 rounded-xl cursor-pointer">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                               {t.author[0]}
                            </div>
                            <div>
                               <h4 className="font-bold text-slate-900">{t.title}</h4>
                               <p className="text-xs text-slate-400">Автор: {t.author}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <MessageCircle size={14} /> {t.replies}
                         </div>
                      </div>
                    ))}
                 </div>
                 <button className="w-full py-3 mt-4 text-sm font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">Показать еще</button>
              </div>
           </div>

           {/* Sidebar: Tournament & Ranking */}
           <div className="space-y-6">
              {/* Upcoming Tournament */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden">
                 <div className="absolute -right-6 -top-6 w-32 h-32 bg-lime-400 rounded-full blur-[50px] opacity-20"></div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 text-lime-400 text-xs font-bold uppercase tracking-wider mb-4">
                       <Calendar size={14}/> 26-27 Октября
                    </div>
                    <h3 className="text-xl font-bold mb-2">Weekend Cup Amateur</h3>
                    <p className="text-slate-400 text-sm mb-6">Одиночный разряд, категория Masters. Призовой фонд 50 000 ₽.</p>
                    <Button variant="secondary" className="w-full">Регистрация</Button>
                 </div>
              </div>

              {/* Top Players */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Trophy className="text-amber-400"/> Топ недели</h3>
                 <div className="space-y-4">
                    {[1,2,3].map(i => (
                       <div key={i} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 1 ? 'bg-amber-100 text-amber-600' : i === 2 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                             {i}
                          </div>
                          <img src={`https://picsum.photos/seed/u${i}/40/40`} className="w-10 h-10 rounded-full" alt=""/>
                          <div className="flex-1">
                             <div className="font-bold text-sm">Игрок {i}</div>
                             <div className="text-xs text-slate-400">1450 очков</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
    </div>
  );
};

export default Dashboard;

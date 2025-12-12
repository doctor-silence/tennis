
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
  ExternalLink,
  Filter,
  Heart,
  Share2
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

// 3. CourtBookingView (UPDATED: Expandable Card Pattern & Filtering)
const CourtBookingView = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Все города');
  const [selectedSurface, setSelectedSurface] = useState('Все покрытия');

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

  // Common cities for filter dropdown (consistent with PartnerSearchView + typical mock data cities)
  const cities = [
      "Все города", 
      "Москва", 
      "Санкт-Петербург", 
      "Новосибирск", 
      "Екатеринбург", 
      "Казань", 
      "Нижний Новгород", 
      "Челябинск", 
      "Самара", 
      "Омск", 
      "Ростов-на-Дону", 
      "Уфа", 
      "Красноярск", 
      "Воронеж", 
      "Пермь", 
      "Волгоград", 
      "Краснодар", 
      "Саратов",
      "Тюмень",
      "Тольятти",
      "Сочи", 
      "Химки", 
      "Мытищи"
  ].sort((a, b) => a === "Все города" ? -1 : b === "Все города" ? 1 : a.localeCompare(b));

  const surfaces = [
      { value: 'Все покрытия', label: 'Все покрытия' },
      { value: 'hard', label: 'Хард (Hard)' },
      { value: 'clay', label: 'Грунт (Clay)' },
      { value: 'grass', label: 'Трава (Grass)' },
      { value: 'carpet', label: 'Ковер (Carpet)' }
  ];

  const filteredCourts = courts.filter(court => {
      const matchesSearch = (court.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             court.address.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCity = selectedCity === 'Все города' || court.address.toLowerCase().includes(selectedCity.toLowerCase());
      const matchesSurface = selectedSurface === 'Все покрытия' || court.surface === selectedSurface;
      return matchesSearch && matchesCity && matchesSurface;
  });

  return (
    <div className="space-y-6">
       {/* Filters Bar */}
       <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Название клуба или адрес..." 
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <select 
                    className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none text-sm w-1/2 md:w-auto"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                >
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                    className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none text-sm w-1/2 md:w-auto"
                    value={selectedSurface}
                    onChange={e => setSelectedSurface(e.target.value)}
                >
                    {surfaces.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
       </div>

       {loading ? (
         <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-auto grid-flow-row-dense">
            {filteredCourts.length > 0 ? filteredCourts.map(c => {
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
            )}) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Map size={32} className="text-slate-400"/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Корты не найдены</h3>
                    <p className="text-slate-500 text-sm mt-1">Попробуйте изменить параметры поиска</p>
                </div>
            )}
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

// 4. AI Coach View
const AiCoachView = ({ user }: { user: User }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!query.trim()) return;
    setLoading(true);
    try {
      const res = await getTennisAdvice(query);
      setResponse(res);
    } catch(err) {
      setResponse("Не удалось получить ответ. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-lime-400/20">
                <Bot size={24} />
             </div>
             <div>
                <h3 className="font-bold text-lg text-slate-900">AI Тренер</h3>
                <p className="text-slate-500 text-sm">Спроси совета по тактике, технике или психологии</p>
             </div>
          </div>
          
          {response && (
            <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-800 animate-fade-in-up">
               <div className="font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-500"><Zap size={14} className="text-lime-500 fill-lime-500"/> Ответ тренера</div>
               <div className="leading-relaxed whitespace-pre-wrap">{response}</div>
            </div>
          )}

          <form onSubmit={handleAsk} className="relative">
             <input 
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-4 pr-14 outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                placeholder="Например: Как улучшить вторую подачу?"
             />
             <button type="submit" disabled={loading} className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-slate-900/20">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
             </button>
          </form>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {["Как обыграть «качалу»?", "Тактика против левши", "Упражнения для работы ног", "Как не нервничать на тай-брейке?"].map((q, i) => (
               <button key={i} onClick={() => setQuery(q)} className="p-4 bg-white border border-slate-200 rounded-2xl text-left text-sm font-medium text-slate-600 hover:border-lime-400 hover:text-slate-900 transition-all">
                   {q}
               </button>
           ))}
       </div>
    </div>
  );
};

// 5. Messages View
const MessagesView = () => (
    <div className="flex h-[600px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="w-1/3 border-r border-slate-100 bg-slate-50">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Сообщения</div>
            <div className="overflow-y-auto h-full pb-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`p-4 hover:bg-white cursor-pointer transition-colors border-b border-slate-100 ${i === 1 ? 'bg-white border-l-4 border-l-lime-400' : ''}`}>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0">
                                <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-full h-full rounded-full" alt=""/>
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-bold text-sm text-slate-900 truncate">Александр Петров</div>
                                <div className="text-xs text-slate-500 truncate mt-1">Привет, сыграем в субботу?</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="font-bold">Александр Петров</div>
                <Button variant="ghost" size="sm"><MoreVertical size={16}/></Button>
            </div>
            <div className="flex-1 p-4 bg-slate-50 space-y-4 overflow-y-auto">
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 max-w-[80%] text-sm">
                        Привет! Как насчет игры в субботу в 10:00?
                    </div>
                </div>
                <div className="flex justify-end">
                    <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-lg shadow-slate-900/20">
                        Привет! Да, отлично. Забронируешь корт?
                    </div>
                </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative">
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-slate-900" placeholder="Написать сообщение..."/>
                    <button className="absolute right-2 top-2 p-2 text-lime-600 hover:bg-lime-50 rounded-lg"><Send size={18}/></button>
                </div>
            </div>
        </div>
    </div>
);

// 6. Settings View
const SettingsView = ({ user }: { user: User }) => (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Настройки профиля</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Имя</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none text-slate-500" value={user.name} readOnly />
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none text-slate-500" value={user.email} readOnly />
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-bold mb-4">Уведомления</h4>
                    <div className="space-y-2">
                        {['Новые сообщения', 'Приглашения на матч', 'Напоминания о тренировках', 'Новости клуба'].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-medium">{item}</span>
                                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${i < 2 ? 'bg-lime-400' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${i < 2 ? 'left-5' : 'left-1'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
         <Button variant="outline" className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600">Удалить аккаунт</Button>
    </div>
);

// 7. Notifications View
const NotificationsView = () => (
    <div className="max-w-2xl mx-auto space-y-4">
        {[
            { title: 'Приглашение на матч', text: 'Алексей Иванов приглашает вас сыграть в ТК "Спартак".', time: '2 часа назад', type: 'invite' },
            { title: 'Тренировка завтра', text: 'Напоминаем, что у вас забронирован корт на завтра в 18:00.', time: '5 часов назад', type: 'system' },
            { title: 'Новый турнир', text: 'Открыта регистрация на Weekend Cup Amateur.', time: '1 день назад', type: 'news' }
        ].map((n, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === 'invite' ? 'bg-blue-100 text-blue-600' : n.type === 'system' ? 'bg-amber-100 text-amber-600' : 'bg-lime-100 text-lime-600'}`}>
                    {n.type === 'invite' ? <UserPlus size={20}/> : n.type === 'system' ? <Clock size={20}/> : <Trophy size={20}/>}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900">{n.title}</h4>
                        <span className="text-xs text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.text}</p>
                    {n.type === 'invite' && (
                        <div className="flex gap-2 mt-3">
                            <Button size="sm">Принять</Button>
                            <Button size="sm" variant="outline">Отклонить</Button>
                        </div>
                    )}
                </div>
            </div>
        ))}
    </div>
);

// 8. Tactics View
const TacticsView = () => (
    <div className="h-[700px] bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
            <div className="flex gap-2">
                <Button size="sm" variant="ghost"><PenTool size={18}/></Button>
                <Button size="sm" variant="ghost"><Eraser size={18}/></Button>
                <Button size="sm" variant="ghost"><RotateCcw size={18}/></Button>
            </div>
            <div className="font-bold text-slate-900">Тактическая доска</div>
            <Button size="sm" variant="primary" className="gap-2"><Save size={16}/> Сохранить</Button>
        </div>
        <div className="flex-1 bg-green-800 relative flex items-center justify-center overflow-hidden">
             {/* Simple CSS Court */}
             <div className="w-[80%] h-[80%] border-2 border-white relative">
                 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/50 -translate-y-1/2"></div>
                 <div className="absolute top-0 left-1/2 h-full w-0.5 bg-white/50 -translate-x-1/2"></div>
                 <div className="absolute top-[20%] left-[20%] right-[20%] bottom-[20%] border border-white/30"></div>
                 {/* Mock Players */}
                 <div className="absolute top-[80%] left-[60%] w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold">A</div>
                 <div className="absolute top-[20%] left-[40%] w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold">B</div>
                 {/* Mock Arrow */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none">
                     <path d="M 60% 80% Q 50% 50% 40% 25%" stroke="yellow" strokeWidth="2" fill="none" strokeDasharray="5,5" markerEnd="url(#arrowhead)"/>
                     <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="yellow" />
                        </marker>
                      </defs>
                 </svg>
             </div>
             <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-xs backdrop-blur">
                 Drag to move players. Draw to show trajectory.
             </div>
        </div>
    </div>
);

// 9. Students View (CRM)
const StudentsView = ({ user }: { user: User }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
             setLoading(true);
             try {
                const data = await api.students.getAll(user.id);
                setStudents(data);
             } catch(e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [user.id]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h3 className="font-bold text-xl">Мои ученики</h3>
                 <Button className="gap-2"><Plus size={18}/> Добавить ученика</Button>
            </div>
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400"/></div>
            ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {students.map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-14 h-14 rounded-full bg-slate-100 object-cover" alt=""/>
                                <div>
                                    <div className="font-bold text-lg text-slate-900">{s.name}</div>
                                    <div className="text-sm text-slate-500">{s.age} лет • {s.level}</div>
                                </div>
                            </div>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Баланс</span>
                                    <span className={`font-bold ${s.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{s.balance} ₽</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">След. занятие</span>
                                    <span className="font-bold text-slate-900">{s.nextLesson}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1">Расписание</Button>
                                <Button size="sm" className="flex-1 bg-slate-900 text-white">Профиль</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <Users size={48} className="mx-auto text-slate-300 mb-4"/>
                    <h3 className="font-bold text-lg text-slate-900">Учеников пока нет</h3>
                    <p className="text-slate-500 text-sm mb-4">Добавьте первого ученика, чтобы вести учет тренировок.</p>
                    <Button variant="outline">Добавить ученика</Button>
                </div>
            )}
        </div>
    );
};

// 10. Video Analysis View
const VideoAnalysisView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
        <div className="lg:col-span-2 bg-black rounded-3xl overflow-hidden relative flex items-center justify-center group">
            <img src="https://images.unsplash.com/photo-1599474924187-334a405be655?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Analysis"/>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <Play size={32} className="text-white fill-white ml-2"/>
                </div>
            </div>
            <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex justify-between items-end">
                    <div>
                         <h3 className="text-white font-bold text-xl">Разбор техники форхенда</h3>
                         <p className="text-white/60 text-sm">Загружено: Сегодня, 14:30</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="text-white hover:text-lime-400 transition-colors"><Info size={24}/></button>
                        <button className="text-white hover:text-lime-400 transition-colors"><Settings size={24}/></button>
                    </div>
                </div>
                {/* Timeline Mock */}
                <div className="mt-4 h-1 bg-white/20 rounded-full relative">
                    <div className="absolute top-0 left-0 h-full w-[30%] bg-lime-400 rounded-full"></div>
                    <div className="absolute top-1/2 left-[30%] w-3 h-3 bg-white rounded-full -translate-y-1/2 shadow-lg"></div>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold bg-slate-50">Комментарии AI</div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {[
                    { time: '0:05', text: 'Замах слишком высокий. Попробуйте опустить головку ракетки раньше.' },
                    { time: '0:12', text: 'Отличная работа ног! Выход к мячу своевременный.' },
                    { time: '0:24', text: 'Точка контакта немного сзади. Встречайте мяч перед собой.' }
                ].map((c, i) => (
                    <div key={i} className="flex gap-3 items-start">
                        <span className="text-xs font-bold bg-slate-900 text-lime-400 px-2 py-1 rounded shrink-0">{c.time}</span>
                        <p className="text-sm text-slate-700 leading-snug">{c.text}</p>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-slate-200">
                <Button className="w-full gap-2"><Upload size={18}/> Загрузить новое видео</Button>
            </div>
        </div>
    </div>
);

// 11. Ladder View
const LadderView = ({ user }: { user: User }) => {
    const [players, setPlayers] = useState<LadderPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.ladder.getRankings().then(data => {
            setPlayers(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Сезонная лига 2024</h3>
                    <p className="text-slate-400 mb-6 max-w-lg">Соревнуйтесь с игроками своего уровня, повышайте рейтинг и выигрывайте призы от спонсоров.</p>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-lime-400">12</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Дней до конца</div>
                        </div>
                        <div className="w-px bg-slate-800"></div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">154</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Участника</div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-lime-500/20 to-transparent"></div>
                <Trophy className="absolute bottom-[-20px] right-[-20px] text-slate-800 rotate-12" size={200}/>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h4 className="font-bold text-lg">Топ игроков</h4>
                     <div className="flex gap-2">
                         <Button size="sm" variant="secondary">Моя лига</Button>
                         <Button size="sm" variant="outline">Общий рейтинг</Button>
                     </div>
                 </div>
                 {loading ? (
                     <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>
                 ) : (
                     <div className="divide-y divide-slate-100">
                         {players.map((p) => (
                             <div key={p.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${p.userId === user.id ? 'bg-lime-50/50' : ''}`}>
                                 <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg ${p.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                     {p.rank}
                                 </div>
                                 <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                     <img src={p.avatar} alt={p.name} className="w-full h-full object-cover"/>
                                 </div>
                                 <div className="flex-1">
                                     <div className="font-bold text-slate-900 flex items-center gap-2">
                                         {p.name}
                                         {p.userId === user.id && <span className="text-[10px] bg-lime-400 text-slate-900 px-1.5 py-0.5 rounded font-bold">ВЫ</span>}
                                     </div>
                                     <div className="text-xs text-slate-500">{p.matches} матчей • {p.winRate}% побед</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="font-bold text-slate-900">{p.points}</div>
                                     <div className="text-[10px] text-slate-400 uppercase font-bold">Очков</div>
                                 </div>
                                 {p.userId !== user.id && (
                                     <Button size="sm" variant="outline" className="ml-4">Вызвать</Button>
                                 )}
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        </div>
    );
};

// 12. Community View
const CommunityView = () => (
    <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-4 mb-6 flex gap-4 items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <UserIcon size={20}/>
            </div>
            <input className="flex-1 bg-slate-50 border-none rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-lime-400 placeholder:text-slate-400" placeholder="Поделитесь результатами или найдите спарринг..."/>
            <Button className="bg-slate-900 text-white"><Send size={18}/></Button>
        </div>

        <div className="space-y-6">
             {[1, 2].map(i => (
                 <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-4">
                         <img src={`https://i.pravatar.cc/150?u=${i+20}`} className="w-10 h-10 rounded-full" alt=""/>
                         <div>
                             <div className="font-bold text-slate-900">Мария Шарапова</div>
                             <div className="text-xs text-slate-400">2 часа назад • Москва</div>
                         </div>
                     </div>
                     <p className="text-slate-700 mb-4 leading-relaxed">
                         Отличная тренировка сегодня в Лужниках! Отрабатывали удары с лета. Ищу партнера на выходные, уровень NTRP 4.0+. Пишите в личку! 🎾
                     </p>
                     {i === 1 && (
                         <div className="mb-4 rounded-2xl overflow-hidden h-64">
                             <img src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Post"/>
                         </div>
                     )}
                     <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                         <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors"><Heart size={20}/> <span className="text-sm font-bold">24</span></button>
                         <button className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"><MessageCircle size={20}/> <span className="text-sm font-bold">5</span></button>
                         <button className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors ml-auto"><Share2 size={20}/></button>
                     </div>
                 </div>
             ))}
        </div>
    </div>
);

export default Dashboard;

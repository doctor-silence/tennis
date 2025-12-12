
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
  Map
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

// 1. ProfileView (Restored + Expanded Match History)
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getPartners();
        setPartners(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
           <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
           <input type="text" placeholder="Поиск по имени..." className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {partners.map(p => (
             <div key={p.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-center mb-4 relative">
                  <div className="w-24 h-24 rounded-full p-1 border-2 border-dashed border-slate-200">
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
      )}
    </div>
  );
};

// 3. CourtBookingView
const CourtBookingView = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
       setLoading(true);
       try { const data = await api.getCourts(); setCourts(data); } 
       catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
       {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={40} /></div> : (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courts.map(c => (
              <div key={c.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col sm:flex-row h-auto sm:h-56 group cursor-pointer hover:shadow-xl transition-all duration-300">
                 <div className="w-full sm:w-56 h-48 sm:h-full bg-slate-200 shrink-0 relative overflow-hidden">
                    <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={c.name} />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                       <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm text-white ${c.surface === 'clay' ? 'bg-orange-600' : c.surface === 'hard' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{c.surface === 'clay' ? 'Грунт' : c.surface === 'hard' ? 'Хард' : 'Ковер'}</span>
                    </div>
                 </div>
                 <div className="p-6 flex flex-col justify-between w-full">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{c.name}</h3>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1"><MapPin size={14}/> {c.address}</p>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                        <div>
                          <div className="text-xs text-slate-400 font-bold uppercase">Цена</div>
                          <div className="text-xl font-bold text-slate-900">{c.pricePerHour} ₽ <span className="text-sm font-normal text-slate-400">/ час</span></div>
                        </div>
                        <Button size="sm">Забронировать</Button>
                    </div>
                 </div>
              </div>
            ))}
         </div>
       )}
    </div>
  );
};

// 4. AiCoachView
const AiCoachView = ({ user }: { user: User }) => {
   const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'system', text: `Привет, ${user.name}! Я твой персональный AI-тренер.` }]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg: ChatMessage = { role: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      try {
        const advice = await getTennisAdvice(userMsg.text);
        setMessages(prev => [...prev, { role: 'model', text: advice }]);
      } catch (e) { setMessages(prev => [...prev, { role: 'system', text: 'Ошибка сети' }]); } 
      finally { setLoading(false); }
   };

   return (
     <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center gap-3">
           <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center text-slate-900"><Bot size={24} /></div>
           <div><div className="font-bold">AI Coach</div><div className="text-xs text-slate-400">Gemini 2.5</div></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
           {messages.map((msg, i) => (
             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : msg.role === 'system' ? 'bg-transparent text-slate-400 text-xs font-bold uppercase' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                   {msg.text}
                </div>
             </div>
           ))}
           {loading && <div className="text-center text-xs text-slate-400">Печатает...</div>}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-2">
           <input className="flex-1 bg-slate-50 rounded-xl px-4 py-3 outline-none border border-slate-200" placeholder="Спроси совета..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
           <Button onClick={handleSend} disabled={loading} size="sm"><Send size={18} /></Button>
        </div>
     </div>
   );
};

// 5. MessagesView
const MessagesView = () => (
    <div className="flex h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 items-center justify-center text-slate-400">
        <div className="text-center">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
            <p>Выберите чат для начала общения</p>
        </div>
    </div>
);

// 6. SettingsView
const SettingsView = ({ user }: { user: User }) => (
  <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
     <h2 className="text-2xl font-bold mb-6">Настройки</h2>
     <div className="space-y-6">
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
           <div><div className="font-bold">Уведомления</div><div className="text-sm text-slate-500">Получать оповещения о матчах</div></div>
           <div className="w-12 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
        </div>
        <div className="pt-4"><Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 w-full">Удалить аккаунт</Button></div>
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
           <p className="text-slate-500 text-sm">Завтра в 18:00 игра с Алексеем.</p>
        </div>
     </div>
  </div>
);

// 8. TacticsView
const TacticsView = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <h3 className="font-bold mb-4">Инструменты</h3>
                <div className="flex gap-2"><div className="p-2 bg-slate-900 text-white rounded"><PenTool size={20}/></div></div>
            </div>
            <div className="lg:col-span-3 bg-slate-800 rounded-3xl border-4 border-slate-900 relative flex items-center justify-center">
                <span className="text-slate-500 font-bold">Тактическая доска (Canvas)</span>
            </div>
        </div>
    )
}

// 9. VideoAnalysisView
const VideoAnalysisView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <div className="lg:col-span-2 bg-black rounded-3xl flex items-center justify-center border border-slate-800 relative group cursor-pointer">
            <div className="text-center">
                <Video size={48} className="text-slate-600 mx-auto mb-4 group-hover:text-lime-400 transition-colors"/>
                <p className="text-slate-400 font-bold">Загрузить видео удара</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <h3 className="font-bold mb-4">Анализ AI</h3>
            <p className="text-slate-500 text-sm">Загрузите видео для получения разбора техники.</p>
        </div>
    </div>
)

// 10. StudentsView
const StudentsView = ({ user }: { user: User }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Мои ученики</h2>
            <Button size="sm"><UserPlus size={16} className="mr-2"/> Добавить</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center py-12 text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-30"/>
                <p>Список учеников пуст</p>
            </div>
        </div>
    </div>
)

// 11. LadderView
const LadderView = ({ user }: { user: User }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4">Таблица лидеров</h3>
            <div className="flex items-center justify-center h-40 text-slate-400">Загрузка рейтинга...</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4">Вызовы</h3>
            <div className="text-sm text-slate-500">Нет активных вызовов</div>
        </div>
    </div>
)

// 12. CommunityView
const CommunityView = () => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-3xl h-48 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-200 group-hover:scale-105 transition-transform duration-500"></div>
                    <div className="absolute bottom-4 left-4 font-bold text-slate-900">Новость {i}</div>
                </div>
            ))}
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200">
            <h3 className="font-bold mb-4 flex items-center gap-2"><MessageCircle className="text-blue-500"/> Форум</h3>
            <div className="text-slate-500 text-center py-8">Обсуждения загружаются...</div>
        </div>
    </div>
)

export default Dashboard;

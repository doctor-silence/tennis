
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, LogOut, Bell, 
  User as UserIcon, Swords, Globe, Bot, Menu, X,
  Search, MapPin, BookOpen, Mail, Users, Trophy, BarChart3, Video
} from 'lucide-react';
import { User, DashboardTab, Conversation, Challenge } from '../types';
import Sidebar from './dashboard/Sidebar';
import { NavButton } from './Shared';
import { api } from '../services/api';

// Import Views
import ProfileView from './dashboard/ProfileView';
import CourtBookingView from './dashboard/CourtBookingView';
import PartnerSearchView from './dashboard/PartnerSearchView';
import AiCoachView from './dashboard/AiCoachView';
import { MessagesView, NotificationsView, LadderView, CommunityView } from './dashboard/CommunityViews';
import { TacticsView, VideoAnalysisView, StudentsView } from './dashboard/ToolViews';
import { TournamentsView } from './dashboard/TournamentsView';
import { MyApplications } from './dashboard/MyApplications';
import { RttStatsView } from './dashboard/RttStatsView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (data: Partial<User>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [unreadLadderNotifications, setUnreadLadderNotifications] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);

  const incrementFeedVersion = () => setFeedVersion(v => v + 1);

  const fetchUnreadCount = () => {
    api.notifications.getUnreadCount(user.id).then(data => {
        console.log("Unread count fetched:", data.count);
        console.log("Setting unreadLadderNotifications to:", data.count);
        setUnreadLadderNotifications(data.count);
        console.log("State should now be:", data.count);
    }).catch(err => {
        console.error("Failed to fetch unread count:", err);
    });
  }

  // Debug: log state changes
  useEffect(() => {
    console.log("unreadLadderNotifications state changed to:", unreadLadderNotifications);
  }, [unreadLadderNotifications]);

  useEffect(() => {
    api.messages.getConversations(user.id).then(data => {
      setConversations(data);
      setLoadingConversations(false);
    });
    api.ladder.getChallenges(user.id).then(setChallenges);
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 15000); // Poll every 15 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [user.id]);

  const totalUnread = conversations.reduce((sum, convo) => sum + (convo.unread || 0), 0);

  const handleNavigate = (tab: DashboardTab) => setActiveTab(tab);
  
  const handleStartConversation = async (partnerId: string) => {
    try {
      const conversation = await api.messages.getOrCreateConversation(user.id, partnerId);
      if (conversation) {
        // Check if conversation already exists to avoid duplicates
        if (!conversations.find(c => c.id === conversation.id)) {
            setConversations(prev => [conversation, ...prev]);
        }
        setActiveConversationId(conversation.id);
        setActiveTab('messages');
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  const handleCreateChallenge = async (opponentId: string) => {
    try {
        const rankings = await api.ladder.getRankings('club_elo');
        const challenger = rankings.find(p => p.userId === user.id);
        const opponent = rankings.find(p => p.userId === opponentId);

        if (challenger && opponent) {
            const newChallenge = await api.ladder.createChallenge(challenger, opponent, 'friendly');
            setChallenges(prev => [newChallenge, ...prev]);
            setActiveTab('ladder');
        } else {
            console.error("Could not find challenger or opponent in rankings");
        }
    } catch (error) {
        console.error("Failed to create challenge:", error);
    }
  };
  
  const handleConversationsUpdate = (updatedConversations: Conversation[]) => {
    setConversations(updatedConversations);
  };
  
  const handleNotificationsRead = () => {
      setUnreadLadderNotifications(0);
  };

  const renderContent = () => {
    const views: { [key in DashboardTab]?: React.ReactNode } = {
        profile: <ProfileView user={user} onUserUpdate={onUserUpdate} />,
        search: <PartnerSearchView onNavigate={handleNavigate} onStartConversation={handleStartConversation} onCreateChallenge={handleCreateChallenge} />,
        courts: <CourtBookingView />,
        ai_coach: <AiCoachView user={user} />,
        messages: <MessagesView 
            user={user} 
            activeConversationId={activeConversationId} 
            onConversationSelect={setActiveConversationId}
            conversations={conversations}
            loadingConversations={loadingConversations}
            onConversationsUpdate={handleConversationsUpdate}
        />,
        notifications: <NotificationsView user={user} onNotificationsRead={handleNotificationsRead} />,
        tactics: <TacticsView user={user} />,
        students: <StudentsView user={user} />,
        tournaments: <TournamentsView user={user} onTournamentUpdate={incrementFeedVersion} />,
        video_analysis: <VideoAnalysisView />,
        ladder: <LadderView user={user} challenges={challenges} setChallenges={setChallenges} onChallengeCreated={fetchUnreadCount} onStartConversation={handleStartConversation} />,
        community: <CommunityView user={user} onNavigate={handleNavigate} onStartConversation={handleStartConversation} feedVersion={feedVersion} />,
        my_applications: <MyApplications user={user} />,
        rtt_stats: <RttStatsView user={user} />,
    };

    return (
        <div>
            {Object.entries(views).map(([tab, view]) => (
                <div key={tab} style={{ display: activeTab === tab ? 'block' : 'none' }}>
                    {view}
                </div>
            ))}
        </div>
    );
};

  const tabLabel: Record<DashboardTab, string> = {
    video_analysis: 'Видео-анализ',
    ai_coach: 'AI Тренер',
    students: 'CRM Система',
    tournaments: 'Мои Турниры',
    ladder: 'Лестница',
    community: 'Сообщество',
    profile: 'Личный кабинет',
    search: 'Поиск партнера',
    courts: 'Бронирование',
    tactics: 'Тактика',
    messages: 'Сообщения',
    my_applications: 'Мои Заявки',
    notifications: 'Уведомления',
    rtt_stats: 'Статистика РТТ',
  };

  const handleMobileTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar — только десктоп */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        unreadCount={totalUnread}
        ladderNotifications={unreadLadderNotifications}
      />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
              <div className="w-3 h-3 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)]"></div>
            </div>
            <span className="text-xl font-black tracking-wider text-white">НаКорте</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {/* Drawer Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {[
            { tab: 'profile' as DashboardTab, icon: <UserIcon size={18}/>, label: 'Мой Профиль' },
            ...(user.role === 'rtt_pro' ? [{ tab: 'rtt_stats' as DashboardTab, icon: <BarChart3 size={18}/>, label: 'Статистика РТТ' }] : []),
            { tab: 'search' as DashboardTab, icon: <Search size={18}/>, label: 'Поиск Партнёра' },
            { tab: 'courts' as DashboardTab, icon: <MapPin size={18}/>, label: 'Бронирование' },
            { tab: 'ladder' as DashboardTab, icon: <Swords size={18}/>, label: 'Турнирная лестница', badge: unreadLadderNotifications > 0 ? unreadLadderNotifications : null },
            { tab: 'community' as DashboardTab, icon: <Globe size={18}/>, label: 'Сообщество' },
            ...(user.role !== 'coach' ? [{ tab: 'my_applications' as DashboardTab, icon: <Mail size={18}/>, label: 'Мои заявки' }] : []),
            { tab: 'tactics' as DashboardTab, icon: <BookOpen size={18}/>, label: 'Тактика' },
            { tab: 'messages' as DashboardTab, icon: <MessageSquare size={18}/>, label: 'Сообщения', badge: totalUnread > 0 ? totalUnread : null },
            { tab: 'ai_coach' as DashboardTab, icon: <Bot size={18}/>, label: 'AI Тренер' },
            ...(user.role === 'coach' ? [
              { tab: 'students' as DashboardTab, icon: <Users size={18}/>, label: 'Ученики (CRM)' },
              { tab: 'tournaments' as DashboardTab, icon: <Trophy size={18}/>, label: 'Мои Турниры' },
            ] : []),
          ].map(({ tab, icon, label, badge }) => (
            <button
              key={tab}
              onClick={() => handleMobileTabChange(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
                ${activeTab === tab 
                  ? 'bg-slate-800 text-white font-semibold border-l-4 border-lime-400' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <span>{icon}</span>
              <span className="flex-1 text-sm font-medium">{label}</span>
              {badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}

          {/* В разработке */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-40 cursor-not-allowed text-slate-400">
            <Video size={18}/>
            <span className="flex-1 text-sm font-medium">Видео-анализ</span>
            <span className="bg-lime-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-md">В разр.</span>
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-3 rounded-xl hover:bg-slate-800">
            <LogOut size={18} />
            <span className="text-sm font-medium">Выйти из системы</span>
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-30 px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            <Menu size={20}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
              <div className="w-2.5 h-2.5 rounded-full bg-lime-400"></div>
            </div>
            <span className="font-black tracking-wider text-white text-sm">НаКорте</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('notifications')} 
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
          >
            <Bell size={18}/>
            {unreadLadderNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">
                {unreadLadderNotifications}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('messages')} 
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
          >
            <MessageSquare size={18}/>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0 bg-[#F1F5F9]">
        <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto min-h-full">
           <header className="flex justify-between items-center mb-4 md:mb-8">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-slate-900">
                  {tabLabel[activeTab] ?? activeTab}
                </h1>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">Добро пожаловать, {user.name}</p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                 <button onClick={() => setActiveTab('notifications')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm relative ${activeTab === 'notifications' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                   <Bell size={20} />
                   {unreadLadderNotifications > 0 && (
                     <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center z-10">
                       <span className="text-white text-xs font-bold">{unreadLadderNotifications}</span>
                     </span>
                   )}
                 </button>
              </div>
           </header>

          {/* Beta Testing Notice */}
          <div className="mb-4 md:mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white shadow-xl animate-fade-in-up">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-9 h-9 md:w-12 md:h-12 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Bell size={18} className="text-white md:hidden" />
                <Bell size={24} className="text-white hidden md:block" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-lg font-black mb-1 md:mb-2">🎾 Бета-тестирование</h3>
                <p className="text-xs md:text-sm leading-relaxed text-white/90">
                  Уважаемые теннисисты и тренеры! На данный момент проект находится на бета-тестировании. 
                  Если вы заметите несоответствия или ошибки, просим вас написать об этом в чат поддержки. Спасибо!
                </p>
              </div>
            </div>
          </div>

          <div className="animate-fade-in-up">
            {renderContent()}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-between items-center px-1 py-1 z-30" style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}>
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={20}/>} label="Профиль" />
        <NavButton active={activeTab === 'ladder'} onClick={() => setActiveTab('ladder')} icon={<Swords size={20}/>} label="Лестница" />
        <NavButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<Globe size={20}/>} label="Клуб" />
        <NavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20}/>} label="Чат" badge={totalUnread} />
        <NavButton active={activeTab === 'ai_coach'} onClick={() => setActiveTab('ai_coach')} icon={<Bot size={20}/>} label="AI" />
      </div>
    </div>
  );
};

export default Dashboard;

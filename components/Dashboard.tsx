
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, LogOut, Bell, 
  User as UserIcon, Swords, Globe, Bot
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

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (data: Partial<User>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [unreadLadderNotifications, setUnreadLadderNotifications] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);

  const incrementFeedVersion = () => setFeedVersion(v => v + 1);

  const fetchUnreadCount = () => {
    api.notifications.getUnreadCount(user.id).then(data => {
        setUnreadLadderNotifications(data.count);
    });
  }

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
        ladder: <LadderView user={user} challenges={challenges} setChallenges={setChallenges} />,
        community: <CommunityView user={user} onNavigate={handleNavigate} onStartConversation={handleStartConversation} feedVersion={feedVersion} />,
        my_applications: <MyApplications user={user} />,
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

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar Component */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout}
        unreadCount={totalUnread}
        ladderNotifications={unreadLadderNotifications}
      />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md">
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
             <div className="w-3 h-3 rounded-full bg-lime-400"></div>
           </div>
           <span className="font-black uppercase tracking-wider text-white">
             НАКОРТЕ
           </span>
         </div>
         <div className="flex gap-3">
             <button onClick={() => setActiveTab('messages')}><MessageSquare size={20}/></button>
             <button onClick={onLogout}><LogOut size={20}/></button>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 overflow-y-auto pt-16 md:pt-0 bg-[#F1F5F9]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
           <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 capitalize">
                  {activeTab === 'video_analysis' ? 'Видео-анализ ударов' : 
                   activeTab === 'ai_coach' ? 'AI Тренер' : 
                   activeTab === 'students' ? 'CRM Система' :
                   activeTab === 'tournaments' ? 'Мои Турниры' :
                   activeTab === 'ladder' ? 'Турнирная лестница' :
                   activeTab === 'community' ? 'Клубное сообщество' :
                   activeTab === 'profile' ? 'Личный кабинет' :
                   activeTab === 'search' ? 'Поиск партнера' :
                   activeTab === 'courts' ? 'Бронирование' :
                   activeTab === 'tactics' ? 'Тактическая доска' :
                   activeTab === 'messages' ? 'Сообщения' :
                   activeTab === 'my_applications' ? 'Мои Заявки' :
                   activeTab === 'notifications' ? 'Уведомления' :
                   activeTab}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Добро пожаловать, {user.name}</p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                 <button onClick={() => setActiveTab('notifications')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm relative ${activeTab === 'notifications' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                   <Bell size={20} />
                   {unreadLadderNotifications > 0 &&
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                   }
                 </button>
              </div>
           </header>

          {/* Beta Testing Notice */}
          <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Bell size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black mb-2">🎾 Бета-тестирование</h3>
                <p className="text-sm leading-relaxed text-white/90">
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
      <div className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around p-4 z-50 safe-area-bottom">
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={24}/>} />
        <NavButton active={activeTab === 'ladder'} onClick={() => setActiveTab('ladder')} icon={<Swords size={24}/>} />
        <NavButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<Globe size={24}/>} />
        <NavButton active={activeTab === 'ai_coach'} onClick={() => setActiveTab('ai_coach')} icon={"A"} />
      </div>
    </div>
  );
};

export default Dashboard;

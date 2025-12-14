
import React, { useState } from 'react';
import { 
  MessageSquare, LogOut, Settings, Bell, 
  User as UserIcon, Swords, Globe, Bot
} from 'lucide-react';
import { User, DashboardTab } from '../types';
import Sidebar from './dashboard/Sidebar';
import { NavButton } from './Shared';

// Import Views
import ProfileView from './dashboard/ProfileView';
import CourtBookingView from './dashboard/CourtBookingView';
import PartnerSearchView from './dashboard/PartnerSearchView';
import AiCoachView from './dashboard/AiCoachView';
import { MessagesView, NotificationsView, LadderView, CommunityView } from './dashboard/CommunityViews';
import { SettingsView, TacticsView, VideoAnalysisView, StudentsView } from './dashboard/ToolViews';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (data: Partial<User>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');

  const handleNavigate = (tab: DashboardTab) => setActiveTab(tab);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar Component */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
      />

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
                   activeTab === 'messages' ? 'Сообщения' :
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
            {activeTab === 'profile' && <ProfileView user={user} onUserUpdate={onUserUpdate} />}
            {activeTab === 'search' && <PartnerSearchView onNavigate={handleNavigate} />}
            {activeTab === 'courts' && <CourtBookingView />}
            {activeTab === 'ai_coach' && <AiCoachView user={user} />}
            {activeTab === 'messages' && <MessagesView />}
            {activeTab === 'settings' && <SettingsView user={user} />}
            {activeTab === 'notifications' && <NotificationsView />}
            {activeTab === 'tactics' && <TacticsView user={user} />}
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

export default Dashboard;

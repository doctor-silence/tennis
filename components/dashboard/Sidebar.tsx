
import React from 'react';
import { 
  User as UserIcon, Search, MapPin, MessageSquare, LogOut, 
  Bot, Video, BookOpen, Swords, Globe, Users
} from 'lucide-react';
import { User, DashboardTab } from '../../types';

interface SidebarProps {
  user: User;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  onLogout: () => void;
  unreadCount: number;
}

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

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, unreadCount }) => {
  return (
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
          <SidebarItem icon={<MessageSquare size={20} />} label="Сообщения" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} badge={unreadCount > 0 && unreadCount} />
          <SidebarItem icon={<Bot size={20} />} label="AI Тренер" active={activeTab === 'ai_coach'} onClick={() => setActiveTab('ai_coach')} />
          {user.role === 'coach' && (
            <SidebarItem icon={<Users size={20} />} label="Ученики (CRM)" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          )}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-800">
        <button onClick={onLogout} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-2 rounded-lg hover:bg-slate-800">
          <LogOut size={20} />
          <span className="font-medium">Выйти из системы</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { Globe, Zap, Users } from 'lucide-react';

interface CommunityBannerProps {
  activityLevel?: string;
  groupsCount?: number;
}

const CommunityBanner: React.FC<CommunityBannerProps> = ({ 
  activityLevel = "92%", 
  groupsCount = 42 
}) => {
  return (
    <div className="relative w-full h-44 bg-indigo-700 rounded-[40px] overflow-hidden flex items-center px-10 shadow-[0_20px_50px_rgba(67,56,202,0.3)] border border-indigo-400/30 group">
      
      {/* 1. ФОНОВЫЕ ДЕКОРАЦИИ */}
      {/* Анимированный глобус */}
      <div className="absolute -right-10 bottom-[-60px] opacity-10 animate-spin-slow pointer-events-none select-none">
        <Globe size={280} className="text-white" />
      </div>
      
      {/* Точечный паттерн */}
      <div className="absolute inset-0 opacity-10 pointer-events-none select-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`
      }}></div>

      {/* Динамическое свечение */}
      <div className="absolute top-[-20%] left-[-10%] w-80 h-80 bg-white/10 rounded-full blur-[80px] animate-glimmer"></div>

      {/* 2. ОСНОВНОЙ КОНТЕНТ */}
      <div className="relative z-10 w-full flex items-center justify-between">
        
        {/* Левая часть: Заголовки */}
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 mb-3 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/20 w-fit">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-50">Community Pulse Live</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-white">
            Быть в <span className="text-lime-400 relative">
                Игре
                <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-lime-400/30 blur-sm"></div>
            </span>
          </h2>
          
          <p className="text-indigo-100/40 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 ml-1">
            Сообщество теннисистов России
          </p>
        </div>

        {/* Правая часть: Статистика */}
        <div className="hidden lg:flex gap-10 items-center bg-black/20 backdrop-blur-md p-5 px-10 rounded-[32px] border border-white/10 hover:bg-black/30 transition-all duration-500">
          <div className="text-center group/stat cursor-default">
            <div className="text-[9px] font-black text-indigo-300 uppercase mb-1 tracking-widest group-hover/stat:text-white transition-colors">Активность</div>
            <div className="text-2xl font-black text-white flex items-center gap-3">
              <Zap size={20} className="text-lime-400 fill-lime-400 animate-pulse"/>
              {activityLevel}
            </div>
          </div>
          
          <div className="w-px h-12 bg-white/10"></div>
          
          <div className="text-center group/stat cursor-default">
            <div className="text-[9px] font-black text-indigo-300 uppercase mb-1 tracking-widest group-hover/stat:text-white transition-colors">Группы</div>
            <div className="text-2xl font-black text-white flex items-center gap-3">
              <Users size={20} className="text-blue-400"/>
              {groupsCount}
            </div>
          </div>
        </div>
      </div>
      
      {/* Декоративный акцент снизу */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-lime-400/50 to-transparent"></div>
    </div>
  );
};

export default CommunityBanner;
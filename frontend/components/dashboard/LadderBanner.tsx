import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';

interface LadderBannerProps {
  leaderName?: string;
}

const LadderBanner: React.FC<LadderBannerProps> = ({ leaderName = "Александр К." }) => {
  return (
    <div className="relative w-full h-44 bg-[#0a0a0c] rounded-[40px] overflow-hidden flex items-center px-10 shadow-2xl border border-amber-900/30 group">
      
      {/* 1. ФОНОВЫЕ ДЕКОРАЦИИ (Анимированные кубки) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Кубок слева */}
        <Trophy 
          className="absolute text-amber-500 animate-trophy-float" 
          style={{ left: '8%', animationDuration: '10s' }} 
          size={120} 
          fill="currentColor"
        />
        {/* Кубок в центре */}
        <Trophy 
          className="absolute text-amber-300 animate-trophy-float" 
          style={{ left: '35%', animationDelay: '-4s', animationDuration: '14s' }} 
          size={70} 
          fill="currentColor"
        />
        {/* Кубок справа */}
        <Trophy 
          className="absolute text-orange-400 animate-trophy-float" 
          style={{ left: '65%', animationDelay: '-2s', animationDuration: '11s' }} 
          size={100} 
          fill="currentColor"
        />
      </div>

      {/* 2. ЗОЛОТИСТОЕ СВЕЧЕНИЕ (Ambient Glow) */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] animate-glimmer pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] animate-glimmer pointer-events-none" style={{ animationDelay: '3s' }}></div>

      {/* 3. ОСНОВНОЙ КОНТЕНТ */}
      <div className="relative z-10 w-full flex items-center justify-between">
        
        {/* Текстовый блок */}
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 mb-3 bg-amber-500/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-amber-500/30 w-fit">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-100">Diamond Season</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-white">
            Road to 
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-100 ml-2">
              #1
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20 animate-shiny"></div>
            </span>
          </h2>
          
          <p className="text-amber-200/30 text-[10px] font-bold uppercase tracking-[0.4em] mt-2 ml-1">
            Турнирная лестница клуба
          </p>
        </div>

        {/* Карточка лидера (справа) */}
        <div className="hidden lg:flex items-center gap-6 bg-white/5 backdrop-blur-md p-4 px-6 rounded-[28px] border border-white/10 hover:border-amber-500/40 transition-all duration-500">
          <div className="text-right">
            <div className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mb-0.5">Лидер сезона</div>
            <div className="text-xl font-black text-amber-400 italic">{leaderName}</div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-20 animate-pulse"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-200 via-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg relative z-10 border border-amber-300/30">
              <Trophy size={28} className="text-slate-950" fill="currentColor" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Декоративная линия снизу */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50"></div>
    </div>
  );
};

export default LadderBanner;
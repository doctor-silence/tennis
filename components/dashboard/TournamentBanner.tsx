import React from 'react';
import { Trophy, Zap } from 'lucide-react';

interface TournamentBannerProps {
  activeCount?: number;
}

const TournamentBanner: React.FC<TournamentBannerProps> = ({ activeCount = 0 }) => {
  return (
    <div className="relative w-full h-64 bg-[#0a0a0c] rounded-[50px] overflow-hidden flex items-center px-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] border border-white/5 group">
      
      {/* 1. BACKGROUND GRID (THE NET) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Contrasting Tennis Net Grid */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}></div>
        
        {/* Net Top Tape Effect (White stretched strip) */}
        <div className="absolute top-14 left-0 right-0 h-1.5 bg-white/90 shadow-[0_5px_15px_rgba(255,255,255,0.2)] z-0"></div>

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-lime-400/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-white/5 rounded-full blur-[120px]"></div>
      </div>

      {/* 2. TOP GLOSSY BEZEL (The Glass Bar) */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-white/15 to-white/5 border-b border-white/10 backdrop-blur-md flex items-center px-8 z-20">
        <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
          <Zap size={12} className="text-lime-400 fill-lime-400 animate-pulse"/>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Tournament Engine v2.5</span>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="relative z-10 w-full flex items-center justify-between mt-10">
        <div className="max-w-2xl">
          <h2 className="text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-white mb-6">
            ТВОЯ <span className="text-lime-400 text-glow">CETKA</span> —<br/>
            ТВОИ ПРАВИЛА
          </h2>
          
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] leading-relaxed max-w-lg">
            УПРАВЛЯЙ КЛУБНЫМИ СЕРИЯМИ И ЧАСТНЫМИ КУБКАМИ
          </p>
        </div>

        {/* 4. STATS (REMOVED PRIZE POOL, DYNAMIC COUNT) */}
        <div className="hidden lg:flex items-center">
           <div className="p-10 bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/5 text-center min-w-[180px] shadow-2xl relative overflow-hidden group/card hover:bg-white/10 transition-all duration-500">
              {/* Internal glow for the card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-lime-400 to-transparent opacity-0 group-hover/card:opacity-50 transition-opacity"></div>
              
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Активных</div>
              <div className="text-5xl font-black text-white italic tracking-tighter">{activeCount}</div>
           </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent"></div>
    </div>
  );
};

export default TournamentBanner;
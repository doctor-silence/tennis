import React, { useEffect, useRef } from 'react';
import { BookOpen, TrendingUp, Target, Pen } from 'lucide-react';

interface DiaryBannerProps {
  entriesCount?: number;
  dossiersCount?: number;
}

const css = `
  @keyframes db-glow-pulse {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%       { opacity: 0.30; transform: scale(1.12); }
  }
  @keyframes db-glow-pulse2 {
    0%, 100% { opacity: 0.08; transform: scale(1); }
    50%       { opacity: 0.18; transform: scale(1.18); }
  }
  @keyframes db-dot-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(163,230,53,0.7); }
    50%       { opacity: 0.6; box-shadow: 0 0 0 6px rgba(163,230,53,0); }
  }
  @keyframes db-float {
    0%, 100% { transform: translateY(0px) rotate(-8deg); }
    50%       { transform: translateY(-12px) rotate(-8deg); }
  }
  @keyframes db-pen-float {
    0%, 100% { transform: translateY(0px) rotate(20deg); opacity: 0.06; }
    50%       { transform: translateY(-8px) rotate(20deg); opacity: 0.10; }
  }
  @keyframes db-shimmer {
    0%   { transform: translateX(-100%) skewX(-20deg); }
    100% { transform: translateX(400%) skewX(-20deg); }
  }
  @keyframes db-bar-slide {
    0%   { width: 0%; }
    100% { width: 100%; }
  }
  @keyframes db-fade-in-up {
    0%   { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes db-count-in {
    0%   { opacity: 0; transform: scale(0.5); }
    70%  { transform: scale(1.15); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes db-grid-move {
    0%   { background-position: 0 0; }
    100% { background-position: 28px 28px; }
  }

  .db-glow-1  { animation: db-glow-pulse  6s ease-in-out infinite; }
  .db-glow-2  { animation: db-glow-pulse2 8s ease-in-out infinite 3s; }
  .db-dot     { animation: db-dot-pulse   2s ease-in-out infinite; }
  .db-book    { animation: db-float       7s ease-in-out infinite; }
  .db-pen     { animation: db-pen-float   5s ease-in-out infinite 1s; }
  .db-shimmer { animation: db-shimmer     3.5s linear infinite; }
  .db-badge   { animation: db-fade-in-up  0.5s ease both; }
  .db-title   { animation: db-fade-in-up  0.6s ease both 0.1s; }
  .db-sub     { animation: db-fade-in-up  0.7s ease both 0.2s; }
  .db-stat1   { animation: db-count-in    0.5s ease both 0.35s; }
  .db-stat2   { animation: db-count-in    0.5s ease both 0.5s; }
  .db-grid    { animation: db-grid-move   4s linear infinite; }
  .hidden-mobile { display: flex; }
  @media (max-width: 1024px) { .hidden-mobile { display: none !important; } }
`;

const DiaryBanner: React.FC<DiaryBannerProps> = ({
  entriesCount = 0,
  dossiersCount = 0,
}) => {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!document.getElementById('diary-banner-css')) {
      const el = document.createElement('style');
      el.id = 'diary-banner-css';
      el.textContent = css;
      document.head.appendChild(el);
      styleRef.current = el;
    }
    return () => {
      styleRef.current?.remove();
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '176px',
      background: 'linear-gradient(135deg, #0f0e17 0%, #1e1b4b 45%, #0f0e17 100%)',
      borderRadius: '40px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      padding: '0 40px',
      boxShadow: '0 25px 60px rgba(30,27,75,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
    }}>

      {/* Анимированная сетка */}
      <div className="db-grid" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
        opacity: 1,
      }} />

      {/* Свечение — indigo слева */}
      <div className="db-glow-1" style={{
        position: 'absolute', top: '-40%', left: '-8%',
        width: '320px', height: '320px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Свечение — lime справа снизу */}
      <div className="db-glow-2" style={{
        position: 'absolute', bottom: '-35%', right: '15%',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(163,230,53,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none',
      }} />

      {/* Большая книга — фоновая, плавает */}
      <div className="db-book" style={{
        position: 'absolute', right: '-20px', bottom: '-40px',
        opacity: 0.07, pointerEvents: 'none', userSelect: 'none', color: 'white',
      }}>
        <BookOpen size={240} />
      </div>

      {/* Перо — декоративное */}
      <div className="db-pen" style={{
        position: 'absolute', right: '180px', top: '20px',
        opacity: 0.07, pointerEvents: 'none', userSelect: 'none', color: '#a5b4fc',
      }}>
        <Pen size={80} />
      </div>

      {/* Шиммер-полоска */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="db-shimmer" style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '60px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        }} />
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Левая часть */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Бейдж */}
          <div className="db-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)',
            padding: '6px 16px', borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.15)', width: 'fit-content',
          }}>
            <div className="db-dot" style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#a3e635', flexShrink: 0,
            }} />
            <span style={{
              fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.25em', color: '#c7d2fe',
            }}>Personal Tennis Log</span>
          </div>

          {/* Заголовок */}
          <div className="db-title" style={{ lineHeight: 1, marginBottom: '10px' }}>
            <span style={{
              fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900,
              fontStyle: 'italic', textTransform: 'uppercase',
              letterSpacing: '-0.04em', color: 'white',
            }}>
              Мой{' '}
            </span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{
                fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900,
                fontStyle: 'italic', textTransform: 'uppercase',
                letterSpacing: '-0.04em', color: '#a3e635',
              }}>Дневник</span>
              {/* Shimmer на заголовке */}
              <span style={{
                position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '4px',
              }}>
                <span className="db-shimmer" style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                }} />
              </span>
            </span>
          </div>

          {/* Подпись */}
          <div className="db-sub" style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.4em', color: 'rgba(165,180,252,0.4)', marginLeft: '2px',
          }}>
            Прогресс · Матчи · Досье соперников
          </div>
        </div>

        {/* Правая часть: статистика */}
        <div style={{
          display: 'flex', gap: '32px', alignItems: 'center',
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
          padding: '20px 40px', borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
          className="hidden-mobile"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
        >
          <div className="db-stat1" style={{ textAlign: 'center', cursor: 'default' }}>
            <div style={{
              fontSize: '9px', fontWeight: 900, color: '#818cf8',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px',
            }}>Записей</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#a3e635' }} />
              {entriesCount}
            </div>
          </div>

          <div style={{ width: '1px', height: '48px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="db-stat2" style={{ textAlign: 'center', cursor: 'default' }}>
            <div style={{
              fontSize: '9px', fontWeight: 900, color: '#818cf8',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px',
            }}>Досье</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#60a5fa' }} />
              {dossiersCount}
            </div>
          </div>
        </div>
      </div>

      {/* Полоса снизу */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.6), transparent)',
      }} />
    </div>
  );
};

export default DiaryBanner;

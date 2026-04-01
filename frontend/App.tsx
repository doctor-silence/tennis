import React, { useState, useEffect } from 'react';
import { ViewState, User, NewsArticle } from './types';
import Dashboard from './components/Dashboard';
import Button from './components/Button';
import Shop from './components/Shop';
import AdminPanel from './components/AdminPanel';
import SupportChatWidget from './components/SupportChatWidget'; // Import the new component
import TrainerCRMPage from './components/TrainerCRMPage';
import Tooltip from './components/Tooltip';
import { api } from './services/api';
import { normalizeEmail, validateEmailAddress } from './utils/emailValidation';
import { 
  ArrowRight, 
  Trophy, 
  Users, 
  Map, 
  Star, 
  Activity, 
  Zap, 
  Check, 
  Crown,
  BarChart3,
  Video,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Search,
  MapPin,
  X,
  ListOrdered,
  Medal,
  Loader2,
  Briefcase,
  Newspaper,
  Clock,
  Eye,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  Calendar,
  Heart,
  Target,
  TrendingUp,
  FileText,
  Plus
} from 'lucide-react';

const IMPERSONATION_ADMIN_STORAGE_KEY = 'impersonationAdminUser';
const SITE_URL = 'https://onthecourt.ru';

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
};

const DEFAULT_SEO: SeoConfig = {
  title: 'НаКорте - Теннисная платформа для игроков, тренеров и организаторов турниров',
  description: 'НаКорте — онлайн-платформа для теннисистов России. Найди партнёра для игры, запишись к тренеру, создавай любительские турниры и управляй ими через роль Директор турниров.',
  canonicalPath: '/',
  keywords: 'теннисный турнир, создать турнир по теннису, директор турнира, организация теннисных турниров, теннисная платформа, РТТ, теннисный тренер, поиск партнёра',
};

const SEO_BY_VIEW: Partial<Record<ViewState, SeoConfig>> = {
  landing: DEFAULT_SEO,
  auth: DEFAULT_SEO,
  'find-partner': {
    title: 'Поиск партнёра по теннису — НаКорте',
    description: 'Найдите партнёра по теннису по уровню, городу и формату игры. НаКорте помогает быстро подобрать соперника или спарринг-партнёра для тренировки и матча.',
    canonicalPath: '/find-partner/',
  },
  'find-courts': {
    title: 'Бронирование теннисных кортов — НаКорте',
    description: 'Ищите теннисные корты по городу, клубу, адресу и покрытию. Сравнивайте площадки по рейтингу и цене и переходите к удобному бронированию онлайн.',
    canonicalPath: '/find-courts/',
  },
  'ai-coach-info': {
    title: 'AI-тренер по теннису — НаКорте',
    description: 'Используйте AI-тренера НаКорте для разбора тактики, техники и подготовки к матчам. Получайте персональные рекомендации и готовые тренировки в личном кабинете.',
    canonicalPath: '/ai-coach/',
  },
  'amateur-tournaments': {
    title: 'Любительские турниры по теннису — НаКорте',
    description: 'Участвуйте в любительских теннисных турнирах, следите за сеткой, результатами и рейтингом игроков. НаКорте объединяет турнирную активность в одном сервисе.',
    canonicalPath: '/amateur-tournaments/',
  },
  'community-info': {
    title: 'Теннисное сообщество — НаКорте',
    description: 'Теннисное сообщество НаКорте: публикации игроков, группы, результаты матчей, поиск игры и объявления. Общайтесь и находите новые возможности для игры.',
    canonicalPath: '/community/',
  },
  'tactics-3d-info': {
    title: '3D-тактика в теннисе — НаКорте',
    description: 'Изучайте теннисную тактику в 3D: сценарии розыгрышей, направления ударов, выход к сетке и игровые схемы для подготовки к матчам и тренировкам.',
    canonicalPath: '/3d-tactics/',
  },
  'tennis-diary-info': {
    title: 'Теннисный дневник — НаКорте',
    description: 'Ведите теннисный дневник тренировок и матчей, фиксируйте прогресс, заметки и игровые наблюдения. НаКорте помогает системно отслеживать развитие игрока.',
    canonicalPath: '/tennis-diary/',
  },
  'crm-info': {
    title: 'CRM для теннисных тренеров — НаКорте',
    description: 'CRM для теннисных тренеров: управление учениками, расписанием, абонементами и прогрессом в одном сервисе.',
    canonicalPath: '/trainer-crm/',
  },
  'tournament-director-info': {
    title: 'Создание теннисных турниров и директор турниров — НаКорте',
    description: 'Создавайте любительские теннисные турниры на НаКорте. Роль Директор турниров помогает публиковать регламент, принимать заявки, управлять участниками и продвигать соревнование.',
    canonicalPath: '/tournament-director/',
    keywords: 'директор турниров, создать турнир по теннису, организация теннисных турниров, любительский теннисный турнир, управление заявками турнира, регламент турнира',
  },
  'rtt-info': {
    title: 'Верификация РТТ — НаКорте',
    description: 'Привяжите номер РТТ, получите верификацию профиля и откройте дополнительные возможности для статистики и рейтинга на НаКорте.',
    canonicalPath: '/rtt/',
  },
  news: {
    title: 'Новости тенниса — НаКорте',
    description: 'Последние новости тенниса в России: турниры, результаты матчей, интервью с игроками, тренировочные советы и обзоры.',
    canonicalPath: '/news/',
  },
  privacy: {
    title: 'Политика конфиденциальности — НаКорте',
    description: 'Политика конфиденциальности сервиса НаКорте. Как мы собираем, используем и защищаем ваши персональные данные.',
    canonicalPath: '/privacy/',
  },
  terms: {
    title: 'Условия обслуживания — НаКорте',
    description: 'Условия обслуживания сервиса НаКорте. Правила использования платформы, регистрации и поведения пользователей.',
    canonicalPath: '/terms/',
  },
  pro: {
    title: 'НаКорте Premium — Раскрой свой потенциал',
    description: 'Получи доступ к продвинутой аналитике, безлимитному AI-тренеру и эксклюзивным турнирам с подпиской НаКорте Premium.',
    canonicalPath: '/pro/',
  },
  shop: {
    title: 'Теннисный магазин — НаКорте',
    description: 'Купить теннисные ракетки, кроссовки, мячи и аксессуары с доставкой по России. Подбор экипировки для тренировок и матчей.',
    canonicalPath: '/shop/',
  },
};

const ensureMetaTag = (attributeName: 'name' | 'property', attributeValue: string) => {
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  return element;
};

const ensureCanonicalLink = () => {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  return element;
};

const applySeoMetadata = ({ title, description, canonicalPath, keywords }: SeoConfig) => {
  const canonicalUrl = new URL(canonicalPath, SITE_URL).toString();

  document.title = title;
  ensureMetaTag('name', 'description').setAttribute('content', description);
  ensureMetaTag('property', 'og:title').setAttribute('content', title);
  ensureMetaTag('property', 'og:description').setAttribute('content', description);
  ensureMetaTag('property', 'og:url').setAttribute('content', canonicalUrl);
  ensureMetaTag('name', 'twitter:title').setAttribute('content', title);
  ensureMetaTag('name', 'twitter:description').setAttribute('content', description);
  ensureMetaTag('name', 'keywords').setAttribute('content', keywords || DEFAULT_SEO.keywords || '');
  ensureCanonicalLink().setAttribute('href', canonicalUrl);
};

const App = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [isNotFound, setIsNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonationAdmin, setImpersonationAdmin] = useState<User | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true); // Add loading state

  const validPaths = ['/', '/crm/', '/crm', '/trainer-crm/', '/trainer-crm', '/tournament-director/', '/tournament-director', '/rtt/', '/rtt', '/news/', '/news', '/privacy/', '/privacy', '/pro/', '/pro', '/shop/', '/shop', '/terms/', '/terms', '/find-partner/', '/find-partner', '/find-courts/', '/find-courts', '/ai-coach/', '/ai-coach', '/amateur-tournaments/', '/amateur-tournaments', '/community/', '/community', '/3d-tactics/', '/3d-tactics', '/tennis-diary/', '/tennis-diary'];

  const getPublicRouteState = (pathname: string, search: string) => {
    const isValid = validPaths.some((path) => pathname === path || pathname.startsWith(path + '/'));

    if (!isValid) {
      return { isNotFound: true, nextView: 'landing' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/find-partner')) {
      return { isNotFound: false, nextView: 'find-partner' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/find-courts')) {
      return { isNotFound: false, nextView: 'find-courts' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/ai-coach')) {
      return { isNotFound: false, nextView: 'ai-coach-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/amateur-tournaments')) {
      return { isNotFound: false, nextView: 'amateur-tournaments' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/community')) {
      return { isNotFound: false, nextView: 'community-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/3d-tactics')) {
      return { isNotFound: false, nextView: 'tactics-3d-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/tennis-diary')) {
      return { isNotFound: false, nextView: 'tennis-diary-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/trainer-crm')) {
      return { isNotFound: false, nextView: 'crm-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/tournament-director')) {
      return { isNotFound: false, nextView: 'tournament-director-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/rtt')) {
      return { isNotFound: false, nextView: 'rtt-info' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/pro')) {
      return { isNotFound: false, nextView: 'pro' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/shop')) {
      return { isNotFound: false, nextView: 'shop' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/news')) {
      return { isNotFound: false, nextView: 'news' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/privacy')) {
      return { isNotFound: false, nextView: 'privacy' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/terms')) {
      return { isNotFound: false, nextView: 'terms' as ViewState, nextAuthMode: 'login' as const };
    }

    if (pathname.startsWith('/crm')) {
      return { isNotFound: false, nextView: 'auth' as ViewState, nextAuthMode: 'login' as const };
    }

    const params = new URLSearchParams(search);
    if (params.get('auth') === 'register') {
      return { isNotFound: false, nextView: 'auth' as ViewState, nextAuthMode: 'register' as const };
    }

    if (params.get('auth') === 'login') {
      return { isNotFound: false, nextView: 'auth' as ViewState, nextAuthMode: 'login' as const };
    }

    return { isNotFound: false, nextView: 'landing' as ViewState, nextAuthMode: 'login' as const };
  };

  const getPathForView = (target: ViewState, mode?: 'login' | 'register') => {
    switch (target) {
      case 'landing':
        return '/';
      case 'news':
        return '/news/';
      case 'privacy':
        return '/privacy/';
      case 'terms':
        return '/terms/';
      case 'pro':
        return '/pro/';
      case 'shop':
        return '/shop/';
      case 'rtt-info':
        return '/rtt/';
      case 'crm-info':
        return '/trainer-crm/';
      case 'tournament-director-info':
        return '/tournament-director/';
      case 'find-partner':
        return '/find-partner/';
      case 'find-courts':
        return '/find-courts/';
      case 'ai-coach-info':
        return '/ai-coach/';
      case 'amateur-tournaments':
        return '/amateur-tournaments/';
      case 'community-info':
        return '/community/';
      case 'tactics-3d-info':
        return '/3d-tactics/';
      case 'tennis-diary-info':
        return '/tennis-diary/';
      case 'auth':
        return mode === 'register' ? '/?auth=register' : '/?auth=login';
      default:
        return null;
    }
  };

  // New useEffect to load user from localStorage on initial render
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedImpersonationAdmin = localStorage.getItem(IMPERSONATION_ADMIN_STORAGE_KEY);
      const pathname = window.location.pathname;
      const search = window.location.search;

      let parsedImpersonationAdmin: User | null = null;
      if (storedImpersonationAdmin) {
        parsedImpersonationAdmin = JSON.parse(storedImpersonationAdmin);
      }

      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);

        if (user.role === 'admin') {
          if (parsedImpersonationAdmin) {
            localStorage.removeItem(IMPERSONATION_ADMIN_STORAGE_KEY);
          }
          setImpersonationAdmin(null);
          setView('admin');
        } else {
          setImpersonationAdmin(parsedImpersonationAdmin);
          setView('dashboard');
        }
      } else {
        if (parsedImpersonationAdmin) {
          localStorage.removeItem(IMPERSONATION_ADMIN_STORAGE_KEY);
        }
        const { isNotFound: nextNotFound, nextView, nextAuthMode } = getPublicRouteState(pathname, search);
        setIsNotFound(nextNotFound);
        setAuthInitialMode(nextAuthMode);
        setView(nextView);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      // Clear localStorage if parsing fails to prevent infinite loop
      localStorage.removeItem('currentUser');
    } finally {
      setLoading(false); // Set loading to false after check
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (currentUser) {
      return;
    }

    const handlePopState = () => {
      const { isNotFound: nextNotFound, nextView, nextAuthMode } = getPublicRouteState(window.location.pathname, window.location.search);
      setIsNotFound(nextNotFound);
      setAuthInitialMode(nextAuthMode);
      setView(nextView);
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentUser]);

  useEffect(() => {
    const seo = currentUser ? DEFAULT_SEO : (SEO_BY_VIEW[view] ?? DEFAULT_SEO);
    applySeoMetadata(seo);
  }, [currentUser, view]);

  const handleLoginSuccess = (user: User) => {
    setImpersonationAdmin(null);
    localStorage.removeItem(IMPERSONATION_ADMIN_STORAGE_KEY);
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user)); // Store user in localStorage
    if (user.role === 'admin') {
        setView('admin');
    } else {
        setView('dashboard');
    }
  };

  const handleUserUpdate = (updatedData: Partial<User>) => {
    if (currentUser) {
        const updatedUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Update user in localStorage
    }
  };

  const handleLogout = () => {
    setImpersonationAdmin(null);
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Remove user from localStorage
    localStorage.removeItem(IMPERSONATION_ADMIN_STORAGE_KEY);
    window.history.replaceState({}, '', '/');
    setView('landing');
  };

  const handleStartImpersonation = (targetUser: User) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (targetUser.role === 'admin' || String(targetUser.id) === String(currentUser.id)) return;

    setImpersonationAdmin(currentUser);
    localStorage.setItem(IMPERSONATION_ADMIN_STORAGE_KEY, JSON.stringify(currentUser));
    setCurrentUser(targetUser);
    localStorage.setItem('currentUser', JSON.stringify(targetUser));
    window.history.replaceState({}, '', '/');
    setIsNotFound(false);
    setView('dashboard');
    window.scrollTo(0, 0);
  };

  const handleReturnToAdmin = () => {
    if (!impersonationAdmin) return;

    setCurrentUser(impersonationAdmin);
    localStorage.setItem('currentUser', JSON.stringify(impersonationAdmin));
    localStorage.removeItem(IMPERSONATION_ADMIN_STORAGE_KEY);
    setImpersonationAdmin(null);
    window.history.replaceState({}, '', '/');
    setIsNotFound(false);
    setView('admin');
    window.scrollTo(0, 0);
  };

  const handleNavigate = (target: ViewState) => {
    const path = getPathForView(target);
    if (!currentUser && path && `${window.location.pathname}${window.location.search}` !== path) {
      window.history.pushState({}, '', path);
    }

    setIsNotFound(false);
    setView(target);
    window.scrollTo(0, 0);
  };

  const handleAuthNavigate = (mode: 'login' | 'register') => {
    const path = getPathForView('auth', mode);
    if (!currentUser && path && `${window.location.pathname}${window.location.search}` !== path) {
      window.history.pushState({}, '', path);
    }

    setAuthInitialMode(mode);
    setIsNotFound(false);
    setView('auth');
    window.scrollTo(0, 0);
  };

  if (loading) { // Render loading indicator if loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin h-10 w-10 text-lime-500" />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-6">
        <div style={{ fontSize: '120px', lineHeight: 1, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#a3e635' }}>404</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>Страница не найдена</h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>
          Такой страницы не существует. Возможно, она была удалена или вы перешли по неверной ссылке.
        </p>
        <button
          onClick={() => { window.history.replaceState({}, '', '/'); setIsNotFound(false); setView('landing'); }}
          style={{
            background: '#a3e635', color: '#0f172a', fontWeight: 700,
            padding: '12px 32px', borderRadius: '12px', border: 'none',
            cursor: 'pointer', fontSize: '15px',
          }}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      {view === 'landing' && (
        <LandingPage
          onLoginClick={() => handleAuthNavigate('login')}
          onRegisterClick={() => handleAuthNavigate('register')}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'pro' && (
        <ProPage onBack={() => handleNavigate('landing')} onSubscribe={() => handleAuthNavigate('register')} />
      )}

      {view === 'rtt-info' && (
        <RttInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'crm-info' && (
        <TrainerCRMPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'tournament-director-info' && (
          <TournamentDirectorInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'shop' && (
        <Shop onBack={() => handleNavigate('landing')} />
      )}

      {view === 'auth' && (
        <AuthPage
            onBack={() => handleNavigate('landing')}
            onComplete={handleLoginSuccess}
            initialMode={authInitialMode}
            onNavigate={handleNavigate}
        />
      )}

      {view === 'dashboard' && currentUser && (
        <>
          <Dashboard
              user={currentUser}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              impersonationAdmin={impersonationAdmin}
              onReturnToAdmin={handleReturnToAdmin}
          />
          <SupportChatWidget user={currentUser} />
        </>
      )}

      {view === 'admin' && currentUser && (
          <AdminPanel user={currentUser} onLogout={handleLogout} onImpersonateUser={handleStartImpersonation} />
      )}

      {view === 'news' && (
          <NewsPage onBack={() => handleNavigate('landing')} onLogin={() => handleAuthNavigate('login')} onRegister={() => handleAuthNavigate('register')} onNavigate={handleNavigate} />
      )}

      {view === 'privacy' && (
          <LegalPage type="privacy" onBack={() => handleNavigate('landing')} />
      )}

      {view === 'terms' && (
          <LegalPage type="terms" onBack={() => handleNavigate('landing')} />
      )}

      {view === 'find-partner' && (
          <FindPartnerSeoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'find-courts' && (
          <FindCourtsSeoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'ai-coach-info' && (
          <AiCoachInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'amateur-tournaments' && (
          <AmateurTournamentsPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'community-info' && (
          <CommunityInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'tactics-3d-info' && (
          <Tactics3DInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}

      {view === 'tennis-diary-info' && (
          <TennisDiaryInfoPage onBack={() => handleNavigate('landing')} onRegister={() => handleAuthNavigate('register')} />
      )}
    </div>
  );
};

// --- Shared Header Component ---
const PublicHeader = ({ onLogin, onRegister, onNavigate, transparent = false }: any) => (
  <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'glass-panel border-b-0 bg-white/80 backdrop-blur-md'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
      <div 
        className="flex items-center cursor-pointer group flex-shrink-0 self-center" 
        onClick={() => onNavigate('landing')}
      >
        <img
          src="/assets/logo.svg"
          alt="НаКорте"
          className="h-10 sm:h-14 w-auto group-hover:opacity-90 transition-opacity block"
          style={transparent ? {} : { filter: 'invert(1)' }}
        />
      </div>
      
      <nav className={`hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider ${transparent ? 'text-slate-300' : 'text-slate-500'}`}>
        <a href="/news/" className={`hover:text-lime-500 transition-colors flex items-center gap-1 ${transparent ? 'hover:text-white' : ''}`}>
           Новости
        </a>
        <a href="/shop/" className={`hover:text-lime-500 transition-colors flex items-center gap-1 ${transparent ? 'hover:text-white' : ''}`}>
           Магазин
        </a>
        <a href="/pro/" className={`hover:text-lime-500 transition-colors flex items-center gap-1 ${transparent ? 'hover:text-white' : ''}`}>
           PRO <Crown size={14} className="mb-1 text-amber-400"/>
        </a>
      </nav>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button onClick={onLogin} className={`font-bold hover:text-lime-500 transition-colors text-sm whitespace-nowrap ${transparent ? 'text-white' : 'text-slate-900'}`}>Войти</button>
        <Button onClick={onRegister} size="sm" variant={transparent ? 'secondary' : 'primary'} className="text-xs sm:text-sm px-3 sm:px-4">Регистрация</Button>
      </div>
    </div>
  </header>
);

// --- Landing Page Components ---

// --- News Section for Landing ---
const CATEGORY_COLORS_LANDING: Record<string, string> = {
    tournament: 'bg-amber-100 text-amber-700',
    player: 'bg-blue-100 text-blue-700',
    training: 'bg-lime-100 text-lime-700',
    equipment: 'bg-purple-100 text-purple-700',
    general: 'bg-slate-100 text-slate-600',
};
const CATEGORY_LABELS_LANDING: Record<string, string> = {
    tournament: 'Турниры',
    player: 'Игроки',
    training: 'Тренировки',
    equipment: 'Инвентарь',
    general: 'Общее',
};

const NewsSection = ({ onRegisterClick, onNavigateToNews }: { onRegisterClick: () => void, onNavigateToNews: () => void }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.news.getAll().then(data => {
            setArticles(data.slice(0, 3));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading || articles.length === 0) return null;

    const [featured, ...rest] = articles;

    return (
        <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Последние новости</span>
                        <h2 className="text-4xl font-bold text-slate-900 mt-2">Мир тенниса</h2>
                    </div>
                    <button
                        onClick={onNavigateToNews}
                        className="hidden sm:flex items-center gap-2 text-slate-600 hover:text-lime-600 font-bold transition-colors text-sm"
                    >
                        Все новости <ArrowRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Featured */}
                    <div
                        className="lg:col-span-2 relative rounded-2xl overflow-hidden cursor-pointer group h-72 lg:h-auto"
                        onClick={onNavigateToNews}
                    >
                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 ${CATEGORY_COLORS_LANDING[featured.category] || 'bg-slate-100 text-slate-600'}`}>
                                {CATEGORY_LABELS_LANDING[featured.category] || featured.category}
                            </span>
                            <h3 className="text-white text-xl font-black leading-tight mb-2 group-hover:text-lime-300 transition-colors">{featured.title}</h3>
                            <div className="flex items-center gap-3 text-slate-400 text-xs">
                                <span className="flex items-center gap-1"><Clock size={11} /> {new Date(featured.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Small cards */}
                    <div className="flex flex-col gap-4">
                        {rest.map(article => (
                            <div
                                key={article.id}
                                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group flex gap-4 p-4 transition-all"
                                onClick={onNavigateToNews}
                            >
                                <img src={article.image} alt={article.title} className="w-20 h-16 object-cover rounded-xl flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${CATEGORY_COLORS_LANDING[article.category] || 'bg-slate-100 text-slate-600'}`}>
                                        {CATEGORY_LABELS_LANDING[article.category] || article.category}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight group-hover:text-lime-600 transition-colors line-clamp-2">{article.title}</h4>
                                    <p className="text-slate-400 text-xs mt-1">{new Date(article.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={onNavigateToNews}
                            className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-lime-400 hover:text-lime-600 font-bold text-sm transition-all"
                        >
                            <Newspaper size={16} /> Все новости
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- Full News Page (public, accessible from landing) ---
const CATEGORY_COLORS_PAGE: Record<string, string> = {
    tournament: 'bg-amber-100 text-amber-700 border-amber-200',
    player: 'bg-blue-100 text-blue-700 border-blue-200',
    training: 'bg-lime-100 text-lime-700 border-lime-200',
    equipment: 'bg-purple-100 text-purple-700 border-purple-200',
    general: 'bg-slate-100 text-slate-600 border-slate-200',
};
const CATEGORY_LABELS_PAGE: Record<string, string> = {
    tournament: 'Турниры', player: 'Игроки', training: 'Тренировки', equipment: 'Инвентарь', general: 'Общее',
};

const NewsPage = ({ onBack, onLogin, onRegister, onNavigate }: { onBack: () => void, onLogin: () => void, onRegister: () => void, onNavigate: (v: ViewState) => void }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<NewsArticle | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        api.news.getAll().then(data => { setArticles(data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filtered = articles.filter(a => {
        const matchCat = activeCategory === 'all' || a.category === activeCategory;
        const matchSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    const featured = filtered[0];
    const rest = filtered.slice(1);

    const categories = [
        { key: 'all', label: 'Все' },
        { key: 'tournament', label: 'Турниры' },
        { key: 'player', label: 'Игроки' },
        { key: 'training', label: 'Тренировки' },
        { key: 'equipment', label: 'Инвентарь' },
        { key: 'general', label: 'Общее' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <PublicHeader onLogin={onLogin} onRegister={onRegister} onNavigate={onNavigate} />

            {/* News Hero Header */}
            <div className="bg-slate-900 pt-28 pb-14">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <span className="text-lime-400 font-bold tracking-wider uppercase text-xs">Редакция НаКорте</span>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mt-2 mb-3">Новости тенниса</h1>
                <p className="text-slate-400 text-lg max-w-2xl">Турниры, результаты матчей, интервью с игроками и тренировочные советы.</p>
              </div>
            </div>

            <div className="pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                {selected ? (
                    // --- Article Detail ---
                    <div className="max-w-3xl mx-auto animate-fade-in-up">
                        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-500 hover:text-lime-600 transition-colors font-medium mb-6">
                            <ChevronLeft size={20} /> Назад к новостям
                        </button>
                        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <div className="h-[520px] lg:h-[620px] overflow-hidden">
                                <img src={selected.image} alt={selected.title} className="w-full h-full object-cover object-top" />
                            </div>
                            <div className="p-6 lg:p-8">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-4 ${CATEGORY_COLORS_PAGE[selected.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {CATEGORY_LABELS_PAGE[selected.category] || selected.category}
                                </span>
                                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mb-3 leading-tight">{selected.title}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100">
                                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                        <UserIcon size={14} /> {selected.author}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={14} /> {new Date(selected.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>

                                </div>
                                <p className="text-slate-700 text-lg font-medium mb-4 leading-relaxed">{selected.summary}</p>
                                <div>
                                    {selected.content.split('\n').map((p, i) =>
                                        p.trim() ? <p key={i} className="text-slate-600 leading-relaxed mb-3">{p}</p> : <br key={i} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- News List ---
                    <>
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                                    <Newspaper size={28} className="text-lime-500" /> Новости тенниса
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">Актуальные события из мира тенниса</p>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Поиск новостей..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 w-52"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${activeCategory === cat.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="animate-spin text-lime-500" size={32} />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Newspaper size={48} className="mb-3 opacity-40" />
                                <p className="font-medium">Новостей не найдено</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Featured */}
                                {featured && (
                                    <div className="relative rounded-2xl overflow-hidden cursor-pointer group h-[520px] lg:h-[620px]" onClick={() => { setSelected(featured); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 pointer-events-none" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${CATEGORY_COLORS_PAGE[featured.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {CATEGORY_LABELS_PAGE[featured.category] || featured.category}
                                            </span>
                                            <h2 className="text-white text-xl lg:text-2xl font-black leading-tight mb-2 group-hover:text-lime-300 transition-colors">{featured.title}</h2>
                                            <p className="text-slate-300 text-sm line-clamp-2 mb-3">{featured.summary}</p>
                                            <div className="flex items-center gap-4 text-slate-400 text-xs">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(featured.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                <span className="font-medium text-slate-300">{featured.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grid */}
                                {rest.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rest.map(article => (
                                            <div key={article.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelected(article); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                                <div className="h-44 overflow-hidden pointer-events-none">
                                                    <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                </div>
                                                <div className="p-4 pointer-events-none">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${CATEGORY_COLORS_PAGE[article.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {CATEGORY_LABELS_PAGE[article.category] || article.category}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 leading-tight mb-1.5 group-hover:text-lime-600 transition-colors line-clamp-2">{article.title}</h3>
                                                    <p className="text-slate-500 text-sm line-clamp-2 mb-3">{article.summary}</p>
                                                    <div className="flex items-center justify-between text-slate-400 text-xs">
                                                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(article.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-16 py-10">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <a href="/" className="flex items-center">
                  <img src="/assets/logo.svg" alt="НаКорте" className="h-16 w-auto" style={{ filter: 'invert(1)' }} />
                </a>
                <div className="text-slate-400 text-sm">
                  &copy; 2026 НаКорте. Все права защищены.
                </div>
                <div className="flex gap-4 text-sm text-slate-400">
                  <a href="/privacy/" className="hover:text-slate-900 transition-colors">Конфиденциальность</a>
                  <a href="/terms/" className="hover:text-slate-900 transition-colors">Условия</a>
                </div>
              </div>
            </footer>
        </div>
    );
};

// --- Requisites Modal ---
const RequisitesModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-fade-in-up"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
      >
        <X size={16} />
      </button>
      <div className="mb-6">
        <span className="inline-block bg-lime-100 text-lime-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">Реквизиты</span>
        <h2 className="text-xl font-bold text-slate-900">Сведения об организации</h2>
      </div>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Наименование</dt>
          <dd className="text-slate-900 font-semibold">ИП Крыжановский Владимир Владимирович</dd>
        </div>
        <div className="h-px bg-slate-100" />
        <div>
          <dt className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">ИНН</dt>
          <dd className="text-slate-900 font-mono font-semibold">540225545098</dd>
        </div>
        <div className="h-px bg-slate-100" />
        <div>
          <dt className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">ОГРНИП</dt>
          <dd className="text-slate-900 font-mono font-semibold">324547600197503</dd>
        </div>
      </dl>
    </div>
  </div>
);

// --- FAQ Section ---
const FAQ_ITEMS = [
  {
    question: 'Что такое НаКорте и для кого это приложение?',
    answer: 'НаКорте — это платформа для теннисистов любого уровня: от новичков до профессиональных игроков РТТ. Здесь можно найти партнёра для игры, забронировать корт, отслеживать статистику, тренироваться с AI-ассистентом и участвовать в любительских турнирах.',
  },
  {
    question: 'Сколько стоит использование платформы?',
    answer: 'Сейчас НаКорте находится на стадии бета-тестирования и полностью бесплатен. Все функции открыты без ограничений. В будущем мы планируем ввести PRO-подписку с расширенными возможностями, но базовый доступ останется бесплатным.',
  },
  {
    question: 'Как найти партнёра для игры?',
    answer: 'После регистрации перейдите в раздел «Поиск партнёра». Алгоритм подберёт игроков по вашему уровню (NTRP или очкам РТТ), городу и предпочтительному времени. Вы можете также фильтровать по возрасту, цели встречи (спарринг, тренировка, турнир) и стилю игры.',
  },
  {
    question: 'Что такое статус РТТ Про и как его получить?',
    answer: 'Статус РТТ Про — это верификация для действующих спортсменов Российского Теннисного Тура. При регистрации укажите свой РНИ (регистрационный номер игрока), и система автоматически подтянет ваш рейтинг и историю матчей из базы ФТР. Статус открывает галочку верификации, расширенную статистику и приоритетный поиск.',
  },
  {
    question: 'Как работает AI-тренер?',
    answer: 'AI-тренер анализирует данные ваших матчей и тренировок из дневника, выявляет слабые места и составляет персональный план тренировок. Вы можете задавать вопросы в чате — AI ответит с учётом вашего текущего уровня и целей.',
  },
  {
    question: 'Я тренер. Какие возможности есть для меня?',
    answer: 'Тренеры получают доступ к CRM-системе: ведение базы учеников, управление расписанием тренировок, отслеживание прогресса каждого игрока и организация собственных турниров. Зарегистрируйтесь и выберите тип аккаунта «Тренер».',
  },
  {
    question: 'Могу ли я создать свой турнир?',
    answer: 'Да. НаКорте поддерживает создание любительских турниров внутри платформы, а новая роль «Директор турниров» даёт отдельный CRM-инструмент для публикации турнира, загрузки регламента, ведения заявок, общения с участниками и контроля заполнения сетки.',
  },
  {
    question: 'Что даёт роль «Директор турниров»?',
    answer: 'Роль «Директор турниров» открывает специальный раздел «Организация турнира», где можно оформить турнирную страницу, указать контакты, клуб, покрытие, дату, стоимость участия, загрузить PDF-регламент и управлять заявками участников в одном интерфейсе.',
  },
  {
    question: 'Как удалить аккаунт или свои данные?',
    answer: 'Вы можете запросить удаление аккаунта через чат поддержки внутри приложения. Мы удалим все ваши персональные данные в течение 7 рабочих дней в соответствии с нашей Политикой конфиденциальности.',
  },
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Ответы на вопросы</span>
          <h2 className="text-4xl font-bold text-slate-900 mt-2 tracking-tight">Часто задаваемые<br/>вопросы</h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-bold text-slate-900 text-base leading-snug">{item.question}</span>
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openIndex === i ? 'bg-lime-400 text-slate-900 rotate-180' : 'bg-slate-100 text-slate-500'}`}>
                  <ChevronDown size={16} />
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="px-6 pb-5 text-slate-600 leading-relaxed text-sm">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm mb-4">Не нашли ответ на свой вопрос?</p>
          <a
            href="#support"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors"
          >
            <MessageSquare size={16} /> Написать в поддержку
          </a>
        </div>
      </div>
    </section>
  );
};

const LandingPage = ({ onLoginClick, onRegisterClick, onNavigate }: { onLoginClick: () => void, onRegisterClick: () => void, onNavigate: (v: ViewState) => void }) => {
  const [reqOpen, setReqOpen] = useState(false);
  const [featureReveal, setFeatureReveal] = useState<Record<string, boolean>>({});
  const featureRevealNodes = React.useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const nodes = Object.entries(featureRevealNodes.current).filter(([, node]) => node);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const id = (entry.target as HTMLElement).dataset.revealId;
          if (id) {
            setFeatureReveal((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
          }

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    nodes.forEach(([, node]) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const bindFeatureReveal = (id: string) => (node: HTMLDivElement | null) => {
    featureRevealNodes.current[id] = node;
  };

  const getFeatureRevealStyle = (id: string, direction: 'left' | 'right' | 'up') => {
    const isVisible = !!featureReveal[id];
    const offsetX = direction === 'left' ? -42 : direction === 'right' ? 42 : 0;
    const offsetY = direction === 'up' ? 34 : 0;

    return {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translate3d(0,0,0)' : `translate3d(${offsetX}px, ${offsetY}px, 0)`,
      transition: 'opacity 1400ms ease, transform 1800ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'opacity, transform',
    } as React.CSSProperties;
  };

  return (
    <>
      {reqOpen && <RequisitesModal onClose={() => setReqOpen(false)} />}
      <PublicHeader onLogin={onLoginClick} onRegister={onRegisterClick} onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-slate-900 overflow-hidden" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top, 0px))' }}>
        {/* Animated Abstract Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-lime-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]"></div>
        
        {/* Background Texture */}
        <div className="absolute inset-0 z-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM36 0V4h-2V0h-4v2h4v4h2V2h4V0h-4zM0 34v-4h4v4h2v-2H4v-4H2v4H0zM0 0h4v4H2v2H0V2H4V0H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-lime-400 text-xs font-bold uppercase tracking-wider mb-6 sm:mb-8 mt-4 sm:mt-0 hover:bg-white/20 transition-colors cursor-default">
              <Zap size={14} className="fill-lime-400" />
              <span>Революция в любительском спорте</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter mb-8 leading-[0.9]">
              ТВОЯ ИГРА <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 text-glow">НОВЫЙ УРОВЕНЬ</span>
            </h1>
            
            <p className="text-xl text-slate-300 max-w-xl mb-10 leading-relaxed font-light">
              Единая экосистема для профессионалов РТТ и любителей. Находи партнеров своего уровня, бронируй лучшие корты и тренируйся с AI-ассистентом.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button size="lg" variant="secondary" onClick={onRegisterClick} className="w-full sm:w-auto gap-2 shadow-lg shadow-lime-400/20 hover:shadow-lime-400/40 transform hover:-translate-y-1 transition-all">
                Начать сейчас <ArrowRight size={18} />
              </Button>
            </div>
            

          </div>

          <div className="relative hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative z-10 transform rotate-[-5deg] hover:rotate-0 transition-all duration-700 ease-out group perspective-1000">
               <div className="absolute inset-0 bg-gradient-to-r from-lime-400 to-emerald-400 rounded-3xl transform translate-x-4 translate-y-4 -z-10 opacity-50 blur-lg"></div>
               <img 
                 src="/assets/landing-hero.jpg" 
                 alt="App Preview" 
                 className="rounded-3xl shadow-2xl border-4 border-white/10"
               />
               
               {/* Floating Elements */}
               <div className="absolute -top-10 -right-10 bg-white p-4 rounded-2xl shadow-xl animate-bounce duration-[3000ms]">
                 <div className="flex items-center gap-3">
                   <div className="bg-lime-100 p-2 rounded-lg"><Activity className="text-lime-600" size={24}/></div>
                   <div>
                     <p className="text-xs text-slate-500 font-bold uppercase">Твой рейтинг</p>
                     <p className="text-xl font-bold text-slate-900">NTRP 4.5</p>
                   </div>
                 </div>
               </div>
               
               <div className="absolute -bottom-8 -left-8 glass-dark p-6 rounded-2xl shadow-xl border border-white/10 max-w-xs group-hover:scale-105 transition-transform">
                  <p className="text-white text-sm font-medium mb-2">"Отличная игра! Твой форхенд стал заметно стабильнее."</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center text-[10px] font-bold text-slate-900">AI</div>
                    <span className="text-slate-400 text-xs">Твой Тренер</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section className="py-20 sm:py-32 bg-white border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-16 sm:mb-24">
            <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Платформа для всех</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mt-3 mb-4 tracking-tight">Кому подходит НаКорте?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg font-light">Мы создали единую экосистему для каждого, кто любит теннис — независимо от уровня и амбиций.</p>
          </div>

          {/* Block 1 — Beginners & Amateurs */}
          <div className="mb-8 rounded-[2rem] overflow-hidden bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left — label + title + desc */}
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-lime-100 text-lime-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-6 w-fit">
                  <UserIcon size={13} /> Начинающие и любители
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 leading-tight">Начни играть<br/>без лишних сложностей</h3>
                <p className="text-slate-500 text-base leading-relaxed mb-8">Не важно, только ли ты взял ракетку или играешь пару лет — НаКорте поможет найти компанию своего уровня, не бояться уйти с корта с разгромным счётом и расти в удовольствие.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Search size={16}/>, text: 'Поиск партнёра по уровню NTRP' },
                    { icon: <Map size={16}/>, text: 'Корты рядом с домом' },
                    { icon: <Activity size={16}/>, text: 'Личная статистика и прогресс' },
                    { icon: <Zap size={16}/>, text: 'AI-тренер с советами' },
                    { icon: <Shield size={16}/>, text: 'Дневник тренировок и матчей' },
                    { icon: <Users size={16}/>, text: 'Комьюнити и группы по интересам' },
                    { icon: <Calendar size={16}/>, text: 'Любительские турниры' },
                    { icon: <MessageSquare size={16}/>, text: 'Чат с партнёрами' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-medium shadow-sm">
                      <span className="text-lime-500 flex-shrink-0">{f.icon}</span>{f.text}
                    </div>
                  ))}
                </div>
                <button onClick={onRegisterClick} className="mt-8 inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-lime-500 hover:text-slate-900 transition-all w-fit">
                  Создать профиль <ArrowRight size={16} />
                </button>
              </div>
              {/* Right — highlights */}
              <div className="bg-slate-900 p-10 lg:p-14 flex flex-col justify-center gap-6">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Почему НаКорте лучше групповых чатов</p>
                {[
                  { title: 'Умный подбор', desc: 'Алгоритм учитывает уровень, возраст, город и удобное время — не нужно листать сотни анкет.' },
                  { title: 'Без завышенных ожиданий', desc: 'Играешь против равных. Никакого дискомфорта от огромной разницы в уровне.' },
                  { title: 'Расти вместе с платформой', desc: 'Фиксируй победы, отслеживай рейтинг NTRP и наблюдай, как улучшаются твои показатели.' },
                  { title: 'AI-ассистент в кармане', desc: 'Задай вопрос тренеру в любое время — получи разбор ошибок и план улучшений.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-lime-400 text-slate-900 flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Block 2 — RTT Pros */}
          <div className="mb-8 rounded-[2rem] overflow-hidden bg-slate-950 border border-white/5 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left — dark highlights */}
              <div className="p-10 lg:p-14 flex flex-col justify-center gap-6 order-2 lg:order-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Эксклюзивно для РТТ</p>
                {[
                  { icon: <ShieldCheck size={18}/>, title: 'Верификация РНИ', desc: 'Официальная галочка подтверждённого спортсмена. Твой статус виден всему сообществу.' },
                  { icon: <BarChart3 size={18}/>, title: 'Полная статистика ФТР', desc: 'Рейтинг, очки классификации, история матчей — всё подгружается автоматически из базы данных ФТР.' },
                  { icon: <Trophy size={18}/>, title: 'Турнирный профиль', desc: 'Выступления в категориях, динамика рейтинга по сезонам, личные встречи с соперниками.' },
                  { icon: <Eye size={18}/>, title: 'Видимость в сообществе', desc: 'PRO-профили выделяются в поиске, их видят тренеры, организаторы турниров и партнёры.' },
                  { icon: <Medal size={18}/>, title: <Tooltip text="Ладдер" description="Рейтинговая система в онлайн-играх, представляющая собой таблицу лидеров, где игроки ранжируются по уровню мастерства, количеству побед или очков"><span className="border-b border-dashed border-lime-400/60 cursor-help">Ладдер</span></Tooltip>, desc: 'Участвуй во внутреннем ладдере платформы — дополнительные рейтинговые очки за активность.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Right — label + title */}
              <div className="p-10 lg:p-14 flex flex-col justify-center order-1 lg:order-2 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-lime-400/10 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-6 w-fit">
                    <ShieldCheck size={13} /> Профессионалы РТТ
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4 leading-tight">Твой официальный<br/>цифровой профиль<br/>игрока РТТ</h3>
                  <p className="text-slate-400 text-base leading-relaxed mb-8">Привяжи свой РНИ — и платформа автоматически станет твоим персональным цифровым профилем с полной статистикой из базы ФТР. Покажи результаты, найди спарринг-партнёров своего уровня и следи за ладдером.</p>
                  <div className="flex flex-wrap gap-3">
                    <a href="/rtt/" className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-lime-300 transition-all">
                      Подробнее о РТТ <ArrowRight size={16} />
                    </a>
                    <button onClick={onRegisterClick} className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm hover:border-lime-400 hover:text-lime-400 transition-all">
                      Зарегистрироваться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 3 — Coaches */}
          <div className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left — label + title */}
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-6 w-fit">
                  <Briefcase size={13} /> Тренеры
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 leading-tight">Весь бизнес тренера<br/>в одном месте</h3>
                <p className="text-slate-600 text-base leading-relaxed mb-8">Забудь о таблицах и переписках в чатах. НаКорте даёт тренерам профессиональную CRM-систему для управления учениками, расписанием и турнирами — всё под рукой в удобном интерфейсе.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Users size={16}/>, text: 'База учеников с профилями' },
                    { icon: <Calendar size={16}/>, text: 'Расписание тренировок' },
                    { icon: <Activity size={16}/>, text: 'Прогресс каждого игрока' },
                    { icon: <Trophy size={16}/>, text: 'Организация турниров' },
                    { icon: <Video size={16}/>, text: 'Видео-анализ техники' },
                    { icon: <BarChart3 size={16}/>, text: 'Аналитика и отчёты' },
                    { icon: <Zap size={16}/>, text: 'AI-помощник для планирования' },
                    { icon: <Search size={16}/>, text: 'Поиск учеников в своём городе' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-white border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-medium shadow-sm">
                      <span className="text-amber-500 flex-shrink-0">{f.icon}</span>{f.text}
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="/trainer-crm/" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-500 transition-all">
                    Подробнее о CRM <ArrowRight size={16} />
                  </a>
                  <button onClick={onRegisterClick} className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:border-amber-400 hover:text-amber-600 transition-all">
                    Аккаунт тренера
                  </button>
                </div>
              </div>
              {/* Right — advantages */}
              <div className="p-10 lg:p-14 flex flex-col justify-center gap-5">
                <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">Преимущества для тренеров</p>
                {[
                  { title: 'Один инструмент вместо десяти', desc: 'Расписание, прогресс, чаты с учениками, турниры — всё в одном приложении. Никаких Google Таблиц и Telegram-чатов.' },
                  { title: 'Объективная аналитика прогресса', desc: 'Наглядные графики роста каждого ученика по матчам, рейтингу NTRP и показателям техники.' },
                  { title: 'Организация турниров за минуты', desc: 'Создавай закрытые турниры для своих групп, управляй сеткой и публикуй результаты прямо в приложении.' },
                  { title: 'Поиск новых учеников', desc: 'Твой тренерский профиль виден в сообществе. Игроки в твоём городе сами находят тебя по специализации и отзывам.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 bg-white/70 border border-amber-100 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                    <div>
                      <p className="text-slate-900 font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.25rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(132,204,22,0.08),_transparent_26%),linear-gradient(135deg,_#0f172a_0%,_#172033_52%,_#1f4e53_100%)] p-8 sm:p-12 lg:p-14 shadow-xl shadow-slate-200/70">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-lime-300">
                  <Trophy size={14} /> Инструменты для организаторов
                </span>
                <h2 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                  Создавайте свои турниры<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300">и ведите их как директор турнира</span>
                </h2>
                <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300">
                  НаКорте открывает новый сценарий для организаторов: теперь вы можете <strong className="text-white">создать теннисный турнир</strong>, оформить его страницу, принимать заявки и общаться с участниками через специальную роль <strong className="text-white">«Директор турниров»</strong>.
                </p>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-400">
                  Это удобный инструмент для клубов, частных организаторов, серий любительских соревнований и локальных теннисных сообществ, которым нужен понятный цифровой контур для <strong className="text-slate-200">организации турниров по теннису</strong>.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={onRegisterClick} className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-sm font-black text-slate-950 transition-all hover:bg-lime-300 hover:-translate-y-0.5">
                    Стать директором турнира <ArrowRight size={16} />
                  </button>
                  <a href="/tournament-director/" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-lime-400/40 hover:text-lime-300">
                    Создать свой первый турнир <Plus size={16} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Plus size={18} />,
                    title: 'Быстрый запуск турнира',
                    desc: 'Название, даты, формат, взнос, покрытие, адрес, клуб и лимит участников в одной форме.'
                  },
                  {
                    icon: <FileText size={18} />,
                    title: 'Регламент и документы',
                    desc: 'Загрузите PDF-регламент, чтобы игроки сразу видели правила, детали и условия участия.'
                  },
                  {
                    icon: <Users size={18} />,
                    title: 'Заявки и участники',
                    desc: 'Подтверждайте игроков, отслеживайте заполнение сетки и управляйте составом без хаоса в чатах.'
                  },
                  {
                    icon: <MessageSquare size={18} />,
                    title: 'Связь с игроками',
                    desc: 'Контакты директора видны в карточке турнира, а участник может быстро перейти к диалогу.'
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 border border-lime-400/15">
                      {item.icon}
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                'Публикуйте турнир в сообществе и получайте живой поток заявок.',
                'Показывайте организатора, контакты и ключевые условия участия прямо в карточке турнира.',
                'Собирайте вокруг себя локальное теннисное комьюнити и запускайте серию событий на одной платформе.',
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm font-medium leading-relaxed text-slate-300">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <NewsSection onRegisterClick={onRegisterClick} onNavigateToNews={() => onNavigate('news')} />

      {/* Bento Grid Features */}
      <section className="py-12 sm:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-20">
            <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Возможности</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mt-3 mb-4 tracking-tight">Всё для тенниса<br/>в одном месте</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg font-light">Мы убрали лишнее, оставив только то, что нужно для прогресса.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <div ref={bindFeatureReveal('feature-partners')} data-reveal-id="feature-partners" style={{ ...getFeatureRevealStyle('feature-partners', 'left'), minHeight: '320px' }} className="md:col-span-2 bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group cursor-default" >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black z-0"></div>
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-lime-400/10 rounded-full blur-[80px] group-hover:bg-lime-400/20 transition-all duration-700 z-0"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] z-0"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-lime-400 mb-8 group-hover:scale-110 transition-transform duration-500">
                      <Users size={22} />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">Умный поиск партнеров</h3>
                    <p className="text-slate-400 text-base max-w-md leading-relaxed">Алгоритм подбирает соперников не только по уровню NTRP или очкам РТТ, но и по стилю игры, возрасту и локации.</p>
                  </div>
                  <div className="mt-6 sm:mt-10 flex flex-wrap gap-2 sm:gap-3">
                     <div className="bg-white/5 border border-white/10 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white/60 font-medium text-xs sm:text-sm group-hover:border-white/20 transition-colors">Спарринг</div>
                     <div className="bg-white/5 border border-white/10 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white/60 font-medium text-xs sm:text-sm group-hover:border-white/20 transition-colors">Турнир</div>
                     <div className="bg-lime-400/10 border border-lime-400/30 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-lime-400 font-bold text-xs sm:text-sm">Тренировка</div>
                  </div>
                </div>
             </div>

             <div ref={bindFeatureReveal('feature-rtt')} data-reveal-id="feature-rtt" style={{ ...getFeatureRevealStyle('feature-rtt', 'right'), minHeight: '320px' }} className="rounded-[2rem] p-10 relative overflow-hidden group cursor-pointer bg-gradient-to-br from-lime-400 to-emerald-500 hover:shadow-2xl hover:shadow-lime-400/30 transition-all duration-500 hover:-translate-y-1" onClick={() => window.location.href = '/rtt/'}>
                <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700">
                  <Trophy size={180} />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-slate-900/20 backdrop-blur rounded-2xl flex items-center justify-center text-slate-900 mb-8 group-hover:scale-110 transition-transform duration-500">
                      <Star size={22} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">Профессионалы РТТ</h3>
                    <p className="text-slate-800/70 text-sm leading-relaxed">Верифицированные аккаунты для действующих спортсменов и тренеров категории PRO.</p>
                  </div>
                  <div className="mt-6 inline-flex items-center text-slate-900 font-bold text-sm gap-1 group-hover:gap-2 transition-all">
                    Подробнее <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
             <div ref={bindFeatureReveal('feature-courts')} data-reveal-id="feature-courts" style={{ ...getFeatureRevealStyle('feature-courts', 'left'), minHeight: '260px' }} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500">
                <div className="absolute -right-6 -bottom-6 text-slate-100 group-hover:text-slate-200 transition-colors duration-500">
                  <Map size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-emerald-500/30">
                    <Map size={20} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900">Корты рядом с тобой</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Находи теннисные корты в своём городе, смотри контакты и удобно договаривайся о времени.</p>
                </div>
             </div>

             <div ref={bindFeatureReveal('feature-stats')} data-reveal-id="feature-stats" style={{ ...getFeatureRevealStyle('feature-stats', 'up'), minHeight: '260px' }} className="bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent z-0"></div>
                <div className="absolute -right-6 -bottom-6 text-blue-500/10 group-hover:text-blue-500/20 transition-colors duration-500">
                  <Activity size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-blue-500/30">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Детальная статистика</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Анализируй матчи, отслеживай прогресс NTRP и историю личных встреч.</p>
                </div>
             </div>

             <div ref={bindFeatureReveal('feature-community')} data-reveal-id="feature-community" style={getFeatureRevealStyle('feature-community', 'right')} className="flex flex-col gap-5">
               <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 flex-1">
                 <div className="w-11 h-11 bg-purple-500 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-purple-500/30">
                   <MessageSquare size={20} />
                 </div>
                 <h3 className="text-lg font-bold mb-1 text-slate-900">Комьюнити</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">Общайся, вступай в группы и находи компанию для игры.</p>
               </div>
               <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 flex-1">
                 <div className="w-11 h-11 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-orange-500/30">
                   <Calendar size={20} />
                 </div>
                 <h3 className="text-lg font-bold mb-1 text-slate-900">Турниры</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">Участвуй или создавай любительские соревнования в пару кликов.</p>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <div ref={bindFeatureReveal('feature-ai')} data-reveal-id="feature-ai" style={{ ...getFeatureRevealStyle('feature-ai', 'left'), minHeight: '260px' }} className="md:col-span-2 bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-950 to-black z-0"></div>
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] group-hover:bg-violet-500/20 transition-all duration-700 z-0"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-11 h-11 bg-violet-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-violet-500/30">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">AI Тренер</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-md">Персональный AI-ассистент анализирует твои матчи, подсказывает над чем работать и составляет индивидуальный план тренировок.</p>
                </div>
                <div className="mt-8 flex gap-3 flex-wrap">
                  <div className="bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full text-violet-400 font-medium text-xs">Анализ техники</div>
                  <div className="bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full text-violet-400 font-medium text-xs">Plan тренировок</div>
                  <div className="bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full text-violet-400 font-medium text-xs">Разбор ошибок</div>
                </div>
              </div>
            </div>

            <div ref={bindFeatureReveal('feature-3d')} data-reveal-id="feature-3d" style={{ ...getFeatureRevealStyle('feature-3d', 'right'), minHeight: '260px' }} className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-400/30 transition-all duration-500">
              <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700">
                <BarChart3 size={160} />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white tracking-tight">3D Тактический симулятор</h3>
                  <p className="text-white/70 text-sm leading-relaxed">Разрабатывай игровые схемы и тактики на интерактивном 3D-корте и изучай розыгрыши очков.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div ref={bindFeatureReveal('feature-crm')} data-reveal-id="feature-crm" style={getFeatureRevealStyle('feature-crm', 'left')} className="bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-slate-950 to-black z-0"></div>
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] group-hover:bg-amber-500/20 transition-all duration-700 z-0"></div>
              <div className="absolute -right-10 -bottom-10 text-white/5 group-hover:text-white/10 transition-colors duration-500 z-0">
                <Briefcase size={180} />
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-amber-500/30">
                    <Briefcase size={20} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">CRM для тренеров</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Полный инструментарий для профессиональных тренеров: управление учениками, расписание тренировок, статистика прогресса каждого игрока и организация собственных турниров.</p>
                  <div className="mt-6 inline-flex items-center text-amber-400 font-bold text-sm gap-1 cursor-pointer hover:gap-2 transition-all" onClick={() => window.location.href = '/trainer-crm/'}>
                    Подробнее <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'База учеников', desc: 'Профили, прогресс, история' },
                    { label: 'Расписание', desc: 'Тренировки и занятия' },
                    { label: 'Создание турниров', desc: 'Организуй соревнования' },
                    { label: 'Аналитика', desc: 'Рост каждого игрока' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 group-hover:border-amber-500/30 transition-colors">
                      <div className="font-bold text-sm text-white mb-1">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div ref={bindFeatureReveal('feature-diary')} data-reveal-id="feature-diary" style={getFeatureRevealStyle('feature-diary', 'right')} className="bg-gradient-to-br from-lime-400 to-emerald-500 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:shadow-lime-400/30 transition-all duration-500">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700 z-0"></div>
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-700/20 rounded-full blur-[80px] z-0"></div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="w-11 h-11 bg-slate-900/20 backdrop-blur rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Shield size={20} />
                  </div>
                  <span className="text-slate-900/60 font-bold tracking-wider uppercase text-xs">Дневник теннисиста</span>
                  <h3 className="text-2xl font-bold mt-2 mb-3 text-slate-900 tracking-tight">Веди записи. Анализируй. Расти.</h3>
                  <p className="text-slate-800/70 text-sm leading-relaxed">Фиксируй тренировки и матчи, отслеживай свои ощущения и прогресс, а досье соперника поможет подготовиться к игре против конкретного игрока.</p>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {['Записи тренировок', 'Итоги матчей', 'Оценка настроения', 'Оценка техники'].map((tag) => (
                      <div key={tag} className="bg-slate-900/10 border border-slate-900/15 px-3 py-1.5 rounded-full text-slate-900 font-medium text-xs">{tag}</div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/25 border border-white/40 rounded-2xl p-6 hover:bg-white/35 transition-all duration-300 backdrop-blur-sm">
                    <div className="text-2xl mb-3">📔</div>
                    <div className="font-bold text-slate-900 text-sm mb-2">Личный дневник</div>
                    <p className="text-slate-800/70 text-xs leading-relaxed">Записи тренировок и матчей с оценкой подачи, форхенда, бэкхенда, движения и настроением дня.</p>
                    <div className="mt-4 space-y-1.5">
                      {['Тренировка', 'Матч', 'Цель'].map((t) => (
                        <div key={t} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-900/50 flex-shrink-0"></div>
                          <span className="text-slate-900/70 text-xs">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/25 border border-white/40 rounded-2xl p-6 hover:bg-white/35 transition-all duration-300 backdrop-blur-sm">
                    <div className="text-2xl mb-3">🎯</div>
                    <div className="font-bold text-slate-900 text-sm mb-2">Досье соперника</div>
                    <p className="text-slate-800/70 text-xs leading-relaxed">Храни детальный анализ соперников: стиль игры, слабые зоны, психология, счёт личных встреч.</p>
                    <div className="mt-4 space-y-1.5">
                      {['Слабые зоны', 'Личные встречи', 'Тактика против'].map((t) => (
                        <div key={t} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-900/50 flex-shrink-0"></div>
                          <span className="text-slate-900/70 text-xs">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

       {/* FAQ Section */}
       <FaqSection />

       {/* CTA Section */}
       <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 tracking-tighter">
              ГОТОВ К ИГРЕ?
            </h2>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Присоединяйся к сообществу, где теннис — это больше, чем просто спорт. Это стиль жизни.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Button size="lg" className="shadow-2xl shadow-slate-400/50" onClick={onRegisterClick}>Создать аккаунт</Button>
               <Button size="lg" variant="outline" onClick={onLoginClick}>Войти</Button>
            </div>
          </div>
       </section>

       <footer className="bg-slate-950 text-slate-400">
         {/* Main footer grid */}
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

             {/* Brand column */}
             <div className="lg:col-span-2">
               <a href="/" aria-label="НаКорте — теннисная платформа">
                 <img src="/assets/logo.svg" alt="НаКорте — платформа для теннисистов" className="h-14 w-auto mb-4" />
               </a>
               <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
                 Платформа для теннисистов России: поиск партнёров по уровню NTRP и РТТ, бронирование кортов, AI-тренер, турниры и CRM для тренеров.
               </p>
               <div className="mt-6 flex flex-wrap gap-2">
                 {['Теннис Россия', 'NTRP рейтинг', 'РТТ игроки', 'Теннисный клуб'].map(tag => (
                   <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500">{tag}</span>
                 ))}
               </div>
             </div>

             {/* Платформа */}
             <div>
               <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Платформа</h3>
               <ul className="space-y-2.5 text-sm">
                 <li><a href="/?auth=register" className="hover:text-lime-400 transition-colors">Регистрация теннисиста</a></li>
                 <li><a href="/?auth=login" className="hover:text-lime-400 transition-colors">Войти в аккаунт</a></li>
                 <li><a href="/rtt/" className="hover:text-lime-400 transition-colors">Статус РТТ Про</a></li>
                 <li><a href="/pro/" className="hover:text-lime-400 transition-colors">PRO-подписка</a></li>
                 <li><a href="/shop/" className="hover:text-lime-400 transition-colors">Магазин товаров</a></li>
                 <li><a href="/news/" className="hover:text-lime-400 transition-colors">Новости тенниса</a></li>
               </ul>
             </div>

             {/* Возможности */}
             <div>
               <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Возможности</h3>
               <ul className="space-y-2.5 text-sm">
                 <li><a href="/find-partner/" className="hover:text-lime-400 transition-colors text-left">Поиск партнёра по теннису</a></li>
                 <li><a href="/find-courts/" className="hover:text-lime-400 transition-colors text-left">Бронирование теннисных кортов</a></li>
                 <li><a href="/ai-coach/" className="hover:text-lime-400 transition-colors text-left">AI-тренер по теннису</a></li>
                 <li><a href="/amateur-tournaments/" className="hover:text-lime-400 transition-colors text-left">Любительские турниры</a></li>
                 <li><a href="/community/" className="hover:text-lime-400 transition-colors text-left">Сообщество</a></li>
                 <li><a href="/3d-tactics/" className="hover:text-lime-400 transition-colors text-left">3D тактика</a></li>
                 <li><a href="/tennis-diary/" className="hover:text-lime-400 transition-colors text-left">Дневник теннисиста</a></li>
                 <li><a href="/trainer-crm/" className="hover:text-lime-400 transition-colors text-left">CRM для тренеров</a></li>
                 <li><a href="/tournament-director/" className="hover:text-lime-400 transition-colors text-left">Директор турниров</a></li>
               </ul>
             </div>

             {/* Информация */}
             <div>
               <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Информация</h3>
               <ul className="space-y-2.5 text-sm">
                 <li><a href="/privacy/" className="hover:text-lime-400 transition-colors">Политика конфиденциальности</a></li>
                 <li><a href="/terms/" className="hover:text-lime-400 transition-colors">Условия обслуживания</a></li>
                 <li><button onClick={() => setReqOpen(true)} className="hover:text-lime-400 transition-colors text-left">Реквизиты</button></li>
               </ul>
               <div className="mt-6">
                 <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Поддержка</h3>
                 <p className="text-sm leading-relaxed mb-3">Есть вопросы? Напишите нам через чат поддержки прямо в приложении.</p>
                 <p className="text-xs text-slate-500 leading-relaxed">По вопросам сотрудничества, партнёрства и рекламы пишите на&nbsp;<a href="mailto:info@onthecourt.ru" className="text-slate-400 hover:text-lime-400 transition-colors underline underline-offset-2">info@onthecourt.ru</a></p>
               </div>
             </div>

           </div>
         </div>

         {/* SEO text block */}
         <div className="border-t border-white/5">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <p className="text-xs text-slate-600 leading-relaxed">
               <strong className="text-slate-500">НаКорте</strong> — российская платформа для любителей и профессионалов тенниса.
               Найди <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">партнёра для игры в теннис</a> по уровню NTRP или рейтингу РТТ в своём городе.
               Бронируй <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">теннисные корты</a> онлайн, тренируйся с <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">AI-тренером по теннису</a>,
               участвуй в <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">любительских теннисных турнирах</a> и веди <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">дневник теннисиста</a>.
               Для профессиональных тренеров доступна <a href="/trainer-crm/" className="hover:text-slate-400 underline underline-offset-2">CRM-система для ведения учеников</a>, а для организаторов — роль директора турниров с инструментами, чтобы <a href="/?auth=register" className="hover:text-slate-400 underline underline-offset-2">создавать теннисные турниры</a>, публиковать регламент и управлять заявками участников.
               Верификация игроков <a href="/rtt/" className="hover:text-slate-400 underline underline-offset-2">Российского Теннисного Тура (РТТ)</a>.
             </p>
           </div>
         </div>

         {/* Bottom bar */}
         <div className="border-t border-white/5">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
             <span>&copy; 2026 НаКорте. Все права защищены.</span>
             <span>Теннис в России — играй умнее</span>
           </div>
         </div>
       </footer>
    </>
  );
};

const RttInfoPage = ({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = document.getElementById('rtt-scroll-container');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 30);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div id="rtt-scroll-container" className="bg-slate-900 h-screen text-white relative overflow-y-auto overflow-x-hidden">
      {/* Sticky Header */}
      <header className={`sticky top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-xl' : 'bg-transparent border-transparent'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 md:h-28 flex items-center justify-between gap-2">
          {/* Back button — мобильный */}
          <button onClick={onBack} className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-sm font-semibold shrink-0">
            <ChevronLeft size={18} />
            <span className="hidden xs:inline">На главную</span>
          </button>
          <div className="flex items-center cursor-pointer group" onClick={onBack}>
            <img src="/assets/logo.svg" alt="НаКорте" className="h-20 w-auto group-hover:opacity-90 transition-opacity" />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider text-slate-300">
            <a href="/news/" className="hover:text-white transition-colors">Новости</a>
            <a href="/shop/" className="hover:text-white transition-colors">Магазин</a>
            <a href="/pro/" className="hover:text-white transition-colors flex items-center gap-1">PRO <Crown size={14} className="mb-1 text-amber-400"/></a>
          </nav>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={onRegister} className="font-bold hover:text-lime-400 transition-colors text-xs md:text-sm text-white whitespace-nowrap">Войти</button>
            <Button onClick={onRegister} size="sm" className="text-xs md:text-sm px-3 md:px-4">Регистрация</Button>
          </div>
        </div>
      </header>
      
      <div className="pt-8 md:pt-20 pb-16 text-center relative overflow-hidden" style={{ perspective: '1000px' }}>
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime-400/20 rounded-full blur-[120px] pointer-events-none"></div>
         
         {/* 3D Floating Elements */}
         <div className="absolute top-32 left-[10%] animate-[bounce_6s_infinite] opacity-60 hidden md:block" 
              style={{ transform: 'rotateY(30deg) rotateX(20deg) translateZ(50px)', transformStyle: 'preserve-3d' }}>
            <div className="w-24 h-24 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-2xl shadow-[0_20px_50px_rgba(163,230,53,0.4)] flex items-center justify-center border border-white/20 backdrop-blur-sm">
               <ShieldCheck size={48} className="text-slate-900 drop-shadow-md" style={{ transform: 'translateZ(20px)' }} />
            </div>
         </div>
         
         <div className="absolute bottom-10 right-[10%] animate-[bounce_7s_infinite_1s] opacity-60 hidden md:block" 
              style={{ transform: 'rotateY(-25deg) rotateX(-15deg) translateZ(80px)', transformStyle: 'preserve-3d' }}>
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-[0_20px_50px_rgba(59,130,246,0.4)] flex items-center justify-center border border-white/20 backdrop-blur-sm">
               <Trophy size={60} className="text-white drop-shadow-lg" style={{ transform: 'translateZ(30px)' }} />
            </div>
         </div>

         <div className="absolute top-40 right-[20%] animate-[bounce_5s_infinite_0.5s] opacity-40 hidden md:block" 
              style={{ transform: 'rotateY(-40deg) rotateX(30deg) translateZ(20px)', transformStyle: 'preserve-3d' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-[0_15px_30px_rgba(245,158,11,0.3)] flex items-center justify-center border border-white/20">
               <Star size={32} className="text-white drop-shadow-md" style={{ transform: 'translateZ(15px)' }} />
            </div>
         </div>

         <div className="relative z-10 max-w-4xl mx-auto px-4 animate-fade-in-up" style={{ transform: 'translateZ(100px)' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_20px_rgba(163,230,53,0.2)]">
               <ShieldCheck size={14} /> Верификация профиля
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 drop-shadow-2xl leading-tight">
               СТАТУС<br className="sm:hidden" /> <span className="text-lime-400 inline-block hover:scale-105 transition-transform cursor-default" style={{ textShadow: '0 0 30px rgba(163,230,53,0.5)' }}>ПРОФЕССИОНАЛА<br className="sm:hidden" /> РТТ</span>
            </h1>
            <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 drop-shadow-md px-2 leading-relaxed">
               Привяжите свой номер РТТ, чтобы получить официальную галочку верификации, загрузить свою статистику и открыть новые возможности.
            </p>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24 relative z-20">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Steps */}
            <div className="space-y-6 md:space-y-8">
               <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center gap-3">
                  <span className="bg-slate-800 p-2 rounded-lg shadow-inner"><ListOrdered size={24} className="text-lime-400" /></span>
                  Как подключить?
               </h2>
               
               <div className="flex gap-4 group hover:-translate-y-1 transition-transform duration-300 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-lime-400/30 hover:shadow-[0_10px_30px_rgba(163,230,53,0.1)]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform">1</div>
                  <div>
                     <h3 className="text-xl font-bold mb-2 text-white group-hover:text-lime-400 transition-colors">Зарегистрируйтесь</h3>
                     <p className="text-slate-400">При создании аккаунта в приложении НаКОрте укажите ваш действующий регистрационный номер игрока (РНИ) в системе Российского Теннисного Тура.</p>
                  </div>
               </div>
               
               <div className="flex gap-4 group hover:-translate-y-1 transition-transform duration-300 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-lime-400/30 hover:shadow-[0_10px_30px_rgba(163,230,53,0.1)]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform">2</div>
                  <div>
                     <h3 className="text-xl font-bold mb-2 text-white group-hover:text-lime-400 transition-colors">Автоматическая проверка</h3>
                     <p className="text-slate-400">Наша система свяжется с базой данных ФТР и автоматически подтянет вашу статистику, рейтинг и историю матчей.</p>
                  </div>
               </div>
            </div>

            {/* Benefits - 3D Card */}
            <div className="relative group" style={{ perspective: '1000px' }}>
               <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(163,230,53,0.15)] group-hover:-translate-y-2" 
                    style={{ 
                       transformStyle: 'preserve-3d',
                       boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5)'
                    }}
                    onMouseMove={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const x = e.clientX - rect.left;
                       const y = e.clientY - rect.top;
                       const centerX = rect.width / 2;
                       const centerY = rect.height / 2;
                       const rotateX = ((y - centerY) / centerY) * -10;
                       const rotateY = ((x - centerX) / centerX) * 10;
                       e.currentTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
                    }}
                    onMouseLeave={(e) => {
                       e.currentTarget.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0px)';
                    }}
               >
                  <div style={{ transform: 'translateZ(40px)' }}>
                     <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                        <Crown size={28} className="text-amber-400" />
                        Преимущества статуса
                     </h2>
                     <ul className="space-y-6">
                        <li className="flex items-start gap-4 group/item">
                           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-lg group-hover/item:scale-110 transition-transform">
                              <ShieldCheck size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-lg text-white">Галочка верификации</h4>
                              <p className="text-slate-400 text-sm mt-1">Официальное подтверждение вашей личности и статуса действующего спортсмена.</p>
                           </div>
                        </li>
                        <li className="flex items-start gap-4 group/item">
                           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-lg group-hover/item:scale-110 transition-transform">
                              <BarChart3 size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-lg text-white">Официальная статистика</h4>
                              <p className="text-slate-400 text-sm mt-1">Ваш рейтинг, очки и история матчей РТТ автоматически отображаются в профиле.</p>
                           </div>
                        </li>
                        <li className="flex items-start gap-4 group/item">
                           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-lg group-hover/item:scale-110 transition-transform">
                              <Users size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-lg text-white">Доверие партнеров</h4>
                              <p className="text-slate-400 text-sm mt-1">Легче находить сильных спарринг-партнеров, которые видят ваш реальный уровень игры.</p>
                           </div>
                        </li>
                     </ul>
                     
                     <div className="mt-10" style={{ transform: 'translateZ(20px)' }}>
                        <Button onClick={onRegister} className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 hover:from-lime-300 hover:to-emerald-400 py-4 text-lg font-bold shadow-[0_10px_20px_rgba(163,230,53,0.3)] hover:shadow-[0_15px_30px_rgba(163,230,53,0.4)] transition-all hover:-translate-y-1 border-none">
                           Зарегистрироваться и подключить
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* SEO Block */}
      <div className="border-t border-white/10 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Верификация по номеру РТТ — как это работает</h2>
          <p className="text-slate-400 mb-6 leading-relaxed">
            РТТ (Российский Теннисный Тур) — официальная система рейтингования любительских и профессиональных теннисистов в России, управляемая Федерацией Тенниса России (ФТР). Каждый игрок, участвующий в турнирах РТТ, получает уникальный регистрационный номер игрока (РНИ), а также рейтинг по очкам классификации.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-lg mb-2 text-lime-400">Что такое РНИ?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Регистрационный номер игрока (РНИ) — уникальный идентификатор в базе данных ФТР. Он присваивается при первой официальной регистрации на турнир РТТ.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-lg mb-2 text-lime-400">Где найти свой номер?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Ваш РНИ указан в личном кабинете на сайте tennisrating.ru, в карточке участника, а также в протоколах прошедших турниров.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-lg mb-2 text-lime-400">Категории РТТ</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Игроки разделяются по возрастным и рейтинговым категориям: мужчины, женщины, юниоры. Рейтинг обновляется после каждого официального турнира.</p>
            </div>
          </div>
          <div className="bg-lime-400/5 border border-lime-400/20 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-2 text-white">Почему это важно для НаКОрте?</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Верификация через номер РТТ позволяет нам гарантировать достоверность данных игрока: его реальный уровень, количество сыгранных матчей и положение в рейтинге. Это делает сообщество НаКОрте честным и прозрачным — вы всегда знаете, с кем выходите на корт.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProPage = ({ onBack, onSubscribe }: { onBack: () => void, onSubscribe: () => void }) => {
  return (
    <div className="bg-slate-900 min-h-screen text-white relative" style={{overflow: 'hidden', maxHeight: '100vh'}}>

      {/* ⚠️ BETA DIAGONAL TAPE */}
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200vw',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            background: 'repeating-linear-gradient(90deg, #facc15 0px, #facc15 60px, #111111 60px, #111111 120px)',
            padding: '20px 0',
            boxShadow: '0 0 80px 20px rgba(250,204,21,0.2), 0 0 0 2px rgba(250,204,21,0.3)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            backdropFilter: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              background: 'repeating-linear-gradient(90deg, #111111 0px, #111111 60px, #facc15 60px, #facc15 120px)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.8))',
            }}
          >
            {'⚠  БЕТА-ТЕСТИРОВАНИЕ  —  ВЕСЬ ФУНКЦИОНАЛ БЕСПЛАТНЫЙ  ⚠                    '.repeat(3)}
          </span>
        </div>
      </div>

      <PublicHeader onLogin={onSubscribe} onRegister={onSubscribe} onNavigate={(page: any) => page === 'landing' ? onBack() : null} transparent={true} />
      
      {/* Hero */}
      <div className="pt-32 pb-20 text-center relative overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime-400/20 rounded-full blur-[120px] pointer-events-none"></div>
         
         <div className="relative z-10 max-w-4xl mx-auto px-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-400 text-xs font-bold uppercase tracking-wider mb-6">
               <Crown size={14} /> НаКОрте Premium
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
               РАСКРОЙ СВОЙ <br/>
               <span className="text-lime-400">ПОТЕНЦИАЛ</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
               Получи доступ к продвинутой аналитике, безлимитному AI-тренеру и эксклюзивным турнирам.
            </p>
         </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Free */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
               <h3 className="text-xl font-bold mb-2">Любитель</h3>
               <div className="text-3xl font-bold mb-6">0 ₽ <span className="text-sm font-normal text-slate-400">/ месяц</span></div>
               <ul className="space-y-4 mb-8 text-sm text-slate-300">
                  <li className="flex items-center gap-2 text-slate-500 decoration-slate-600 line-through opacity-60">
                     <X size={16} className="text-slate-600"/> Поиск партнеров
                  </li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-slate-500"/> Бронирование кортов</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-slate-500"/> Базовая статистика</li>
               </ul>
               <Button variant="outline" className="w-full border-slate-600 text-white hover:border-white">Текущий план</Button>
            </div>

            {/* PRO Player - Featured */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 transform md:scale-110 shadow-2xl relative">
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lime-400 text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">Популярный выбор</div>
               <h3 className="text-xl font-bold mb-2">PRO Игрок</h3>
               <div className="text-4xl font-bold mb-6">499 ₽ <span className="text-sm font-normal text-slate-500">/ месяц</span></div>
               <p className="text-sm text-slate-500 mb-6">Для тех, кто хочет прогрессировать быстрее.</p>
               <ul className="space-y-4 mb-8 text-sm font-medium">
                  <li className="flex items-center gap-2 bg-lime-50 rounded-lg p-1 -ml-1">
                     <Check size={16} className="text-lime-600"/> 
                     <span className="text-lime-900 font-bold">Поиск партнеров</span>
                  </li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-600"/> Безлимитный AI Тренер</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-600"/> Расширенная статистика матчей</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-600"/> Приоритет в турнирах</li>

               </ul>
               <Button variant="primary" className="w-full bg-slate-900 text-white shadow-xl shadow-slate-900/20" onClick={onSubscribe}>Попробовать бесплатно</Button>
               <p className="text-center text-xs text-slate-400 mt-4">7 дней бесплатно, отмена в любое время</p>
            </div>

            {/* Coach */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
               <h3 className="text-xl font-bold mb-2 text-white">Тренер</h3>
               <div className="text-3xl font-bold mb-6 text-white">1990 ₽ <span className="text-sm font-normal text-slate-400">/ месяц</span></div>
               <ul className="space-y-4 mb-8 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-400"/> Все функции PRO игрока</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-400"/> CRM для учеников</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-400"/> Видео-разборы матчей</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-400"/> Галочка верификации</li>
               </ul>
               <Button variant="secondary" className="w-full" onClick={onSubscribe}>Стать тренером</Button>
            </div>

         </div>
      </div>

      {/* Feature Deep Dive */}
      <div className="bg-slate-950 py-24">
         <div className="max-w-7xl mx-auto px-4">
             <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Инструменты чемпионов</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-4"><BarChart3 size={24}/></div>
                    <h3 className="font-bold text-lg mb-2">Глубокая аналитика</h3>
                    <p className="text-slate-400 text-sm">Отслеживайте процент первой подачи, невынужденные ошибки и виннеры в динамике.</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-4"><Video size={24}/></div>
                    <h3 className="font-bold text-lg mb-2">Видео-анализ</h3>
                    <p className="text-slate-400 text-sm">Загружайте видео ударов, и AI подскажет, как улучшить технику исполнения.</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="w-12 h-12 bg-lime-500/20 text-lime-400 rounded-xl flex items-center justify-center mb-4"><ShieldCheck size={24}/></div>
                    <h3 className="font-bold text-lg mb-2">Приоритетная поддержка</h3>
                    <p className="text-slate-400 text-sm">Персональный менеджер для решения любых вопросов по бронированию и участию в турнирах.</p>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

// --- AuthPage (same as before) ...
const AuthPage = ({ onBack, onComplete, initialMode = 'login', onNavigate }: { onBack: () => void, onComplete: (user: User) => void, initialMode?: 'login' | 'register', onNavigate: (v: ViewState) => void }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  
  // Registration States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState<'amateur' | 'rtt_pro' | 'coach' | 'tournament_director'>('amateur');
  const [level, setLevel] = useState('NTRP 2.0 (Новичок)');

  // 2FA States
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  // RTT Specific States
  const [rttAgeCategory, setRttAgeCategory] = useState('Взрослые');
  const [rttPoints, setRttPoints] = useState(''); // Очки классификации
  const [rttRank, setRttRank] = useState('');     // Рейтинг в категории (позиция)
  const [rni, setRni] = useState('');             // РНИ (Регистрационный номер игрока)
  const [rniVerifying, setRniVerifying] = useState(false);
  const [rniVerified, setRniVerified] = useState(false);
  const isRttRniLocked = role === 'rtt_pro' && Boolean(rni.trim());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const registerEmailValidation = authMode === 'register' && registerStep === 1 && email ? validateEmailAddress(email) : null;

  const ntrpLevels = [
      "NTRP 2.0 (Новичок)", 
      "NTRP 3.0 (Начальный)", 
      "NTRP 3.5 (Средний)", 
      "NTRP 4.0 (Продвинутый)", 
      "NTRP 4.5 (Полупрофи)", 
      "NTRP 5.0+ (Профи)"
  ];

  const rttAgeCategories = [
      "9-10 лет",
      "до 13 лет",
      "до 15 лет",
      "до 17 лет",
      "до 19 лет",
      "Взрослые"
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        const normalizedEmail = normalizeEmail(email);
        setEmail(normalizedEmail);
        const result = await api.auth.login({ email: normalizedEmail, password, totpCode: requires2fa ? totpCode : undefined });
        if ('requires2fa' in result && result.requires2fa) {
            setRequires2fa(true);
            setLoading(false);
            return;
        }
        onComplete(result as any);
    } catch (err: any) {
        setError(err.message || 'Ошибка входа');
    } finally {
        setLoading(false);
    }
  };

  const handleRNIVerification = async () => {
    if (!rni || rni.length < 4) {
      setError('Введите корректный РНИ (минимум 4 символа)');
      return;
    }

    setRniVerifying(true);
    setError('');

    try {
      const result = await api.rtt.verifyRNI(rni);
      
      if (result.success && result.data) {
        // Автозаполнение данных из РТТ
        const player = result.data;
        setName(player.name);
        setCity(player.city || city);
        setAge(player.age?.toString() || age);
        setRttPoints(player.points?.toString() || '');
        setRttRank(player.rank?.toString() || '');
        setRttAgeCategory(player.category || 'Взрослые');
        setRniVerified(true);
        setError('');
      } else {
        setError(result.error || 'РНИ не найден в базе РТТ');
        setRniVerified(false);
      }
    } catch (err: any) {
      setError('Ошибка проверки РНИ');
      setRniVerified(false);
    } finally {
      setRniVerifying(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      const emailValidation = validateEmailAddress(email);
      if (!emailValidation.isValid) {
        setError(emailValidation.error);
        return;
      }
      if(password.length < 6) {
          setError('Пароль должен быть не менее 6 символов');
          return;
      }
      setEmail(emailValidation.normalized);
      setError('');
      setRegisterStep(2);
  };

  const handleRegisterComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Validation
        if (!name || !city || !age) throw new Error("Заполните основные данные профиля");
      const emailValidation = validateEmailAddress(email);
      if (!emailValidation.isValid) throw new Error(emailValidation.error);
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 5 || ageNum > 99) throw new Error("Укажите корректный возраст (5–99 лет)");
        if (role === 'rtt_pro') {
            if (!rni) throw new Error("Укажите РНИ для профи РТТ");
          if (!rniVerified) throw new Error("Подтвердите РНИ, чтобы загрузить данные РТТ");
            if (!rttPoints) throw new Error("Укажите очки классификации");
            if (!rttRank) throw new Error("Укажите позицию в рейтинге");
        }

        const payload = {
            name, 
          email: emailValidation.normalized, 
            password,
            city,
            age: ageNum,
            role,
            level: role === 'amateur' ? level : (role === 'coach' ? 'Coach' : role === 'tournament_director' ? 'Tournament Director' : undefined),
            // Mapping new RTT fields
            rating: role === 'rtt_pro' ? parseInt(rttPoints) : 0, // Points
            rttRank: role === 'rtt_pro' ? parseInt(rttRank) : 0,   // Position
            rttCategory: role === 'rtt_pro' ? rttAgeCategory : undefined,
            rni: role === 'rtt_pro' ? rni : undefined
        };
        const user = await api.auth.register(payload);
        onComplete(user);
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ошибка регистрации. Проверьте данные или соединение с сервером.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-y-auto">
       {/* Ambient Backgorund */}
       <div className="fixed inset-0">
          <img src="/assets/auth-background.jpg" className="w-full h-full object-cover opacity-20 grayscale" alt="court texture" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
       </div>

       <div className={`glass-dark rounded-3xl p-8 w-full ${authMode === 'register' && registerStep === 2 ? 'max-w-xl' : 'max-w-md'} relative z-10 border border-white/10 shadow-2xl animate-fade-in-up my-10 transition-all duration-500`}>
         <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold uppercase mb-8 transition-colors">
           <ArrowRight className="rotate-180" size={16}/> На главную
         </button>

         <div className="mb-8">
           <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
               {authMode === 'login' && 'Вход в клуб'}
               {authMode === 'register' && registerStep === 1 && 'Регистрация'}
               {authMode === 'register' && registerStep === 2 && 'Профиль пользователя'}
           </h2>
           <p className="text-slate-400 text-sm">
             {authMode === 'login' && 'Добро пожаловать обратно на корт.'}
             {authMode === 'register' && registerStep === 1 && 'Создайте учетную запись для доступа.'}
             {authMode === 'register' && registerStep === 2 && 'Расскажите о себе, чтобы настроить подходящий сценарий работы в платформе.'}
           </p>
         </div>

         {error && (
             <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                 {error}
             </div>
         )}

         {/* LOGIN FORM */}
         {authMode === 'login' && !requires2fa && (
             <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                    <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => setEmail(normalizeEmail(e.target.value))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    placeholder="ace@tennis.pro" 
                    required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Пароль</label>
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                    placeholder="••••••••" 
                    required
                    />
                </div>
                <Button variant="secondary" className="w-full mt-6 text-base" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Войти'}
                </Button>
                
                <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
                    Впервые у нас? 
                    <button type="button" onClick={() => { setAuthMode('register'); setRegisterStep(1); setError(''); }} className="ml-2 text-lime-400 font-bold hover:text-lime-300 transition-colors">
                        Регистрация
                    </button>
                </div>
             </form>
         )}

         {/* 2FA STEP */}
         {authMode === 'login' && requires2fa && (
             <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="text-center mb-2">
                    <div className="w-16 h-16 bg-lime-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} className="text-lime-400" />
                    </div>
                    <p className="text-slate-300 text-sm">Введите 6-значный код из приложения<br/><span className="text-slate-500">Google Authenticator / Яндекс Ключ</span></p>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Код 2FA</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                        placeholder="000000"
                        autoFocus
                        required
                    />
                </div>
                <Button variant="secondary" className="w-full mt-4 text-base" type="submit" disabled={loading || totpCode.length !== 6}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Подтвердить'}
                </Button>
                <button type="button" onClick={() => { setRequires2fa(false); setTotpCode(''); setError(''); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-400 transition-colors mt-2">
                    ← Назад
                </button>
             </form>
         )}

         {/* REGISTER STEP 1 */}
         {authMode === 'register' && registerStep === 1 && (
             <form onSubmit={handleRegisterStep1} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                    <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => setEmail(normalizeEmail(e.target.value))}
              className={`w-full bg-slate-800/50 border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600 ${registerEmailValidation?.error ? 'border-red-500/60' : 'border-slate-700'}`}
                    placeholder="ace@tennis.pro" 
                    required
                    />
              {registerEmailValidation?.error && <p className="text-xs text-red-400 mt-1">{registerEmailValidation.error}</p>}
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Придумайте пароль</label>
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                    placeholder="Минимум 6 символов" 
                    required
                    />
                </div>
                <div className="mt-4 flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="consent"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-lime-400 cursor-pointer flex-shrink-0"
                        required
                    />
                    <label htmlFor="consent" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                        Нажимая кнопку, я даю согласие на обработку моих персональных данных в соответствии с{' '}
                        <a href="/privacy/" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline transition-colors">
                            Условиями обработки персональных данных
                        </a>
                    </label>
                </div>
                <Button variant="secondary" className="w-full mt-6 text-base" type="submit" disabled={!consentGiven}>
                    Продолжить
                </Button>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
                    Уже есть профиль? 
                    <button type="button" onClick={() => { setAuthMode('login'); setError(''); }} className="ml-2 text-lime-400 font-bold hover:text-lime-300 transition-colors">
                        Войти
                    </button>
                </div>
             </form>
         )}

         {/* REGISTER STEP 2 (PROFILE) */}
         {authMode === 'register' && registerStep === 2 && (
             <form onSubmit={handleRegisterComplete} className="space-y-4 animate-fade-in-up">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Имя Фамилия</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                        placeholder="Иван Иванов" 
                        required
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Город</label>
                        <input 
                            type="text" 
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none" 
                            placeholder="Москва" 
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Возраст</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            value={age}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '');
                                if (v === '' || parseInt(v) <= 99) setAge(v);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none" 
                            placeholder="25"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ваш статус</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div 
                            onClick={() => setRole('amateur')}
                            className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${role === 'amateur' ? 'bg-lime-400 border-lime-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <UserIcon className="mx-auto mb-1" size={20}/>
                            <div className="font-bold text-sm">Любитель</div>
                        </div>
                        <div 
                            onClick={() => setRole('rtt_pro')}
                            className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${role === 'rtt_pro' ? 'bg-lime-400 border-lime-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <Medal className="mx-auto mb-1" size={20}/>
                            <div className="font-bold text-sm">Профи РТТ</div>
                        </div>
                        <div 
                            onClick={() => setRole('coach')}
                            className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${role === 'coach' ? 'bg-lime-400 border-lime-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <Briefcase className="mx-auto mb-1" size={20}/>
                            <div className="font-bold text-sm">Тренер</div>
                        </div>
                        <div 
                          onClick={() => setRole('tournament_director')}
                          className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${role === 'tournament_director' ? 'bg-lime-400 border-lime-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                          <Trophy className="mx-auto mb-1" size={20}/>
                          <div className="font-bold text-sm">Директор турниров</div>
                        </div>
                    </div>

                    {role === 'amateur' && (
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 animate-fade-in-up">
                            <label className="text-xs font-bold text-lime-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Activity size={14}/> Уровень игры (NTRP)</label>
                            <select 
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-lime-400"
                            >
                                {ntrpLevels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-2 leading-tight">Выберите уровень для корректного подбора соперников в лиге.</p>
                        </div>
                    )}
                    
                    {role === 'rtt_pro' && (
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 space-y-4 animate-fade-in-up">
                            <div>
                                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <ShieldCheck size={14}/> РНИ (Регистрационный номер игрока)
                                </label>
                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                    <input 
                                        type="text" 
                                        value={rni}
                                        onChange={(e) => {
                                            setRni(e.target.value.replace(/\D/g, ''));
                                            setRniVerified(false);
                                        }}
                                        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400 placeholder:text-slate-600 min-w-0"
                                        placeholder="53699" 
                                        maxLength={10}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRNIVerification}
                                        disabled={rniVerifying || !rni}
                                        className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                            rniVerified 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                    >
                                        {rniVerifying ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : rniVerified ? (
                                            <Check size={20} />
                                        ) : (
                                            'Проверить'
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                                    {rniVerified 
                                        ? '✓ РНИ подтвержден. Данные загружены из базы РТТ.' 
                                        : 'Введите регистрационный номер игрока (только цифры).'
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><ListOrdered size={14}/> Возрастная категория</label>
                                <select 
                                    value={rttAgeCategory}
                                    onChange={(e) => setRttAgeCategory(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400"
                                    disabled={rniVerified}
                                >
                                    {rttAgeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block">Очки (Rating)</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        value={rttPoints}
                                        onChange={(e) => setRttPoints(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                                        placeholder="1450"
                                      disabled={isRttRniLocked}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block">Позиция РТТ</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        value={rttRank}
                                        onChange={(e) => setRttRank(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                                        placeholder="№ 123"
                                        disabled={isRttRniLocked}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                {rniVerified 
                                    ? 'Данные проверены через базу РТТ.' 
                                      : isRttRniLocked
                                        ? 'Поля заблокированы до подтверждения и загрузки данных из РТТ.'
                                        : 'Данные будут проверены через базу РТТ.'
                                }
                            </p>
                        </div>
                    )}

                    {role === 'coach' && (
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 animate-fade-in-up">
                            <p className="text-sm text-slate-400">
                                Аккаунт тренера позволяет управлять учениками, расписанием и проводить видео-анализ. 
                                <br/><span className="text-lime-400 text-xs mt-1 block">Дополнительные поля можно заполнить позже в профиле.</span>
                            </p>
                        </div>
                    )}

                    {role === 'tournament_director' && (
                      <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 animate-fade-in-up">
                        <p className="text-sm text-slate-400">
                          Аккаунт директора турниров открывает CRM для создания турниров, загрузки регламентов, обработки заявок и ведения состава участников.
                          <br/><span className="text-lime-400 text-xs mt-1 block">Контакты и детали турниров можно будет заполнить сразу после регистрации в дашборде.</span>
                        </p>
                      </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="w-1/3 border-slate-600 text-slate-400 hover:text-white hover:border-white" onClick={() => setRegisterStep(1)}>
                        Назад
                    </Button>
                    <Button variant="secondary" className="w-full text-base" type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Завершить'}
                    </Button>
                </div>
             </form>
         )}
       </div>
    </div>
  );
};

// --- Legal Pages ---
const LegalPage = ({ type, onBack }: { type: 'privacy' | 'terms', onBack: () => void }) => {
  const isPrivacy = type === 'privacy';

  const privacyContent = (
    <>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Общие положения</h2>
        <p>Настоящая Политика конфиденциальности описывает, как сервис «НаКорте» (далее — «Сервис», «мы») собирает, использует и защищает персональные данные пользователей (далее — «Пользователь», «вы») при использовании платформы.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">2. Какие данные мы собираем</h2>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Имя и фамилия</li>
          <li>Адрес электронной почты</li>
          <li>Город проживания</li>
          <li>Возраст</li>
          <li>Уровень игры (NTRP / РТТ)</li>
          <li>РНИ (для игроков категории РТТ Про)</li>
          <li>Данные, добровольно указанные в профиле</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Цели обработки данных</h2>
        <p className="mb-2">Ваши данные используются исключительно для:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Регистрации и идентификации в Сервисе</li>
          <li>Подбора партнёров и соперников по уровню игры</li>
          <li>Отображения профиля в сообществе (только с вашего согласия)</li>
          <li>Улучшения качества Сервиса</li>
          <li>Направления уведомлений, связанных с деятельностью Сервиса</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">4. Хранение и защита данных</h2>
        <p>Мы принимаем все разумные технические и организационные меры для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Данные хранятся на защищённых серверах и не передаются третьим лицам без вашего явного согласия, за исключением случаев, предусмотренных законодательством Российской Федерации.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">5. Передача данных третьим лицам</h2>
        <p>Мы не продаём, не обмениваем и не передаём ваши персональные данные третьим лицам в коммерческих целях. Данные могут быть раскрыты только по требованию уполномоченных государственных органов в соответствии с законодательством РФ.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">6. Права пользователя</h2>
        <p className="mb-2">Вы вправе в любой момент:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Запросить доступ к своим персональным данным</li>
          <li>Потребовать исправления или удаления данных</li>
          <li>Отозвать согласие на обработку персональных данных</li>
        </ul>
        <p className="mt-2">Для реализации прав обратитесь к нам через форму обратной связи или по электронной почте.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">7. Cookies</h2>
        <p>Сервис может использовать файлы cookie для улучшения пользовательского опыта. Вы можете отключить cookies в настройках браузера, однако это может повлиять на функциональность Сервиса.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">8. Изменения политики</h2>
        <p>Мы оставляем за собой право вносить изменения в настоящую Политику. При существенных изменениях мы уведомим вас через Сервис. Продолжение использования Сервиса после внесения изменений означает ваше согласие с новой редакцией.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">9. Контакты</h2>
        <p>По всем вопросам, связанным с обработкой персональных данных, обращайтесь через встроенный чат поддержки или по электронной почте, указанной в разделе «О нас».</p>
      </section>
    </>
  );

  const termsContent = (
    <>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Предмет соглашения</h2>
        <p>Настоящие Условия обслуживания регулируют использование платформы «НаКорте» (далее — «Сервис»). Регистрируясь в Сервисе, вы соглашаетесь соблюдать данные Условия в полном объёме.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">2. Статус сервиса</h2>
        <p>На данный момент Сервис находится на стадии бета-тестирования и предоставляется <span className="font-semibold text-lime-600">полностью бесплатно</span>. Мы оставляем за собой право изменить условия доступа к отдельным функциям в будущем, уведомив пользователей заблаговременно.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Регистрация и аккаунт</h2>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Для использования большинства функций Сервиса необходима регистрация</li>
          <li>Вы обязуетесь предоставлять достоверные данные при регистрации</li>
          <li>Вы несёте ответственность за сохранность данных своего аккаунта</li>
          <li>Один пользователь — один аккаунт</li>
          <li>Регистрация доступна лицам, достигшим 14 лет</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">4. Правила поведения</h2>
        <p className="mb-2">Пользователям запрещено:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Публиковать оскорбительный, дискриминационный или незаконный контент</li>
          <li>Спамить и рассылать рекламу без согласования с администрацией</li>
          <li>Использовать Сервис в мошеннических целях</li>
          <li>Предпринимать попытки взлома или несанкционированного доступа</li>
          <li>Выдавать себя за другого пользователя или организацию</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">5. Пользовательский контент</h2>
        <p>Размещая материалы (фотографии, тексты, комментарии), вы подтверждаете, что обладаете необходимыми правами на них, и предоставляете Сервису право отображать их в рамках платформы. Мы не претендуем на право собственности на ваш контент.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">6. Ограничение ответственности</h2>
        <p>Сервис предоставляется «как есть». В период бета-тестирования возможны сбои и перебои в работе. Мы не несём ответственности за убытки, возникшие в результате использования или невозможности использования Сервиса.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">7. Блокировка аккаунта</h2>
        <p>Мы оставляем за собой право заблокировать или удалить аккаунт пользователя при нарушении настоящих Условий без предварительного уведомления.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">8. Изменения условий</h2>
        <p>Мы можем изменять настоящие Условия. Актуальная версия всегда доступна на этой странице. При существенных изменениях мы уведомим вас через Сервис.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">9. Применимое право</h2>
        <p>Настоящие Условия регулируются законодательством Российской Федерации. Все споры разрешаются в установленном законом порядке.</p>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm"
          >
            <ChevronLeft size={20} /> На главную
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center">
            <img src="/assets/logo.svg" alt="НаКорте" className="h-11 w-auto" style={{ filter: 'invert(1)' }} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <div className="mb-8 pb-8 border-b border-slate-100">
            <span className="inline-block bg-lime-100 text-lime-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              {isPrivacy ? 'Правовые документы' : 'Правовые документы'}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              {isPrivacy ? 'Политика конфиденциальности' : 'Условия обслуживания'}
            </h1>
            <p className="text-slate-500 text-sm">
              Последнее обновление: 23 февраля 2026 г. · Сервис «НаКорте»
            </p>
          </div>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            {isPrivacy ? privacyContent : termsContent}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              Если у вас есть вопросы — напишите нам через чат поддержки.
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={16} /> Вернуться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function FindPartnerSeoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const benefits = [
    {
      title: 'Подбор по уровню игры',
      description: 'Фильтруйте игроков по NTRP, РТТ-статусу, городу и активности, чтобы быстрее находить подходящего партнёра для тренировки или матча.',
      icon: <BarChart3 className="text-lime-400" size={22} />,
    },
    {
      title: 'Игроки рядом с вами',
      description: 'Сервис показывает теннисистов из вашего города и помогает быстро договориться о совместной игре на удобном корте.',
      icon: <Map className="text-lime-400" size={22} />,
    },
    {
      title: 'Быстрый старт общения',
      description: 'После регистрации можно написать игроку, обсудить формат встречи, уровень нагрузки и выбрать подходящее время.',
      icon: <MessageSquare className="text-lime-400" size={22} />,
    },
  ];

  const steps = [
    'Создайте профиль и укажите город, уровень и формат игры.',
    'Выберите фильтры поиска: уровень, имя игрока и город.',
    'Откройте карточки теннисистов и найдите подходящего партнёра.',
    'Напишите игроку и договоритесь о матче или совместной тренировке.',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.18),transparent_28%),radial-gradient(circle_at_left,rgba(34,197,94,0.14),transparent_22%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-24 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Search size={14} /> Сервис подбора партнёров
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Поиск партнёра
              <span className="block text-lime-400">по теннису</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              «НаКорте» помогает быстро находить теннисистов вашего уровня в своём городе, договариваться о спаррингах,
              тренировках и любительских матчах. Функция подходит новичкам, любителям и игрокам с рейтингом РТТ.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Найти партнёра
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-slate-300">Что даёт поиск</span>
                <Users className="text-lime-400" size={20} />
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5" size={18} />
                  <p className="text-sm text-slate-300">Подбор соперников и партнёров по уровню, географии и целям игры.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5" size={18} />
                  <p className="text-sm text-slate-300">Быстрый выход на диалог и согласование времени матча.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5" size={18} />
                  <p className="text-sm text-slate-300">Удобный старт для регулярных тренировок и новых знакомств в теннисном комьюнити.</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-lime-400/20 bg-lime-400/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-lime-400 font-black mb-2">Для кого</p>
              <p className="text-slate-200 leading-relaxed">
                Для игроков, которые хотят найти спарринг-партнёра, собрать компанию на корт, подготовиться к турниру
                или просто играть чаще без долгих поисков в чатах и мессенджерах.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                {benefit.icon}
              </div>
              <h2 className="text-xl font-bold mb-3">{benefit.title}</h2>
              <p className="text-slate-400 leading-relaxed">{benefit.description}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Найдите игрока за несколько шагов</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что умеет сервис поиска партнёра</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Функция поиска партнёра по теннису на платформе «НаКорте» создана для тех, кто хочет быстро подобрать
                игрока по уровню, рейтингу, городу и формату матча. Вместо бесконечных переписок в чатах вы получаете
                структурированный каталог теннисистов и понятные фильтры.
              </p>
              <p>
                Пользователь может найти партнёра для одиночной игры, совместной тренировки, спарринга перед турниром
                или регулярных встреч на корте. Это особенно удобно в больших городах, где важно быстро отсечь игроков,
                которые не подходят по уровню или графику.
              </p>
              <p>
                После регистрации доступно общение с игроками, а также другие возможности платформы: бронирование кортов,
                участие в турнирах, ведение дневника и использование AI-инструментов для тренировочного процесса.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Откройте поиск партнёра и найдите матч уже сегодня</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте», заполните профиль и начните искать игроков для тренировок, спаррингов и любительских встреч.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Зарегистрироваться
          </Button>
        </div>
      </section>
    </div>
  );
}

function FindCourtsSeoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const courts = [
    {
      name: 'Спартак (Ширяевка)',
      address: 'Майский просек, 7, Москва',
      price: '2200 ₽',
      rating: '4.7',
      surface: 'Грунт, трава',
      color: 'bg-orange-500',
      image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop',
    },
    {
      name: 'Теннисный клуб "Чайка"',
      address: 'Ленинградское шоссе, 45Б, стр. 2, Москва',
      price: '3200 ₽',
      rating: '4.6',
      surface: 'Хард',
      color: 'bg-blue-500',
      image: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?q=80&w=1200&auto=format&fit=crop',
    },
  ];

  const advantages = [
    'Поиск теннисных кортов по названию клуба, адресу, городу и типу покрытия.',
    'Сравнение площадок по цене за час, рейтингу, покрытию и расположению.',
    'Быстрый переход к бронированию без звонков и долгих переписок.',
  ];

  const steps = [
    'Введите название клуба, район или адрес в строке поиска.',
    'Отфильтруйте площадки по городу и типу покрытия.',
    'Сравните карточки кортов по цене, рейтингу и доступности.',
    'Откройте нужную площадку и перейдите к бронированию.',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_22%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 md:pt-24 md:pb-12 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-start">
          <div>
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Map size={14} /> Поиск и бронирование кортов
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Бронирование
              <span className="block text-lime-400">теннисных кортов</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте помогает искать теннисные корты по городу, адресу, клубу и покрытию. Пользователь видит карточки площадок,
              сравнивает цены и рейтинг, а затем быстро переходит к бронированию удобного корта.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Найти корт
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Города</div>
                  <div className="text-2xl font-black text-white">20+</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Рейтинг</div>
                  <div className="text-2xl font-black text-white">4.6+</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Фильтры</div>
                  <div className="text-2xl font-black text-white">3</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Поиск кортов по адресу, клубу, городу и покрытию в одном интерфейсе.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Карточки площадок с фото, рейтингом, ценой за час и быстрым бронированием.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Удобный сценарий для поиска корта рядом с домом, работой или в нужном районе.</p>
                </div>
              </div>
            </div>

          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-2 mb-4 overflow-hidden">
              <div className="flex-1 flex items-center gap-3 px-3 py-3 text-slate-400 text-sm min-w-0">
                <Search size={18} className="shrink-0" />
                <span className="truncate">Название клуба или адрес...</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold">Все города</div>
                <div className="px-4 py-3 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold">Все покрытия</div>
              </div>
            </div>
            <div className="space-y-4">
              {courts.map((court) => (
                <article key={court.name} className="rounded-[28px] bg-white text-slate-900 p-2 shadow-sm border border-slate-200 overflow-hidden">
                  <div className="relative h-52 rounded-[22px] overflow-hidden">
                    <img src={court.image} alt={court.name} className="w-full h-full object-cover" />
                    <div className={`absolute top-4 left-4 ${court.color} text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg tracking-wider`}>
                      {court.surface}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {court.rating}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-2xl mb-2 leading-tight">{court.name}</h3>
                    <p className="text-slate-500 font-medium flex items-center gap-2 mb-5 line-clamp-1">
                      <MapPin size={18} className="shrink-0 text-slate-400" /> {court.address}
                    </p>
                    <div className="flex items-end justify-between pt-4 border-t border-slate-100 gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Цена</div>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-2xl text-slate-900">{court.price}</span>
                          <span className="text-xs font-medium text-slate-400">/ час</span>
                        </div>
                      </div>
                      <button className="bg-slate-900 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 rounded-xl hover:bg-lime-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-900/10">
                        Забронировать
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {advantages.map((advantage) => (
            <article key={advantage} className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                <Calendar className="text-lime-400" size={22} />
              </div>
              <p className="text-slate-300 leading-relaxed">{advantage}</p>
            </article>
          ))}
        </div>

        <div className="grid xl:grid-cols-2 gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Найдите и забронируйте корт за пару минут</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что умеет поиск теннисных кортов</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Функция поиска теннисных кортов на платформе «НаКорте» помогает быстро подобрать площадку по местоположению,
                стоимости, рейтингу клуба и типу покрытия. Пользователь сразу видит ключевую информацию в карточке: фото,
                адрес, цену за час и формат покрытия.
              </p>
              <p>
                Такой сценарий особенно удобен, когда нужно срочно найти свободный корт рядом с домом, работой или в новом районе.
                Вместо поиска по сайтам клубов пользователь получает единый каталог площадок с удобными фильтрами и наглядным сравнением.
              </p>
              <p>
                Здесь показано, как выглядит интерфейс поиска кортов в приложении: строка поиска, фильтры по городам и покрытиям,
                а также реальные примеры карточек площадок по мотивам интерфейса из приложения.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Выберите удобный корт и бронируйте игру онлайн</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте» и получите доступ к поиску теннисных клубов, фильтрации по покрытию и быстрому бронированию площадок.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Перейти к поиску кортов
          </Button>
        </div>
      </section>
    </div>
  );
}

function AiCoachInfoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const benefits = [
    'AI-тренер отвечает на вопросы по тактике, технике, подготовке к матчу и игровым ситуациям.',
    'В личном кабинете доступны готовые тренировки, которые можно выполнять по шагам и отмечать как завершённые.',
    'За выполнение тренировок начисляются XP-очки, которые отражают вашу активность и прогресс в профиле.',
  ];

  const steps = [
    'Откройте AI-тренера в личном кабинете и задайте вопрос по игре или тренировкам.',
    'Получите персональные рекомендации по тактике, технике и подготовке к следующему матчу.',
    'Выберите готовую тренировку, выполните задания по шагам и отметьте её как завершённую.',
    'Получите XP-очки в профиле за активность и отслеживайте свой прогресс в личном кабинете.',
  ];

  const trainingCards = [
    {
      title: 'Тренировка: Точность подачи',
      goal: 'Увеличить процент попадания первой подачи в квадрат.',
      inventory: 'Корзина мячей (30–50 шт), конусы или мишени.',
      items: [
        'Разминка (5 мин) — имитация движения подачи без мяча.',
        'Подача по зонам (15 мин) — 10 подач в каждую цель.',
        'Игра на счёт (10 мин) — вторая подача без двойных ошибок.',
      ],
    },
    {
      title: 'Тренировка: Игра у сетки',
      goal: 'Уверенно завершать розыгрыши у сетки.',
      inventory: 'Корзина мячей, партнёр или стенка.',
      items: [
        'Разминка (5 мин) — короткие удары с лёта с партнёром.',
        'Реакция и техника (15 мин) — игра с лёта по разным сторонам.',
        'Смэш (10 мин) — отработка удара над головой по свечам.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_22%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-14 grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-stretch">
          <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Zap size={14} /> AI-тренер в личном кабинете
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              AI-тренер
              <span className="block text-lime-400">по теннису</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте даёт доступ к AI-тренеру, который помогает разбирать игровые ситуации, подсказывает тактические решения
              и предлагает готовые тренировки. Все рекомендации доступны прямо в личном кабинете, без переключения между сервисами.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Открыть AI-тренера
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Советы</div>
                  <div className="text-2xl font-black text-white">24/7</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Тренировки</div>
                  <div className="text-2xl font-black text-white">Пошагово</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Награда</div>
                  <div className="text-2xl font-black text-white">XP</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Спроси о тактике на приёме, подаче, игре у сетки или подготовке к сопернику.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Получай готовые тренировочные сценарии и отмечай выполненные задания прямо в кабинете.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>За выполненные тренировки система начисляет XP-очки, которые видны в профиле пользователя.</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-auto pt-6">
              {benefits.map((benefit, index) => (
                <article key={benefit} className={`rounded-3xl border border-white/10 bg-white/5 p-6 ${index === 2 ? 'md:col-span-2' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                    <Zap className="text-lime-400" size={22} />
                  </div>
                  <p className="text-slate-300 leading-relaxed">{benefit}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col h-full gap-5">
            <div className="rounded-[32px] border border-white/10 bg-white p-4 shadow-sm overflow-hidden">
              <div className="flex justify-end mb-4">
                <div className="bg-slate-900 text-white px-5 py-3 rounded-[20px] text-sm max-w-[70%]">
                  Как тактически обыграть соперника на приёме?
                </div>
              </div>
              <div className="rounded-[24px] border border-lime-200 bg-lime-100/80 text-slate-700 p-6 leading-relaxed text-sm">
                <p className="mb-4">Ключевые тактические приёмы на приёме подачи:</p>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-slate-800 mb-1">1. Позиция</p>
                    <p>Адаптируй дистанцию в зависимости от силы подачи соперника и дай себе больше времени на замах.</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 mb-1">2. Чтение подачи</p>
                    <p>Следи за движением ракетки и корпуса, чтобы предугадывать направление, вращение и силу.</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 mb-1">3. Атака второй подачи</p>
                    <p>На слабой второй подаче смещайся вперёд и занимай более агрессивную позицию.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-3 items-center">
                <input
                  readOnly
                  value="Спроси совет у тренера..."
                  className="flex-1 bg-white border-2 border-lime-300 rounded-2xl px-5 py-4 text-slate-400 outline-none"
                />
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-[760px] mt-auto">
              {trainingCards.map((card) => (
                <article key={card.title} className="rounded-[28px] bg-white text-slate-900 shadow-sm overflow-hidden border border-slate-200 self-start">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-6">
                      <h3 className="text-[22px] font-black leading-tight">{card.title}</h3>
                      <X className="text-slate-400 shrink-0" size={24} />
                    </div>

                    <div className="rounded-[22px] bg-slate-50 p-5 mb-6 border border-slate-100">
                      <p className="text-slate-700 leading-relaxed mb-3"><strong>Цель:</strong> {card.goal}</p>
                      <p className="text-slate-700 leading-relaxed"><strong>Инвентарь:</strong> {card.inventory}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                      {card.items.map((item, index) => (
                        <div key={item} className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-lime-300 text-slate-900 font-black flex items-center justify-center shrink-0 mt-1 text-sm">
                            {index + 1}
                          </div>
                          <p className="text-slate-700 leading-relaxed font-medium text-[15px]">{item}</p>
                        </div>
                      ))}
                    </div>

                    <button className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-slate-900/20">
                      Я выполнил тренировку
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">AI-тренер подсказывает и ведёт по тренировкам</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что умеет AI-тренер по теннису</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                AI-тренер на платформе «НаКорте» помогает игроку получать быстрые ответы на вопросы по тактике и технике.
                Можно разобрать сложный розыгрыш, понять, как действовать против определённого типа соперника, или получить
                рекомендации перед ближайшей тренировкой.
              </p>
              <p>
                В личном кабинете AI-тренер дополняется готовыми тренировками: вы видите цель занятия, необходимый инвентарь,
                последовательность шагов и можете отмечать выполнение. Это превращает рекомендации в понятный тренировочный план.
              </p>
              <p>
                За выполнение тренировок пользователь получает XP-очки. Они отображаются в профиле и помогают отслеживать активность,
                регулярность занятий и общий прогресс внутри платформы.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Откройте AI-тренера и тренируйтесь с персональными подсказками</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте», используйте AI-тренера в личном кабинете, выполняйте упражнения и зарабатывайте XP-очки за прогресс.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Перейти к AI-тренеру
          </Button>
        </div>
      </section>
    </div>
  );
}

function CommunityInfoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const categories = ['Все события', 'Группы', 'Результаты матчей', 'Поиск игры', 'Барахолка'];

  const advantages = [
    'В одном разделе собраны новости клуба, посты игроков, результаты матчей, группы, турниры и барахолка.',
    'Пользователь может публиковать события, комментировать результаты, искать игру и видеть лучших игроков сезона.',
    'Сообщество превращает приложение в живую теннисную экосистему, где удобно общаться, следить за активностью и находить нужные сервисы.',
  ];

  const steps = [
    'Откройте вкладку сообщества и выберите нужный фильтр: все события, группы, результаты матчей, поиск игры или барахолка.',
    'Просматривайте ленту публикаций, карточки турниров, итоговые результаты матчей и рейтинг топ-игроков.',
    'Создавайте собственные публикации, делитесь событиями клуба, обсуждайте матчи и откликайтесь на предложения других игроков.',
    'Используйте группы и барахолку для общения внутри теннисного сообщества, поиска нужных вещей и новых знакомств.',
  ];

  const communitySections = [
    {
      title: 'Лента событий',
      description: 'Публикации игроков и администрации, обсуждения, комментарии и быстрый переход к главным новостям клуба.',
      icon: MessageSquare,
    },
    {
      title: 'Турниры и результаты',
      description: 'Анонсы ближайших турниров, результаты матчей, победители и ключевые события сезона в одной вкладке.',
      icon: Trophy,
    },
    {
      title: 'Группы и поиск игры',
      description: 'Общение по интересам, локальные клубные группы и публикации для поиска соперника или компании на матч.',
      icon: Users,
    },
    {
      title: 'Барахолка',
      description: 'Объявления о продаже экипировки, аксессуаров и инвентаря внутри знакомого теннисного комьюнити.',
      icon: Briefcase,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_24%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-14 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-stretch">
          <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Users size={14} /> Сообщество теннисистов
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Теннисное
              <span className="block text-lime-400">сообщество</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте объединяет игроков, тренеров и любителей тенниса в одной ленте событий. Здесь можно следить за турнирами,
              смотреть результаты матчей, вступать в группы, публиковать новости, искать игру и пользоваться барахолкой без перехода в другие сервисы.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Открыть сообщество
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Разделы</div>
                  <div className="text-2xl font-black text-white">5</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Посты</div>
                  <div className="text-2xl font-black text-white">Лента</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Игроки</div>
                  <div className="text-2xl font-black text-white">Топ</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Фильтры по событиям помогают быстро перейти от новостей к матчам, группам, поиску игры и объявлениям.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>В ленте видны публикации администрации и игроков, а также результаты турниров с победителями и счётом.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Карточки турниров, группы и топ-игроки делают сообщество полезным не только для чтения, но и для действий.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 h-full">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Разделы сообщества</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((category, index) => (
                  <div
                    key={category}
                    className={`rounded-full px-4 py-2.5 text-sm font-bold border ${index === 0 ? 'bg-lime-400 text-slate-950 border-lime-400' : 'bg-slate-900/60 text-slate-300 border-white/10'}`}
                  >
                    {category}
                  </div>
                ))}
              </div>
              <p className="text-slate-300 leading-relaxed">
                Сообщество построено как единое пространство для общения и всех околотеннисных активностей. Пользователь выбирает нужный раздел
                и сразу попадает к релевантному контенту: новостям, обсуждениям, группам, результатам матчей, поиску игры или объявлениям.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-auto">
              {communitySections.map((section) => {
                const Icon = section.icon;

                return (
                  <article key={section.title} className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 h-full">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center mb-5">
                      <Icon className="text-lime-400" size={22} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 leading-tight">{section.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{section.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {advantages.map((advantage) => (
            <article key={advantage} className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                <Users className="text-lime-400" size={22} />
              </div>
              <p className="text-slate-300 leading-relaxed">{advantage}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Все теннисные активности в одной ленте</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что умеет раздел сообщества</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Сообщество на платформе «НаКорте» — это единая лента, в которой объединены все важные события теннисной жизни.
                Пользователь видит анонсы турниров, публикации администрации, результаты сыгранных матчей, посты игроков и тематические группы.
              </p>
              <p>
                Раздел помогает не только читать новости, но и взаимодействовать: публиковать сообщения, обсуждать результаты, следить за топом игроков,
                переходить к поиску игры и находить полезные объявления в барахолке. Это делает приложение живым и удерживает всю коммуникацию внутри одной платформы.
              </p>
              <p>
                По структуре сообщество разделено на понятные категории: все события, группы, результаты матчей, поиск игры и барахолка.
                Благодаря этому игрок быстро переключается между контентом и использует приложение как полноценную социальную среду для тенниса.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Публикуйте события, следите за матчами и общайтесь внутри клуба</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте» и получите доступ к ленте сообщества, группам, турнирным публикациям, поиску игры и барахолке.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Перейти в сообщество
          </Button>
        </div>
      </section>
    </div>
  );
}

function TennisDiaryInfoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const diaryBenefits = [
    'Записывайте тренировки, матчи, цели и общий прогресс в одном личном пространстве без таблиц и сторонних заметок.',
    'Фиксируйте настроение, оценку элементов игры, сильные и слабые стороны, чтобы видеть реальные изменения от недели к неделе.',
    'Собирайте досье на соперников: покрытия, любимые паттерны, слабые зоны, поведение под давлением и рекомендации к следующему матчу.',
  ];

  const diarySteps = [
    'Создайте запись после тренировки или матча, выберите тип события и кратко опишите, что получилось, а что стоит улучшить.',
    'Оцените подачу, форхенд, бэкхенд, игру с лёта и передвижение, чтобы сформировать объективную картину текущей формы.',
    'Добавьте настроение, наблюдения по сопернику и личные выводы — это превращает обычную заметку в рабочий инструмент анализа.',
    'Возвращайтесь к прошлым записям перед тренировкой или турниром, чтобы видеть динамику и готовить более точный план действий.',
  ];

  const sections = [
    {
      title: 'Записи после матчей и тренировок',
      text: 'Дневник помогает сохранять не только счёт или краткую заметку, но и контекст: над чем работали, какие решения сработали и какие ошибки повторялись.',
      icon: FileText,
    },
    {
      title: 'Оценка элементов игры',
      text: 'Система оценок по подаче, форхенду, бэкхенду, игре у сетки и передвижению превращает ощущения игрока в понятную аналитику прогресса.',
      icon: TrendingUp,
    },
    {
      title: 'Досье на соперников',
      text: 'Отдельный блок позволяет вести заметки по соперникам: стиль игры, любимые паттерны, слабые зоны, поведение в важных розыгрышах и рекомендации на следующий матч.',
      icon: Target,
    },
    {
      title: 'Мотивация и осознанность',
      text: 'Записи по настроению, целям и ощущениям помогают игроку лучше понимать своё состояние и сохранять дисциплину между матчами и тренировками.',
      icon: Heart,
    },
  ];

  const diaryMetrics = [
    { label: 'Типы записей', value: '4+' },
    { label: 'Оценка игры', value: '5 зон' },
    { label: 'Досье', value: 'По соперникам' },
  ];

  const quickNotes = [
    'Что сработало в розыгрышах',
    'Где терялась уверенность',
    'Что взять в следующую тренировку',
  ];

  return (
    <div className="min-h-screen bg-[#130f0b] text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#130f0b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_28%),radial-gradient(circle_at_left,rgba(163,230,53,0.12),transparent_20%)]" />
        <div className="absolute top-20 left-[8%] w-32 h-32 rounded-full bg-amber-300/10 blur-3xl animate-diary-float" />
        <div className="absolute bottom-10 right-[10%] w-40 h-40 rounded-full bg-lime-300/10 blur-3xl animate-diary-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-16 flex flex-col gap-5 md:gap-6">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-stretch">
            <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <FileText size={14} /> Личный дневник игрока
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Дневник
              <span className="block text-lime-400">теннисиста</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              Дневник теннисиста на платформе «НаКорте» помогает не просто сохранять записи, а системно анализировать игру. Здесь можно фиксировать
              тренировки, матчи, настроение, уровень выполнения элементов, заметки по соперникам и личные выводы, чтобы каждый следующий выход на корт был осознаннее.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20 animate-diary-glow">
                Открыть дневник
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[30px] border border-amber-200/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {diaryMetrics.map((metric, index) => (
                  <div key={metric.label} className={`min-w-0 rounded-2xl bg-slate-950/50 border border-white/10 p-4 ${index === 2 ? 'col-span-2' : ''}`}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">{metric.label}</div>
                    <div
                      className={`font-black text-white ${
                        metric.value === 'По соперникам'
                          ? 'leading-none'
                          : `leading-tight ${metric.value.length > 8 ? 'text-lg sm:text-xl md:text-2xl' : 'text-2xl'}`
                      }`}
                    >
                      {metric.value === 'По соперникам' ? (
                        <div className="max-w-full text-[clamp(1.35rem,3vw,2.5rem)] tracking-tight">
                          <span className="block">По</span>
                          <span className="block whitespace-nowrap">соперникам</span>
                        </div>
                      ) : (
                        metric.value
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Каждая запись помогает закрепить выводы сразу после игры, пока ощущения ещё свежие и точные.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>История записей показывает, как меняется техника, уверенность и качество решений на дистанции.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Досье на соперников делает подготовку к матчам предметной и помогает не терять важные наблюдения.</p>
                </div>
              </div>
            </div>
            </div>

            <div className="relative flex flex-col h-full">
              <div className="absolute inset-x-6 top-6 h-20 bg-gradient-to-r from-amber-300/10 via-lime-300/10 to-transparent blur-3xl pointer-events-none" />

              <div className="relative rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(43,30,20,0.95),rgba(24,18,13,0.98))] p-6 md:p-8 shadow-[0_24px_100px_rgba(0,0,0,0.38)] overflow-hidden animate-diary-float h-full">
                <div className="absolute inset-0 opacity-40 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_40%,rgba(163,230,53,0.06))] animate-diary-shimmer" />
                <div className="relative flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-amber-200/70 text-[11px] font-black uppercase tracking-[0.25em] mb-2">Новый визуал страницы</p>
                    <h2 className="text-3xl font-black tracking-tight">Личный журнал игрока</h2>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-lime-400/15 border border-lime-300/20 flex items-center justify-center">
                    <FileText className="text-lime-300" size={24} />
                  </div>
                </div>

                <div className="grid 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 items-start">
                  <div className="min-w-0 rounded-[26px] bg-[#f6f1e8] text-slate-900 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">Запись дня</div>
                        <div className="text-xl sm:text-2xl font-black leading-tight">Матч против агрессивного соперника</div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-lime-100 text-lime-700 flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                      <p>Сегодня лучше работала подача в тело и перевод по диагонали под форхенд соперника.</p>
                      <p>На важных мячах не хватало глубины с бэкхенда, из-за чего приходилось защищаться.</p>
                      <p>На следующей тренировке сделать акцент на первом ударе после подачи и на игре под давлением.</p>
                    </div>
                  </div>

                  <div className="space-y-4 min-w-0">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="min-w-0 rounded-[24px] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-3">
                          <TrendingUp size={14} className="text-lime-400" /> Прогресс
                        </div>
                        <div className="space-y-2.5 text-[15px] sm:text-base">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><span className="text-slate-400 min-w-0">Подача</span><span className="font-black text-white shrink-0">8/10</span></div>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><span className="text-slate-400 min-w-0">Форхенд</span><span className="font-black text-white shrink-0">7/10</span></div>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><span className="text-slate-400 min-w-0">Передвижение</span><span className="font-black text-white shrink-0">6/10</span></div>
                        </div>
                      </div>
                      <div className="min-w-0 rounded-[24px] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-3">
                          <Heart size={14} className="text-pink-400" /> Состояние
                        </div>
                        <div className="text-[28px] sm:text-[32px] font-black text-white mb-3 leading-none">Хорошее</div>
                        <p className="text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-none">Спокойный настрой до матча и уверенность в длинных розыгрышах.</p>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Досье на соперника</div>
                          <div className="text-lg sm:text-xl font-black text-white leading-tight">Алексей Смирнов</div>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
                          <Target size={20} />
                        </div>
                      </div>
                      <div className="grid 2xl:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                          <div className="text-slate-500 text-[10px] uppercase tracking-[0.15em] font-black mb-2">Сильные стороны</div>
                          <p className="text-slate-300 leading-relaxed">Плотный форхенд, активный приём второй подачи, быстрый вход в корт.</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                          <div className="text-slate-500 text-[10px] uppercase tracking-[0.15em] font-black mb-2">Слабые зоны</div>
                          <p className="text-slate-300 leading-relaxed">Низкий мяч под бэкхенд, нестабильность в длинных розыгрышах, ошибки под давлением.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[0.92fr_1.08fr] gap-4 items-start">
            <div className="rounded-[26px] border border-amber-200/10 bg-white/5 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/70 font-black mb-1">Быстрый шаблон записи</div>
                  <div className="text-xl font-black text-white">Что зафиксировать сразу после матча</div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-lime-400/10 text-lime-300 flex items-center justify-center shrink-0">
                  <Check size={20} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-3">
                {quickNotes.map((note, index) => (
                  <div key={note} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Пункт {index + 1}</div>
                    <p className="text-slate-300 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              {sections.map((section, index) => {
                const Icon = section.icon;

                return (
                  <article
                    key={section.title}
                    className={`rounded-[28px] border border-white/10 p-6 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 ${index % 2 === 0 ? 'bg-[#201812]/85' : 'bg-[#17130f]/85'}`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-center mb-5">
                      <Icon className="text-lime-400" size={22} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 leading-tight">{section.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{section.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {diaryBenefits.map((benefit) => (
            <article key={benefit} className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center mb-5">
                <FileText className="text-lime-400" size={22} />
              </div>
              <p className="text-slate-300 leading-relaxed">{benefit}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full backdrop-blur-sm">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Системный подход к развитию игрока</h2>
            <div className="space-y-4">
              {diarySteps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-amber-200/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-amber-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что даёт дневник теннисиста в реальной игре</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Дневник теннисиста на платформе «НаКорте» нужен тем, кто хочет прогрессировать не хаотично, а осмысленно. Он помогает сохранять опыт
                после каждой тренировки или матча, чтобы не терять важные наблюдения и постепенно превращать их в игровые решения.
              </p>
              <p>
                Для пользователя это удобный личный журнал: здесь можно быстро записать ощущения, оценить качество ударов, отметить эмоциональное состояние,
                зафиксировать цели и сделать выводы на следующую сессию. Такой подход особенно полезен, когда игрок занимается регулярно и хочет видеть реальную динамику.
              </p>
              <p>
                Отдельная ценность дневника — блок досье на соперников. Он помогает помнить стиль игры конкретного человека, его сильные и слабые стороны,
                покрытие, паттерны подачи и поведение в напряжённых моментах. Перед следующим матчем игрок получает уже не интуитивную, а подготовленную стратегию.
              </p>
              <p>
                Эта страница оформлена иначе, чем другие разделы: визуал ближе к личному спортивному журналу с тёплыми акцентами, карточками заметок и мягкими анимациями.
                Такой стиль поддерживает идею вдумчивой работы над собой и делает инструмент более живым и эмоциональным.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Сохраняйте матчи, тренировки и мысли в одном личном дневнике</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте», фиксируйте игровой прогресс, собирайте досье на соперников и превращайте каждую запись в понятный шаг к более сильной игре.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20 animate-diary-glow">
            Перейти к дневнику
          </Button>
        </div>
      </section>
    </div>
  );
}

function Tactics3DInfoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const capabilities = [
    'Интерактивный 3D-корт помогает рисовать тактические схемы прямо поверх игровой зоны и видеть розыгрыш целиком.',
    'Пользователь меняет цвет траекторий, задаёт низкую или высокую дугу мяча и быстро очищает схему для новой комбинации.',
    'Сервис подходит для разбора подач, возвратов, выходов к сетке, игры по диагонали и сценариев против конкретного соперника.',
  ];

  const steps = [
    'Откройте 3D-тактику в личном кабинете и выберите участок корта, который хотите разобрать.',
    'Нарисуйте траектории ударов на интерактивном корте, меняя цвет и тип дуги для разных сценариев.',
    'Соберите комбинацию из подачи, первого удара, перехода к сетке или защитного розыгрыша.',
    'Сохраните идею для разбора с тренером или очистите схему и быстро постройте новый вариант тактики.',
  ];

  const examples = [
    {
      title: 'Подача + первый удар',
      description: 'Разберите, куда подавать, как открывать корт следующим ударом и где завершать атаку.',
      accent: 'from-lime-400/20 to-emerald-400/5',
    },
    {
      title: 'Розыгрыш против левши',
      description: 'Постройте сценарий под конкретного соперника и посмотрите, как менять направления и высоту мяча.',
      accent: 'from-sky-400/20 to-indigo-400/5',
    },
    {
      title: 'Выход к сетке',
      description: 'Смоделируйте короткий мяч, подход, позицию у сетки и завершающий удар по свободной зоне.',
      accent: 'from-amber-400/20 to-orange-400/5',
    },
  ];

  return (
    <div className="min-h-screen bg-[#06111a] text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06111a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_24%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-16 grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-stretch">
          <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Activity size={14} /> 3D разбор тактики
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              3D
              <span className="block text-lime-400">тактика</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте даёт интерактивный 3D-корт для визуального разбора розыгрышей. Игрок или тренер может рисовать траектории,
              моделировать комбинации и быстро объяснять, как строить атаку, защищаться и занимать правильные позиции на корте.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Открыть 3D тактику
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[30px] border border-cyan-400/15 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Режим</div>
                  <div className="text-2xl font-black text-white">3D</div>
                </div>
                <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Траектории</div>
                  <div className="text-2xl font-black text-white">Цвет + дуга</div>
                </div>
                <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Сценарии</div>
                  <div className="text-2xl font-black text-white">Матч</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Разбирайте тактику не словами, а визуально — прямо на корте в перспективе.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Показывайте направления мяча, смену ритма и высоту удара для каждого участка розыгрыша.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Используйте инструмент для самостоятельного анализа и для работы с тренером.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(8,21,32,0.95),rgba(5,12,20,0.98))] p-6 md:p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-cyan-300 text-[11px] font-black uppercase tracking-[0.25em] mb-2">Новый визуал</p>
                <h2 className="text-3xl font-black tracking-tight">Тактический конструктор</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lime-400" />
                <div className="w-3 h-3 rounded-full bg-cyan-400" />
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
            </div>

            <div className="relative rounded-[28px] border border-cyan-300/10 bg-[#0b1c28] p-5 md:p-6 overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(0deg,transparent_24%,rgba(148,163,184,0.22)_25%,transparent_26%,transparent_49%,rgba(148,163,184,0.18)_50%,transparent_51%,transparent_74%,rgba(148,163,184,0.22)_75%,transparent_76%),linear-gradient(90deg,transparent_24%,rgba(148,163,184,0.18)_25%,transparent_26%,transparent_49%,rgba(148,163,184,0.12)_50%,transparent_51%,transparent_74%,rgba(148,163,184,0.18)_75%,transparent_76%)] bg-[length:72px_72px]" />
              <div className="relative aspect-[1.15/1] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(58,130,80,0.95),rgba(39,90,61,0.98))] overflow-hidden">
                <div className="absolute inset-[8%] border-2 border-white/80 rounded-[18px]" />
                <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px bg-white/70 -translate-x-1/2" />
                <div className="absolute left-[18%] right-[18%] top-1/2 h-px bg-white/80 -translate-y-1/2" />
                <div className="absolute left-1/2 top-[8%] bottom-[8%] w-[3px] bg-white/80 -translate-x-1/2 opacity-80" />

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M18 78 C 28 62, 38 57, 50 50" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeDasharray="6 4" strokeLinecap="round" />
                  <path d="M50 50 C 63 44, 74 34, 82 22" stroke="#a3e635" strokeWidth="2.8" fill="none" strokeDasharray="7 5" strokeLinecap="round" />
                  <path d="M20 20 C 34 28, 42 36, 50 50" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeDasharray="5 5" strokeLinecap="round" opacity="0.95" />
                </svg>

                <div className="absolute left-[16%] top-[74%] w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.8)]" />
                <div className="absolute left-[48%] top-[48%] w-4 h-4 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
                <div className="absolute right-[14%] top-[18%] w-4 h-4 rounded-full bg-lime-400 shadow-[0_0_18px_rgba(163,230,53,0.8)]" />

                <div className="absolute right-4 bottom-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Комбинация</div>
                  <div className="text-sm font-bold text-white">Подача → открытие корта → выход к сетке</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-5">
              {examples.map((example) => (
                <article key={example.title} className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${example.accent} p-5`}>
                  <div className="w-11 h-11 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-center mb-4">
                    <Map className="text-lime-400" size={20} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 leading-tight">{example.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{example.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {capabilities.map((capability) => (
            <article key={capability} className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center mb-5">
                <Activity className="text-lime-400" size={22} />
              </div>
              <p className="text-slate-300 leading-relaxed">{capability}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full backdrop-blur-sm">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">От идеи до тактической схемы за несколько действий</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-cyan-300/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-cyan-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что даёт 3D-тактика игроку и тренеру</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                3D-тактика на платформе «НаКорте» позволяет разбирать розыгрыши в пространстве, а не только в теории. Вместо абстрактных объяснений
                пользователь видит корт, направления мяча и порядок действий, что делает анализ быстрее и нагляднее.
              </p>
              <p>
                Инструмент особенно полезен для подготовки к матчу, разбора ошибок после игры и постановки задач на тренировку. Можно показать,
                как открывать корт, куда направлять мяч после подачи, в какой момент идти к сетке и как перестраиваться в обороне.
              </p>
              <p>
                Визуал страницы построен в стилистике цифрового тактического экрана: с неоновыми траекториями, схемой корта и акцентом
                на интерактивный разбор игровых ситуаций. Это помогает сразу передать ощущение анализа розыгрыша прямо внутри сервиса.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Разбирайте розыгрыши и собирайте игровые схемы на 3D-корте</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте» и получите доступ к интерактивной 3D-тактике для анализа матчей, подготовки к соперникам и совместной работы с тренером.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Перейти к 3D тактике
          </Button>
        </div>
      </section>
    </div>
  );
}

function AmateurTournamentsPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const advantages = [
    'Бросайте вызовы игрокам рядом с вами по уровню и двигайтесь вверх по турнирной лестнице клуба.',
    'Получайте очки за победы, активность и сыгранные матчи, чтобы расти в любительском рейтинге.',
    'Используйте отдельные режимы для клубного ладдера, спаррингов и отслеживания рейтинга РТТ.',
  ];

  const steps = [
    'Откройте раздел турниров и выберите формат: клубный рейтинг, спарринг или рейтинг РТТ.',
    'Найдите игрока в таблице, посмотрите его позицию и отправьте вызов на матч в пару касаний.',
    'Сыграйте матч, подтвердите результат и получите очки для продвижения по турнирной лестнице.',
    'Следите за своим местом в любительском рейтинге и отдельно сравнивайте себя с игроками по данным РТТ.',
  ];

  const rankingRows = [
    { place: 1, name: 'Роман Новиков', points: '1 480', trend: '+2', accent: 'text-amber-500' },
    { place: 2, name: 'Александр К.', points: '1 420', trend: '+1', accent: 'text-slate-900' },
    { place: 3, name: 'Игорь Петров', points: '1 390', trend: '—', accent: 'text-slate-900' },
    { place: 8, name: 'Вы', points: '1 180', trend: '+3', accent: 'text-lime-500' },
  ];

  const challengeActions = [
    'Рейтинговый матч — влияет на место в лестнице и клубные очки.',
    'Спарринг — быстрый вызов для игровой практики без давления турнирной сетки.',
    'Матч с игроком РТТ — помогает ориентироваться на официальный рейтинг и уровень соперника.',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_left,rgba(163,230,53,0.12),transparent_24%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-14 grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-stretch">
          <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Trophy size={14} /> Любительские турниры и ладдер
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Любительские
              <span className="block text-lime-400">турниры</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте объединяет клубную турнирную лестницу, спарринги и отслеживание рейтингов в одном разделе.
              Игрок может бросать вызовы соперникам, зарабатывать очки, подниматься по ладдеру и отдельно смотреть,
              как соотносится его прогресс с любительским и РТТ-рейтингом.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Открыть турниры
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Форматы</div>
                  <div className="text-2xl font-black text-white">3</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Очки</div>
                  <div className="text-2xl font-black text-white">ELO</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Вызовы</div>
                  <div className="text-2xl font-black text-white">24/7</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Вызов сопернику из таблицы рейтинга или через отдельный сценарий спарринга.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Рост в турнирной лестнице за счёт побед и активности в клубных матчах.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Параллельный просмотр любительского рейтинга и данных РТТ для более точной оценки уровня.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full gap-5">
            <div className="rounded-[34px] border border-amber-500/20 bg-[#0b0c0f] p-7 overflow-hidden relative shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(251,146,60,0.14),transparent_22%)]" />
              <div className="relative flex items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 mb-3 bg-amber-500/15 px-4 py-1.5 rounded-full border border-amber-500/20 w-fit text-amber-100 text-[10px] font-black uppercase tracking-[0.25em]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Diamond Season
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter leading-none text-white">
                    Road to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-200">#1</span>
                  </h2>
                  <p className="text-amber-200/40 text-[10px] font-bold uppercase tracking-[0.35em] mt-2">Турнирная лестница клуба</p>
                </div>
                <div className="hidden md:flex items-center gap-4 rounded-[26px] border border-white/10 bg-white/5 px-5 py-4">
                  <div className="text-right">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500/70 mb-1">Лидер сезона</div>
                    <div className="text-xl font-black italic text-amber-300">Александр К.</div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-500 to-orange-500 flex items-center justify-center">
                    <Crown size={28} className="text-slate-950" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto] sm:gap-4 items-start sm:items-center">
                <div className="grid w-full grid-cols-3 gap-2 pb-1">
                  <div className="min-w-0 px-2.5 py-3 rounded-2xl bg-lime-400 text-slate-950 text-[12px] sm:text-sm font-black text-center leading-tight">
                    Клубный рейтинг
                  </div>
                  <div className="min-w-0 px-2.5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-[12px] sm:text-sm font-bold text-center leading-tight">
                    Вызовы
                  </div>
                  <div className="min-w-0 px-2.5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-[12px] sm:text-sm font-bold text-center leading-tight">
                    Рейтинг РТТ
                  </div>
                </div>
                <div className="pl-1 sm:pl-0 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                  Обновлено сегодня
                </div>
              </div>
            </div>

            <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5 mt-auto">
              <div className="rounded-[30px] border border-white/10 bg-white p-4 text-slate-900 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 mb-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Турнирная таблица</div>
                    <h3 className="text-xl font-black mt-1">Лидерборд сезона</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                    <Medal size={14} className="text-amber-500" /> Club ELO
                  </div>
                </div>
                <div className="space-y-2 p-2">
                  {rankingRows.map((row) => (
                    <div key={row.name} className="grid grid-cols-[56px_1fr_auto_auto] gap-3 items-center rounded-2xl border border-slate-100 px-4 py-3">
                      <div className={`text-lg font-black ${row.place <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>#{row.place}</div>
                      <div>
                        <div className={`font-bold ${row.accent}`}>{row.name}</div>
                        <div className="text-xs text-slate-400">Любительский рейтинг клуба</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Очки</div>
                        <div className="font-black text-slate-900">{row.points}</div>
                      </div>
                      <div className={`text-sm font-black ${row.trend.startsWith('+') ? 'text-lime-500' : 'text-slate-400'}`}>{row.trend}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-400">Матчмейкинг</div>
                    <h3 className="text-2xl font-black mt-1">Бросить вызов</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-white">Сергей Иванов</div>
                      <div className="text-xs text-slate-400">Позиция #5 • RTT 3.5</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-bold">Подходит по уровню</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Формат</div>
                      <div className="max-w-full text-[15px] sm:text-base font-bold text-white leading-tight">
                        <span className="block">Рейтинговый</span>
                        <span className="block">матч</span>
                      </div>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Когда</div>
                      <div className="max-w-full text-[14px] sm:text-base font-bold text-white leading-tight">
                        <span className="block whitespace-nowrap">Сегодня,</span>
                        <span className="block whitespace-nowrap">19:30</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {challengeActions.map((action) => (
                    <div key={action} className="flex items-start gap-3 text-sm text-slate-300">
                      <Check className="text-lime-400 mt-0.5 shrink-0" size={17} />
                      <p>{action}</p>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-lime-400/20">
                  Отправить вызов
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {advantages.map((advantage) => (
            <article key={advantage} className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                <Trophy className="text-lime-400" size={22} />
              </div>
              <p className="text-slate-300 leading-relaxed">{advantage}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">От вызова до роста в рейтинге</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что дают любительские турниры на НаКорте</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Раздел любительских турниров позволяет игроку не просто искать соперников, а участвовать в постоянной соревновательной
                системе. Вы видите турнирную лестницу клуба, текущее место, прирост очков и можете выбирать, с кем сыграть следующий матч.
              </p>
              <p>
                Через вызовы удобно договариваться как о рейтинговых матчах, так и о спаррингах. Это помогает регулярно получать игровую
                практику, не теряя мотивацию и не выходя из приложения. После каждого подтверждённого результата система пересчитывает позиции.
              </p>
              <p>
                Для игроков, которые ориентируются и на официальный теннисный контур, рядом доступен рейтинг РТТ. Так пользователь видит
                сразу два измерения прогресса: внутренний любительский рейтинг для активной игры в клубе и данные РТТ для сравнения с официальным уровнем.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы начать?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Принимайте вызовы, играйте матчи и поднимайтесь в рейтинге</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на «НаКорте», участвуйте в любительских турнирах, зовите игроков на спарринг и следите за своим местом в клубном и РТТ-рейтинге.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Перейти к турнирам
          </Button>
        </div>
      </section>
    </div>
  );
}

function TournamentDirectorInfoPage({ onBack, onRegister }: { onBack: () => void, onRegister: () => void }) {
  const benefits = [
    {
      icon: <Plus className="text-lime-400" size={22} />,
      title: 'Создание турнира в одном кабинете',
      description: 'Оформляйте турнирную страницу: название, даты, формат, взнос, клуб, покрытие, адрес и лимит участников без таблиц и хаотичных чатов.',
    },
    {
      icon: <FileText className="text-lime-400" size={22} />,
      title: 'Регламент и прозрачные условия',
      description: 'Загружайте PDF-регламент, чтобы игроки заранее видели правила, сроки, формат, стоимость участия и важные организационные детали.',
    },
    {
      icon: <Users className="text-lime-400" size={22} />,
      title: 'Управление заявками и составом',
      description: 'Подтверждайте участников, контролируйте заполнение сетки и ведите турнирный поток в одном интерфейсе директора турниров.',
    },
  ];

  const steps = [
    'Зарегистрируйтесь на НаКорте и выберите сценарий для организаторов турниров.',
    'Создайте турнир, заполните карточку события и добавьте ключевые параметры участия.',
    'Загрузите регламент, укажите контакты директора турнира и откройте приём заявок.',
    'Отслеживайте заявки, подтверждайте участников и общайтесь с игроками через платформу.',
  ];

  const features = [
    'Публичная страница турнира с понятным описанием и видимыми условиями участия.',
    'Контакты организатора и быстрый переход к диалогу для связи с директором турнира.',
    'Удобный сценарий для клубов, частных организаторов и локальных серий любительских соревнований.',
    'Показ турниров в сообществе, чтобы собирать заявки и повышать доверие к событию.',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-sm"
          >
            <ChevronLeft size={18} /> На главную
          </button>
          <img src="/assets/logo.svg" alt="НаКорте" className="h-10 sm:h-12 w-auto" />
          <Button onClick={onRegister} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
            Регистрация
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_24%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-16 grid lg:grid-cols-[1fr_0.95fr] gap-10 items-stretch">
          <div className="flex flex-col h-full">
            <span className="inline-flex items-center gap-2 text-lime-400 font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Trophy size={14} /> Директор турниров
            </span>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none mb-5">
              Создание
              <span className="block text-lime-400">теннисных турниров</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
              НаКорте даёт отдельную роль <strong className="text-white">«Директор турниров»</strong> для тех, кто хочет
              <strong className="text-white"> создавать любительские теннисные турниры</strong>, публиковать регламент,
              управлять заявками и вести коммуникацию с игроками на одной платформе.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
                Создать турнир
              </Button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 transition-colors"
              >
                Вернуться <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm max-w-xl">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Роль</div>
                  <div className="text-lg font-black text-white leading-tight">Director</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Заявки</div>
                  <div className="text-lg font-black text-white leading-tight">Онлайн</div>
                </div>
                <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Регламент</div>
                  <div className="text-lg font-black text-white leading-tight">PDF</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Создайте страницу турнира с понятной подачей, сроками, параметрами и контактами организатора.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Принимайте заявки игроков и контролируйте заполнение сетки без ручной рутины.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="text-lime-400 mt-0.5 shrink-0" size={18} />
                  <p>Публикуйте турнир в сообществе и быстро собирайте заинтересованных участников.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 h-full">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-400">Кабинет организатора</div>
                  <h2 className="text-3xl font-black mt-1">CRM турнира</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Турнир</div>
                  <div className="font-bold text-white">Весенний Cup</div>
                  <div className="text-sm text-slate-400 mt-1">31.05 — 02.06 • Хард • NTRP 3.5</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Заявки</div>
                  <div className="font-bold text-white">14 подтверждено</div>
                  <div className="text-sm text-slate-400 mt-1">2 на рассмотрении • 2 места свободно</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Регламент</div>
                  <div className="font-bold text-white">PDF загружен</div>
                  <div className="text-sm text-slate-400 mt-1">Игроки видят все условия участия</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-2">Связь</div>
                  <div className="font-bold text-white">Чат с участниками</div>
                  <div className="text-sm text-slate-400 mt-1">Быстрый контакт прямо из карточки турнира</div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-lime-400/20 bg-lime-400/5 p-6">
              <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Для кого подходит</p>
              <p className="text-slate-200 leading-relaxed">
                Для клубов, академий, частных организаторов и локальных сообществ, которым важно профессионально оформить
                турнир, собрать игроков, показать регламент и вести турнирный процесс без перегруженных таблиц и мессенджеров.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-5">
                {benefit.icon}
              </div>
              <h2 className="text-xl font-bold mb-3">{benefit.title}</h2>
              <p className="text-slate-300 leading-relaxed">{benefit.description}</p>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Как создать турнир на НаКорте</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 md:p-10 h-full">
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Возможности сервиса</p>
            <h2 className="text-3xl font-black tracking-tight mb-6">Что даёт роль директора турниров</h2>
            <div className="space-y-5 text-slate-300 leading-relaxed">
              <p>
                Страница директора турниров на НаКорте нужна тем, кто ищет цифровой инструмент для <strong className="text-white">создания теннисных турниров</strong>
                и дальнейшего управления ими. Вместо разрозненных форм, PDF в чатах и ручного списка участников организатор получает единый рабочий контур.
              </p>
              <p>
                Платформа помогает публиковать карточку турнира с понятным описанием, параметрами участия, датами, адресом клуба и загруженным регламентом.
                Это делает турнир более прозрачным для игроков и повышает доверие к событию уже на этапе просмотра карточки.
              </p>
              <p>
                Турнир становится частью открытой экосистемы НаКорте: пользователи видят его в сообществе, открывают страницу,
                изучают условия участия и могут быстро связаться с организатором. Это особенно полезно для клубов и частных серий, которым нужен устойчивый поток заявок.
              </p>
              <div className="space-y-3 pt-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="text-lime-400 mt-0.5 shrink-0" size={17} />
                    <p>{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Готовы запустить свой турнир?</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Создайте страницу турнира и начните собирать участников уже сегодня</h2>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Зарегистрируйтесь на НаКорте и используйте роль директора турниров, чтобы оформить событие, показать регламент и запустить приём заявок.
            </p>
          </div>
          <Button size="lg" onClick={onRegister} className="shadow-xl shadow-lime-400/20">
            Открыть роль директора турниров
          </Button>
        </div>
      </section>
    </div>
  );
}

export default App;

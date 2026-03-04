import React, { useState, useEffect } from 'react';
import { ViewState, User, NewsArticle } from './types';
import Dashboard from './components/Dashboard';
import Button from './components/Button';
import Shop from './components/Shop';
import AdminPanel from './components/AdminPanel';
import SupportChatWidget from './components/SupportChatWidget'; // Import the new component
import TrainerCRMPage from './components/TrainerCRMPage';
import { api } from './services/api';
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
  X,
  ListOrdered,
  Medal,
  Loader2,
  Briefcase,
  Newspaper,
  Clock,
  Eye,
  ChevronLeft,
  MessageSquare,
  Calendar
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true); // Add loading state

  // New useEffect to load user from localStorage on initial render
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const pathname = window.location.pathname;

      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);
        if (user.role === 'admin') {
          setView('admin');
        } else {
          setView('dashboard');
        }
      } else {
        // Если открыт /crm/ — показываем форму входа
        if (pathname.startsWith('/crm')) {
          setAuthInitialMode('login');
          setView('auth');
        } else {
          // Check URL parameters for auth routing
          const params = new URLSearchParams(window.location.search);
          if (params.get('auth') === 'register') {
            setAuthInitialMode('register');
            setView('auth');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (params.get('auth') === 'login') {
            setAuthInitialMode('login');
            setView('auth');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      // Clear localStorage if parsing fails to prevent infinite loop
      localStorage.removeItem('currentUser');
    } finally {
      setLoading(false); // Set loading to false after check
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleLoginSuccess = (user: User) => {
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
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Remove user from localStorage
    setView('landing');
  };

  const handleNavigate = (target: ViewState) => {
    setView(target);
    window.scrollTo(0, 0);
  };

  const handleAuthNavigate = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setView('auth');
    window.scrollTo(0, 0);
  };

  if (loading) { // Render loading indicator if loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin h-10 w-10 text-lime-400" />
        <span className="ml-3 text-lg">Загрузка...</span>
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
          />
          <SupportChatWidget user={currentUser} />
        </>
      )}

      {view === 'admin' && currentUser && (
          <AdminPanel user={currentUser} onLogout={handleLogout} />
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
    </div>
  );
};

// --- Shared Header Component ---
const PublicHeader = ({ onLogin, onRegister, onNavigate, transparent = false }: any) => (
  <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'glass-panel border-b-0 bg-white/80 backdrop-blur-md'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
      <div 
        className="flex items-center cursor-pointer group flex-shrink-0" 
        onClick={() => onNavigate('landing')}
      >
        <img
          src="/assets/logo.svg"
          alt="НаКорте"
          className="h-12 sm:h-20 w-auto group-hover:opacity-90 transition-opacity"
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
                                <span className="flex items-center gap-1"><Eye size={11} /> {featured.views?.toLocaleString()}</span>
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
                            <div className="h-64 lg:h-80 overflow-hidden">
                                <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
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
                                    <span className="flex items-center gap-1.5">
                                        <Eye size={14} /> {(selected.views ?? 0).toLocaleString()} просмотров
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
                                    <div className="relative rounded-2xl overflow-hidden cursor-pointer group h-80 lg:h-96" onClick={() => setSelected(featured)}>
                                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${CATEGORY_COLORS_PAGE[featured.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {CATEGORY_LABELS_PAGE[featured.category] || featured.category}
                                            </span>
                                            <h2 className="text-white text-xl lg:text-2xl font-black leading-tight mb-2 group-hover:text-lime-300 transition-colors">{featured.title}</h2>
                                            <p className="text-slate-300 text-sm line-clamp-2 mb-3">{featured.summary}</p>
                                            <div className="flex items-center gap-4 text-slate-400 text-xs">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(featured.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                <span className="flex items-center gap-1"><Eye size={12} /> {(featured.views ?? 0).toLocaleString()}</span>
                                                <span className="font-medium text-slate-300">{featured.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grid */}
                                {rest.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rest.map(article => (
                                            <div key={article.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelected(article)}>
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
                                                        <span className="flex items-center gap-1"><Eye size={11} /> {(article.views ?? 0).toLocaleString()}</span>
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

const LandingPage = ({ onLoginClick, onRegisterClick, onNavigate }: { onLoginClick: () => void, onRegisterClick: () => void, onNavigate: (v: ViewState) => void }) => {
  return (
    <>
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
              <Button variant="glass" size="lg" className="w-full sm:w-auto hover:bg-white/20" onClick={onLoginClick}>
                Демо доступ
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

      {/* How It Works Section */}
      <section className="py-10 sm:py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <div className="mb-6 sm:mb-12">
             <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Простой старт</span>
             <h2 className="text-3xl font-bold text-slate-900 mt-2">Как это работает</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-12 relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 z-0"></div>
              
              {[
                { icon: <UserIcon size={28}/>, title: "Создай профиль", desc: "Укажи свой уровень игры (NTRP) и город." },
                { icon: <Search size={28}/>, title: "Найди партнера", desc: "Выбери соперника по уровню и удобному времени." },
                { icon: <Trophy size={28}/>, title: "Играй и побеждай", desc: "Бронируй корт в приложении и фиксируй счет." }
              ].map((step, i) => (
                 <div key={i} className="relative z-10 bg-white p-4 sm:p-6 group flex md:flex-col items-center md:items-center gap-4 md:gap-0 text-left md:text-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                       <div className="text-slate-900 group-hover:text-lime-600 transition-colors">{step.icon}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg sm:text-xl mb-1 sm:mb-2 md:mt-4">{step.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-12 sm:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-20">
            <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Возможности</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mt-3 mb-4 tracking-tight">Всё для тенниса<br/>в одном месте</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg font-light">Мы убрали лишнее, оставив только то, что нужно для прогресса.</p>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             {/* Feature 1: Large Left */}
             <div className="md:col-span-2 bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group cursor-default"
               style={{minHeight: '320px'}}>
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

             {/* Feature 2: PRO */}
             <div className="rounded-[2rem] p-10 relative overflow-hidden group cursor-pointer bg-gradient-to-br from-lime-400 to-emerald-500 hover:shadow-2xl hover:shadow-lime-400/30 transition-all duration-500 hover:-translate-y-1"
               style={{minHeight: '320px'}} onClick={() => window.location.href = '/rtt/'}>
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

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">

             {/* Корты */}
             <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500"
               style={{minHeight: '260px'}}>
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

             {/* Статистика */}
             <div className="bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-500"
               style={{minHeight: '260px'}}>
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

             {/* Комьюнити + Турниры */}
             <div className="flex flex-col gap-5">
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

          {/* Row 3 — AI, 3D, CRM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">

            {/* AI Тренер */}
            <div className="md:col-span-2 bg-slate-950 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/40 transition-all duration-500"
              style={{minHeight: '260px'}}>
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

            {/* 3D Тактический симулятор */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-400/30 transition-all duration-500"
              style={{minHeight: '260px'}}>
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

          {/* Row 4 — CRM для тренеров */}
          <div className="mt-5">
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500">
              <div className="absolute -right-10 -bottom-10 text-slate-100 group-hover:text-slate-200 transition-colors duration-500">
                <Briefcase size={180} />
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-amber-500/30">
                    <Briefcase size={20} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">CRM для тренеров</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">Полный инструментарий для профессиональных тренеров: управление учениками, расписание тренировок, статистика прогресса каждого игрока и организация собственных турниров.</p>
                  <div
                    className="mt-6 inline-flex items-center text-amber-600 font-bold text-sm gap-1 cursor-pointer hover:gap-2 transition-all"
                    onClick={() => window.location.href = '/crm/'}
                  >
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
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 group-hover:border-amber-200 transition-colors">
                      <div className="font-bold text-sm text-slate-900 mb-1">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* News Section */}
      <NewsSection onRegisterClick={onRegisterClick} onNavigateToNews={() => onNavigate('news')} />

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
       
       <footer className="bg-slate-50 py-12 border-t border-slate-200">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center">
              <img src="/assets/logo.svg" alt="НаКорте" className="h-20 w-auto" style={{ filter: 'invert(1)' }} />
           </div>
           <div className="text-slate-500 text-sm font-medium">
             &copy; 2026 НаКорте. Все права защищены.
           </div>
           <div className="flex flex-wrap justify-center gap-4 text-slate-400 text-sm">
             <a href="/privacy/" className="hover:text-slate-900 transition-colors">Политика конфиденциальности</a>
             <a href="/terms/" className="hover:text-slate-900 transition-colors">Условия обслуживания</a>
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
  const [role, setRole] = useState<'amateur' | 'rtt_pro' | 'coach'>('amateur');
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

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
        const result = await api.auth.login({ email, password, totpCode: requires2fa ? totpCode : undefined });
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
      if(password.length < 6) {
          setError('Пароль должен быть не менее 6 символов');
          return;
      }
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
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 5 || ageNum > 99) throw new Error("Укажите корректный возраст (5–99 лет)");
        if (role === 'rtt_pro') {
            if (!rni) throw new Error("Укажите РНИ для профи РТТ");
            if (!rttPoints) throw new Error("Укажите очки классификации");
            if (!rttRank) throw new Error("Укажите позицию в рейтинге");
        }

        const payload = {
            name, 
            email, 
            password,
            city,
            age: ageNum,
            role,
            level: role === 'amateur' ? level : (role === 'coach' ? 'Coach' : undefined),
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
               {authMode === 'register' && registerStep === 2 && 'Профиль игрока'}
           </h2>
           <p className="text-slate-400 text-sm">
             {authMode === 'login' && 'Добро пожаловать обратно на корт.'}
             {authMode === 'register' && registerStep === 1 && 'Создайте учетную запись для доступа.'}
             {authMode === 'register' && registerStep === 2 && 'Расскажите о себе для подбора соперников.'}
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
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                    placeholder="ace@tennis.pro" 
                    required
                    />
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
                            type="number" 
                            value={age}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || (parseInt(v) >= 5 && parseInt(v) <= 99)) setAge(v);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none" 
                            placeholder="25"
                            min={5}
                            max={99}
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ваш статус</label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
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
                                        type="number" 
                                        value={rttPoints}
                                        onChange={(e) => setRttPoints(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                                        placeholder="1450"
                                        disabled={rniVerified}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block">Позиция РТТ</label>
                                    <input 
                                        type="number" 
                                        value={rttRank}
                                        onChange={(e) => setRttRank(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                                        placeholder="№ 123"
                                        disabled={rniVerified}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                {rniVerified 
                                    ? 'Данные проверены через базу РТТ.' 
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

export default App;

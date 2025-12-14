
import React, { useState } from 'react';
import { ViewState, User } from './types';
import Dashboard from './components/Dashboard';
import Button from './components/Button';
import Shop from './components/Shop';
import AdminPanel from './components/AdminPanel';
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
  ShieldCheck,
  User as UserIcon,
  Search,
  X,
  ListOrdered,
  Medal,
  Loader2,
  Briefcase
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
        setView('admin');
    } else {
        setView('dashboard');
    }
  };

  const handleUserUpdate = (updatedData: Partial<User>) => {
    if (currentUser) {
        setCurrentUser({ ...currentUser, ...updatedData });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
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
      
      {view === 'shop' && (
        <Shop onBack={() => handleNavigate('landing')} />
      )}
      
      {view === 'auth' && (
        <AuthPage 
            onBack={() => handleNavigate('landing')} 
            onComplete={handleLoginSuccess} 
            initialMode={authInitialMode}
        />
      )}

      {view === 'dashboard' && currentUser && (
        <Dashboard 
            user={currentUser} 
            onLogout={handleLogout} 
            onUserUpdate={handleUserUpdate}
        />
      )}
      
      {view === 'admin' && currentUser && (
          <AdminPanel user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
};

// --- Shared Header Component ---
const PublicHeader = ({ onLogin, onRegister, onNavigate, transparent = false }: any) => (
  <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${transparent ? 'bg-transparent border-transparent' : 'glass-panel border-b-0 bg-white/80 backdrop-blur-md'}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer group" 
        onClick={() => onNavigate('landing')}
      >
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <div className="w-4 h-4 rounded-full bg-lime-400"></div>
        </div>
        <span className={`text-2xl font-bold tracking-tight ${transparent ? 'text-white' : 'text-slate-900'}`}>TennisPro</span>
      </div>
      
      <nav className={`hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider ${transparent ? 'text-slate-300' : 'text-slate-500'}`}>
        <button onClick={() => onNavigate('shop')} className={`hover:text-lime-500 transition-colors flex items-center gap-1 ${transparent ? 'hover:text-white' : ''}`}>
           Магазин
        </button>
        <button onClick={() => onNavigate('pro')} className={`hover:text-lime-500 transition-colors flex items-center gap-1 ${transparent ? 'hover:text-white' : ''}`}>
           PRO <Crown size={14} className="mb-1 text-amber-400"/>
        </button>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={onLogin} className={`font-bold hover:text-lime-500 transition-colors text-sm ${transparent ? 'text-white' : 'text-slate-900'}`}>Войти</button>
        <Button onClick={onRegister} size="sm" variant={transparent ? 'secondary' : 'primary'}>Регистрация</Button>
      </div>
    </div>
  </header>
);

// --- Landing Page Components ---

const LandingPage = ({ onLoginClick, onRegisterClick, onNavigate }: { onLoginClick: () => void, onRegisterClick: () => void, onNavigate: (v: ViewState) => void }) => {
  return (
    <>
      <PublicHeader onLogin={onLoginClick} onRegister={onRegisterClick} onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 bg-slate-900 overflow-hidden">
        {/* Animated Abstract Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-lime-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]"></div>
        
        {/* Background Texture */}
        <div className="absolute inset-0 z-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-lime-400 text-xs font-bold uppercase tracking-wider mb-8 hover:bg-white/20 transition-colors cursor-default">
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
            
            <div className="mt-12 flex items-center gap-6 text-slate-400 text-sm font-medium">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <img key={i} src="/assets/avatar-placeholder.svg" className="w-10 h-10 rounded-full border-2 border-slate-900" alt=""/>
                 ))}
               </div>
               <p><span className="text-white font-bold">15,000+</span> игроков уже в игре</p>
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
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <div className="mb-12">
             <span className="text-lime-600 font-bold tracking-wider uppercase text-xs">Простой старт</span>
             <h2 className="text-3xl font-bold text-slate-900 mt-2">Как это работает</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 z-0"></div>
              
              {[
                { icon: <UserIcon size={32}/>, title: "Создай профиль", desc: "Укажи свой уровень игры (NTRP) и город." },
                { icon: <Search size={32}/>, title: "Найди партнера", desc: "Выбери соперника по уровню и удобному времени." },
                { icon: <Trophy size={32}/>, title: "Играй и побеждай", desc: "Бронируй корт в приложении и фиксируй счет." }
              ].map((step, i) => (
                 <div key={i} className="relative z-10 bg-white p-6 group">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                       <div className="text-slate-900 group-hover:text-lime-600 transition-colors">{step.icon}</div>
                    </div>
                    <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                 </div>
              ))}
           </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Всё для тенниса в одном месте</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Мы убрали лишнее, оставив только то, что нужно для прогресса.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
             {/* Feature 1: Large Left */}
             <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full z-0 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-6">
                      <Users size={24} />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">Умный поиск партнеров</h3>
                    <p className="text-slate-500 text-lg max-w-md">Алгоритм подбирает соперников не только по уровню NTRP или очкам РТТ, но и по стилю игры, возрасту и локации.</p>
                  </div>
                  <div className="mt-8 flex gap-4">
                     <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 font-medium text-sm">Спарринг</div>
                     <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 font-medium text-sm">Турнир</div>
                     <div className="bg-lime-50 px-4 py-2 rounded-lg border border-lime-200 font-medium text-sm text-lime-700">Тренировка</div>
                  </div>
                </div>
             </div>

             {/* Feature 2: Top Right */}
             <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all duration-300" onClick={() => onNavigate('pro')}>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-0"></div>
                <div className="absolute -right-10 -bottom-10 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Trophy size={200} />
                </div>
                <div className="relative z-10">
                   <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center text-slate-900 mb-6">
                      <Star size={24} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Профессионалы РТТ</h3>
                    <p className="text-slate-400">Верифицированные аккаунты для действующих спортсменов и тренеров категории PRO.</p>
                    <div className="mt-4 inline-flex items-center text-lime-400 font-bold text-sm">Подробнее <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform"/></div>
                </div>
             </div>

             {/* Feature 3: Bottom Right */}
             <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 group hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                   <Map size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Все корты России</h3>
                <p className="text-slate-500">Мгновенное бронирование без звонков администраторам. Реальное расписание.</p>
             </div>
          </div>
        </div>
      </section>

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
               <Button size="lg" className="shadow-2xl shadow-slate-400/50" onClick={onRegisterClick}>Создать аккаунт бесплатно</Button>
               <Button size="lg" variant="outline" onClick={onLoginClick}>Войти</Button>
            </div>
          </div>
       </section>
       
       <footer className="bg-slate-50 py-12 border-t border-slate-200">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-lime-400"></div>
              </div>
              <span className="text-xl font-bold text-slate-900">TennisPro</span>
           </div>
           <div className="text-slate-500 text-sm font-medium">
             &copy; 2024 TennisPro Russia. Все права защищены.
           </div>
           <div className="flex gap-6 text-slate-400">
             <a href="#" className="hover:text-slate-900">Instagram</a>
             <a href="#" className="hover:text-slate-900">Telegram</a>
             <a href="#" className="hover:text-slate-900">VK</a>
           </div>
         </div>
       </footer>
    </>
  );
};

// ... ProPage and AuthPage components (same as before) ...
const ProPage = ({ onBack, onSubscribe }: { onBack: () => void, onSubscribe: () => void }) => {
  return (
    <div className="bg-slate-900 min-h-screen text-white">
      <PublicHeader onLogin={onSubscribe} onRegister={onSubscribe} onNavigate={(page: any) => page === 'landing' ? onBack() : null} transparent={true} />
      
      {/* Hero */}
      <div className="pt-32 pb-20 text-center relative overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime-400/20 rounded-full blur-[120px] pointer-events-none"></div>
         
         <div className="relative z-10 max-w-4xl mx-auto px-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-400 text-xs font-bold uppercase tracking-wider mb-6">
               <Crown size={14} /> TennisPro Premium
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
                  <li className="flex items-center gap-2"><Check size={16} className="text-lime-600"/> Скидка 10% на корты</li>
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

// ... AuthPage (same as before) ...
const AuthPage = ({ onBack, onComplete, initialMode = 'login' }: { onBack: () => void, onComplete: (user: User) => void, initialMode?: 'login' | 'register' }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  
  // Registration States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState<'amateur' | 'rtt_pro' | 'coach'>('amateur');
  const [level, setLevel] = useState('NTRP 3.0');
  
  // RTT Specific States
  const [rttAgeCategory, setRttAgeCategory] = useState('Взрослые');
  const [rttPoints, setRttPoints] = useState(''); // Очки классификации
  const [rttRank, setRttRank] = useState('');     // Рейтинг в категории (позиция)

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        const user = await api.auth.login({ email, password });
        onComplete(user);
    } catch (err: any) {
        setError(err.message || 'Ошибка входа');
    } finally {
        setLoading(false);
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
        if (role === 'rtt_pro') {
            if (!rttPoints) throw new Error("Укажите очки классификации");
            if (!rttRank) throw new Error("Укажите позицию в рейтинге");
        }

        const payload = {
            name, 
            email, 
            password,
            city,
            age: parseInt(age),
            role,
            level: role === 'amateur' ? level : (role === 'coach' ? 'Coach' : undefined),
            // Mapping new RTT fields
            rating: role === 'rtt_pro' ? parseInt(rttPoints) : 0, // Points
            rttRank: role === 'rtt_pro' ? parseInt(rttRank) : 0,   // Position
            rttCategory: role === 'rtt_pro' ? rttAgeCategory : undefined
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
         {authMode === 'login' && (
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
                <Button variant="secondary" className="w-full mt-6 text-base" type="submit">
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
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none" 
                            placeholder="25" 
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
                                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><ListOrdered size={14}/> Возрастная категория</label>
                                <select 
                                    value={rttAgeCategory}
                                    onChange={(e) => setRttAgeCategory(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-400"
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
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">Данные будут проверены через базу РТТ.</p>
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

export default App;

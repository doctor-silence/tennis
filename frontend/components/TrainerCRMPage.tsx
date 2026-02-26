import React from 'react';
import {
  Briefcase,
  Users,
  Calendar,
  BarChart3,
  Trophy,
  Check,
  Crown,
  Zap,
  ArrowRight,
  Video,
  Star,
  Activity,
} from 'lucide-react';
import Button from './Button';

const TrainerCRMPage = ({
  onBack,
  onRegister,
}: {
  onBack: () => void;
  onRegister: () => void;
}) => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = document.getElementById('crm-scroll-container');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 30);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    {
      icon: <Users size={28} />,
      color: 'bg-amber-500',
      shadow: 'shadow-amber-500/20',
      checkColor: 'text-amber-400',
      title: 'Управление учениками',
      desc: 'Создавайте профили учеников, отслеживайте их прогресс, сохраняйте историю тренировок и заметок. Вся информация всегда под рукой.',
      perks: [
        'Карточка спортсмена с полной историей',
        'Группировка по уровням и возрасту',
        'Контроль посещаемости',
      ],
    },
    {
      icon: <Calendar size={28} />,
      color: 'bg-blue-500',
      shadow: 'shadow-blue-500/20',
      checkColor: 'text-blue-400',
      title: 'Умный календарь',
      desc: 'Планируйте индивидуальные и групповые занятия. Система автоматически напомнит ученикам о тренировке и уведомит об изменениях.',
      perks: [
        'Синхронизация с личным календарём',
        'Онлайн-бронирование для учеников',
        'Учёт аренды кортов',
      ],
    },
    {
      icon: <BarChart3 size={28} />,
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      checkColor: 'text-emerald-400',
      title: 'Аналитика и прогресс',
      desc: 'Визуализируйте рост мастерства ваших подопечных. Добавляйте результаты тестов, видео-разборы техники и ставьте цели на сезон.',
      perks: [
        'Динамика рейтинга NTRP / РТТ',
        'Видео-анализ ударов с пометками',
        'Статистика матчей и турниров',
      ],
    },
    {
      icon: <Trophy size={28} />,
      color: 'bg-purple-500',
      shadow: 'shadow-purple-500/20',
      checkColor: 'text-purple-400',
      title: 'Организация турниров',
      desc: 'Проводите внутренние или открытые соревнования. Автоматическое составление сеток, расписание матчей и подсчёт очков.',
      perks: [
        'Форматы: олимпийка, круговая',
        'Публикация результатов онлайн',
        'Рейтинговые очки клуба',
      ],
    },
    {
      icon: <Video size={28} />,
      color: 'bg-cyan-500',
      shadow: 'shadow-cyan-500/20',
      checkColor: 'text-cyan-400',
      title: 'Видео-разборы',
      desc: 'Загружайте записи тренировок, расставляйте метки и делитесь разборами с учеником прямо в приложении.',
      perks: [
        'Пометки и комментарии на видео',
        'Сравнение «до» и «после»',
        'Библиотека упражнений',
      ],
    },
    {
      icon: <Star size={28} />,
      color: 'bg-rose-500',
      shadow: 'shadow-rose-500/20',
      checkColor: 'text-rose-400',
      title: 'Финансы и абонементы',
      desc: 'Управляйте абонементами учеников, фиксируйте оплаты и отслеживайте остаток занятий без бумаги и таблиц.',
      perks: [
        'Гибкие пакеты занятий',
        'Уведомления об истечении абонемента',
        'История платежей',
      ],
    },
  ];

  return (
    <div
      id="crm-scroll-container"
      className="bg-slate-900 h-screen text-white relative overflow-y-auto overflow-x-hidden"
    >
      {/* Sticky Header */}
      <header
        className={`sticky top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-xl'
            : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onBack}
          >
            <img src="/assets/logo.svg" alt="НаКорте" className="h-14 w-auto group-hover:opacity-90 transition-opacity" />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider text-slate-300">
            <a href="/news/" className="hover:text-white transition-colors">
              Новости
            </a>
            <a href="/shop/" className="hover:text-white transition-colors">
              Магазин
            </a>
            <a
              href="/pro/"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              PRO <Crown size={14} className="mb-1 text-amber-400" />
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={onRegister}
              className="font-bold hover:text-lime-400 transition-colors text-sm text-white"
            >
              Войти
            </button>
            <Button onClick={onRegister} size="sm">
              Тренер — старт
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div
        className="pt-20 pb-20 text-center relative overflow-hidden"
        style={{ perspective: '1000px' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-32 left-[10%] animate-[bounce_6s_infinite] opacity-60 hidden md:block">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-[0_20px_50px_rgba(251,191,36,0.4)] flex items-center justify-center border border-white/20">
            <Briefcase size={48} className="text-slate-900" />
          </div>
        </div>
        <div className="absolute bottom-10 right-[10%] animate-[bounce_7s_infinite_1s] opacity-60 hidden md:block">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-[0_20px_50px_rgba(59,130,246,0.4)] flex items-center justify-center border border-white/20">
            <Calendar size={52} className="text-white" />
          </div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
            <Zap size={14} /> Для профессиональных тренеров
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            CRM{' '}
            <span
              className="text-amber-400"
              style={{ textShadow: '0 0 30px rgba(251,191,36,0.5)' }}
            >
              ДЛЯ ТРЕНЕРОВ
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Управляйте тренировочным процессом, расписанием и прогрессом
            учеников в одном месте. Больше никаких таблиц — только результат.
          </p>
          <Button
            onClick={onRegister}
            size="lg"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 text-lg shadow-lg shadow-amber-500/20"
          >
            Начать бесплатно <ArrowRight size={18} className="inline ml-2" />
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-24 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-white/10 rounded-3xl p-8 hover:bg-slate-800/80 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg ${f.shadow}`}
              >
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-5">
                {f.desc}
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                {f.perks.map((p, j) => (
                  <li key={j} className="flex gap-2 items-start">
                    <Check
                      size={15}
                      className={`${f.checkColor} shrink-0 mt-0.5`}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Как начать работу
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Зарегистрируйтесь',
                desc: 'Создайте аккаунт тренера — это займёт меньше 2 минут. Укажите специализацию и город.',
              },
              {
                step: '2',
                title: 'Добавьте учеников',
                desc: 'Пригласите учеников по ссылке или добавьте вручную. Они получат доступ к личному кабинету.',
              },
              {
                step: '3',
                title: 'Управляйте процессом',
                desc: 'Ведите расписание, отслеживайте прогресс и анализируйте видео прямо в приложении.',
              },
            ].map((s, i) => (
              <div
                key={i}
                className="flex gap-5 bg-slate-800/40 border border-white/10 rounded-2xl p-6 hover:border-amber-400/30 hover:shadow-[0_10px_30px_rgba(251,191,36,0.1)] transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 flex items-center justify-center font-bold text-xl shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="relative z-10">
            <Activity
              size={40}
              className="text-amber-400 mx-auto mb-6 opacity-80"
            />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Начните уже сегодня — бесплатно
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-10 text-base">
              На этапе бета-тестирования весь функционал CRM для тренеров
              доступен без ограничений и без оплаты.
            </p>
            <Button
              onClick={onRegister}
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-12 text-lg shadow-lg shadow-amber-500/20"
            >
              Создать аккаунт тренера
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerCRMPage;

import React, { useCallback, useState } from 'react';
import Button from './Button';
import TenniixDateRangePicker from './TenniixDateRangePicker';
import { api } from '../services/api';
import {
  ArrowRight,
  Battery,
  Check,
  ChevronLeft,
  Crosshair,
  Gauge,
  Mic,
  Package,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  Wind,
  CircleDot,
  Shield,
  MapPin,
  Loader2,
} from 'lucide-react';

type TenniixRentalPageProps = {
  onRegister: () => void;
};

const HERO_BG = '/assets/tenniix-pro-hero.webp';
const PRODUCT_IMG = '/assets/tenniix-pro-product.webp';
const RENTAL_CITY = 'Новосибирск';
const RENTAL_CITY_IN = 'Новосибирске';

const SCROLL_DURATION_MS = 1400;
const SCROLL_HEADER_OFFSET = 88;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const smoothScrollToId = (id: string, duration = SCROLL_DURATION_MS) => {
  const el = document.getElementById(id);
  if (!el) return;

  const startY = window.scrollY;
  const targetY = el.getBoundingClientRect().top + window.scrollY - SCROLL_HEADER_OFFSET;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;

  const startTime = performance.now();

  const tick = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const SPECS = [
  { label: 'Модель', value: 'Tenniix Pro' },
  { label: 'Тип', value: 'AI tennis robot (vision-based)' },
  { label: 'Вес', value: '~8,5 кг (18,7 lbs)' },
  { label: 'Ёмкость бункера', value: 'до 100 мячей' },
  { label: 'Скорость подачи', value: 'до ~120 км/ч (75 mph)' },
  { label: 'Камеры', value: 'две 1080p, трекинг игрока' },
  { label: 'Управление', value: 'приложение + голосовые команды' },
  { label: 'Питание', value: 'съёмный аккумулятор (длительная сессия)' },
];

const FEATURES = [
  {
    icon: <Crosshair className="text-cyan-400" size={22} />,
    title: 'Vision AI — как живой партнёр',
    description:
      'Двойная камера считывает ваше положение на корте и в реальном времени меняет выбор удара, вращение и глубину — подача адаптируется под ваш уровень и ритм игры.',
  },
  {
    icon: <Mic className="text-cyan-400" size={22} />,
    title: 'Голосовое управление',
    description:
      'Меняйте программу, скорость и тип розыгрыша голосом, не откладывая ракетку. Удобно в интенсивных сериях и при отработке одного элемента техники.',
  },
  {
    icon: <Target className="text-cyan-400" size={22} />,
    title: 'Smart Match Mode',
    description:
      'Более тысячи профессиональных упражнений и сценариев розыгрыша: от монотонной отработки форхенда до имитации матчевых ситуаций.',
  },
  {
    icon: <Package className="text-cyan-400" size={22} />,
    title: 'Портативность',
    description:
      'Лёгкий корпус и быстрая установка — берите Tenniix Pro на любимый корт, в академию или на выездную тренировку без грузового транспорта.',
  },
  {
    icon: <Gauge className="text-cyan-400" size={22} />,
    title: 'Мощная и точная подача',
    description:
      'Технология QDD-моторов даёт стабильную скорость, предсказуемый отскок и широкий диапазон вращений — от мягких мячей до агрессивного топспина.',
  },
  {
    icon: <Smartphone className="text-cyan-400" size={22} />,
    title: 'Приложение Tenniix',
    description:
      'Настройка программ, сохранение любимых сценариев, контроль параметров подачи и статистика сессии — всё в смартфоне.',
  },
];

const RENTAL_PLANS = [
  {
    name: 'Старт',
    duration: '2 часа',
    desc: 'Знакомство с Tenniix Pro, базовая настройка и свободная отработка ударов.',
    highlights: ['Инструктаж 15 мин', 'До 100 мячей в бункере', 'Голос + приложение'],
    featured: false,
  },
  {
    name: 'Интенсив',
    duration: '4 часа',
    desc: 'Полноценная тренировка: программы Smart Match, работа на подачу и игру с задней линии.',
    highlights: ['Приоритетное бронирование', 'Помощь с программами', 'Оптимально для 1–2 игроков'],
    featured: true,
  },
  {
    name: 'День на корте',
    duration: '8 часов',
    desc: 'Для тренеров, групп и лагерей: несколько смен, разные сценарии, максимум отдачи от робота.',
    highlights: ['Гибкий график в течение дня', 'Для академий и клубов', 'Индивидуальные условия'],
    featured: false,
  },
];

const RENTAL_STEPS = [
  'Оставьте заявку на аренду через форму или напишите на info@onthecourt.ru.',
  'Согласуем дату, корт, длительность и формат тренировки (соло / с тренером).',
  'Получите Tenniix Pro на площадке: краткий инструктаж и проверка настроек.',
  'Тренируйтесь по выбранной программе, при необходимости меняйте сценарий голосом или в приложении.',
  'После сессии — возврат оборудования и обратная связь для следующих бронирований.',
];

const FAQ = [
  {
    q: 'Нужен ли партнёр для тренировки с Tenniix Pro?',
    a: 'Нет. Робот подаёт мячи самостоятельно и адаптирует розыгрыши под вашу позицию на корте — идеально для соло-сессий.',
  },
  {
    q: 'Какие мячи подходят?',
    a: 'Рекомендуются стандартные теннисные мячи для тренировок (ITF-approved practice balls). Мы подскажем оптимальный тип при бронировании.',
  },
  {
    q: 'Сколько времени занимает установка?',
    a: 'Обычно 5–10 минут: расстановка на базовой линии, подключение приложения и калибровка под ваш корт.',
  },
  {
    q: 'Можно ли использовать на грунте и харде?',
    a: 'Да, Tenniix Pro рассчитан на разные покрытия. Уточните тип корта при заявке — подскажем оптимальные настройки подачи.',
  },
  {
    q: 'Это официальный продукт Tenniix?',
    a: 'Да, в аренде — модель Tenniix Pro. Подробности о производителе и технологиях — на сайте tenniix.ai.',
  },
];

const FLOATING_BALLS = [
  { left: '8%', top: '22%', delay: '0s', size: 14 },
  { left: '78%', top: '18%', delay: '1.2s', size: 10 },
  { left: '62%', top: '55%', delay: '2.4s', size: 12 },
  { left: '18%', top: '68%', delay: '0.8s', size: 9 },
  { left: '88%', top: '42%', delay: '3s', size: 11 },
];

export default function TenniixRentalPage({ onRegister }: TenniixRentalPageProps) {
  const [formSent, setFormSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', club: '', date: '', plan: 'Интенсив (4 часа)', comment: '' });

  const scrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    smoothScrollToId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.tenniixRental.submitBooking({
        name: form.name.trim(),
        phone: form.phone.trim(),
        club: form.club.trim(),
        preferred_date: form.date.trim() || undefined,
        plan: form.plan,
        comment: form.comment.trim() || undefined,
      });
      setFormSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось отправить заявку. Попробуйте позже.';
      setSubmitError(message.includes('Failed to fetch') || message.includes('NetworkError')
        ? 'Сервер недоступен. Запустите backend (порт 3001) и обновите страницу.'
        : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-white font-sans">
      {/* Full-screen hero with machine photo */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={HERO_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center animate-tenniix-ken-burns scale-110"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/55 to-[#05080f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#05080f] to-transparent" />
        </div>

        {FLOATING_BALLS.map((ball, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-lime-400/90 shadow-[0_0_20px_rgba(163,230,53,0.5)] animate-tenniix-ball-drift pointer-events-none"
            style={{
              left: ball.left,
              top: ball.top,
              width: ball.size,
              height: ball.size,
              animationDelay: ball.delay,
            }}
            aria-hidden
          />
        ))}

        <div
          className="absolute top-1/3 right-[8%] w-64 h-64 md:w-80 md:h-80 rounded-full bg-cyan-400/20 blur-[100px] animate-tenniix-glow-pulse pointer-events-none"
          aria-hidden
        />

        <div
          className="relative z-10 flex-1 flex items-center pt-28 sm:pt-32 pb-16"
          style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-[1fr_minmax(280px,420px)] gap-10 lg:gap-16 items-center">
              <div className="max-w-2xl min-w-0 relative z-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/15 backdrop-blur-md px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200 mb-6">
                  <Sparkles size={14} /> Аренда на НаКорте
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] mb-6 drop-shadow-lg">
                  Умная пушка
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-lime-300">
                    Tenniix Pro
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-200/90 leading-relaxed mb-4 drop-shadow">
                  AI-робот с vision-трекингом: читает вашу игру, подстраивает подачу и розыгрыш — тренируйтесь без партнёра.
                </p>
                <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm font-semibold text-lime-200 mb-4">
                  <MapPin size={14} className="text-lime-300 shrink-0" />
                  <span className="whitespace-normal">Аренда только в {RENTAL_CITY_IN}</span>
                </div>
                <p className="text-sm text-slate-400 mb-8">
                  Технология{' '}
                  <a
                    href="https://tenniix.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
                    Tenniix
                  </a>
                  . Бронирование через «НаКорте».
                </p>
                <div className="flex flex-wrap gap-3 mb-10">
                  <a
                    href="#rental-booking"
                    onClick={(e) => scrollToSection(e, 'rental-booking')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-7 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/30 hover:brightness-110 transition-all"
                  >
                    Забронировать <ArrowRight size={16} />
                  </a>
                  <a
                    href="#specs"
                    onClick={(e) => scrollToSection(e, 'specs')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition-colors"
                  >
                    Характеристики
                  </a>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-8">
                  {[
                    { icon: <Wind size={18} className="text-cyan-400" />, text: 'до 120 км/ч' },
                    { icon: <CircleDot size={18} className="text-cyan-400" />, text: '100 мячей' },
                    { icon: <Mic size={18} className="text-cyan-400" />, text: 'голос + app' },
                    { icon: <Battery size={18} className="text-cyan-400" />, text: '~8,5 кг' },
                  ].map((item) => (
                    <span key={item.text} className="inline-flex items-center gap-2 text-slate-300 font-semibold text-sm">
                      {item.icon}
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute -inset-8 bg-gradient-to-br from-cyan-400/25 to-lime-400/10 rounded-full blur-3xl animate-tenniix-glow-pulse" />
                <img
                  src={PRODUCT_IMG}
                  alt="Tenniix Pro — умная теннисная пушка"
                  className="relative w-full max-w-md mx-auto drop-shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-diary-float"
                />
              </div>
            </div>
          </div>
        </div>

        <a
          href="#features"
          className="relative z-10 mx-auto mb-8 flex flex-col items-center gap-1 text-slate-500 hover:text-cyan-300 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <span>Узнать больше</span>
          <ChevronLeft className="rotate-[-90deg]" size={20} />
        </a>
      </section>

      {/* Mobile product shot */}
      <div className="lg:hidden relative -mt-8 px-4 pb-8">
        <img
          src={PRODUCT_IMG}
          alt="Tenniix Pro"
          className="w-full max-w-sm mx-auto drop-shadow-2xl animate-diary-float"
        />
      </div>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Почему Tenniix Pro</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Не классическая пушка — умный робот</h2>
          <p className="text-slate-400 leading-relaxed">
            Обычная ball machine подаёт по расписанию. Tenniix Pro анализирует вашу игру и подстраивает розыгрыш —
            ближе к спаррингу с сильным партнёром.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-3xl border border-white/8 bg-white/[0.03] p-7 hover:border-cyan-400/25 hover:bg-white/[0.05] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-5">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="specs" className="scroll-mt-24 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Технические данные</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Tenniix Pro — в цифрах</h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              Компактный AI-робот с Quasi-Direct Drive моторами, двойным vision-трекингом и ёмким бункером.
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              {['Отработка подачи и приёма', 'Игра с задней линии', 'Футворк и ритм', 'Подготовка к турниру без партнёра'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3">
                    <Check className="text-cyan-400 shrink-0" size={18} />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {SPECS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent'}>
                    <td className="px-5 py-4 text-slate-500 font-medium border-b border-white/5 w-[42%]">{row.label}</td>
                    <td className="px-5 py-4 text-white font-semibold border-b border-white/5">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Тарифы аренды</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Выберите формат сессии</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Стоимость зависит от города, корта и длительности. Оставьте заявку — предложим актуальные условия и слоты.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {RENTAL_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-3xl p-8 flex flex-col h-full border ${
                plan.featured
                  ? 'border-cyan-400/40 bg-gradient-to-b from-cyan-400/10 to-transparent shadow-xl shadow-cyan-500/10'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              {plan.featured && (
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 mb-4">Популярный</span>
              )}
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="text-cyan-400 font-bold text-lg mt-1 mb-4 flex items-center gap-2">
                <Timer size={18} /> {plan.duration}
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{plan.desc}</p>
              <ul className="space-y-2 mb-6">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                    {h}
                  </li>
                ))}
              </ul>
              <a
                href="#rental-booking"
                onClick={(e) => scrollToSection(e, 'rental-booking')}
                className={`text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                  plan.featured
                    ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                    : 'border border-white/15 text-white hover:bg-white/5'
                }`}
              >
                Забронировать
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid lg:grid-cols-2 gap-12">
          <div>
            <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Как арендовать</p>
            <h2 className="text-3xl font-black tracking-tight mb-8">От заявки до тренировки</h2>
            <div className="space-y-5">
              {RENTAL_STEPS.map((step, i) => (
                <div key={step} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed pt-2">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
            <Shield className="text-cyan-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-3">Что входит в аренду</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>· Tenniix Pro в рабочем состоянии, заряженный аккумулятор</li>
              <li>· Краткий инструктаж по приложению и голосовым командам</li>
              <li>· Рекомендации по программам под ваш уровень</li>
              <li>· Техническая поддержка на время сессии (по согласованию)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-10">Частые вопросы</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] open:border-cyan-400/30"
            >
              <summary className="cursor-pointer px-6 py-4 font-bold text-slate-200 list-none flex items-center justify-between gap-4">
                {item.q}
                <ChevronLeft
                  className="rotate-[-90deg] group-open:rotate-90 transition-transform text-cyan-400 shrink-0"
                  size={18}
                />
              </summary>
              <p className="px-6 pb-5 text-slate-400 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="rental-booking" className="scroll-mt-24 border-t border-white/10 bg-gradient-to-b from-cyan-950/40 to-[#05080f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
            <div>
              <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Бронирование</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Заявка на аренду Tenniix Pro</h2>
              <p className="text-cyan-300/90 font-semibold mb-2">{RENTAL_CITY}</p>
              <p className="text-slate-400 leading-relaxed mb-4">
                Пока аренда Tenniix Pro доступна только в {RENTAL_CITY_IN}. Оставьте заявку — мы свяжемся и подтвердим клуб, дату и тариф.
              </p>
              <Button onClick={onRegister} className="mt-2 bg-white/10 hover:bg-white/15 text-white border border-white/10">
                Создать аккаунт НаКорте
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-sm p-8 space-y-4">
              {formSent ? (
                <div className="py-8 text-center">
                  <Check className="mx-auto text-cyan-400 mb-4" size={40} />
                  <p className="font-bold text-lg mb-2">Заявка отправлена</p>
                  <p className="text-slate-400 text-sm">Мы свяжемся с вами в ближайшее время для подтверждения аренды в {RENTAL_CITY_IN}.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 mb-0.5">Город</p>
                    <p className="text-lg font-bold text-white">{RENTAL_CITY}</p>
                    <p className="text-xs text-slate-400 mt-1">Аренда Tenniix Pro пока только в {RENTAL_CITY_IN}</p>
                  </div>
                  <input
                    required
                    placeholder="Ваше имя"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400 outline-none"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Телефон"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400 outline-none"
                  />
                  <input
                    required
                    placeholder="Клуб или корт"
                    value={form.club}
                    onChange={(e) => setForm({ ...form, club: e.target.value })}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400 outline-none"
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Желаемый период
                    </label>
                    <TenniixDateRangePicker
                      value={form.date}
                      onChange={(date) => setForm({ ...form, date })}
                      placeholder="Выберите даты в календаре"
                    />
                  </div>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                  >
                    {RENTAL_PLANS.map((p) => (
                      <option key={p.name} value={`${p.name} (${p.duration})`}>
                        {p.name} — {p.duration}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Комментарий (уровень, цели тренировки)"
                    rows={3}
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400 outline-none resize-none"
                  />
                  {submitError && (
                    <p className="text-sm text-red-400 font-medium">{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-black text-sm hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Отправка…
                      </>
                    ) : (
                      'Отправить заявку на аренду'
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

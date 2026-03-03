import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'ladder_onboarding_done_v1';

const STEPS = [
    {
        targetId: 'ladder-banner',
        title: 'Турнирная лестница',
        emoji: '🏆',
        description: 'Соревнуйтесь с игроками клуба! Чем больше побед — тем выше место в рейтинге.',
        preferTop: false,
        scrollBlock: 'center' as ScrollLogicalPosition,
    },
    {
        targetId: 'ladder-tabs-type',
        title: 'Два типа рейтинга',
        emoji: '⚔️',
        description: '«Любители» — внутренний рейтинг клуба (Club ELO). «Профи» — официальный рейтинг РТТ для профессиональных игроков.',
        preferTop: false,
        scrollBlock: 'center' as ScrollLogicalPosition,
    },
    {
        targetId: 'ladder-tabs-mode',
        title: 'Рейтинг и Вызовы',
        emoji: '📋',
        description: 'В «Рейтинге» — таблица всех игроков. В «Вызовах» — ваши активные матчи и заявки на игру.',
        preferTop: false,
        scrollBlock: 'center' as ScrollLogicalPosition,
    },
    {
        targetId: 'ladder-ranking-header',
        title: 'Таблица игроков',
        emoji: '📊',
        description: 'Нажмите на игрока чтобы посмотреть его профиль. Кнопка «Вызвать» отправит ему запрос на матч.',
        preferTop: false,
        scrollBlock: 'start' as ScrollLogicalPosition,
    },
];

const TIP_W = 288;
const PAD = 8;

export const LadderOnboarding: React.FC<{ isActive?: boolean }> = ({ isActive }) => {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isActive) return;
        if (localStorage.getItem(STORAGE_KEY)) return;

        let attempts = 0;
        const MAX = 30;

        const interval = setInterval(() => {
            attempts++;
            const el = document.getElementById(STEPS[0].targetId);
            if (el) {
                clearInterval(interval);
                setTimeout(() => setVisible(true), 300);
            } else if (attempts >= MAX) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isActive]);

    const updateRect = useCallback(() => {
        if (!visible) return;
        const el = document.getElementById(STEPS[step].targetId);
        setRect(el ? el.getBoundingClientRect() : null);
    }, [step, visible]);

    // При смене шага — сбрасываем rect, скроллим, потом обновляем координаты
    useEffect(() => {
        if (!visible) return;
        setRect(null);
        const el = document.getElementById(STEPS[step].targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: current.scrollBlock ?? 'center' });
        }
        const timer = setTimeout(() => {
            const updated = document.getElementById(STEPS[step].targetId);
            setRect(updated ? updated.getBoundingClientRect() : null);
        }, 450);
        return () => clearTimeout(timer);
    }, [step, visible]);

    useEffect(() => {
        updateRect();
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('resize', updateRect);
        };
    }, [updateRect]);

    // Скрываем тур если вкладка переключилась
    useEffect(() => {
        if (!isActive && visible) setVisible(false);
    }, [isActive, visible]);

    const finish = () => { localStorage.setItem(STORAGE_KEY, '1'); setVisible(false); };
    const next = () => step < STEPS.length - 1 ? setStep(s => s + 1) : finish();
    const prev = () => step > 0 && setStep(s => s - 1);

    if (!visible) return null;

    const current = STEPS[step];
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let tipTop: number;
    let tipLeft: number;
    let showAbove = false;
    let arrowLeft = TIP_W / 2 - 8;

    if (rect) {
        const GAP = 12;
        const belowSpace = vh - rect.bottom - GAP;
        showAbove = current.preferTop || belowSpace < 260;
        if (showAbove) {
            tipTop = rect.top - GAP;
        } else {
            tipTop = rect.bottom + GAP;
        }
        tipLeft = rect.left + rect.width / 2 - TIP_W / 2;
        tipLeft = Math.max(8, Math.min(tipLeft, vw - TIP_W - 8));
        arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - tipLeft - 8, 12), TIP_W - 28);
    } else {
        tipTop = vh / 2;
        tipLeft = vw / 2 - TIP_W / 2;
    }

    return ReactDOM.createPortal(
        <>
            {/* фон — показываем только когда элемент найден */}
            {rect && <div
                className="fixed inset-0 z-[9990] cursor-pointer"
                style={{ background: 'rgba(15,23,42,0.65)' }}
                onClick={finish}
            />}

            {/* подсветка элемента */}
            {rect && (
                <div
                    className="fixed pointer-events-none z-[9992]"
                    style={{
                        top: rect.top - PAD,
                        left: rect.left - PAD,
                        width: rect.width + PAD * 2,
                        height: rect.height + PAD * 2,
                        borderRadius: 16,
                        boxShadow: '0 0 0 3px #a3e635, 0 0 0 9999px rgba(15,23,42,0.65)',
                    }}
                />
            )}

            {/* тултип */}
            {rect && (
                <div
                    className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-5"
                    style={{
                        top: tipTop,
                        left: tipLeft,
                        width: TIP_W,
                        transform: showAbove ? 'translateY(-100%)' : 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* стрелка вниз (тултип выше элемента) */}
                    {showAbove && (
                        <div className="absolute -bottom-[9px]" style={{ left: arrowLeft }}>
                            <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }} />
                        </div>
                    )}
                    {/* стрелка вверх (тултип ниже элемента) */}
                    {!showAbove && (
                        <div className="absolute -top-[9px]" style={{ left: arrowLeft }}>
                            <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid white' }} />
                        </div>
                    )}

                    {/* прогресс-точки */}
                    <div className="flex items-center gap-1 mb-4">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-lime-400 w-6' : 'bg-slate-200 w-1.5'}`} />
                        ))}
                        <button onClick={finish} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="text-3xl mb-2">{current.emoji}</div>
                    <h3 className="font-bold text-slate-900 text-base mb-1">{current.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{current.description}</p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={prev}
                            disabled={step === 0}
                            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-colors"
                        >
                            <ChevronLeft size={16} /> Назад
                        </button>
                        <span className="text-xs text-slate-300 font-medium">{step + 1} / {STEPS.length}</span>
                        <button
                            onClick={next}
                            className="flex items-center gap-1.5 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                        >
                            {step === STEPS.length - 1 ? 'Готово' : 'Далее'} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};

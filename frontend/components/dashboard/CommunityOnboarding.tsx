import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'community_onboarding_done_v1';

const STEPS = [
    {
        targetId: 'community-post-box',
        title: 'Создание публикаций',
        emoji: '✍️',
        description: 'Здесь вы можете написать пост, поделиться новостью или выбрать один из форматов ниже.',
        preferTop: false,
    },
    {
        targetId: 'community-btn-partner',
        title: 'Поиск партнёра',
        emoji: '🎾',
        description: 'Разместите объявление о поиске партнёра для игры. Его увидят все участники в разделе «Поиск игры».',
        preferTop: true,
    },
    {
        targetId: 'community-btn-match',
        title: 'Результат матча',
        emoji: '🏆',
        description: 'Поделитесь итогом сыгранного матча — счётом и именем соперника. Попадёт во вкладку «Результаты матчей».',
        preferTop: true,
    },
    {
        targetId: 'community-btn-group',
        title: 'Создать группу',
        emoji: '👥',
        description: 'Создайте закрытую или открытую группу для общения, организации игр и турниров.',
        preferTop: true,
    },
    {
        targetId: 'community-btn-shop',
        title: 'Барахолка',
        emoji: '🛒',
        description: 'Продавайте теннисный инвентарь. Объявление появится в разделе «Барахолка» для всех участников.',
        preferTop: true,
    },
    {
        targetId: 'community-tabs',
        title: 'Вкладки сообщества',
        emoji: '🗂️',
        description: 'Переключайтесь между разделами: Все события, Группы, Результаты матчей, Поиск игры и Барахолка.',
        preferTop: false,
    },
    {
        targetId: 'community-widget-tournaments',
        title: 'Ближайшие турниры',
        emoji: '📅',
        description: 'Здесь отображаются предстоящие турниры. Нажмите «Все» чтобы перейти в полный раздел турниров, зарегистрироваться и следить за сеткой.',
        preferTop: false,
    },
    {
        targetId: 'community-widget-top',
        title: 'Топ игроков',
        emoji: '🏆',
        description: 'Рейтинг лучших игроков по очкам. Чтобы попасть в топ — перейдите в «Турнирную лестницу», вызывайте соперников и побеждайте в матчах.',
        preferTop: false,
    },
    {
        targetId: 'community-widget-groups',
        title: 'Ваши группы',
        emoji: '👥',
        description: 'Группы по интересам, клубам или кортам. Вступайте в существующие или создайте свою — активность своей группы отображается здесь.',
        preferTop: false,
    },
    {
        targetId: 'community-widget-marketplace',
        title: 'Барахолка',
        emoji: '🛒',
        description: 'Актуальные объявления о продаже теннисного инвентаря. Нажмите «Все» чтобы увидеть полный список или разместите своё объявление через кнопку выше.',
        preferTop: false,
    },
];

const TIP_W = 288;
const PAD = 8;

export const CommunityOnboarding: React.FC<{ isActive?: boolean }> = ({ isActive }) => {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    // Запускаем тур только когда вкладка «Сообщество» активна
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
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [updateRect]);

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
        // Если preferTop — всегда выше; иначе — ниже если места хватает, иначе выше
        showAbove = current.preferTop || belowSpace < 260;
        if (showAbove) {
            tipTop = rect.top - GAP; // нижний край тултипа у верхнего края элемента
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
            {/* фон */}
            <div
                className="fixed inset-0 z-[9990] cursor-pointer"
                style={{ background: 'rgba(15,23,42,0.65)' }}
                onClick={finish}
            />

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
                {/* стрелка вниз (тултип выше кнопки) */}
                {rect && showAbove && (
                    <div className="absolute -bottom-[9px]" style={{ left: arrowLeft }}>
                        <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }} />
                    </div>
                )}
                {/* стрелка вверх (тултип ниже кнопки) */}
                {rect && !showAbove && (
                    <div className="absolute -top-[9px]" style={{ left: arrowLeft }}>
                        <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid white' }} />
                    </div>
                )}

                <div className="flex items-center gap-1 mb-4">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-lime-400 w-6' : 'bg-slate-200 w-1.5'}`} />
                    ))}
                    <button onClick={finish} className="ml-auto p-0.5 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100">
                        <X size={15} />
                    </button>
                </div>

                <div className="text-3xl mb-2 leading-none">{current.emoji}</div>
                <p className="font-bold text-slate-900 text-sm mb-1.5">{current.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{current.description}</p>

                <div className="flex items-center justify-between mt-5">
                    <button
                        onClick={prev}
                        disabled={step === 0}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-colors"
                    >
                        <ChevronLeft size={14} /> Назад
                    </button>
                    <span className="text-[11px] text-slate-400">{step + 1} / {STEPS.length}</span>
                    <button
                        onClick={next}
                        className="flex items-center gap-1.5 bg-lime-400 hover:bg-lime-300 text-slate-900 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                    >
                        {step === STEPS.length - 1 ? 'Понятно!' : 'Далее'}
                        {step < STEPS.length - 1 && <ChevronRight size={14} />}
                    </button>
                </div>

                {rect && tipTop < rect.top && (
                    <div className="absolute -bottom-[9px]" style={{ left: arrowLeft }}>
                        <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }} />
                    </div>
                )}
            </div>
        </>,
        document.body
    );
};

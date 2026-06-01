import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DISPLAY_FORMAT = 'd MMMM yyyy';
const PARSE_FORMAT = 'd MMMM yyyy';

type TenniixDateRangePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const parseRangeValue = (value: string): { from: Date | null; to: Date | null } => {
  if (!value.trim()) return { from: null, to: null };
  const parts = value.split(/—|–|-/).map((p) => p.trim());
  if (parts.length !== 2) return { from: null, to: null };
  const from = parse(parts[0], PARSE_FORMAT, new Date(), { locale: ru });
  const to = parse(parts[1], PARSE_FORMAT, new Date(), { locale: ru });
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { from: null, to: null };
  return { from: startOfDay(from), to: startOfDay(to) };
};

const formatRange = (from: Date, to: Date) => {
  const start = isBefore(from, to) ? from : to;
  const end = isBefore(from, to) ? to : from;
  return `${format(start, DISPLAY_FORMAT, { locale: ru })} — ${format(end, DISPLAY_FORMAT, { locale: ru })}`;
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function TenniixDateRangePicker({
  value,
  onChange,
  placeholder = 'Выберите период',
}: TenniixDateRangePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const parsed = useMemo(() => parseRangeValue(value), [value]);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parsed.from ?? today);
  const [draftFrom, setDraftFrom] = useState<Date | null>(parsed.from);
  const [draftTo, setDraftTo] = useState<Date | null>(parsed.to);
  const [pickStep, setPickStep] = useState<'start' | 'end'>('start');
  const rootRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  // Синхронизация только при открытии календаря (не сбрасывает месяц при листании)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraftFrom(parsed.from);
      setDraftTo(parsed.to);
      setViewMonth(parsed.from ?? today);
      setPickStep(parsed.from && !parsed.to ? 'end' : 'start');
    }
    wasOpenRef.current = open;
  }, [open, parsed.from, parsed.to, today]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const canGoPrevMonth = isBefore(startOfMonth(today), startOfMonth(viewMonth));

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoPrevMonth) setViewMonth((m) => subMonths(m, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewMonth((m) => addMonths(m, 1));
  };

  const handleDayClick = (day: Date) => {
    const d = startOfDay(day);
    if (isBefore(d, today)) return;

    if (pickStep === 'start' || (draftFrom && draftTo)) {
      setDraftFrom(d);
      setDraftTo(null);
      setPickStep('end');
      return;
    }

    if (draftFrom) {
      const from = startOfDay(draftFrom);
      if (isBefore(d, from)) {
        setDraftFrom(d);
        setDraftTo(from);
      } else {
        setDraftTo(d);
      }
      setPickStep('start');
    }
  };

  const applyRange = () => {
    if (draftFrom && draftTo) {
      onChange(formatRange(draftFrom, draftTo));
      setOpen(false);
    }
  };

  const applySingleDay = () => {
    if (draftFrom) {
      onChange(formatRange(draftFrom, draftFrom));
      setOpen(false);
    }
  };

  const clearRange = () => {
    setDraftFrom(null);
    setDraftTo(null);
    setPickStep('start');
    onChange('');
  };

  const isInRange = (day: Date) => {
    if (!draftFrom || !draftTo) return false;
    const from = startOfDay(draftFrom);
    const to = startOfDay(draftTo);
    const [start, end] = isBefore(from, to) ? [from, to] : [to, from];
    return isWithinInterval(startOfDay(day), { start, end });
  };

  const rangeReady = Boolean(draftFrom && draftTo);
  const singleDayReady = Boolean(draftFrom && !draftTo);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-xl border px-4 py-3 text-left flex items-center gap-3 transition-colors ${
          open
            ? 'border-cyan-400/50 bg-black/50 ring-2 ring-cyan-400/40'
            : 'border-white/10 bg-black/40 hover:border-white/20'
        }`}
      >
        <Calendar size={18} className="text-cyan-400 shrink-0" />
        <span className={value ? 'text-white font-medium' : 'text-slate-500'}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-[100] mt-2 rounded-2xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/50 p-4 sm:p-5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handlePrevMonth}
              disabled={!canGoPrevMonth}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-white capitalize">
              {format(viewMonth, 'LLLL yyyy', { locale: ru })}
            </p>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
              aria-label="Следующий месяц"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div
              className={`rounded-xl px-3 py-2 border text-xs ${
                pickStep === 'start' ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Начало</p>
              <p className="text-white font-semibold">
                {draftFrom ? format(draftFrom, 'd MMM yyyy', { locale: ru }) : '—'}
              </p>
            </div>
            <div
              className={`rounded-xl px-3 py-2 border text-xs ${
                pickStep === 'end' ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="text-slate-500 font-bold uppercase tracking-wider mb-0.5">Конец</p>
              <p className="text-white font-semibold">
                {draftTo ? format(draftTo, 'd MMM yyyy', { locale: ru }) : '—'}
              </p>
            </div>
          </div>

          <p className="text-xs text-cyan-300/90 mb-3 font-medium">
            {pickStep === 'start'
              ? '1. Нажмите день начала аренды'
              : '2. Нажмите день окончания (можно в другом месяце — перелистайте стрелками)'}
          </p>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const d = startOfDay(day);
              const disabled = isBefore(d, today);
              const outside = !isSameMonth(d, viewMonth);
              const selectedStart = draftFrom && isSameDay(d, draftFrom);
              const selectedEnd = draftTo && isSameDay(d, draftTo);
              const inRange = isInRange(d);

              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={disabled}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleDayClick(d)}
                  className={[
                    'h-9 rounded-lg text-sm font-semibold transition-colors',
                    outside ? 'text-slate-500' : 'text-slate-200',
                    disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer',
                    inRange && !selectedStart && !selectedEnd ? 'bg-cyan-400/20 text-cyan-100' : '',
                    selectedStart || selectedEnd ? 'bg-cyan-400 text-slate-950 ring-2 ring-cyan-300/50' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyRange}
                disabled={!rangeReady}
                className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Готово
              </button>
              <button
                type="button"
                onClick={applySingleDay}
                disabled={!singleDayReady}
                className="flex-1 min-w-[100px] py-2.5 rounded-xl border border-cyan-400/40 text-cyan-200 text-sm font-bold hover:bg-cyan-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Один день
              </button>
            </div>
            <button
              type="button"
              onClick={clearRange}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl border border-white/15 text-slate-400 text-sm font-semibold hover:bg-white/5 w-full"
            >
              <X size={14} /> Сбросить период
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

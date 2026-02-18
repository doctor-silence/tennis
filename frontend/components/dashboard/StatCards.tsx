
import React from 'react';
import { RefreshCw, ArrowUp, Calendar, Zap } from 'lucide-react';
import { CalendarEvent, Student } from '../../types';

interface NextLesson {
    time: string;
    studentName: string;
    status: string;
}

export const IncomeStatCard = ({ amount, percentage }: { amount: number; percentage: number }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm">
        <p className="text-sm font-medium text-slate-500">ДОХОД НЕДЕЛИ</p>
        <p className="text-3xl font-bold my-1.5">{amount.toLocaleString('ru-RU')} ₽</p>
        <div className="flex items-center text-sm text-green-500">
            <ArrowUp size={16} className="mr-1" />
            <span>+{percentage}% к прошлой</span>
        </div>
    </div>
);

export const LessonsStatCard = ({ count }: { count: number }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-start">
        <div>
            <p className="text-sm font-medium text-slate-500">УРОКОВ</p>
            <p className="text-3xl font-bold my-1.5">{count}</p>
        </div>
        <Calendar className="text-slate-300" size={24} />
    </div>
);

export const GoogleSyncStatCard = ({ isSynced }: { isSynced: boolean }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500">GOOGLE SYNC</p>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={18} />
            </button>
        </div>
        <p className={`text-md font-semibold mt-4 ${isSynced ? 'text-slate-800' : 'text-amber-600'}`}>
            {isSynced ? 'Всё актуально' : 'Требуется вход'}
        </p>
    </div>
);

export const NextLessonStatCard = ({ nextLesson }: { nextLesson: NextLesson | null }) => (
    <div className="bg-[#D1FF4D] text-black p-5 rounded-2xl shadow-sm">
        <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-slate-800/80">СЛЕД. ЗАНЯТИЕ</p>
            <Zap className="text-black/80" size={20} />
        </div>
        {nextLesson ? (
            <>
                <p className="text-lg font-bold my-2">
                    {nextLesson.time} • {nextLesson.studentName}
                </p>
                <p className="text-xs font-bold">
                    {nextLesson.status}
                </p>
            </>
        ) : (
            <p className="text-lg font-bold my-2">Нет предстоящих занятий</p>
        )}
    </div>
);

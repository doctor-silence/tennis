import React from 'react';
import { User } from '../../types';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MoreHorizontal, MapPin } from 'lucide-react';

const SmartScheduleView: React.FC<{ user: User }> = ({ user }) => {
    const today = new Date();
    const currentDay = today.getDate();

    const daysOfWeek = Array.from({ length: 6 }).map((_, i) => {
        const date = addDays(today, i);
        return {
            short: format(date, 'EE', { locale: ru }).toUpperCase(),
            date: date.getDate(),
            isToday: date.getDate() === currentDay && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(),
        };
    });

    const timeSlots = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-4">
                {/* Time Gutter */}
                <div className="text-right text-xs text-slate-400">
                    <div className="h-12"></div> {/* Spacer for day headers */}
                    {timeSlots.map(time => (
                        <div key={time} className="h-14 flex items-start justify-end relative">
                            <span className="absolute -top-1.5 translate-y-1/2">{time}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-6 gap-2">
                    {/* Day Headers */}
                    {daysOfWeek.map((day, index) => (
                        <div key={index} className="text-center h-12">
                            <p className="text-sm text-slate-500">{day.short}</p>
                            <p className={`text-2xl font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.date}</p>
                        </div>
                    ))}

                    {/* Grid Cells and Events */}
                    {Array.from({ length: 6 * timeSlots.length }).map((_, i) => {
                        // Example: Place a mock event at a specific time and day
                        const dayIndex = i % 6; // 0-5 for Mon-Sat
                        const timeIndex = Math.floor(i / 6); // 0-14 for time slots
                        const isSpecificEvent = dayIndex === 0 && timeIndex === 2; // Example: Monday, 10:00

                        return (
                            <div 
                                key={i} 
                                className="bg-slate-100/50 rounded-lg h-14 border border-transparent flex items-center justify-center relative"
                            >
                                {isSpecificEvent && (
                                    <div className="absolute inset-1 bg-lime-100 text-lime-800 rounded-lg p-1 flex flex-col justify-between text-xs overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold uppercase">INDIV</span>
                                            <MoreHorizontal size={14} className="cursor-pointer" />
                                        </div>
                                        <p className="font-bold leading-tight">Александр П.</p>
                                        <p className="flex items-center gap-1 text-slate-600 text-[10px]"><MapPin size={10} /> В Спартак</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SmartScheduleView;

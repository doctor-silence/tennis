import React, { useState, useEffect } from 'react';
import { CalendarEvent, User } from '../../types';
import { api } from '../../services/api';
import { MoreHorizontal, MapPin } from 'lucide-react';

const weekDays = [
    { short: 'ПН', date: 21, isToday: false },
    { short: 'ВТ', date: 22, isToday: false },
    { short: 'СР', date: 23, isToday: false },
    { short: 'ЧТ', date: 24, isToday: false },
    { short: 'ПТ', date: 25, isToday: true },
    { short: 'СБ', date: 26, isToday: false },
    { short: 'ВС', date: 27, isToday: false },
];

const timeSlots = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

const getEventGridPosition = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    const dayIndex = start.getDay();
    const gridColumn = dayIndex === 0 ? 7 : dayIndex;

    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const gridRowStart = (startHour - 8) * 2 + (startMinutes / 30) + 1;

    const endHour = end.getHours();
    const endMinutes = end.getMinutes();
    const gridRowEnd = (endHour - 8) * 2 + (endMinutes / 30) + 1;
    
    return {
        gridColumn,
        gridRow: `${Math.floor(gridRowStart)} / ${Math.ceil(gridRowEnd)}`,
    };
};

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const { gridColumn, gridRow } = getEventGridPosition(event);
    
    const eventTypeStyles = {
        individual: { bg: 'bg-blue-100', text: 'text-blue-800', tag: 'INDIV' },
        group: { bg: 'bg-purple-100', text: 'text-purple-800', tag: 'GROUP' },
        sparring: { bg: 'bg-green-100', text: 'text-green-800', tag: 'СПАРРИНГ' },
        default: { bg: 'bg-gray-100', text: 'text-gray-800', tag: 'ДРУГОЕ' }
    };

    const styles = eventTypeStyles[event.eventType] || eventTypeStyles.default;

    return (
        <div 
            style={{ gridColumn, gridRow }}
            className={`p-2 rounded-lg flex flex-col overflow-hidden text-xs ${styles.bg} ${styles.text}`}
        >
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold uppercase text-xs">{styles.tag}</span>
                <MoreHorizontal size={14} className="cursor-pointer" />
            </div>
            <p className="font-bold text-sm flex-grow">{event.title}</p>
            {event.location && <p className="flex items-center gap-1 text-slate-600"><MapPin size={10} /> {event.location}</p>}
        </div>
    );
};


const SmartScheduleView: React.FC<{ user: User }> = ({ user }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        if (user && user.id) {
            const mockEvents: CalendarEvent[] = [
                { id: '1', coachId: user.id, title: 'Александр...', start: new Date(2025, 11, 21, 10, 0), end: new Date(2025, 11, 21, 11, 0), eventType: 'individual', location: 'Спартак' },
                { id: '2', coachId: user.id, title: 'Мария К. (...', start: new Date(2025, 11, 25, 11, 0), end: new Date(2025, 11, 25, 12, 0), eventType: 'sparring', location: 'ЦСКА' },
                { id: '3', coachId: user.id, title: 'Junior Group', start: new Date(2025, 11, 23, 15, 0), end: new Date(2025, 11, 23, 16, 30), eventType: 'group', location: 'Теннис Парк' }
            ];
            setEvents(mockEvents);
            // api.calendar.getEvents(user.id).then(setEvents).catch(console.error);
        }
    }, [user]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="grid grid-cols-[auto_1fr]">
                {/* Time Gutter */}
                <div className="text-right text-xs text-slate-400 pr-4">
                    <div className="h-12"></div> {/* Spacer for day headers */}
                    {timeSlots.map(time => (
                        <div key={time} className="h-14 flex items-start justify-end relative">
                            <span className="absolute -top-1.5">{time}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1.5 relative">
                    {/* Day Headers */}
                    {weekDays.map(day => (
                        <div key={day.short} className="text-center h-12">
                            <p className="text-sm text-slate-500">{day.short}</p>
                            <p className={`text-2xl font-bold ${day.isToday ? 'text-green-500' : 'text-slate-800'}`}>{day.date}</p>
                        </div>
                    ))}

                    {/* Grid Background */}
                    <div className="col-span-7 grid grid-cols-7 grid-rows-[30] gap-1.5" style={{ gridTemplateRows: `repeat(${timeSlots.length * 2}, 0.875rem)` }}>
                        {Array.from({ length: 7 * timeSlots.length }).map((_, i) => (
                             <div key={i} className="bg-slate-100/50 rounded-xl h-14 border border-transparent"></div>
                        ))}
                    </div>

                    {/* Events Overlay */}
                    <div className="absolute top-12 left-0 w-full h-full col-span-7 grid grid-cols-7 grid-rows-[30] gap-1.5"
                         style={{ gridTemplateRows: `repeat(${timeSlots.length * 2}, 0.875rem)` }}
                    >
                       {events.map(event => (
                           <EventCard key={event.id} event={event} />
                       ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartScheduleView;

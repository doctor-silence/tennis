
import React, { useState, useEffect } from 'react';
import { User, CalendarEvent, Student } from '../../types';
import { IncomeStatCard, LessonsStatCard, GoogleSyncStatCard, NextLessonStatCard } from './StatCards';
import SmartScheduleView from './SmartScheduleView';
import StudentListView from './StudentListView';
import { api } from '../../services/api';

const StudentsView: React.FC<{ user: User }> = ({ user }) => {
    const [activeView, setActiveView] = useState<'schedule' | 'list'>('schedule');
    const [stats, setStats] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        if (user && user.id) {
            api.crm.getStats(user.id).then(setStats).catch(console.error);
            api.students.getAll(user.id).then(setStudents).catch(console.error);
        }
    }, [user]);

    return (
        <div className="p-8 text-gray-900 min-h-screen bg-[#F7F8FA]">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <IncomeStatCard amount={stats?.weeklyIncome || 0} percentage={stats?.incomeChange || 8} />
                <LessonsStatCard count={stats?.lessonsThisWeek || 16} />
                <GoogleSyncStatCard isSynced={stats?.isGoogleSynced || true} />
                <NextLessonStatCard nextLesson={stats?.nextLesson || { time: '10:00', studentName: 'Александр П.', status: 'КОРТ ЗАБРОНИРОВАН' }} />
            </div>

            {/* View Toggles */}
            <div className="flex items-center gap-2 mb-6">
                 <button
                    onClick={() => setActiveView('schedule')}
                    className={`px-5 py-2.5 font-semibold rounded-lg transition-all text-sm ${activeView === 'schedule' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                >
                    Смарт-календарь
                </button>
                <button
                    onClick={() => setActiveView('list')}
                    className={`px-5 py-2.5 font-semibold rounded-lg transition-all text-sm ${activeView === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                >
                    База учеников
                </button>
            </div>
            
            {/* Conditional View */}
            {activeView === 'schedule' ? <SmartScheduleView user={user} /> : <StudentListView user={user} />}

        </div>
    );
};

export default StudentsView;

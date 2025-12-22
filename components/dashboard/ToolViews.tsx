import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BookOpen, Video, Upload, Users, Plus, Loader2, Trash2, IndianRupee, Clock } from 'lucide-react';
import { User, Student, CrmStats } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';
import SmartScheduleView from './SmartScheduleView';
import StudentListView from './StudentListView';
import StudentProfileFlyout from './StudentProfileFlyout';
import AddStudentModal from './AddStudentModal'; // Import the new modal
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Lazy load the 3D component
const TennisCourt3D = lazy(() => import('./TennisCourt3D'));


export const TacticsView = ({ user }: { user: User }) => {
    const [trajectories, setTrajectories] = useState<any[]>([]);
    const [savedTactics, setSavedTactics] = useState<any[]>([]);
    const [tacticName, setTacticName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [tacticToDelete, setTacticToDelete] = useState<any | null>(null);

    const fetchTactics = async () => {
        try {
            setIsLoading(true);
            const tactics = await api.tactics.list(user.id);
            setSavedTactics(tactics || []);
        } catch (err) {
            setError('Не удалось загрузить тактики');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTactics();
    }, [user.id]);

    const handleSaveTactic = async () => {
        if (!tacticName) {
            setError('Введите название тактики');
            return;
        }
        if (trajectories.length === 0) {
            setError('Нарисуйте хотя бы одну траекторию');
            return;
        }
        try {
            setIsLoading(true);
            setError('');
            const newTactic = await api.tactics.create({
                userId: user.id,
                name: tacticName,
                trajectories: trajectories,
            });
            setSavedTactics([newTactic, ...savedTactics]);
            setTacticName('');
            setTrajectories([]);
        } catch (err) {
            setError('Ошибка сохранения');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLoadTactic = (tactic: any) => {
        const trajectoriesData = typeof tactic.tactics_data === 'string' 
            ? JSON.parse(tactic.tactics_data) 
            : tactic.tactics_data;
        setTrajectories(trajectoriesData || []);
    };

    const handleDeleteTactic = (tactic: any) => {
        setTacticToDelete(tactic);
    };

    const confirmDelete = async () => {
        if (!tacticToDelete) return;

        try {
            setIsLoading(true);
            setError('');
            await api.tactics.delete(tacticToDelete.id);
            setSavedTactics(savedTactics.filter(t => t.id !== tacticToDelete.id));
            setTacticToDelete(null);
        } catch (err) {
            setError('Ошибка удаления');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
                <div className="lg:col-span-2 h-full">
                    <Suspense fallback={
                        <div className="w-full h-full bg-slate-100 rounded-3xl flex items-center justify-center text-slate-500">
                            <Loader2 className="animate-spin mr-2" /> Загрузка 3D-модели...
                        </div>
                    }>
                        <TennisCourt3D 
                            user={user} 
                            trajectories={trajectories}
                            setTrajectories={setTrajectories}
                        />
                    </Suspense>
                </div>
                <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="text-xl font-bold mb-4">Библиотека Тактик</h3>
                    
                    {/* Save Form */}
                    <div className="mb-4 p-4 bg-slate-50 rounded-2xl">
                        <h4 className="font-bold text-md mb-2">Сохранить новую тактику</h4>
                        <input 
                            type="text"
                            value={tacticName}
                            onChange={(e) => setTacticName(e.target.value)}
                            placeholder="Название тактики (например, Подача в квадрат 1)"
                            className="w-full p-2 border border-slate-300 rounded-lg mb-2"
                            disabled={isLoading}
                        />
                        <Button 
                            onClick={handleSaveTactic} 
                            disabled={isLoading || trajectories.length === 0}
                            className="w-full"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Сохранить'}
                        </Button>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    {/* Tactics List */}
                    <div className="flex-grow overflow-y-auto space-y-3">
                        {isLoading && savedTactics.length === 0 && <div className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></div>}
                        {!isLoading && savedTactics.length === 0 && (
                            <div className="text-center text-slate-400 p-8 border-2 border-dashed rounded-2xl">
                                <BookOpen className="mx-auto mb-2"/>
                                <p>Ваша библиотека пуста.</p>
                                <p className="text-sm">Нарисуйте схему и сохраните ее.</p>
                            </div>
                        )}
                        {savedTactics.map((tactic) => (
                            <div key={tactic.id} className="p-3 bg-white border rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">{tactic.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleLoadTactic(tactic)}>Загрузить</Button>
                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteTactic(tactic)}>
                                            <Trash2 size={16}/>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {tacticToDelete && (
                <Modal
                    isOpen={!!tacticToDelete}
                    onClose={() => setTacticToDelete(null)}
                    title="Подтвердите удаление"
                >
                    <p>Вы уверены, что хотите удалить тактику "{tacticToDelete.name}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <Button variant="secondary" onClick={() => setTacticToDelete(null)} disabled={isLoading}>
                            Отмена
                        </Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Удалить'}
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
export const VideoAnalysisView = () => (
    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center">
         <div className="max-w-md mx-auto">
             <div className="w-20 h-20 bg-lime-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-lime-600">
                 <Video size={40}/>
             </div>
             <h3 className="text-2xl font-bold mb-4">AI Анализ Техники</h3>
             <p className="text-slate-500 mb-8">Загрузите видео вашего удара (форхенд, бэкхенд или подача), и наш алгоритм определит точки роста.</p>
             <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50 transition-colors cursor-pointer">
                 <Upload size={32} className="mx-auto mb-4 text-slate-400"/>
                 <p className="font-bold text-slate-900">Перетащите видео сюда</p>
                 <p className="text-xs text-slate-400 mt-2">MP4, MOV до 50MB</p>
             </div>
         </div>
    </div>
);

export const StudentsView: React.FC<{ user: User }> = ({ user }) => {
    const [activeView, setActiveView] = useState<'schedule' | 'list'>('list');
    const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const fetchAllData = () => {
        if (user && user.id) {
            api.crm.getStats(user.id).then(setCrmStats).catch(console.error);
            api.students.getAll(user.id).then(setStudents).catch(console.error);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [user]);

    const handleStudentClick = (studentId: string) => {
        setSelectedStudentId(studentId);
    };

    const handleCloseStudentProfile = () => {
        setSelectedStudentId(null);
    };

    const handleStudentAdded = (newStudent: Student) => {
        setStudents(prev => [newStudent, ...prev]);
        fetchAllData(); // Re-fetch stats after adding a student
    };

    const today = new Date();

    return (
        <div className="p-8 text-gray-900 min-h-screen bg-[#F7F8FA]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Players Card */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-lime-300 uppercase">АКТИВНЫЕ ИГРОКИ</span>
                        <Users size={40} className="absolute -right-2 -top-2 text-white/10" />
                    </div>
                    <div className="text-5xl font-bold my-4">{crmStats?.activePlayers || 0}</div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
                    >
                        <Plus size={16} /> Добавить
                    </button>
                </div>

                {/* Accounts Receivable Card */}
                <div className="bg-white text-gray-900 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
                     <div>
                        <span className="text-sm font-semibold text-gray-400 uppercase">ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ</span>
                        <div className="text-4xl font-bold text-red-500 my-4">{Math.abs(crmStats?.totalDebt || 0)} ₽</div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                       <Clock size={14} className="mr-2 text-yellow-500" />
                        <span>{crmStats?.playersInDebt || 0} игрока имеют минус</span>
                    </div>
                </div>

                {/* View Toggles and Date */}
                <div className="lg:col-span-2 bg-indigo-600 text-white rounded-3xl p-6 flex items-center justify-between shadow-lg">
                    <div>
                        <span className="text-sm font-semibold opacity-80 block mb-3 uppercase">Режим отображения</span>
                        <div className="flex items-center bg-black/20 rounded-full p-1">
                            <button
                                onClick={() => setActiveView('list')}
                                className={`px-5 py-1.5 rounded-full transition-all text-sm font-medium ${activeView === 'list' ? 'bg-white text-indigo-600' : 'bg-transparent text-white'}`}
                            >
                                Список
                            </button>
                            <button
                                onClick={() => setActiveView('schedule')}
                                className={`px-5 py-1.5 rounded-full transition-all text-sm font-medium ${activeView === 'schedule' ? 'bg-white text-indigo-600' : 'bg-transparent text-white'}`}
                            >
                                Календарь
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold">{format(today, 'dd')}</div>
                        <div className="text-sm opacity-80 uppercase">{format(today, 'MMM', { locale: ru })}</div>
                        <div className="text-xs opacity-60 uppercase">{format(today, 'EEEE', { locale: ru })}</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter (Placeholder for now) */}
            <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Поиск по фамилии или уровню..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button className="p-3 bg-white rounded-xl border-transparent shadow-sm">
                    {/* Filter Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                </button>
            </div>
            
            {/* Conditional View */}
            {activeView === 'schedule' ? <SmartScheduleView user={user} /> : <StudentListView students={students} onStudentClick={handleStudentClick} />}

            {/* Student Profile Flyout */}
            {selectedStudentId && (
                <StudentProfileFlyout studentId={selectedStudentId} onClose={handleCloseStudentProfile} />
            )}

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <AddStudentModal
                    user={user}
                    onClose={() => setIsAddModalOpen(false)}
                    onStudentAdded={handleStudentAdded}
                />
            )}
        </div>
    );
};
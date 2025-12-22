
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BookOpen, Video, Upload, Users, Plus, Loader2, Trash2 } from 'lucide-react';
import { User, Student } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';

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

export const StudentsView = ({ user }: { user: User }) => {
    const [students, setStudents] = useState<Student[]>([]);
    
    useEffect(() => {
        const fetchStudents = async () => {
            const data = await api.students.getAll(user.id);
            setStudents(data);
        };
        fetchStudents();
    }, [user.id]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="font-bold text-lg">Мои ученики</h3>
                    <p className="text-slate-500 text-sm">Всего активных: {students.length}</p>
                </div>
                <Button size="sm" className="gap-2"><Plus size={16}/> Добавить</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {students.map(s => (
                     <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group hover:border-lime-400 transition-colors">
                         <div className="flex items-center gap-4 mb-6">
                             <img src={s.avatar} className="w-14 h-14 rounded-full bg-slate-100" alt={s.name}/>
                             <div>
                                 <div className="font-bold text-lg">{s.name}</div>
                                 <div className="text-sm text-slate-500">{s.age} лет • {s.level}</div>
                             </div>
                         </div>
                         <div className="space-y-3">
                             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                                 <span className="text-slate-500">Баланс</span>
                                 <span className={`font-bold ${s.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{s.balance} ₽</span>
                             </div>
                             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                                 <span className="text-slate-500">След. занятие</span>
                                 <span className="font-bold text-slate-900">{s.nextLesson}</span>
                             </div>
                         </div>
                         <Button variant="secondary" className="w-full mt-6">Профиль</Button>
                     </div>
                 ))}
                 {students.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                         <Users size={32} className="mx-auto mb-2 opacity-50"/>
                         <p>Список учеников пуст</p>
                     </div>
                 )}
            </div>
        </div>
    );
};

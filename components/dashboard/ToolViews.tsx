
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BookOpen, Video, Upload, Users, Plus, Loader2 } from 'lucide-react';
import { User, Student } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';

// Lazy load the 3D component
const TennisCourt3D = lazy(() => import('./TennisCourt3D'));


export const TacticsView = ({ user }: { user: User }) => {
    return (
        <div className="h-[700px]">
            <Suspense fallback={
                <div className="w-full h-full bg-slate-100 rounded-3xl flex items-center justify-center text-slate-500">
                    <Loader2 className="animate-spin mr-2" /> Загрузка 3D-модели...
                </div>
            }>
                <TennisCourt3D user={user} />
            </Suspense>
        </div>
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

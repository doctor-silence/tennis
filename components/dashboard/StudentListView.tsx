import React from 'react';
import { Student } from '../../types';
import { ArrowRight, Wallet, BookOpen } from 'lucide-react';

interface StudentListViewProps {
    students: Student[];
    onStudentClick: (studentId: string) => void;
}

const StudentListView: React.FC<StudentListViewProps> = ({ students, onStudentClick }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map(student => (
                <div 
                    key={student.id} 
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-slate-100 flex flex-col"
                    onClick={() => onStudentClick(student.id)}
                >
                    <div className="flex items-center mb-6">
                        <div className="relative flex-shrink-0">
                            <img 
                                src={student.avatar || "https://via.placeholder.com/150"} 
                                alt={student.name} 
                                className="w-16 h-16 rounded-full mr-4 object-cover border-2 border-white shadow-md" 
                            />
                            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${student.balance < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                <Wallet size={14} />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-slate-800 truncate">{student.name}</h3>
                            <p className="text-sm text-slate-500">{student.level} • {student.age} лет</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div className="bg-slate-50/70 p-3 rounded-xl">
                            <p className="text-xs text-slate-500 uppercase font-semibold">БАЛАНС</p>
                            <p className={`font-bold text-lg ${student.balance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                {student.balance} ₽
                            </p>
                        </div>
                        <div className="bg-slate-50/70 p-3 rounded-xl">
                            <p className="text-xs text-slate-500 uppercase font-semibold">СЛЕДУЮЩИЙ</p>
                            <p className="font-bold text-lg text-slate-800">{student.nextLesson}</p>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold">SKILL LEVEL (XP)</p>
                            <p className="font-semibold text-sm text-blue-600">{student.skillLevelXp} XP</p>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (student.skillLevelXp || 0) / 100)}%` }} 
                            ></div>
                        </div>
                    </div>

                    <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors">
                        <div className="flex items-center gap-2">
                            <BookOpen size={16} />
                            <span>ТАКТИКА ДЗ</span>
                        </div>
                        <ArrowRight size={16} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StudentListView;

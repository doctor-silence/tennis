import React from 'react';
import { Student } from '../../types';
import { ArrowRight } from 'lucide-react';

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
                    className="bg-white rounded-lg p-6 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => onStudentClick(student.id)}
                >
                    <div className="flex items-center mb-4">
                        <img 
                            src={student.avatar || "https://via.placeholder.com/150"} 
                            alt={student.name} 
                            className="w-12 h-12 rounded-full mr-4 object-cover" 
                        />
                        <div>
                            <h3 className="text-lg font-semibold">{student.name}</h3>
                            <p className="text-sm text-gray-500">{student.level} • {student.age} лет</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 mb-4 text-sm">
                        <div>
                            <p className="text-gray-500">БАЛАНС</p>
                            <p className={`font-semibold ${student.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {student.balance} ₽
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">СЛЕДУЮЩИЙ</p>
                            <p className="font-semibold">{student.nextLesson}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500">SKILL LEVEL (XP)</p>
                            <p className="font-semibold">{student.skillLevelXp} XP</p>
                            {/* Visual XP bar placeholder */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${Math.min(100, student.skillLevelXp / 100)}%` }} 
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-blue-600 hover:text-blue-800 font-medium text-sm">
                        ТАКТИКА ДЗ
                        <ArrowRight size={16} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StudentListView;

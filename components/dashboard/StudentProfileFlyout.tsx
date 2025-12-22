import React, { useState, useEffect } from 'react';
import { Student, Skill, Lesson } from '../../types';
import { api } from '../../services/api';
import { X, Edit, Trash2, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StudentProfileFlyoutProps {
    studentId: string;
    onClose: () => void;
}

const StudentProfileFlyout: React.FC<StudentProfileFlyoutProps> = ({ studentId, onClose }) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                setLoading(true);
                const fetchedStudent = await api.students.getOne(studentId);
                setStudent(fetchedStudent);
            } catch (err) {
                console.error("Failed to fetch student details:", err);
                setError("Не удалось загрузить данные студента.");
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchStudent();
        }
    }, [studentId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl w-3/4 max-w-3xl flex items-center justify-center">
                    Загрузка...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl w-3/4 max-w-3xl">
                    <p className="text-red-500">{error}</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Закрыть</button>
                </div>
            </div>
        );
    }

    if (!student) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-11/12 max-w-5xl h-5/6 overflow-y-auto relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <X size={24} />
                </button>

                <div className="flex">
                    {/* Left Column - Profile Details */}
                    <div className="w-1/3 pr-8 border-r border-gray-200">
                        <div className="flex flex-col items-center mb-6">
                            <img 
                                src={student.avatar || "https://via.placeholder.com/150"} 
                                alt={student.name} 
                                className="w-24 h-24 rounded-full object-cover mb-4" 
                            />
                            <h2 className="text-2xl font-bold">{student.name}</h2>
                            <p className="text-sm text-gray-500">LEVEL: {student.level}</p>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">ТЕКУЩИЙ БАЛАНС</h3>
                            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                                <span className={`text-xl font-bold ${student.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {student.balance} ₽
                                </span>
                                <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    ПОПОЛНИТЬ ДЕПОЗИТ
                                </button>
                            </div>
                        </div>

                        {/* Skills Section */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">НАВЫКИ (PRO RADAR)</h3>
                            {student.skills && student.skills.length > 0 ? (
                                student.skills.map((skill: Skill) => (
                                    <div key={skill.name} className="mb-3">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{skill.name}</span>
                                            <span>{skill.value}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full" 
                                                style={{ width: `${skill.value}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm">Навыки не указаны.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Activity & Progress */}
                    <div className="w-2/3 pl-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Активность</h2>
                            <div className="flex items-center space-x-3">
                                <Edit size={20} className="text-gray-500 cursor-pointer hover:text-blue-600" />
                                <Trash2 size={20} className="text-gray-500 cursor-pointer hover:text-red-600" />
                            </div>
                        </div>

                        {/* Lesson History */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">ИСТОРИЯ ЗАНЯТИЙ</h3>
                            {student.lessonHistory && student.lessonHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {student.lessonHistory.map((lesson: Lesson) => (
                                        <div key={lesson.id} className="flex items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                                            <div className="flex-shrink-0 mr-4">
                                                <div className="bg-blue-100 text-blue-600 rounded-full p-2">
                                                    <IndianRupee size={20} />
                                                </div>
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-medium">{lesson.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(lesson.date), 'dd MMMM yyyy', { locale: ru })} • {lesson.location}
                                                </p>
                                            </div>
                                            <div className="text-right text-red-500 font-semibold">
                                                {lesson.amount} ₽
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">История занятий отсутствует.</p>
                            )}
                        </div>

                        {/* Tactical Progress */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">Тактический прогресс</h3>
                            <p className="text-sm text-blue-700 mb-4">
                                Последний тактический разбор был проведен {format(new Date('2025-12-12'), 'dd MMMM', { locale: ru })}. Рекомендовано: отработка выхода к сетке при косом бэкхенде.
                            </p>
                            <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                ОТКРЫТЬ ТАКТИЧЕСКУЮ ДОСКУ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfileFlyout;

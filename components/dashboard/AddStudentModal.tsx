import React, { useState } from 'react';
import { User, Student } from '../../types';
import { api } from '../../services/api';
import { X } from 'lucide-react';

interface AddStudentModalProps {
    user: User;
    onClose: () => void;
    onStudentAdded: (newStudent: Student) => void;
}

type PlayerType = 'amateur' | 'pro';

const AddStudentModal: React.FC<AddStudentModalProps> = ({ user, onClose, onStudentAdded }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [level, setLevel] = useState('');
    const [phone, setPhone] = useState('');
    const [playerType, setPlayerType] = useState<PlayerType>('amateur');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const newStudentData = {
                coachId: user.id,
                name,
                age: parseInt(age),
                level: `${playerType === 'pro' ? 'РТТ' : 'NTRP'} ${level}`,
                avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`,
            };

            const newStudent = await api.students.create(newStudentData);
            onStudentAdded(newStudent);
            onClose();
        } catch (err) {
            console.error("Failed to create student:", err);
            setError("Не удалось создать ученика. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Новый ученик</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center justify-center bg-gray-100 rounded-full p-1 mb-4">
                        <button type="button" onClick={() => setPlayerType('amateur')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${playerType === 'amateur' ? 'bg-white shadow' : 'bg-transparent text-gray-500'}`}>
                            Любитель
                        </button>
                        <button type="button" onClick={() => setPlayerType('pro')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${playerType === 'pro' ? 'bg-white shadow' : 'bg-transparent text-gray-500'}`}>
                            Про
                        </button>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500">ФАМИЛИЯ И ИМЯ</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full mt-1 p-3 bg-gray-100 rounded-lg border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">ВОЗРАСТ</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full mt-1 p-3 bg-gray-100 rounded-lg border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{playerType === 'pro' ? 'РЕЙТИНГ РТТ' : 'NTRP РЕЙТИНГ'}</label>
                            <input
                                type="text"
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                placeholder={playerType === 'pro' ? 'Например, 500' : 'NTRP 3.0'}
                                className="w-full mt-1 p-3 bg-gray-100 rounded-lg border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">ТЕЛЕФОН</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+7 (999) 000-00-00"
                            className="w-full mt-1 p-3 bg-gray-100 rounded-lg border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Создание...' : 'Создать анкету'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentModal;
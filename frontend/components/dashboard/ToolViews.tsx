import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { 
    BookOpen,
    IndianRupee,
    Plus, Search, Users, Wallet, Calendar, MapPin, 
    CheckCircle2, AlertCircle, Loader2, ChevronRight,
    Trophy, Zap, Star, Phone, Trash2, Minus, CreditCard,
    TrendingUp, Activity, Target, Notebook, Video, Award,
    ChevronLeft, Edit3, ClipboardList, CheckCircle, Circle,
    Upload, Play, X, Clock, AlertTriangle, MessageSquare, Send,
    RefreshCw, Layers, Briefcase, Settings, User as UserIcon,
    DollarSign, ArrowUpRight, ArrowDownRight, Calculator,
    Eye, EyeOff, ChevronDown, ChevronUp, FileText, Download, Printer,
    Dribbble
} from 'lucide-react';
import { addDays, getDay } from 'date-fns';
import { User, Student, ScheduledLesson, LessonType, TrainingNote, PlayerGoal, SkillSet } from '../../types';
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[480px] lg:h-[700px]">
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
             <div className="relative mb-6">
                 <div className="w-20 h-20 bg-lime-50 rounded-2xl flex items-center justify-center mx-auto text-lime-600">
                     <Video size={40}/>
                 </div>
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 text-slate-900 px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-2xl border-2 border-white" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                     ⚡ В разработке
                 </div>
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

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const CANNON_PRICE = 500;
const RACKET_RENTAL_PRICE = 300;

const BADGE_CONFIG: Record<string, { label: string, icon: string, color: string }> = {
    'marathon': { label: 'Марафонец', icon: '🏃‍♂️', color: 'bg-orange-100 text-orange-600' },
    'early_bird': { label: 'Утренний атлет', icon: '🌅', color: 'bg-sky-100 text-sky-600' },
    'pro_mindset': { label: 'Pro Mindset', icon: '🧠', color: 'bg-purple-100 text-purple-600' },
    'sharp_shooter': { label: 'Снайпер', icon: '🎯', color: 'bg-emerald-100 text-emerald-600' }
};

export const StudentsView = ({ user }: { user: User }) => {
    const [viewMode, setViewMode] = useState<'schedule' | 'list'>('schedule');
    const [weekOffset, setWeekOffset] = useState(0);
    const [students, setStudents] = useState<Student[]>([]);
    const [lessons, setLessons] = useState<ScheduledLesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDebtOnly, setFilterDebtOnly] = useState(false);
    
    // UI states
    const [showFinances, setShowFinances] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [profileTab, setProfileTab] = useState<'overview' | 'gear' | 'diary' | 'goals' | 'video'>('overview');
    const [showStudentDetails, setShowStudentDetails] = useState(false);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [showBookLessonModal, setShowBookLessonModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{dayIndex: number, time: string, date: string} | null>(null);
    
    // Booking specific states
    const [bookingStudentId, setBookingStudentId] = useState<string>('');
    const [bookingSearch, setBookingSearch] = useState('');
    const [useCannon, setUseCannon] = useState(false);
    const [useRacketRental, setUseRacketRental] = useState(false);
    const [courtRentPrice, setCourtRentPrice] = useState<number>(2000); 
    const [lessonPrice, setLessonPrice] = useState<number>(2500); 

    // Recurring lesson states
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringDays, setRecurringDays] = useState<Record<number, boolean>>({});
    const [recurringEndDate, setRecurringEndDate] = useState('');

    // CRM states
    const [customAmount, setCustomAmount] = useState<string>('1000');
    const [newGoalText, setNewGoalText] = useState('');
    const [newGoalDate, setNewGoalDate] = '';
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reportComment, setReportComment] = useState('');
    const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);

    const videoInputRef = useRef<HTMLInputElement>(null);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [newStudent, setNewStudent] = useState({
        name: '', age: 18, level: 'NTRP 3.5', phone: '', isPro: false, rttRank: 0
    });

    const reportStats = useMemo(() => {
        if (!selectedStudent) return null;

        const studentLessons = lessons.filter(l => l.studentId === selectedStudent.id);
        const attendedCount = studentLessons.length;
        // Assuming trainingFrequency is per week, for a 4-week month.
        const plannedLessons = (selectedStudent.trainingFrequency || 0) * 4;
        const attendancePercentage = plannedLessons > 0 ? Math.round((attendedCount / plannedLessons) * 100) : 0;

        // XP Gained is not tracked, so we display total XP.
        const xpGained = selectedStudent.xp || 0;

        // Average rating is not in the data model, so it's mocked.
        const averageRating = 4.9;
        const maxRating = 5.0;
        
        return {
            attendancePercentage,
            attendedCount,
            plannedLessons,
            xpGained,
            averageRating,
            maxRating
        };
    }, [selectedStudent, lessons]);

    const weekDates = useMemo(() => {
        const now = new Date();
        // Apply week offset first
        now.setDate(now.getDate() + (weekOffset * 7));
        
        // Get Monday of the current week (getDay returns 0 for Sunday, 1 for Monday, etc.)
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const dates = DAYS_SHORT.map((day, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() + daysToMonday + i);
            
            // Format date manually to avoid timezone issues
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const fullDate = `${year}-${month}-${dayNum}`;
            
            return {
                dayName: day,
                dateNum: d.getDate(),
                monthName: d.toLocaleString('ru', { month: 'short' }),
                fullDate: fullDate
            };
        });
        console.log('weekDates generated:', dates);
        return dates;
    }, [weekOffset]);

    const finances = useMemo(() => {
        const totalRevenue = lessons.reduce((sum, l) => {
            const lPrice = (l as any).lessonPrice || 2500;
            const cPrice = (l as any).courtCost || 0;
            let lessonTotal = lPrice + cPrice;
            if (l.useCannon) lessonTotal += CANNON_PRICE;
            if (l.useRacketRental) lessonTotal += RACKET_RENTAL_PRICE;
            return sum + lessonTotal;
        }, 0);
        const totalCourtRent = lessons.reduce((sum, l) => sum + ((l as any).courtCost || 0), 0); 
        return { totalRevenue, totalCourtRent, netProfit: totalRevenue - totalCourtRent };
    }, [lessons]);

    const lessonsLookup = useMemo(() => {
        const map = new Map<string, ScheduledLesson>();
        lessons.forEach(lesson => {
            // Use actual date as key
            if (lesson.date) {
                // Normalize date format (PostgreSQL might return YYYY-MM-DD or Date object)
                const dateStr = typeof lesson.date === 'string' 
                    ? lesson.date.split('T')[0] 
                    : new Date(lesson.date).toISOString().split('T')[0];
                const key = `${dateStr}-${lesson.startTime}`;
                map.set(key, lesson);
                console.log('Added lesson to lookup:', key, lesson);
            } else {
                console.warn('Lesson without date:', lesson);
            }
        });
        console.log('Lessons lookup map size:', map.size);
        return map;
    }, [lessons]);

    const filteredStudents = useMemo(() => {
        const query = search.toLowerCase().trim();
        return students.filter(s => {
            const matchesSearch = !query || s.name.toLowerCase().includes(query);
            const matchesDebt = filterDebtOnly ? s.balance < 0 : true;
            return matchesSearch && matchesDebt;
        });
    }, [students, search, filterDebtOnly]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [studentsData, lessonsData] = await Promise.all([
                    api.students.getAll(user.id),
                    api.lessons.getAll(user.id)
                ]);
                setStudents(studentsData);
                setLessons(lessonsData);
            } catch (e) {
                console.error("Load error:", e);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [user.id]);

    // HANDLERS
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudent.name) return;
        setIsSubmitting(true);
        try {
            const added = await api.students.create({
                coachId: user.id,
                ...newStudent,
                avatar: `https://ui-avatars.com/api/?name=${newStudent.name.replace(' ', '+')}&background=random&color=fff`,
                notes: [], goals: [], videos: [], racketHours: 0, trainingFrequency: 2, xp: 0, badges: [],
                skills: { serve: 0, forehand: 0, backhand: 0, stamina: 0, tactics: 0 },
                status: 'active',
                balance: 0,
            });
            setStudents(prev => [added, ...prev]);
            setShowAddStudentModal(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateSkill = async (skillKey: keyof SkillSet, delta: number) => {
        if (!selectedStudent) return;
        const currentSkills = selectedStudent.skills || { serve: 0, forehand: 0, backhand: 0, stamina: 0, tactics: 0 };
        const currentVal = currentSkills[skillKey] || 0;
        const newVal = Math.max(0, Math.min(100, currentVal + delta));
        const xpGain = delta > 0 ? 2 : 0;
        const updatedSkills = { ...currentSkills, [skillKey]: newVal };
        const updated = await api.students.update(selectedStudent.id, { 
            skills: updatedSkills,
            xp: (selectedStudent.xp || 0) + xpGain
        });
        const updatedStudent = { ...selectedStudent, ...updated };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
    };

    const handleUpdateBalance = async (studentId: string, isAddition: boolean) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        const amount = parseInt(customAmount) || 0;
        const newBalance = isAddition ? (student.balance || 0) + amount : (student.balance || 0) - amount;
        const updated = await api.students.update(studentId, { balance: newBalance });
        const updatedStudent = { ...student, ...updated };
        setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
        if (selectedStudent?.id === studentId) {
            setSelectedStudent(updatedStudent);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedStudent) return;
        setIsSubmitting(true);
        try {
            const addedNote: TrainingNote = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('ru-RU'),
                text: newNote,
                coachId: user.id
            };
            const updatedNotes = [addedNote, ...(selectedStudent.notes || [])];
            const updated = await api.students.update(selectedStudent.id, { 
                notes: updatedNotes 
            });
            const updatedStudent = { ...selectedStudent, ...updated };
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            setNewNote('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddGoal = async () => {
        if (!newGoalText || !selectedStudent) return;
        const newGoal: PlayerGoal = {
            id: Date.now().toString(),
            text: newGoalText,
            targetDate: newGoalDate || 'Без срока',
            isCompleted: false
        };
        const updatedGoals = [...(selectedStudent.goals || []), newGoal];
        const updated = await api.students.update(selectedStudent.id, { goals: updatedGoals, xp: (selectedStudent.xp || 0) + 100 });
        const updatedStudent = { ...selectedStudent, ...updated };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        setNewGoalText('');
    };

    const toggleGoal = async (goalId: string) => {
        if (!selectedStudent) return;
        const goalToToggle = selectedStudent.goals?.find(g => g.id === goalId);
        const xpReward = (!goalToToggle?.isCompleted) ? 20 : 0; 
        const updatedGoals = (selectedStudent.goals || []).map(g => 
            g.id === goalId ? { ...g, isCompleted: !g.isCompleted } : g
        );
        const updated = await api.students.update(selectedStudent.id, { 
            goals: updatedGoals,
            xp: (selectedStudent.xp || 0) + xpReward
        });
        const updatedStudent = { ...selectedStudent, ...updated };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
    };

    const handleRestring = async () => {
        if (!selectedStudent) return;
        const updated = await api.students.update(selectedStudent.id, { 
            racketHours: 0, 
            lastRestringDate: new Date().toLocaleDateString('ru') 
        });
        const updatedStudent = { ...selectedStudent, ...updated };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        alert('Струны обновлены!');
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedStudent) {
            setIsSubmitting(true);
            try {
                const newVideo = {
                    id: Date.now().toString(),
                    title: file.name.split('.')[0] || 'Новое видео',
                    date: new Date().toLocaleDateString('ru'),
                    thumbnail: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?q=80&w=400',
                    url: URL.createObjectURL(file)
                };
                const updatedVideos = [newVideo, ...(selectedStudent.videos || [])];
                const updated = await api.students.update(selectedStudent.id, { videos: updatedVideos });
                const updatedStudent = { ...selectedStudent, ...updated };
                setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
                setSelectedStudent(updatedStudent);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!selectedStudent) return;
        const updatedVideos = (selectedStudent.videos || []).filter(v => v.id !== videoId);
        const updated = await api.students.update(selectedStudent.id, { videos: updatedVideos });
        const updatedStudent = { ...selectedStudent, ...updated };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
    };

    const handleViewVideo = (video: any) => {
        setSelectedVideo(video);
        setShowVideoModal(true);
    };

    const handleDeleteLesson = async (lessonId: string) => {
        setLessonToDelete(lessonId);
    };

    const confirmDeleteLesson = async () => {
        if (!lessonToDelete) return;
        
        try {
            await api.lessons.delete(lessonToDelete);
            setLessons(prev => prev.filter(l => l.id !== lessonToDelete));
            setLessonToDelete(null);
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            alert('Не удалось удалить тренировку');
        }
    };

    const handleBookLesson = async () => {
        if (!selectedSlot || !bookingStudentId) return;
        setIsSubmitting(true);
        console.log('handleBookLesson called');
        console.log('API object in ToolViews:', api);
        
        // Destructure lessons from api here to ensure we get the latest reference
        const { lessons: apiLessons } = api; 
        console.log('apiLessons object in ToolViews (destructured):', apiLessons);


        try {
            const student = students.find(s => s.id === bookingStudentId);
            if (!student) return;

            if (isRecurring) {
                // Logic for recurring lessons
                if (!recurringEndDate || Object.keys(recurringDays).length === 0) {
                    alert("Выберите дни недели и дату окончания для создания серии тренировок.");
                    setIsSubmitting(false);
                    return;
                }

                const lessonsToCreate: Omit<ScheduledLesson, 'id'>[] = [];
                let currentDate = new Date(selectedSlot.date);
                const endDate = new Date(recurringEndDate);
                
                console.log('Creating recurring lessons from', selectedSlot.date, 'to', recurringEndDate);
                console.log('Selected days:', recurringDays);
                
                while(currentDate <= endDate) {
                    // date-fns getDay(): Sun=0, Mon=1...Sat=6
                    // My logic: Mon=0, Tue=1...Sun=6
                    const dayOfWeek = (getDay(currentDate) + 6) % 7;

                    if (recurringDays[dayOfWeek]) {
                        const lessonDate = currentDate.toISOString().split('T')[0];
                        console.log('Adding lesson for date:', lessonDate, 'dayOfWeek:', dayOfWeek);
                        
                        const newLesson: Omit<ScheduledLesson, 'id'> = {
                            coachId: user.id, 
                            studentId: student.id, 
                            studentName: student.name, 
                            type: 'indiv', 
                            startTime: selectedSlot.time, 
                            dayIndex: dayOfWeek,
                            date: lessonDate,
                            duration: 60, 
                            status: 'confirmed', 
                            courtName: 'ТК Спартак', 
                            useCannon, 
                            useRacketRental, 
                            courtCost: courtRentPrice, 
                            lessonPrice: lessonPrice 
                        };
                        lessonsToCreate.push(newLesson);
                    }
                    currentDate = addDays(currentDate, 1);
                }

                console.log('Total lessons to create:', lessonsToCreate.length);

                if (lessonsToCreate.length > 0) {
                    console.log('Calling apiLessons.addRecurring');
                    const createdLessons = await apiLessons.addRecurring(lessonsToCreate); // Use apiLessons
                    console.log('Created lessons:', createdLessons);
                    setLessons(prev => [...prev, ...createdLessons]);
                    // Update student balance for all created lessons
                    const totalCharge = lessonsToCreate.reduce((sum, lesson) => sum + lesson.lessonPrice + lesson.courtCost + (lesson.useCannon ? CANNON_PRICE : 0) + (lesson.useRacketRental ? RACKET_RENTAL_PRICE : 0), 0);
                    const updated = await api.students.update(student.id, {
                       balance: (student.balance || 0) - totalCharge,
                       racketHours: (student.racketHours || 0) + lessonsToCreate.length,
                    });
                    const updatedStudent = { ...student, ...updated };
                    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
                }

            } else {
                // Logic for a single lesson
                const totalCharge = lessonPrice + courtRentPrice + (useCannon ? CANNON_PRICE : 0) + (useRacketRental ? RACKET_RENTAL_PRICE : 0);
                let newBadges = [...(student.badges || [])];
                if (selectedSlot.time === '08:00' && !newBadges.includes('early_bird')) newBadges.push('early_bird');
                
                console.log('Creating single lesson with date:', selectedSlot.date, 'time:', selectedSlot.time, 'dayIndex:', selectedSlot.dayIndex);
                const newLesson = await apiLessons.add({ // Use apiLessons
                    coachId: user.id, studentId: student.id, studentName: student.name, type: 'indiv', startTime: selectedSlot.time, dayIndex: selectedSlot.dayIndex, date: selectedSlot.date, duration: 60, status: 'confirmed', courtName: 'ТК Спартак', useCannon, useRacketRental, courtCost: courtRentPrice, lessonPrice: lessonPrice 
                });
                console.log('Created lesson:', newLesson);

                const updated = await api.students.update(student.id, {
                    racketHours: (student.racketHours || 0) + 1,
                    balance: (student.balance || 0) - totalCharge,
                    xp: (student.xp || 0) + 20,
                    badges: newBadges
                });
                
                const updatedStudent = { ...student, ...updated };
                setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
                setLessons(prev => [...prev, newLesson]);
            }
            
            setShowBookLessonModal(false);
            
        } finally {
            // Reset all modal states
            setIsSubmitting(false);
            setBookingStudentId('');
            setUseCannon(false);
            setUseRacketRental(false);
            setIsRecurring(false);
            setRecurringDays({});
            setRecurringEndDate('');
        }
    };

    const getLevel = (xp: number) => Math.floor(xp / 1000) + 1;
    const getLevelProgress = (xp: number) => (xp % 1000) / 10; 

    // CALCULATED TOTAL FOR MODAL
    const currentBookingTotal = useMemo(() => {
        return lessonPrice + courtRentPrice + (useCannon ? CANNON_PRICE : 0) + (useRacketRental ? RACKET_RENTAL_PRICE : 0);
    }, [lessonPrice, courtRentPrice, useCannon, useRacketRental]);

    if (loading) return <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4"><Loader2 className="animate-spin" size={48}/><p className="font-bold animate-pulse uppercase tracking-widest text-xs">Загрузка CRM...</p></div>;

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* HUD & FINANCIALS */}
            <div className="space-y-4">
                <button onClick={() => setShowFinances(!showFinances)} className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border shadow-sm hover:border-indigo-400 transition-all group">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">{showFinances ? <EyeOff size={16}/> : <Eye size={16}/>}</div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Финансовая аналитика</span>
                    {showFinances ? <ChevronUp size={16} className="text-slate-300"/> : <ChevronDown size={16} className="text-slate-300"/>}
                </button>
                {showFinances && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-5">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Выручка</div>
                            <div className="text-2xl font-black text-emerald-900">{finances.totalRevenue.toLocaleString()} ₽</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-5">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 mb-1">Аренда кортов</div>
                            <div className="text-2xl font-black text-rose-900">{finances.totalCourtRent.toLocaleString()} ₽</div>
                        </div>
                        <div className="bg-indigo-600 rounded-[24px] p-5 text-white shadow-lg">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-1">Чистая прибыль</div>
                            <div className="text-3xl font-black">{finances.netProfit.toLocaleString()} ₽</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1 bg-slate-900 rounded-[30px] p-6 text-white relative overflow-hidden group shadow-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-lime-400 mb-2">База учеников</div>
                    <div className="text-4xl font-black">{students.length}</div>
                    <Button size="sm" className="bg-lime-400 text-slate-900 mt-4 rounded-2xl h-10 px-4 font-black uppercase text-[10px] tracking-widest" onClick={() => setShowAddStudentModal(true)}><Plus size={14} className="mr-1"/> Добавить</Button>
                </div>
                <div className="lg:col-span-1 bg-white rounded-[30px] p-6 border shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Активные ученики</div><div className="text-4xl font-black text-slate-900">{new Set(lessons.map(l => l.studentId)).size}</div></div>
                <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[30px] p-5 text-white flex items-center justify-between shadow-xl gap-3">
                    <div className="space-y-0.5 min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200">Режим просмотра</div>
                        <h4 className="text-sm md:text-xl font-bold truncate">Управление сеткой</h4>
                    </div>
                    <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-xl border border-white/10 shrink-0">
                        <button onClick={() => setViewMode('list')} className={`px-3 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white/60'}` }>Список</button>
                        <button onClick={() => setViewMode('schedule')} className={`px-3 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'schedule' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white/60'}`}>Сетка</button>
                    </div>
                </div>
            </div>

            {/* LIST / CALENDAR VIEW */}
            {viewMode === 'list' ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[30px] border shadow-sm">
                        <div className="relative flex-1 w-full"><Search className="absolute left-4 top-3.5 text-slate-300" size={20}/><input className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 outline-none font-bold text-slate-900" placeholder="Поиск ученика..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredStudents.map(s => (
                            <div key={s.id} onClick={() => { setSelectedStudent(s); setShowStudentDetails(true); setProfileTab('overview'); }} className={`bg-white rounded-[45px] p-8 border hover:shadow-2xl transition-all group cursor-pointer border-slate-100 hover:border-indigo-100`}>
                                <div className="flex items-center gap-6 mb-8">
                                    <img src={s.avatar} className="w-20 h-20 rounded-[28px] object-cover shadow-xl border-4 border-white group-hover:scale-105 transition-transform" />
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="text-xl font-black text-slate-900 truncate mb-1">{s.name}</h3>
                                        <div className="flex items-center gap-2"><span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg">Level {getLevel(s.xp)}</span><span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded-lg">{s.xp} XP</span></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-[10px] font-black text-slate-400 uppercase">Баланс</span><span className={`text-lg font-black ${s.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{s.balance.toLocaleString()} ₽</span></div>
                                    <div className="flex justify-between items-center px-2">
                                        <div className="flex flex-col"><span className="text-[9px] font-black text-slate-300 uppercase">Достижения</span><div className="flex gap-1 mt-1">{(s.badges || []).slice(0, 3).map(b => <span key={b} title={BADGE_CONFIG[b]?.label} className="text-xs">{BADGE_CONFIG[b]?.icon}</span>)}{!(s.badges?.length) && <span className="text-[10px] text-slate-200 uppercase font-black italic">Нет наград</span>}</div></div>
                                        <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-500 transition-all"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[50px] border shadow-2xl overflow-hidden relative">
                    {/* Week Navigation */}
                    <div className="sticky top-0 z-40 bg-white border-b px-6 py-4 flex items-center justify-between">
                        <button onClick={() => setWeekOffset(prev => prev - 1)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors">
                            <ChevronLeft size={18} />
                            Предыдущая неделя
                        </button>
                        <div className="text-center">
                            <div className="text-sm font-black text-slate-900">
                                {weekDates[0]?.dateNum} {weekDates[0]?.monthName} - {weekDates[6]?.dateNum} {weekDates[6]?.monthName}
                            </div>
                        </div>
                        <button onClick={() => setWeekOffset(prev => prev + 1)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors">
                            Следующая неделя
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[700px]">
                        <div className="grid grid-cols-[100px_repeat(7,1fr)] min-w-[1200px]">
                            <div className="h-20 sticky top-0 left-0 bg-white z-30 border-b border-r flex items-center justify-center"><Clock size={20} className="text-slate-300"/></div>
                            {weekDates.map((dateObj, i) => (<div key={i} className={`h-20 sticky top-0 z-20 border-b flex flex-col items-center justify-center transition-colors ${new Date().getDate() === dateObj.dateNum ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}><div className="font-black uppercase text-[10px] tracking-widest">{dateObj.dayName}</div><div className="text-2xl font-black">{dateObj.dateNum}</div></div>))}
                            {HOURS.map(time => (
                                <React.Fragment key={time}>
                                    <div className="h-32 border-b border-r bg-slate-50/50 flex items-center justify-center text-xs font-black text-slate-400 sticky left-0 z-10 bg-slate-50">{time}</div>
                                    {weekDates.map((dateObj, dayIdx) => {
                                        // Look up lesson by actual date only
                                        const lesson = lessonsLookup.get(`${dateObj.fullDate}-${time}`);
                                        // Calculate correct day index from the actual date (Mon=0, Tue=1...Sun=6)
                                        const dateForSlot = new Date(dateObj.fullDate);
                                        const realDayIndex = (dateForSlot.getDay() + 6) % 7;
                                        return (
                                            <div key={`${dateObj.fullDate}-${time}`} className="h-32 border-b border-r relative group transition-all hover:bg-slate-50/80">
                                                {lesson ? (
                                                    <div className="absolute inset-2 rounded-2xl shadow-xl z-10 bg-white border-l-4 border-lime-400 hover:shadow-2xl transition-all group/lesson">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }} 
                                                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/lesson:opacity-100 transition-opacity hover:bg-red-600 z-20"
                                                            title="Удалить тренировку"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        <div className="p-3 cursor-pointer" onClick={() => { const student = students.find(s => s.id === lesson.studentId); if(student) { setSelectedStudent(student); setShowStudentDetails(true); setProfileTab('overview'); } }}>
                                                            <div className="text-[8px] font-black uppercase text-slate-400">{lesson.type}</div>
                                                            <div className="text-xs font-black text-slate-900 truncate">{lesson.studentName}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { console.log('Slot clicked:', {dayIdx, realDayIndex, time, dateObj, fullDate: dateObj.fullDate, dayName: dateObj.dayName, dateNum: dateObj.dateNum}); setSelectedSlot({dayIndex: realDayIndex, time: time, date: dateObj.fullDate}); setShowBookLessonModal(true); }} className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-indigo-400 transition-opacity"><Plus size={24}/></button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PLAYER PROFILE 360 MODAL */}
            <Modal isOpen={showStudentDetails} onClose={() => setShowStudentDetails(false)} title="Профиль игрока 360" maxWidth="max-w-4xl">
                {selectedStudent && (
                    <div className="flex flex-col -m-6 overflow-hidden" style={{height: 'min(750px, 85vh)'}}>
                        <div className="bg-slate-900 p-4 md:p-10 text-white shrink-0">
                            <div className="flex items-center gap-4 md:gap-8">
                                <img src={selectedStudent.avatar} className="w-14 h-14 md:w-24 md:h-24 rounded-2xl md:rounded-[35px] border-4 border-white/20 shadow-2xl object-cover shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap"><h3 className="text-lg md:text-3xl font-black truncate">{selectedStudent.name}</h3><span className="bg-lime-400 text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">LVL {getLevel(selectedStudent.xp)}</span></div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase"><Activity size={14} className="text-lime-400"/> {selectedStudent.level}</div>
                                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase"><Zap size={14} className="text-amber-400"/> {selectedStudent.xp} XP</div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col gap-2 shrink-0">
                                    <div className={`text-xl md:text-3xl font-black ${selectedStudent.balance < 0 ? 'text-red-400' : 'text-lime-400'}`}>{selectedStudent.balance.toLocaleString()} ₽</div>
                                    <button onClick={() => {
                                        if (!selectedStudent) return;
                                        const defaultComment = `"${selectedStudent.name} показывает отличную дисциплину. В этом месяце мы сделали большой упор на стабильность подачи. Получен бейдж «Марафонец» — гордимся!"`;
                                        setReportComment(defaultComment);
                                        setShowReportModal(true);
                                    }} className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"><FileText size={14}/> <span className="hidden sm:inline">Отчет</span></button>
                                </div>
                            </div>

                            <div className="flex gap-2 md:gap-8 mt-4 md:mt-10 border-b border-white/10 overflow-x-auto pb-0" style={{scrollbarWidth:'none'}}>
                                {[
                                    { id: 'overview', label: 'Обзор & XP', icon: <Trophy size={14}/> },
                                    { id: 'gear', label: 'Инвентарь', icon: <Layers size={14}/> },
                                    { id: 'diary', label: 'Дневник', icon: <Notebook size={14}/> },
                                    { id: 'goals', label: 'Цели', icon: <Target size={14}/> },
                                    { id: 'video', label: 'Видео', icon: <Video size={14}/> },
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setProfileTab(tab.id as any)} className={`pb-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all relative whitespace-nowrap shrink-0 ${profileTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{tab.icon} {tab.label}{profileTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-lime-400 rounded-t-full"></div>}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/50 custom-scrollbar">
                            {profileTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fade-in-up">
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Прогресс уровня</h4>
                                            <div className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                                <div className="flex justify-between items-end"><span className="text-3xl font-black text-slate-900">{getLevel(selectedStudent.xp)} <span className="text-sm text-slate-400 font-bold uppercase">Lvl</span></span><span className="text-xs font-black text-slate-400">{selectedStudent.xp % 1000} / 1000 XP</span></div>
                                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border p-0.5"><div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${getLevelProgress(selectedStudent.xp)}%` }}></div></div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Бейджи достижений</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                {Object.entries(BADGE_CONFIG).map(([id, cfg]) => {
                                                    const isLocked = !selectedStudent.badges?.includes(id);
                                                    return (<div key={id} className={`p-4 rounded-3xl border flex items-center gap-3 transition-all ${isLocked ? 'opacity-40 grayscale bg-slate-100 border-slate-200' : `${cfg.color} border-current shadow-sm`}`}><div className="text-2xl">{cfg.icon}</div><div className="font-black text-[10px] uppercase tracking-widest">{cfg.label}</div></div>);
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Навыки (прирост XP)</h4>
                                            {/* Skill Translations Map */}
                                            {(() => {
                                                const skillTranslations: { [key: string]: string } = {
                                                    'serve': 'Подача',
                                                    'forehand': 'Форхенд',
                                                    'backhand': 'Бэкхенд',
                                                    'stamina': 'Выносливость',
                                                    'tactics': 'Тактика',
                                                };
                                                return (['serve', 'forehand', 'backhand', 'stamina', 'tactics'] as const).map(skill => (
                                                    <div key={skill} className="space-y-3">
                                                        <div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-600 uppercase">{skillTranslations[skill] || skill}</span><span className="text-xs font-black text-indigo-600">{(selectedStudent.skills && selectedStudent.skills[skill]) || 0}%</span></div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={() => updateSkill(skill, -5)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Minus size={14}/></button>
                                                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(selectedStudent.skills && selectedStudent.skills[skill]) || 0}%` }}></div></div>
                                                            <button onClick={() => updateSkill(skill, 5)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all"><Plus size={14}/></button>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6 h-fit sticky top-0">
                                        <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Транзакции баланса</h4>
                                        <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold text-lg shadow-inner" value={customAmount} onChange={e => setCustomAmount(e.target.value)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={() => handleUpdateBalance(selectedStudent.id, true)} className="bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition-all"><Plus size={18}/> +{customAmount}</button>
                                            <button onClick={() => handleUpdateBalance(selectedStudent.id, false)} className="bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition-all"><Minus size={18}/> -{customAmount}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profileTab === 'gear' && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center"><Layers size={24}/></div><div><h4 className="font-black text-lg text-slate-900">Износ струн</h4><p className="text-xs font-bold text-slate-400 uppercase">Порог: 20 часов игры</p></div></div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-xs font-black"><span className="text-slate-500 uppercase">Наработка</span><span className={selectedStudent.racketHours >= 20 ? 'text-red-500' : 'text-slate-900'}>{selectedStudent.racketHours} / 20 ч</span></div>
                                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border"><div className={`h-full transition-all duration-1000 ${selectedStudent.racketHours >= 20 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, (selectedStudent.racketHours / 20) * 100)}%` }}></div></div>
                                            <button onClick={handleRestring} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"><RefreshCw size={14}/> Сбросить (Перетяжка)</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profileTab === 'diary' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-4">
                                        <textarea className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 border-none min-h-[100px] resize-none" placeholder="Заметка о тренировке..." value={newNote} onChange={e => setNewNote(e.target.value)} /><Button className="w-full h-12 gap-2" onClick={handleAddNote} disabled={!newNote.trim()}><Edit3 size={18}/> Сохранить заметку</Button>
                                    </div>
                                    <div className="space-y-4">{(selectedStudent.notes || []).map(note => (<div key={note.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative"><div className="absolute top-6 right-6 text-[10px] font-black text-slate-300">{note.date}</div><p className="text-sm text-slate-700 font-medium">{note.text}</p></div>))}</div>
                                </div>
                            )}

                            {profileTab === 'goals' && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                                        <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Поставить новую цель</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" placeholder="Напр: Стабильный форхенд" value={newGoalText} onChange={e => setNewGoalText(e.target.value)} /><button onClick={handleAddGoal} disabled={!newGoalText.trim()} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest transition-all hover:bg-indigo-700 active:scale-95">Создать цель (+20 XP)</button></div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {(selectedStudent.goals || []).map(goal => (
                                            <div key={goal.id} className={`p-6 rounded-[30px] border-2 transition-all flex items-center justify-between group ${goal.isCompleted ? 'bg-emerald-50 border-emerald-500/30' : 'bg-white border-slate-100'}`}><div className="flex items-center gap-6 cursor-pointer flex-1" onClick={() => toggleGoal(goal.id)}>{goal.isCompleted ? <CheckCircle className="text-emerald-500" size={28}/> : <Circle className="text-slate-200" size={28}/>}<div><div className={`text-lg font-black ${goal.isCompleted ? 'text-emerald-900 line-through opacity-40' : 'text-slate-900'}`}>{goal.text}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Срок: {goal.targetDate}</div></div></div></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profileTab === 'video' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-slate-900 p-8 rounded-[40px] text-white flex justify-between items-center relative overflow-hidden">
                                        <div className="relative z-10"><h4 className="text-xl font-black mb-2">Технический разбор</h4><p className="text-white/40 text-xs font-medium">Видео-материалы с последних тренировок.</p></div>
                                        <input type="file" className="hidden" ref={videoInputRef} accept="video/*" onChange={handleVideoUpload} /><Button variant="secondary" size="sm" className="gap-2 relative z-10" onClick={() => videoInputRef.current?.click()} disabled={isSubmitting}><Upload size={16}/> Добавить видео</Button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        {(selectedStudent.videos || []).map(vid => (
                                            <div key={vid.id} className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all relative">
                                                <button onClick={() => handleDeleteVideo(vid.id)} className="absolute top-5 right-5 z-10 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg">
                                                    <Trash2 size={14} />
                                                </button>
                                                <div onClick={() => handleViewVideo(vid)} className="cursor-pointer">
                                                    <div className="aspect-video bg-slate-200 rounded-2xl mb-3 relative overflow-hidden">
                                                        <img src={vid.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl">
                                                                <Play size={18} fill="currentColor"/>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="px-2">
                                                        <div className="font-bold text-xs truncate">{vid.title}</div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase">{vid.date}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {!(selectedStudent.videos?.length) && <div className="col-span-full py-10 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest border-2 border-dashed rounded-[32px]">Нет загруженных видео</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* MONTHLY REPORT MODAL */}
            <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Аналитический отчет за месяц" maxWidth="max-w-xl">
                {selectedStudent && (
                    <div className="space-y-8 py-4">
                        <div className="bg-slate-50 p-10 rounded-[40px] border-2 border-dashed border-slate-200 relative overflow-hidden" id="report-content">
                            <div className="flex justify-between items-start mb-12"><div><div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Zap size={18} fill="currentColor"/></div><span className="font-black tracking-tighter uppercase italic">TENNIS<span className="text-lime-600">PRO</span></span></div><h2 className="text-3xl font-black text-slate-900 leading-none">{new Date().toLocaleString('ru', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('ru', { month: 'long' }).slice(1)} {new Date().getFullYear()}</h2><p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Индивидуальный прогресс-репорт</p></div><div className="text-right"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Игрок</div><div className="text-xl font-black text-slate-900">{selectedStudent.name}</div><div className="text-xs font-bold text-indigo-600 uppercase mt-1">Тренер: {user.name}</div></div></div>
                                                        {/* Dynamic Report Stats */}
                            <div className="grid grid-cols-3 gap-6 mb-12">
                                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Посещаемость</div>
                                    <div className="text-2xl font-black text-slate-900">{reportStats?.attendancePercentage}%</div>
                                    <div className="text-[8px] font-bold text-emerald-500 uppercase">{reportStats?.attendedCount} из {reportStats?.plannedLessons} занятий</div>
                                </div>
                                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Набрано XP</div>
                                    <div className="text-2xl font-black text-amber-500">+{reportStats?.xpGained}</div>
                                    <div className="text-[8px] font-bold text-amber-500 uppercase">Прогресс активен</div>
                                </div>
                                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Средняя оценка</div>
                                    <div className="text-2xl font-black text-indigo-600">{reportStats?.averageRating.toFixed(1)} / {reportStats?.maxRating.toFixed(1)}</div>
                                    <div className="text-[8px] font-bold text-indigo-400 uppercase">Стабильный рост</div>
                                </div>
                            </div>
                            
                            {/* SKILLS DYNAMICS */}
                            <div className="space-y-6 mb-12">
                                <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Анализ навыков (динамика)</h4>
                                {(() => {
                                    const skillTranslations: { [key: string]: string } = {
                                        'serve': 'Подача',
                                        'forehand': 'Форхенд',
                                        'backhand': 'Бэкхенд',
                                        'stamina': 'Выносливость',
                                        'tactics': 'Тактика',
                                    };
                                    // Mock dynamics data as seen in the screenshot
                                    const skillDynamics: { [key: string]: string } = {
                                        'serve': '+5%',
                                        'forehand': '+2%',
                                        'backhand': '+5%',
                                        'stamina': '+3%',
                                        'tactics': '+6%',
                                    };
                                    return (Object.keys(skillTranslations) as Array<keyof typeof skillTranslations>).map(skillKey => (
                                        <div key={skillKey} className="flex items-center gap-4">
                                            <span className="w-28 text-xs font-bold text-slate-500 uppercase tracking-wider">{skillTranslations[skillKey]}</span>
                                            <div className="flex-1 bg-slate-200 rounded-full h-2.5">
                                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(selectedStudent.skills && selectedStudent.skills[skillKey]) || 0}%` }}></div>
                                            </div>
                                            <span className="w-12 text-sm font-bold text-green-600 text-right">{skillDynamics[skillKey]}</span>
                                        </div>
                                    ));
                                })()}
                            </div>

                            <div className="space-y-6 mb-12">
                                <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2"><Award size={16} className="text-lime-500"/> Комментарий тренера</h4>
                                <textarea
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed italic resize-none h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4"><Button variant="outline" className="flex-1 gap-2 h-14 rounded-2xl" onClick={() => window.print()}><Printer size={18}/> Печать</Button><Button className="flex-1 gap-2 h-14 rounded-2xl" onClick={() => alert('PDF файл сформирован')}><Download size={18}/> Скачать PDF</Button></div>
                    </div>
                )}
            </Modal>

            {/* FULLY RESTORED BOOKING MODAL WITH PAYMENT LOGIC */}
            <Modal isOpen={showBookLessonModal} onClose={() => { setShowBookLessonModal(false); setBookingStudentId(''); }} title="Записать на тренировку" maxWidth="max-w-3xl">
                <div className="space-y-8 py-2">
                    <div className="bg-[#0f172a] p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
                        <div className="relative z-10"><div className="text-xs font-black text-lime-400 uppercase tracking-[0.3em] mb-2">{selectedSlot ? `${new Date(selectedSlot.date).toLocaleDateString('ru', {weekday: 'short', day: 'numeric', month: 'short'})}` : ''} • {selectedSlot?.time}</div><div className="text-3xl font-black italic uppercase tracking-tighter text-glow">Бронирование и оплата</div></div>
                    </div>
                    
                    <div className="space-y-8">
                        {/* 1. STUDENT SELECTION */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">1. Выберите ученика</label>
                            {!bookingStudentId ? (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="relative"><Search className="absolute left-4 top-3.5 text-slate-300" size={18}/><input className="w-full bg-slate-50 border border-slate-100 rounded-[20px] pl-12 pr-4 py-3.5 outline-none font-bold text-sm" placeholder="Поиск по базе..." value={bookingSearch} onChange={e => setBookingSearch(e.target.value)}/></div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                        {students.filter(s => s.name.toLowerCase().includes(bookingSearch.toLowerCase())).map(s => (
                                            <button key={s.id} onClick={() => setBookingStudentId(s.id)} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-lime-400 transition-all group"><div className="flex items-center gap-4 text-left"><img src={s.avatar} className="w-10 h-10 rounded-xl object-cover" /><div><div className="font-black text-indigo-900 text-lg">{s.name}</div><div className="text-[9px] font-black text-indigo-400 uppercase">Баланс: {s.balance.toLocaleString()} ₽</div></div></div><ChevronRight size={18} className="text-slate-200 group-hover:text-lime-500 transition-all"/></button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-5 p-5 bg-indigo-50 border-2 border-indigo-200 rounded-[30px]"><img src={students.find(s => s.id === bookingStudentId)?.avatar} className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-white" /><div className="flex-1"><div className="font-black text-indigo-900 text-lg">{students.find(s => s.id === bookingStudentId)?.name}</div><div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Ученик выбран</div></div><button onClick={() => setBookingStudentId('')} className="bg-white p-2 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={20}/></button></div>
                            )}
                        </div>

                        {/* 2. PAYMENT DETAILS & EQUIPMENT */}
                        {bookingStudentId && (
                            <div className="space-y-6 animate-fade-in-up">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">2. Параметры оплаты</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-2 text-slate-500"><MapPin size={14}/><span className="text-[10px] font-black uppercase">Аренда корта</span></div>
                                        <input type="number" className="w-full bg-white border-none rounded-2xl px-4 py-3 outline-none font-black text-lg shadow-sm" value={courtRentPrice} onChange={e => setCourtRentPrice(Number(e.target.value))} />
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-2 text-slate-500"><UserIcon size={14}/><span className="text-[10px] font-black uppercase">Стоимость урока</span></div>
                                        <input type="number" className="w-full bg-white border-none rounded-2xl px-4 py-3 outline-none font-black text-lg shadow-sm" value={lessonPrice} onChange={e => setLessonPrice(Number(e.target.value))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setUseCannon(!useCannon)}
                                        className={`flex items-center justify-between p-5 rounded-[28px] border-2 transition-all ${useCannon ? 'bg-orange-50 border-orange-400 shadow-md' : 'bg-white border-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${useCannon ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-400'}`}><Dribbble size={20}/></div>
                                            <div className="text-left">
                                                <div className="font-black text-slate-900 text-sm">Теннисная пушка</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">+{CANNON_PRICE} ₽</div>
                                            </div>
                                        </div>
                                        {useCannon ? <CheckCircle2 className="text-orange-500" size={24}/> : <Circle className="text-slate-200" size={24}/>}
                                    </button>

                                    <button 
                                        onClick={() => setUseRacketRental(!useRacketRental)}
                                        className={`flex items-center justify-between p-5 rounded-[28px] border-2 transition-all ${useRacketRental ? 'bg-sky-50 border-sky-400 shadow-md' : 'bg-white border-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${useRacketRental ? 'bg-sky-400 text-white' : 'bg-slate-100 text-slate-400'}`}><Layers size={20}/></div>
                                            <div className="text-left">
                                                <div className="font-black text-slate-900 text-sm">Аренда ракетки</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">+{RACKET_RENTAL_PRICE} ₽</div>
                                            </div>
                                        </div>
                                        {useRacketRental ? <CheckCircle2 className="text-sky-500" size={24}/> : <Circle className="text-slate-200" size={24}/>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. RECURRENCE SETTINGS */}
                        {bookingStudentId && (
                            <div className="space-y-4 animate-fade-in-up">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">3. Повторение</label>
                                <button 
                                    onClick={() => setIsRecurring(!isRecurring)}
                                    className={`w-full flex items-center justify-between p-5 rounded-[28px] border-2 transition-all ${isRecurring ? 'bg-indigo-50 border-indigo-400 shadow-md' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${isRecurring ? 'bg-indigo-400 text-white' : 'bg-slate-100 text-slate-400'}`}><RefreshCw size={20}/></div>
                                        <div className="text-left">
                                            <div className="font-black text-slate-900 text-sm">Повторять тренировку</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Создать серию уроков</div>
                                        </div>
                                    </div>
                                    {isRecurring ? <CheckCircle2 className="text-indigo-500" size={24}/> : <Circle className="text-slate-200" size={24}/>}
                                </button>

                                {isRecurring && (
                                    <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-4 animate-fade-in-up">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Дни недели</label>
                                            <div className="grid grid-cols-7 gap-2 mt-2">
                                                {DAYS_SHORT.map((day, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setRecurringDays(prev => ({...prev, [index]: !prev[index]}))}
                                                        className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${recurringDays[index] ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border'}`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Закончить</label>
                                            <input 
                                                type="date" 
                                                value={recurringEndDate}
                                                onChange={e => setRecurringEndDate(e.target.value)}
                                                className="w-full mt-2 bg-white border-none rounded-2xl px-4 py-3 outline-none font-bold text-sm shadow-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. TOTAL & CONFIRM */}
                        <div className="p-8 bg-[#0f172a] rounded-[45px] text-white flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><DollarSign size={100}/></div>
                            <div className="text-center sm:text-left relative z-10">
                                <div className="text-[10px] font-black text-lime-400 uppercase tracking-[0.2em] mb-1">Итого к списанию (+20 XP)</div>
                                <div className="text-5xl font-black tracking-tighter text-white">{currentBookingTotal.toLocaleString()} ₽</div>
                            </div>
                            <button 
                                onClick={handleBookLesson} 
                                disabled={isSubmitting || !bookingStudentId} 
                                className="h-20 px-14 bg-lime-400 text-slate-900 rounded-[28px] font-black uppercase tracking-[0.2em] text-sm shadow-[0_20px_40px_rgba(163,230,53,0.3)] hover:bg-white transition-all active:scale-95 disabled:opacity-30 relative z-10"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin"/> : 'Подтвердить'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showAddStudentModal} onClose={() => setShowAddStudentModal(false)} title="Новая анкета ученика">
                <form onSubmit={handleAddStudent} className="space-y-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200"><button type="button" onClick={() => setNewStudent({...newStudent, isPro: false})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!newStudent.isPro ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Любитель</button><button type="button" onClick={() => setNewStudent({...newStudent, isPro: true})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newStudent.isPro ? 'bg-amber-400 text-slate-900 shadow-md' : 'text-slate-500'}`}>PRO (РТТ)</button></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ФИО Ученика</label><input required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold shadow-inner" placeholder="Напр: Михаил Сафонов" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} /></div>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[25px] font-black shadow-2xl uppercase tracking-widest text-xs">{isSubmitting ? <Loader2 className="animate-spin"/> : 'Создать карточку'}</Button>
                </form>
            </Modal>

            {/* VIDEO VIEWER MODAL */}
            <Modal isOpen={showVideoModal} onClose={() => { setShowVideoModal(false); setSelectedVideo(null); }} title={selectedVideo?.title || 'Просмотр видео'} maxWidth="max-w-4xl">
                {selectedVideo && (
                    <div className="space-y-4">
                        <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden">
                            {selectedVideo.url ? (
                                <video controls className="w-full h-full" src={selectedVideo.url}>
                                    Ваш браузер не поддерживает воспроизведение видео.
                                </video>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
                                        <p className="text-lg font-bold">Видео недоступно</p>
                                        <p className="text-sm text-slate-400 mt-2">Файл не был загружен на сервер</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <p className="font-bold text-slate-900">{selectedVideo.title}</p>
                                <p className="text-xs text-slate-500 mt-1">Дата: {selectedVideo.date}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    if (window.confirm('Вы уверены, что хотите удалить это видео?')) {
                                        handleDeleteVideo(selectedVideo.id);
                                        setShowVideoModal(false);
                                        setSelectedVideo(null);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors"
                            >
                                <Trash2 size={16} />
                                Удалить
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* DELETE LESSON CONFIRMATION MODAL */}
            <Modal isOpen={!!lessonToDelete} onClose={() => setLessonToDelete(null)} title="">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Удалить тренировку?</h3>
                    <p className="text-slate-600 mb-8">Это действие нельзя будет отменить</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setLessonToDelete(null)}
                            className="px-8 py-3 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={confirmDeleteLesson}
                            className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors"
                        >
                            Удалить
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
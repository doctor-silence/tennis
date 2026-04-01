import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    CircleDollarSign,
    ClipboardList,
    Download,
    FilePenLine,
    FileText,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Trophy,
    Upload,
    Users,
    XCircle
} from 'lucide-react';
import { Tournament, TournamentApplication, TournamentRegulationFile, User } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';

type DirectorTournamentForm = {
    id?: string;
    name: string;
    start_date: string;
    end_date: string;
    director_name: string;
    director_phone: string;
    director_email: string;
    director_telegram: string;
    director_max: string;
    prize_pool: string;
    entry_fee: string;
    club_name: string;
    court_name: string;
    address: string;
    surface: string;
    category: string;
    gender: 'Мужской' | 'Женский' | 'Смешанный';
    participants_count: string;
    status: 'draft' | 'open' | 'live' | 'finished';
    tournament_type: 'Одиночный' | 'Парный';
    match_format: string;
    hasExistingRegulation: boolean;
    regulation_file_name: string;
    removeRegulation: boolean;
};

const surfaceOptions = ['Hard', 'Clay', 'Grass', 'Carpet', 'Indoor Hard'];
const categoryOptions = ['NTRP 2.5', 'NTRP 3.0', 'NTRP 3.5', 'NTRP 4.0', 'NTRP 4.5', 'NTRP 5.0+'];
const genderOptions = ['Мужской', 'Женский', 'Смешанный'] as const;
const statusOptions: Array<{ value: DirectorTournamentForm['status']; label: string }> = [
    { value: 'draft', label: 'Черновик' },
    { value: 'open', label: 'Регистрация открыта' },
    { value: 'live', label: 'Идёт турнир' },
    { value: 'finished', label: 'Завершён' },
];

const createInitialForm = (user: User): DirectorTournamentForm => ({
    name: '',
    start_date: '',
    end_date: '',
    director_name: user.name || '',
    director_phone: '',
    director_email: user.email || '',
    director_telegram: '',
    director_max: '',
    prize_pool: '',
    entry_fee: '',
    club_name: '',
    court_name: '',
    address: '',
    surface: surfaceOptions[0],
    category: categoryOptions[2],
    gender: genderOptions[0],
    participants_count: '16',
    status: 'draft',
    tournament_type: 'Одиночный',
    match_format: 'До 2 побед в сетах',
    hasExistingRegulation: false,
    regulation_file_name: '',
    removeRegulation: false,
});

const normalizeDateInputValue = (value?: string | null) => {
    if (!value) return '';

    const directDateMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (directDateMatch) {
        return directDateMatch[1];
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const mapTournamentToForm = (tournament: Tournament, user: User): DirectorTournamentForm => ({
    id: tournament.id,
    name: tournament.name || '',
    start_date: normalizeDateInputValue(tournament.start_date || tournament.startDate || ''),
    end_date: normalizeDateInputValue(tournament.end_date || tournament.endDate || ''),
    director_name: tournament.director_name || user.name || '',
    director_phone: tournament.director_phone || '',
    director_email: tournament.director_email || user.email || '',
    director_telegram: tournament.director_telegram || '',
    director_max: tournament.director_max || '',
    prize_pool: tournament.prize_pool || tournament.prizePool || '',
    entry_fee: tournament.entry_fee !== null && tournament.entry_fee !== undefined ? String(tournament.entry_fee) : '',
    club_name: tournament.club_name || '',
    court_name: tournament.court_name || '',
    address: tournament.address || '',
    surface: tournament.surface || surfaceOptions[0],
    category: tournament.category || categoryOptions[2],
    gender: tournament.gender || genderOptions[0],
    participants_count: tournament.participants_count !== null && tournament.participants_count !== undefined ? String(tournament.participants_count) : '16',
    status: tournament.status || 'draft',
    tournament_type: (tournament.tournament_type || tournament.tournamentType || 'Одиночный') as 'Одиночный' | 'Парный',
    match_format: tournament.match_format || tournament.matchFormat || 'До 2 побед в сетах',
    hasExistingRegulation: Boolean(tournament.has_regulation),
    regulation_file_name: tournament.regulation_file_name || '',
    removeRegulation: false,
});

const statusStyleMap: Record<DirectorTournamentForm['status'], string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    finished: 'bg-amber-100 text-amber-700 border-amber-200',
};

const formatDisplayDate = (value?: string | null) => {
    if (!value) return '—';

    const directDateMatch = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (directDateMatch) {
        const [year, month, day] = directDateMatch[0].split('-');
        return `${day}.${month}.${year}`;
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('ru-RU');
    }

    return String(value);
};

export const TournamentOrganizationView = ({ user }: { user: User }) => {
    const formRef = useRef<HTMLFormElement | null>(null);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
    const [form, setForm] = useState<DirectorTournamentForm>(() => createInitialForm(user));
    const [regulationFile, setRegulationFile] = useState<TournamentRegulationFile | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [applications, setApplications] = useState<TournamentApplication[]>([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsActionId, setApplicationsActionId] = useState<string | null>(null);
    const [applicationsLoaded, setApplicationsLoaded] = useState(false);

    const activeTournamentsCount = useMemo(
        () => tournaments.filter((tournament) => tournament.status === 'open' || tournament.status === 'live').length,
        [tournaments]
    );

    const selectedTournament = useMemo(
        () => tournaments.find((tournament) => tournament.id === selectedTournamentId) || null,
        [tournaments, selectedTournamentId]
    );

    const loadApplications = useCallback(async (tournamentId: string) => {
        try {
            setApplicationsLoading(true);
            const data = await api.tournamentDirector.getApplications(user.id, tournamentId);
            setApplications(data);
            setApplicationsLoaded(true);
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось загрузить заявки турнира');
        } finally {
            setApplicationsLoading(false);
        }
    }, [user.id]);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const data = await api.tournamentDirector.getAll(user.id);
            setTournaments(data);
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось загрузить турниры директора');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTournaments();
    }, [user.id]);

    useEffect(() => {
        if (!selectedTournamentId) {
            setApplications([]);
            setApplicationsLoaded(false);
            return;
        }

        loadApplications(selectedTournamentId);

        const intervalId = window.setInterval(() => {
            loadApplications(selectedTournamentId);
        }, 10000);

        const handleWindowFocus = () => {
            loadApplications(selectedTournamentId);
        };

        window.addEventListener('focus', handleWindowFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [selectedTournamentId, loadApplications]);

    const pendingApplications = applications.filter((application) => application.status === 'pending');
    const approvedApplications = applications.filter((application) => application.status === 'approved');
    const fallbackPendingCount = selectedTournament?.pending_applications_count || 0;
    const fallbackApprovedCount = selectedTournament?.approved_applications_count || 0;
    const fallbackTotalCount = selectedTournament?.total_applications_count || fallbackPendingCount + fallbackApprovedCount;
    const totalApplicationsCount = applicationsLoaded ? applications.length : fallbackTotalCount;
    const pendingApplicationsCount = applicationsLoaded ? pendingApplications.length : fallbackPendingCount;
    const approvedApplicationsCount = applicationsLoaded ? approvedApplications.length : fallbackApprovedCount;

    const resetForm = () => {
        setSelectedTournamentId(null);
        setRegulationFile(null);
        setApplicationsLoaded(false);
        setForm(createInitialForm(user));
    };

    const updateForm = (field: keyof DirectorTournamentForm, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSelectTournament = (tournament: Tournament) => {
        setSelectedTournamentId(tournament.id);
        setRegulationFile(null);
        setFeedback('');
        setForm(mapTournamentToForm(tournament, user));
    };

    const handleEditTournament = (tournament: Tournament) => {
        handleSelectTournament(tournament);
        window.requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setFeedback('Можно загрузить только PDF-файл');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFeedback('PDF должен быть не больше 5 МБ');
            event.target.value = '';
            return;
        }

        const fileReader = new FileReader();
        fileReader.onload = () => {
            setRegulationFile({
                fileName: file.name,
                dataUrl: String(fileReader.result || ''),
            });
            setForm((current) => ({
                ...current,
                hasExistingRegulation: false,
                regulation_file_name: file.name,
                removeRegulation: false,
            }));
            setFeedback('PDF-регламент готов к сохранению');
        };
        fileReader.readAsDataURL(file);
    };

    const handleRemoveRegulation = () => {
        setRegulationFile(null);
        setForm((current) => ({
            ...current,
            hasExistingRegulation: false,
            regulation_file_name: '',
            removeRegulation: true,
        }));
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setFeedback('');

        const payload = {
            name: form.name,
            start_date: form.start_date,
            end_date: form.end_date,
            director_name: form.director_name,
            director_phone: form.director_phone,
            director_email: form.director_email,
            director_telegram: form.director_telegram,
            director_max: form.director_max,
            prize_pool: form.prize_pool,
            entry_fee: form.entry_fee ? Number(form.entry_fee) : null,
            club_name: form.club_name,
            court_name: form.court_name,
            address: form.address,
            surface: form.surface,
            category: form.category,
            gender: form.gender,
            participants_count: Number(form.participants_count),
            status: form.status,
            tournament_type: form.tournament_type,
            match_format: form.match_format,
            regulationFile,
            removeRegulation: form.removeRegulation,
        };

        try {
            const savedTournament = form.id
                ? await api.tournamentDirector.update(user.id, form.id, payload)
                : await api.tournamentDirector.create(user.id, payload);

            await loadTournaments();
            setSelectedTournamentId(savedTournament.id);
            setForm(mapTournamentToForm(savedTournament, user));
            setRegulationFile(null);
            setFeedback(form.id ? 'Турнир обновлён' : 'Турнир создан');
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось сохранить турнир');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form.id) return;
        if (!window.confirm('Удалить турнир? Действие необратимо.')) return;

        try {
            setDeleting(true);
            setFeedback('');
            await api.tournamentDirector.delete(user.id, form.id);
            await loadTournaments();
            resetForm();
            setFeedback('Турнир удалён');
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось удалить турнир');
        } finally {
            setDeleting(false);
        }
    };

    const handleDownloadRegulation = async (tournamentId: string) => {
        try {
            setDownloadingId(tournamentId);
            const file = await api.tournamentDirector.getRegulation(user.id, tournamentId);
            const link = document.createElement('a');
            link.href = file.dataUrl;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось скачать регламент');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleApplicationStatusChange = async (applicationId: string, status: 'approved' | 'rejected') => {
        try {
            setApplicationsActionId(applicationId);
            await api.tournamentDirector.updateApplicationStatus(user.id, applicationId, status);
            if (selectedTournamentId) {
                await loadApplications(selectedTournamentId);
            }
            await loadTournaments();
            setFeedback(status === 'approved' ? 'Заявка подтверждена' : 'Заявка отклонена');
        } catch (error: any) {
            setFeedback(error.message || 'Не удалось обновить статус заявки');
        } finally {
            setApplicationsActionId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 md:p-7">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">CRM директора турниров</p>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">Организация турнира</h2>
                        <p className="text-slate-500 mt-2 max-w-3xl">
                            Создавайте турнир, ведите контакты директора, храните PDF-регламент и управляйте ключевыми параметрами проведения в одном разделе.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" className="rounded-2xl" onClick={loadTournaments}>
                            <RefreshCw size={16} className="mr-2" /> Обновить
                        </Button>
                        <Button className="rounded-2xl" onClick={resetForm}>
                            <Plus size={16} className="mr-2" /> Новый турнир
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <Trophy className="text-lime-500" size={22} />
                        <span className="text-xs text-slate-400 uppercase font-bold">Всего турниров</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{tournaments.length}</div>
                </div>
                <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <ClipboardList className="text-blue-500" size={22} />
                        <span className="text-xs text-slate-400 uppercase font-bold">Активные</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{activeTournamentsCount}</div>
                </div>
                <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <CircleDollarSign className="text-amber-500" size={22} />
                        <span className="text-xs text-slate-400 uppercase font-bold">Призовой фонд</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                        {tournaments.reduce((sum, tournament) => sum + Number(tournament.prize_pool || tournament.prizePool || 0), 0).toLocaleString('ru-RU')} ₽
                    </div>
                </div>
            </div>

            {feedback && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                    {feedback}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
                <form ref={formRef} onSubmit={handleSave} className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 md:p-7 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Карточка турнира</p>
                            <h3 className="text-xl font-black text-slate-900 mt-2">{form.id ? 'Редактирование турнира' : 'Создание турнира'}</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                {form.id ? 'Измените поля и сохраните обновлённую карточку турнира.' : 'Заполните данные турнира, чтобы опубликовать новое событие.'}
                            </p>
                        </div>
                        {form.id && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusStyleMap[form.status]}`}>
                                {statusOptions.find((status) => status.value === form.status)?.label}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Название турнира</span>
                            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="Например, Summer Open 2026" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Дата начала</span>
                            <input type="date" value={form.start_date} onChange={(event) => updateForm('start_date', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Дата окончания</span>
                            <input type="date" value={form.end_date} onChange={(event) => updateForm('end_date', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" required />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-2xl">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Директор турнира</span>
                            <input value={form.director_name} onChange={(event) => updateForm('director_name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Телефон</span>
                            <input value={form.director_phone} onChange={(event) => updateForm('director_phone', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="+7 999 000-00-00" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Email</span>
                            <input type="email" value={form.director_email} onChange={(event) => updateForm('director_email', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Telegram</span>
                            <input value={form.director_telegram} onChange={(event) => updateForm('director_telegram', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="@director" />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">MAX</span>
                            <input value={form.director_max} onChange={(event) => updateForm('director_max', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="director.max" />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Призовой фонд, ₽</span>
                            <input type="number" min="0" value={form.prize_pool} onChange={(event) => updateForm('prize_pool', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="500000" />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Вступительный взнос, ₽</span>
                            <input type="number" min="0" value={form.entry_fee} onChange={(event) => updateForm('entry_fee', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="3500" />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Теннисный клуб</span>
                            <input value={form.club_name} onChange={(event) => updateForm('club_name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="Tennis Club Arena" required />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Корт / площадка</span>
                            <input value={form.court_name} onChange={(event) => updateForm('court_name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="Центральный корт" />
                        </label>
                    </div>

                    <label className="space-y-2 block">
                        <span className="text-xs font-bold uppercase text-slate-500">Адрес проведения</span>
                        <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="г. Москва, ул. Лужники, 24, стр. 5" />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Покрытие</span>
                            <select value={form.surface} onChange={(event) => updateForm('surface', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400">
                                {surfaceOptions.map((surface) => <option key={surface} value={surface}>{surface}</option>)}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Категория NTRP</span>
                            <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400">
                                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Пол</span>
                            <select value={form.gender} onChange={(event) => updateForm('gender', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400">
                                {genderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Участников</span>
                            <input type="number" min="2" value={form.participants_count} onChange={(event) => updateForm('participants_count', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Статус</span>
                            <select value={form.status} onChange={(event) => updateForm('status', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400">
                                {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Тип турнира</span>
                            <select value={form.tournament_type} onChange={(event) => updateForm('tournament_type', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400">
                                <option value="Одиночный">Одиночный</option>
                                <option value="Парный">Парный</option>
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Формат матчей</span>
                            <input value={form.match_format} onChange={(event) => updateForm('match_format', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-lime-400" placeholder="Тай-брейк в третьем сете" />
                        </label>
                    </div>

                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900">Регламент турнира</p>
                                <p className="text-xs text-slate-500 mt-1">Загрузите PDF до 5 МБ. Файл сохраняется в CRM и доступен для скачивания.</p>
                            </div>
                            <label className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-slate-800 transition-colors">
                                <Upload size={16} className="mr-2" /> Загрузить PDF
                                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                            </label>
                        </div>

                        {(regulationFile || form.hasExistingRegulation || form.regulation_file_name) && (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="text-red-500 shrink-0" size={20} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{regulationFile?.fileName || form.regulation_file_name}</p>
                                        <p className="text-xs text-slate-500">{regulationFile ? 'Новый файл будет загружен после сохранения' : 'Файл уже прикреплён к турниру'}</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" className="rounded-2xl" onClick={handleRemoveRegulation}>
                                    <Trash2 size={16} className="mr-2" /> Удалить PDF
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button type="submit" className="rounded-2xl sm:flex-1" disabled={saving}>
                            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                            {form.id ? 'Сохранить изменения' : 'Создать турнир'}
                        </Button>
                        {form.id && (
                            <Button type="button" variant="outline" className="rounded-2xl" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
                                Удалить
                            </Button>
                        )}
                    </div>
                </form>

                <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 md:p-7 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Портфель турниров</p>
                            <h3 className="text-xl font-black text-slate-900 mt-2">Ваши события</h3>
                            <p className="text-sm text-slate-500 mt-2">Откройте карточку турнира и нажмите `Редактировать`, чтобы загрузить его в форму слева.</p>
                        </div>
                        {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
                    </div>

                    <div className="space-y-3 max-h-[980px] overflow-y-auto pr-1">
                        {!loading && tournaments.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                                Пока нет турниров. Создайте первый турнир в CRM справа.
                            </div>
                        )}

                        {tournaments.map((tournament) => {
                            const isSelected = selectedTournamentId === tournament.id;
                            const approvedParticipantsCount = tournament.approved_applications_count || 0;
                            const participantLimit = tournament.participants_count || 0;
                            return (
                                <div
                                    key={tournament.id}
                                    className={`rounded-[24px] border p-4 transition-all cursor-pointer ${isSelected ? 'border-lime-400 bg-lime-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                    onClick={() => handleSelectTournament(tournament)}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900">{tournament.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{tournament.club_name || 'Клуб не указан'}{tournament.court_name ? ` · ${tournament.court_name}` : ''}</p>
                                                {tournament.address && <p className="text-xs text-slate-500 mt-1">{tournament.address}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${statusStyleMap[(tournament.status || 'draft') as DirectorTournamentForm['status']]}`}>
                                                    {statusOptions.find((status) => status.value === (tournament.status || 'draft'))?.label || tournament.status}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant={isSelected ? 'primary' : 'secondary'}
                                                    className="rounded-2xl px-3 py-2 text-xs"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleEditTournament(tournament);
                                                    }}
                                                >
                                                    <FilePenLine size={14} className="mr-1.5" />
                                                    {isSelected ? 'Редактируется' : 'Редактировать'}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-2"><CalendarDays size={16} className="text-slate-400" /> {formatDisplayDate(tournament.start_date || tournament.startDate)} — {formatDisplayDate(tournament.end_date || tournament.endDate)}</div>
                                            <div className="flex items-center gap-2"><Users size={16} className="text-slate-400" /> {approvedParticipantsCount}/{participantLimit} участников</div>
                                            <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {tournament.surface || 'Покрытие не указано'}</div>
                                            <div className="flex items-center gap-2"><CircleDollarSign size={16} className="text-slate-400" /> Взнос {Number(tournament.entry_fee || 0).toLocaleString('ru-RU')} ₽</div>
                                            <div className="flex items-center gap-2"><Phone size={16} className="text-slate-400" /> {tournament.director_phone || 'Телефон не указан'}</div>
                                            <div className="flex items-center gap-2"><Mail size={16} className="text-slate-400" /> {tournament.director_email || 'Email не указан'}</div>
                                            <div className="flex items-center gap-2"><MessageCircle size={16} className="text-slate-400" /> Telegram: {tournament.director_telegram || 'не указан'}</div>
                                            <div className="flex items-center gap-2"><MessageCircle size={16} className="text-slate-400" /> MAX: {tournament.director_max || 'не указан'}</div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{tournament.category || 'Без категории'}</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{tournament.gender || 'Пол не указан'}</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Призовой фонд {Number(tournament.prize_pool || tournament.prizePool || 0).toLocaleString('ru-RU')} ₽</span>
                                            {tournament.has_regulation && (
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleDownloadRegulation(tournament.id);
                                                    }}
                                                    disabled={downloadingId === tournament.id}
                                                >
                                                    {downloadingId === tournament.id ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Download size={12} className="mr-1.5" />}
                                                    {tournament.regulation_file_name || 'Скачать регламент'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Участники и заявки</p>
                                <h3 className="text-lg font-black text-slate-900 mt-1">CRM по выбранному турниру</h3>
                            </div>
                            {applicationsLoading && <Loader2 className="animate-spin text-slate-400" size={18} />}
                        </div>

                        {!selectedTournamentId ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                Выберите турнир справа, чтобы управлять входящими заявками и участниками.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 min-h-[112px] flex flex-col justify-between">
                                        <div className="text-[11px] sm:text-xs uppercase font-bold leading-tight text-slate-400 break-words [overflow-wrap:anywhere]">Всего заявок</div>
                                        <div className="text-2xl font-black text-slate-900 mt-2">{totalApplicationsCount}</div>
                                    </div>
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:p-4 min-h-[112px] flex flex-col justify-between">
                                        <div className="text-[11px] sm:text-xs uppercase font-bold leading-tight text-blue-500 break-words [overflow-wrap:anywhere]">Ожидают решения</div>
                                        <div className="text-2xl font-black text-blue-900 mt-2">{pendingApplicationsCount}</div>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 min-h-[112px] flex flex-col justify-between">
                                        <div className="text-[11px] sm:text-xs uppercase font-bold leading-tight text-emerald-500 break-words [overflow-wrap:anywhere]">Подтверждены</div>
                                        <div className="text-2xl font-black text-emerald-900 mt-2">{approvedApplicationsCount}</div>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                        <h4 className="text-sm font-black text-slate-900">Новые заявки</h4>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {pendingApplications.length === 0 && (
                                            <div className="px-4 py-5 text-sm text-slate-500">Новых заявок пока нет.</div>
                                        )}
                                        {pendingApplications.map((application) => (
                                            <div key={application.id} className="px-4 py-4 flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-bold text-slate-900">{application.user_name || 'Игрок'}</div>
                                                        <div className="text-sm text-slate-500">{application.user_level || 'Уровень не указан'}</div>
                                                    </div>
                                                    <div className="text-xs text-slate-400">{formatDisplayDate(application.created_at)}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        className="rounded-2xl"
                                                        onClick={() => handleApplicationStatusChange(application.id, 'approved')}
                                                        disabled={applicationsActionId === application.id}
                                                    >
                                                        {applicationsActionId === application.id ? <Loader2 size={14} className="mr-2 animate-spin" /> : <CheckCircle2 size={14} className="mr-2" />}
                                                        Подтвердить
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="rounded-2xl"
                                                        onClick={() => handleApplicationStatusChange(application.id, 'rejected')}
                                                        disabled={applicationsActionId === application.id}
                                                    >
                                                        <XCircle size={14} className="mr-2" /> Отклонить
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                        <h4 className="text-sm font-black text-slate-900">Подтверждённые участники</h4>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {approvedApplications.length === 0 && (
                                            <div className="px-4 py-5 text-sm text-slate-500">Пока нет подтверждённых участников.</div>
                                        )}
                                        {approvedApplications.map((application) => (
                                            <div key={application.id} className="px-4 py-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-bold text-slate-900">{application.user_name || 'Игрок'}</div>
                                                    <div className="text-sm text-slate-500">{application.user_level || 'Уровень не указан'}</div>
                                                </div>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    Подтверждён
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentOrganizationView;

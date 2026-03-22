
import React, { useEffect, useState } from 'react';
import { 
  MapPin, CheckCircle2, Activity, Zap, Trophy, Calendar, 
    Loader2, Upload
} from 'lucide-react';
import { User, Match, Tournament } from '../../types';
import Button from '../Button';
import { StatCard, Modal } from '../Shared';
import { api, API_URL } from '../../services/api';

const trainings = [
    {
        title: "Стабильность подачи падает",
        description: "В последних 3 матчах процент первой подачи снизился на 12%. Рекомендую тренировку 'Точность подачи'.",
        modalTitle: "Тренировка: Точность подачи",
        goal: "Увеличить процент попадания первой подачи в квадрат.",
        inventory: "Корзина мячей (30-50 шт), конусы или мишени.",
        steps: [
            { title: "Разминка (5 мин)", description: "Имитация движения подачи без мяча. Плавность ритма." },
            { title: "Подача по зонам (15 мин)", description: "Поставьте мишени по углам квадрата подачи. Выполните 10 подач в каждую зону (T и широкая)." },
            { title: "Игра на счет (10 мин)", description: "Подавайте вторую подачу с вращением (кик или слайс). Задача: не сделать ни одной двойной ошибки за серию из 20 мячей." }
        ]
    },
    {
        title: "Улучшение игры у сетки",
        description: "Ваш процент выигранных очков у сетки ниже среднего. Пора поработать над этим!",
        modalTitle: "Тренировка: Игра у сетки",
        goal: "Уверенно завершать розыгрыши у сетки.",
        inventory: "Корзина мячей, партнер или стенка.",
        steps: [
            { title: "Разминка (5 мин)", description: "Короткие удары с лета с партнером." },
            { title: "Реакция и техника (15 мин)", description: "Партнер накидывает мячи в разные стороны, вы должны успеть среагировать и сыграть с лета." },
            { title: "Смэш (10 мин)", description: "Отработка удара над головой. Партнер накидывает 'свечки'." }
        ]
    },
    {
        title: "Выносливость и передвижение",
        description: "В затяжных розыгрышах вы часто ошибаетесь. Давайте повысим выносливость.",
        modalTitle: "Тренировка: Выносливость",
        goal: "Поддерживать высокий темп игры в течение всего матча.",
        inventory: "Конусы, скакалка.",
        steps: [
            { title: "Разминка (5 мин)", description: "Прыжки на скакалке, легкий бег." },
            { title: "Челночный бег (15 мин)", description: "Расставьте конусы по корту и выполняйте челночный бег между ними." },
            { title: "Имитация розыгрышей (10 мин)", description: "Имитируйте передвижение по корту во время длинных розыгрышей." }
        ]
    }
];

interface ProfileViewProps {
  user: User;
  onUserUpdate: (data: Partial<User>) => void;
}

// Виджет ближайших турниров по округу с rttstat.ru
const NearbyTournamentsWidget: React.FC<{ userId: string; city: string }> = ({ userId, city }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtName, setDistrictName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/rtt/nearby-tournaments/${userId}`);
        const data = await res.json();
        if (data.success) {
          setTournaments(data.tournaments || []);
          // Определяем название округа из первого турнира или по городу
          if (data.district) {
            const names: Record<string, string> = {
              '2': 'Центральный ФО', '374': 'Северо-Западный ФО', '834': 'Приволжский ФО',
              '1237': 'Сибирский ФО', '1090': 'Уральский ФО', '593': 'Южный ФО',
              '755': 'Северо-Кавказский ФО', '1419': 'Дальневосточный ФО'
            };
            setDistrictName(names[data.district] || '');
          }
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" size={20}/></div>;

  if (!tournaments.length) return (
    <p className="text-slate-400 text-sm py-2 text-center">Турниры в вашем округе не найдены</p>
  );

  return (
    <div className="space-y-2">
      {districtName && <p className="text-xs text-slate-400 mb-3">{districtName} • топ-10 ближайших</p>}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {tournaments.map((t: any, i: number) => (
          <a
            key={i}
            href={t.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-colors group cursor-pointer"
          >
            <div className="flex-shrink-0 w-10 text-center">
              <div className="text-xs font-bold text-amber-600 leading-tight">{t.startDate?.slice(0,5) || '—'}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900 group-hover:text-amber-700 leading-snug">{t.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{[t.city, t.ageGroup, t.category].filter(Boolean).join(' · ')}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// Виджет матчей РТТ с rttstat.ru
const RttMatchesWidget: React.FC<{ matches: any[]; loading: boolean; error: string | null }> = ({ matches, loading, error }) => {
  if (loading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-300" /></div>;
  if (error) return <p className="text-slate-400 text-sm py-2">{error}</p>;
    if (!matches.length) return <p className="text-slate-400 text-sm py-2">Матчи на rttstat.ru не найдены.</p>;

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {matches.map((m: any, i: number) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${m.result === 'win' ? 'bg-lime-500' : 'bg-red-400'}`} />
          <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">vs. {m.opponentName || m.opponent}</div>
            <div className="text-xs text-slate-400 truncate">{m.tournament || '—'} • {m.date}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-sm">{m.score || '—'}</div>
            <div className={`text-xs font-bold ${m.result === 'win' ? 'text-lime-600' : 'text-red-500'}`}>
              {m.result === 'win' ? 'Победа' : 'Поражение'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdate }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTournamentsModal, setShowTournamentsModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [rttMatches, setRttMatches] = useState<Match[]>([]);
  const [loadingRttMatches, setLoadingRttMatches] = useState(false);
  const [rttMatchesError, setRttMatchesError] = useState<string | null>(null);
  const [syncingRtt, setSyncingRtt] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const isRttProfile = Boolean(user.rni);
  const profileMatchesCount = isRttProfile
      ? (loadingRttMatches || rttMatchesError ? '—' : rttMatches.length)
      : matches.length;
  const profileWinsCount = isRttProfile
      ? (loadingRttMatches || rttMatchesError ? '—' : rttMatches.filter(match => match.result === 'win').length)
      : matches.filter(match => match.result === 'win').length;

  const handleRttSync = async () => {
      setSyncingRtt(true);
      setSyncResult(null);
      try {
          const data = await api.rttSyncMatches(user.id);
          setSyncResult(data.added > 0 ? `Добавлено ${data.added} матчей из РТТ` : 'Новых матчей нет');
          const updated = await api.matches.getAll(user.id);
          setMatches(updated);

          if (user.rni) {
              const rttData = await api.rtt.getPlayerStats(user.rni);
              if (rttData.success && Array.isArray(rttData.data?.matches)) {
                  const mappedMatches: Match[] = rttData.data.matches.map((match: any, index: number) => ({
                      id: `rtt-${user.id}-${index}`,
                      userId: String(user.id),
                      opponentName: match.opponent || 'Неизвестный соперник',
                      score: match.score || '—',
                      date: match.date,
                      result: match.result === 'win' ? 'win' : 'loss',
                      surface: 'hard'
                  }));
                  setRttMatches(mappedMatches);
                  setRttMatchesError(null);
              }
          }
      } catch (e: any) {
          setSyncResult(e.message || 'Ошибка синхронизации');
      } finally {
          setSyncingRtt(false);
          setTimeout(() => setSyncResult(null), 4000);
      }
  };
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [nearestTournament, setNearestTournament] = useState<Tournament | null>(null);

  const [editFormData, setEditFormData] = useState({
      name: user.name,
      city: user.city,
      level: user.level || '',
      age: user.age || 0,
      avatar: user.avatar || ''
  });

  useEffect(() => {
    const fetchTournaments = async () => {
        try {
            const allTournaments = await api.tournaments.getAll(user.id);
            setTournaments(allTournaments);

            const upcomingTournaments = allTournaments.filter(t => new Date(t.start_date) > new Date());
            if (upcomingTournaments.length > 0) {
                upcomingTournaments.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
                setNearestTournament(upcomingTournaments[0]);
            }
        } catch (error) {
            console.error("Failed to fetch tournaments", error);
        }
    };
    fetchTournaments();
  }, [user.id]);

  useEffect(() => {
      setEditFormData({
          name: user.name,
          city: user.city,
          level: user.level || '',
          age: user.age || 0,
          avatar: user.avatar || ''
      });
  }, [user]);

  useEffect(() => {
      const fetchMatches = async () => {
          try {
              const data = await api.matches.getAll(String(user.id));
              setMatches(data);
          } catch(e) {
              console.error(e);
          }
      };
      fetchMatches();
  }, [user.id]);

  useEffect(() => {
      const fetchRttMatches = async () => {
          if (!user.rni) {
              setRttMatches([]);
              setRttMatchesError(null);
              setLoadingRttMatches(false);
              return;
          }

          setLoadingRttMatches(true);
          setRttMatchesError(null);

          try {
              const data = await api.rtt.getPlayerStats(user.rni);
              if (data.success && Array.isArray(data.data?.matches)) {
                  const mappedMatches: Match[] = data.data.matches.map((match: any, index: number) => ({
                      id: `rtt-${user.id}-${index}`,
                      userId: String(user.id),
                      opponentName: match.opponent || 'Неизвестный соперник',
                      score: match.score || '—',
                      date: match.date,
                      result: match.result === 'win' ? 'win' : 'loss',
                      surface: 'hard'
                  }));
                  setRttMatches(mappedMatches);
              } else {
                  setRttMatches([]);
                  setRttMatchesError(data.error || 'Нет данных');
              }
          } catch (error) {
              console.error(error);
              setRttMatches([]);
              setRttMatchesError('Ошибка загрузки');
          } finally {
              setLoadingRttMatches(false);
          }
      };

      fetchRttMatches();
  }, [user.id, user.rni]);

  const handleSaveProfile = async () => {
      try {
          await api.updateProfile(user.id, editFormData);
          onUserUpdate(editFormData);
          setShowEditModal(false);
      } catch (e) {
          alert('Ошибка при обновлении профиля');
      }
  };

  const handleCompleteTraining = async () => {
      const xpReward = 10;
      const currentXp = user.xp || 0;
      const newXp = currentXp + xpReward;

      onUserUpdate({ xp: newXp });
      
      setIsTrainingCompleted(true);
      setCurrentTrainingIndex((prevIndex) => (prevIndex + 1) % trainings.length);

      try {
          await api.updateProfile(user.id, { xp: newXp });
      } catch (e) {
          console.error("Failed to save XP", e);
      }
  };

  const resetTrainingModal = () => {
      setShowTrainingModal(false);
      setTimeout(() => setIsTrainingCompleted(false), 500);
  };

  const currentTraining = trainings[currentTrainingIndex];
  
    const formatDate = (isoDate: string | undefined) => {
        if (!isoDate) return { month: '', day: '', dayOfWeek: '' };
        try {
            const date = new Date(isoDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleString('ru-RU', { month: 'short' }).toUpperCase().replace('.', '');
            const dayOfWeek = date.toLocaleString('ru-RU', { weekday: 'long' });
            return { month, day, dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1) };
        } catch (e) {
            return { month: 'ERR', day: '00', dayOfWeek: 'Error' };
        }
    };
    return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-28 bg-slate-900 w-full relative">
             <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
                 <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-lime-400/20 rounded-full blur-[60px]"></div>
             </div>
          </div>
          
          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
               <div className="flex items-end justify-between -mt-12 mb-4">
                   <div className="relative flex-shrink-0">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-md bg-slate-100" />
                   </div>
                   <div className="mb-1">
                       <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>Редактировать</Button>
                   </div>
               </div>
               <div className="flex flex-col relative z-10">
                   
                   <div className="flex-1 w-full sm:pt-0">
                       <div className="flex items-start justify-between gap-4">
                           <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2 mb-1 flex-wrap">
                                 <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{user.name}</h2>
                                 {(user.role === 'rtt_pro' || user.role === 'coach') && <CheckCircle2 className="text-blue-500 fill-blue-100 flex-shrink-0" size={24} />}
                               </div>
                               <p className="text-slate-500 font-medium flex items-center gap-2"><MapPin size={16}/> {user.city}</p>
                           </div>
                       </div>
                       <div className="mt-2 flex items-center flex-wrap gap-3">
                           <span className="bg-lime-100 text-lime-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-lime-200">
                               {user.role === 'coach' ? 'Тренер' : user.role === 'rtt_pro' ? 'Игрок РТТ' : 'Любитель'}
                           </span>
                           
                           {(user.rating || user.level) && (
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                                    <Activity size={12}/>
                                    {user.role === 'rtt_pro' ? `${user.rating} очков` : user.level}
                                </span>
                           )}

                           <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 animate-fade-in-up">
                               <Zap size={12} className="fill-amber-500 text-amber-500"/> 
                               {user.xp || 0} XP
                           </span>
                       </div>
                   </div>
               </div>
  
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                <StatCard label="NTRP / РТТ" value={user.level || user.rating || "N/A"} icon={<Activity className="text-lime-600" />} />
                                <StatCard label="Матчей" value={profileMatchesCount} icon={<Trophy className="text-blue-500" />} />
                                <StatCard label="Побед" value={profileWinsCount} icon={<Zap className="text-amber-500" />} />
                <StatCard label="Возраст" value={user.age || "N/A"} icon={<Calendar className="text-purple-500" />} />
              </div>
          </div>
        </div>
        
        {/* RTT Matches Widget — только для игроков с RНИ */}
        {user.rni && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-lime-600">⚡</span> Матчи РТТ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">РНИ: {user.rni}</p>
              </div>
              <div className="flex items-center gap-2">
                {syncResult && <span className="text-xs text-slate-500">{syncResult}</span>}
                <button
                  onClick={handleRttSync}
                  disabled={syncingRtt}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-lime-50 border border-lime-200 text-lime-700 hover:bg-lime-100 transition-colors disabled:opacity-50"
                >
                  {syncingRtt ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
                  {syncingRtt ? 'Загрузка...' : 'Синх. РТТ'}
                </button>
              </div>
            </div>
                        <RttMatchesWidget matches={rttMatches} loading={loadingRttMatches} error={rttMatchesError} />
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="bg-lime-400 rounded-3xl p-6 relative overflow-hidden text-slate-900">
           <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2 font-bold uppercase text-xs tracking-wider opacity-70">
                   <Zap size={14}/> AI Coach Insight
               </div>
               <h3 className="font-bold text-xl mb-2">{currentTraining.title}</h3>
               <p className="text-sm font-medium opacity-80 mb-4">
                   {currentTraining.description}
               </p>
               <Button 
                   variant="glass" 
                   size="sm" 
                   className="bg-slate-900/10 text-slate-900 border-slate-900/20 hover:bg-slate-900 hover:text-white"
                   onClick={() => setShowTrainingModal(true)}
               >
                   Открыть тренировку
               </Button>
           </div>
           <Zap className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 text-white rotate-12" />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={18}/> Ближайшие турниры</h3>
            <NearbyTournamentsWidget userId={user.id} city={user.city} />
        </div>
      </div>
    </div>
    <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Редактировать профиль">
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Фото профиля</label>
                <div className="flex gap-4 items-center">
                    <div className="relative">
                        <img 
                            src={editFormData.avatar || `https://ui-avatars.com/api/?name=${editFormData.name}`} 
                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm" 
                            alt="Preview"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${editFormData.name}`; }}
                        />
                    </div>
                    <div className="flex-1">
                        <input 
                            type="file" 
                            id="avatar-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 5000000) {
                                        alert('Файл слишком большой (макс. 5MB)');
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setEditFormData({...editFormData, avatar: reader.result as string});
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <label 
                            htmlFor="avatar-upload" 
                            className="inline-flex items-center gap-2 cursor-pointer bg-white border border-slate-200 hover:border-lime-400 text-slate-600 hover:text-lime-600 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                        >
                            <Upload size={16}/> Загрузить фото
                        </label>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Имя Фамилия</label>
                <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                    value={editFormData.name} 
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Город</label>
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={editFormData.city} 
                        onChange={e => setEditFormData({...editFormData, city: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Возраст</label>
                    <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={editFormData.age ?? ''}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setEditFormData({...editFormData, age: val === '' ? undefined : parseInt(val)});
                        }}
                    />
                </div>
            </div>
            
            {user.role === 'amateur' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Уровень игры (NTRP)</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={editFormData.level} 
                        onChange={e => setEditFormData({...editFormData, level: e.target.value})}
                    >
                        <option value="NTRP 2.0">NTRP 2.0 (Новичок)</option>
                        <option value="NTRP 3.0">NTRP 3.0 (Начальный)</option>
                        <option value="NTRP 3.5">NTRP 3.5 (Средний)</option>
                        <option value="NTRP 4.0">NTRP 4.0 (Продвинутый)</option>
                        <option value="NTRP 4.5">NTRP 4.5 (Полупрофи)</option>
                        <option value="NTRP 5.0">NTRP 5.0+ (Профи)</option>
                    </select>
                </div>
            )}

            <Button className="w-full mt-4" onClick={handleSaveProfile}>Сохранить изменения</Button>
        </div>
    </Modal>

    <Modal isOpen={showTournamentsModal} onClose={() => setShowTournamentsModal(false)} title="Календарь турниров" bodyClassName="max-h-96">
        <div className="space-y-4">
            {tournaments.map((t) => (
                <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex gap-4 items-center">
                        <div className="bg-white rounded-lg p-2 text-center border border-slate-200 min-w-[60px]">
                            <div className="text-xs font-bold text-slate-400 uppercase">{formatDate(t.start_date).month}</div>
                            <div className="text-lg font-bold text-slate-900">{formatDate(t.start_date).day}</div>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-xs text-slate-500">{t.groupName || 'Открытый'} • {t.category}</div>
                        </div>
                    </div>
                </div>
            ))}
            {tournaments.length === 0 && (
                <div className="text-center text-slate-500">Нет доступных турниров.</div>
            )}
        </div>
    </Modal>

    <Modal isOpen={showTrainingModal} onClose={resetTrainingModal} title={!isTrainingCompleted ? currentTraining.modalTitle : ""}>
        {!isTrainingCompleted ? (
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                    <p className="mb-2"><span className="font-bold">Цель:</span> {currentTraining.goal}</p>
                    <p><span className="font-bold">Инвентарь:</span> {currentTraining.inventory}</p>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {currentTraining.steps.map((step, index) => (
                        <div key={index} className="flex gap-3">
                            <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
                            <div>
                                <h4 className="font-bold text-sm">{step.title}</h4>
                                <p className="text-xs text-slate-500">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Button className="w-full" onClick={handleCompleteTraining}>Я выполнил тренировку</Button>
            </div>
        ) : (
            <div className="text-center py-10 animate-fade-in-up">
                <div className="w-24 h-24 bg-lime-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-lime-400/30">
                    <Trophy size={48} className="text-slate-900"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Отличная работа!</h2>
                <p className="text-slate-500 mb-8">Тренировка успешно завершена.</p>
                <div className="inline-flex items-center gap-2 bg-slate-900 text-lime-400 px-6 py-3 rounded-xl font-bold text-lg mb-8">
                    <Zap size={20} className="fill-lime-400"/> +10 XP
                </div>
                <Button className="w-full" onClick={resetTrainingModal}>Закрыть</Button>
            </div>
        )}
    </Modal>
    </>
  );
};

export default ProfileView;


import React, { useState, useEffect } from 'react';
import { 
  MapPin, CheckCircle2, Activity, Zap, Trophy, Calendar, 
  BarChart2, Loader2, ChevronDown, Plus, Upload
} from 'lucide-react';
import { User, Match, Tournament } from '../../types';
import Button from '../Button';
import { StatCard, ProgressChart, Modal } from '../Shared';
import { api } from '../../services/api';

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

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdate }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStatsModal, setShowAddStatsModal] = useState(false);
  const [showTournamentsModal, setShowTournamentsModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  
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

  const [newMatchStats, setNewMatchStats] = useState({
      opponentName: '',
      score: '',
      result: 'win' as 'win' | 'loss',
      surface: 'hard' as 'hard' | 'clay' | 'grass',
      stats: {
          firstServePercent: 60,
          doubleFaults: 2,
          unforcedErrors: 10,
          winners: 5,
          aces: 1,
          breakPointsWon: 0,
          totalBreakPoints: 0
      }
  });

  useEffect(() => {
      const fetchMatches = async () => {
          setLoadingMatches(true);
          try {
              const data = await api.matches.getAll(user.id);
              setMatches(data);
          } catch(e) {
              console.error(e);
          } finally {
              setLoadingMatches(false);
          }
      };
      fetchMatches();
  }, [user.id]);

  const handleSaveMatch = async () => {
      try {
          const matchPayload = {
              userId: user.id,
              ...newMatchStats,
              stats: newMatchStats.stats
          };
          const savedMatch = await api.matches.add(matchPayload);
          setMatches([savedMatch, ...matches]);
          setShowAddStatsModal(false);
      } catch (e) {
          alert('Ошибка сохранения');
      }
  };

  const handleSaveProfile = async () => {
      try {
          await api.admin.updateUser(user.id, editFormData);
          onUserUpdate(editFormData);
          setShowEditModal(false);
      } catch (e) {
          alert('Ошибка при обновлении профиля');
      }
  };

  const handleCompleteTraining = async () => {
      const xpReward = 50;
      const currentXp = user.xp || 0;
      const newXp = currentXp + xpReward;

      onUserUpdate({ xp: newXp });
      
      setIsTrainingCompleted(true);
      setCurrentTrainingIndex((prevIndex) => (prevIndex + 1) % trainings.length);

      try {
          await api.admin.updateUser(user.id, { xp: newXp });
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
          <div className="h-32 bg-slate-900 w-full relative">
             <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
                 <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-lime-400/20 rounded-full blur-[60px]"></div>
             </div>
             <div className="absolute top-6 right-6 z-10">
                 <Button variant="glass" size="sm" onClick={() => setShowEditModal(true)}>Редактировать</Button>
             </div>
          </div>
          
          <div className="px-8 pb-8">
               <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16 sm:-mt-6 relative z-10">
                   <div className="relative">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md bg-slate-100" />
                   </div>
                   
                   <div className="flex-1 pt-2 sm:pt-0">
                       <div className="flex items-center justify-between">
                           <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h2 className="text-3xl font-bold text-slate-900">{user.name}</h2>
                                 {(user.role === 'rtt_pro' || user.role === 'coach') && <CheckCircle2 className="text-blue-500 fill-blue-100" size={24} />}
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
                <StatCard label="Матчей" value={matches.length} icon={<Trophy className="text-blue-500" />} />
                <StatCard label="Побед" value={matches.filter(m => m.result === 'win').length} icon={<Zap className="text-amber-500" />} />
                <StatCard label="Возраст" value={user.age || "N/A"} icon={<Calendar className="text-purple-500" />} />
              </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="text-lime-600"/> Аналитика игры</h3>
                <Button size="sm" onClick={() => setShowAddStatsModal(true)} className="gap-2"><Plus size={16}/> Внести матч</Button>
            </div>

            {matches.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="text-sm font-bold text-slate-500 uppercase mb-4">Процент 1-й подачи</div>
                            <ProgressChart matches={matches} type="serve" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-500 uppercase mb-4">Невынужденные ошибки</div>
                            <ProgressChart matches={matches} type="errors" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <Activity size={32} className="mx-auto mb-2 opacity-50"/>
                    <p>Нет данных. Добавьте статистику первого матча, чтобы увидеть графики.</p>
                </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold">История матчей</h3>
          </div>
          {loadingMatches ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div>
          ) : matches.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {matches.map((m) => (
                  <div 
                    key={m.id} 
                    onClick={() => setExpandedMatchId(expandedMatchId === m.id ? null : m.id)}
                    className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer group ${expandedMatchId === m.id ? 'bg-white border-lime-400 shadow-md ring-1 ring-lime-400' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${m.result === 'win' ? 'bg-lime-500' : 'bg-red-500'}`}></div>
                        <div>
                            <div className="font-bold text-lg group-hover:text-lime-600 transition-colors">{m.score}</div>
                            <div className="text-sm text-slate-500">vs. {m.opponentName} • {m.surface === 'clay' ? 'Грунт' : m.surface === 'hard' ? 'Хард' : 'Трава'}</div>
                        </div>
                        </div>
                        <div className="text-right">
                        <div className="font-bold text-slate-900">{new Date(m.date).toLocaleDateString()}</div>
                        {!expandedMatchId && m.stats && <div className="text-xs text-slate-400 font-medium">UE: {m.stats.unforcedErrors} | Wins: {m.stats.winners}</div>}
                        <ChevronDown size={16} className={`ml-auto mt-1 text-slate-400 transition-transform duration-300 ${expandedMatchId === m.id ? 'rotate-180' : ''}`}/>
                        </div>
                    </div>

                    {expandedMatchId === m.id && m.stats && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in-up cursor-default" onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Эйсы</div>
                                    <div className="font-bold text-slate-900">{m.stats.aces}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Двойные</div>
                                    <div className="font-bold text-slate-900">{m.stats.doubleFaults}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">1-я подача</div>
                                    <div className="font-bold text-slate-900">{m.stats.firstServePercent}%</div>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-100 bg-white text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Брейк-поинты</div>
                                    <div className="font-bold text-slate-900">{m.stats.breakPointsWon} / {m.stats.totalBreakPoints}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-lime-100 bg-lime-50 text-center">
                                    <div className="text-[10px] uppercase font-bold text-lime-700 mb-1">Winners</div>
                                    <div className="font-bold text-lime-900">{m.stats.winners}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-center">
                                    <div className="text-[10px] uppercase font-bold text-red-700 mb-1">Unforced Errors</div>
                                    <div className="font-bold text-red-900">{m.stats.unforcedErrors}</div>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                ))}
              </div>
          ) : (
              <p className="text-slate-400 text-sm">Пока нет сыгранных матчей.</p>
          )}
        </div>
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
            <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={18}/> Ближайший турнир</h3>
            <div className="space-y-3">
                { nearestTournament ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">{formatDate(nearestTournament.start_date).day} {formatDate(nearestTournament.start_date).month}, {formatDate(nearestTournament.start_date).dayOfWeek}</div>
                        <div className="font-bold text-slate-900">{nearestTournament.name}</div>
                        <div className="text-sm text-slate-500 mt-1">{nearestTournament.groupName || 'Частный'} • {nearestTournament.category}</div>
                    </div>
                ) : (
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-sm text-slate-500">
                        Нет ближайших турниров
                    </div>
                )}
                <Button 
                    variant="outline" 
                    className="w-full text-sm" 
                    onClick={() => setShowTournamentsModal(true)}
                >
                    Календарь турниров
                </Button>
            </div>
        </div>
      </div>
    </div>

    <Modal isOpen={showAddStatsModal} onClose={() => setShowAddStatsModal(false)} title="Добавить матч">
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Соперник</label>
                <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                    value={newMatchStats.opponentName} 
                    onChange={e => setNewMatchStats({...newMatchStats, opponentName: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Счет</label>
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={newMatchStats.score} 
                        onChange={e => setNewMatchStats({...newMatchStats, score: e.target.value})}
                        placeholder="6:3, 6:4"
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Покрытие</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={newMatchStats.surface} 
                        onChange={e => setNewMatchStats({...newMatchStats, surface: e.target.value as any})}
                    >
                        <option value="hard">Хард</option>
                        <option value="clay">Грунт</option>
                        <option value="grass">Трава</option>
                    </select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Результат</label>
                <div className="flex gap-2">
                    <button 
                        className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${newMatchStats.result === 'win' ? 'bg-lime-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}
                        onClick={() => setNewMatchStats({...newMatchStats, result: 'win'})}
                    >Победа</button>
                    <button 
                         className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${newMatchStats.result === 'loss' ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-500'}`}
                         onClick={() => setNewMatchStats({...newMatchStats, result: 'loss'})}
                    >Поражение</button>
                </div>
            </div>
            
            <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-900 uppercase mb-3">Статистика (опционально)</div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">1-я подача (%)</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" value={newMatchStats.stats.firstServePercent} onChange={e => setNewMatchStats({...newMatchStats, stats: {...newMatchStats.stats, firstServePercent: Number(e.target.value)}})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Невынужденные</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" value={newMatchStats.stats.unforcedErrors} onChange={e => setNewMatchStats({...newMatchStats, stats: {...newMatchStats.stats, unforcedErrors: Number(e.target.value)}})} />
                    </div>
                </div>
            </div>

            <Button className="w-full mt-4" onClick={handleSaveMatch}>Сохранить результат</Button>
        </div>
    </Modal>

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
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none" 
                        value={editFormData.age} 
                        onChange={e => setEditFormData({...editFormData, age: parseInt(e.target.value)})}
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
                <div key={t.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex gap-4 items-center">
                        <div className="bg-white rounded-lg p-2 text-center border border-slate-200 min-w-[60px]">
                            <div className="text-xs font-bold text-slate-400 uppercase">{formatDate(t.start_date).month}</div>
                            <div className="text-lg font-bold text-slate-900">{formatDate(t.start_date).day}</div>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-xs text-slate-500">{t.groupName || 'Частный'} • {t.category}</div>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => alert('Заявка отправлена!')}>Записаться</Button>
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
                    <Zap size={20} className="fill-lime-400"/> +50 XP
                </div>
                <Button className="w-full" onClick={resetTrainingModal}>Закрыть</Button>
            </div>
        )}
    </Modal>
    </>
  );
};

export default ProfileView;

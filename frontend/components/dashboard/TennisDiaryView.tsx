import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Plus, Calendar, Heart, Target, TrendingUp, ChevronDown, ChevronUp, Users, FileText, X } from 'lucide-react';
import { api } from '../../services/api';
import DiaryBanner from './DiaryBanner';
import Tooltip from '../Tooltip';

interface OpponentDossier {
  id: string;
  opponentName: string;
  opponentLevel: string;
  opponentRni?: string;
  preferredSurface?: 'hard' | 'clay' | 'grass' | 'indoor';
  favoriteServeTarget?: string;
  favoritePatterns: string[];
  weakZones: string[];
  h2hWins: number;
  h2hLosses: number;
  h2hMatches: Array<{ date: string; score: string; surface: string }>;
  pressureBehavior?: string;
  clutchBehavior?: string;
  breakResponse?: string;
  endurance?: number;
  movementSpeed?: number;
  firstServePattern?: string;
  whatWorked?: string;
  nextAdjustments?: string;
  rttRank?: number;
  rttCategory?: string;
  rttTournamentsCount?: number;
  rttLastTournament?: string;
  strengths: string[];
  weaknesses: string[];
  playStyle: string;
  recommendations: string;
  lastMeetDate?: string;
  matchesCount: number;
}

interface DiaryEntry {
  id: string;
  date: string;
  type: 'match' | 'training' | 'progress' | 'goal';
  title: string;
  description: string;
  rating?: number;
  performance?: {
    serve: number;
    forehand: number;
    backhand: number;
    volley: number;
    movement: number;
  };
  mood?: 'excellent' | 'good' | 'neutral' | 'bad';
  opponentDossier?: OpponentDossier;
  createdAt: string;
}

const TennisDiaryView: React.FC<{ user: User }> = ({ user }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDossierForm, setShowDossierForm] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<OpponentDossier | null>(null);
  const [dossiers, setDossiers] = useState<OpponentDossier[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'entry' | 'dossier'; id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    type: 'training' as DiaryEntry['type'],
    title: '',
    description: '',
    mood: 'good' as DiaryEntry['mood'],
    opponentDossier: null as OpponentDossier | null,
    performance: {
      serve: 5,
      forehand: 5,
      backhand: 5,
      volley: 5,
      movement: 5,
    },
  });

  const [dossierForm, setDossierForm] = useState({
    opponentName: '',
    opponentRni: '',
    opponentLevel: '',
    preferredSurface: 'hard' as OpponentDossier['preferredSurface'],
    favoriteServeTarget: '',
    favoritePatterns: ['', '', ''],
    weakZones: ['', '', ''],
    h2hWins: 0,
    h2hLosses: 0,
    h2hLastDate: '',
    h2hLastScore: '',
    h2hLastSurface: '',
    pressureBehavior: '',
    clutchBehavior: '',
    breakResponse: '',
    endurance: 5,
    movementSpeed: 5,
    firstServePattern: '',
    whatWorked: '',
    nextAdjustments: '',
    strengths: ['', '', ''],
    weaknesses: ['', '', ''],
    playStyle: '',
    recommendations: '',
  });

  const [rniLookupState, setRniLookupState] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [rniData, setRniData] = useState<any>(null);
  const [rniSearchQuery, setRniSearchQuery] = useState('');
  const [rniSearchResults, setRniSearchResults] = useState<any[]>([]);
  const [rniSearchLoading, setRniSearchLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchDossiers();
  }, [user.id]);

  const fetchDossiers = async () => {
    try {
      // Здесь будет реальный API запрос
      const mockDossiers: OpponentDossier[] = [
        {
          id: '1',
          opponentName: 'Иван Петров',
          opponentLevel: 'NTRP 4.5',
          preferredSurface: 'hard',
          favoriteServeTarget: 'Широко в равную сторону',
          favoritePatterns: ['Подача + форхенд в открытый корт', 'Давление по линии справа', 'Выход к сетке после короткого мяча'],
          weakZones: ['Бэкхенд по линии', 'Высокие мячи под бэкхенд', 'Удар с неудобной позиции слева'],
          h2hWins: 2,
          h2hLosses: 1,
          h2hMatches: [{ date: '2026-02-15', score: '6:4 3:6 6:3', surface: 'hard' }],
          pressureBehavior: 'Важные мячи играет осторожно и уходит в центр корта',
          clutchBehavior: 'На брейк-пойнтах чаще подаёт в корпус',
          breakResponse: 'После брейка пытается быстро атаковать на приёме',
          endurance: 7,
          movementSpeed: 6,
          firstServePattern: 'Плоская в T с правой стороны',
          whatWorked: 'Игра через высокий темп по бэкхенду',
          nextAdjustments: 'Чаще менять высоту и длину мяча в длинных розыгрышах',
          strengths: ['Мощная подача', 'Хороший волей', 'Умение читать игру'],
          weaknesses: ['Слабый бэкхенд', 'Низкая мобильность', 'Проблемы с линией'],
          playStyle: 'Агрессивный, атакующий с сетки',
          recommendations: 'Атаковать его бэкхенд, не давать ему выходить в сетку',
          matchesCount: 5,
        },
      ];
      setDossiers(mockDossiers);
    } catch (error) {
      console.error('Failed to fetch dossiers:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      // Здесь будет реальный API запрос
      const mockEntries: DiaryEntry[] = [
        {
          id: '1',
          date: new Date().toISOString().split('T')[0],
          type: 'training',
          title: 'Тренировка с тренером',
          description: 'Отработка удара справа. Улучшилась техника на 15%.',
          rating: 8,
          mood: 'excellent',
          performance: {
            serve: 7,
            forehand: 8,
            backhand: 7,
            volley: 6,
            movement: 8,
          },
          createdAt: new Date().toISOString(),
        },
      ];
      setEntries(mockEntries);
    } catch (error) {
      console.error('Failed to fetch diary entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRniVerify = async (rni: string) => {
    if (!rni.trim()) return;
    setRniLookupState('loading');
    setRniData(null);
    try {
      const result = await api.rtt.verifyRNI(rni.trim());
      // бэкенд возвращает { success, data: { name, category, rank, ... } }
      const player = result?.data ?? result?.player;
      if (result?.success && player) {
        setRniData(player);
        setRniLookupState('found');
        // Автозаполняем имя и уровень только если поля пустые
        setDossierForm(prev => ({
          ...prev,
          opponentName: prev.opponentName || player.name || '',
          opponentLevel: prev.opponentLevel || (player.category ? `РТТ ${player.category}` : ''),
          opponentRni: rni.trim(),
        }));
      } else {
        setRniLookupState('error');
      }
    } catch {
      setRniLookupState('error');
    }
  };

  const handleRniSearch = async (query: string) => {
    setRniSearchQuery(query);
    if (query.length < 3) {
      setRniSearchResults([]);
      return;
    }
    setRniSearchLoading(true);
    try {
      const result = await api.rtt.searchPlayers(query);
      if (result?.success && Array.isArray(result.players)) {
        setRniSearchResults(result.players.slice(0, 5));
      } else {
        setRniSearchResults([]);
      }
    } catch {
      setRniSearchResults([]);
    } finally {
      setRniSearchLoading(false);
    }
  };

  const handleSelectRniPlayer = (player: any) => {
    const rni = player.rni || '';
    setRniSearchResults([]);
    setRniSearchQuery('');
    setDossierForm(prev => ({
      ...prev,
      opponentName: player.name || prev.opponentName,
      opponentLevel: player.category ? `РТТ ${player.category}` : prev.opponentLevel,
      opponentRni: rni,
    }));
    if (rni) handleRniVerify(rni);
  };

  const handleAddDossier = async () => {
    if (!dossierForm.opponentName.trim()) return;

    try {
      const newDossier: OpponentDossier = {
        id: Math.random().toString(),
        opponentName: dossierForm.opponentName,
        opponentLevel: dossierForm.opponentLevel,
        opponentRni: dossierForm.opponentRni || undefined,
        preferredSurface: dossierForm.preferredSurface,
        favoriteServeTarget: dossierForm.favoriteServeTarget || undefined,
        favoritePatterns: dossierForm.favoritePatterns.filter(item => item.trim()),
        weakZones: dossierForm.weakZones.filter(item => item.trim()),
        h2hWins: Number(dossierForm.h2hWins) || 0,
        h2hLosses: Number(dossierForm.h2hLosses) || 0,
        h2hMatches: dossierForm.h2hLastDate || dossierForm.h2hLastScore || dossierForm.h2hLastSurface
          ? [{
              date: dossierForm.h2hLastDate || new Date().toISOString().split('T')[0],
              score: dossierForm.h2hLastScore || '—',
              surface: dossierForm.h2hLastSurface || 'unknown',
            }]
          : [],
        pressureBehavior: dossierForm.pressureBehavior || undefined,
        clutchBehavior: dossierForm.clutchBehavior || undefined,
        breakResponse: dossierForm.breakResponse || undefined,
        endurance: Number(dossierForm.endurance) || undefined,
        movementSpeed: Number(dossierForm.movementSpeed) || undefined,
        firstServePattern: dossierForm.firstServePattern || undefined,
        whatWorked: dossierForm.whatWorked || undefined,
        nextAdjustments: dossierForm.nextAdjustments || undefined,
        rttRank: rniData?.rank ?? undefined,
        rttCategory: rniData?.category ?? undefined,
        rttTournamentsCount: rniData?.tournamentsCount ?? undefined,
        rttLastTournament: rniData?.lastTournament ?? undefined,
        strengths: dossierForm.strengths.filter(s => s.trim()),
        weaknesses: dossierForm.weaknesses.filter(w => w.trim()),
        playStyle: dossierForm.playStyle,
        recommendations: dossierForm.recommendations,
        matchesCount: 1,
      };

      setDossiers([newDossier, ...dossiers]);
      setDossierForm({
        opponentName: '',
        opponentRni: '',
        opponentLevel: '',
        preferredSurface: 'hard',
        favoriteServeTarget: '',
        favoritePatterns: ['', '', ''],
        weakZones: ['', '', ''],
        h2hWins: 0,
        h2hLosses: 0,
        h2hLastDate: '',
        h2hLastScore: '',
        h2hLastSurface: '',
        pressureBehavior: '',
        clutchBehavior: '',
        breakResponse: '',
        endurance: 5,
        movementSpeed: 5,
        firstServePattern: '',
        whatWorked: '',
        nextAdjustments: '',
        strengths: ['', '', ''],
        weaknesses: ['', '', ''],
        playStyle: '',
        recommendations: '',
      });
      setRniData(null);
      setRniLookupState('idle');
      setShowDossierForm(false);
    } catch (error) {
      console.error('Failed to add dossier:', error);
    }
  };

  const handleDeleteEntry = (id: string, title: string) => {
    setConfirmDelete({ type: 'entry', id, name: title });
  };

  const handleDeleteDossier = (id: string, name: string) => {
    setConfirmDelete({ type: 'dossier', id, name });
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'entry') {
      setEntries(prev => prev.filter(e => e.id !== confirmDelete.id));
    } else {
      setDossiers(prev => prev.filter(d => d.id !== confirmDelete.id));
      if (selectedDossier?.id === confirmDelete.id) setSelectedDossier(null);
    }
    setConfirmDelete(null);
  };

  const handleAddEntry = async () => {
    if (!formData.title.trim()) return;

    try {
      const newEntry: DiaryEntry = {
        id: Math.random().toString(),
        date: new Date().toISOString().split('T')[0],
        type: formData.type,
        title: formData.title,
        description: formData.description,
        mood: formData.mood,
        performance: formData.performance,
        opponentDossier: formData.opponentDossier,
        createdAt: new Date().toISOString(),
      };

      setEntries([newEntry, ...entries]);
      setFormData({
        type: 'training',
        title: '',
        description: '',
        mood: 'good',
        opponentDossier: null,
        performance: {
          serve: 5,
          forehand: 5,
          backhand: 5,
          volley: 5,
          movement: 5,
        },
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add entry:', error);
    }
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'excellent':
        return '😄';
      case 'good':
        return '😊';
      case 'neutral':
        return '😐';
      case 'bad':
        return '😞';
      default:
        return '📝';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match':
        return '🏆';
      case 'training':
        return '🎾';
      case 'progress':
        return '📈';
      case 'goal':
        return '🎯';
      default:
        return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'match':
        return 'Матч';
      case 'training':
        return 'Тренировка';
      case 'progress':
        return 'Прогресс';
      case 'goal':
        return 'Цель';
      default:
        return 'Запись';
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <DiaryBanner entriesCount={entries.length} dossiersCount={dossiers.length} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Дневник теннисиста</h2>
          <p className="text-slate-500 mt-1">Отслеживайте свой прогресс и ведите личные записи</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowForm(false);
              setShowDossierForm(v => !v);
            }}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
          >
            <FileText size={20} /> Досье
          </button>
          <button
            onClick={() => {
              setShowDossierForm(false);
              setShowForm(v => !v);
            }}
            className="flex items-center gap-2 bg-lime-400 text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-lime-500 transition-colors"
          >
            <Plus size={20} /> Новая запись
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Создать запись</h3>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Тип записи</label>
              <div className="grid grid-cols-2 gap-3">
                {(['training', 'match', 'progress', 'goal'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type })}
                    className={`p-3 rounded-lg border-2 transition-all text-left font-medium ${
                      formData.type === type
                        ? 'border-lime-400 bg-lime-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg mr-2">{getTypeIcon(type)}</span>
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Opponent Dossier Selection */}
            {formData.type === 'match' && dossiers.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Досье соперника (опционально)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, opponentDossier: null })}
                    className={`p-3 rounded-lg border-2 transition-all text-left font-medium ${
                      formData.opponentDossier === null
                        ? 'border-slate-400 bg-slate-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Без досье
                  </button>
                  {dossiers.map((dossier) => (
                    <button
                      key={dossier.id}
                      onClick={() => setFormData({ ...formData, opponentDossier: dossier })}
                      className={`p-3 rounded-lg border-2 transition-all text-left font-medium ${
                        formData.opponentDossier?.id === dossier.id
                          ? 'border-blue-400 bg-blue-50 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold">{dossier.opponentName}</div>
                      <div className="text-xs text-slate-500">{dossier.opponentLevel}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Заголовок</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Тренировка с тренером"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишите тренировку или матч..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none transition-all resize-none"
              />
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Настроение</label>
              <div className="grid grid-cols-4 gap-3">
                {(['excellent', 'good', 'neutral', 'bad'] as const).map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setFormData({ ...formData, mood })}
                    className={`p-3 rounded-lg border-2 transition-all text-xl ${
                      formData.mood === mood
                        ? 'border-lime-400 bg-lime-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {getMoodEmoji(mood)}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Sliders */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Уровень выполнения</label>
              <div className="space-y-3">
                {(['serve', 'forehand', 'backhand', 'volley', 'movement'] as const).map((skill) => (
                  <div key={skill}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-600 capitalize">
                        {skill === 'serve' && 'Подача'}
                        {skill === 'forehand' && 'Удар справа'}
                        {skill === 'backhand' && 'Удар слева'}
                        {skill === 'volley' && 'Волей'}
                        {skill === 'movement' && 'Движение'}
                      </span>
                      <span className="text-sm font-bold text-lime-600">{formData.performance[skill]}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={formData.performance[skill]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          performance: {
                            ...formData.performance,
                            [skill]: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-lime-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddEntry}
                className="flex-1 bg-lime-400 text-slate-900 py-2 rounded-lg font-bold hover:bg-lime-500 transition-colors"
              >
                Сохранить запись
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dossier Form */}
      {showDossierForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">Создать досье на соперника</h3>
            <button onClick={() => setShowDossierForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Opponent Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Имя соперника</label>
              <input
                type="text"
                value={dossierForm.opponentName}
                onChange={(e) => setDossierForm({ ...dossierForm, opponentName: e.target.value })}
                placeholder="Например: Иван Петров"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
              />
            </div>

            {/* Opponent Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Уровень игры</label>
              <input
                type="text"
                value={dossierForm.opponentLevel}
                onChange={(e) => setDossierForm({ ...dossierForm, opponentLevel: e.target.value })}
                placeholder="Например: NTRP 4.5, РТТ 1-я категория"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
              />
            </div>

            {/* RNI — optional */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Номер РНИ <span className="text-slate-400 font-normal">(если играет в РТТ)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dossierForm.opponentRni}
                  onChange={(e) => {
                    setDossierForm({ ...dossierForm, opponentRni: e.target.value });
                    setRniLookupState('idle');
                    setRniData(null);
                  }}
                  placeholder="Например: 123456"
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleRniVerify(dossierForm.opponentRni)}
                  disabled={!dossierForm.opponentRni.trim() || rniLookupState === 'loading'}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {rniLookupState === 'loading' ? 'Поиск...' : 'Загрузить'}
                </button>
              </div>

              {/* RTT данные */}
              {rniLookupState === 'found' && rniData && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2">
                    ✅ Данные с ФТР загружены
                  </div>
                  {rniData.name && (
                    <div className="text-sm text-slate-700"><span className="font-medium">Имя:</span> {rniData.name}</div>
                  )}
                  {rniData.city && (
                    <div className="text-sm text-slate-700"><span className="font-medium">Город:</span> {rniData.city}</div>
                  )}
                  {rniData.category && (
                    <div className="text-sm text-slate-700"><span className="font-medium">Возрастная группа:</span> {rniData.category}</div>
                  )}
                  {rniData.points > 0 && (
                    <div className="text-sm text-slate-700"><span className="font-medium">Очки РТТ:</span> {rniData.points}</div>
                  )}
                  {rniData.rank > 0 && (
                    <div className="text-sm text-slate-700"><span className="font-medium">Рейтинг в группе:</span> {rniData.rank}</div>
                  )}
                  {rniData.winRate !== null && rniData.winRate !== undefined && (
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">Победы:</span> {rniData.winRate}% ({rniData.wins} из {rniData.totalMatches} матчей)
                    </div>
                  )}
                </div>
              )}
              {rniLookupState === 'error' && (
                <div className="mt-2 text-sm text-red-500">
                  ⚠️ Игрок с таким РНИ не найден в базе РТТ
                </div>
              )}
            </div>

            {/* Play Style */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Стиль игры</label>
              <textarea
                value={dossierForm.playStyle}
                onChange={(e) => setDossierForm({ ...dossierForm, playStyle: e.target.value })}
                placeholder="Описание стиля игры..."
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Любимое покрытие</label>
                <select
                  value={dossierForm.preferredSurface}
                  onChange={(e) => setDossierForm({ ...dossierForm, preferredSurface: e.target.value as OpponentDossier['preferredSurface'] })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all bg-white"
                >
                  <option value="hard">Хард</option>
                  <option value="clay">Грунт</option>
                  <option value="grass">Трава</option>
                  <option value="indoor">Индор</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Любимый паттерн 1-й подачи</label>
                <input
                  type="text"
                  value={dossierForm.firstServePattern}
                  onChange={(e) => setDossierForm({ ...dossierForm, firstServePattern: e.target.value })}
                  placeholder="Например: в T с правой"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Куда чаще подаёт</label>
              <input
                type="text"
                value={dossierForm.favoriteServeTarget}
                onChange={(e) => setDossierForm({ ...dossierForm, favoriteServeTarget: e.target.value })}
                placeholder="Например: широко в равную сторону"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Любимые тактические схемы</label>
                <div className="space-y-2">
                  {dossierForm.favoritePatterns.map((item, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const next = [...dossierForm.favoritePatterns];
                        next[idx] = e.target.value;
                        setDossierForm({ ...dossierForm, favoritePatterns: next });
                      }}
                      placeholder={`Схема ${idx + 1}`}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Слабые зоны на корте</label>
                <div className="space-y-2">
                  {dossierForm.weakZones.map((item, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const next = [...dossierForm.weakZones];
                        next[idx] = e.target.value;
                        setDossierForm({ ...dossierForm, weakZones: next });
                      }}
                      placeholder={`Зона ${idx + 1}`}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-slate-800">История личных встреч</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="number"
                  min={0}
                  value={dossierForm.h2hWins}
                  onChange={(e) => setDossierForm({ ...dossierForm, h2hWins: Number(e.target.value) })}
                  placeholder="Ваши победы"
                  className="px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={dossierForm.h2hLosses}
                  onChange={(e) => setDossierForm({ ...dossierForm, h2hLosses: Number(e.target.value) })}
                  placeholder="Поражения"
                  className="px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                />
                <input
                  type="date"
                  value={dossierForm.h2hLastDate}
                  onChange={(e) => setDossierForm({ ...dossierForm, h2hLastDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                />
                <input
                  type="text"
                  value={dossierForm.h2hLastScore}
                  onChange={(e) => setDossierForm({ ...dossierForm, h2hLastScore: e.target.value })}
                  placeholder="Счёт последней"
                  className="px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Поведение под давлением</label>
                <textarea
                  value={dossierForm.pressureBehavior}
                  onChange={(e) => setDossierForm({ ...dossierForm, pressureBehavior: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Решающие очки</label>
                <textarea
                  value={dossierForm.clutchBehavior}
                  onChange={(e) => setDossierForm({ ...dossierForm, clutchBehavior: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Реакция на брейк</label>
                <textarea
                  value={dossierForm.breakResponse}
                  onChange={(e) => setDossierForm({ ...dossierForm, breakResponse: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Выносливость: {dossierForm.endurance}/10</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={dossierForm.endurance}
                  onChange={(e) => setDossierForm({ ...dossierForm, endurance: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Скорость передвижения: {dossierForm.movementSpeed}/10</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={dossierForm.movementSpeed}
                  onChange={(e) => setDossierForm({ ...dossierForm, movementSpeed: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Strengths */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Сильные стороны</label>
              <div className="space-y-2">
                {dossierForm.strengths.map((strength, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={strength}
                    onChange={(e) => {
                      const newStrengths = [...dossierForm.strengths];
                      newStrengths[idx] = e.target.value;
                      setDossierForm({ ...dossierForm, strengths: newStrengths });
                    }}
                    placeholder={`Сильная сторона ${idx + 1}`}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Слабые стороны</label>
              <div className="space-y-2">
                {dossierForm.weaknesses.map((weakness, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={weakness}
                    onChange={(e) => {
                      const newWeaknesses = [...dossierForm.weaknesses];
                      newWeaknesses[idx] = e.target.value;
                      setDossierForm({ ...dossierForm, weaknesses: newWeaknesses });
                    }}
                    placeholder={`Слабая сторона ${idx + 1}`}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Рекомендации к игре</label>
              <textarea
                value={dossierForm.recommendations}
                onChange={(e) => setDossierForm({ ...dossierForm, recommendations: e.target.value })}
                placeholder="Как лучше играть против этого соперника..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Что сработало в прошлый раз</label>
                <textarea
                  value={dossierForm.whatWorked}
                  onChange={(e) => setDossierForm({ ...dossierForm, whatWorked: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Что поменять в следующий раз</label>
                <textarea
                  value={dossierForm.nextAdjustments}
                  onChange={(e) => setDossierForm({ ...dossierForm, nextAdjustments: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddDossier}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
              >
                Сохранить досье
              </button>
              <button
                onClick={() => setShowDossierForm(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dossiers List */}
      {dossiers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users size={20} /> Досье на соперников
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dossiers.map((dossier) => (
              <Tooltip
                key={dossier.id}
                text="Пример досье соперника"
                description="Нажмите, чтобы открыть полное досье с тактикой, статистикой и заметками"
              >
                <div className="w-full relative group/card">
                  <div
                    onClick={() => setSelectedDossier(dossier)}
                    className="w-full p-4 border border-blue-200 rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="font-bold text-slate-900 pr-8">{dossier.opponentName}</div>
                    <div className="text-sm text-slate-600">{dossier.opponentLevel}</div>
                    <div className="text-xs text-slate-500 mt-2">Встреч: {dossier.matchesCount}</div>
                    {dossier.opponentRni && <div className="text-xs text-blue-700 mt-1">РНИ: {dossier.opponentRni}</div>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDossier(dossier.id, dossier.opponentName); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-slate-400 opacity-0 group-hover/card:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                    title="Удалить досье"
                  >
                    <X size={14} />
                  </button>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Modal - Full Dossier View */}
      {selectedDossier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">

            {/* Шапка */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Досье: {selectedDossier.opponentName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{selectedDossier.opponentLevel}</p>
              </div>
              <button onClick={() => setSelectedDossier(null)} className="p-1.5 hover:bg-slate-100 rounded-lg mt-0.5 flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Базовая статистика */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Встреч</div>
                  <div className="text-2xl font-black text-slate-900">{selectedDossier.matchesCount}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Побед</div>
                  <div className="text-2xl font-black text-green-600">{selectedDossier.h2hWins ?? 0}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Поражений</div>
                  <div className="text-2xl font-black text-red-500">{selectedDossier.h2hLosses ?? 0}</div>
                </div>
              </div>

              {/* РТТ данные */}
              {(selectedDossier.opponentRni || selectedDossier.rttCategory || selectedDossier.rttRank) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-800 mb-2">🏅 Данные ФТР</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedDossier.opponentRni && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">РНИ: {selectedDossier.opponentRni}</span>
                    )}
                    {selectedDossier.rttCategory && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Категория: {selectedDossier.rttCategory}</span>
                    )}
                    {selectedDossier.rttRank && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Рейтинг: {selectedDossier.rttRank}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Покрытие и подача */}
              {(selectedDossier.preferredSurface || selectedDossier.favoriteServeTarget) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedDossier.preferredSurface && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Покрытие</div>
                      <div className="text-sm font-bold text-slate-800">{selectedDossier.preferredSurface}</div>
                    </div>
                  )}
                  {selectedDossier.favoriteServeTarget && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Подача</div>
                      <div className="text-sm font-bold text-slate-800">{selectedDossier.favoriteServeTarget}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Стиль игры */}
              {selectedDossier.playStyle && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">📊 Стиль игры</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">{selectedDossier.playStyle}</p>
                </div>
              )}

              {/* Сильные и слабые стороны */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">✅ Сильные стороны</h3>
                  <ul className="space-y-1.5">
                    {selectedDossier.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 flex gap-2 items-start">
                        <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">⚠️ Слабые стороны</h3>
                  <ul className="space-y-1.5">
                    {selectedDossier.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-slate-600 flex gap-2 items-start">
                        <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">•</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Любимые схемы */}
              {selectedDossier.favoritePatterns?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-800 mb-2">🎯 Любимые схемы</h3>
                  <ul className="space-y-1">
                    {selectedDossier.favoritePatterns.map((item, i) => (
                      <li key={i} className="text-sm text-slate-700">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Слабые зоны */}
              {selectedDossier.weakZones?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-rose-800 mb-2">📍 Слабые зоны</h3>
                  <ul className="space-y-1">
                    {selectedDossier.weakZones.map((item, i) => (
                      <li key={i} className="text-sm text-slate-700">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* История встреч */}
              {selectedDossier.h2hMatches?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">🤝 История встреч</h3>
                  <div className="space-y-2">
                    {selectedDossier.h2hMatches.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-slate-500">{m.date}</span>
                        <span className="font-bold text-slate-900">{m.score}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{m.surface}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Психология */}
              {(selectedDossier.pressureBehavior || selectedDossier.clutchBehavior || selectedDossier.breakResponse) && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-purple-800 mb-3">🧠 Психология</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedDossier.pressureBehavior && (
                      <div className="bg-white rounded-lg px-3 py-2 border border-purple-100">
                        <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Под давлением</span>
                        <p className="text-sm text-slate-700 mt-0.5">{selectedDossier.pressureBehavior}</p>
                      </div>
                    )}
                    {selectedDossier.clutchBehavior && (
                      <div className="bg-white rounded-lg px-3 py-2 border border-purple-100">
                        <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Важные очки</span>
                        <p className="text-sm text-slate-700 mt-0.5">{selectedDossier.clutchBehavior}</p>
                      </div>
                    )}
                    {selectedDossier.breakResponse && (
                      <div className="bg-white rounded-lg px-3 py-2 border border-purple-100">
                        <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">После брейка</span>
                        <p className="text-sm text-slate-700 mt-0.5">{selectedDossier.breakResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Физика */}
              {(selectedDossier.endurance !== undefined || selectedDossier.movementSpeed !== undefined) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-emerald-800 mb-3">💪 Физические данные</h3>
                  <div className="space-y-3">
                    {selectedDossier.endurance !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="font-semibold">Выносливость</span>
                          <span className="font-bold text-emerald-600">{selectedDossier.endurance}/10</span>
                        </div>
                        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(selectedDossier.endurance / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {selectedDossier.movementSpeed !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="font-semibold">Скорость ног</span>
                          <span className="font-bold text-emerald-600">{selectedDossier.movementSpeed}/10</span>
                        </div>
                        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(selectedDossier.movementSpeed / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Рекомендации */}
              {selectedDossier.recommendations && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">💡 Рекомендации</h3>
                  <p className="text-sm text-slate-600 bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl">{selectedDossier.recommendations}</p>
                </div>
              )}

              {/* Итоги */}
              {(selectedDossier.whatWorked || selectedDossier.nextAdjustments) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedDossier.whatWorked && (
                    <div className="bg-lime-50 border border-lime-200 rounded-xl p-4">
                      <div className="text-xs font-bold text-lime-700 uppercase tracking-wide mb-1.5">✅ Что сработало</div>
                      <p className="text-sm text-slate-700">{selectedDossier.whatWorked}</p>
                    </div>
                  )}
                  {selectedDossier.nextAdjustments && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1.5">🔧 Что поменять</div>
                      <p className="text-sm text-slate-700">{selectedDossier.nextAdjustments}</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Кнопки */}
            <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => handleDeleteDossier(selectedDossier.id, selectedDossier.opponentName)}
                className="px-4 py-2.5 rounded-xl font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm flex items-center gap-1.5"
              >
                <X size={15} /> Удалить
              </button>
              <button
                onClick={() => setSelectedDossier(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, opponentDossier: selectedDossier });
                  setSelectedDossier(null);
                  setShowForm(true);
                }}
                className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors text-sm"
              >
                Добавить запись к матчу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Загрузка записей...</div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">📔</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Нет записей</h3>
          <p className="text-slate-500 mb-4">Создайте первую запись в дневнике</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-lime-500 transition-colors"
          >
            <Plus size={18} /> Создать запись
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="text-2xl">{getTypeIcon(entry.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{entry.title}</h3>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg">{getMoodEmoji(entry.mood)}</span>
                        <span className="text-xs text-slate-500">{getTypeLabel(entry.type)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.rating && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-lime-600">{entry.rating}/10</div>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id, entry.title); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                      title="Удалить запись"
                    >
                      <X size={15} />
                    </button>
                    {expandedId === entry.id ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === entry.id && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                  <p className="text-slate-600">{entry.description}</p>

                  {/* Opponent Dossier Info */}
                  {entry.opponentDossier && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Users size={16} /> Соперник: {entry.opponentDossier.opponentName}
                      </h4>
                      <div className="text-sm text-slate-600 mb-3">
                        <span className="font-semibold">{entry.opponentDossier.opponentLevel}</span>
                      </div>
                      <div className="text-sm text-slate-600 bg-white rounded p-2">
                        <span className="font-semibold">Рекомендации:</span> {entry.opponentDossier.recommendations}
                      </div>
                    </div>
                  )}

                  {entry.performance && (
                    <div className="bg-white rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={16} /> Показатели выполнения
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(entry.performance).map(([skill, value]) => (
                          <div key={skill}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-600 capitalize">
                                {skill === 'serve' && 'Подача'}
                                {skill === 'forehand' && 'Удар справа'}
                                {skill === 'backhand' && 'Удар слева'}
                                {skill === 'volley' && 'Волей'}
                                {skill === 'movement' && 'Движение'}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{value}/10</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
                                style={{ width: `${(value / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <X size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Удалить {confirmDelete.type === 'entry' ? 'запись' : 'досье'}?</h3>
                <p className="text-sm text-slate-500 mt-0.5">«{confirmDelete.name}»</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              {confirmDelete.type === 'entry'
                ? 'Запись будет удалена без возможности восстановления.'
                : 'Досье соперника будет удалено без возможности восстановления.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold hover:bg-red-600 transition-colors text-sm"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TennisDiaryView;

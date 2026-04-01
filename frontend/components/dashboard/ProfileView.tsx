
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  MapPin, CheckCircle2, Activity, Zap, Trophy, Calendar, 
        Loader2, Upload, Target, TrendingUp, Watch, Link as LinkIcon, Unplug
} from 'lucide-react';
import { User, Match, Tournament, PlayerProgressGoal, PlayerProgressProfile, PlayerProgressSkills, WearableConnection, WearableProvider, WearableActivity, WearableActivitySummary, SamsungBridgeSetup } from '../../types';
import Button from '../Button';
import { StatCard, Modal } from '../Shared';
import { api, API_URL } from '../../services/api';

type SkillMetricKey = 'serve' | 'forehand' | 'backhand' | 'stamina' | 'psychology';

type SkillRadarValues = PlayerProgressSkills;
type ProfileGoalState = PlayerProgressGoal;
type PlayerProgressState = PlayerProgressProfile;

const PLAYER_PROGRESS_SCHEMA_VERSION = 3;
const EMPTY_SKILL_VALUES: PlayerProgressSkills = {
    serve: 0,
    forehand: 0,
    backhand: 0,
    stamina: 0,
    psychology: 0
};

const skillMetricConfig: Array<{ key: SkillMetricKey; label: string; color: string }> = [
    { key: 'serve', label: 'Подача', color: 'text-lime-600' },
    { key: 'forehand', label: 'Форхенд', color: 'text-blue-600' },
    { key: 'backhand', label: 'Бэкхенд', color: 'text-violet-600' },
    { key: 'stamina', label: 'Выносливость', color: 'text-amber-600' },
    { key: 'psychology', label: 'Психология', color: 'text-rose-600' }
];

const clampSkillValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const resolveTournamentDate = (tournament: Tournament) => tournament.start_date || tournament.startDate || '';

const resolveTournamentParticipants = (tournament: Tournament) => tournament.participants_count || tournament.participantsCount || 8;

const ROMAN_TO_ARABIC: Record<string, string> = {
    VI: '6',
    V: '5',
    IV: '4',
    III: '3',
    II: '2',
    I: '1'
};

const CYRILLIC_TO_LATIN_SUFFIX: Record<string, string> = {
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D'
};

const normalizeComparableText = (value?: string | null) =>
    String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();

const extractAgeBucket = (value?: string | null): string | null => {
    const normalized = normalizeComparableText(value);
    if (!normalized) return null;
    if (normalized.includes('9-10') || normalized.includes('9–10')) return '9-10';
    if (normalized.includes('до 13')) return '12u';
    if (normalized.includes('до 15')) return '14u';
    if (normalized.includes('до 17')) return '16u';
    if (normalized.includes('до 19')) return '18u';
    if (normalized.includes('взросл')) return 'adult';
    return null;
};

const getUserAgeBucket = (user: User) => {
    const fromCategory = extractAgeBucket(user.rttCategory);
    if (fromCategory) return fromCategory;

    if (typeof user.age === 'number') {
        if (user.age <= 10) return '9-10';
        if (user.age <= 12) return '12u';
        if (user.age <= 14) return '14u';
        if (user.age <= 16) return '16u';
        if (user.age <= 18) return '18u';
        return 'adult';
    }

    return null;
};

const getTournamentAgeBucket = (tournament: Tournament) =>
    extractAgeBucket(tournament.age_group || tournament.ageGroup || tournament.group_name || tournament.groupName || '');

const isTournamentAgeCompatible = (tournament: Tournament, user: User) => {
    const userAgeBucket = getUserAgeBucket(user);
    const tournamentAgeBucket = getTournamentAgeBucket(tournament);

    if (!userAgeBucket || !tournamentAgeBucket) return true;
    return userAgeBucket === tournamentAgeBucket;
};

const normalizeTournamentCategoryCode = (value?: string | null) => {
    const raw = String(value || '').toUpperCase().replace(/Ё/g, 'Е').trim();
    if (!raw) return 'UNKNOWN';
    if (raw.includes('ФТ')) return 'FT';

    const compact = raw.replace(/\s+/g, '').replace(/–/g, '-');
    const romanMatch = compact.match(/(VI|IV|V|III|II|I)([АБВГДABVGD])?/);
    if (romanMatch) {
        const major = ROMAN_TO_ARABIC[romanMatch[1]] || romanMatch[1];
        const suffix = romanMatch[2]
            ? (CYRILLIC_TO_LATIN_SUFFIX[romanMatch[2] as keyof typeof CYRILLIC_TO_LATIN_SUFFIX] || romanMatch[2])
            : '';
        return `${major}${suffix}`;
    }

    const arabicMatch = compact.match(/([1-6])([АБВГДABVGD])?/);
    if (arabicMatch) {
        const suffix = arabicMatch[2]
            ? (CYRILLIC_TO_LATIN_SUFFIX[arabicMatch[2] as keyof typeof CYRILLIC_TO_LATIN_SUFFIX] || arabicMatch[2])
            : '';
        return `${arabicMatch[1]}${suffix}`;
    }

    return compact || 'UNKNOWN';
};

const normalizeTournamentSystem = (value?: string | null) => {
    const normalized = normalizeComparableText(value);
    if (!normalized) return 'uo';
    if (normalized.includes('оидт')) return 'oidt';
    if (normalized.includes('ком')) return 'team';
    if (normalized === 'о.' || normalized === 'о' || normalized.includes('олимп')) return 'o';
    return 'uo';
};

const estimateCategoryBasePoints = (categoryCode: string, ageBucket?: string | null) => {
    const ageAwareBaseMap: Record<string, Record<string, number>> = {
        '9-10': { FT: 40, '1A': 36, '1B': 32, '2A': 28, '2B': 24, '3A': 18, '3B': 16, '3V': 15, '4A': 12, '4B': 11, '4V': 10, '5A': 9, '5B': 8, '5V': 7, '5G': 6, '6A': 5, '6B': 4, '6V': 3, '6G': 2, '6D': 1 },
        '12u': { FT: 150, '1A': 130, '1B': 120, '2A': 105, '2B': 95, '3A': 80, '3B': 75, '3V': 70, '4A': 60, '4B': 55, '4V': 50, '5A': 45, '5B': 40, '5V': 35, '5G': 22 },
        '14u': { FT: 350, '1A': 250, '1B': 230, '2A': 200, '2B': 180, '3A': 150, '3B': 130, '3V': 120, '4A': 100, '4B': 90, '4V': 85, '5A': 75, '5B': 70, '5V': 60, '5G': 22 },
        '16u': { FT: 550, '1A': 450, '1B': 430, '2A': 400, '2B': 350, '3A': 300, '3B': 280, '3V': 250, '4A': 200, '4B': 180, '4V': 150, '5A': 120, '5B': 100, '5V': 90, '5G': 47 },
        '18u': { FT: 900, '1A': 700, '1B': 650, '2A': 550, '2B': 500, '3A': 400, '3B': 350, '3V': 300, '4A': 260, '4B': 230, '4V': 210, '5A': 180, '5B': 150, '5V': 120, '5G': 63 },
        adult: { FT: 900, '1A': 700, '1B': 650, '2A': 550, '2B': 500, '3A': 400, '3B': 350, '3V': 300, '4A': 260, '4B': 230, '4V': 210, '5A': 180, '5B': 150, '5V': 120, '5G': 63 }
    };

    const bucket = ageBucket || 'adult';
    const table = ageAwareBaseMap[bucket] || ageAwareBaseMap.adult;
    if (table[categoryCode]) return table[categoryCode];

    const major = categoryCode.match(/^([1-6])/)?.[1] || null;
    if (major) {
        const fallbackByMajor: Record<string, string> = {
            '1': '1B',
            '2': '2B',
            '3': '3B',
            '4': '4B',
            '5': '5B',
            '6': '6B'
        };
        return table[fallbackByMajor[major]] || 24;
    }

    return Math.max(18, Math.round((table['4B'] || 26) * 0.8));
};

const formatWearableDuration = (durationSeconds?: number | null) => {
    if (!durationSeconds) return '—';
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.round((durationSeconds % 3600) / 60);
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
};

const formatWearableDate = (value?: string | null) => {
    if (!value) return 'Дата не указана';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Дата не указана';
    return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const getWearableProviderTitle = (provider: WearableProvider) => provider === 'garmin' ? 'Garmin' : 'Samsung Watch';

const getYearEndDate = () => `${new Date().getFullYear()}-12-31`;

const average = (values: number[]) => values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const safeRatio = (value: number, maxValue: number) => maxValue > 0 ? value / maxValue : 0;

const getMatchesWithDetailedStats = (matches: Match[]) => matches.filter((match) => match.stats);

const parseScoreSets = (score?: string | null) => {
    const normalized = String(score || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [] as Array<{ player: number; opponent: number }>;

    return [...normalized.matchAll(/(\d+)\s*[-:–]\s*(\d+)/g)].map((match) => ({
        player: Number(match[1]),
        opponent: Number(match[2]),
    }));
};

const estimatePointsForTargetRank = (currentPoints: number, currentRank?: number, targetRank?: number | null) => {
    if (!targetRank || !currentRank) return Math.max(currentPoints + 80, 120);
    if (targetRank >= currentRank) return Math.max(currentPoints, 0);

    const rankGap = currentRank - targetRank;
    const competitionBuffer = targetRank <= 50 ? 70 : targetRank <= 100 ? 45 : 25;
    const projectedGain = Math.max(90, Math.round(rankGap * 5.5 + competitionBuffer));
    return currentPoints + projectedGain;
};

const parseGoalIntent = (title: string) => {
    const normalizedTitle = title.toLowerCase();
    const topMatch = normalizedTitle.match(/топ[-\s]?(\d+)/i);
    const pointsMatch = normalizedTitle.match(/(\d+)\s*(?:очк|очков|points?)/i);

    return {
        targetRank: topMatch ? Math.max(1, Number(topMatch[1])) : null,
        targetPoints: pointsMatch ? Math.max(0, Number(pointsMatch[1])) : null,
        mentionsRtt: normalizedTitle.includes('ртт')
    };
};

const buildDefaultSkills = (_user: User, matches: Match[]): SkillRadarValues => {
    const matchesWithStats = getMatchesWithDetailedStats(matches);
    if (matchesWithStats.length === 0) {
        return EMPTY_SKILL_VALUES;
    }

    const wins = matches.filter(match => match.result === 'win').length;
    const winRate = matches.length > 0 ? wins / matches.length : 0.5;
    const serveAverage = average(matchesWithStats.map((match) => match.stats?.firstServePercent || 0));
    const errorsAverage = average(matchesWithStats.map((match) => match.stats?.unforcedErrors || 0));
    const acesAverage = average(matchesWithStats.map((match) => match.stats?.aces || 0));
    const doubleFaultsAverage = average(matchesWithStats.map((match) => match.stats?.doubleFaults || 0));
    const winnersAverage = average(matchesWithStats.map((match) => match.stats?.winners || 0));
    const breakPointConversion = average(matchesWithStats.map((match) => safeRatio(match.stats?.breakPointsWon || 0, match.stats?.totalBreakPoints || 0)));
    const consistencyScore = Math.max(0, 1 - Math.min(errorsAverage, 24) / 24);
    const sampleConfidence = Math.min(matchesWithStats.length / 6, 1);

    const serveScore =
        serveAverage * 0.5 +
        Math.min(acesAverage / 6, 1) * 20 +
        Math.max(0, 1 - Math.min(doubleFaultsAverage, 7) / 7) * 25;
    const forehandScore =
        Math.min(winnersAverage / 14, 1) * 45 +
        winRate * 20 +
        consistencyScore * 25 +
        sampleConfidence * 10;
    const backhandScore =
        Math.min(winnersAverage / 14, 1) * 28 +
        breakPointConversion * 32 +
        consistencyScore * 30 +
        Math.max(0, 1 - Math.min(doubleFaultsAverage, 7) / 7) * 10;
    const staminaScore =
        consistencyScore * 30 +
        breakPointConversion * 25 +
        sampleConfidence * 20 +
        Math.max(0, 1 - Math.min(errorsAverage, 24) / 24) * 15;
    const psychologyScore =
        winRate * 30 +
        breakPointConversion * 35 +
        Math.max(0, 1 - Math.min(doubleFaultsAverage, 7) / 7) * 15 +
        consistencyScore * 10;

    return {
        serve: clampSkillValue(serveScore),
        forehand: clampSkillValue(forehandScore),
        backhand: clampSkillValue(backhandScore),
        stamina: clampSkillValue(staminaScore),
        psychology: clampSkillValue(psychologyScore)
    };
};

const buildRttDerivedSkills = (user: User, rttStatsData?: any): SkillRadarValues => {
    const rttMatches = Array.isArray(rttStatsData?.matches) ? rttStatsData.matches : [];
    const totalMatches = Number(rttStatsData?.totalMatches || rttMatches.length || 0);
    const wins = Number(rttStatsData?.wins || rttMatches.filter((match: any) => match.result === 'win').length || 0);
    const winRateRatio = typeof rttStatsData?.winRate === 'number'
        ? rttStatsData.winRate / 100
        : totalMatches > 0
            ? wins / totalMatches
            : 0;

    if (!rttMatches.length && totalMatches === 0) {
        return EMPTY_SKILL_VALUES;
    }

    const parsedMatches = rttMatches.map((match: any) => {
        const sets = parseScoreSets(match?.score);
        const wonSets = sets.filter((set) => set.player > set.opponent).length;
        const lostSets = sets.filter((set) => set.opponent > set.player).length;
        const closeSets = sets.filter((set) => Math.abs(set.player - set.opponent) <= 2 || (set.player >= 6 && set.opponent >= 6)).length;
        const closeSetWins = sets.filter((set) => (Math.abs(set.player - set.opponent) <= 2 || (set.player >= 6 && set.opponent >= 6)) && set.player > set.opponent).length;
        const decisive = sets.length >= 3;
        const decisiveWin = decisive && wonSets > lostSets;
        const dominantWonSets = sets.filter((set) => set.player > set.opponent && (set.player - set.opponent) >= 3).length;
        const oneSidedLostSets = sets.filter((set) => set.opponent > set.player && (set.opponent - set.player) >= 4).length;

        return {
            ...match,
            sets,
            wonSets,
            lostSets,
            closeSets,
            closeSetWins,
            decisive,
            decisiveWin,
            dominantWonSets,
            oneSidedLostSets,
        };
    });

    const totalSets = parsedMatches.reduce((sum: number, match: any) => sum + match.sets.length, 0);
    const totalWonSets = parsedMatches.reduce((sum: number, match: any) => sum + match.wonSets, 0);
    const closeSetsCount = parsedMatches.reduce((sum: number, match: any) => sum + match.closeSets, 0);
    const closeSetWins = parsedMatches.reduce((sum: number, match: any) => sum + match.closeSetWins, 0);
    const decidingMatches = parsedMatches.filter((match: any) => match.decisive);
    const decidingWins = decidingMatches.filter((match: any) => match.decisiveWin).length;
    const dominantWonSets = parsedMatches.reduce((sum: number, match: any) => sum + match.dominantWonSets, 0);
    const oneSidedLostSets = parsedMatches.reduce((sum: number, match: any) => sum + match.oneSidedLostSets, 0);
    const opponentRatings = parsedMatches
        .map((match: any) => Number(match?.opponentPoints || 0))
        .filter((value: number) => Number.isFinite(value) && value > 0);
    const averageOpponentRating = average(opponentRatings);
    const currentRating = Number(user.rating || 0);
    const strongOppMatches = parsedMatches.filter((match: any) => Number(match?.opponentPoints || 0) >= Math.max(currentRating - 25, 1));
    const winsAgainstStrongOpponents = strongOppMatches.filter((match: any) => match.result === 'win').length;

    const setWinRatio = totalSets > 0 ? totalWonSets / totalSets : winRateRatio;
    const closeSetWinRatio = closeSetsCount > 0 ? closeSetWins / closeSetsCount : winRateRatio;
    const decidingWinRatio = decidingMatches.length > 0 ? decidingWins / decidingMatches.length : winRateRatio;
    const dominantSetRatio = totalSets > 0 ? dominantWonSets / totalSets : winRateRatio;
    const lowCollapseRatio = totalSets > 0 ? Math.max(0, 1 - oneSidedLostSets / totalSets) : winRateRatio;
    const strongOpponentWinRatio = strongOppMatches.length > 0 ? winsAgainstStrongOpponents / strongOppMatches.length : winRateRatio;
    const experienceFactor = Math.min(totalMatches / 18, 1);
    const competitionFactor = averageOpponentRating > 0 && currentRating > 0
        ? Math.min(averageOpponentRating / Math.max(currentRating, 1), 1.15)
        : 0.8;

    const serveScore = 18 + winRateRatio * 24 + dominantSetRatio * 22 + lowCollapseRatio * 14 + competitionFactor * 12 + experienceFactor * 10;
    const forehandScore = 16 + setWinRatio * 24 + dominantSetRatio * 20 + strongOpponentWinRatio * 18 + experienceFactor * 12 + closeSetWinRatio * 10;
    const backhandScore = 15 + closeSetWinRatio * 24 + lowCollapseRatio * 18 + strongOpponentWinRatio * 16 + setWinRatio * 10 + experienceFactor * 10;
    const staminaScore = 18 + decidingWinRatio * 24 + setWinRatio * 18 + experienceFactor * 20 + lowCollapseRatio * 12 + closeSetWinRatio * 8;
    const psychologyScore = 18 + closeSetWinRatio * 26 + decidingWinRatio * 22 + winRateRatio * 18 + lowCollapseRatio * 10 + experienceFactor * 6;

    return {
        serve: clampSkillValue(serveScore),
        forehand: clampSkillValue(forehandScore),
        backhand: clampSkillValue(backhandScore),
        stamina: clampSkillValue(staminaScore),
        psychology: clampSkillValue(psychologyScore)
    };
};

const buildSkillRadarFromSources = (user: User, matches: Match[], rttStatsData?: any): SkillRadarValues => {
    const localSkills = buildDefaultSkills(user, matches);
    const hasLocalSkills = Object.values(localSkills).some((value) => value > 0);

    if (hasLocalSkills) {
        return localSkills;
    }

    return buildRttDerivedSkills(user, rttStatsData);
};

const buildDefaultGoal = (user: User): ProfileGoalState => {
    const currentPoints = Number(user.rating || 0);
    const defaultTargetPoints = currentPoints > 0 ? currentPoints + Math.max(80, Math.round(currentPoints * 0.18)) : 180;
    const defaultTargetRank = user.rttRank ? Math.max(1, Math.min(50, user.rttRank - 25)) : 50;

    return {
        title: user.role === 'rtt_pro' ? 'Войти в топ-50 РТТ до конца года' : 'Поднять игровой рейтинг до конца года',
        targetDate: getYearEndDate(),
        targetPoints: defaultTargetPoints,
        targetRank: defaultTargetRank
    };
};

const estimateTournamentPoints = (tournament: Tournament, user: User) => {
    const participants = resolveTournamentParticipants(tournament);
    const categoryCode = normalizeTournamentCategoryCode(tournament.category);
    const userAgeBucket = getUserAgeBucket(user);
    const tournamentAgeBucket = getTournamentAgeBucket(tournament);
    const systemCode = normalizeTournamentSystem(tournament.system);

    let points = estimateCategoryBasePoints(categoryCode, tournamentAgeBucket || userAgeBucket);

    if (participants >= 32) points *= 1;
    else if (participants >= 24) points *= 0.88;
    else if (participants >= 16) points *= 0.72;
    else if (participants >= 8) points *= 0.52;
    else points *= 0.35;

    if (systemCode === 'oidt') points *= 0.9;
    else if (systemCode === 'o') points *= 0.72;
    else if (systemCode === 'team') points *= 0.4;

    if (userAgeBucket && tournamentAgeBucket && userAgeBucket !== tournamentAgeBucket) {
        points *= 0.35;
    }

    return Math.max(3, Math.round(points));
};

const cleanTournamentCategoryLabel = (value?: string | null) => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '—';

    return raw
        .replace(/\s+(корты|покрытие)\s*:\s*.*$/i, '')
        .replace(/\s+корты\s+.*$/i, '')
        .trim();
};

const RTT_ALLOWED_DRAW_SIZES = new Set([4, 8, 16, 24, 32, 48, 56, 64]);

const parseOfficialTournamentPointsTable = (tournamentDetails?: any) => {
    if (!Array.isArray(tournamentDetails?.pointsTable)) {
        return [];
    }

    return tournamentDetails.pointsTable
        .map((row: any) => {
            const drawSize = Number(String(row?.stage || '').replace(/\D/g, ''));
            const values = String(row?.points || '')
                .split(',')
                .map((value) => String(value).trim())
                .filter((value) => value.length > 0);

            if (!Number.isFinite(drawSize) || !RTT_ALLOWED_DRAW_SIZES.has(drawSize) || values.length === 0) {
                return null;
            }

            return {
                stageLabel: String(drawSize),
                drawSize,
                values,
            };
        })
        .filter(Boolean);
};

const getRecommendedOfficialPointsRow = (rows: Array<{ stageLabel: string; drawSize: number; values: string[] }>, participants: number) => {
    if (!rows.length) {
        return null;
    }

    const exactMatch = rows.find((row) => row.drawSize === participants);
    if (exactMatch) {
        return exactMatch;
    }

    const largerMatch = rows
        .filter((row) => row.drawSize >= participants)
        .sort((left, right) => left.drawSize - right.drawSize)[0];

    if (largerMatch) {
        return largerMatch;
    }

    return [...rows].sort((left, right) => right.drawSize - left.drawSize)[0];
};

const RttTournamentPointsPreview: React.FC<{ tournament: any; tournamentDetails?: any }> = ({ tournament, tournamentDetails }) => {
    const participants = Number(tournamentDetails?.participantsCount || tournament?.applications || tournament?.applicationsCount || 0) || 0;
    const officialRows = parseOfficialTournamentPointsTable(tournamentDetails);

    if (!officialRows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Официальная RTT-таблица очков для этого турнира пока недоступна.
            </div>
        );
    }

    const recommendedOfficialRow = getRecommendedOfficialPointsRow(officialRows as Array<{ stageLabel: string; drawSize: number; values: string[] }>, participants);
    const maxOfficialColumns = officialRows.reduce((max, row) => Math.max(max, row.values.length), 0);
    const useStageHeaders = maxOfficialColumns > 0 && maxOfficialColumns <= 7;
    const officialHeaders = useStageHeaders
        ? ['П', 'Ф', '1/2', '1/4', '1/8', '1/16', '1/32'].slice(0, maxOfficialColumns)
        : Array.from({ length: maxOfficialColumns }, (_, index) => `${index + 1}`);

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className="font-bold text-slate-900">Таблица очков</h4>
                    <p className="text-xs text-slate-500 mt-1">
                        Категория {cleanTournamentCategoryLabel(tournamentDetails?.category || tournament?.category || '—')} • {tournamentDetails?.ageGroup || tournament?.ageGroup || 'возраст не указан'} • {participants || '—'} участников
                    </p>
                </div>
                <div className="text-right text-[11px] text-slate-400 uppercase tracking-wider">RTT</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-2 text-left">Сетка</th>
                            {officialHeaders.map((header) => (
                                <th key={header} className="px-3 py-2 text-center whitespace-nowrap">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {officialRows.map((row) => {
                            const isRecommended = recommendedOfficialRow?.stageLabel === row.stageLabel;
                            return (
                                <tr key={`${row.stageLabel}-${row.values.join('-')}`} className={isRecommended ? 'bg-lime-50' : 'bg-white'}>
                                    <td className={`px-3 py-2 font-bold ${isRecommended ? 'text-lime-700' : 'text-slate-700'}`}>{row.stageLabel}</td>
                                    {officialHeaders.map((_, index) => (
                                        <td key={`${row.stageLabel}-${index}`} className="px-3 py-2 text-center font-semibold text-slate-900 whitespace-nowrap border-l border-slate-100">
                                            {row.values[index] || '—'}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RttTournamentDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tournament: any;
    tournamentDetails?: any;
    loadingTournamentDetails?: boolean;
}> = ({ isOpen, onClose, tournament, tournamentDetails, loadingTournamentDetails }) => {
    if (!tournament) return null;

    const displayTitle = tournamentDetails?.name || tournament?.name || 'Турнир РТТ';
    const displayCity = tournamentDetails?.city || tournament?.city || '—';
    const displayCategory = cleanTournamentCategoryLabel(tournamentDetails?.category || tournament?.category || '—');
    const displayAgeGroup = tournamentDetails?.ageGroup || tournament?.ageGroup || '—';
    const displayType = tournamentDetails?.type || tournament?.type || '—';
    const displayGender = tournamentDetails?.gender || '—';
    const displayParticipants = tournamentDetails?.participantsCount || tournament?.applicationsCount || tournament?.applications || '—';
    const displayAvgRating = tournamentDetails?.avgRating || tournament?.avgRating || '—';
    const displayStartDate = tournamentDetails?.startDate || tournament?.startDate || '—';
    const displayEndDate = tournamentDetails?.endDate || tournament?.endDate || '—';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={displayTitle} maxWidth="max-w-6xl" bodyClassName="p-0">
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <p className="text-slate-600"><strong>Город:</strong> {displayCity}</p>
                <p className="text-slate-600"><strong>Тип:</strong> {displayType}</p>
                <p className="text-slate-600 col-span-2"><strong>Категория:</strong> {displayCategory}</p>
                <p className="text-slate-600"><strong>Пол:</strong> {displayGender}</p>
                <p className="text-slate-600"><strong>Возраст:</strong> {displayAgeGroup}</p>
                <p className="text-slate-600"><strong>Участники:</strong> {displayParticipants}</p>
                <p className="text-slate-600"><strong>Средний рейтинг:</strong> {displayAvgRating}</p>
                <p className="text-slate-600"><strong>Начало:</strong> {displayStartDate}</p>
                <p className="text-slate-600"><strong>Окончание:</strong> {displayEndDate}</p>
            </div>

            <div className="px-6 md:px-8 pb-6 md:pb-8">
                {loadingTournamentDetails || !tournamentDetails ? (
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={16} /> Загружаю RTT-данные турнира...
                    </div>
                ) : (
                    <RttTournamentPointsPreview tournament={tournament} tournamentDetails={tournamentDetails} />
                )}
            </div>
        </Modal>
    );
};

const SkillRadarChart: React.FC<{ skills: SkillRadarValues }> = ({ skills }) => {
    const size = 240;
    const center = size / 2;
    const radius = 78;
    const rings = [20, 40, 60, 80, 100];
    const angleStep = (Math.PI * 2) / skillMetricConfig.length;

    const getPoint = (index: number, value: number, extraRadius = 0) => {
        const angle = -Math.PI / 2 + index * angleStep;
        const scaledRadius = ((radius + extraRadius) * value) / 100;
        return {
            x: center + Math.cos(angle) * scaledRadius,
            y: center + Math.sin(angle) * scaledRadius
        };
    };

    const shapePoints = skillMetricConfig
        .map((metric, index) => {
            const point = getPoint(index, skills[metric.key]);
            return `${point.x},${point.y}`;
        })
        .join(' ');

    return (
        <div className="flex flex-col items-center justify-center">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] overflow-visible">
                {rings.map((ring) => {
                    const ringPoints = skillMetricConfig
                        .map((_, index) => {
                            const point = getPoint(index, ring);
                            return `${point.x},${point.y}`;
                        })
                        .join(' ');

                    return <polygon key={ring} points={ringPoints} fill="none" stroke="#dbe4ee" strokeWidth="1" />;
                })}

                {skillMetricConfig.map((_, index) => {
                    const edgePoint = getPoint(index, 100);
                    return <line key={index} x1={center} y1={center} x2={edgePoint.x} y2={edgePoint.y} stroke="#dbe4ee" strokeWidth="1" />;
                })}

                <polygon points={shapePoints} fill="rgba(163, 230, 53, 0.22)" stroke="#65a30d" strokeWidth="2.5" />

                {skillMetricConfig.map((metric, index) => {
                    const point = getPoint(index, skills[metric.key]);
                    const labelPoint = getPoint(index, 100, 18);
                    return (
                        <g key={metric.key}>
                            <circle cx={point.x} cy={point.y} r="4.5" fill="#84cc16" stroke="white" strokeWidth="2" />
                            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#475569" fontWeight="700">
                                {metric.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                {skillMetricConfig.map((metric) => (
                    <div key={metric.key} className="rounded-2xl bg-white border border-slate-200 px-3 py-2">
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${metric.color}`}>{metric.label}</div>
                        <div className="text-lg font-bold text-slate-900">{skills[metric.key]}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
    const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
    const [selectedTournamentDetails, setSelectedTournamentDetails] = useState<any | null>(null);
    const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);

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

    useEffect(() => {
        if (!selectedTournament?.link) {
            setSelectedTournamentDetails(null);
            return;
        }

        let isActive = true;
        setLoadingTournamentDetails(true);

        api.rtt.getTournamentDetails(selectedTournament.link)
            .then((data) => {
                if (isActive && data?.success) {
                    setSelectedTournamentDetails(data.tournament || null);
                }
            })
            .catch((error) => {
                console.error('Failed to load RTT tournament details in profile', error);
            })
            .finally(() => {
                if (isActive) setLoadingTournamentDetails(false);
            });

        return () => {
            isActive = false;
        };
    }, [selectedTournament?.link]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" size={20}/></div>;

  if (!tournaments.length) return (
    <p className="text-slate-400 text-sm py-2 text-center">Турниры в вашем округе не найдены</p>
  );

  return (
        <>
            <div className="space-y-2">
                {districtName && <p className="text-xs text-slate-400 mb-3">{districtName} • топ-10 ближайших</p>}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {tournaments.map((t: any, i: number) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                setLoadingTournamentDetails(true);
                                setSelectedTournament(t);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-colors group cursor-pointer text-left"
                        >
                            <div className="flex-shrink-0 w-10 text-center">
                                <div className="text-xs font-bold text-amber-600 leading-tight">{t.startDate?.slice(0,5) || '—'}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-slate-900 group-hover:text-amber-700 leading-snug">{t.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{[t.city, t.ageGroup, cleanTournamentCategoryLabel(t.category)].filter(Boolean).join(' · ')}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <RttTournamentDetailsModal
                isOpen={!!selectedTournament}
                onClose={() => {
                    setSelectedTournament(null);
                    setSelectedTournamentDetails(null);
                }}
                tournament={selectedTournament}
                tournamentDetails={selectedTournamentDetails}
                loadingTournamentDetails={loadingTournamentDetails}
            />
        </>
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
  const [showAppleWatchModal, setShowAppleWatchModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [wearableModalProvider, setWearableModalProvider] = useState<WearableProvider | null>(null);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [rttMatches, setRttMatches] = useState<Match[]>([]);
    const [rttPlayerStats, setRttPlayerStats] = useState<any>(null);
  const [loadingRttMatches, setLoadingRttMatches] = useState(false);
  const [rttMatchesError, setRttMatchesError] = useState<string | null>(null);
  const [syncingRtt, setSyncingRtt] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
    const [wearableConnections, setWearableConnections] = useState<WearableConnection[]>([]);
    const [wearablesLoading, setWearablesLoading] = useState(false);
    const [wearablesMessage, setWearablesMessage] = useState<string | null>(null);
    const [activeWearableProvider, setActiveWearableProvider] = useState<WearableProvider | null>(null);
    const [wearableActivities, setWearableActivities] = useState<WearableActivity[]>([]);
    const [wearableActivitySummary, setWearableActivitySummary] = useState<WearableActivitySummary>({ activityCount: 0, durationSeconds: 0, distanceKm: 0, calories: 0, latestActivityAt: null });
    const [wearableActivitiesLoading, setWearableActivitiesLoading] = useState(false);
    const [latestSamsungBridge, setLatestSamsungBridge] = useState<SamsungBridgeSetup | null>(null);

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
                  setRttPlayerStats(rttData.data);
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
              } else {
                  setRttPlayerStats(rttData?.data || null);
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
    const isPlayerProfile = user.role === 'amateur' || user.role === 'rtt_pro';
    const isRttPlayer = user.role === 'rtt_pro';
    const isAmateurPlayer = user.role === 'amateur';
        const [playerProgress, setPlayerProgress] = useState<PlayerProgressState>(() => ({
            version: PLAYER_PROGRESS_SCHEMA_VERSION,
            skills: buildDefaultSkills(user, []),
            goal: buildDefaultGoal(user)
    }));
    const [isProgressReady, setIsProgressReady] = useState(false);
        const [progressRecalcMessage, setProgressRecalcMessage] = useState<string | null>(null);
        const progressSaveTimeoutRef = useRef<number | null>(null);

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
      let isCancelled = false;

      const loadWearables = async () => {
          setWearablesLoading(true);
          setWearableActivitiesLoading(true);
          try {
              const [list, activityData] = await Promise.all([
                  api.wearables.list(String(user.id)),
                  api.wearables.listActivities(String(user.id), { limit: 6 })
              ]);
              if (!isCancelled) {
                  setWearableConnections(list);
                  setWearableActivities(activityData.activities || []);
                  setWearableActivitySummary(activityData.summary);
              }
          } catch (error: any) {
              if (!isCancelled) {
                  setWearablesMessage(error.message || 'Не удалось загрузить подключения часов');
              }
          } finally {
              if (!isCancelled) {
                  setWearablesLoading(false);
                  setWearableActivitiesLoading(false);
              }
          }
      };

      loadWearables();
      return () => {
          isCancelled = true;
      };
  }, [user.id]);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('integration') !== 'garmin') return;

      const status = params.get('status');
      const message = params.get('message');
      setWearablesMessage(status === 'success' ? 'Garmin успешно подключён.' : (message || 'Ошибка подключения Garmin'));

      api.wearables.list(String(user.id))
          .then((list) => setWearableConnections(list))
          .catch(() => undefined);

      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete('integration');
      nextParams.delete('status');
      nextParams.delete('message');
      const nextQuery = nextParams.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
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
      if (!isPlayerProfile) {
          setIsProgressReady(false);
          return;
      }

      let isCancelled = false;

      const fallbackState: PlayerProgressState = {
          version: PLAYER_PROGRESS_SCHEMA_VERSION,
          skills: buildSkillRadarFromSources(user, matches, rttPlayerStats),
          goal: buildDefaultGoal(user)
      };

      const loadPlayerProgress = async () => {
          setIsProgressReady(false);
          try {
              const savedProgress = await api.playerProgress.get(String(user.id));
              if (isCancelled) return;

              if (!savedProgress || savedProgress.version !== PLAYER_PROGRESS_SCHEMA_VERSION) {
                  setPlayerProgress(fallbackState);
                  return;
              }

              setPlayerProgress({
                  version: PLAYER_PROGRESS_SCHEMA_VERSION,
                  skills: {
                      ...fallbackState.skills,
                      ...(savedProgress.skills || {})
                  },
                  goal: {
                      ...fallbackState.goal,
                      ...(savedProgress.goal || {})
                  }
              });
          } catch {
              if (!isCancelled) {
                  setPlayerProgress(fallbackState);
              }
          } finally {
              if (!isCancelled) {
                  setIsProgressReady(true);
              }
          }
      };

      loadPlayerProgress();

      return () => {
          isCancelled = true;
      };
    }, [isPlayerProfile, matches, rttPlayerStats, user]);

  useEffect(() => {
      if (!isPlayerProfile || !isProgressReady) return;

      if (progressSaveTimeoutRef.current) {
          window.clearTimeout(progressSaveTimeoutRef.current);
      }

      progressSaveTimeoutRef.current = window.setTimeout(() => {
          api.playerProgress.save(String(user.id), {
              ...playerProgress,
              version: PLAYER_PROGRESS_SCHEMA_VERSION
          }).catch((error) => {
              console.error('Failed to save player progress', error);
          });
      }, 350);

      return () => {
          if (progressSaveTimeoutRef.current) {
              window.clearTimeout(progressSaveTimeoutRef.current);
              progressSaveTimeoutRef.current = null;
          }
      };
  }, [isPlayerProfile, isProgressReady, playerProgress, user.id]);

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
                  setRttPlayerStats(data.data);
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
                  setRttMatchesError(null);
              } else {
                  setRttPlayerStats(data?.data || null);
                  setRttMatches([]);
                  setRttMatchesError(data.error || 'Нет данных');
              }
          } catch (error) {
              console.error(error);
              setRttPlayerStats(null);
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
  const currentRatingPoints = Number(user.rating || 0);
    const pointsLabel = user.role === 'rtt_pro' ? 'Очки РТТ' : 'Индекс прогресса';

  const upcomingTournamentSuggestions = useMemo(() => {
      if (!isRttPlayer) return [];

      return tournaments
          .filter((tournament) => {
              const startDate = resolveTournamentDate(tournament);
              return Boolean(startDate) && new Date(startDate) > new Date() && isTournamentAgeCompatible(tournament, user);
          })
          .map((tournament) => {
              const estimatedPoints = estimateTournamentPoints(tournament, user);
              const date = resolveTournamentDate(tournament);
              const daysUntilStart = date ? Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 365;
              const fitScore = estimatedPoints - Math.min(daysUntilStart, 45) * 0.35;
              return { tournament, estimatedPoints, fitScore };
          })
          .sort((left, right) => right.fitScore - left.fitScore)
          .slice(0, 3);
    }, [isRttPlayer, tournaments, user]);

  const pointsRemaining = Math.max(playerProgress.goal.targetPoints - currentRatingPoints, 0);
  const rankGap = user.rttRank && playerProgress.goal.targetRank
      ? Math.max(user.rttRank - playerProgress.goal.targetRank, 0)
      : null;
  const averagePotentialPoints = upcomingTournamentSuggestions.length > 0
      ? Math.round(upcomingTournamentSuggestions.reduce((sum, item) => sum + item.estimatedPoints, 0) / upcomingTournamentSuggestions.length)
      : 45;
  const tournamentsNeeded = pointsRemaining > 0 ? Math.ceil(pointsRemaining / Math.max(averagePotentialPoints, 1)) : 0;
  const goalProgressPercent = playerProgress.goal.targetPoints > 0
      ? Math.min(100, Math.round((currentRatingPoints / playerProgress.goal.targetPoints) * 100))
      : 0;
  const detailedSkillMatches = useMemo(() => getMatchesWithDetailedStats(matches), [matches]);
  const rttDerivedSkills = useMemo(() => buildRttDerivedSkills(user, rttPlayerStats), [user, rttPlayerStats]);
  const hasDetailedSkillData = detailedSkillMatches.length > 0;
  const hasRttSkillData = isRttPlayer && Object.values(rttDerivedSkills).some((value) => value > 0);
  const hasAnySkillValues = Object.values(playerProgress.skills).some((value) => value > 0);
  const showSkillDataPlaceholder = !hasDetailedSkillData && !hasRttSkillData && !hasAnySkillValues;
  const rttAnalysisSummary = useMemo(() => {
      if (!isRttPlayer || !rttPlayerStats) return null;

      const totalMatches = Number(rttPlayerStats.totalMatches || rttPlayerStats.matches?.length || 0);
      const wins = Number(rttPlayerStats.wins || rttPlayerStats.matches?.filter((match: any) => match.result === 'win').length || 0);
      const winRate = typeof rttPlayerStats.winRate === 'number'
          ? rttPlayerStats.winRate
          : totalMatches > 0
              ? Math.round((wins / totalMatches) * 100)
              : 0;
      const parsedMatches = Array.isArray(rttPlayerStats.matches) ? rttPlayerStats.matches : [];
      const averageOpponent = average(parsedMatches.map((match: any) => Number(match.opponentPoints || 0)).filter((value: number) => Number.isFinite(value) && value > 0));
      const decidingMatches = parsedMatches.filter((match: any) => parseScoreSets(match.score).length >= 3);
      const decidingWins = decidingMatches.filter((match: any) => match.result === 'win').length;
      const decidingRate = decidingMatches.length > 0 ? Math.round((decidingWins / decidingMatches.length) * 100) : null;

      return {
          totalMatches,
          winRate,
          averageOpponent: averageOpponent > 0 ? Math.round(averageOpponent) : null,
          decidingRate,
      };
  }, [isRttPlayer, rttPlayerStats]);
  const sortedSkillMetrics = useMemo(
      () => [...skillMetricConfig].sort((left, right) => playerProgress.skills[right.key] - playerProgress.skills[left.key]),
      [playerProgress.skills]
  );
  const strongestSkill = sortedSkillMetrics[0]?.label || 'Подача';
  const secondStrongestSkill = sortedSkillMetrics[1]?.label || 'Форхенд';
  const growthSkill = sortedSkillMetrics[sortedSkillMetrics.length - 1]?.label || 'Психология';

  const updateSkill = (key: SkillMetricKey, value: number) => {
      setPlayerProgress((prev) => ({
          ...prev,
          skills: {
              ...prev.skills,
              [key]: clampSkillValue(value)
          }
      }));
  };

  const updateGoal = (patch: Partial<ProfileGoalState>) => {
      setPlayerProgress((prev) => ({
          ...prev,
          goal: {
              ...prev.goal,
              ...patch
          }
      }));
  };

  const handleGoalTitleChange = (title: string) => {
      const intent = parseGoalIntent(title);
      const syncedPatch: Partial<ProfileGoalState> = { title };

      if (intent.targetRank && intent.mentionsRtt) {
          syncedPatch.targetRank = intent.targetRank;
          syncedPatch.targetPoints = estimatePointsForTargetRank(currentRatingPoints, user.rttRank, intent.targetRank);
      }

      if (intent.targetPoints !== null) {
          syncedPatch.targetPoints = intent.targetPoints;
      }

      updateGoal(syncedPatch);
  };

  const resetProgressFromStats = () => {
      const recalculatedSkills = buildSkillRadarFromSources(user, matches, rttPlayerStats);
      const hasChanges = skillMetricConfig.some((metric) => playerProgress.skills[metric.key] !== recalculatedSkills[metric.key]);

      if (!hasDetailedSkillData && !hasRttSkillData) {
          setProgressRecalcMessage('Пока нет достаточных данных из RTT-парсера или матчевой статистики — пересчитывать нечего.');
          window.setTimeout(() => setProgressRecalcMessage(null), 3000);
          return;
      }

      setPlayerProgress((prev) => ({
          ...prev,
          skills: recalculatedSkills
      }));

      setProgressRecalcMessage(hasChanges ? 'Навыки пересчитаны на основе RTT-парсера и матчевой статистики.' : 'Значения уже актуальны.');
      window.setTimeout(() => setProgressRecalcMessage(null), 2500);
  };

  const progressHighlightText = pointsRemaining > 0
      ? `До цели не хватает ${pointsRemaining} ${pointsLabel.toLowerCase()}`
      : 'Цель по очкам уже достигнута';
  const progressSkillHighlightText = showSkillDataPlaceholder
      ? 'Навыки появятся после первых данных RTT или матчей со статистикой'
      : `Сильные стороны: ${strongestSkill} и ${secondStrongestSkill}`;
  const goalIntentHint = useMemo(() => {
      const intent = parseGoalIntent(playerProgress.goal.title);
      if (intent.targetRank && intent.mentionsRtt) {
          return `По тексту цели распознан ориентир: топ-${intent.targetRank} РТТ.`;
      }
      if (intent.targetPoints !== null) {
          return `По тексту цели распознан целевой уровень: ${intent.targetPoints} ${pointsLabel.toLowerCase()}.`;
      }
      return isRttPlayer
          ? 'Подсказка: фразы вроде «топ-50 РТТ» или «150 очков» автоматически обновляют расчёт.'
          : 'Подсказка: для любителя цель лучше формулировать через стабильность, победы и регулярность выступлений.';
  }, [isRttPlayer, playerProgress.goal.title, pointsLabel]);

  const wearableConnectionMap = useMemo(
      () => new Map(wearableConnections.map((connection) => [connection.provider, connection])),
      [wearableConnections]
  );
  const garminConnection = wearableConnectionMap.get('garmin');
  const samsungConnection = wearableConnectionMap.get('samsung_watch');
    const activeWearableConnection = wearableModalProvider ? wearableConnectionMap.get(wearableModalProvider) : null;
    const activeWearableTitle = wearableModalProvider ? getWearableProviderTitle(wearableModalProvider) : '';
    const activeWearableBusy = wearableModalProvider ? activeWearableProvider === wearableModalProvider : false;
    const activeWearableStatus = activeWearableConnection?.status || 'disconnected';
    const activeBridgeTokenPreview = activeWearableConnection?.metadata?.bridgeTokenPreview || latestSamsungBridge?.bridgeTokenPreview;
    const activeBridgeIngestUrl = activeWearableConnection?.metadata?.bridgeIngestUrl || latestSamsungBridge?.ingestUrl;
    const activeBridgeTokenExpiresAt = activeWearableConnection?.metadata?.bridgeTokenExpiresAt || latestSamsungBridge?.expiresAt;
    const activeBridgeToken = wearableModalProvider === 'samsung_watch' ? latestSamsungBridge?.bridgeToken : null;
    const activeBridgeQrCode = wearableModalProvider === 'samsung_watch' ? latestSamsungBridge?.qrCodeDataUrl : null;
    const activeOnboardingUrl = wearableModalProvider === 'samsung_watch' ? latestSamsungBridge?.onboardingUrl : null;

  const reloadWearables = async () => {
      const [list, activityData] = await Promise.all([
          api.wearables.list(String(user.id)),
          api.wearables.listActivities(String(user.id), { limit: 6 })
      ]);
      setWearableConnections(list);
      setWearableActivities(activityData.activities || []);
      setWearableActivitySummary(activityData.summary);
  };

  const handleGarminConnect = async () => {
      setActiveWearableProvider('garmin');
      setWearablesMessage(null);
      try {
          const { authUrl } = await api.wearables.startGarmin(String(user.id));
          await reloadWearables();
          window.location.href = authUrl;
      } catch (error: any) {
          setWearablesMessage(error.message || 'Не удалось начать подключение Garmin');
          await reloadWearables();
      } finally {
          setActiveWearableProvider(null);
      }
  };

  const handleSamsungConnect = async () => {
      setActiveWearableProvider('samsung_watch');
      setWearablesMessage(null);
      try {
          const response = await api.wearables.startSamsungWatch(String(user.id));
          setWearablesMessage(response.message);
          setLatestSamsungBridge(response);
          await reloadWearables();
      } catch (error: any) {
          setWearablesMessage(error.message || 'Не удалось зарегистрировать Samsung Watch');
      } finally {
          setActiveWearableProvider(null);
      }
  };

  const handleGarminSync = async () => {
      setActiveWearableProvider('garmin');
      setWearablesMessage(null);
      try {
          const response = await api.wearables.syncGarmin(String(user.id), { days: 30, limit: 25 });
          setWearablesMessage(response.message);
          await reloadWearables();
      } catch (error: any) {
          setWearablesMessage(error.message || 'Не удалось синхронизировать Garmin');
      } finally {
          setActiveWearableProvider(null);
      }
  };

  const handleWearableDisconnect = async (provider: WearableProvider) => {
      setActiveWearableProvider(provider);
      setWearablesMessage(null);
      try {
          await api.wearables.disconnect(String(user.id), provider);
          if (provider === 'samsung_watch') {
              setLatestSamsungBridge(null);
          }
          await reloadWearables();
      } catch (error: any) {
          setWearablesMessage(error.message || 'Не удалось отключить устройство');
      } finally {
          setActiveWearableProvider(null);
      }
  };

  const openWearableModal = (provider: WearableProvider) => {
      setWearablesMessage(null);
      setWearableModalProvider(provider);
  };

  const closeWearableModal = () => {
      setWearableModalProvider(null);
  };

  const playerProgressContent = (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                      <h4 className="font-bold text-slate-900">Skill-Radar</h4>
                      <p className="text-sm text-slate-500">Пять ключевых зон, которые влияют на стабильность результатов.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                      <Button variant="outline" size="sm" onClick={resetProgressFromStats}>Пересчитать</Button>
                      {progressRecalcMessage && (
                          <span className="text-xs font-medium text-slate-500 max-w-[260px] text-right">{progressRecalcMessage}</span>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-6 items-start">
                  <SkillRadarChart skills={playerProgress.skills} />

                  <div className="space-y-4">
                      {showSkillDataPlaceholder && (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                              Пока нет достаточной RTT- или матчевой статистики, поэтому `Skill-Radar` не заполняется автоматически. После матчей из RTT-парсера, матчей с подробными метриками или ручного ввода значения появятся здесь.
                          </div>
                      )}

                      {!showSkillDataPlaceholder && rttAnalysisSummary && (
                          <div className="rounded-2xl border border-lime-100 bg-lime-50 p-4 text-sm text-slate-700">
                              <div className="font-bold text-slate-900 mb-1">Анализ RTT</div>
                              <p>
                                  Основано на {rttAnalysisSummary.totalMatches} матчах RTT: побед {rttAnalysisSummary.winRate}%
                                  {rttAnalysisSummary.averageOpponent ? `, средний рейтинг соперников около ${rttAnalysisSummary.averageOpponent}` : ''}
                                  {rttAnalysisSummary.decidingRate !== null ? `, в решающих матчах успешность ${rttAnalysisSummary.decidingRate}%` : ''}.
                              </p>
                          </div>
                      )}

                      {skillMetricConfig.map((metric) => (
                          <div key={metric.key}>
                              <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-bold text-slate-700">{metric.label}</label>
                                  <span className={`text-sm font-bold ${metric.color}`}>{playerProgress.skills[metric.key]}/100</span>
                              </div>
                              <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={playerProgress.skills[metric.key]}
                                  onChange={(event) => updateSkill(metric.key, Number(event.target.value))}
                                  className="w-full accent-lime-500"
                              />
                          </div>
                      ))}

                      {!showSkillDataPlaceholder && (
                          <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-600">
                              Сейчас сильнее всего выглядят <span className="font-bold text-slate-900">{strongestSkill}</span> и <span className="font-bold text-slate-900">{secondStrongestSkill}</span>. Зона роста — <span className="font-bold text-slate-900">{growthSkill}</span>.
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="rounded-[28px] bg-slate-900 text-white p-5">
              <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                      <h4 className="font-bold text-white flex items-center gap-2"><Target size={18} className="text-lime-400" /> {isRttPlayer ? 'Путь к цели' : 'Путь к игровому уровню'}</h4>
                      <p className="text-sm text-slate-300 mt-1">{isRttPlayer ? 'Следите, сколько очков не хватает до цели, и выбирайте турниры с наибольшим потенциалом.' : 'Следите за личным прогрессом и фокусируйтесь на регулярной матчевой практике и любительских соревнованиях.'}</p>
                  </div>
                  <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-slate-400">{isRttPlayer ? 'Текущий уровень' : 'Текущий прогресс'}</div>
                      <div className="text-lg font-bold text-lime-400">{currentRatingPoints} {user.role === 'rtt_pro' ? 'очк.' : 'балл.'}</div>
                  </div>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Цель</label>
                      <input
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          value={playerProgress.goal.title}
                          onChange={(event) => handleGoalTitleChange(event.target.value)}
                          placeholder={isRttPlayer ? 'Например: Войти в топ-50 РТТ до конца года' : 'Например: стабильно доходить до полуфиналов к концу сезона'}
                      />
                      <p className="text-xs text-slate-400 mt-2">{goalIntentHint}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{pointsLabel}</label>
                          <input
                              type="number"
                              min="0"
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                              value={playerProgress.goal.targetPoints}
                              onChange={(event) => updateGoal({ targetPoints: Math.max(0, Number(event.target.value) || 0) })}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{isRttPlayer ? 'Целевой ранг' : 'Ориентир'}</label>
                          <input
                              type="number"
                              min="1"
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                              value={playerProgress.goal.targetRank ?? ''}
                              onChange={(event) => updateGoal({ targetRank: event.target.value ? Math.max(1, Number(event.target.value)) : null })}
                              placeholder={isRttPlayer ? '50' : '10'}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Дедлайн</label>
                          <input
                              type="date"
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                              value={playerProgress.goal.targetDate}
                              onChange={(event) => updateGoal({ targetDate: event.target.value })}
                          />
                      </div>
                  </div>

                  <div className="rounded-3xl bg-white/6 border border-white/10 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-sm text-slate-300">Прогресс к цели</span>
                          <span className="text-sm font-bold text-white">{goalProgressPercent}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-lime-400" style={{ width: `${goalProgressPercent}%` }} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                          <div className="rounded-2xl bg-black/20 px-4 py-3">
                              <div className="text-xs uppercase tracking-wider text-slate-400">Не хватает</div>
                              <div className="text-xl font-bold text-white">{pointsRemaining}</div>
                              <div className="text-xs text-slate-400">{pointsLabel.toLowerCase()}</div>
                          </div>
                          <div className="rounded-2xl bg-black/20 px-4 py-3">
                              <div className="text-xs uppercase tracking-wider text-slate-400">{isRttPlayer ? 'Оценка пути' : 'План практики'}</div>
                              <div className="text-xl font-bold text-white">{tournamentsNeeded}</div>
                              <div className="text-xs text-slate-400">{isRttPlayer ? 'турнира в среднем темпе' : 'соревнований в ближайшем цикле'}</div>
                          </div>
                          <div className="rounded-2xl bg-black/20 px-4 py-3">
                              <div className="text-xs uppercase tracking-wider text-slate-400">{isRttPlayer ? 'По рангу' : 'До ориентира'}</div>
                              <div className="text-xl font-bold text-white">{rankGap ?? '—'}</div>
                              <div className="text-xs text-slate-400">{isRttPlayer ? 'позиций до цели' : 'условных шагов до цели'}</div>
                          </div>
                      </div>
                  </div>

                  <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                              <h5 className="font-bold text-white">{isRttPlayer ? 'Где добрать очки' : 'Как расти любителю'}</h5>
                              <p className="text-xs text-slate-400">
                                  {isRttPlayer
                                      ? 'Рекомендуем турниры с лучшим соотношением близости и потенциальных очков.'
                                      : 'Любителям лучше набирать игровой опыт через любительские турниры, клубные матчи, weekend-серии и внутренние соревнования.'}
                              </p>
                          </div>
                          {isRttPlayer && nearestTournament && (
                              <div className="text-right text-xs text-slate-400">
                                  Ближайший шанс<br />
                                  <span className="font-bold text-slate-200">{nearestTournament.name}</span>
                              </div>
                          )}
                      </div>

                      {isRttPlayer ? (
                          <div className="space-y-3">
                              {upcomingTournamentSuggestions.map(({ tournament, estimatedPoints }) => (
                                  <div key={tournament.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="flex items-start justify-between gap-3">
                                          <div>
                                              <div className="font-bold text-white">{tournament.name}</div>
                                              <div className="text-xs text-slate-400 mt-1">
                                                  {[
                                                      resolveTournamentDate(tournament),
                                                      tournament.category,
                                                      tournament.ageGroup || tournament.age_group,
                                                      tournament.groupName || tournament.group_name || 'без группы'
                                                  ].filter(Boolean).join(' • ')}
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-lg font-bold text-lime-400">+{estimatedPoints}</div>
                                              <div className="text-[11px] uppercase tracking-wider text-slate-400">потенциал</div>
                                          </div>
                                      </div>
                                  </div>
                              ))}

                              {upcomingTournamentSuggestions.length === 0 && (
                                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-400">
                                      Пока нет будущих турниров в базе. Когда они появятся, блок сам покажет, где быстрее всего можно добрать очки.
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="space-y-3">
                              <div className="rounded-2xl border border-lime-400/20 bg-lime-400/10 p-4 text-sm text-slate-200">
                                  Чтобы прогрессировать как любитель, важнее регулярно играть в <span className="font-bold text-white">любительских турнирах, клубных матчах и внутренних соревнованиях</span>. Это даёт игровую практику, устойчивость под счётом и понятную динамику роста.
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="text-xs uppercase tracking-wider text-slate-400">Шаг 1</div>
                                      <div className="font-bold text-white mt-2">Играть регулярно</div>
                                      <div className="text-sm text-slate-300 mt-2">1–2 соревновательных матча в неделю обычно дают лучший рост, чем редкие одиночные старты.</div>
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="text-xs uppercase tracking-wider text-slate-400">Шаг 2</div>
                                      <div className="font-bold text-white mt-2">Выбирать любительские старты</div>
                                      <div className="text-sm text-slate-300 mt-2">Подойдут клубные турниры, weekend-серии, локальные лиги и парные встречи внутри сообщества.</div>
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                      <div className="text-xs uppercase tracking-wider text-slate-400">Шаг 3</div>
                                      <div className="font-bold text-white mt-2">Следить за стабильностью</div>
                                      <div className="text-sm text-slate-300 mt-2">Оценивайте не только победы, но и подачу, выносливость и психологию после каждого матча.</div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
  
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
                               {user.role === 'coach' ? 'Тренер' : user.role === 'rtt_pro' ? 'Игрок РТТ' : user.role === 'tournament_director' ? 'Директор турниров' : 'Любитель'}
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

                {isPlayerProfile && isProgressReady && (
                    <button
                        type="button"
                        onClick={() => setShowProgressModal(true)}
                        className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-6 text-left transition-all hover:shadow-md hover:border-lime-200"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="text-lime-600" size={20} /> Интерактивная карта прогресса
                                </h3>
                                <p className="text-sm sm:text-base text-slate-500 mt-3 max-w-3xl">Обновляйте навыки после матчей или вместе с тренером — изменения сохраняются автоматически.</p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs sm:text-sm font-bold uppercase tracking-wider self-start">
                                <Activity size={14} /> Живая динамика игрока
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                            <div className="px-3 py-2 rounded-2xl bg-lime-50 text-lime-700 font-bold border border-lime-100">
                                {progressSkillHighlightText}
                            </div>
                            <div className="px-3 py-2 rounded-2xl bg-slate-50 text-slate-600 font-bold border border-slate-100">
                                {progressHighlightText}
                            </div>
                            <div className="px-3 py-2 rounded-2xl bg-amber-50 text-amber-700 font-bold border border-amber-100">
                                Нажмите, чтобы открыть детали
                            </div>
                        </div>
                    </button>
                )}
        
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

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-bold flex items-center gap-2"><Watch className="text-slate-900" size={18} /> Мои устройства</h3>
                </div>
                {wearablesLoading && <Loader2 className="animate-spin text-slate-300" size={18} />}
            </div>

            <div className="space-y-3">
                {[
                    {
                        provider: 'garmin' as WearableProvider,
                        connection: garminConnection,
                        title: 'Garmin',
                    },
                    {
                        provider: 'samsung_watch' as WearableProvider,
                        connection: samsungConnection,
                        title: 'Samsung Watch',
                    }
                ].map(({ provider, connection, title }) => {
                    const status = connection?.status || 'disconnected';
                    const isBusy = activeWearableProvider === provider;
                    const isConnected = status === 'connected';

                    return (
                        <div key={provider} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                            <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-slate-900">{title}</div>
                                <Button
                                    size="sm"
                                    variant={isConnected ? 'outline' : 'secondary'}
                                    onClick={() => openWearableModal(provider)}
                                    disabled={isBusy}
                                    className="shrink-0"
                                >
                                    {isBusy ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <LinkIcon size={14} className="mr-1.5" />}
                                    Подключить
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {/* Apple Watch — в разработке */}
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-slate-900">Apple Watch</div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowAppleWatchModal(true)}
                            className="shrink-0"
                        >
                            <LinkIcon size={14} className="mr-1.5" />
                            Подключить
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-bold flex items-center gap-2"><Activity className="text-lime-600" size={18} /> Активность с устройств</h3>
                    <p className="text-sm text-slate-500 mt-1">Последние сессии и суммарная нагрузка за 30 дней.</p>
                </div>
                {wearableActivitiesLoading && <Loader2 className="animate-spin text-slate-300" size={18} />}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-wider text-slate-400">Сессий</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{wearableActivitySummary.activityCount}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-wider text-slate-400">Время</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{formatWearableDuration(wearableActivitySummary.durationSeconds)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-wider text-slate-400">Дистанция</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{Number(wearableActivitySummary.distanceKm || 0).toFixed(1)} км</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-wider text-slate-400">Калории</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{wearableActivitySummary.calories}</div>
                </div>
            </div>

            <div className="space-y-3">
                {wearableActivities.map((activity) => (
                    <div key={`${activity.provider}-${activity.externalActivityId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-bold text-slate-900">{activity.title || activity.activityType}</div>
                                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">
                                        {getWearableProviderTitle(activity.provider)}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{formatWearableDate(activity.startedAt)}</div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                    <span className="rounded-full bg-white px-2 py-1 border border-slate-200">{formatWearableDuration(activity.durationSeconds)}</span>
                                    {activity.distanceKm !== null && activity.distanceKm !== undefined && <span className="rounded-full bg-white px-2 py-1 border border-slate-200">{activity.distanceKm.toFixed(1)} км</span>}
                                    {activity.calories !== null && activity.calories !== undefined && <span className="rounded-full bg-white px-2 py-1 border border-slate-200">{activity.calories} ккал</span>}
                                    {activity.averageHeartRate !== null && activity.averageHeartRate !== undefined && <span className="rounded-full bg-white px-2 py-1 border border-slate-200">пульс {activity.averageHeartRate}</span>}
                                </div>
                            </div>
                            {activity.sourceDevice && <div className="text-right text-xs text-slate-400">{activity.sourceDevice}</div>}
                        </div>
                    </div>
                ))}

                {wearableActivities.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        После запуска мобильного приложения здесь появятся импортированные активности с часов и сводка по нагрузке.
                    </div>
                )}
            </div>
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
                <div className="rounded-2xl border border-lime-200 bg-lime-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-bold text-lime-700 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} /> Уровень игры (NTRP)
                        </label>
                        <span className="px-2.5 py-1 rounded-full bg-white border border-lime-200 text-[10px] font-black uppercase tracking-[0.18em] text-lime-700 whitespace-nowrap">
                            Влияет на подбор
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Обновляйте уровень по мере прогресса — так система точнее подбирает соперников и подходящие лиги.
                    </p>
                    <select 
                        className="w-full bg-white border-2 border-lime-300 rounded-xl px-4 py-3 outline-none focus:border-lime-500" 
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

    <Modal isOpen={showProgressModal} onClose={() => setShowProgressModal(false)} title="Интерактивная карта прогресса" maxWidth="max-w-6xl" bodyClassName="max-h-[78vh]">
        {isPlayerProfile && isProgressReady && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Живая динамика игрока</h3>
                        <p className="text-sm text-slate-500 mt-1">Здесь собраны обе фичи: карта навыков и трекер пути к цели.</p>
                    </div>
                    <div className="px-3 py-2 rounded-2xl bg-lime-50 text-lime-700 font-bold border border-lime-100 text-sm self-start">
                        {progressHighlightText}
                    </div>
                </div>
                {playerProgressContent}
            </div>
        )}
    </Modal>

    <Modal isOpen={showAppleWatchModal} onClose={() => setShowAppleWatchModal(false)} title="Apple Watch" maxWidth="max-w-md">
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl">⌚</div>
                <div className="text-center">
                    <div className="font-bold text-slate-900 text-lg">Функционал в разработке</div>
                    <p className="text-sm text-slate-500 mt-1">Интеграция с Apple Watch появится вместе с мобильным приложением.</p>
                </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Мы уже готовим поддержку Apple Watch. После релиза мобильного приложения данные о тренировках, пульсе и нагрузке будут синхронизироваться автоматически.
            </div>
            <button
                onClick={() => setShowAppleWatchModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
            >
                Понятно
            </button>
        </div>
    </Modal>

    <Modal isOpen={Boolean(wearableModalProvider)} onClose={closeWearableModal} title={activeWearableTitle} maxWidth="max-w-md">
        {wearableModalProvider && (
            <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl">⌚</div>
                    <div className="text-center">
                        <div className="font-bold text-slate-900 text-lg">Функционал в разработке</div>
                        <p className="text-sm text-slate-500 mt-1">Интеграция с {activeWearableTitle} появится вместе с мобильным приложением.</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Мы уже готовим поддержку {activeWearableTitle}. После релиза мобильного приложения данные о тренировках, пульсе и нагрузке будут синхронизироваться автоматически.
                </div>
                <button
                    onClick={closeWearableModal}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
                >
                    Понятно
                </button>
            </div>
        )}
    </Modal>
    </>
  );
};

export default ProfileView;

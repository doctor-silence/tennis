import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { CommunityOnboarding } from './CommunityOnboarding';
import { Heart, MessageCircle, Calendar, Globe, Swords, Trophy, Users, ShoppingCart, Share2, Loader2, X, PlusCircle, CheckCircle, ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../Button';
import Tooltip from '../Tooltip';
import { MarketplaceItem, LadderPlayer, User, Group, Tournament } from '../../types';
import { Modal } from '../Shared';

const getGroupCover = (group: Group) => {
    const possibleImage = (group as Group & { image?: string; coverImage?: string; cover_image?: string }).avatar
        || (group as Group & { image?: string; coverImage?: string; cover_image?: string }).image
        || (group as Group & { image?: string; coverImage?: string; cover_image?: string }).coverImage
        || (group as Group & { image?: string; coverImage?: string; cover_image?: string }).cover_image;

    if (possibleImage) {
        return possibleImage;
    }

    const palette = [
        'from-blue-500 via-indigo-500 to-violet-500',
        'from-emerald-500 via-lime-500 to-green-500',
        'from-orange-500 via-amber-500 to-yellow-500',
        'from-fuchsia-500 via-pink-500 to-rose-500',
        'from-cyan-500 via-sky-500 to-blue-500'
    ];
    const index = (group.name || '').length % palette.length;
    return palette[index];
};

const isTournamentLive = (tournament: Tournament) => {
    const status = (tournament.status || '').toLowerCase();
    const stageStatus = (tournament.stageStatus || tournament.stage_status || '').toLowerCase();

    if (status === 'live') {
        return true;
    }

    return ['live', 'в игре', 'идут', 'started', 'in progress', 'in_progress'].some((value) => stageStatus.includes(value));
};

const isTournamentFinished = (tournament: Tournament) => {
    const status = (tournament.status || '').toLowerCase();
    const stageStatus = (tournament.stageStatus || tournament.stage_status || '').toLowerCase();

    if (status === 'finished') {
        return true;
    }

    return ['finished', 'завершен', 'завершён', 'турнир завершен', 'турнир завершён', 'completed'].some((value) => stageStatus.includes(value));
};

const isUpcomingCommunityTournament = (tournament: Tournament) => {
    if (!['admin', 'tournament_director'].includes(tournament.creator_role || '')) {
        return false;
    }

    return !isTournamentLive(tournament) && !isTournamentFinished(tournament);
};

const normalizeTournamentText = (value?: string | null) =>
    String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();

const extractTournamentAgeBucket = (value?: string | null): string | null => {
    const normalized = normalizeTournamentText(value);
    if (!normalized) return null;
    if (normalized.includes('9-10') || normalized.includes('9–10')) return '9-10';
    if (normalized.includes('до 13')) return '12u';
    if (normalized.includes('до 15')) return '14u';
    if (normalized.includes('до 17')) return '16u';
    if (normalized.includes('до 19')) return '18u';
    if (normalized.includes('взросл')) return 'adult';
    return null;
};

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

const normalizeTournamentSystemCode = (value?: string | null) => {
    const normalized = normalizeTournamentText(value);
    if (!normalized) return 'uo';
    if (normalized.includes('оидт')) return 'oidt';
    if (normalized.includes('ком')) return 'team';
    if (normalized === 'о.' || normalized === 'о' || normalized.includes('олимп')) return 'o';
    return 'uo';
};

const RTT_ALLOWED_DRAW_SIZES = new Set([4, 8, 16, 24, 32, 48, 56, 64]);

const cleanTournamentCategoryLabel = (value?: string | null) => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '—';

    return raw
        .replace(/\s+(корты|покрытие)\s*:\s*.*$/i, '')
        .replace(/\s+корты\s+.*$/i, '')
        .trim();
};

const getTournamentPointsBase = (categoryCode: string, ageBucket?: string | null) => {
    const pointsMap: Record<string, Record<string, number>> = {
        '9-10': { FT: 40, '1A': 36, '1B': 32, '2A': 28, '2B': 24, '3A': 18, '3B': 16, '3V': 15, '4A': 12, '4B': 11, '4V': 10, '5A': 9, '5B': 8, '5V': 7, '5G': 6, '6A': 5, '6B': 4, '6V': 3, '6G': 2, '6D': 1 },
        '12u': { FT: 150, '1A': 130, '1B': 120, '2A': 105, '2B': 95, '3A': 80, '3B': 75, '3V': 70, '4A': 60, '4B': 55, '4V': 50, '5A': 45, '5B': 40, '5V': 35, '5G': 22 },
        '14u': { FT: 350, '1A': 250, '1B': 230, '2A': 200, '2B': 180, '3A': 150, '3B': 130, '3V': 120, '4A': 100, '4B': 90, '4V': 85, '5A': 75, '5B': 70, '5V': 60, '5G': 22 },
        '16u': { FT: 550, '1A': 450, '1B': 430, '2A': 400, '2B': 350, '3A': 300, '3B': 280, '3V': 250, '4A': 200, '4B': 180, '4V': 150, '5A': 120, '5B': 100, '5V': 90, '5G': 47 },
        '18u': { FT: 900, '1A': 700, '1B': 650, '2A': 550, '2B': 500, '3A': 400, '3B': 350, '3V': 300, '4A': 260, '4B': 230, '4V': 210, '5A': 180, '5B': 150, '5V': 120, '5G': 63 },
        adult: { FT: 900, '1A': 700, '1B': 650, '2A': 550, '2B': 500, '3A': 400, '3B': 350, '3V': 300, '4A': 260, '4B': 230, '4V': 210, '5A': 180, '5B': 150, '5V': 120, '5G': 63 }
    };

    const bucket = ageBucket || 'adult';
    const table = pointsMap[bucket] || pointsMap.adult;
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

const getParticipantsMultiplier = (participants: number) => {
    if (participants >= 32) return 1;
    if (participants >= 24) return 0.88;
    if (participants >= 16) return 0.72;
    if (participants >= 8) return 0.52;
    return 0.35;
};

const getSystemMultiplier = (systemCode: string) => {
    if (systemCode === 'oidt') return 0.9;
    if (systemCode === 'o') return 0.72;
    if (systemCode === 'team') return 0.4;
    return 1;
};

const resolveParsedRttParticipantsCount = (tournamentDetails?: any) => {
    const parsedParticipantsCount = Array.isArray(tournamentDetails?.participants)
        ? tournamentDetails.participants.filter(Boolean).length
        : 0;

    if (Number.isFinite(parsedParticipantsCount) && parsedParticipantsCount > 0) {
        return parsedParticipantsCount;
    }

    const directDetailsCount = Number(tournamentDetails?.participantsCount || 0);
    if (Number.isFinite(directDetailsCount) && directDetailsCount > 0) {
        return directDetailsCount;
    }

    return 0;
};

const resolveTournamentParticipants = (tournament: Tournament, tournamentDetails?: any) => {
    const hasRttLink = Boolean(tournament?.rtt_link || tournament?.rttLink);
    const parsedRttParticipantsCount = resolveParsedRttParticipantsCount(tournamentDetails);

    if (hasRttLink && parsedRttParticipantsCount > 0) {
        return parsedRttParticipantsCount;
    }

    const directValue = Number(tournamentDetails?.participantsCount || tournament.participants_count || tournament.participantsCount || 0);
    if (Number.isFinite(directValue) && directValue > 0) return directValue;

    const firstRound = tournament.rounds?.[0];
    const firstRoundMatches = firstRound?.matches?.length || 0;
    if (firstRoundMatches > 0) {
        return firstRoundMatches * 2;
    }

    return 8;
};

const resolveTournamentParticipantLimit = (tournament: Tournament, tournamentDetails?: any) => {
    const hasRttLink = Boolean(tournament?.rtt_link || tournament?.rttLink);
    const parsedRttParticipantsCount = resolveParsedRttParticipantsCount(tournamentDetails);

    if (hasRttLink) {
        const officialRows = parseOfficialTournamentPointsTable(tournamentDetails);
        const recommendedOfficialRow = getRecommendedOfficialPointsRow(officialRows, parsedRttParticipantsCount || 0);

        if (recommendedOfficialRow?.drawSize && recommendedOfficialRow.drawSize > 0) {
            return recommendedOfficialRow.drawSize;
        }

        if (parsedRttParticipantsCount > 0) {
            return parsedRttParticipantsCount;
        }
    }

    const directValue = Number(tournament.participants_count || tournament.participantsCount || 0);
    if (Number.isFinite(directValue) && directValue > 0) {
        return directValue;
    }

    return resolveTournamentParticipants(tournament, tournamentDetails);
};

const resolveTournamentApprovedParticipants = (tournament: Tournament, tournamentDetails?: any) => {
    const hasRttLink = Boolean(tournament?.rtt_link || tournament?.rttLink);
    const parsedRttParticipantsCount = resolveParsedRttParticipantsCount(tournamentDetails);

    if (hasRttLink && parsedRttParticipantsCount > 0) {
        return parsedRttParticipantsCount;
    }

    const approvedCount = Number(tournament.approved_applications_count || 0);
    if (Number.isFinite(approvedCount) && approvedCount >= 0) {
        return approvedCount;
    }

    return 0;
};

const estimateTournamentPointsByPlace = (tournament: Tournament, place: number, tournamentDetails?: any) => {
    const participants = resolveTournamentParticipants(tournament, tournamentDetails);
    const ageBucket = extractTournamentAgeBucket(tournamentDetails?.ageGroup || tournament.age_group || tournament.ageGroup || tournament.group_name || tournament.groupName || '');
    const categoryCode = normalizeTournamentCategoryCode(tournamentDetails?.category || tournament.category);
    const systemCode = normalizeTournamentSystemCode(tournamentDetails?.system || tournament.system);
    const championPoints = getTournamentPointsBase(categoryCode, ageBucket) * getParticipantsMultiplier(participants) * getSystemMultiplier(systemCode);

    const placeMultiplier = Math.pow(place, -0.42);
    return Math.max(1, Math.round(championPoints * placeMultiplier));
};

const parseOfficialTournamentPointsTable = (tournamentDetails?: any) => {
    if (!Array.isArray(tournamentDetails?.pointsTable)) {
        return [];
    }

    return tournamentDetails.pointsTable
        .map((row: any) => {
            const stageLabel = String(row?.stage || '').trim();
            const drawSize = Number(stageLabel.replace(/\D/g, ''));
            const values = String(row?.points || '')
                .split(',')
                .map((value) => String(value).trim())
                .filter((value) => value.length > 0);

            if (!stageLabel || !Number.isFinite(drawSize) || !RTT_ALLOWED_DRAW_SIZES.has(drawSize) || values.length === 0) {
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

const getRecommendedOfficialPointsRow = (rows: Array<{ stageLabel: string; drawSize: number | null; values: string[] }>, participants: number) => {
    const rowsWithDraw = rows.filter((row) => Number.isFinite(row.drawSize) && (row.drawSize || 0) > 0);

    if (!rowsWithDraw.length) {
        return null;
    }

    const exactMatch = rowsWithDraw.find((row) => row.drawSize === participants);
    if (exactMatch) {
        return exactMatch;
    }

    const largerMatch = rowsWithDraw
        .filter((row) => (row.drawSize || 0) >= participants)
        .sort((left, right) => (left.drawSize || 0) - (right.drawSize || 0))[0];

    if (largerMatch) {
        return largerMatch;
    }

    return rowsWithDraw.sort((left, right) => (right.drawSize || 0) - (left.drawSize || 0))[0];
};

const buildTournamentPointsPreviewRows = (tournament: Tournament, tournamentDetails?: any) => {
    const participants = resolveTournamentParticipants(tournament, tournamentDetails);
    const ranges = [
        { label: '1 место', from: 1, to: 1 },
        { label: '2 место', from: 2, to: 2 },
        { label: '3–4 место', from: 3, to: Math.min(4, participants) },
        { label: '5–8 место', from: 5, to: Math.min(8, participants) },
        { label: '9–16 место', from: 9, to: Math.min(16, participants) },
        { label: '17–32 место', from: 17, to: Math.min(32, participants) }
    ];

    return ranges
        .filter((range) => range.from <= participants)
        .map((range) => {
            const fromPoints = estimateTournamentPointsByPlace(tournament, range.from, tournamentDetails);
            const toPoints = estimateTournamentPointsByPlace(tournament, range.to, tournamentDetails);
            return {
                label: range.label,
                points: fromPoints === toPoints ? `${fromPoints}` : `${fromPoints}–${toPoints}`
            };
        });
};

const TournamentPointsPreview = ({ tournament, tournamentDetails }: { tournament: Tournament, tournamentDetails?: any }) => {
    const participants = resolveTournamentParticipants(tournament, tournamentDetails);
    const officialRows = parseOfficialTournamentPointsTable(tournamentDetails);
    const recommendedOfficialRow = getRecommendedOfficialPointsRow(officialRows, participants);
    const fallbackRows = buildTournamentPointsPreviewRows(tournament, tournamentDetails);
    const maxOfficialColumns = officialRows.reduce((max, row) => Math.max(max, row.values.length), 0);
    const useStageHeaders = maxOfficialColumns > 0 && maxOfficialColumns <= 7;
    const officialHeaders = useStageHeaders
        ? ['П', 'Ф', '1/2', '1/4', '1/8', '1/16', '1/32'].slice(0, maxOfficialColumns)
        : Array.from({ length: maxOfficialColumns }, (_, index) => `${index + 1}`);
    const isOfficial = officialRows.length > 0;
    const displayCategory = cleanTournamentCategoryLabel(tournamentDetails?.category || tournament.category || '—');
    const displayAgeGroup = tournamentDetails?.ageGroup || tournament.age_group || tournament.ageGroup || 'возраст не указан';
    const displaySystem = tournamentDetails?.system || tournament.system || 'система не указана';
    const drawSizeLabel = recommendedOfficialRow?.drawSize && recommendedOfficialRow.drawSize !== participants
        ? ` • рекомендованная сетка ${recommendedOfficialRow.drawSize}`
        : '';

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className="font-bold text-slate-900">Таблица очков</h4>
                    <p className="text-xs text-slate-500 mt-1">
                        Категория {displayCategory} • {displayAgeGroup} • {displaySystem} • {participants} участников{drawSizeLabel}
                    </p>
                </div>
                <div className="text-right text-[11px] text-slate-400 uppercase tracking-wider">{isOfficial ? 'RTT' : 'оценка'}</div>
            </div>

            {isOfficial ? (
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
                                        <td className={`px-3 py-2 font-bold ${isRecommended ? 'text-lime-700' : 'text-slate-700'}`}>
                                            {row.stageLabel}
                                        </td>
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
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-2 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <div className="px-3 py-2">Место</div>
                        <div className="px-3 py-2 text-right">Очки</div>
                    </div>
                    {fallbackRows.map((row) => (
                        <div key={row.label} className="grid grid-cols-2 border-t border-slate-100 text-sm">
                            <div className="px-3 py-2 text-slate-700">{row.label}</div>
                            <div className="px-3 py-2 text-right font-bold text-slate-900">{row.points}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const getTournamentDisplayStatus = (status?: string | null) => {
    if (status === 'draft') return 'Набор';
    if (status === 'open') return 'Регистрация';
    if (status === 'live') return 'Идет';
    if (status === 'finished') return 'Завершен';
    return status || 'Не указан';
};

const buildTelegramLink = (value?: string | null) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const handle = normalized.replace(/^@+/, '');
    return handle ? `https://t.me/${handle}` : '';
};

const buildContactLink = (value?: string | null) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    return /^https?:\/\//i.test(normalized) ? normalized : '';
};

const TournamentDetailsModal = ({
    isOpen,
    onClose,
    tournament,
    tournamentDetails,
    loadingTournamentDetails,
    currentUserId,
    onStartConversation,
    canApply = false,
    hasApplied = false,
    isApplying = false,
    applicationStatus = null,
    onApply,
}: {
    isOpen: boolean;
    onClose: () => void;
    tournament: any;
    tournamentDetails?: any;
    loadingTournamentDetails?: boolean;
    currentUserId?: string;
    onStartConversation?: (partnerId: string) => void;
    canApply?: boolean;
    hasApplied?: boolean;
    isApplying?: boolean;
    applicationStatus?: { message: string; type: 'success' | 'error' } | null;
    onApply?: () => void;
}) => {
    if (!tournament) {
        return null;
    }

    const hasRttLink = Boolean(tournament?.rtt_link || tournament?.rttLink);
    const shouldWaitForRttDetails = hasRttLink && !tournamentDetails;
    const participantLimit = resolveTournamentParticipantLimit(tournament, tournamentDetails);
    const approvedParticipantsCount = resolveTournamentApprovedParticipants(tournament, tournamentDetails);
    const isTournamentFull = participantLimit > 0 && approvedParticipantsCount >= participantLimit;
    const participantsDisplay = participantLimit > 0
        ? `${approvedParticipantsCount}/${participantLimit}`
        : String(approvedParticipantsCount);
    const statusLabel = getTournamentDisplayStatus(tournament.status);
    const categoryLabel = cleanTournamentCategoryLabel(tournamentDetails?.category || tournament.category || 'Не указана');
    const tournamentTypeLabel = tournament.tournament_type || tournament.tournamentType || 'Не указан';
    const genderLabel = tournament.gender || 'Не указан';
    const ageLabel = tournamentDetails?.ageGroup || tournament.age_group || tournament.ageGroup || 'Не указана';
    const systemLabel = tournamentDetails?.system || tournament.system || 'Не указана';
    const formatLabel = tournament.match_format || tournament.matchFormat || 'Не указан';
    const startDateLabel = (tournament.start_date || tournament.startDate) && !isNaN(new Date(tournament.start_date || tournament.startDate).getTime())
        ? new Date(tournament.start_date || tournament.startDate).toLocaleDateString('ru-RU')
        : 'Не указана';
    const endDateLabel = (tournament.end_date || tournament.endDate) && !isNaN(new Date(tournament.end_date || tournament.endDate).getTime())
        ? new Date(tournament.end_date || tournament.endDate).toLocaleDateString('ru-RU')
        : 'Не указана';
    const tournamentMeta = getTournamentMetaLabel(tournament.prize_pool || tournament.prizePool);
    const organizerRole = String(tournament.creator_role || tournament.creatorRole || '').trim();
    const directorDisplayName = String(tournament.director_name || '').trim();
    const rttOrganizerName = String(tournamentDetails?.organizerName || tournamentDetails?.organizer || '').trim();
    const rttOrganizerPhone = String(tournamentDetails?.organizerPhone || '').trim();
    const rttOrganizerEmail = String(tournamentDetails?.organizerEmail || '').trim();
    const rttOrganizerContacts = String(tournamentDetails?.organizerContacts || '').trim();
    const hasDirectorContacts = Boolean(
        tournament.director_email
        || tournament.director_phone
        || tournament.director_telegram
        || tournament.director_max
    );
    const hasRttOrganizerContacts = Boolean(rttOrganizerPhone || rttOrganizerEmail || rttOrganizerContacts);
    const isDirectorTournament = organizerRole === 'tournament_director' || Boolean(directorDisplayName || hasDirectorContacts);
    const organizerName = isDirectorTournament
        ? directorDisplayName || 'Директор турнира'
        : rttOrganizerName
            ? rttOrganizerName
        : organizerRole === 'admin'
            ? 'Организатор турнира'
            : tournament.creator_name
                || getTournamentAnnouncementAuthorName(tournament, tournament.author_name || tournament.authorName || null)
                || 'Организатор турнира';
    const organizerId = String(
        tournament.user_id
        || tournament.userId
        || tournament.creator_id
        || tournament.creatorId
        || tournament.author_id
        || tournament.authorId
        || tournament.author?.id
        || ''
    ).trim();
    const canMessageOrganizer = Boolean(isDirectorTournament && onStartConversation && organizerId);
    const directorEmail = String(tournament.director_email || '').trim();
    const directorPhone = String(tournament.director_phone || '').trim();
    const directorTelegram = String(tournament.director_telegram || '').trim();
    const directorMax = String(tournament.director_max || '').trim();
    const telegramLink = buildTelegramLink(directorTelegram);
    const maxLink = buildContactLink(directorMax);
    const locationLabel = [
        tournament.club_name,
        tournament.court_name,
        tournament.address,
        tournament.location,
        tournament.city,
    ]
        .map((value) => String(value || '').trim())
        .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
        .join(' • ') || 'Локация уточняется';
    const heroBadges = [categoryLabel, tournamentTypeLabel, genderLabel].filter((value) => value && value !== 'Не указан' && value !== 'Не указана');
    const participantsCardLabel = hasRttLink ? 'Участники RTT' : 'Участники';
    const slotsLabel = hasRttLink ? 'Мест в сетке RTT' : 'Свободные места';
    const occupiedLabel = hasRttLink ? 'Участников по RTT' : 'Уже в сетке';
    const detailCards = [
        { icon: Calendar, label: 'Даты турнира', value: `${startDateLabel} — ${endDateLabel}`, tone: 'from-blue-500/15 to-cyan-500/10 border-blue-100' },
        { icon: Users, label: participantsCardLabel, value: participantsDisplay, tone: 'from-emerald-500/15 to-lime-500/10 border-emerald-100' },
        { icon: Trophy, label: tournamentMeta.label, value: tournamentMeta.value, tone: 'from-amber-500/15 to-orange-500/10 border-amber-100' },
        { icon: Globe, label: 'Локация', value: locationLabel, tone: 'from-fuchsia-500/15 to-pink-500/10 border-fuchsia-100' },
        { icon: Swords, label: 'Формат', value: formatLabel, tone: 'from-violet-500/15 to-indigo-500/10 border-violet-100' },
        { icon: CheckCircle, label: 'Статус', value: statusLabel, tone: 'from-slate-500/12 to-slate-300/8 border-slate-200' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tournament?.name || tournament?.title || ''}
            maxWidth="max-w-6xl"
            bodyClassName="p-0"
        >
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_52%,_#0f766e_100%)] px-6 pb-6 pt-5 text-white md:px-8 md:pb-8 md:pt-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                        {statusLabel}
                    </span>
                    {heroBadges.map((badge) => (
                        <span key={badge} className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
                            {badge}
                        </span>
                    ))}
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold text-white/70">Турнир, в который хочется зайти уже сейчас</p>
                        <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                            {tournament?.name || tournament?.title || 'Турнир'}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78 md:text-base">
                            {locationLabel} • {startDateLabel} — {endDateLabel} • {formatLabel}. {isTournamentFull
                                ? 'Сетка уже заполнена сильными участниками.'
                                : 'Открытая возможность сыграть, показать уровень и попасть в заметный турнирный состав.'}
                        </p>
                    </div>

                    <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/65">Организатор</div>
                        {canMessageOrganizer ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onStartConversation?.(organizerId);
                                    onClose();
                                }}
                                className="group mt-2 inline-flex max-w-full flex-col items-start text-left text-white transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                            >
                                <span className="inline-flex items-center gap-2 text-lg font-black text-white transition-colors group-hover:text-emerald-200">
                                    <span className="max-w-full truncate">{organizerName || 'Организатор турнира'}</span>
                                    <MessageCircle size={16} className="shrink-0 text-white/75 transition-colors group-hover:text-emerald-200" />
                                </span>
                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/65 transition-colors group-hover:text-white/90">
                                    Написать директору
                                </span>
                            </button>
                        ) : (
                            <div className="mt-2 text-lg font-black text-white">{organizerName || 'Организатор турнира'}</div>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-black/15 px-4 py-3">
                            <div className="min-w-0">
                                <div className="min-h-[2rem] text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-white/55 sm:text-[11px]">{slotsLabel}</div>
                                <div className="mt-1 text-2xl font-black leading-none text-white">
                                    {participantLimit > 0 ? Math.max(participantLimit - approvedParticipantsCount, 0) : '∞'}
                                </div>
                            </div>
                            <div className="min-w-0 text-right">
                                <div className="ml-auto min-h-[2rem] text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-white/55 sm:text-[11px]">{occupiedLabel}</div>
                                <div className="mt-1 text-xl font-black leading-none text-emerald-300">{participantsDisplay}</div>
                            </div>
                        </div>
                        {isDirectorTournament && (directorEmail || directorPhone || directorTelegram || directorMax) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {directorEmail && (
                                    <a
                                        href={`mailto:${directorEmail}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <Mail size={14} /> {directorEmail}
                                    </a>
                                )}
                                {directorPhone && (
                                    <a
                                        href={`tel:${directorPhone.replace(/\s+/g, '')}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <Phone size={14} /> {directorPhone}
                                    </a>
                                )}
                                {directorTelegram && (
                                    <a
                                        href={telegramLink || undefined}
                                        target={telegramLink ? '_blank' : undefined}
                                        rel={telegramLink ? 'noreferrer' : undefined}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <MessageCircle size={14} /> Telegram: {directorTelegram}
                                    </a>
                                )}
                                {directorMax && (
                                    <a
                                        href={maxLink || undefined}
                                        target={maxLink ? '_blank' : undefined}
                                        rel={maxLink ? 'noreferrer' : undefined}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <MessageCircle size={14} /> MAX: {directorMax}
                                    </a>
                                )}
                            </div>
                        )}
                        {!isDirectorTournament && hasRttOrganizerContacts && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {rttOrganizerEmail && (
                                    <a
                                        href={`mailto:${rttOrganizerEmail}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <Mail size={14} /> {rttOrganizerEmail}
                                    </a>
                                )}
                                {rttOrganizerPhone && (
                                    <a
                                        href={`tel:${rttOrganizerPhone.replace(/\s+/g, '')}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                                    >
                                        <Phone size={14} /> {rttOrganizerPhone}
                                    </a>
                                )}
                                {rttOrganizerContacts && !rttOrganizerEmail && !rttOrganizerPhone && (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90">
                                        <MessageCircle size={14} /> {rttOrganizerContacts}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/80 p-6 md:p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {detailCards.map(({ icon: Icon, label, value, tone }) => (
                        <div key={label} className={`rounded-[24px] border bg-gradient-to-br ${tone} p-4 shadow-sm`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
                                    <div className="mt-2 text-lg font-black leading-snug text-slate-900 break-words">{value}</div>
                                </div>
                                <div className="rounded-2xl bg-white/80 p-2 text-slate-700 shadow-sm">
                                    <Icon size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Турнирная конфигурация</div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="text-slate-400">Возраст</div>
                                <div className="mt-1 font-bold text-slate-900">{ageLabel}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="text-slate-400">Система</div>
                                <div className="mt-1 font-bold text-slate-900">{systemLabel}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="text-slate-400">Разряд</div>
                                <div className="mt-1 font-bold text-slate-900">{tournamentTypeLabel}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="text-slate-400">Пол</div>
                                <div className="mt-1 font-bold text-slate-900">{genderLabel}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Почему стоит участвовать</div>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                                <CheckCircle className="mt-0.5 text-emerald-500" size={18} />
                                <div><span className="font-bold text-slate-900">Живой соревновательный опыт.</span> Актуальная сетка, понятный формат и быстрый вход в турнир.</div>
                            </div>
                            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3">
                                <Calendar className="mt-0.5 text-blue-500" size={18} />
                                <div><span className="font-bold text-slate-900">Удобные даты.</span> Сразу видно сроки проведения и загрузку по участникам.</div>
                            </div>
                            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3">
                                <Trophy className="mt-0.5 text-amber-500" size={18} />
                                <div><span className="font-bold text-slate-900">Спортивный интерес.</span> {tournamentMeta.label}: {tournamentMeta.value} и хороший повод проверить себя в игре.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 md:px-8 pb-6 md:pb-8">
                {shouldWaitForRttDetails && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={16} /> Загружаю RTT-данные турнира...
                    </div>
                )}
                {!shouldWaitForRttDetails && hasRttLink && (
                    <TournamentPointsPreview tournament={tournament} tournamentDetails={tournamentDetails} />
                )}
            </div>

            {(canApply || hasApplied || isTournamentFull) && (
                <div className="border-t border-slate-200 bg-white p-4 md:p-5">
                    {applicationStatus && (
                        <div className={`mb-4 text-center p-2 rounded-lg text-sm ${applicationStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {applicationStatus.message}
                        </div>
                    )}
                    {isTournamentFull && !hasApplied ? (
                        <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                            Прием заявок не ведется
                        </div>
                    ) : (
                        <div className="rounded-[24px] bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-800 p-[1px] shadow-lg">
                            <div className="rounded-[23px] bg-white/95 p-4 backdrop-blur-sm md:flex md:items-center md:justify-between md:gap-4">
                                <div className="mb-4 md:mb-0">
                                    <div className="text-sm font-black text-slate-900">
                                        {hasApplied ? 'Вы уже в числе кандидатов на участие' : 'Готовы выйти на корт?'}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                        {hasApplied
                                            ? 'Организатор уже получил вашу заявку и сможет подтвердить участие.'
                                            : 'Отправьте заявку сейчас, пока в сетке есть свободные места.'}
                                    </div>
                                </div>
                                <Button
                                    onClick={onApply}
                                    className="w-full md:w-auto md:min-w-[260px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 hover:opacity-95"
                                    disabled={isApplying || hasApplied}
                                >
                                    {isApplying
                                        ? <Loader2 className="animate-spin" />
                                        : hasApplied
                                            ? 'Заявка отправлена'
                                            : 'Хочу участвовать'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

const getTournamentStartDate = (tournament: Tournament) => {
    const rawDate = tournament.start_date || tournament.startDate;

    if (!rawDate) {
        return null;
    }

    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getTournamentEndDate = (tournament: Tournament) => {
    const rawDate = tournament.end_date || tournament.endDate || tournament.start_date || tournament.startDate;

    if (!rawDate) {
        return null;
    }

    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getTournamentAnnouncementAuthorName = (tournament?: Partial<Tournament> | null, fallbackAuthorName?: string | null) => {
    if (tournament?.creator_role === 'admin') {
        return 'Администрация';
    }

    return (fallbackAuthorName || '').trim() || 'Организатор';
};

const getTournamentStatusLabel = (status?: string | null) => {
    const normalizedStatus = String(status || '').toLowerCase();

    if (normalizedStatus === 'draft') return 'Набор';
    if (normalizedStatus === 'open') return 'Регистрация';
    if (normalizedStatus === 'live') return 'Идёт';
    if (normalizedStatus === 'finished') return 'Завершён';

    return status || 'Не указан';
};

const normalizeComparableValue = (value?: string | null) => String(value || '').trim().toLowerCase();

const doesPostBelongToTournament = (post: any, tournament: Tournament) => {
    const postContent = post?.content || {};
    const postTournamentId = normalizeComparableValue(postContent.tournamentId);
    const tournamentId = normalizeComparableValue(tournament.id);

    if (postTournamentId && tournamentId && postTournamentId === tournamentId) {
        return true;
    }

    const postTournamentName = normalizeComparableValue(postContent.tournamentName || postContent.title);
    const tournamentName = normalizeComparableValue(tournament.name);

    if (!postTournamentName || !tournamentName || postTournamentName !== tournamentName) {
        return false;
    }

    const postGroupId = normalizeComparableValue(post.group_id || post.groupId || postContent.groupId);
    const tournamentGroupId = normalizeComparableValue(tournament.target_group_id || tournament.targetGroupId);

    if (postGroupId && tournamentGroupId) {
        return postGroupId === tournamentGroupId;
    }

    const postGroupName = normalizeComparableValue(postContent.groupName);
    const tournamentGroupName = normalizeComparableValue(tournament.groupName || tournament.group_name);

    if (postGroupName && tournamentGroupName) {
        return postGroupName === tournamentGroupName;
    }

    return true;
};

const doesAnnouncementKindMatch = (post: any, kind: 'upcoming' | 'started') => {
    const postKind = post?.content?.announcementKind;

    if (postKind) {
        return postKind === kind;
    }

    return kind === 'started';
};

const getTournamentWinnerData = (tournament: Tournament) => {
    const finalRound = tournament.rounds?.[tournament.rounds.length - 1];
    const finalMatch = finalRound?.matches?.[0];

    if (!finalMatch?.winnerId) {
        return null;
    }

    const winner = finalMatch.player1?.id === finalMatch.winnerId
        ? finalMatch.player1
        : finalMatch.player2?.id === finalMatch.winnerId
            ? finalMatch.player2
            : null;

    if (!winner?.name) {
        return null;
    }

    return {
        winnerName: winner.name,
        winnerAvatar: winner.avatar || getAvatarFallbackUrl(winner.name, 'f59e0b'),
    };
};

const buildTournamentAnnouncementContent = (tournament: Tournament, announcementKind: 'upcoming' | 'started', authorName: string, date: string) => ({
    tournamentId: String(tournament.id),
    announcementKind,
    title: tournament.name,
    name: tournament.name,
    groupName: tournament.groupName || tournament.group_name,
    prizePool: tournament.prize_pool || tournament.prizePool,
    date,
    authorName,
    groupId: tournament.target_group_id || tournament.targetGroupId,
    status: tournament.status,
    stageStatus: tournament.stageStatus || tournament.stage_status,
    category: tournament.category,
    tournamentType: tournament.tournament_type || tournament.tournamentType,
    gender: tournament.gender,
    ageGroup: tournament.age_group || tournament.ageGroup,
    system: tournament.system,
    matchFormat: tournament.match_format || tournament.matchFormat,
    participantsCount: resolveTournamentParticipants(tournament),
    startDate: tournament.start_date || tournament.startDate,
    endDate: tournament.end_date || tournament.endDate,
    creatorRole: tournament.creator_role,
    rttLink: tournament.rtt_link,
    rtt_link: tournament.rtt_link,
});

const buildUpcomingAdminTournamentAnnouncementPosts = (tournaments: Tournament[], posts: any[], user: User) => {
    return tournaments
        .filter((tournament) => isUpcomingCommunityTournament(tournament))
        .filter((tournament) => !posts.some((post) => post.type === 'tournament_announcement' && doesAnnouncementKindMatch(post, 'upcoming') && doesPostBelongToTournament(post, tournament)))
        .map((tournament) => {
            const announcementDate = (getTournamentStartDate(tournament) || new Date()).toISOString();
            const authorName = getTournamentAnnouncementAuthorName(tournament);

            return {
                id: `derived-upcoming-tournament-announcement-${tournament.id}`,
                type: 'tournament_announcement',
                created_at: announcementDate,
                liked_by_user: false,
                likes_count: 0,
                comments: [],
                author: {
                    id: tournament.userId || user.id,
                    name: authorName,
                    avatar: user.avatar,
                    role: tournament.creator_role,
                },
                content: buildTournamentAnnouncementContent(tournament, 'upcoming', authorName, announcementDate),
            };
        });
};

const buildLiveTournamentAnnouncementPosts = (tournaments: Tournament[], posts: any[], user: User) => {
    return tournaments
        .filter((tournament) => isTournamentLive(tournament))
        .filter((tournament) => !posts.some((post) => post.type === 'tournament_announcement' && doesAnnouncementKindMatch(post, 'started') && doesPostBelongToTournament(post, tournament)))
        .map((tournament) => {
            const startDate = getTournamentStartDate(tournament);
            const authorName = getTournamentAnnouncementAuthorName(tournament);

            return {
                id: `derived-tournament-announcement-${tournament.id}`,
                type: 'tournament_announcement',
                created_at: (startDate || new Date()).toISOString(),
                liked_by_user: false,
                likes_count: 0,
                comments: [],
                author: {
                    id: tournament.userId || user.id,
                    name: authorName,
                    avatar: user.avatar,
                    role: tournament.creator_role,
                },
                content: buildTournamentAnnouncementContent(tournament, 'started', authorName, (startDate || new Date()).toISOString())
            };
        });
};

const buildFinishedTournamentResultPosts = (tournaments: Tournament[], posts: any[], user: User) => {
    return tournaments
        .filter((tournament) => isTournamentFinished(tournament))
        .filter((tournament) => !posts.some((post) => post.type === 'tournament_result' && doesPostBelongToTournament(post, tournament)))
        .map((tournament) => {
            const endDate = getTournamentEndDate(tournament);
            const authorLabel = getTournamentAnnouncementAuthorName(tournament);
            const winnerData = getTournamentWinnerData(tournament);

            return {
                id: `derived-tournament-result-${tournament.id}`,
                type: 'tournament_result',
                created_at: (endDate || new Date()).toISOString(),
                liked_by_user: false,
                likes_count: 0,
                comments: [],
                author: {
                    id: tournament.userId || user.id,
                    name: authorLabel,
                    avatar: user.avatar,
                    role: tournament.creator_role,
                },
                content: {
                    tournamentId: String(tournament.id),
                    tournamentName: tournament.name,
                    groupName: tournament.groupName || tournament.group_name,
                    winnerName: winnerData?.winnerName,
                    winnerAvatar: winnerData?.winnerAvatar,
                    authorLabel,
                    note: winnerData?.winnerName
                        ? 'Победитель определён по итогам турнирной сетки.'
                        : 'Турнир завершён. Финальные результаты будут опубликованы после обновления данных.',
                    groupId: tournament.target_group_id || tournament.targetGroupId,
                }
            };
        });
};

const sortFeedItems = (items: any[]) => {
    return [...items].sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();
        return rightTime - leftTime;
    });
};

const TournamentAnnouncementDetails = ({ content }: { content: any }) => {
    const tournamentMeta = getTournamentMetaLabel(content?.prizePool);

    return (
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p className="text-slate-600"><strong>Группа:</strong> {content?.groupName || 'без группы'}</p>
            <p className="text-slate-600"><strong>Статус:</strong> {getTournamentStatusLabel(content?.status)}</p>
            <p className="text-slate-600 col-span-2"><strong>Категория:</strong> {content?.category || 'Не указана'}</p>
            <p className="text-slate-600"><strong>Разряд:</strong> {content?.tournamentType || 'Не указан'}</p>
            <p className="text-slate-600"><strong>Пол:</strong> {content?.gender || 'Не указан'}</p>
            <p className="text-slate-600 col-span-2"><strong>Возраст:</strong> {content?.ageGroup || 'Не указана'}</p>
            <p className="text-slate-600"><strong>Система:</strong> {content?.system || 'Не указана'}</p>
            <p className="text-slate-600"><strong>Формат:</strong> {content?.matchFormat || 'Не указан'}</p>
            <p className="text-slate-600 col-span-2"><strong>Участники:</strong> {content?.participantsCount || 'Не указано'}</p>
            <p className="text-slate-600"><strong>Начало:</strong> {
                content?.startDate && !isNaN(new Date(content.startDate).getTime())
                    ? new Date(content.startDate).toLocaleDateString('ru-RU')
                    : 'Не указана'
            }</p>
            <p className="text-slate-600"><strong>Окончание:</strong> {
                content?.endDate && !isNaN(new Date(content.endDate).getTime())
                    ? new Date(content.endDate).toLocaleDateString('ru-RU')
                    : 'Не указана'
            }</p>
            <p className="text-slate-600 col-span-2"><strong>{tournamentMeta.label}:</strong> {tournamentMeta.value}</p>
            {content?.stageStatus && <p className="text-slate-600 col-span-2"><strong>Этап:</strong> {content.stageStatus}</p>}
        </div>
    );
};

const getTournamentMetaLabel = (value?: string | null) => {
    const normalizedValue = (value || '').trim();

    if (!normalizedValue) {
        return { label: 'Призовой фонд', value: 'Не указан' };
    }

    if (normalizedValue.toLowerCase().startsWith('средний рейтинг:')) {
        return {
            label: 'Средний рейтинг участников',
            value: normalizedValue.replace(/^средний рейтинг:\s*/i, '').trim() || 'Не указан',
        };
    }

    return { label: 'Призовой фонд', value: normalizedValue };
};

const getAvatarFallbackUrl = (name?: string | null, background = '94a3b8') => {
    const safeName = encodeURIComponent((name || 'Игрок').trim() || 'Игрок');
    return `https://ui-avatars.com/api/?name=${safeName}&background=${background}&color=fff`;
};

const withAvatarFallback = (event: React.SyntheticEvent<HTMLImageElement>, name?: string | null, background = '94a3b8') => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = getAvatarFallbackUrl(name, background);
};

// --- Modal Component ---
// --- Modal Component ---
const ImageModal = ({ images, startIndex, onClose }: { images: string[], startIndex: number, onClose: () => void }) => {
    if (!images || images.length === 0) return null;

    const [currentIndex, setCurrentIndex] = useState(startIndex);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prevIndex => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(prevIndex => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="max-w-4xl max-h-4xl relative" onClick={e => e.stopPropagation()}>
                <img src={images[currentIndex]} alt="Full-size view" className="max-w-full max-h-screen rounded-lg" />
                <button onClick={onClose} className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 z-20 hover:bg-black/75">
                    <X size={24} />
                </button>
                {images.length > 1 && (
                    <>
                        <button onClick={goToPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/75">
                            <ChevronLeft size={32} />
                        </button>
                        <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/75">
                            <ChevronRight size={32} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                            {currentIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? ReactDOM.createPortal(modalContent, modalRoot) : null;
};

// --- Winner Badge Component ---
const WinnerBadge = () => (
    <div className="absolute -top-1 -left-2 bg-lime-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full transform -rotate-12">
        WIN
    </div>
);



// --- Feed Item Components ---

const TextPost = ({ post, user, onUpdate }: { post: any, user: User, onUpdate: () => void }) => {
    const [isLiked, setIsLiked] = useState(post.liked_by_user);
    const [currentLikes, setCurrentLikes] = useState(parseInt(post.likes_count) || 0);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [comments, setComments] = useState(post.comments || []);

    const handleLikeClick = async () => {
        const originalIsLiked = isLiked;
        const originalLikes = currentLikes;
        
        setIsLiked(!originalIsLiked);
        setCurrentLikes(originalIsLiked ? originalLikes - 1 : originalLikes + 1);

        try {
            await api.posts.toggleLike(post.id, user.id);
        } catch (error) {
            console.error("Failed to toggle like", error);
            // Revert on error
            setIsLiked(originalIsLiked);
            setCurrentLikes(originalLikes);
        }
    };

    const handleCommentClick = () => {
        setShowCommentInput(!showCommentInput);
    };

    const handleAddComment = async () => {
        if (newCommentText.trim()) {
            try {
                await api.posts.addComment(post.id, user.id, newCommentText);
                setNewCommentText('');
                onUpdate(); // Re-fetch all posts to get the new comment
            } catch (error) {
                console.error("Failed to add comment", error);
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" onError={(event) => withAvatarFallback(event, post.author?.name)} />
                    <div>
                        <p className="font-bold">{post.author.name}</p>
                        <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <button className="text-slate-400">...</button>
            </div>
            {post.content.text && <p className="text-slate-700 mb-4 whitespace-pre-wrap">{post.content.text}</p>}
            {post.content.image && <img src={post.content.image} alt="Post image" className="mt-2 rounded-lg w-full" />}
            <div className="flex items-center gap-4 text-slate-500 text-sm mt-4">
                <button onClick={handleLikeClick} className="flex items-center gap-1">
                    <Heart size={16} className={`transition-colors ${isLiked ? "text-red-500 fill-current" : "hover:text-red-500"}`}/> {currentLikes}
                </button>
                <button onClick={handleCommentClick} className="flex items-center gap-1">
                    <MessageCircle size={16} /> {comments.length}
                </button>
            </div>

            {showCommentInput && (
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Написать комментарий..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-slate-100 p-2 rounded-lg outline-none border border-slate-200"
                        />
                        <Button onClick={handleAddComment} disabled={!newCommentText.trim()}>Отправить</Button>
                    </div>
                     {comments.length > 0 && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                            {comments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-2 text-xs text-slate-600">
                                    <img src={comment.author.avatar} alt={comment.author.name} className="w-5 h-5 rounded-full" onError={(event) => withAvatarFallback(event, comment.author?.name)} />
                                    <div>
                                        <span className="font-bold">{comment.author.name}</span>
                                        <p className="text-slate-500">{comment.text}</p>
                                    </div>
                                    <span className="text-slate-400 ml-auto text-[10px]">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PartnerSearchPost = ({ post, onStartConversation }: { post: any, onStartConversation?: (partnerId: string) => void }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-lime-200">
        <div className="flex justify-between items-start">
            <div className="flex gap-3">
                <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" onError={(event) => withAvatarFallback(event, post.author?.name)} />
                <div>
                    <p className="font-bold">{post.author.name}</p>
                    <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}・NTRP {post.content.details.ntrp}</p>
                </div>
            </div>
            <div className="text-xs font-bold bg-lime-100 text-lime-700 px-2 py-1 rounded">ПОИСК ПАРТНЕРА</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 my-4">
            <div className="flex justify-around">
                <div>
                    <p className="text-xs text-slate-400">КОГДА</p>
                    <p className="font-bold flex items-center gap-2"><Calendar size={16}/> {post.content.details.when}</p>
                </div>
                <div>
                    <p className="font-bold flex items-center gap-2"><Globe size={16}/> {post.content.details.where}</p>
                </div>
            </div>
             <p className="text-center text-sm mt-3 text-slate-600">"{post.content.details.text}"</p>
        </div>
        <div className="flex justify-between items-center">
            <p className="text-sm"><span className="text-slate-500">Требование:</span> <span className="font-bold">{post.content.details.requirement}</span></p>
            <Button onClick={() => onStartConversation?.(String(post.author.id))}><Swords size={16}/>Сыграть</Button>
        </div>
    </div>
);

const TournamentMatchPost = ({ post, user, onUpdate }: { post: any, user: User, onUpdate: () => void }) => {
    const { content, author: organizer } = post;
    const { title: tournamentName, matchData } = content || {};
    const { winner, loser, score, groupName, nextRound } = matchData || {};

    if (!matchData) return null;

    const [isLiked, setIsLiked] = useState(post.liked_by_user);
    const [currentLikes, setCurrentLikes] = useState(parseInt(post.likes_count) || 0);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [comments, setComments] = useState(post.comments || []);

    const handleLikeClick = async () => {
        const originalIsLiked = isLiked;
        const originalLikes = currentLikes;
        
        setIsLiked(!originalIsLiked);
        setCurrentLikes(originalIsLiked ? originalLikes - 1 : originalLikes + 1);

        try {
            await api.posts.toggleLike(post.id, user.id);
        } catch (error) {
            console.error("Failed to toggle like", error);
            setIsLiked(originalIsLiked);
            setCurrentLikes(originalLikes);
        }
    };

    const handleCommentClick = () => setShowCommentInput(!showCommentInput);

    const handleAddComment = async () => {
        if (newCommentText.trim()) {
            try {
                await api.posts.addComment(post.id, user.id, newCommentText);
                setNewCommentText('');
                onUpdate();
            } catch (error) {
                console.error("Failed to add comment", error);
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-bold flex items-center gap-2"><Trophy size={14} className="text-amber-500"/>РЕЗУЛЬТАТ ТУРНИРА</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>
            <div className="text-center my-3">
                <p className="font-bold text-lg">{tournamentName}</p>
                <p className="text-xs text-indigo-500 font-bold uppercase">{groupName}</p>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex flex-col items-center text-center">
                    <div className="relative">
                        <img src={winner ? `https://ui-avatars.com/api/?name=${winner.replace(' ', '+')}&background=84cc16&color=fff` : 'https://ui-avatars.com/api/?name=Unknown&background=84cc16&color=fff'} alt={winner || 'Unknown'} className="w-12 h-12 rounded-full border-2 border-lime-400 p-0.5" />
                        {winner && <WinnerBadge />}
                    </div>
                    <p className="font-bold text-sm mt-1">{winner}</p>
                    <p className="text-xs text-lime-600 font-bold">Победитель</p>
                    {nextRound && nextRound !== 'Финал завершён' && (
                        <p className="text-xs text-indigo-600 font-bold mt-1">→ Выход в {nextRound}</p>
                    )}
                </div>
                <div className="text-center">
                    <p className="font-black text-2xl text-slate-800">{score}</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <img src={loser ? `https://ui-avatars.com/api/?name=${loser.replace(' ', '+')}&background=94a3b8&color=fff` : 'https://ui-avatars.com/api/?name=Unknown&background=94a3b8&color=fff'} alt={loser || 'Unknown'} className="w-12 h-12 rounded-full filter grayscale" />
                    <p className="font-bold text-sm mt-1">{loser}</p>
                    <p className="text-xs text-slate-500">Проигравший</p>
                </div>
            </div>
            <div className="text-xs text-slate-400 mt-3 text-center">
                Опубликовал: {organizer?.name || 'Организатор'}
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-sm mt-4 pt-4 border-t border-slate-100">
                <button onClick={handleLikeClick} className="flex items-center gap-1">
                    <Heart size={16} className={`transition-colors ${isLiked ? "text-red-500 fill-current" : "hover:text-red-500"}`}/> {currentLikes}
                </button>
                <button onClick={handleCommentClick} className="flex items-center gap-1">
                    <MessageCircle size={16} /> {comments.length}
                </button>
            </div>

            {showCommentInput && (
                 <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Написать комментарий..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-slate-100 p-2 rounded-lg outline-none border border-slate-200"
                        />
                        <Button onClick={handleAddComment} disabled={!newCommentText.trim()}>Отправить</Button>
                    </div>
                     {comments.length > 0 && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                            {comments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-2 text-xs text-slate-600">
                                    <img src={comment.author?.avatar || getAvatarFallbackUrl(comment.author?.name || 'User')} alt={comment.author?.name || 'User'} className="w-5 h-5 rounded-full" onError={(event) => withAvatarFallback(event, comment.author?.name)} />
                                    <div>
                                        <span className="font-bold">{comment.author?.name || 'Пользователь'}</span>
                                        <p className="text-slate-500">{comment.text}</p>
                                    </div>
                                    <span className="text-slate-400 ml-auto text-[10px]">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MatchResultPost = ({ post, user, onUpdate }: { post: any, user: User, onUpdate: () => void }) => {
    const { author, content } = post;
    const { opponent, score, isWinner } = content || {};

    const safeAuthor = author
        ? { ...author, avatar: author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&background=84cc16&color=fff` }
        : { name: 'Пользователь', avatar: 'https://ui-avatars.com/api/?name=User&background=84cc16&color=fff' };

    const safeOpponent = opponent
        ? { ...opponent, avatar: opponent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent.name || 'Оппонент')}&background=94a3b8&color=fff` }
        : { name: 'Оппонент', avatar: 'https://ui-avatars.com/api/?name=Opponent&background=94a3b8&color=fff' };

    // Автор поста всегда слева, оппонент всегда справа.
    // isWinner определяет только визуальный бейдж победителя.
    const authorWon = isWinner === true;
    
    const [isLiked, setIsLiked] = useState(post.liked_by_user);
    const [currentLikes, setCurrentLikes] = useState(parseInt(post.likes_count) || 0);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [comments, setComments] = useState(post.comments || []);

    const handleLikeClick = async () => {
        const originalIsLiked = isLiked;
        const originalLikes = currentLikes;
        
        setIsLiked(!originalIsLiked);
        setCurrentLikes(originalIsLiked ? originalLikes - 1 : originalLikes + 1);

        try {
            await api.posts.toggleLike(post.id, user.id);
        } catch (error) {
            console.error("Failed to toggle like", error);
            // Revert on error
            setIsLiked(originalIsLiked);
            setCurrentLikes(originalLikes);
        }
    };

    const handleCommentClick = () => {
        setShowCommentInput(!showCommentInput);
    };

    const handleAddComment = async () => {
        if (newCommentText.trim()) {
            try {
                await api.posts.addComment(post.id, user.id, newCommentText);
                setNewCommentText('');
                onUpdate(); // Re-fetch all posts to get the new comment
            } catch (error) {
                console.error("Failed to add comment", error);
            }
        }
    };
    
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span>РЕЗУЛЬТАТ МАТЧА</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
                {/* Автор поста — всегда слева */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <img src={safeAuthor.avatar} alt={safeAuthor.name} className={`w-12 h-12 rounded-full border-2 p-0.5 ${authorWon ? 'border-lime-400' : 'border-slate-300 filter grayscale'}`} />
                        {authorWon && <WinnerBadge />}
                    </div>
                    <div>
                        <p className="font-bold text-sm">{safeAuthor.name}</p>
                        <p className={`text-xs font-semibold ${authorWon ? 'text-lime-600' : 'text-red-400'}`}>{authorWon ? 'Победа' : 'Поражение'}</p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-bold text-lg">{score}</p>
                    <p className="text-xs text-slate-400">ХАРД</p>
                </div>
                {/* Оппонент — всегда справа */}
                <div className="flex items-center gap-2">
                     <div>
                        <p className="font-bold text-sm text-right">{safeOpponent.name}</p>
                        <p className={`text-xs font-semibold text-right ${authorWon ? 'text-red-400' : 'text-lime-600'}`}>{authorWon ? 'Поражение' : 'Победа'}</p>
                    </div>
                    <div className="relative">
                        <img src={safeOpponent.avatar} alt={safeOpponent.name} className={`w-12 h-12 rounded-full border-2 p-0.5 ${!authorWon ? 'border-lime-400' : 'border-slate-300 filter grayscale'}`} />
                        {!authorWon && <WinnerBadge />}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-sm mt-4 pt-4 border-t border-slate-100">
                <button onClick={handleLikeClick} className="flex items-center gap-1">
                    <Heart size={16} className={`transition-colors ${isLiked ? "text-red-500 fill-current" : "hover:text-red-500"}`}/> {currentLikes}
                </button>
                <button onClick={handleCommentClick} className="flex items-center gap-1">
                    <MessageCircle size={16} /> {comments.length}
                </button>
            </div>

            {showCommentInput && (
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Написать комментарий..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-slate-100 p-2 rounded-lg outline-none border border-slate-200"
                        />
                        <Button onClick={handleAddComment} disabled={!newCommentText.trim()}>Отправить</Button>
                    </div>
                     {comments.length > 0 && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                            {comments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-2 text-xs text-slate-600">
                                    <img src={comment.author?.avatar || getAvatarFallbackUrl(comment.author?.name || 'User')} alt={comment.author?.name || 'User'} className="w-5 h-5 rounded-full" onError={(event) => withAvatarFallback(event, comment.author?.name)} />
                                    <div>
                                        <span className="font-bold">{comment.author?.name || 'Пользователь'}</span>
                                        <p className="text-slate-500">{comment.text}</p>
                                    </div>
                                    <span className="text-slate-400 ml-auto text-[10px]">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const MarketplacePost = ({ post, user, onStartConversation, onUpdate }: { post: any, user: User, onStartConversation: (partnerId: string) => void, onUpdate: () => void }) => {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Track the index of the clicked image
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const openImageModal = (index: number) => {
        setSelectedImageIndex(index);
        setIsImageModalOpen(true);
    };

    const closeImageModal = () => {
        setIsImageModalOpen(false);
    };

    const isAuthor = String(post.author.id) === String(user.id);

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await api.posts.delete(post.id, user.id);
            onUpdate(); // This will re-fetch the feed
        } catch (error) {
            console.error("Failed to delete post", error);
            alert("Не удалось удалить объявление.");
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>БАРАХОЛКА - {post.author.city || 'Город не указан'}</span>
                    <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden">
                     {post.content.images && post.content.images.length > 0 && (
                        // Display the first image, and open modal with index 0
                        <img 
                            src={post.content.images[0]} 
                            alt={post.content.title} 
                            className="h-80 w-full object-cover rounded-xl cursor-pointer"
                            onClick={() => openImageModal(0)} // Pass 0 as the starting index
                        />
                    )}
                    <div className="py-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-xl mt-2">{post.content.title}</h4>
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{post.content.price} ₽</div>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{post.content.description}</p>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                                <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full" onError={(event) => withAvatarFallback(event, post.author?.name)} />
                                <div>
                                    <div className="text-sm font-bold text-slate-700">{post.author.name}</div>
                                </div>
                            </div>
                            {isAuthor ? (
                                <Button variant="danger_outline" size="sm" onClick={handleDelete}>Удалить</Button>
                            ) : (
                                <Button onClick={() => onStartConversation(post.author.id)}>Написать</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isImageModalOpen && (
                <ImageModal 
                    images={post.content.images} 
                    startIndex={selectedImageIndex} 
                    onClose={closeImageModal} 
                />
            )}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Подтвердите удаление">
                <p className="text-slate-500 mt-2 mb-6">Вы уверены, что хотите удалить это объявление?</p>
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
                    <Button variant="danger" onClick={confirmDelete}>Удалить</Button>
                </div>
            </Modal>
        </>
    );
};

const TournamentAnnouncementPost = ({ post, currentUserId, onStartConversation }: { post: any; currentUserId: string; onStartConversation: (partnerId: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tournamentDetails, setTournamentDetails] = useState<any>(null);
    const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);
    const isUpcoming = post.content?.announcementKind === 'upcoming';

    useEffect(() => {
        const rttLink = post.content?.rtt_link || post.content?.rttLink;

        if (!isOpen || !rttLink) {
            if (!isOpen) {
                setTournamentDetails(null);
            }
            return;
        }

        let isActive = true;
        setLoadingTournamentDetails(true);

        api.rtt.getTournamentDetails(rttLink)
            .then((data) => {
                if (isActive && data?.success) {
                    setTournamentDetails(data.tournament || null);
                }
            })
            .catch((error) => {
                console.error('Failed to load RTT tournament details for feed modal', error);
            })
            .finally(() => {
                if (isActive) {
                    setLoadingTournamentDetails(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [isOpen, post.content?.rtt_link, post.content?.rttLink]);

    const tournamentFromPost = {
        ...post.content,
        name: post.content?.name || post.content?.title,
        user_id: post.content?.user_id || post.content?.userId || post.author?.id,
        creator_role: post.content?.creator_role || post.content?.creatorRole || post.author?.role,
        tournament_type: post.content?.tournamentType,
        age_group: post.content?.ageGroup,
        match_format: post.content?.matchFormat,
        prize_pool: post.content?.prizePool,
        rtt_link: post.content?.rtt_link || post.content?.rttLink,
    };

    const handleOpenTournament = () => {
        if (tournamentFromPost.rtt_link) {
            setLoadingTournamentDetails(true);
        }
        setIsOpen(true);
    };

    return (
        <>
            <button onClick={handleOpenTournament} className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 w-full text-left hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Trophy size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-blue-600">{isUpcoming ? 'Анонс турнира' : 'Начался новый турнир!'}</p>
                            <p className="text-xs text-slate-400">Опубликовал: {post.content.authorName || (post.author?.role === 'admin' ? 'Администрация' : post.author?.name) || 'Организатор'}</p>
                        </div>
                    </div>
                    <div className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{isUpcoming ? 'АНОНС' : 'ТУРНИР'}</div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{post.content.title}</h3>
                {(() => {
                    const tournamentMeta = getTournamentMetaLabel(post.content.prizePool);
                    return (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            {post.content.groupName && <p><strong>Группа:</strong> {post.content.groupName}</p>}
                            <p><strong>{tournamentMeta.label}:</strong> {tournamentMeta.value}</p>
                            <p><strong>Дата:</strong> {new Date(post.content.date).toLocaleDateString('ru-RU')}</p>
                        </div>
                    );
                })()}
                <p className="text-xs text-blue-600 font-semibold mt-4">Нажмите, чтобы открыть детали турнира</p>
            </button>
            <TournamentDetailsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                tournament={tournamentFromPost}
                tournamentDetails={tournamentDetails}
                loadingTournamentDetails={loadingTournamentDetails}
                currentUserId={currentUserId}
                onStartConversation={onStartConversation}
            />
        </>
    );
};

const TournamentMatchResultPost = ({ post }: { post: any }) => {
    const c = post.content || {};
    const isFullResult = !c.player1Name;
    if (isFullResult) return <TournamentResultPost post={post} />;
    const authorLabel = c.authorLabel || (post.author?.role === 'admin' ? 'Администрация' : post.author?.name);

    const isFinal = c.round === 'Финал';
    const isSemi = c.round === 'Полуфинал';
    const roundLabel = c.round
        ? isFinal ? '🏆 Финал' : isSemi ? '⚡ Полуфинал' : `Раунд ${c.round}`
        : 'Матч';

    return (
        <div className={`p-4 rounded-2xl shadow-lg border relative overflow-hidden ${isFinal ? 'bg-gradient-to-br from-amber-900 to-slate-900 border-amber-500/40' : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700'}`}>
            <div className="absolute -top-4 -right-4 opacity-10">
                <Trophy size={80} strokeWidth={1} className="text-white"/>
            </div>
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isFinal ? 'bg-amber-400' : 'bg-slate-600'}`}>
                            <Trophy size={14} className="text-white" fill="white"/>
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isFinal ? 'text-amber-400' : 'text-slate-400'}`}>
                                {c.tournamentName}
                            </p>
                            <p className="text-[10px] text-slate-500">{authorLabel} · {new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>
                    </div>
                    {/* Round badge */}
                    {c.round && (
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${
                            isFinal ? 'bg-amber-400 text-amber-900' :
                            isSemi ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' :
                            'bg-white/10 text-slate-300 border border-white/10'
                        }`}>{roundLabel}</span>
                    )}
                </div>

                {/* Score board */}
                <div className="flex items-stretch gap-2">
                    {/* Player 1 */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl gap-1 ${c.winnerName === c.player1Name ? 'bg-lime-400/20 border border-lime-400/40' : 'bg-white/5'}`}>
                        {c.winnerName === c.player1Name && (
                            <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-4 h-4 rounded-full bg-lime-400 flex items-center justify-center">
                                    <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                                <span className="text-[9px] font-black text-lime-400 uppercase">Победа</span>
                            </div>
                        )}
                        <p className="font-black text-white text-sm text-center leading-tight">{c.player1Name}</p>
                        {c.winnerName !== c.player1Name && c.winnerName && (
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Проигрыш</p>
                        )}
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center justify-center shrink-0 px-1">
                        <p className="font-black text-xl text-white tracking-tight leading-none">{c.score}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">счёт</p>
                    </div>

                    {/* Player 2 */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl gap-1 ${c.winnerName === c.player2Name ? 'bg-lime-400/20 border border-lime-400/40' : 'bg-white/5'}`}>
                        {c.winnerName === c.player2Name && (
                            <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-4 h-4 rounded-full bg-lime-400 flex items-center justify-center">
                                    <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                                <span className="text-[9px] font-black text-lime-400 uppercase">Победа</span>
                            </div>
                        )}
                        <p className="font-black text-white text-sm text-center leading-tight">{c.player2Name}</p>
                        {c.winnerName !== c.player2Name && c.winnerName && (
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Проигрыш</p>
                        )}
                    </div>
                </div>

                {c.note && <p className="text-xs text-slate-400 mt-3 text-center italic">"{c.note}"</p>}
            </div>
        </div>
    );
};

const TournamentResultPost = ({ post }: { post: any }) => {
    const authorLabel = post.content?.authorLabel || (post.author?.role === 'admin' ? 'Администрация' : post.author?.name);
    const winnerName = post.content?.winnerName;
    const winnerAvatar = post.content?.winnerAvatar || (winnerName ? getAvatarFallbackUrl(winnerName, 'f59e0b') : null);
    const note = post.content?.note;

    return (
    <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl shadow-lg border-2 border-amber-200/80 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 text-amber-200/50">
            <Trophy size={64} strokeWidth={1}/>
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow">
                        <Trophy size={16} className="text-white" fill="white"/>
                    </div>
                    <div>
                        <p className="font-bold text-amber-900 text-sm">ТУРНИР ЗАВЕРШЕН</p>
                        <p className="text-xs text-amber-700/80">Опубликовал: {authorLabel}</p>
                    </div>
                </div>
            </div>
            <div className="text-center my-4">
                <p className="text-xs font-bold text-amber-800/80">{winnerName ? 'Поздравляем победителя турнира' : 'Турнир завершён'}</p>
                <h3 className="text-xl font-black text-slate-900 my-0.5">{post.content.tournamentName}</h3>
                {winnerName ? (
                    <div className="inline-flex items-center gap-2 mt-2 bg-white/50 px-3 py-1 rounded-full relative">
                        <div className="relative">
                            <img src={winnerAvatar} alt={winnerName} className="w-8 h-8 rounded-full" onError={(event) => withAvatarFallback(event, winnerName, 'f59e0b')} />
                            <WinnerBadge />
                        </div>
                        <span className="font-bold text-base text-slate-800">{winnerName}</span>
                    </div>
                ) : (
                    <p className="text-sm text-amber-900 mt-2 font-semibold">Результаты финала скоро появятся в ленте.</p>
                )}
                {note && <p className="text-xs text-amber-700/80 mt-3">{note}</p>}
            </div>
        </div>
    </div>
    );
};

const TournamentStageUpdatePost = ({ post }: { post: any }) => {
    const content = post.content || {};

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-violet-200">
            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                        <Calendar size={20} className="text-violet-600" />
                    </div>
                    <div>
                        <p className="font-bold text-violet-700">Обновление турнира</p>
                        <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <div className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded">ЭТАП</div>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">{content.tournamentName}</h3>
            <p className="text-base font-bold text-violet-700 mb-3">{content.stageLabel}</p>
            {content.groupName && <p className="text-sm text-slate-500 mb-2"><strong>Группа:</strong> {content.groupName}</p>}
            <p className="text-sm text-slate-600">{content.message}</p>
        </div>
    );
};


// --- Feed Component ---

interface FeedProps {
    activeTab: string;
    feedItems: any[];
    user: User;
    onUpdate: () => void;
    onStartConversation: (partnerId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ activeTab, feedItems, user, onUpdate, onStartConversation }) => {
    const AllEventsFeed = () => (
        <div className="space-y-4">
            {feedItems.map(item => {
                switch(item.type) {
                    case 'text_post':
                        return <TextPost key={item.id} post={item} user={user} onUpdate={onUpdate} />;
                    case 'partner_search':
                        return <PartnerSearchPost key={item.id} post={item} onStartConversation={onStartConversation} />;
                    case 'match_result':
                        // Если есть tournamentName или player1Name — это турнирный пост от админа
                        return (item.content?.tournamentName || item.content?.player1Name)
                            ? <TournamentMatchResultPost key={item.id} post={item} />
                            : <MatchResultPost key={item.id} post={item} user={user} onUpdate={onUpdate} />;
                    case 'marketplace':
                        return <MarketplacePost key={item.id} post={item} user={user} onStartConversation={onStartConversation} onUpdate={onUpdate} />;
                    case 'tournament_announcement':
                        return <TournamentAnnouncementPost key={item.id} post={item} currentUserId={user.id} onStartConversation={onStartConversation} />;
                    case 'tournament_stage_update':
                        return <TournamentStageUpdatePost key={item.id} post={item} />;
                    case 'tournament_result':
                        return <TournamentResultPost key={item.id} post={item} />;
                    default:
                        return null;
                }
            })}
        </div>
    );

    const SearchPlayFeed = () => (
         <div className="space-y-4">
            {feedItems.filter(item => item.type === 'partner_search').map(item => (
                <PartnerSearchPost key={item.id} post={item} onStartConversation={onStartConversation} />
            ))}
        </div>
    );

     const MatchResultsFeed = () => (
         <div className="space-y-4">
            {feedItems
                .filter(item => (
                    item.type === 'match_result'
                    || item.type === 'tournament_result'
                    || item.type === 'tournament_stage_update'
                ))
                .map(item => {
                    if (item.type === 'tournament_result') {
                        return <TournamentResultPost key={item.id} post={item} />;
                    }

                    if (item.type === 'tournament_stage_update') {
                        return <TournamentStageUpdatePost key={item.id} post={item} />;
                    }

                    return (item.content?.tournamentName || item.content?.player1Name)
                        ? <TournamentMatchResultPost key={item.id} post={item} />
                        : <MatchResultPost key={item.id} post={item} user={user} onUpdate={onUpdate} />;
                })
            }
        </div>
    );

    const FleaMarketFeed = () => (
        <div className="space-y-4">
            {feedItems.filter(item => item.type === 'marketplace').map(item => (
                <MarketplacePost key={item.id} post={item} user={user} onStartConversation={onStartConversation} onUpdate={onUpdate} />
            ))}
        </div>
    );

    if (activeTab === 'Результаты матчей') {
        return <MatchResultsFeed />;
    } else if (activeTab === 'Поиск игры') {
        return <SearchPlayFeed />;
    } else if (activeTab === 'Барахолка') {
        return <FleaMarketFeed />;
    } else {
        return <AllEventsFeed />;
    }
};

const GroupsView = forwardRef(({ user, onGroupSelect }: { user: User, onGroupSelect: (group: Group) => void }, ref) => {
    const [groups, setGroups] = useState<Group[]>([]);
    
    const fetchGroups = () => {
        api.groups.getAll().then(setGroups);
    }

    useImperativeHandle(ref, () => ({
        fetchGroups
    }));

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {groups.map(group => {
                const groupCover = getGroupCover(group);
                const isImageCover = !groupCover.startsWith('from-');

                return (
                <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer overflow-hidden h-full flex flex-col" onClick={() => onGroupSelect(group)}>
                    {isImageCover ? (
                        <img src={groupCover} alt={group.name} className="w-full h-40 object-cover" />
                    ) : (
                        <div className={`w-full h-40 bg-gradient-to-br ${groupCover} relative overflow-hidden flex items-center justify-center`}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_35%)]" />
                            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
                            <div className="absolute top-4 left-4 text-white/80 text-xs font-black uppercase tracking-[0.25em]">Группа</div>
                            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black text-white shadow-lg border border-white/20">
                                {group.name?.charAt(0)?.toUpperCase() || 'G'}
                            </div>
                        </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-slate-900">{group.name}</h3>
                        {group.location && <p className="text-sm text-slate-500">{group.location}</p>}
                        <p className="text-sm text-slate-600 mt-2 line-clamp-3">{group.description || 'Нет описания.'}</p>
                    </div>
                </div>
            )})}
        </div>
    );
});


const GroupPostForm = ({ user, onPostCreated }: { user: User, onPostCreated: () => void }) => {
    const [myCreatedGroups, setMyCreatedGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [postContent, setPostContent] = useState('');
    const [postImage, setPostImage] = useState<string | null>(null);

    useEffect(() => {
        api.groups.getAll().then(allGroups => {
            const userGroups = allGroups.filter(g => String(g.creatorId) === String(user.id));
            setMyCreatedGroups(userGroups);
            if (userGroups.length > 0) {
                setSelectedGroupId(userGroups[0].id);
            }
        });
    }, [user.id]);

    const handleImageChange = (file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPostImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPostImage(null);
        }
    };

    const handlePublish = async () => {
        if (!selectedGroupId || (!postContent && !postImage)) return;

        try {
            await api.posts.create({
                userId: user.id,
                groupId: selectedGroupId,
                type: 'text_post',
                content: { text: postContent, image: postImage }
            });
            setPostContent('');
            setPostImage(null);
            onPostCreated();
        } catch (error) {
            console.error("Failed to publish group post:", error);
        }
    };

    if (myCreatedGroups.length === 0) {
        return (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 text-center text-slate-500">
                Вы пока не создали ни одной группы.
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-lime-50 to-green-50 p-4 rounded-2xl shadow-sm border border-lime-200 mb-6">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Написать в группу</h3>
            <div className="flex flex-col gap-4">
                <select 
                    value={selectedGroupId} 
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200"
                >
                    {myCreatedGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                </select>
                <textarea
                    className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200"
                    placeholder="Что нового в группе?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={3}
                />
                <div className="flex justify-between items-center">
                    <label className="text-sm text-slate-500 cursor-pointer hover:text-lime-600 flex items-center gap-1">
                        <PlusCircle size={20}/>
                        <input
                           type="file"
                           accept="image/*"
                           className="hidden"
                           onChange={(e) => handleImageChange(e.target.files ? e.target.files[0] : null)}
                       />
                       Фото
                    </label>
                    <Button onClick={handlePublish} disabled={!selectedGroupId || (!postContent && !postImage)}>Опубликовать</Button>
                </div>
                {postImage && (
                    <div className="mt-2 relative w-24 h-24">
                        <img src={postImage} className="h-full w-full object-cover rounded-md" />
                        <button onClick={() => setPostImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                            <X size={12}/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Widgets ---

const TournamentsWidget = ({ user, onNavigate, myGroups, onStartConversation }: { user: User, onNavigate: (tab: string) => void, myGroups: Group[]; onStartConversation: (partnerId: string) => void }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [selectedTournamentDetails, setSelectedTournamentDetails] = useState<any | null>(null);
    const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [userApplications, setUserApplications] = useState<any[]>([]);
    const [showAllTournamentsModal, setShowAllTournamentsModal] = useState(false);


    useEffect(() => {
        api.tournaments.getAll(user.id)
            .then(data => {
                setTournaments(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch tournaments for widget", err);
                setLoading(false);
            });
        api.tournaments.getUserApplications(user.id).then(setUserApplications);
    }, [user.id]);

    const formatDate = (isoDate: string | undefined) => {
        if (!isoDate) return { month: '', day: '' };
        try {
            const date = new Date(isoDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleString('ru-RU', { month: 'short' }).toUpperCase().replace('.', '');
            return { month, day };
        } catch (e) {
            return { month: 'ERR', day: '00' };
        }
    };
    
    const handleApply = async (tournamentId: string) => {
        setIsApplying(true);
        setApplicationStatus(null);
        try {
            await api.tournaments.apply(tournamentId, user.id);
            setApplicationStatus({ message: 'Заявка успешно отправлена!', type: 'success' });
            // Refresh user applications
            api.tournaments.getUserApplications(user.id).then(setUserApplications);
        } catch (error: any) {
            setApplicationStatus({ message: error.message || 'Ошибка при отправке заявки.', type: 'error' });
        } finally {
            setIsApplying(false);
        }
    };

    const handleModalClose = () => {
        setSelectedTournament(null);
        setSelectedTournamentDetails(null);
        setApplicationStatus(null);
    };

    useEffect(() => {
        if (!selectedTournament?.rtt_link) {
            setSelectedTournamentDetails(null);
            return;
        }

        let isActive = true;
        setLoadingTournamentDetails(true);

        api.rtt.getTournamentDetails(selectedTournament.rtt_link)
            .then((data) => {
                if (isActive && data?.success) {
                    setSelectedTournamentDetails(data.tournament || null);
                }
            })
            .catch((error) => {
                console.error('Failed to load RTT tournament details for community modal', error);
            })
            .finally(() => {
                if (isActive) setLoadingTournamentDetails(false);
            });

        return () => {
            isActive = false;
        };
    }, [selectedTournament?.rtt_link]);

    const handleAllClick = () => {
        if (user.role === 'coach') {
            onNavigate('tournaments');
        } else {
            setShowAllTournamentsModal(true);
        }
    };

    const isMember = selectedTournament?.target_group_id ? myGroups.some(g => g.id === selectedTournament.target_group_id) : false;
    const hasApplied = selectedTournament ? userApplications.some(app => app.tournament_id === selectedTournament.id) : false;
    const selectedTournamentParticipantLimit = selectedTournament ? resolveTournamentParticipantLimit(selectedTournament, selectedTournamentDetails) : 0;
    const selectedTournamentApprovedCount = selectedTournament ? resolveTournamentApprovedParticipants(selectedTournament, selectedTournamentDetails) : 0;
    const isSelectedTournamentFull = selectedTournamentParticipantLimit > 0 && selectedTournamentApprovedCount >= selectedTournamentParticipantLimit;
    const canApply = selectedTournament && selectedTournament.creator_role !== 'admin' && !hasApplied && !isSelectedTournamentFull && selectedTournament.status === 'draft';


    return (
        <>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Calendar size={20} className="text-slate-400"/>
                        Турниры
                    </h3>
                    <button onClick={handleAllClick} className="text-sm font-bold text-lime-600">Все</button>
                </div>
                <div className="space-y-4 max-h-56 overflow-y-auto">
                    {loading && <Loader2 className="animate-spin text-slate-400" />}
                    {!loading && tournaments.map(t => {
                        const { month, day } = formatDate(t.start_date);
                        return (
                            <div key={t.id} onClick={() => {
                                if (t.rtt_link) {
                                    setLoadingTournamentDetails(true);
                                }
                                setSelectedTournament(t);
                            }} className="flex items-center gap-4 cursor-pointer group">
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center group-hover:bg-lime-100 transition-colors">
                                    <span className="text-xs font-bold text-red-600">{month}</span>
                                    <span className="font-bold text-lg">{day}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm group-hover:text-lime-600 transition-colors">{t.name}</p>
                                    <p className="text-xs text-slate-500">{t.groupName || 'Открытый'}</p>
                                </div>
                            </div>
                        );
                    })}
                     {!loading && tournaments.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Нет предстоящих турниров.</p>
                     )}
                </div>
            </div>

            <TournamentDetailsModal
                isOpen={!!selectedTournament}
                onClose={handleModalClose}
                tournament={selectedTournament}
                tournamentDetails={selectedTournamentDetails}
                loadingTournamentDetails={loadingTournamentDetails}
                currentUserId={user.id}
                onStartConversation={onStartConversation}
                canApply={!!canApply}
                hasApplied={hasApplied}
                isApplying={isApplying}
                applicationStatus={applicationStatus}
                onApply={() => selectedTournament && handleApply(selectedTournament.id)}
            />
            <Modal isOpen={showAllTournamentsModal} onClose={() => setShowAllTournamentsModal(false)} title="Все турниры">
                <div className="space-y-4">
                    {loading && <Loader2 className="animate-spin text-slate-400" />}
                    {!loading && tournaments.map(t => {
                        const { month, day } = formatDate(t.start_date);
                        return (
                            <div key={t.id} onClick={() => {
                                if (t.rtt_link) {
                                    setLoadingTournamentDetails(true);
                                }
                                setSelectedTournament(t);
                                setShowAllTournamentsModal(false);
                            }} className="flex items-center gap-4 cursor-pointer group">
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center group-hover:bg-lime-100 transition-colors">
                                    <span className="text-xs font-bold text-red-600">{month}</span>
                                    <span className="font-bold text-lg">{day}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm group-hover:text-lime-600 transition-colors">{t.name}</p>
                                    <p className="text-xs text-slate-500">{t.groupName || 'Открытый'}</p>
                                </div>
                            </div>
                        );
                    })}
                     {!loading && tournaments.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Нет предстоящих турниров.</p>
                     )}
                </div>
            </Modal>
        </>
    );
};

const TopPlayersWidget = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
    const [players, setPlayers] = useState<LadderPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                setLoading(true);
                const rankings = await api.ladder.getRankings('club_elo');
                setPlayers(rankings);
                setError(null);
            } catch (err) {
                setError("Не удалось загрузить рейтинг.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, []);
    
    const currentUserRanking = players.find(p => p.userId === 'mock-user-1');

    return (
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Trophy size={20} className="text-amber-400"/>
                    Топ игроков
                </h3>
                <button onClick={() => onNavigate('ladder')} className="text-sm font-bold text-lime-400 focus:outline-none">&rarr;</button>
            </div>
            <div className="space-y-3">
                {loading && <div className="text-center text-slate-400">Загрузка...</div>}
                {error && <div className="text-center text-red-400">{error}</div>}
                {!loading && !error && (
                    <>
                        {players.slice(0, 3).map(p => (
                             <div key={p.id} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-2">
                                     <span className="font-bold bg-amber-400 text-slate-900 rounded-md w-6 h-6 flex items-center justify-center">{p.rank}</span>
                                     <span className="font-bold">{p.name}</span>
                                 </div>
                                 <span className="font-bold text-lime-400">{p.points}</span>
                             </div>
                        ))}
                        {currentUserRanking && (
                             <div className="border-t border-slate-700 my-3 pt-3">
                                 <div className="flex justify-between items-center text-sm">
                                     <div className="flex items-center gap-2">
                                         <span className="font-normal text-slate-400">Вы: #{currentUserRanking.rank}</span>
                                     </div>
                                     <span className="font-normal text-slate-400">{currentUserRanking.points} pts</span>
                                 </div>
                             </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const GroupsWidget = forwardRef(({ onGroupClickForModal, myGroups }: { onGroupClickForModal: (group: Group) => void, myGroups: Group[] }, ref) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = () => {
        setLoading(true);
        api.groups.getAll().then(data => {
            setGroups(data);
            setLoading(false);
        });
    };

    useImperativeHandle(ref, () => ({
        fetchGroups
    }));

    useEffect(() => {
        fetchGroups();
    }, []);

    const isMember = (groupId: string) => myGroups.some(g => g.id === groupId);

    return (
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Users size={20} className="text-slate-400"/>
                    Группы
                </h3>
            </div>
            <div className="space-y-3 max-h-[132px] overflow-y-auto pr-2">
                {loading && <Loader2 className="animate-spin text-slate-400 mx-auto" />}
                {!loading && groups.map(g => (
                    <div key={g.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             {g.avatar ? (
                                <img src={g.avatar} alt={g.name} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500">
                                    {g.name.charAt(0)}
                                </div>
                            )}
                             <div>
                                <p className="font-bold text-sm">{g.name}</p>
                                <p className="text-xs text-slate-400">{g.members_count || 0} уч.</p>
                             </div>
                        </div>
                        {isMember(g.id) ? (
                            <div className="w-8 h-8 flex items-center justify-center">
                                <CheckCircle size={20} className="text-lime-500" />
                            </div>
                        ) : (
                            <Button size="sm" variant="outline" className="w-8 h-8 p-0 text-xl font-normal" onClick={() => onGroupClickForModal(g)}>+</Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

const MarketplaceWidget = ({ user, onNavigate }: { user: User, onNavigate: (tab: string) => void }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                const allPosts = await api.posts.getAll(user.id);
                const marketplaceItems = allPosts.filter((p: any) => p.type === 'marketplace');
                setItems(marketplaceItems);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [user.id]);

    const firstItem = items[0];

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                    <ShoppingCart size={20} className="text-slate-400"/>
                    Барахолка
                </h3>
                <button onClick={() => onNavigate('Барахолка')} className="text-sm font-bold text-lime-600">Все</button>
            </div>
            {loading && <div className="text-center text-slate-400">Загрузка...</div>}
            {!loading && firstItem && (
                <div>
                    {firstItem.content.images && firstItem.content.images.length > 0 ? (
                        <img src={firstItem.content.images[0]} alt={firstItem.content.title} className="rounded-lg h-32 w-full object-cover mb-2" />
                    ) : (
                        <div className="rounded-lg h-32 w-full bg-slate-100 flex items-center justify-center mb-2">
                            <ShoppingCart className="text-slate-400" size={32} />
                        </div>
                    )}
                    <h4 className="font-bold text-sm">{firstItem.content.title}</h4>
                    <p className="text-lg font-bold text-slate-800">{firstItem.content.price} ₽</p>
                </div>
            )}
            {!loading && !firstItem && (
                 <div className="text-center text-slate-400 py-4">Нет товаров</div>
            )}
        </div>
    );
};

// --- Post Creation Forms ---
const PartnerSearchForm = ({ onPublish }: { onPublish: (data: any) => void }) => {
    const [when, setWhen] = useState('');
    const [where, setWhere] = useState('');
    const [requirement, setRequirement] = useState('');
    const [text, setText] = useState('');

    const handlePublish = () => {
        onPublish({ when, where, requirement, text });
        setWhen(''); setWhere(''); setRequirement(''); setText('');
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Когда? (напр. Завтра, 20:00)" value={when} onChange={e => setWhen(e.target.value)} className="bg-white p-2 rounded-lg outline-none border border-slate-200 w-full" />
                <input type="text" placeholder="Где? (напр. ТК Спартак)" value={where} onChange={e => setWhere(e.target.value)} className="bg-white p-2 rounded-lg outline-none border border-slate-200 w-full" />
            </div>
            <input type="text" placeholder="Требования к партнеру (напр. 3.5 - 4.0)" value={requirement} onChange={e => setRequirement(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <textarea placeholder="Дополнительная информация..." value={text} onChange={e => setText(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200 h-20" />
            <Button onClick={handlePublish} className="w-full">Опубликовать поиск</Button>
        </div>
    );
};

const MatchResultForm = ({ onPublish, user }: { onPublish: (data: any) => void, user: User }) => {
    const [opponentName, setOpponentName] = useState('');
    const [score, setScore] = useState('');
    const [isWinner, setIsWinner] = useState(true);

    const handlePublish = () => {
        if (!opponentName || !score) return;
        onPublish({ opponentName, score, isWinner });
        setOpponentName('');
        setScore('');
        setIsWinner(true);
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Имя оппонента" value={opponentName} onChange={e => setOpponentName(e.target.value)} className="bg-white p-2 rounded-lg outline-none border border-slate-200 w-full" />
                <input type="text" placeholder="Счет (напр. 6:4, 6:3)" value={score} onChange={e => setScore(e.target.value)} className="bg-white p-2 rounded-lg outline-none border border-slate-200 w-full" />
            </div>
            <div className="flex items-center gap-4 py-2">
                 <label className="text-sm font-bold text-slate-600">Результат:</label>
                 <button onClick={() => setIsWinner(true)} className={`px-3 py-1 text-sm rounded-full font-semibold transition-colors ${isWinner ? 'bg-lime-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Победа</button>
                 <button onClick={() => setIsWinner(false)} className={`px-3 py-1 text-sm rounded-full font-semibold transition-colors ${!isWinner ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Поражение</button>
            </div>
            <Button onClick={handlePublish} className="w-full">Опубликовать результат</Button>
        </div>
    );
};

const MarketplaceForm = ({ onPublish }: { onPublish: (data: any) => void }) => {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const imagePromises = filesArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(imagePromises).then(base64Images => {
                setImages(prevImages => [...prevImages, ...base64Images]);
            });
        }
    };
    
    const removeImage = (index: number) => {
        setImages(prevImages => prevImages.filter((_, i) => i !== index));
    };

    const handlePublish = () => {
        if (!title || !price) return;
        onPublish({ title, price, description, images });
        setTitle('');
        setPrice('');
        setDescription('');
        setImages([]);
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl mt-4">
            <input type="text" placeholder="Название товара" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <input type="number" placeholder="Цена в рублях" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <textarea placeholder="Описание товара..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200 h-20" />
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Фотографии</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-slate-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-lime-600 hover:text-lime-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-lime-500">
                                <span>Загрузите файлы</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" />
                            </label>
                            <p className="pl-1">или перетащите</p>
                        </div>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF до 10MB</p>
                    </div>
                </div>
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((image, index) => (
                        <div key={index} className="relative">
                            <img src={image} alt={`Preview ${index}`} className="h-24 w-full object-cover rounded-lg" />
                            <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                                <X size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <Button onClick={handlePublish} className="w-full">Выставить на продажу</Button>
        </div>
    );
};


const GroupForm = ({ onPublish, user }: { onPublish: (data: any) => void, user: User }) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [contact, setContact] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    const handleAvatarChange = (file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setAvatar(null);
        }
    };

    const handlePublish = () => {
        if (!name.trim()) return;
        onPublish({ name, location, description, contact, avatar });
        setName('');
        setLocation('');
        setDescription('');
        setContact('');
        setAvatar(null);
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl mt-4">
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                    {avatar ? (
                        <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover rounded-lg"/>
                    ) : (
                        <span className="text-slate-400 text-xs text-center">Аватар</span>
                    )}
                </div>
                <div className="flex-1">
                     <input type="text" placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
                     <label className="text-sm mt-2 text-blue-600 cursor-pointer hover:text-blue-800">
                        Загрузить аватар
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} />
                    </label>
                </div>
            </div>
            <input type="text" placeholder="Город" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <textarea placeholder="Описание группы..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200 h-24" />
            <input type="text" placeholder="Контакты для связи (Telegram, телефон)" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <Button onClick={handlePublish} className="w-full">Создать группу</Button>
        </div>
    );
};


// --- Main View Component ---

const CommunityView2 = ({ user, onNavigate, onStartConversation, onGroupCreated, feedVersion, isActive }: { user: User, onNavigate: (tab: string) => void, onStartConversation: (partnerId: string) => void, onGroupCreated: () => void, feedVersion: number, isActive?: boolean }) => {
    const [activeTab, setActiveTab] = useState('Все события');
    const [postText, setPostText] = useState('');
    const [feedItems, setFeedItems] = useState<any[]>([]);
    useEffect(() => { setPostType('text'); }, [activeTab]);
    const [postType, setPostType] = useState<'text' | 'partner_search' | 'match_result' | 'event' | 'marketplace' | 'group'>('text');
    const [loadingFeed, setLoadingFeed] = useState(true);
    const groupsViewRef = useRef<{ fetchGroups: () => void }>(null);
    const [selectedGroupForModal, setSelectedGroupForModal] = useState<Group | null>(null);
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const handleLeaveGroup = async (groupId: string) => {
        setIsLeaving(true);
        try {
            await api.groups.leave(groupId, user.id);
            setMyGroups(myGroups.filter(g => g.id !== groupId));
        } catch (error) {
            console.error("Failed to leave group:", error);
        } finally {
            setIsLeaving(false);
        }
    };

    const handleJoinGroup = async (groupId: string) => {
        setIsJoining(true);
        try {
            await api.groups.join(groupId, user.id);
            // Add the group to myGroups state to update the UI
            if (selectedGroupForModal) {
                setMyGroups([...myGroups, selectedGroupForModal]);
            }
        } catch (error) {
            console.error("Failed to join group:", error);
        } finally {
            setIsJoining(false);
        }
    };

    const fetchFeed = async () => {
        try {
            setLoadingFeed(true);
            const [posts, tournaments] = await Promise.all([
                api.posts.getAll(user.id),
                api.tournaments.getAll(user.id),
            ]);
            const upcomingTournamentAnnouncements = buildUpcomingAdminTournamentAnnouncementPosts(tournaments, posts, user);
            const liveTournamentAnnouncements = buildLiveTournamentAnnouncementPosts(tournaments, posts, user);
            const finishedTournamentResults = buildFinishedTournamentResultPosts(tournaments, posts, user);
            setFeedItems(sortFeedItems([...posts, ...upcomingTournamentAnnouncements, ...liveTournamentAnnouncements, ...finishedTournamentResults]));
        } catch (error) {
            console.error("Failed to fetch feed", error);
        } finally {
            setLoadingFeed(false);
        }
    };

    useEffect(() => {
        console.log('feedVersion changed, refetching feed:', feedVersion);
        fetchFeed();
        api.groups.getUserGroups(user.id).then(setMyGroups);
    }, [user.id, feedVersion]);

    const groupsWidgetRef = useRef<{ fetchGroups: () => void }>(null);

    const handleGroupCreated = () => {
        if (groupsViewRef.current) {
            groupsViewRef.current.fetchGroups();
        }
        if (groupsWidgetRef.current) {
            groupsWidgetRef.current.fetchGroups();
        }
        setActiveTab('Группы');
    }
    
    const isMemberOfSelectedGroup = selectedGroupForModal ? myGroups.some(g => g.id === selectedGroupForModal.id) : false;
    const selectedGroupCover = selectedGroupForModal ? getGroupCover(selectedGroupForModal) : null;
    const selectedGroupHasImageCover = Boolean(selectedGroupCover && !selectedGroupCover.startsWith('from-'));

    const handlePublishPost = async (data: any) => {
        let postData;

        if (postType === 'partner_search') {
            if (!data.text) return;
            postData = {
                userId: user.id,
                type: 'partner_search',
                content: {
                    details: {
                        when: data.when || 'Не указано',
                        where: data.where || 'Не указано',
                        text: data.text,
                        requirement: data.requirement || 'Любой',
                        ntrp: user.level || 'N/A'
                    }
                }
            };
            await api.posts.create(postData);
        } else if (postType === 'match_result') {
            if (!data.opponentName || !data.score) return;
            postData = {
                userId: user.id,
                type: 'match_result',
                content: {
                    opponent: { name: data.opponentName, avatar: `https://ui-avatars.com/api/?name=${data.opponentName.replace(' ', '+')}`},
                    score: data.score,
                    isWinner: data.isWinner,
                }
            };
            await api.posts.create(postData);
        } else if (postType === 'marketplace') {
            if (!data.title || !data.price) return;
            postData = {
                userId: user.id,
                type: 'marketplace',
                content: {
                    title: data.title,
                    price: data.price,
                    description: data.description,
                    images: data.images
                }
            };
            await api.posts.create(postData);
        } else if (postType === 'group') {
            if (!data.name) return;
            const newGroup = await api.groups.create({
                name: data.name,
                location: data.location,
                description: data.description,
                contact: data.contact,
                avatar: data.avatar,
                userId: user.id
            });
            onGroupCreated();
            handleGroupCreated();
        }
        else { // 'text'
            if (!postText.trim()) return;
            postData = {
                userId: user.id,
                type: 'text_post',
                content: {
                    text: postText
                }
            };
            setPostText('');
            await api.posts.create(postData);
        }
        
        setPostType('text'); // Reset to default post type
        fetchFeed(); // Re-fetch feed after creating a new post
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <CommunityOnboarding isActive={isActive} />
            <div className="lg:col-span-2">
                <div id="community-tabs" className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {['Все события', 'Группы', 'Результаты матчей', 'Поиск игры', 'Барахолка'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                { activeTab !== 'Группы' && <div id="community-post-box" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex gap-3 items-center">
                        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full flex-shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Что нового?" 
                            className="flex-1 bg-transparent outline-none min-w-0 text-sm"
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                             onFocus={() => setPostType('text')}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-slate-400">
                             <Tooltip
                                text="🎾 Поиск партнёра"
                                description="Разместите объявление о поиске партнёра для игры. Его увидят все участники сообщества во вкладке «Поиск игры»."
                             >
                                 <button id="community-btn-partner" onClick={() => setPostType(postType === 'partner_search' ? 'text' : 'partner_search')} className={`p-2 rounded-full transition-colors ${postType === 'partner_search' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Swords size={18}/></button>
                             </Tooltip>
                             <Tooltip
                                text="🏆 Результат матча"
                                description="Поделитесь итогом сыгранного матча. Пост появится во вкладке «Результаты матчей» для всех участников."
                             >
                                 <button id="community-btn-match" onClick={() => setPostType(postType === 'match_result' ? 'text' : 'match_result')} className={`p-2 rounded-full transition-colors ${postType === 'match_result' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Trophy size={18}/></button>
                             </Tooltip>
                             <Tooltip
                                text="👥 Создать группу"
                                description="Создайте закрытую или открытую группу для общения, организации игр и турниров."
                             >
                                <button id="community-btn-group" onClick={() => setPostType(postType === 'group' ? 'text' : 'group')} className={`p-2 rounded-full transition-colors ${postType === 'group' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Users size={18}/></button>
                             </Tooltip>
                             <Tooltip
                                text="🛒 Продать вещь"
                                description="Разместите объявление о продаже теннисного инвентаря. Пост появится в разделе «Барахолка»."
                             >
                                <button id="community-btn-shop" onClick={() => setPostType(postType === 'marketplace' ? 'text' : 'marketplace')} className={`p-2 rounded-full transition-colors ${postType === 'marketplace' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><ShoppingCart size={18}/></button>
                             </Tooltip>
                        </div>
                        <Button onClick={() => handlePublishPost({text: postText})} disabled={!postText.trim()}>Опубликовать</Button>
                    </div>
                     {postType === 'partner_search' && <PartnerSearchForm onPublish={handlePublishPost} />}
                     {postType === 'match_result' && <MatchResultForm onPublish={handlePublishPost} user={user} />}
                     {postType === 'marketplace' && <MarketplaceForm onPublish={handlePublishPost} />}
                     {postType === 'group' && <GroupForm onPublish={handlePublishPost} user={user} />}
                     {postType === 'event' && <div className="text-center p-4 text-slate-500 mt-4">Форма для событий скоро появится!</div>}
                </div>}

                {activeTab === 'Группы' ? (
                    <>
                        <GroupPostForm user={user} onPostCreated={fetchFeed} />
                        <GroupsView user={user} ref={groupsViewRef} onGroupSelect={setSelectedGroupForModal} />
                    </>
                ) : (
                    loadingFeed ? <Loader2 className="animate-spin text-slate-400 mx-auto" /> : <Feed activeTab={activeTab} feedItems={feedItems} user={user} onUpdate={fetchFeed} onStartConversation={onStartConversation} />
                )}
            </div>
            <div className="hidden lg:block space-y-6">
                <div id="community-widget-tournaments"><TournamentsWidget user={user} onNavigate={onNavigate} myGroups={myGroups} onStartConversation={onStartConversation} /></div>
                <div id="community-widget-top"><TopPlayersWidget onNavigate={onNavigate} /></div>
                <div id="community-widget-groups"><GroupsWidget onGroupClickForModal={setSelectedGroupForModal} myGroups={myGroups} /></div>
                <div id="community-widget-marketplace"><MarketplaceWidget user={user} onNavigate={setActiveTab} /></div>
                 {selectedGroupForModal && (
                <Modal isOpen={!!selectedGroupForModal} onClose={() => setSelectedGroupForModal(null)} title={selectedGroupForModal.name}>
                    <div className="p-6">
                        {(() => {
                            const groupCover = selectedGroupCover || getGroupCover(selectedGroupForModal);
                            const isImageCover = selectedGroupHasImageCover;

                            return isImageCover ? (
                                <img src={groupCover} alt={selectedGroupForModal.name} className="w-full h-48 object-cover rounded-2xl mb-5" />
                            ) : (
                                <div className={`w-full h-48 rounded-2xl mb-5 bg-gradient-to-br ${groupCover} relative overflow-hidden flex items-center justify-center`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_35%)]" />
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
                                    <div className="absolute top-5 left-5 text-white/80 text-xs font-black uppercase tracking-[0.25em]">Группа</div>
                                    <div className="w-24 h-24 rounded-[28px] bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl font-black text-white shadow-lg border border-white/20">
                                        {selectedGroupForModal.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex items-center gap-4 mb-4">
                            {selectedGroupHasImageCover ? (
                                <img
                                    src={selectedGroupCover || undefined}
                                    alt={selectedGroupForModal.name}
                                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                                />
                            ) : (
                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedGroupCover} flex items-center justify-center font-bold text-white text-2xl shrink-0`}>
                                    {selectedGroupForModal.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-xl">{selectedGroupForModal.name}</h3>
                                <p className="text-sm text-slate-500">{selectedGroupForModal.location}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{selectedGroupForModal.description || 'Нет описания.'}</p>
                        {selectedGroupForModal.contact && (
                             <p className="text-sm text-slate-600 mb-4"><b>Контакты:</b> {selectedGroupForModal.contact}</p>
                        )}
                        {isMemberOfSelectedGroup ? (
                            <div className="flex gap-2">
                                <Button variant="secondary" disabled className="w-full flex items-center justify-center gap-2">
                                    <CheckCircle size={16} />
                                    Вы в группе
                                </Button>
                                <Button variant="danger_outline" onClick={() => handleLeaveGroup(selectedGroupForModal.id)} className="w-full" disabled={isLeaving}>
                                    {isLeaving ? <Loader2 className="animate-spin" /> : 'Покинуть группу'}
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={() => handleJoinGroup(selectedGroupForModal.id)} className="w-full" disabled={isJoining}>
                                {isJoining ? <Loader2 className="animate-spin" /> : 'Вступить в группу'}
                            </Button>
                        )}
                    </div>
                </Modal>
            )}
            </div>
        </div>
    );
};

export default CommunityView2;
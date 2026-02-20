export type ViewState = 'landing' | 'auth' | 'dashboard' | 'pro' | 'shop' | 'admin' | 'news';
export type DashboardTab = 'profile' | 'search' | 'courts' | 'ai_coach' | 'messages' | 'notifications' | 'tactics' | 'students' | 'tournaments' | 'video_analysis' | 'ladder' | 'community' | 'my_applications' | 'rtt_stats';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'amateur' | 'rtt_pro' | 'coach' | 'admin';
  rating?: number; // NTRP (converted) or RTT Points (Очки классификации)
  xp?: number; // Experience Points (Gamification)
  rttRank?: number; // RTT Rating/Position (Рейтинг в категории)
  rttCategory?: string; // Age category for RTT
  level?: string; // Text representation (e.g. "NTRP 4.0")
  age?: number;
  city: string;
  avatar: string;
  is_private?: boolean;
  notifications_enabled?: boolean;
}

export interface MatchStats {
  firstServePercent: number;
  doubleFaults: number;
  unforcedErrors: number;
  winners: number;
  aces: number;
  breakPointsWon: number;
  totalBreakPoints: number;
}

export interface Match {
  id: string;
  userId: string;
  opponentName: string;
  score: string;
  date: string;
  result: 'win' | 'loss';
  surface: 'hard' | 'clay' | 'grass';
  stats?: MatchStats;
}

export interface Partner {
  id: string;
  name: string;
  age: number;
  level: string;
  city: string;
  image: string;
  isPro: boolean;
  rttRank?: number;
  rating?: number;
  role: 'amateur' | 'rtt_pro' | 'coach' | 'admin';
}

export interface Court {
  id: string;
  name: string;
  address: string;
  surface: string[];
  pricePerHour: number;
  image: string;
  rating: number;
  website?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'system' | 'partner';
  text: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isPro: boolean;
  partnerRole?: string;
  partnerRating?: number;
  partnerRttRank?: number;
}

export interface SkillSet {
  serve: number;
  forehand: number;
  backhand: number;
  stamina: number;
  tactics: number;
}

export interface PlayerGoal {
    id: string;
    text: string;
    targetDate: string;
    isCompleted: boolean;
}

export interface TrainingNote {
    id: string;
    date: string; // Date string
    text: string;
    coachId: string;
}

export interface Video {
    id: string;
    title: string;
    date: string; // Date string
    thumbnail: string;
}

export interface ScheduledLesson {
    id?: string; // Optional for new lessons
    coachId: number;
    studentId: number;
    studentName: string;
    type: string; // e.g., 'indiv'
    startTime: string; // e.g., '08:00'
    dayIndex: number; // 0 for Monday, 6 for Sunday
    duration: number; // in minutes
    status: string; // e.g., 'confirmed'
    courtName: string;
    useCannon: boolean;
    useRacketRental: boolean;
    courtCost: number;
    lessonPrice: number;
}

export interface Student {
  id: string;
  coachId?: string;
  name: string;
  age: number;
  level: string;
  balance: number; // Positive = paid, Negative = debt
  nextLesson?: string; // Optional, can be null
  avatar: string;
  status: 'active' | 'vacation' | 'injured';
  goals: PlayerGoal[];
  notes: TrainingNote[];
  xp: number;
  skills: SkillSet;
  badges: string[]; // Array of badge IDs
  racketHours: number;
  videos: Video[];
  lastRestringDate?: string; // ISO date string or null
}

export interface CrmStats {
    activePlayers: number;
    totalDebt: number;
    playersInDebt: number;
}

export interface CalendarEvent {
  id: string;
  coachId: string;
  title: string;
  start: Date;
  end: Date;
  eventType: 'individual' | 'group' | 'sparring' | 'split';
  studentId?: string;
  courtId?: string;
  notes?: string;
  location?: string;
}

export interface Product {
  id: string;
  title: string;
  category: 'rackets' | 'shoes' | 'apparel' | 'accessories';
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isHit?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  module: string;
}

export interface LadderPlayer {
    id: string;
    rank: number;
    userId: string;
    name: string;
    avatar: string;
    points: number;
    matches: number;
    winRate: number;
    status: 'idle' | 'defending' | 'challenging';
}

export interface RankHistoryItem {
    month: string;
    rank: number;
}

export interface PlayerProfile extends LadderPlayer {
    joinDate: string;
    bio: string;
    stats: {
        wins: number;
        losses: number;
        bestRank: number;
        currentStreak: number; // positive for wins, negative for losses
    };
    rankHistory: RankHistoryItem[];
    recentMatches: Match[];
}

export interface Challenge {
    id: string;
    challengerId: string;
    defenderId: string;
    challengerName: string;
    defenderName: string;
    rankGap: number;
    status: 'pending' | 'accepted' | 'scheduled' | 'completed';
    deadline: string; // ISO date string
    matchDate?: string;
}

export interface Trajectory {
    id: string;
    user_id: string;
    name: string;
    annotation: string;
    playerType: 'user' | 'opponent';
    playerName: string;
    color: string;
    arcHeight: number;
    points: any[]; 
    tactics_data?: any[];
}

export interface Notification {
  id: string;
  user_id: number;
  type: string;
  message: string;
  reference_id: string;
  is_read: boolean;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  sellerName: string;
  sellerAvatar: string;
  city: string;
}

export interface Group {
  id: string;
  name: string;
  location: string;
  description: string;
  creatorId?: string; // New field
  avatar?: string;
}

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  lastMatchScore?: string;
}

export interface TournamentMatch {
  id: string;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  score?: string;
  winnerId?: string;
  status: 'pending' | 'live' | 'finished';
}

export interface Tournament {
  id: string;
  name: string;
  groupName?: string;
  prizePool: string;
  status: 'draft' | 'live' | 'finished';
  type: 'single_elimination' | 'round_robin';
  targetGroupId?: string;
  rounds: {
    name: string;
    matches: TournamentMatch[];
  }[];
  userId?: string;
  category?: string;
  tournamentType?: 'Одиночный' | 'Парный';
  gender?: 'Мужской' | 'Женский' | 'Смешанный';
  ageGroup?: string;
  system?: 'Олимпийская' | 'Круговая';
  matchFormat?: string;
  participantsCount?: number;
  startDate?: string;
  endDate?: string;
  pending_applications_count?: number;
}

export interface TournamentApplication {
  id: string;
  tournament_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  tournament_name?: string;
  user_name?: string;
  user_avatar?: string;
  user_level?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  author: string;
  category: 'tournament' | 'player' | 'training' | 'equipment' | 'general';
  published_at: string;
  is_published: boolean;
  views?: number;
}
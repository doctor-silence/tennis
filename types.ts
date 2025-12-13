
export type ViewState = 'landing' | 'auth' | 'dashboard' | 'pro' | 'shop' | 'admin';
export type DashboardTab = 'profile' | 'search' | 'courts' | 'ai_coach' | 'messages' | 'settings' | 'notifications' | 'tactics' | 'students' | 'video_analysis' | 'ladder' | 'community';

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
}

export interface Court {
  id: string;
  name: string;
  address: string;
  surface: 'hard' | 'clay' | 'grass' | 'carpet';
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
}

export interface Notification {
  id: string;
  type: 'invite' | 'match' | 'system';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export interface Student {
  id: string;
  coachId?: string;
  name: string;
  age: number;
  level: string;
  balance: number; // Positive = paid, Negative = debt
  nextLesson: string;
  avatar: string;
  status: 'active' | 'vacation' | 'injured';
  goals: string;
  notes?: string;
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

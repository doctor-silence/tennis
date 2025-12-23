
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bell, Heart, MessageCircle, Share2, Swords, Clock, CheckCircle2, AlertCircle, Loader2, Send, Smile, X, Zap, BrainCircuit, Flame, Grid } from 'lucide-react';
import { User, LadderPlayer, Challenge, PlayerProfile, Conversation, ChatMessage, Notification } from '../../types';
import Button from '../Button';
import { api } from '../../services/api';
import { Modal } from '../Shared';
import PlayerProfileFlyout from './PlayerProfileFlyout';
import CommunityFeatures from './CommunityFeatures';
import LadderBanner from './LadderBanner';

// --- STICKER FEATURE START ---

type StickerCategory = 'game' | 'tactics' | 'emotions';

interface Sticker {
  name: string;
  category: StickerCategory;
  image: string;
}

const stickerData: Sticker[] = [
    { name: 'ACE!', category: 'game', image: 'sticker-ball.svg'},
    { name: 'VAMOS!', category: 'game', image: 'sticker-trophy.svg'},
    { name: 'WINNER', category: 'emotions', image: 'sticker-racket.svg'},
    // Add more placeholders for other categories if needed
];

const StickerPanel = ({ onSelectSticker, onClose }: { onSelectSticker: (sticker: Sticker) => void, onClose: () => void }) => {
    const [activeCategory, setActiveCategory] = useState<StickerCategory | 'all'>('all');

    const filteredStickers = activeCategory === 'all' 
        ? stickerData 
        : stickerData.filter(s => s.category === activeCategory);

    const CategoryButton = ({ category, label, icon }: { category: StickerCategory | 'all', label: string, icon: React.ReactNode }) => (
        <button 
            onClick={() => setActiveCategory(category)}
            className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeCategory === category ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
            {icon} {label}
        </button>
    );

    return (
        <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 rounded-t-2xl shadow-lg animate-fade-in-up duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
                        <Zap size={14} className="text-lime-400"/>
                    </div>
                    <h3 className="font-bold text-sm">TENNIS PRO STICKER PACK 2.0</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>
            <div className="p-3 bg-white flex gap-2">
                <CategoryButton category="all" label="Все" icon={<Grid size={16}/>} />
                <CategoryButton category="game" label="Игра" icon={<img src="/assets/sticker-ball.svg" className="w-4 h-4"/>} />
                <CategoryButton category="tactics" label="Тактика" icon={<BrainCircuit size={16}/>} />
                <CategoryButton category="emotions" label="Эмоции" icon={<Flame size={16}/>} />
            </div>
            <div className="p-4 h-64 overflow-y-auto">
                <div className="grid grid-cols-5 gap-4">
                    {filteredStickers.map(sticker => (
                        <div key={sticker.name} className="text-center cursor-pointer group" onClick={() => onSelectSticker(sticker)}>
                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-slate-100 transition-colors">
                                <img src={`/assets/${sticker.image}`} alt={sticker.name} className="w-full h-full object-contain"/>
                            </div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mt-1.5">{sticker.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- STICKER FEATURE END ---


interface MessagesViewProps {
    user: User;
    activeConversationId: string | null;
    onConversationSelect: (id: string | null) => void;
    conversations: Conversation[];
    loadingConversations: boolean;
    onConversationsUpdate: (conversations: Conversation[]) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ 
    user, 
    activeConversationId, 
    onConversationSelect,
    conversations,
    loadingConversations,
    onConversationsUpdate
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);


    useEffect(() => {
        if (activeConversationId) {
            setShowStickerPanel(false); // Close sticker panel on convo change
            const currentConvo = conversations.find(c => c.id === activeConversationId);
            
            setLoadingMessages(true);
            api.messages.getMessages(activeConversationId, user.id).then(data => {
                setMessages(data);
                setLoadingMessages(false);
    
                if (currentConvo && currentConvo.unread > 0) {
                    const updatedConversations = conversations.map(c => 
                        c.id === activeConversationId ? { ...c, unread: 0 } : c
                    );
                    onConversationsUpdate(updatedConversations);
                }
            });
        }
    }, [activeConversationId, user.id, conversations, onConversationsUpdate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversationId) return;
        
        const activeConvo = conversations.find(c => c.id === activeConversationId);
        if (!activeConvo) return;

        const sentMessage = await api.messages.sendMessage(user.id, activeConvo.partnerId, newMessage);
        setMessages(currentMessages => [...currentMessages, sentMessage]);
        setNewMessage('');
    };

    const handleSendSticker = async (sticker: Sticker) => {
        if (!activeConversationId) return;
        
        const activeConvo = conversations.find(c => c.id === activeConversationId);
        if (!activeConvo) return;

        const stickerText = `::sticker:${sticker.image}::`;
        const sentMessage = await api.messages.sendMessage(user.id, activeConvo.partnerId, stickerText);
        setMessages(currentMessages => [...currentMessages, sentMessage]);
        setShowStickerPanel(false);
    };

    const renderMessageContent = (text: string) => {
        const stickerRegex = /::sticker:(.*)::/;
        const match = text.match(stickerRegex);

        if (match && match[1]) {
            const stickerFileName = match[1];
            return <img src={`/assets/${stickerFileName}`} alt="sticker" className="w-24 h-24" />;
        }

        return text;
    };
    
    const activeConversation = conversations.find(c => c.id === activeConversationId);

    return (
        <div className="flex h-[calc(100vh-10rem)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="w-1/3 border-r border-slate-100 flex flex-col">
                <div className="p-4 border-b border-slate-100 font-bold text-lg">Сообщения</div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <div className="p-4 text-center text-slate-400">Загрузка...</div>
                    ) : (
                        conversations.map(convo => (
                            <div 
                                key={convo.id} 
                                className={`p-4 cursor-pointer border-b border-slate-50 flex gap-3 transition-colors ${activeConversationId === convo.id ? 'bg-lime-50' : 'hover:bg-slate-50'}`}
                                onClick={() => onConversationSelect(convo.id)}
                            >
                                <div className="relative shrink-0">
                                    <img src={convo.partnerAvatar} className="w-10 h-10 rounded-full" alt={convo.partnerName}/>
                                    {convo.isPro && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-900 border-2 border-white rounded-full" title="Pro"></div>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-sm">{convo.partnerName}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{convo.timestamp}</div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs text-slate-500 truncate">{convo.lastMessage.startsWith('::sticker:') ? '[Стикер]' : convo.lastMessage}</p>
                                        {convo.unread > 0 && <span className="bg-lime-500 text-slate-900 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ml-2">{convo.unread}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                {activeConversation ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                            <img src={activeConversation.partnerAvatar} className="w-8 h-8 rounded-full" alt=""/>
                            <h3 className="font-bold">{activeConversation.partnerName}</h3>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                            <div className="space-y-4">
                                {loadingMessages ? (
                                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-slate-400"/></div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs md:max-w-md p-0 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-lime-500/20 rounded-br-lg' : 'bg-white border border-slate-100 rounded-bl-lg'}`}>
                                                {renderMessageContent(msg.text)}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white relative">
                            {showStickerPanel && (
                                <StickerPanel 
                                    onClose={() => setShowStickerPanel(false)}
                                    onSelectSticker={handleSendSticker}
                                />
                            )}
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Button type="button" variant="ghost" className="w-12 h-12 px-0 text-slate-400 hover:text-lime-500 rounded-full" onClick={() => setShowStickerPanel(!showStickerPanel)}>
                                    <Smile size={22}/>
                                </Button>
                                <input 
                                    className="flex-1 bg-slate-100 border-transparent rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-lime-400"
                                    placeholder="Напишите сообщение..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onFocus={() => setShowStickerPanel(false)}
                                />
                                <Button type="submit" variant="primary" className="w-12 h-12 px-0 rounded-full" disabled={!newMessage.trim()}>
                                    <Send size={20}/>
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={48} className="mb-4 opacity-20"/>
                        <p>Выберите диалог</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface NotificationsViewProps {
    user: User;
    onNotificationsRead: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ user, onNotificationsRead }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndReadNotifications = async () => {
            setLoading(true);
            const fetchedNotifications = await api.notifications.getAll(user.id);
            setNotifications(fetchedNotifications);
            setLoading(false);

            const unreadIds = fetchedNotifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map(id => api.notifications.markAsRead(id)));
                onNotificationsRead();
            }
        };

        fetchAndReadNotifications();
    }, [user.id, onNotificationsRead]);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'new_challenge':
                return <Swords className="text-red-500" size={20} />;
            case 'challenge_accepted':
                return <CheckCircle2 className="text-green-500" size={20} />;
            default:
                return <Bell className="text-blue-500" size={20} />;
        }
    };
    
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <Loader2 className="animate-spin text-slate-400 mx-auto" />
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                <Bell size={48} className="mx-auto mb-4 opacity-20"/>
                <p>Новых уведомлений нет</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {notifications.map(n => (
                <div key={n.id} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 ${n.is_read ? 'opacity-60' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'new_challenge' ? 'bg-red-100' :
                        n.type === 'challenge_accepted' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                        {getIconForType(n.type)}
                    </div>
                    <div>
                        <p className="text-sm text-slate-800">{n.message}</p>
                        <div className="text-xs text-slate-400 mt-2">
                            {new Date(n.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

import CommunityView2 from './CommunityView2';

import CommunityBanner from './CommunityBanner';


export const CommunityView = ({ user, onNavigate, onStartConversation }: { user: User, onNavigate: (tab: string) => void, onStartConversation: (partnerId: string) => void }) => {
    const [groupsCount, setGroupsCount] = useState(0);

    useEffect(() => {
        api.getPartners().then(partners => {
            setGroupsCount(partners.length);
        });
    }, []);

    return (
    <div className="max-w-7xl mx-auto space-y-6">
        <CommunityBanner groupsCount={groupsCount}/>
        <CommunityView2 user={user} onNavigate={onNavigate} onStartConversation={onStartConversation} />
    </div>
);
}

export const LadderView = ({ user, challenges, setChallenges }: { user: User, challenges: Challenge[], setChallenges: React.Dispatch<React.SetStateAction<Challenge[]>> }) => {
    const [ranking, setRanking] = useState<LadderPlayer[]>([]);
    const [viewMode, setViewMode] = useState<'ranking' | 'challenges'>('ranking');
    const [selectedOpponent, setSelectedOpponent] = useState<LadderPlayer | null>(null);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [showEnterScoreModal, setShowEnterScoreModal] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
    const [score, setScore] = useState("");
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [ladderType, setLadderType] = useState<'club_elo' | 'rtt_rating'>('club_elo');
    const [eventType, setEventType] = useState<'friendly' | 'cup' | 'masters'>('friendly');
    
    useEffect(() => {
        const loadData = async () => {
             const rankData = await api.ladder.getRankings(ladderType);
             setRanking(rankData);
        };
        loadData();
    }, [ladderType]);

    const handleChallengeClick = (opponent: LadderPlayer) => {
        setSelectedOpponent(opponent);
        setShowChallengeModal(true);
    };

    const handlePlayerClick = async (player: LadderPlayer) => {
        setIsProfileLoading(true);
        const profile = await api.ladder.getPlayerProfile(player.userId);
        if (profile) {
            setSelectedProfile({ ...profile, rank: player.rank, status: player.status });
        }
        setIsProfileLoading(false);
    };

    const confirmChallenge = async () => {
        if (!selectedOpponent) return;

        const challenger = ranking.find(p => p.userId === user.id);
        if (!challenger) {
            console.error("Could not find challenger in ranking list");
            // Optionally, show an error to the user
            return;
        }

        try {
            const newChallenge = await api.ladder.createChallenge(challenger, selectedOpponent, eventType);
            setChallenges([newChallenge, ...challenges]);
            setShowChallengeModal(false);
            setViewMode('challenges');
        } catch (error) {
            console.error("Failed to create challenge:", error);
            // Optionally, show an error message to the user
        }
    };

    const handleCancelChallenge = async (challengeId: string) => {
        try {
            await api.ladder.cancelChallenge(challengeId);
            setChallenges(challenges.filter(c => c.id !== challengeId));
        } catch (error) {
            console.error("Failed to cancel challenge:", error);
            // Optionally, show an error message to the user
        }
    };

    const handleAcceptChallenge = async (challengeId: string) => {
        try {
            const updatedChallenge = await api.ladder.acceptChallenge(challengeId, user.id);
            setChallenges(challenges.map(c => c.id === challengeId ? updatedChallenge : c));
        } catch (error) {
            console.error("Failed to accept challenge:", error);
            // Optionally, show an error message to the user
        }
    };

    const handleEnterScore = async () => {
        if (!selectedChallenge || !score || !winnerId) {
            // TODO: show error to user
            return;
        }
        try {
            await api.ladder.enterScore(selectedChallenge.id, score, winnerId);
    
            // refresh data
            const rankData = await api.ladder.getRankings(ladderType);
            setRanking(rankData);
            const challengeData = await api.ladder.getChallenges();
            setChallenges(challengeData);
    
            setShowEnterScoreModal(false);
            setScore("");
            setWinnerId(null);
        } catch (error) {
            console.error("Failed to enter score:", error);
            // Optionally, show an error message to the user
        }
    };

    return (
        <div className="space-y-6">
            <LadderBanner leaderName={ranking[0]?.name} />
            {selectedProfile && <PlayerProfileFlyout profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}

            {/* Header / Tabs */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Ladder Type Tabs */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                    <button 
                        onClick={() => setLadderType('club_elo')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${ladderType === 'club_elo' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Любители (Club ELO)
                    </button>
                    <button 
                        onClick={() => setLadderType('rtt_rating')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${ladderType === 'rtt_rating' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Профи (Рейтинг РТТ)
                    </button>
                </div>

                {/* View Mode Tabs */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                    <button 
                        onClick={() => setViewMode('ranking')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'ranking' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Рейтинг
                    </button>
                    <button 
                        onClick={() => setViewMode('challenges')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'challenges' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Вызовы
                        {challenges.filter(c => c.status === 'pending' || c.status === 'scheduled').length > 0 && 
                            <span className="bg-lime-500 text-slate-900 text-[10px] px-1.5 rounded-full">
                                {challenges.filter(c => c.status === 'pending' || c.status === 'scheduled').length}
                            </span>
                        }
                    </button>
                </div>
            </div>

            {viewMode === 'ranking' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className={`p-6 text-white flex justify-between items-center ${ladderType === 'club_elo' ? 'bg-slate-900' : 'bg-orange-900'}`}>
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {ladderType === 'club_elo' ? 'Турнирная лестница клуба' : 'Официальный топ РТТ'}
                            </h3>
                            <p className="text-slate-300 text-xs uppercase tracking-wider">
                                {ladderType === 'club_elo' ? 'Сезон: Октябрь 2024 • Общий зачет' : 'Категория: взрослые • Обновлено 21.10'}
                            </p>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
                            <div className={`text-2xl font-bold ${ladderType === 'club_elo' ? 'text-lime-400' : 'text-orange-400'}`}>
                                #{ranking.find(r => r.userId === user.id)?.rank || '-'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-300 uppercase">Твой ранг</div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Ранг</th>
                                    <th className="px-6 py-4">Игрок</th>
                                    <th className="px-6 py-4 text-center">Матчи</th>
                                    <th className="px-6 py-4 text-center">Винрейт</th>
                                    <th className="px-6 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ranking.map((p, i) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => handlePlayerClick(p)}
                                        className={`transition-colors cursor-pointer ${p.userId === user.id ? (ladderType === 'club_elo' ? 'bg-lime-50/50 hover:bg-lime-50' : 'bg-orange-50/50 hover:bg-orange-50') : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {p.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={p.avatar} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm" alt=""/>
                                                    {p.status === 'defending' && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full" title="Защищает место"></div>}
                                                    {isProfileLoading && selectedProfile?.userId === p.userId && <Loader2 className="absolute inset-0 m-auto animate-spin text-white" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">{p.name} {p.userId === user.id && '(Вы)'}</div>
                                                    <div className="text-xs text-slate-500">{p.points} pts</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{p.matches}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                {p.winRate}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.userId !== user.id && (
                                                <Button 
                                                    size="sm" 
                                                    variant={p.rank < (ranking.find(r => r.userId === user.id)?.rank || 999) ? "secondary" : "outline"} 
                                                    className="h-8 text-xs"
                                                    onClick={(e) => { e.stopPropagation(); handleChallengeClick(p); }}
                                                    disabled={p.status === 'defending'}
                                                >
                                                    {p.rank < (ranking.find(r => r.userId === user.id)?.rank || 999) ? 'Вызвать' : 'Спарринг'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'challenges' && (
                <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
                    {challenges.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                            <Swords size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>Активных вызовов нет</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setViewMode('ranking')}>Найти соперника</Button>
                        </div>
                    ) : (
                        challenges.map(c => (
                            <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-8 w-full md:w-auto">
                                    <div className="text-center w-24">
                                        <div className="font-bold text-slate-900 text-sm">{c.challengerName}</div>
                                        <div className="text-xs text-slate-400">Претендент</div>
                                    </div>
                                    <div className="flex flex-col items-center px-4">
                                        <div className="text-2xl font-black text-slate-200 font-mono">VS</div>
                                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-1 ${
                                            c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                            c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {c.status === 'pending' ? 'Ожидание' : c.status === 'scheduled' ? 'Назначен' : 'Завершен'}
                                        </div>
                                    </div>
                                    <div className="text-center w-24">
                                        <div className="font-bold text-slate-900 text-sm">{c.defenderName}</div>
                                        <div className="text-xs text-slate-400">Защитник</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                    <div className="text-right mr-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 justify-end">
                                            <Clock size={12}/> Дедлайн
                                        </div>
                                        <div className="font-bold text-slate-900">{new Date(c.deadline).toLocaleDateString()}</div>
                                    </div>
                                    {c.status === 'pending' && c.defenderId === user.id && (
                                        <Button size="sm" onClick={() => handleAcceptChallenge(c.id)}>Принять</Button>
                                    )}
                                     {c.status === 'pending' && c.challengerId === user.id && (
                                        <Button size="sm" variant="danger_outline" onClick={() => handleCancelChallenge(c.id)}>Отменить</Button>
                                    )}
                                    {c.status === 'scheduled' && (
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedChallenge(c); setShowEnterScoreModal(true); }}>Внести счет</Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <Modal isOpen={showChallengeModal} onClose={() => setShowChallengeModal(false)} title="Бросить вызов">
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 overflow-hidden">
                        <img src={selectedOpponent?.avatar} className="w-full h-full object-cover" alt=""/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Вызов игроку {selectedOpponent?.name}</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Вы собираетесь оспорить {selectedOpponent?.rank} место в рейтинге. 
                        Матч должен быть сыгран в течение 7 дней.
                    </p>

                    <div className="my-6">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тип матча</label>
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value as 'friendly' | 'cup' | 'masters')}
                            className="w-full mt-1 p-2 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-lime-400 outline-none"
                        >
                            <option value="friendly">Товарищеский матч</option>
                            <option value="cup">Клубный турнир</option>
                            <option value="masters">Турнир серии Masters</option>
                        </select>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-xl text-left mb-6 border border-amber-100">
                        <div className="flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                            <div className="text-xs text-amber-800 leading-relaxed">
                                <span className="font-bold block mb-1">Правила Ladder:</span>
                                1. Проигравший защитник меняется местами с претендентом.<br/>
                                2. Отказ от игры = Техническое поражение.<br/>
                                3. Аренда корта оплачивается 50/50.
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowChallengeModal(false)}>Отмена</Button>
                        <Button className="flex-1" onClick={confirmChallenge}>Отправить вызов</Button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={showEnterScoreModal} onClose={() => setShowEnterScoreModal(false)} title="Внести результат матча">
                {selectedChallenge && (
                    <div className="space-y-4">
                        <p>Матч: {selectedChallenge.challengerName} vs {selectedChallenge.defenderName}</p>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Счет (например, 6:4, 6:3)</label>
                            <input
                                type="text"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-lime-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Победитель</label>
                            <select
                                value={winnerId || ''}
                                onChange={(e) => setWinnerId(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-lime-400 outline-none"
                            >
                                <option value="" disabled>Выберите победителя</option>
                                <option value={selectedChallenge.challengerId}>{selectedChallenge.challengerName}</option>
                                <option value={selectedChallenge.defenderId}>{selectedChallenge.defenderName}</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowEnterScoreModal(false)}>Отмена</Button>
                            <Button onClick={handleEnterScore}>Подтвердить</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
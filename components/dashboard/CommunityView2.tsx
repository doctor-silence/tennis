import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Heart, MessageCircle, Calendar, Globe, Swords, Trophy, Users, ShoppingCart, Share2, Loader2, X, PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../Button';
import Tooltip from '../Tooltip';
import { MarketplaceItem, LadderPlayer, User, Group } from '../../types';

const mockGroups = [
    { id: 1, avatar: 'Т', name: 'Теннис Хамовники', members: 1240 },
    { id: 2, avatar: 'И', name: 'Игроки Севера', members: 856 },
    { id: 3, avatar: 'С', name: 'Спарринг Москва', members: 3400 },
];

// --- Modal Component ---
const ImageModal = ({ src, onClose }: { src: string, onClose: () => void }) => {
    if (!src) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="max-w-4xl max-h-4xl relative" onClick={e => e.stopPropagation()}>
                <img src={src} alt="Full-size view" className="max-w-full max-h-screen rounded-lg" />
                <button onClick={onClose} className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-1">&times;</button>
            </div>
        </div>
    );
};


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
                    <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-bold">{post.author.name}</p>
                        <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <button className="text-slate-400">...</button>
            </div>
            <p className="text-slate-700 mb-4 whitespace-pre-wrap">{post.content.text}</p>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
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
                                    <img src={comment.author.avatar} alt={comment.author.name} className="w-5 h-5 rounded-full" />
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

const PartnerSearchPost = ({ post }: { post: any }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-lime-200">
        <div className="flex justify-between items-start">
            <div className="flex gap-3">
                <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" />
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
            <Button><Swords size={16}/>Сыграть</Button>
        </div>
    </div>
);

const MatchResultPost = ({ post, user, onUpdate }: { post: any, user: User, onUpdate: () => void }) => {
    const { author, content } = post;
    const { opponent, score, isWinner } = content;
    const winner = isWinner ? author : opponent;
    const loser = isWinner ? opponent : author;
    
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
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <img src={winner.avatar} alt={winner.name} className="w-12 h-12 rounded-full border-2 border-lime-400 p-0.5" />
                        <div className="absolute -top-1 -left-2 bg-lime-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full transform -rotate-12">
                            WIN
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-sm">{winner.name}</p>
                        <p className="text-xs text-slate-500">Победитель</p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-bold text-lg">{score}</p>
                    <p className="text-xs text-slate-400">ХАРД</p>
                </div>
                <div className="flex items-center gap-2">
                     <div>
                        <p className="font-bold text-sm text-right">{loser.name}</p>
                        <p className="text-xs text-slate-500 text-right">Оппонент</p>
                    </div>
                    <img src={loser.avatar} alt={loser.name} className="w-12 h-12 rounded-full filter grayscale" />
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
                                    <img src={comment.author.avatar} alt={comment.author.name} className="w-5 h-5 rounded-full" />
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

const MarketplacePost = ({ post, onStartConversation }: { post: any, onStartConversation: (partnerId: string) => void }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    const openModal = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedImage('');
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
                        <img 
                            src={post.content.images[0]} 
                            alt={post.content.title} 
                            className="h-80 w-full object-cover rounded-xl cursor-pointer"
                            onClick={() => openModal(post.content.images[0])}
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
                                <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full" />
                                <div>
                                    <div className="text-sm font-bold text-slate-700">{post.author.name}</div>
                                </div>
                            </div>
                            <Button onClick={() => onStartConversation(post.author.id)}>Написать продавцу</Button>
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && <ImageModal src={selectedImage} onClose={closeModal} />}
        </>
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
                        return <PartnerSearchPost key={item.id} post={item} />;
                    case 'match_result':
                        return <MatchResultPost key={item.id} post={item} />;
                    case 'marketplace':
                        return <MarketplacePost key={item.id} post={item} onStartConversation={onStartConversation} />;
                    default:
                        return null;
                }
            })}
        </div>
    );

    const SearchPlayFeed = () => (
         <div className="space-y-4">
            {feedItems.filter(item => item.type === 'partner_search').map(item => (
                <PartnerSearchPost key={item.id} post={item} />
            ))}
        </div>
    );

     const MatchResultsFeed = () => (
         <div className="space-y-4">
            {feedItems.filter(item => item.type === 'match_result').map(item => (
                <MatchResultPost key={item.id} post={item} user={user} onUpdate={onUpdate} />
            ))}
        </div>
    );

    const FleaMarketFeed = () => (
        <div className="space-y-4">
            {feedItems.filter(item => item.type === 'marketplace').map(item => (
                <MarketplacePost key={item.id} post={item} onStartConversation={onStartConversation} />
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

const GroupsView = forwardRef(({ user }: { user: User }, ref) => {
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
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                    <div key={group.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg">{group.name}</h3>
                        <p className="text-sm text-slate-500">{group.location}</p>
                        <p className="text-sm text-slate-600 mt-2">{group.description}</p>
                        {/* TODO: Add join/leave functionality and member list */}
                    </div>
                ))}
            </div>
        </div>
    );
});


// --- Widgets ---

const TournamentsWidget = () => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar size={20} className="text-slate-400"/>
                Турниры
            </h3>
            <a href="#" className="text-sm font-bold text-lime-600">Все</a>
        </div>
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-red-600">ОКТ</span>
                    <span className="font-bold text-lg">24</span>
                </div>
                <div>
                    <p className="font-bold text-sm">Weekend Cup Amateur</p>
                    <p className="text-xs text-slate-500">Теннис Парк</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-red-600">НОЯ</span>
                    <span className="font-bold text-lg">01</span>
                </div>
                <div>
                    <p className="font-bold text-sm">Autumn Indoor Open</p>
                    <p className="text-xs text-slate-500">Мультиспорт</p>
                </div>
            </div>
        </div>
    </div>
);

const TopPlayersWidget = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
    const [players, setPlayers] = useState<LadderPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                setLoading(true);
                const rankings = await api.ladder.getRankings();
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
    
    const currentUserRanking = players.find(p => p.name.includes('Вы'));

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

const GroupsWidget = () => (
     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Users size={20} className="text-slate-400"/>
                Группы
            </h3>
        </div>
        <div className="space-y-3">
            {mockGroups.map(g => (
                <div key={g.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500">
                             {g.avatar}
                         </div>
                         <div>
                            <p className="font-bold text-sm">{g.name}</p>
                            <p className="text-xs text-slate-400">{g.members} уч.</p>
                         </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-8 h-8 p-0 text-xl font-normal">+</Button>
                </div>
            ))}
        </div>
    </div>
);

const MarketplaceWidget = () => {
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                const marketplaceItems = await api.getMarketplaceItems();
                setItems(marketplaceItems);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    const firstItem = items[0];

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                    <ShoppingCart size={20} className="text-slate-400"/>
                    Барахолка
                </h3>
                <a href="#" className="text-sm font-bold text-lime-600">Все</a>
            </div>
            {loading && <div className="text-center text-slate-400">Загрузка...</div>}
            {!loading && firstItem && (
                <div>
                    <img src={firstItem.image} alt={firstItem.title} className="rounded-lg h-32 w-full object-cover mb-2" />
                    <h4 className="font-bold text-sm">{firstItem.title}</h4>
                    <p className="text-lg font-bold text-slate-800">{firstItem.price} ₽</p>
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

    const handlePublish = () => {
        if (!name.trim()) return;
        onPublish({ name, location, description, contact });
        setName('');
        setLocation('');
        setDescription('');
        setContact('');
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl mt-4">
            <input type="text" placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <input type="text" placeholder="Город" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <textarea placeholder="Описание группы..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200 h-24" />
            <input type="text" placeholder="Контакты для связи (Telegram, телефон)" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-white p-2 rounded-lg outline-none border border-slate-200" />
            <Button onClick={handlePublish} className="w-full">Создать группу</Button>
        </div>
    );
};


// --- Main View Component ---

const CommunityView2 = ({ user, onNavigate, onStartConversation, onGroupCreated }: { user: User, onNavigate: (tab: string) => void, onStartConversation: (partnerId: string) => void, onGroupCreated: () => void }) => {
    const [activeTab, setActiveTab] = useState('Все события');
    const [postText, setPostText] = useState('');
    const [feedItems, setFeedItems] = useState<any[]>([]);
    useEffect(() => { setPostType('text'); }, [activeTab]);
    const [postType, setPostType] = useState<'text' | 'partner_search' | 'match_result' | 'event' | 'marketplace' | 'group'>('text');
    const [loadingFeed, setLoadingFeed] = useState(true);
    const groupsViewRef = useRef<{ fetchGroups: () => void }>(null);


    const fetchFeed = async () => {
        try {
            setLoadingFeed(true);
            const posts = await api.posts.getAll(user.id);
            setFeedItems(posts);
        } catch (error) {
            console.error("Failed to fetch feed", error);
        } finally {
            setLoadingFeed(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const handleGroupCreated = () => {
        if (groupsViewRef.current) {
            groupsViewRef.current.fetchGroups();
        }
        setActiveTab('Группы');
    }

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
            <div className="lg:col-span-2">
                <div className="flex space-x-2 mb-6">
                    {['Все события', 'Группы', 'Результаты матчей', 'Поиск игры', 'Барахолка'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === tab ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                { activeTab !== 'Группы' && <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex gap-4 items-center">
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                        <input 
                            type="text" 
                            placeholder="Что нового?" 
                            className="flex-1 bg-transparent outline-none"
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                             onFocus={() => setPostType('text')}
                        />
                        <div className="flex items-center gap-4 text-slate-400">
                             <Tooltip text="Поиск партнера">
                                 <button onClick={() => setPostType(postType === 'partner_search' ? 'text' : 'partner_search')} className={`p-2 rounded-full transition-colors ${postType === 'partner_search' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Swords size={20}/></button>
                             </Tooltip>
                             <Tooltip text="Результат матча">
                                 <button onClick={() => setPostType(postType === 'match_result' ? 'text' : 'match_result')} className={`p-2 rounded-full transition-colors ${postType === 'match_result' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Trophy size={20}/></button>
                             </Tooltip>
                             <Tooltip text="Создать группу">
                                <button onClick={() => setPostType(postType === 'group' ? 'text' : 'group')} className={`p-2 rounded-full transition-colors ${postType === 'group' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Users size={20}/></button>
                             </Tooltip>
                            <Tooltip text="Создать событие">
                               <button onClick={() => setPostType(postType === 'event' ? 'text' : 'event')} className={`p-2 rounded-full transition-colors ${postType === 'event' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><Calendar size={20}/></button>
                            </Tooltip>
                             <Tooltip text="Продать вещь">
                                <button onClick={() => setPostType(postType === 'marketplace' ? 'text' : 'marketplace')} className={`p-2 rounded-full transition-colors ${postType === 'marketplace' ? 'bg-lime-100 text-lime-600' : 'hover:bg-slate-100'}`}><ShoppingCart size={20}/></button>
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

                { activeTab === 'Группы' ? <GroupsView user={user} ref={groupsViewRef} /> : (loadingFeed ? <Loader2 className="animate-spin text-slate-400 mx-auto" /> : <Feed activeTab={activeTab} feedItems={feedItems} user={user} onUpdate={fetchFeed} onStartConversation={onStartConversation} />) }
            </div>
            <div className="space-y-6">
                <TournamentsWidget />
                <TopPlayersWidget onNavigate={onNavigate} />
                <GroupsWidget />
                <MarketplaceWidget />
            </div>
        </div>
    );
};

export default CommunityView2;
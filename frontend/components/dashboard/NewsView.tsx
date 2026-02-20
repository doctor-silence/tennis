import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../../types';
import { api } from '../../services/api';
import { 
    Newspaper, Trophy, Dumbbell, Package, User as UserIcon, 
    Globe, Eye, ChevronLeft, Clock, Search, X, Loader2
} from 'lucide-react';

const CATEGORY_LABELS: Record<NewsArticle['category'], string> = {
    tournament: 'Турниры',
    player: 'Игроки',
    training: 'Тренировки',
    equipment: 'Инвентарь',
    general: 'Общее',
};

const CATEGORY_ICONS: Record<NewsArticle['category'], React.ReactNode> = {
    tournament: <Trophy size={14} />,
    player: <UserIcon size={14} />,
    training: <Dumbbell size={14} />,
    equipment: <Package size={14} />,
    general: <Globe size={14} />,
};

const CATEGORY_COLORS: Record<NewsArticle['category'], string> = {
    tournament: 'bg-amber-100 text-amber-700 border-amber-200',
    player: 'bg-blue-100 text-blue-700 border-blue-200',
    training: 'bg-lime-100 text-lime-700 border-lime-200',
    equipment: 'bg-purple-100 text-purple-700 border-purple-200',
    general: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface NewsCardProps {
    article: NewsArticle;
    featured?: boolean;
    onClick: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, featured = false, onClick }) => {
    if (featured) {
        return (
            <div
                className="relative rounded-2xl overflow-hidden cursor-pointer group h-80 lg:h-96"
                onClick={onClick}
            >
                <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${CATEGORY_COLORS[article.category]}`}>
                        {CATEGORY_ICONS[article.category]}
                        {CATEGORY_LABELS[article.category]}
                    </div>
                    <h2 className="text-white text-xl lg:text-2xl font-black leading-tight mb-2 group-hover:text-lime-300 transition-colors">
                        {article.title}
                    </h2>
                    <p className="text-slate-300 text-sm line-clamp-2 mb-3">{article.summary}</p>
                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(article.published_at)}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {article.views?.toLocaleString()}</span>
                        <span className="font-medium text-slate-300">{article.author}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={onClick}
        >
            <div className="h-44 overflow-hidden">
                <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div className="p-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${CATEGORY_COLORS[article.category]}`}>
                    {CATEGORY_ICONS[article.category]}
                    {CATEGORY_LABELS[article.category]}
                </div>
                <h3 className="font-bold text-slate-900 leading-tight mb-1.5 group-hover:text-lime-600 transition-colors line-clamp-2">
                    {article.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-3">{article.summary}</p>
                <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(article.published_at)}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {article.views?.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

interface ArticleDetailProps {
    article: NewsArticle;
    onBack: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onBack }) => {
    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-lime-600 transition-colors font-medium mb-6"
            >
                <ChevronLeft size={20} /> Назад к новостям
            </button>

            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="h-64 lg:h-80 overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 lg:p-8">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-4 ${CATEGORY_COLORS[article.category]}`}>
                        {CATEGORY_ICONS[article.category]}
                        {CATEGORY_LABELS[article.category]}
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mb-3 leading-tight">
                        {article.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <UserIcon size={14} /> {article.author}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock size={14} /> {formatDate(article.published_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Eye size={14} /> {article.views?.toLocaleString()} просмотров
                        </span>
                    </div>
                    <p className="text-slate-700 text-lg font-medium mb-4 leading-relaxed">{article.summary}</p>
                    <div className="prose prose-slate max-w-none">
                        {article.content.split('\n').map((paragraph, i) => (
                            paragraph.trim() ? (
                                <p key={i} className="text-slate-600 leading-relaxed mb-3">{paragraph}</p>
                            ) : <br key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NewsView: React.FC = () => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [activeCategory, setActiveCategory] = useState<NewsArticle['category'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        api.news.getAll().then(data => {
            setArticles(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filtered = articles.filter(a => {
        const matchCat = activeCategory === 'all' || a.category === activeCategory;
        const matchSearch = !searchQuery || 
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    const featured = filtered[0];
    const rest = filtered.slice(1);

    const categories: Array<{ key: NewsArticle['category'] | 'all'; label: string }> = [
        { key: 'all', label: 'Все' },
        { key: 'tournament', label: 'Турниры' },
        { key: 'player', label: 'Игроки' },
        { key: 'training', label: 'Тренировки' },
        { key: 'equipment', label: 'Инвентарь' },
        { key: 'general', label: 'Общее' },
    ];

    if (selectedArticle) {
        return (
            <div className="p-4 lg:p-8">
                <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Newspaper size={24} className="text-lime-500" /> Новости тенниса
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Актуальные новости из мира тенниса</p>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск новостей..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 w-52"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                            activeCategory === cat.key
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-lime-500" size={32} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Newspaper size={48} className="mb-3 opacity-40" />
                    <p className="font-medium">Новостей не найдено</p>
                    <p className="text-sm">Попробуйте изменить фильтр или поисковый запрос</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Featured article */}
                    {featured && (
                        <NewsCard article={featured} featured onClick={() => setSelectedArticle(featured)} />
                    )}

                    {/* Rest articles grid */}
                    {rest.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rest.map(article => (
                                <NewsCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NewsView;

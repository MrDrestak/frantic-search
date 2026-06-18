
import React, { useEffect, useState, useMemo } from 'react';
import { showcaseService, newsService, storeDirectoryService, auth, auctionService, userStatsService } from '../services/store';
import { ShowcaseItem, NewsItem, StoreProfile, GameType, Card, AuctionStatus, BinderType } from '../types';
import { Star, MapPin, Layers, Loader2, ChevronLeft, ChevronRight, Gavel, TrendingUp, Sparkles, Megaphone, Folder, Heart, MessageCircle, Calendar, X, ExternalLink, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';

interface HomeProps {
    onNavigate: (page: string) => void;
    onViewProfile: (userId: string) => void;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    onClick?: () => void;
    highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, onClick, highlight }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left group
            ${highlight
                ? 'bg-green-900/10 border-green-700/30 hover:border-green-500/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'
            }`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{label}</span>
        </div>
        <span className={`text-2xl font-black tabular-nums ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</span>
    </button>
);

const Home: React.FC<HomeProps> = ({ onNavigate, onViewProfile }) => {
    const { t } = useTranslation();
    const [allShowcaseItems, setAllShowcaseItems] = useState<ShowcaseItem[]>([]);
    const [filteredShowcaseItems, setFilteredShowcaseItems] = useState<ShowcaseItem[]>([]);
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [stores, setStores] = useState<StoreProfile[]>([]);
    const [auctions, setAuctions] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
    const [newsFilter, setNewsFilter] = useState<string>('');
    const [showcaseFilter, setShowcaseFilter] = useState<string>('');
    const [eventsModalStore, setEventsModalStore] = useState<StoreProfile | null>(null);
    const [userStats, setUserStats] = useState({ folderCards: 0, auctionCards: 0, wishlistCards: 0, pendingFeedbacks: 0 });

    const currentUser = auth.getCurrentUser();

    useEffect(() => {
        if (currentUser?.preferredGame) {
            setNewsFilter(currentUser.preferredGame);
            setShowcaseFilter(currentUser.preferredGame);
        }
    }, [currentUser]);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const [sc, nw, st, auc] = await Promise.all([
                    showcaseService.getNewestShowcase().catch(() => []),
                    newsService.getNews().catch(() => []),
                    storeDirectoryService.getStores().catch(() => []),
                    auctionService.getAllAuctions().catch(() => []),
                ]);
                setAllShowcaseItems(sc);
                setNewsItems(nw);
                setStores(st);
                setAuctions(auc);

                if (currentUser) {
                    const stats = await userStatsService.getUserStats(currentUser.id).catch(() => ({
                        folderCards: 0, auctionCards: 0, wishlistCards: 0, pendingFeedbacks: 0,
                    }));
                    setUserStats(stats);
                }
            } catch (e) {
                console.error('[Home] loadAll error', e);
            } finally {
                setTimeout(() => setLoading(false), 500);
            }
        };
        loadAll();
    }, []);

    const featuredAuction = useMemo(() => {
        const now = Date.now();
        const active = auctions.filter(a =>
            a.auctionEndDate && a.auctionEndDate >= now &&
            (a.auctionStatus === AuctionStatus.ACTIVE || a.binderType === BinderType.AUCTION)
        );
        if (!active.length || !currentUser) return null;
        const mine = active.filter(a => a.topBidderId === currentUser.id);
        if (mine.length > 0) return mine.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))[0];
        return active.sort((a, b) => b.addedAt - a.addedAt)[0];
    }, [auctions, currentUser]);

    const activeAuctionsCount = useMemo(() => {
        const now = Date.now();
        return auctions.filter(a =>
            a.auctionEndDate && a.auctionEndDate >= now &&
            (a.auctionStatus === AuctionStatus.ACTIVE || a.binderType === BinderType.AUCTION)
        ).length;
    }, [auctions]);

    useEffect(() => {
        let items = allShowcaseItems;
        if (showcaseFilter) items = items.filter(i => (i.game || GameType.MTG) === showcaseFilter);
        setFilteredShowcaseItems(items);
        setActiveIndex(0);
    }, [showcaseFilter, allShowcaseItems]);

    useEffect(() => {
        if (filteredShowcaseItems.length <= 1 || isHoveringCarousel) return;
        const interval = setInterval(() => {
            setActiveIndex(c => (c + 1) % filteredShowcaseItems.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [filteredShowcaseItems.length, isHoveringCarousel]);

    const n = filteredShowcaseItems.length;
    const prevIdx = (activeIndex - 1 + n) % n;
    const nextIdx = (activeIndex + 1) % n;

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center">
            <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Conectando con el Multiverso...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 pb-24 space-y-6">

            {/* ── Eventos Modal ── */}
            <AnimatePresence>
                {eventsModalStore && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setEventsModalStore(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full relative shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setEventsModalStore(null)}
                                className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                <img src={eventsModalStore.logoUrl} className="w-10 h-10 object-contain rounded-lg bg-white p-1 shrink-0" alt="" />
                                <div>
                                    <h3 className="text-white font-bold">{eventsModalStore.name}</h3>
                                    <p className="text-xs text-slate-400">Eventos de la semana</p>
                                </div>
                            </div>
                            {eventsModalStore.eventsImageUrl ? (
                                <img
                                    src={eventsModalStore.eventsImageUrl}
                                    className="w-full rounded-xl object-contain max-h-[70vh]"
                                    alt={`Eventos ${eventsModalStore.name}`}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                                    <Calendar size={40} className="opacity-20" />
                                    <p className="text-sm text-center">No hay eventos programados esta semana.</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── ROW 1: Info Panel | Subasta Destacada | Tiendas Aliadas ── */}
            <div className="grid grid-cols-1 md:grid-cols-20 gap-6 items-stretch">

                {/* 1. INFO PANEL */}
                <section className="col-span-1 md:col-span-5 flex flex-col order-1">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Zap className="text-violet-400" size={20} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Mi Resumen</h2>
                    </div>
                    <div className="h-[380px] bg-slate-900/40 border border-slate-800 rounded-3xl p-4 space-y-3">
                        <StatCard
                            icon={<Folder size={18} className="text-violet-400" />}
                            label="Cartas en Folders"
                            value={userStats.folderCards}
                            onClick={() => onNavigate('dashboard')}
                        />
                        <StatCard
                            icon={<Gavel size={18} className="text-amber-500" />}
                            label="En Subasta"
                            value={userStats.auctionCards}
                            onClick={() => onNavigate('auctions')}
                        />
                        <StatCard
                            icon={<Heart size={18} className="text-pink-500" />}
                            label="Lista de Deseos"
                            value={userStats.wishlistCards}
                            onClick={() => onNavigate('dashboard')}
                        />
                        <StatCard
                            icon={<MessageCircle size={18} className="text-green-400" />}
                            label="Feedbacks pendientes"
                            value={userStats.pendingFeedbacks}
                            onClick={() => onNavigate('profile')}
                            highlight={userStats.pendingFeedbacks > 0}
                        />
                    </div>
                </section>

                {/* 2. SUBASTA DESTACADA */}
                <section className="col-span-1 md:col-span-5 flex flex-col order-2">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Gavel className="text-amber-500" size={20} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('home.featuredAuction')}</h2>
                        {activeAuctionsCount > 0 && (
                            <span className="ml-auto flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {activeAuctionsCount} activa{activeAuctionsCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div className="h-[380px] bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden relative group">
                        {featuredAuction ? (
                            <div onClick={() => onNavigate('auctions')} className="h-full flex flex-col cursor-pointer">
                                <div className="flex-1 relative overflow-hidden">
                                    <img src={featuredAuction.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                    {featuredAuction.topBidderId === currentUser?.id && (
                                        <div className="absolute top-3 left-3 bg-green-600 text-[10px] font-black px-2 py-0.5 rounded-full text-white flex items-center gap-1 shadow-lg animate-pulse z-10">
                                            <TrendingUp size={10} /> GANANDO
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                </div>
                                <div className="p-4 space-y-3 bg-slate-900/80 backdrop-blur-md">
                                    <div>
                                        <h3 className="text-white font-bold text-base truncate">{featuredAuction.name}</h3>
                                        <p className="text-slate-400 text-xs">{featuredAuction.setName}</p>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-slate-800 pt-3">
                                        <div>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('auctions.currentBid')}</span>
                                            <span className="text-xl font-black text-amber-500">
                                                {featuredAuction.currency === 'PEN' ? 'S/' : '$'} {featuredAuction.currentBid?.toFixed(2)}
                                            </span>
                                        </div>
                                        <button className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black py-2 px-3 rounded-lg transition-colors">PUJAR</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, 0], boxShadow: ['0 0 0px rgba(245,158,11,0)', '0 0 30px rgba(245,158,11,0.3)', '0 0 0px rgba(245,158,11,0)'] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="p-4 bg-amber-500/10 rounded-full text-amber-600 border border-amber-500/20"
                                >
                                    <Gavel size={32} />
                                </motion.div>
                                <p className="text-slate-500 text-xs font-medium px-4">En espera de nuevas subastas en el multiverso.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. TIENDAS ALIADAS */}
                <section className="col-span-1 md:col-span-10 flex flex-col order-3">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <MapPin className="text-green-500" size={20} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('home.partnerStores')}</h2>
                    </div>
                    <div className="h-[380px] bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                        {stores.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">Próximamente más tiendas aliadas...</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 h-full">
                                {stores.slice(0, 6).map(store => (
                                    <div key={store.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full hover:border-green-500/30 transition-all group">
                                        {/* Logo — crece para llenar el espacio disponible */}
                                        <div
                                            className="flex-1 flex flex-col items-center justify-center cursor-pointer min-h-0"
                                            onClick={() => store.linkedUserId ? onViewProfile(store.linkedUserId) : window.open(store.websiteUrl, '_blank')}
                                        >
                                            <div className="w-full bg-white rounded-xl flex items-center justify-center p-3 border-2 border-transparent group-hover:border-green-500/20 shadow-md overflow-hidden transition-all" style={{ aspectRatio: '1/1' }}>
                                                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain" />
                                            </div>
                                            <h3 className="text-white font-bold text-xs text-center truncate w-full mt-2">{store.name}</h3>
                                        </div>

                                        {/* Bottom: Maps + Eventos */}
                                        <div className="space-y-2 mt-3 shrink-0">
                                            <a
                                                href={store.mapsUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={e => { if (!store.mapsUrl) e.preventDefault(); e.stopPropagation(); }}
                                                className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition-colors w-full justify-center"
                                            >
                                                <MapPin size={9} className="shrink-0" />
                                                <span className="truncate">{store.location}</span>
                                                {store.mapsUrl && <ExternalLink size={8} className="shrink-0 opacity-60" />}
                                            </a>
                                            <button
                                                onClick={() => setEventsModalStore(store)}
                                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 text-[10px] font-bold text-slate-400 hover:text-amber-400 transition-all"
                                            >
                                                <Calendar size={10} />
                                                Eventos
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* ── ROW 2: Vitrina | Noticias ── */}
            <div className="grid grid-cols-1 md:grid-cols-20 gap-6 items-stretch">

                {/* 4. VITRINA — 3-card carousel */}
                <section className="col-span-1 md:col-span-12 flex flex-col order-4">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Star className="text-amber-500" size={20} fill="currentColor" />
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Vitrina</h2>
                        </div>
                        <select
                            value={showcaseFilter}
                            onChange={e => setShowcaseFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 outline-none"
                        >
                            <option value="">{t('common.allGames')}</option>
                            {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div
                        className="h-[380px] bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden"
                        onMouseEnter={() => setIsHoveringCarousel(true)}
                        onMouseLeave={() => setIsHoveringCarousel(false)}
                    >
                        {filteredShowcaseItems.length > 0 ? (
                            <div className="h-full flex flex-col">
                                {/* Cards row — dimensiones fijas para no depender del ancho del contenedor */}
                                <div className="flex-1 flex items-center justify-center gap-6 px-4">
                                    {/* Prev */}
                                    {n > 1 && (
                                        <div
                                            className="shrink-0 cursor-pointer opacity-40 hover:opacity-65 transition-opacity rounded-xl overflow-hidden shadow-md"
                                            style={{ width: 100, height: 140 }}
                                            onClick={() => setActiveIndex(prevIdx)}
                                        >
                                            <img
                                                src={filteredShowcaseItems[prevIdx].imageUrl}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                    )}

                                    {/* Center */}
                                    <motion.div
                                        key={activeIndex}
                                        initial={{ opacity: 0.8, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="shrink-0 relative cursor-pointer rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
                                        style={{ width: 180, height: 252 }}
                                        onClick={() => onNavigate('showcase')}
                                    >
                                        <img
                                            src={filteredShowcaseItems[activeIndex].imageUrl}
                                            className="w-full h-full object-cover"
                                            alt={filteredShowcaseItems[activeIndex].name}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <h3 className="text-white font-bold text-sm truncate">{filteredShowcaseItems[activeIndex].name}</h3>
                                            <p className="text-slate-400 text-[10px]">{filteredShowcaseItems[activeIndex].sellerName}</p>
                                        </div>
                                    </motion.div>

                                    {/* Next */}
                                    {n > 1 && (
                                        <div
                                            className="shrink-0 cursor-pointer opacity-40 hover:opacity-65 transition-opacity rounded-xl overflow-hidden shadow-md"
                                            style={{ width: 100, height: 140 }}
                                            onClick={() => setActiveIndex(nextIdx)}
                                        >
                                            <img
                                                src={filteredShowcaseItems[nextIdx].imageUrl}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Dot indicators + prev/next buttons */}
                                <div className="pb-5 flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => setActiveIndex(prevIdx)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex gap-1.5">
                                        {filteredShowcaseItems.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveIndex(i)}
                                                className={`rounded-full transition-all duration-300 ${i === activeIndex ? 'w-5 h-2 bg-violet-500' : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setActiveIndex(nextIdx)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                                <Sparkles size={48} className="opacity-20" />
                                <p className="text-sm">No hay cartas en vitrina disponibles.</p>
                                <button onClick={() => onNavigate('showcase')} className="text-violet-500 hover:text-violet-400 text-xs font-bold transition-colors">
                                    Ver Vitrina →
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* 5. ÚLTIMAS NOTICIAS */}
                <section className="col-span-1 md:col-span-8 flex flex-col order-5">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Layers className="text-violet-500" size={20} />
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('home.latestNews')}</h2>
                        </div>
                        <select
                            value={newsFilter}
                            onChange={e => setNewsFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                        >
                            <option value="">{t('common.allGames')}</option>
                            {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="h-[380px] bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-3 overflow-y-auto">
                        {newsItems.filter(ni => !newsFilter || ni.game === newsFilter).slice(0, 5).map(news => (
                            <a
                                key={news.id}
                                href={news.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex gap-3 p-2 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-violet-500/40 hover:bg-slate-950/80 transition-all group"
                            >
                                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-slate-800">
                                    <img src={news.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <h3 className="text-slate-100 font-bold text-[12px] line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">{news.title}</h3>
                                    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                        <span>{news.sourceName}</span>
                                        <span>{new Date(news.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                        {newsItems.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm">
                                <Megaphone className="mb-2 opacity-10" size={32} />
                                <p>No hay noticias recientes.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;

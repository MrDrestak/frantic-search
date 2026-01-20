
import React, { useEffect, useState, useMemo } from 'react';
import { showcaseService, newsService, storeDirectoryService, auth, auctionService } from '../services/store';
import { ShowcaseItem, NewsItem, StoreProfile, GameType, Card, AuctionStatus } from '../types';
import { Star, ExternalLink, MapPin, Layers, Loader2, Filter, Check, Globe, ChevronLeft, ChevronRight, Gavel, Clock, Zap, TrendingUp, Sparkles } from 'lucide-react';
import HolographicCard from '../components/HolographicCard';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeProps {
    onNavigate: (page: string) => void;
    onViewProfile: (userId: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, onViewProfile }) => {
    const [allShowcaseItems, setAllShowcaseItems] = useState<ShowcaseItem[]>([]);
    const [filteredShowcaseItems, setFilteredShowcaseItems] = useState<ShowcaseItem[]>([]);
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [stores, setStores] = useState<StoreProfile[]>([]);
    const [auctions, setAuctions] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    // Carousel State
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
    
    // Filters
    const [newsFilter, setNewsFilter] = useState<string>('');
    const [showcaseFilter, setShowcaseFilter] = useState<string>('');

    const currentUser = auth.getCurrentUser();

    useEffect(() => {
        if (currentUser && currentUser.preferredGame) {
            setNewsFilter(currentUser.preferredGame);
            setShowcaseFilter(currentUser.preferredGame);
        }
    }, [currentUser]);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const showcasePromise = showcaseService.getNewestShowcase().catch(() => []);
                const newsPromise = newsService.getNews().catch(() => []);
                const storesPromise = storeDirectoryService.getStores().catch(() => []);
                const auctionPromise = auctionService.getAllAuctions().catch(() => []);

                const [sc, nw, st, auc] = await Promise.all([showcasePromise, newsPromise, storesPromise, auctionPromise]);
                
                setAllShowcaseItems(sc);
                setNewsItems(nw);
                setStores(st);
                setAuctions(auc);
            } catch (e) {
                console.error("Error loading home data", e);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // Selection Logic for Featured Auction
    const featuredAuction = useMemo(() => {
        if (!auctions.length || !currentUser) return null;

        // Situation A: Active participation
        const myAuctions = auctions.filter(a => a.topBidderId === currentUser.id);
        if (myAuctions.length > 0) {
            return myAuctions.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))[0];
        }

        // Situation B: Discovery (Freshness)
        const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
        const freshAuctions = auctions.filter(a => a.addedAt >= twoDaysAgo);
        if (freshAuctions.length > 0) {
            return freshAuctions.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))[0];
        }

        return null;
    }, [auctions, currentUser]);

    // Carousel Auto-Rotation Logic
    useEffect(() => {
        let items = allShowcaseItems;
        if (showcaseFilter) {
            items = items.filter(item => (item.game || GameType.MTG) === showcaseFilter);
        }
        setFilteredShowcaseItems(items);
        setActiveIndex(0);
    }, [showcaseFilter, allShowcaseItems]);

    useEffect(() => {
        if (filteredShowcaseItems.length <= 1 || isHoveringCarousel) return;
        const interval = setInterval(() => {
            setActiveIndex(current => (current + 1) % filteredShowcaseItems.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [filteredShowcaseItems.length, isHoveringCarousel]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(current => (current - 1 + filteredShowcaseItems.length) % filteredShowcaseItems.length);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(current => (current + 1) % filteredShowcaseItems.length);
    };

    const getGameBadgeColor = (game: GameType) => {
        switch(game) {
            case GameType.MTG: return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
            case GameType.POKEMON: return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
            case GameType.YUGIOH: return 'bg-rose-900/50 text-rose-300 border-rose-700';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center">
            <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Cargando experiencia Lotus...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 pb-24">
            {/* GRID LAYOUT FOR DESKTOP, STACK FOR MOBILE */}
            <div className="grid grid-cols-1 md:grid-cols-20 gap-8">
                
                {/* 1. FEATURED SHOWCASE (75% Desktop, Top Mobile) */}
                <section className="col-span-1 md:col-span-15 order-1">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Star className="text-amber-500" />
                            <h2 className="text-2xl font-bold text-white tracking-tight">Featured Showcase</h2>
                        </div>
                        <select 
                            value={showcaseFilter}
                            onChange={(e) => setShowcaseFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Games</option>
                            {Object.values(GameType).map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    
                    {filteredShowcaseItems.length === 0 ? (
                        <div className="h-96 md:h-[32rem] bg-slate-900/50 rounded-3xl flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800">
                            <Sparkles size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">No hay tesoros que mostrar en esta categoría.</p>
                        </div>
                    ) : (
                        <div 
                            className="relative group/carousel"
                            onMouseEnter={() => setIsHoveringCarousel(true)}
                            onMouseLeave={() => setIsHoveringCarousel(false)}
                        >
                            <HolographicCard 
                                imageUrl={filteredShowcaseItems[activeIndex].imageUrl}
                                name={filteredShowcaseItems[activeIndex].name}
                                sellerName={filteredShowcaseItems[activeIndex].sellerName}
                                onClick={() => onNavigate('showcase')}
                            />
                            
                            <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                                <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl">
                                    <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"><ChevronLeft size={20} /></button>
                                    <div className="flex gap-2 px-2">
                                        {filteredShowcaseItems.slice(0, 10).map((_, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/20'}`}
                                            />
                                        ))}
                                    </div>
                                    <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"><ChevronRight size={20} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* 2. FEATURED AUCTION (25% Desktop, 2nd Mobile) */}
                <section className="col-span-1 md:col-span-5 order-2">
                    <div className="flex items-center gap-2 mb-6">
                        <Gavel className="text-amber-500" />
                        <h2 className="text-2xl font-bold text-white tracking-tight">Featured Auction</h2>
                    </div>

                    <div className="h-full">
                        {featuredAuction ? (
                            <motion.div 
                                onClick={() => onNavigate('auctions')}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`h-[32rem] md:h-[calc(32rem-3rem)] rounded-3xl overflow-hidden border relative group cursor-pointer transition-all duration-500 shadow-2xl ${
                                    featuredAuction.topBidderId === currentUser?.id 
                                    ? 'border-green-500/50 shadow-green-900/20 ring-1 ring-green-500/20' 
                                    : 'border-slate-800 hover:border-amber-500/50 shadow-black'
                                }`}
                            >
                                <img src={featuredAuction.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                
                                {/* Overlay Gradiente */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 flex flex-col justify-end">
                                    {featuredAuction.topBidderId === currentUser?.id && (
                                        <div className="absolute top-4 left-4 bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                                            <TrendingUp size={12} /> GANANDO
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="text-white font-black text-2xl truncate drop-shadow-lg">{featuredAuction.name}</h3>
                                        <p className="text-slate-400 text-sm font-medium">{featuredAuction.setName}</p>
                                    </div>

                                    <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase font-bold text-slate-500">Current Bid</span>
                                            <div className="text-xl font-black text-white">
                                                {featuredAuction.currency === 'PEN' ? 'S/' : '$'} {featuredAuction.currentBid?.toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <Clock size={14} />
                                                <span className="text-xs font-bold uppercase tracking-widest">Active</span>
                                            </div>
                                            <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-colors">
                                                PUJAR AHORA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-[32rem] md:h-[calc(32rem-3rem)] bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-6">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="p-6 bg-amber-500/10 rounded-full text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.1)] border border-amber-500/20"
                                >
                                    <Gavel size={48} />
                                </motion.div>
                                <div className="space-y-2">
                                    <h3 className="text-white font-bold text-xl">En espera de nuevas subastas</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">Únete al Discord o revisa más tarde para descubrir piezas únicas.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. PARTNER STORES (60% Desktop, 3rd Mobile) */}
                <section className="col-span-1 md:col-span-12 order-3">
                    <div className="flex items-center gap-2 mb-8">
                        <MapPin className="text-green-500" />
                        <h2 className="text-2xl font-bold text-white tracking-tight">Partner Stores</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {stores.slice(0, 8).map(store => (
                            <motion.div 
                                key={store.id} 
                                whileHover={{ y: -5 }}
                                className="flex flex-col items-center group"
                            >
                                <div 
                                    onClick={() => store.linkedUserId ? onViewProfile(store.linkedUserId) : window.open(store.websiteUrl, '_blank')}
                                    className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center p-4 mb-4 cursor-pointer shadow-lg group-hover:shadow-green-500/10 transition-all border-4 border-transparent group-hover:border-green-500/20"
                                >
                                    <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-white font-bold text-sm mb-1 text-center truncate w-full">{store.name}</h3>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                    <MapPin size={10} /> {store.location.split(',')[0]}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* 4. LATEST NEWS (40% Desktop, 4th Mobile) */}
                <section className="col-span-1 md:col-span-8 order-4">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2">
                            <Layers className="text-violet-500" />
                            <h2 className="text-2xl font-bold text-white tracking-tight">Latest News</h2>
                        </div>
                        <select 
                            value={newsFilter} 
                            onChange={(e) => setNewsFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                        >
                            <option value="">All Games</option>
                            {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="space-y-4">
                        {newsItems.filter(n => !newsFilter || n.game === newsFilter).slice(0, 4).map(news => (
                            <a 
                                key={news.id} 
                                href={news.linkUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex gap-4 p-3 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-violet-500/50 hover:bg-slate-900 transition-all group overflow-hidden"
                            >
                                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden relative">
                                    <img src={news.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <h3 className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">{news.title}</h3>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <span>{news.sourceName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <span>{new Date(news.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        ))}
                        {newsItems.length === 0 && (
                            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-sm font-medium">Buscando noticias en el multiverso...</p>
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Home;


import React, { useEffect, useState, useMemo } from 'react';
import { showcaseService, newsService, storeDirectoryService, auth, auctionService } from '../services/store';
import { ShowcaseItem, NewsItem, StoreProfile, GameType, Card, AuctionStatus, BinderType } from '../types';
import { Star, MapPin, Layers, Loader2, ChevronLeft, ChevronRight, Gavel, Clock, Zap, TrendingUp, Sparkles, Megaphone } from 'lucide-react';
import HolographicCard from '../components/HolographicCard';
import { motion } from 'framer-motion';

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

    const [activeIndex, setActiveIndex] = useState(0);
    const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
    
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
                const [sc, nw, st, auc] = await Promise.all([
                    showcaseService.getNewestShowcase().catch(() => []),
                    newsService.getNews().catch(() => []),
                    storeDirectoryService.getStores().catch(() => []),
                    auctionService.getAllAuctions().catch(() => [])
                ]);
                
                setAllShowcaseItems(sc);
                setNewsItems(nw);
                setStores(st);
                setAuctions(auc);
            } catch (e) {
                console.error("Error loading home data", e);
            } finally {
                setTimeout(() => setLoading(false), 500);
            }
        };
        loadAll();
    }, []);

    // Logic for Featured Auction (Based on user specific criteria)
    const featuredAuction = useMemo(() => {
        const now = Date.now();
        // Solo consideramos subastas que no han expirado (endDate >= ahora) y están en estado ACTIVE
        const activeAuctions = auctions.filter(a => 
            a.auctionEndDate && 
            a.auctionEndDate >= now && 
            (a.auctionStatus === AuctionStatus.ACTIVE || a.binderType === BinderType.AUCTION)
        );

        if (!activeAuctions.length || !currentUser) return null;

        // CRITERIO 1: Participación Activa (Usuario es el mejor postor actual)
        const myParticipations = activeAuctions.filter(a => a.topBidderId === currentUser.id);
        if (myParticipations.length > 0) {
            // Si hay varias, mostramos la de mayor valor actual
            return myParticipations.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))[0];
        }

        // CRITERIO 2: Descubrimiento (La más reciente creada que siga activa)
        return activeAuctions.sort((a, b) => b.addedAt - a.addedAt)[0];
    }, [auctions, currentUser]);

    useEffect(() => {
        let items = allShowcaseItems;
        if (showcaseFilter) items = items.filter(item => (item.game || GameType.MTG) === showcaseFilter);
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

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center">
            <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Conectando con el Multiverso...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 pb-24 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-20 gap-6 items-stretch">
                
                {/* 1. FEATURED SHOWCASE (75% Desktop) */}
                <section className="col-span-1 md:col-span-15 flex flex-col h-full order-1">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Star className="text-amber-500" size={20} fill="currentColor" />
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Featured Showcase</h2>
                        </div>
                        <select 
                            value={showcaseFilter}
                            onChange={(e) => setShowcaseFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 outline-none"
                        >
                            <option value="">All Games</option>
                            {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden relative min-h-[400px]">
                        {filteredShowcaseItems.length > 0 ? (
                            <div 
                                className="h-full group/carousel"
                                onMouseEnter={() => setIsHoveringCarousel(true)}
                                onMouseLeave={() => setIsHoveringCarousel(false)}
                            >
                                <HolographicCard 
                                    imageUrl={filteredShowcaseItems[activeIndex].imageUrl}
                                    name={filteredShowcaseItems[activeIndex].name}
                                    sellerName={filteredShowcaseItems[activeIndex].sellerName}
                                    onClick={() => onNavigate('showcase')}
                                />
                                <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
                                    <button onClick={() => setActiveIndex(c => (c - 1 + filteredShowcaseItems.length) % filteredShowcaseItems.length)} className="p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"><ChevronLeft size={16}/></button>
                                    <button onClick={() => setActiveIndex(c => (c + 1) % filteredShowcaseItems.length)} className="p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <Sparkles size={48} className="mb-2 opacity-20" />
                                <p>No hay showcase destacado disponible.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. FEATURED AUCTION (25% Desktop) */}
                <section className="col-span-1 md:col-span-5 flex flex-col h-full order-2">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Gavel className="text-amber-500" size={20} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Featured Auction</h2>
                    </div>

                    <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden relative group min-h-[400px]">
                        {featuredAuction ? (
                            <div 
                                onClick={() => onNavigate('auctions')}
                                className="h-full flex flex-col cursor-pointer"
                            >
                                <div className="flex-1 relative overflow-hidden">
                                    <img src={featuredAuction.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                    {featuredAuction.topBidderId === currentUser?.id && (
                                        <div className="absolute top-3 left-3 bg-green-600 text-[10px] font-black px-2 py-0.5 rounded-full text-white flex items-center gap-1 shadow-lg animate-pulse z-10">
                                            <TrendingUp size={10} /> GANANDO
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                </div>
                                <div className="p-5 space-y-4 bg-slate-900/80 backdrop-blur-md">
                                    <div>
                                        <h3 className="text-white font-bold text-lg truncate">{featuredAuction.name}</h3>
                                        <p className="text-slate-400 text-xs">{featuredAuction.setName}</p>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-slate-800 pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Current Bid</span>
                                            <span className="text-xl font-black text-amber-500">
                                                {featuredAuction.currency === 'PEN' ? 'S/' : '$'} {featuredAuction.currentBid?.toFixed(2)}
                                            </span>
                                        </div>
                                        <button className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black py-2 px-3 rounded-lg transition-colors">
                                            PUJAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <motion.div 
                                    animate={{ 
                                        rotate: [0, -10, 10, 0],
                                        boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 30px rgba(245,158,11,0.3)", "0 0 0px rgba(245,158,11,0)"]
                                    }} 
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

                {/* 3. PARTNER STORES (60% Desktop) */}
                <section className="col-span-1 md:col-span-12 flex flex-col h-full order-3">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <MapPin className="text-green-500" size={20} />
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Partner Stores</h2>
                    </div>

                    <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-inner min-h-[300px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {stores.slice(0, 8).map(store => (
                                <motion.div 
                                    key={store.id} 
                                    whileHover={{ y: -4 }}
                                    onClick={() => store.linkedUserId ? onViewProfile(store.linkedUserId) : window.open(store.websiteUrl, '_blank')}
                                    className="flex flex-col items-center gap-3 cursor-pointer group"
                                >
                                    <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center p-3 border-4 border-transparent group-hover:border-green-500/20 shadow-lg transition-all overflow-hidden">
                                        <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-center w-full">
                                        <h3 className="text-white font-bold text-xs truncate">{store.name}</h3>
                                        <p className="text-[10px] text-slate-500 truncate">{store.location.split(',')[0]}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {stores.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-600 italic text-sm">Próximamente más tiendas aliadas...</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 4. LATEST NEWS (40% Desktop) */}
                <section className="col-span-1 md:col-span-8 flex flex-col h-full order-4">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Layers className="text-violet-500" size={20} />
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Latest News</h2>
                        </div>
                        <select 
                            value={newsFilter} 
                            onChange={(e) => setNewsFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                        >
                            <option value="">All Games</option>
                            {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4 min-h-[300px]">
                        {newsItems.filter(n => !newsFilter || n.game === newsFilter).slice(0, 4).map(news => (
                            <a 
                                key={news.id} 
                                href={news.linkUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex gap-4 p-2 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-violet-500/40 hover:bg-slate-950/80 transition-all group"
                            >
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-800">
                                    <img src={news.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <h3 className="text-slate-100 font-bold text-[13px] line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">{news.title}</h3>
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

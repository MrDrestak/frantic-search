
import React, { useEffect, useState, useRef } from 'react';
import { showcaseService, newsService, storeDirectoryService, auth } from '../services/store';
import { ShowcaseItem, NewsItem, StoreProfile, GameType } from '../types';
import { Star, ExternalLink, MapPin, Gamepad2, Layers, Loader2, Filter } from 'lucide-react';

interface HomeProps {
    onNavigate: (page: string) => void;
    onViewProfile: (userId: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, onViewProfile }) => {
    const [allShowcaseItems, setAllShowcaseItems] = useState<ShowcaseItem[]>([]);
    const [filteredShowcaseItems, setFilteredShowcaseItems] = useState<ShowcaseItem[]>([]);
    
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [stores, setStores] = useState<StoreProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Carousel State
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
    
    // Filters
    const [newsFilter, setNewsFilter] = useState<string>('');
    const [showcaseFilter, setShowcaseFilter] = useState<string>('');

    // User Preference
    useEffect(() => {
        const user = auth.getCurrentUser();
        if (user && user.preferredGame) {
            setNewsFilter(user.preferredGame);
            setShowcaseFilter(user.preferredGame);
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            const [sc, nw, st] = await Promise.all([
                showcaseService.getNewestShowcase(),
                newsService.getNews(),
                storeDirectoryService.getStores()
            ]);
            setAllShowcaseItems(sc);
            setNewsItems(nw);
            setStores(st);
            setLoading(false);
        };
        loadAll();
    }, []);

    // Filter Showcase Items Logic
    useEffect(() => {
        let items = allShowcaseItems;
        if (showcaseFilter) {
            items = items.filter(item => {
                const itemGame = item.game || GameType.MTG;
                return itemGame === showcaseFilter;
            });
        }
        setFilteredShowcaseItems(items);
        setActiveIndex(0); // Reset index when filter changes
    }, [showcaseFilter, allShowcaseItems]);

    // Carousel Auto-Rotation Logic
    useEffect(() => {
        if (filteredShowcaseItems.length === 0 || isHoveringCarousel) return;
        
        const interval = setInterval(() => {
            setActiveIndex(current => (current + 1) % filteredShowcaseItems.length);
        }, 4000); // 4 seconds

        return () => clearInterval(interval);
    }, [filteredShowcaseItems.length, isHoveringCarousel]);

    const filteredNews = newsItems
        .filter(n => !newsFilter || n.game === newsFilter)
        .slice(0, 4);

    const getGameBadgeColor = (game: GameType) => {
        switch(game) {
            case GameType.MTG: return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
            case GameType.POKEMON: return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
            case GameType.YUGIOH: return 'bg-rose-900/50 text-rose-300 border-rose-700';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading Home...</div>;

    return (
        <div className="p-4 md:p-8 space-y-12 pb-24">
            {/* SECTION 1: NEWEST SHOWCASE CAROUSEL */}
            <section>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <Star className="text-amber-500" />
                        <h2 className="text-2xl font-bold text-white">Newest Showcase</h2>
                    </div>
                    {/* Showcase Filter Dropdown */}
                    <div className="relative w-48">
                        <Filter className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <select 
                            value={showcaseFilter}
                            onChange={(e) => setShowcaseFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                        >
                            <option value="">All Games</option>
                            {Object.values(GameType).map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {filteredShowcaseItems.length === 0 ? (
                    <div className="h-64 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-500 border border-slate-800">
                        <p>No showcase items found for this filter.</p>
                        {showcaseFilter && <button onClick={() => setShowcaseFilter('')} className="text-violet-400 underline mt-2">Clear Filter</button>}
                    </div>
                ) : (
                    <div 
                        className="relative w-full max-w-4xl mx-auto h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group cursor-pointer"
                        onMouseEnter={() => setIsHoveringCarousel(true)}
                        onMouseLeave={() => setIsHoveringCarousel(false)}
                        onClick={() => onNavigate('showcase')}
                    >
                        {/* Background Blur */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 transition-all duration-700"
                            style={{ backgroundImage: `url(${filteredShowcaseItems[activeIndex].imageUrl})` }}
                        />
                        
                        {/* Main Image */}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                             <img 
                                src={filteredShowcaseItems[activeIndex].imageUrl} 
                                alt={filteredShowcaseItems[activeIndex].name}
                                className="h-full object-contain rounded-lg shadow-2xl drop-shadow-2xl transition-all duration-500 transform hover:scale-105"
                             />
                        </div>

                        {/* Overlay Info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12 flex justify-between items-end">
                            <div>
                                <h3 className="text-white font-bold text-xl md:text-2xl truncate max-w-xs md:max-w-md drop-shadow-md">{filteredShowcaseItems[activeIndex].name}</h3>
                                <p className="text-slate-300 text-sm flex items-center gap-2">
                                    <span className="opacity-70">Sold by</span> 
                                    <span className="font-bold text-amber-400">{filteredShowcaseItems[activeIndex].sellerName}</span>
                                </p>
                            </div>
                            
                            {/* Indicators */}
                            <div className="flex gap-2 mb-1">
                                {filteredShowcaseItems.map((_, idx) => (
                                    <div 
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-slate-600'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* SECTION 2: NEWS */}
            <section>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Layers className="text-violet-500" /> Latest News
                        </h2>
                        <p className="text-slate-400 text-sm">Updates from the TCG world.</p>
                    </div>
                    <select 
                        value={newsFilter} 
                        onChange={(e) => setNewsFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                        <option value="">All Games</option>
                        {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredNews.map(news => (
                        <a 
                            key={news.id} 
                            href={news.linkUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/10 transition-all group flex flex-col h-full"
                        >
                            <div className="h-40 overflow-hidden relative">
                                <img 
                                    src={news.imageUrl} 
                                    alt={news.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-2 left-2">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border backdrop-blur-md ${getGameBadgeColor(news.game)}`}>
                                         {news.game === GameType.MTG ? 'MTG' : news.game === GameType.POKEMON ? 'PKM' : 'YGO'}
                                     </span>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="text-white font-bold leading-tight mb-2 group-hover:text-violet-400 transition-colors line-clamp-2">
                                    {news.title}
                                </h3>
                                <div className="mt-auto flex justify-between items-center text-xs text-slate-500">
                                    <span>{news.sourceName}</span>
                                    <span>{new Date(news.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                    {filteredNews.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                            No news available.
                        </div>
                    )}
                </div>
            </section>

            {/* SECTION 3: STORES DIRECTORY */}
            <section>
                 <div className="flex items-center gap-2 mb-6">
                    <MapPin className="text-green-500" />
                    <h2 className="text-2xl font-bold text-white">Partner Stores</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {stores.map(store => (
                        <div key={store.id} className="flex flex-col items-center text-center group">
                            {/* Logo: Square, No Effects, Zoom on Hover, White Background */}
                            <a 
                                href={store.websiteUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl flex items-center justify-center p-2 mb-3 transition-transform duration-300 group-hover:scale-105 overflow-hidden"
                            >
                                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-contain" />
                            </a>

                            <h3 className="text-white font-bold mb-1">{store.name}</h3>
                            
                            <a 
                                href={store.mapsUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs text-slate-400 hover:text-green-400 flex items-center gap-1 mb-2"
                            >
                                <MapPin size={10} /> {store.location}
                            </a>

                            {/* Game Badges */}
                            <div className="flex gap-1 justify-center flex-wrap mt-1">
                                {store.games.map(g => (
                                    <span 
                                        key={g} 
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getGameBadgeColor(g)}`}
                                    >
                                        {g === GameType.MTG ? 'MTG' : g === GameType.POKEMON ? 'PKM' : 'YGO'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {stores.length === 0 && (
                         <div className="col-span-full py-10 text-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                            No partner stores listed yet.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Home;

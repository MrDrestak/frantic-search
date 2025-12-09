
import React, { useEffect, useState } from 'react';
import { showcaseService } from '../services/store';
import { ShowcaseItem, GameType } from '../types';
import { Star, Search, Filter, User, ExternalLink } from 'lucide-react';

interface ShowcaseProps {
    onViewProfile: (userId: string) => void;
}

const Showcase: React.FC<ShowcaseProps> = ({ onViewProfile }) => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [gameFilter, setGameFilter] = useState<string>(""); // Default to empty (All Games)
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadShowcase();
  }, []);

  const loadShowcase = async () => {
      setLoading(true);
      const data = await showcaseService.getShowcaseItems();
      setItems(data);
      setLoading(false);
  }

  // Filter Logic
  const filteredItems = items.filter(item => {
      // 1. Game Filter 
      if (gameFilter) {
          // Backward compatibility: If card has no game property, assume MTG
          const itemGame = item.game || GameType.MTG;
          if (itemGame !== gameFilter) {
              return false;
          }
      }
      
      // 2. Name Filter (Min 3 chars)
      if (searchText.length >= 3) {
          if (!item.name.toLowerCase().includes(searchText.toLowerCase())) {
              return false;
          }
      }
      return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
      <header>
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Star size={24} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold text-white">Community Showcase</h1>
        </div>
        <p className="text-slate-400">Discover top-tier cards listed by our top traders.</p>
      </header>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
              <input 
                  type="text" 
                  placeholder="Filter cards (min 3 chars)..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none"
              />
          </div>
          <div className="w-full md:w-64 relative">
              <Filter className="absolute left-3 top-2.5 text-slate-500" size={18} />
              <select 
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
              >
                  <option value="">All Games</option>
                  {Object.values(GameType).map(g => (
                      <option key={g} value={g}>{g}</option>
                  ))}
              </select>
          </div>
      </div>

      {/* Grid */}
      {loading ? (
          <div className="text-center py-20 text-slate-500">Loading showcase...</div>
      ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredItems.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-amber-500/50 transition-all shadow-lg hover:shadow-amber-900/10 flex flex-col">
                      <div className="relative aspect-[2.5/3.5] overflow-hidden">
                          <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          />
                          {item.isFoil && (
                              <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-transparent bg-clip-text bg-rainbow border border-slate-700">
                                  FOIL
                              </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-4 pt-12">
                                <div className="text-2xl font-bold text-white drop-shadow-md">
                                    ${item.price?.toFixed(2) || '---'}
                                </div>
                          </div>
                      </div>
                      
                      <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-white truncate text-lg mb-1">{item.name}</h3>
                          <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded">{item.setName}</span>
                              <span className="uppercase font-medium">{item.condition}</span>
                          </div>
                          
                          <div className="mt-auto pt-3 border-t border-slate-800">
                              <button 
                                onClick={() => onViewProfile(item.sellerId)}
                                className="w-full flex items-center justify-between gap-2 bg-slate-950 hover:bg-violet-600/10 border border-slate-800 hover:border-violet-500/50 p-2 rounded-lg transition-all group/btn"
                              >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-900 flex items-center justify-center text-[10px] font-bold text-indigo-200 group-hover/btn:bg-violet-600 group-hover/btn:text-white transition-colors">
                                        <User size={12} />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover/btn:text-white truncate font-medium">
                                        {item.sellerName}
                                    </span>
                                  </div>
                                  <ExternalLink size={14} className="text-slate-500 group-hover/btn:text-violet-400" />
                              </button>
                          </div>
                      </div>
                  </div>
              ))}

              {filteredItems.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                      No showcase items found matching your filters.
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default Showcase;

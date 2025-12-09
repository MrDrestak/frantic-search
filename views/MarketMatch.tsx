
import React, { useEffect, useState } from 'react';
import { matchingService, auth } from '../services/store';
import { MatchResult } from '../types';
import { MessageCircle, User, MapPin } from 'lucide-react';
import { getCardImage } from '../services/scryfallService';

interface MarketMatchProps {
    onOpenChat: (userId: string) => void;
    onViewProfile: (userId: string) => void;
}

const MarketMatch: React.FC<MarketMatchProps> = ({ onOpenChat, onViewProfile }) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    const user = auth.getCurrentUser();
    if (user) {
        const results = await matchingService.findMatches(user.id);
        setMatches(results);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
       <header>
          <h1 className="text-2xl font-bold text-white">Market Matches</h1>
          <p className="text-slate-400">We found people selling cards from your Wishlists.</p>
       </header>

       {loading ? (
           <div className="text-center py-20 text-slate-500">Scanning the multiverse...</div>
       ) : matches.length === 0 ? (
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
               <h3 className="text-xl text-white mb-2">No matches found yet</h3>
               <p className="text-slate-400">Add more cards to your "Wishlist" binders, or wait for others to list them.</p>
           </div>
       ) : (
           <div className="space-y-4">
               {matches.map((match, idx) => (
                   <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-violet-500/30 transition-colors">
                       {/* Card Info */}
                       <div className="flex gap-4 items-center flex-1">
                           <img 
                                src={match.card.imageUrl} 
                                alt={match.card.name}
                                className="w-16 h-24 rounded object-cover bg-black"
                           />
                           <div>
                               <div className="flex items-center gap-2">
                                   <h3 className="font-bold text-white text-lg">{match.card.name}</h3>
                                   {match.matchCard.isFoil && <span className="bg-rainbow text-transparent bg-clip-text text-xs font-bold border border-yellow-500/30 px-1 rounded">FOIL</span>}
                               </div>
                               <p className="text-slate-400 text-sm">{match.card.setName}</p>
                               <div className="mt-2 flex gap-2">
                                   <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">Condition: {match.matchCard.condition}</span>
                               </div>
                           </div>
                       </div>

                       {/* Seller Info */}
                       <div className="w-full md:w-64 bg-slate-950 rounded-lg p-3 border border-slate-800">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                        {match.seller.displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <button 
                                            onClick={() => onViewProfile(match.seller.id)}
                                            className="text-sm font-bold text-white hover:text-violet-400 hover:underline text-left"
                                        >
                                            {match.seller.displayName}
                                        </button>
                                        <p className="text-xs text-slate-500">Trader</p>
                                    </div>
                                </div>
                            </div>
                            
                            {match.seller.preferredStore && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                                    <MapPin size={12} /> {match.seller.preferredStore}
                                </p>
                            )}

                            <button 
                                onClick={() => onViewProfile(match.seller.id)}
                                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm py-2 rounded flex items-center justify-center gap-2 transition-colors"
                            >
                                <User size={16} /> Contact Seller
                            </button>
                       </div>
                   </div>
               ))}
           </div>
       )}
    </div>
  );
};

export default MarketMatch;

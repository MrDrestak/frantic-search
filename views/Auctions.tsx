
import React, { useEffect, useState } from 'react';
import { auctionService, auth } from '../services/store';
import { Card, GameType } from '../types';
import AuctionCard from '../components/AuctionCard';
import PremiumLoading from '../components/PremiumLoading';
import { Gavel, Search, Filter } from 'lucide-react';
import { db } from '../services/firebase';

interface AuctionsProps {
    onViewProfile: (userId: string) => void;
}

const Auctions: React.FC<AuctionsProps> = ({ onViewProfile }) => {
    const [auctions, setAuctions] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

    const [searchText, setSearchText] = useState('');
    const [showMyBids, setShowMyBids] = useState(false);
    const [gameFilter, setGameFilter] = useState<string>('');

    const currentUser = auth.getCurrentUser();

    useEffect(() => {
        if (currentUser && currentUser.preferredGame) {
            setGameFilter(currentUser.preferredGame);
        }
        loadAuctions();
    }, []);

    const loadAuctions = async () => {
        setLoading(true);
        try {
            const data = await auctionService.getAllAuctions();
            const uIds = new Set(data.map(c => c.userId));
            const uMap = new Map<string, string>();
            
            await Promise.all(Array.from(uIds).map(async (uid) => {
                try {
                    const userDoc = await db.collection("users").doc(uid).get();
                    if (userDoc.exists) {
                        uMap.set(uid, (userDoc.data() as any)?.displayName || 'Unknown');
                    }
                } catch(e) { console.warn(e); }
            }));
            
            setUserMap(uMap);
            setAuctions(data);
        } catch (e) {
            console.error("Error loading auctions", e);
        } finally {
            setTimeout(() => setLoading(false), 800);
        }
    };

    const handleBid = async (card: Card) => {
        if (!currentUser) return;
        
        if (!currentUser.whatsapp) {
             alert("Profile Incomplete: You must set a WhatsApp number in your Profile settings before bidding.");
             return;
        }

        try {
            await auctionService.placeBid(card, currentUser.id);
            setAuctions(prev => prev.map(a => {
                if (a.id === card.id) {
                    return { ...a, currentBid: (a.currentBid || 0) + 1, topBidderId: currentUser.id };
                }
                return a;
            }));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleBuyNow = async (card: Card) => {
        if (!currentUser) return;

        if (!currentUser.whatsapp) {
             alert("Profile Incomplete: You must set a WhatsApp number in your Profile settings before buying.");
             return;
        }

        try {
            await auctionService.directBuy(card, currentUser.id);
            alert("Congratulations! You bought the card.");
            setAuctions(prev => prev.filter(a => a.id !== card.id));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const filteredAuctions = auctions.filter(card => {
        const now = Date.now();
        if (card.auctionEndDate && card.auctionEndDate < now) return false;

        if (gameFilter) {
            const cardGame = card.game || GameType.MTG;
            if (cardGame !== gameFilter) return false;
        }

        if (searchText) {
            const lowerSearch = searchText.toLowerCase();
            const sellerName = userMap.get(card.userId) || '';
            const matchName = card.name.toLowerCase().includes(lowerSearch);
            const matchSeller = sellerName.toLowerCase().includes(lowerSearch);
            if (!matchName && !matchSeller) return false;
        }

        if (showMyBids && currentUser) {
            if (card.topBidderId !== currentUser.id) return false;
        }

        return true;
    });

    if (loading) {
        return <PremiumLoading text="Explorando subastas" subtext="Buscando las mejores pujas..." color="amber" />;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <Gavel size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Auction House</h1>
                </div>
                <p className="text-slate-400">Bid on exclusive cards or list your own to the highest bidder. All auctions end at 10:00 PM (GMT-05:00 Bogota, Lima, Quito). A last-minute bid triggers a 5-minute extension.</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search cards or sellers..." 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
                
                <div className="w-full md:w-48 relative">
                    <Filter className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <select 
                        value={gameFilter}
                        onChange={(e) => setGameFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                    >
                        <option value="">All Games</option>
                        {Object.values(GameType).map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-auto">
                    <button 
                        onClick={() => setShowMyBids(!showMyBids)}
                        className={`w-full md:w-auto px-4 py-2 rounded-lg flex items-center justify-center gap-2 border transition-all ${
                            showMyBids 
                            ? 'bg-amber-600 border-amber-500 text-white' 
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                        My Active Bids
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredAuctions.map(card => (
                    <AuctionCard 
                        key={card.id}
                        card={card}
                        sellerName={userMap.get(card.userId) || 'Unknown'}
                        onBid={handleBid}
                        onBuyNow={handleBuyNow}
                        onViewProfile={onViewProfile}
                    />
                ))}
                {filteredAuctions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <p>No active auctions found matching your criteria.</p>
                        {gameFilter && <p className="text-xs mt-1">Filtering by: {gameFilter}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auctions;

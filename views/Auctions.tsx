
import React, { useEffect, useState } from 'react';
import { auctionService, auth } from '../services/store';
import { Card, GameType } from '../types';
import AuctionCard from '../components/AuctionCard';
import PremiumLoading from '../components/PremiumLoading';
import { Gavel, Search, Filter } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface AuctionsProps {
    onViewProfile: (userId: string) => void;
}

const Auctions: React.FC<AuctionsProps> = ({ onViewProfile }) => {
    const { t } = useTranslation();
    const [auctions, setAuctions] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

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
             alert("Perfil incompleto: debes configurar tu WhatsApp antes de pujar.");
             return;
        }

        try {
            await auctionService.placeBid(card, currentUser.id);
            setAuctions(prev => prev.map(a => {
                if (a.id === card.id) {
                    return { ...a, currentBid: (a.currentBid || a.basePrice || 0) + 1, topBidderId: currentUser.id };
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
             alert("Perfil incompleto: debes configurar tu WhatsApp antes de comprar.");
             return;
        }

        try {
            await auctionService.directBuy(card, currentUser.id);
            alert("¡Felicitaciones! Compraste la carta.");
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
            const sellerName = card.sellerName || '';
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
                    <h1 className="text-2xl font-bold text-white">{t('auctions.title')}</h1>
                </div>
                <p className="text-slate-400">{t('auctions.subtitle')}</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder={t('auctions.searchPlaceholder')}
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
                        <option value="">{t('common.allGames')}</option>
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
                        {t('auctions.myActiveBids')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredAuctions.map(card => (
                    <AuctionCard
                        key={card.id}
                        card={card}
                        sellerName={card.sellerName || t('common.unknown')}
                        onBid={handleBid}
                        onBuyNow={handleBuyNow}
                        onViewProfile={onViewProfile}
                    />
                ))}
                {filteredAuctions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <p>{t('auctions.noAuctions')}</p>
                        {gameFilter && <p className="text-xs mt-1">Filtrando por: {gameFilter}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auctions;


import React, { useState, useEffect, useRef } from 'react';
import { Card, AuctionStatus } from '../types';
import { Gavel, Clock, ArrowUp, ShoppingCart, User, AlertTriangle, Zap } from 'lucide-react';
import { auth } from '../services/store';
import { useTranslation } from '../i18n/useTranslation';

interface AuctionCardProps {
    card: Card;
    sellerName: string;
    onBid: (card: Card) => void;
    onBuyNow: (card: Card) => void;
    onViewProfile: (userId: string) => void;
    onExpired?: (card: Card) => void;
}

const AuctionCard: React.FC<AuctionCardProps> = ({ card, sellerName, onBid, onBuyNow, onViewProfile, onExpired }) => {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);
    const [isExtended, setIsExtended] = useState(false);
    const expiredCallbackFired = useRef(false);

    const currentUser = auth.getCurrentUser();
    const isOwner = currentUser?.id === card.userId;
    const isWinning = currentUser?.id === card.topBidderId;

    useEffect(() => {
        const updateTimer = () => {
            if (!card.auctionEndDate) return;
            const now = Date.now();
            const diff = card.auctionEndDate - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft(t('auctions.auctionEnded'));
                if (!expiredCallbackFired.current && onExpired && card.auctionStatus === AuctionStatus.ACTIVE) {
                    expiredCallbackFired.current = true;
                    onExpired(card);
                }
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Check if extended (Arbitrary logic: if time is NOT ending at :00 minutes exactly, it might be extended, 
            // but safer to check if diff < 5 minutes and bidding is active)
            // Ideally we'd store an "originalEndDate" field, but for now we infer urgency.
            if (diff < 5 * 60 * 1000 && card.currentBid && card.currentBid > (card.basePrice || 0)) {
                setIsExtended(true);
            } else {
                setIsExtended(false);
            }
            
            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else {
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000); // Update every second for better precision in last minutes
        return () => clearInterval(interval);
    }, [card.auctionEndDate, card.currentBid, card.basePrice]);

    const handleBid = () => {
        if (isExpired) return;
        if (isOwner) return;
        onBid(card);
    }

    const handleBuyNow = () => {
        if (isExpired) return;
        if (isOwner) return;
        if (confirm(`Buy this card now for ${card.currency === 'PEN' ? 'S/' : '$'} ${card.buyItNowPrice}? This will end the auction immediately.`)) {
             onBuyNow(card);
        }
    }

    return (
        <div className={`bg-slate-900 border rounded-xl overflow-hidden flex flex-col shadow-lg transition-all hover:shadow-amber-900/20 relative ${isWinning ? 'border-green-500/50' : 'border-slate-800 hover:border-amber-500/50'}`}>
            
            {/* Extended Badge */}
            {isExtended && (
                <div className="absolute top-2 left-2 z-20 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 animate-pulse">
                    <Zap size={10} fill="currentColor" /> {t('auctions.overtime').toUpperCase()}
                </div>
            )}

            {/* Header / Image Area */}
            <div className="relative aspect-[2.5/3] overflow-hidden">
                <img 
                    src={card.imageUrl} 
                    alt={card.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                />
                
                {card.isFoil && (
                     <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-transparent bg-clip-text bg-rainbow border border-slate-700">
                         FOIL
                     </div>
                )}
                
                {/* Timer Badge */}
                <div className={`absolute bottom-2 left-2 backdrop-blur border text-xs font-mono py-1 px-2 rounded-lg flex items-center gap-1.5 shadow-lg ${isExtended ? 'bg-red-900/90 border-red-500 text-red-200' : 'bg-slate-950/90 border-slate-700 text-white'}`}>
                    <Clock size={12} className={isExpired ? 'text-red-500' : (isExtended ? 'text-white' : 'text-amber-500')} />
                    <span>{timeLeft}</span>
                </div>
            </div>

            {/* Info Body */}
            <div className="p-3 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-lg leading-tight truncate w-full">{card.name}</h3>
                </div>
                <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                     <span>{card.setName}</span>
                     <span className="uppercase bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{card.condition}</span>
                </div>

                {/* Seller */}
                <button 
                    onClick={() => onViewProfile(card.userId)}
                    className="flex items-center gap-2 text-xs text-slate-500 mb-3 hover:text-amber-400 transition-colors w-fit"
                >
                    <User size={12} /> {sellerName}
                </button>

                {/* Bid Info */}
                <div className="mt-auto bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                     <div className="flex justify-between items-end mb-1">
                         <span className="text-[10px] uppercase font-bold text-slate-500">{card.topBidderId ? t('auctions.currentBid') : t('auctions.startingPrice')}</span>
                         <div className="text-xl font-bold text-white">
                             {card.currency === 'PEN' ? 'S/' : '$'} {card.currentBid?.toFixed(2)}
                         </div>
                     </div>
                     
                     {isWinning && (
                         <div className="text-[10px] text-green-400 font-bold mb-2 flex items-center gap-1">
                             <ArrowUp size={10} /> {t('auctions.youAreWinning')}
                         </div>
                     )}

                     {!isWinning && card.topBidderId && (
                         <div className="text-[10px] text-amber-500/80 font-medium mb-2">
                             {card.currentBid === card.basePrice ? t('auctions.startingBid') : t('auctions.oneBidder')}
                         </div>
                     )}

                     {!card.topBidderId && (
                         <div className="text-[10px] text-slate-500 mb-2">{t('auctions.noBidsYet')}</div>
                     )}

                     <div className="flex gap-2">
                         <button 
                             onClick={handleBid}
                             disabled={isExpired || isOwner}
                             className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                 isOwner 
                                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                 : 'bg-amber-600 hover:bg-amber-700 text-white'
                             }`}
                         >
                             <Gavel size={14} /> {t('auctions.bidButton')}
                         </button>
                         {card.buyItNowPrice && (
                             <button 
                                 onClick={handleBuyNow}
                                 disabled={isExpired || isOwner}
                                 title={`Buy Now for ${card.buyItNowPrice}`}
                                 className={`px-3 rounded border font-bold text-xs flex items-center justify-center transition-all ${
                                     isOwner
                                     ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                     : 'border-slate-600 text-slate-400 hover:text-green-400 hover:border-green-500'
                                 }`}
                             >
                                 <ShoppingCart size={14} />
                             </button>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AuctionCard;

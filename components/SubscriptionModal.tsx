
import React from 'react';
import { Check, X, Crown, Shield, Star, Gavel } from 'lucide-react';
import { SubscriptionTier, GlobalConfig } from '../types';
import { configService, subscriptionService } from '../services/store';

interface SubscriptionModalProps {
    onClose: () => void;
    currentTier: SubscriptionTier;
    onUpgrade: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, currentTier, onUpgrade }) => {
    const config: GlobalConfig = configService.getConfig();

    const handleSelect = async (tier: SubscriptionTier) => {
        if (tier === currentTier) return;
        
        // In a real app, integrate Stripe here.
        const confirmed = window.confirm(`Confirm upgrade to ${tier}? In this demo, payment is simulated.`);
        if (confirmed) {
            await subscriptionService.upgradeUser(tier);
            onUpgrade();
            onClose();
        }
    };

    const TierCard = ({ tier, icon: Icon, color }: { tier: SubscriptionTier, icon: any, color: string }) => {
        const details = config[tier];
        const isCurrent = currentTier === tier;

        return (
            <div className={`relative bg-slate-900 border ${isCurrent ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-700 hover:border-violet-500'} rounded-xl p-6 flex flex-col transition-all duration-300`}>
                {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        CURRENT PLAN
                    </div>
                )}
                
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4 text-white`}>
                    <Icon size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">{tier}</h3>
                <div className="text-2xl font-bold text-white mb-4">
                    {details.currency === 'PEN' ? 'S/' : '$'} {details.pricePerMonth} <span className="text-sm font-normal text-slate-400">/mo</span>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={16} className="text-green-500" />
                        <span>Max <b>{details.maxTradeBinders}</b> Trade Binders</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={16} className="text-green-500" />
                        <span>Max <b>{details.maxShowcaseItems}</b> Showcase Items</span>
                    </div>
                    
                    {/* Auction Limits */}
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Gavel size={16} className="text-amber-500" />
                        <span>Max <b>{details.maxAuctionBinders}</b> Auction Binders</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Gavel size={16} className="text-amber-500" />
                        <span>Max <b>{details.maxAuctionCardsPerBinder}</b> Cards per Auction</span>
                    </div>
                    
                    {/* Alert Limits */}
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={16} className="text-green-500" />
                        <span>Max <b>{details.maxCardAlerts}</b> Card Alerts</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={16} className="text-green-500" />
                        <span>Unlimited Wishlists</span>
                    </div>
                </div>

                <button 
                    onClick={() => handleSelect(tier)}
                    disabled={isCurrent}
                    className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${
                        isCurrent 
                        ? 'bg-slate-800 text-slate-500 cursor-default' 
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                >
                    {isCurrent ? 'Active' : `Choose ${tier}`}
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] md:h-auto overflow-y-auto shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
                    <h2 className="text-2xl font-bold text-white">Upgrade Your Experience</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TierCard 
                        tier={SubscriptionTier.COMMON} 
                        icon={Shield} 
                        color="bg-slate-700"
                    />
                    <TierCard 
                        tier={SubscriptionTier.UNCOMMON} 
                        icon={Star} 
                        color="bg-gradient-to-br from-slate-400 to-slate-600 shadow-lg shadow-slate-500/20"
                    />
                    <TierCard 
                        tier={SubscriptionTier.RARE} 
                        icon={Crown} 
                        color="bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20"
                    />
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;


import React from 'react';
import { X, Crown, Shield, Star, Bell, Check, ExternalLink } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { SubscriptionTier, GlobalConfig } from '../types';
import { configService, subscriptionService } from '../services/store';

interface SubscriptionModalProps {
    onClose: () => void;
    currentTier: SubscriptionTier;
    onUpgrade: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, currentTier, onUpgrade }) => {
    const { t } = useTranslation();
    const config: GlobalConfig = configService.getConfig();

    const handleSelect = async (tier: SubscriptionTier) => {
        if (tier === currentTier) return;
        
        const details = config[tier];
        const paymentLink = details.paymentLink;

        if (paymentLink && paymentLink.startsWith('http')) {
            if (confirm(t('pricing.confirmUpgrade', { tier }))) {
                window.open(paymentLink, '_blank');
                // We keep the modal open or close it, user waits for backend to process webhook
                onClose();
            }
        } else {
             // Fallback for Admin testing or if no link configured
            const confirmed = window.confirm(`[TEST MODE] Confirm upgrade to ${tier}? (No payment link configured)`);
            if (confirmed) {
                await subscriptionService.upgradeUser(tier);
                onUpgrade();
                onClose();
            }
        }
    };

    const TierCard = ({ tier, icon: Icon, color }: { tier: SubscriptionTier, icon: any, color: string }) => {
        const details = config[tier];
        const isCurrent = currentTier === tier;

        return (
            <div className={`relative bg-slate-900 border ${isCurrent ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-700 hover:border-violet-500'} rounded-xl p-6 flex flex-col transition-all duration-300`}>
                {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                        {t('pricing.currentPlan').toUpperCase()}
                    </div>
                )}
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white capitalize">{tier.toLowerCase()}</h3>
                        <div className="text-2xl font-bold text-white mt-1">
                            {details.currency === 'PEN' ? 'S/' : '$'} {details.pricePerMonth} <span className="text-sm font-normal text-slate-400">/mo</span>
                        </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                        <Icon size={24} />
                    </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                    {/* Binders */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-400">{t('pricing.tradeSellBinders')}</span>
                            <div className="text-right">
                                <span className="text-white font-bold">{details.maxTradeBinders}</span>
                                <span className="text-slate-500 text-xs ml-1">({details.maxCardsPerTradeBinder} cards max)</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-400">{t('pricing.wishlistBinders')}</span>
                            <div className="text-right">
                                <span className="text-white font-bold">{details.maxWishlistBinders}</span>
                                <span className="text-slate-500 text-xs ml-1">({details.maxCardsPerWishlistBinder} cards max)</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-400">{t('pricing.auctionBinders')}</span>
                            <div className="text-right">
                                <span className="text-white font-bold">{details.maxAuctionBinders}</span>
                                <span className="text-slate-500 text-xs ml-1">({details.maxAuctionCardsPerBinder} cards max)</span>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Bell size={14} className="text-violet-400" />
                                <span>{t('pricing.cardAlerts')}</span>
                            </div>
                            <span className="text-white font-bold">{details.maxCardAlerts}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Star size={14} className="text-yellow-400" />
                                <span>{t('pricing.showcaseCards')}</span>
                            </div>
                            <span className="text-white font-bold">{details.maxShowcaseItems}</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => handleSelect(tier)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
                        isCurrent 
                        ? 'bg-slate-800 text-slate-500 cursor-default shadow-none border border-slate-700' 
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20 hover:scale-[1.02]'
                    }`}
                >
                    {isCurrent ? (
                        <span className="flex items-center justify-center gap-2"><Check size={16}/> {t('pricing.activePlan')}</span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                             {t('pricing.upgradeTo', { tier })} {config[tier].paymentLink ? <ExternalLink size={14}/> : ''}
                        </span>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] md:h-auto overflow-y-auto shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{t('pricing.title')}</h2>
                        <p className="text-slate-400 text-sm">{t('pricing.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-900 p-2 rounded-full hover:bg-slate-800 transition-colors">
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
                
                {/* Mythic Note */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 text-center">
                    <p className="text-slate-500 text-sm">
                        {t('pricing.mythicFooter')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;

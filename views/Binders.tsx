
import React, { useEffect, useState } from 'react';
import { binderService, auth, subscriptionService, configService } from '../services/store';
import { Binder, BinderType, GameType, SubscriptionTier } from '../types';
import BinderCard from '../components/BinderCard';
import { Plus, X, Lock, Gavel, Loader2, Sparkles } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';
import { motion, AnimatePresence } from 'framer-motion';

interface BindersProps {
  onSelectBinder: (binderId: string) => void;
}

const Binders: React.FC<BindersProps> = ({ onSelectBinder }) => {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [lockedStatus, setLockedStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newBinderName, setNewBinderName] = useState('');
  const [newBinderType, setNewBinderType] = useState<BinderType>(BinderType.FOR_TRADE);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentUser = auth.getCurrentUser();
  const isMythic = currentUser?.subscriptionTier === SubscriptionTier.MYTHIC;

  useEffect(() => {
    loadBinders();
  }, []);

  const loadBinders = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
        // 1. Single Fetch: Get all binders at once
        const data = await binderService.getUserBinders(currentUser.id);
        
        // 2. Optimization: Calculate lock status locally (Alternative 1)
        // This avoids calling Firebase for every single binder
        const config = configService.getConfig()[currentUser.subscriptionTier];
        const status: Record<string, boolean> = {};
        
        // Group by category to check limits correctly
        const auctions = data.filter(b => b.type === BinderType.AUCTION).sort((a, b) => a.createdAt - b.createdAt);
        const wishlists = data.filter(b => b.type === BinderType.WISHLIST).sort((a, b) => a.createdAt - b.createdAt);
        const trades = data.filter(b => b.type === BinderType.FOR_TRADE || b.type === BinderType.COLLECTION).sort((a, b) => a.createdAt - b.createdAt);

        auctions.forEach((b, idx) => status[b.id] = idx >= config.maxAuctionBinders);
        wishlists.forEach((b, idx) => status[b.id] = idx >= config.maxWishlistBinders);
        trades.forEach((b, idx) => status[b.id] = idx >= config.maxTradeBinders);

        setLockedStatus(status);
        setBinders(data);
    } catch (e) {
        console.error("Failed to load binders", e);
    } finally {
        // Small delay to ensure the animation looks intentional
        setTimeout(() => setLoading(false), 800);
    }
  };

  const handleBinderClick = (binder: Binder) => {
      if (lockedStatus[binder.id]) {
          setShowUpgradeModal(true);
      } else {
          onSelectBinder(binder.id);
      }
  }

  const handleShareBinder = (binder: Binder) => {
      if (!currentUser) return;
      const url = `${window.location.origin}/?binder=${binder.id}`;
      const profileHeader = `Display Name: *${currentUser.displayName}*\nPrefered Game: ${currentUser.preferredGame || 'Any'}\nPrefered Store: ${currentUser.preferredStore || 'No Preference'}\nTrader Count: ${currentUser.successfulTrades || 0}`;
      
      let specificPhrase = binder.type === BinderType.WISHLIST 
        ? "Estoy buscando estas cartas, en estas ediciones:" 
        : "Tengo este binder que puede interesar:";

      const fullMessage = `${profileHeader}\n\n${specificPhrase}\n${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newBinderName.trim()) return;

    try {
        if (isMythic && newBinderType === BinderType.WISHLIST) {
            alert("Stores (Mythic Tier) cannot create Wishlists.");
            return;
        }

        if (newBinderType === BinderType.AUCTION && !currentUser.whatsapp) {
            alert("Profile Incomplete: You must set a WhatsApp number in your Profile settings before creating an Auction Binder.");
            return;
        }

        let checkType: 'TRADE_BINDER' | 'AUCTION_BINDER' | 'WISHLIST_BINDER' = 'TRADE_BINDER';
        if (newBinderType === BinderType.AUCTION) checkType = 'AUCTION_BINDER';
        else if (newBinderType === BinderType.WISHLIST) checkType = 'WISHLIST_BINDER';

        const check = await subscriptionService.checkLimit(checkType);
        if (!check.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        await binderService.createBinder({
            userId: currentUser.id,
            game: GameType.MTG,
            type: newBinderType,
            name: newBinderName
        });
        
        setNewBinderName('');
        setIsCreating(false);
        loadBinders();
    } catch (error: any) {
        alert("Failed to create binder. " + (error.message || ""));
    }
  };

  if (loading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative mb-8"
            >
                <div className="absolute inset-0 bg-violet-600/30 blur-3xl rounded-full animate-pulse" />
                <Loader2 size={48} className="text-violet-500 animate-spin relative z-10" />
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
            >
                <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-indigo-400 animate-gradient-x">
                    Cargando tus Binders
                </h2>
                <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Preparando tu colección...
                </p>
            </motion.div>
        </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 md:p-8 space-y-6 pb-24"
    >
      {/* Upgrade Modal */}
      {showUpgradeModal && currentUser && (
          <SubscriptionModal 
            onClose={() => setShowUpgradeModal(false)}
            currentTier={currentUser.subscriptionTier}
            onUpgrade={() => loadBinders()}
          />
      )}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Binders</h1>
          <p className="text-slate-400">Manage your collection, trade lists, and auctions</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-violet-900/20"
        >
          <Plus size={18} /> New Binder
        </button>
      </header>
      
      {/* Alert for locked binders */}
      <AnimatePresence>
        {Object.values(lockedStatus).some(isLocked => isLocked) && (
            <motion.div 
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="bg-amber-900/20 border border-amber-500/50 p-4 rounded-xl flex items-center gap-3"
            >
                <div className="bg-amber-500/20 p-2 rounded-full text-amber-500">
                    <Lock size={20} />
                </div>
                <div className="flex-1">
                    <h3 className="text-amber-400 font-bold">Subscription Limit Exceeded</h3>
                    <p className="text-sm text-slate-300">Some binders are locked because they exceed your current plan limits. Upgrade to unlock them.</p>
                </div>
                <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                >
                    Upgrade
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Create New Binder</h2>
                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Binder Name</label>
                    <input 
                    autoFocus
                    type="text" 
                    value={newBinderName}
                    onChange={(e) => setNewBinderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="e.g. Rare Trades or Auction House 1"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Purpose</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setNewBinderType(BinderType.FOR_TRADE)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        newBinderType === BinderType.FOR_TRADE 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        For Trade / Sell
                    </button>
                    
                    {isMythic ? (
                        <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-600 text-sm font-medium flex flex-col items-center justify-center opacity-50 cursor-not-allowed text-center">
                            <Lock size={16} className="mb-1" />
                            <span>Wishlist</span>
                            <span className="text-[9px] uppercase">N/A for Store</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setNewBinderType(BinderType.WISHLIST)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            newBinderType === BinderType.WISHLIST 
                            ? 'bg-pink-600/20 border-pink-500 text-pink-300' 
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            Wishlist
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setNewBinderType(BinderType.AUCTION)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                        newBinderType === BinderType.AUCTION 
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300' 
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        <Gavel size={16} /> Auction
                    </button>
                    </div>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                    Create Binder
                </button>
                </form>
            </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Binder Grid with Staggered Animation */}
      <motion.div 
        variants={{
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1
                }
            }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {binders.map(binder => {
            const isLocked = lockedStatus[binder.id];
            return (
                <motion.div 
                    key={binder.id} 
                    variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.95 },
                        show: { opacity: 1, y: 0, scale: 1 }
                    }}
                    className="relative group"
                >
                    <BinderCard 
                        binder={binder} 
                        onClick={() => handleBinderClick(binder)} 
                        onShare={() => handleShareBinder(binder)}
                    />
                    
                    {isLocked && (
                        <div 
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10 cursor-not-allowed border border-slate-700"
                            onClick={() => setShowUpgradeModal(true)}
                        >
                            <div className="flex flex-col items-center text-slate-400">
                                <div className="bg-slate-800 p-3 rounded-full mb-2">
                                    <Lock size={24} />
                                </div>
                                <span className="font-bold text-sm">Vaulted</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            );
        })}
        
        {binders.length === 0 && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl"
            >
                <p>No binders found. Create one to get started!</p>
            </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Binders;

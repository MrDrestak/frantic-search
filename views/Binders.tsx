
import React, { useEffect, useState } from 'react';
import { binderService, auth, subscriptionService } from '../services/store';
import { Binder, BinderType, GameType, SubscriptionTier } from '../types';
import BinderCard from '../components/BinderCard';
import { Plus, X, Lock, Gavel } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';

interface BindersProps {
  onSelectBinder: (binderId: string) => void;
}

const Binders: React.FC<BindersProps> = ({ onSelectBinder }) => {
  const [binders, setBinders] = useState<Binder[]>([]);
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
    const data = await binderService.getUserBinders(currentUser.id);
    setBinders(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newBinderName.trim()) return;

    try {
        // Prevent Wishlist for Mythic via logic (double check)
        if (isMythic && newBinderType === BinderType.WISHLIST) {
            alert("Stores (Mythic Tier) cannot create Wishlists.");
            return;
        }

        // WhatsApp Validation for Auctions
        if (newBinderType === BinderType.AUCTION) {
            if (!currentUser.whatsapp) {
                alert("Profile Incomplete: You must set a WhatsApp number in your Profile settings before creating an Auction Binder.");
                return;
            }
        }

        // Limit Check based on Type
        let checkType: 'TRADE_BINDER' | 'AUCTION_BINDER' | 'WISHLIST_BINDER' = 'TRADE_BINDER';
        if (newBinderType === BinderType.AUCTION) {
            checkType = 'AUCTION_BINDER';
        } else if (newBinderType === BinderType.WISHLIST) {
            checkType = 'WISHLIST_BINDER';
        }

        const check = await subscriptionService.checkLimit(checkType);
        if (!check.allowed) {
            if (newBinderType === BinderType.AUCTION) {
                  alert(`You have reached the Auction Binder limit (${check.limit}) for your tier.`);
            } else if (newBinderType === BinderType.WISHLIST) {
                  alert(`You have reached the Wishlist Binder limit (${check.limit}) for your tier.`);
            } else {
                  alert(`You have reached the Trade Binder limit (${check.limit}) for your tier.`);
            }
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
        console.error("Failed to create binder", error);
        alert("Failed to create binder. " + (error.message || ""));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
      {/* Upgrade Modal */}
      {showUpgradeModal && currentUser && (
          <SubscriptionModal 
            onClose={() => setShowUpgradeModal(false)}
            currentTier={currentUser.subscriptionTier}
            onUpgrade={() => {
                // User upgraded. They can now click "Create" again to proceed.
            }}
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

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
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
                  
                  {/* Wishlist Button - Disabled/Hidden for Mythic */}
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
          </div>
        </div>
      )}

      {/* Binder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {binders.map(binder => (
          <BinderCard 
            key={binder.id} 
            binder={binder} 
            onClick={() => onSelectBinder(binder.id)} 
          />
        ))}
        
        {binders.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <p>No binders found. Create one to get started!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Binders;


import React, { useState, useEffect } from 'react';
import { auth } from '../services/store';
import { UserProfile, SubscriptionTier, Card, BinderType, AuctionStatus } from '../types';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Loader2, ArrowLeft, Crown, Shield, Star, Gavel } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';
import { db } from '../services/firebase';

interface ProfileProps {
    viewingUserId?: string | null;
    onBack?: () => void;
    onViewProfile?: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ viewingUserId, onBack, onViewProfile }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Auction History State
  const [myAuctions, setMyAuctions] = useState<Card[]>([]);
  const [bidderNames, setBidderNames] = useState<Record<string, string>>({});
  const [showAuctions, setShowAuctions] = useState(false);

  // Form State
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [store, setStore] = useState('');

  const isOwnProfile = !viewingUserId || viewingUserId === auth.getCurrentUser()?.id;

  useEffect(() => {
    loadProfile();
  }, [viewingUserId]);

  const loadProfile = async () => {
    setIsLoading(true);
    if (isOwnProfile) {
        // Load MY profile
        const currentUser = auth.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            setNickname(currentUser.displayName || '');
            setWhatsapp(currentUser.whatsapp || '');
            setStore(currentUser.preferredStore || '');
            loadMyAuctions(currentUser.id);
        }
    } else if (viewingUserId) {
        // Load OTHER profile
        const publicProfile = await auth.getUserPublicProfile(viewingUserId);
        setUser(publicProfile);
        // Do not load auctions for other users
    }
    setIsLoading(false);
  };

  const loadMyAuctions = async (uid: string) => {
      try {
          // In a real app we'd index this. Here we query all cards for the user and filter.
          const snap = await db.collection("cards")
            .where("userId", "==", uid)
            .where("binderType", "==", BinderType.AUCTION)
            .get();
          
          const auctionCards = snap.docs.map(d => ({ id: d.id, ...d.data() } as Card));
          
          // Fetch bidder/winner names
          const idsToFetch = new Set<string>();
          auctionCards.forEach(c => {
              if (c.topBidderId) idsToFetch.add(c.topBidderId);
              if (c.winnerId) idsToFetch.add(c.winnerId);
          });

          if (idsToFetch.size > 0) {
              const names: Record<string, string> = {};
              await Promise.all(Array.from(idsToFetch).map(async (id) => {
                  try {
                      // Small optimization: check if the bidder is the profile user itself (unlikely for bidder, but possible for winner logic if self-win was allowed? No self-bid allowed though)
                      const doc = await db.collection("users").doc(id).get();
                      if (doc.exists) {
                          names[id] = (doc.data() as any)?.displayName || 'Unknown';
                      }
                  } catch (e) { console.warn("Failed to fetch bidder name", e); }
              }));
              setBidderNames(names);
          }
          
          setMyAuctions(auctionCards);
      } catch (e) { console.error("Failed to load auctions", e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (whatsapp) {
        const isValidFormat = /^\d{9}$/.test(whatsapp);
        if (!isValidFormat) {
            alert("WhatsApp number must be exactly 9 digits.");
            return;
        }
    }
    
    setIsSaving(true);
    try {
        await auth.updateProfile({
            displayName: nickname,
            whatsapp: whatsapp,
            preferredStore: store
        });
        setIsEditing(false);
        loadProfile(); // Refresh
    } catch (error) {
        console.error("Failed to update profile", error);
        alert("Failed to update profile.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
        setNickname(user.displayName);
        setWhatsapp(user.whatsapp || '');
        setStore(user.preferredStore || '');
    }
  };

  const renderTierBadge = (tier: SubscriptionTier) => {
      let color = 'bg-slate-700 text-slate-300';
      let Icon = Shield;
      
      if (tier === SubscriptionTier.UNCOMMON) {
          color = 'bg-slate-500 text-white ring-1 ring-slate-400';
          Icon = Star;
      } else if (tier === SubscriptionTier.RARE) {
          color = 'bg-amber-600 text-white ring-1 ring-amber-400 shadow-lg shadow-amber-900/20';
          Icon = Crown;
      }

      return (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${color}`}>
              <Icon size={12} fill="currentColor" />
              {tier}
          </div>
      );
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Loading Profile...</div>;
  
  if (!user) return <div className="p-8 text-center text-slate-500">User not found.</div>;

  return (
    <div className="p-4 md:p-8 pb-24">
      {showSubscriptionModal && user && (
          <SubscriptionModal 
            onClose={() => setShowSubscriptionModal(false)}
            currentTier={user.subscriptionTier}
            onUpgrade={() => {
                loadProfile(); // Refresh to show new tier
            }}
          />
      )}

      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
            {!isOwnProfile && onBack && (
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">{isOwnProfile ? 'My Profile' : 'Trader Profile'}</h1>
                <p className="text-slate-400">{isOwnProfile ? 'Manage your trader identity.' : 'View trader details and reputation.'}</p>
            </div>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-6">
            {/* Banner / Header */}
            <div className={`h-32 relative ${user.subscriptionTier === SubscriptionTier.RARE ? 'bg-gradient-to-r from-amber-700/50 to-orange-900/50' : 'bg-gradient-to-r from-violet-900/50 to-indigo-900/50'}`}>
                <div className="absolute -bottom-10 left-6">
                    <div className={`w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg ${user.subscriptionTier === SubscriptionTier.RARE ? 'ring-2 ring-amber-500' : ''}`}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-slate-500" />
                        )}
                    </div>
                </div>
                {/* Subscription Badge Positioned Top Right */}
                <div className="absolute top-4 right-4">
                    {renderTierBadge(user.subscriptionTier)}
                </div>
            </div>

            <div className="pt-12 px-6 pb-6">
                {!isEditing ? (
                    // VIEW MODE
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
                                {isOwnProfile && (
                                    <p className="text-slate-400 flex items-center gap-2 text-sm mt-1">
                                        <Mail size={14} /> {user.email}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {isOwnProfile && (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-slate-700 justify-center"
                                        >
                                            <Edit2 size={16} /> Edit Profile
                                        </button>
                                        <button 
                                            onClick={() => setShowSubscriptionModal(true)}
                                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-violet-900/20 justify-center"
                                        >
                                            <Crown size={16} /> Upgrade Plan
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                 <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">WhatsApp</label>
                                 <div className="flex items-center gap-3 text-slate-200">
                                     <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                         <Phone size={16} />
                                     </div>
                                     <span className="font-mono text-lg">
                                        {user.whatsapp ? (
                                            isOwnProfile ? user.whatsapp : (
                                                <a href={`https://wa.me/${user.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-green-400">
                                                    {user.whatsapp}
                                                </a>
                                            )
                                        ) : "Not set"}
                                     </span>
                                 </div>
                             </div>

                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                 <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Preferred Store</label>
                                 <div className="flex items-center gap-3 text-slate-200">
                                     <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                         <MapPin size={16} />
                                     </div>
                                     <span className="font-medium text-lg">{user.preferredStore || "None selected"}</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                ) : (
                    // EDIT MODE
                    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Nickname */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nickname (Display Name)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input 
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                        placeholder="e.g. Jace Beleren"
                                        required
                                    />
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input 
                                        type="number"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                        placeholder="e.g. 999888777 (9 digits)"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Numbers only. Must be exactly 9 digits.</p>
                            </div>

                            {/* Preferred Store */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tienda Preferida</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <select 
                                        value={store}
                                        onChange={(e) => setStore(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">-- Select a Store --</option>
                                        <option value="La Mazmorra">La Mazmorra</option>
                                        <option value="Reinos Lejanos">Reinos Lejanos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-800">
                            <button 
                                type="button" 
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={18} /> Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-bold transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
        
        {/* Auctions History Section - ONLY VISIBLE ON OWN PROFILE */}
        {isOwnProfile && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Gavel size={20} className="text-amber-500" /> 
                        My Created Auctions
                    </h3>
                    <button 
                        onClick={() => setShowAuctions(!showAuctions)}
                        className="text-sm text-violet-400 hover:text-white underline"
                    >
                        {showAuctions ? 'Hide' : 'Show All'}
                    </button>
                </div>
                
                {showAuctions && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {myAuctions.length === 0 ? (
                            <p className="text-slate-500 italic">No auctions created yet.</p>
                        ) : (
                            myAuctions.map(card => {
                                const now = Date.now();
                                const isExpired = card.auctionEndDate && card.auctionEndDate < now;
                                const isSold = card.auctionStatus === 'SOLD';
                                const finalPrice = isSold ? card.buyItNowPrice : card.currentBid;
                                
                                // Determine "Winner" or "Top Bidder"
                                // If sold, winnerId is direct buyer.
                                // If expired, topBidderId is the de-facto winner (if any).
                                // If active, topBidderId is leading.
                                const effectiveWinnerId = card.winnerId || (isExpired && card.topBidderId ? card.topBidderId : card.topBidderId);
                                const isFinished = isSold || isExpired;

                                return (
                                    <div key={card.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <img src={card.imageUrl} alt={card.name} className="w-10 h-14 object-cover rounded bg-black" />
                                            <div>
                                                <div className="font-bold text-white">{card.name}</div>
                                                <div className="text-xs text-slate-400">
                                                    {isSold ? 'Sold (Direct Buy)' : isExpired ? 'Ended' : 'Active'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-white">
                                                {card.currency === 'PEN' ? 'S/' : '$'} {finalPrice?.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {effectiveWinnerId ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-600 uppercase font-bold">
                                                            {isFinished ? 'Winner' : 'Top Bidder'}
                                                        </span>
                                                        <button 
                                                            onClick={() => onViewProfile && onViewProfile(effectiveWinnerId)}
                                                            className="text-violet-400 hover:text-white underline font-medium truncate max-w-[120px]"
                                                        >
                                                            {bidderNames[effectiveWinnerId] || 'User'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span>{isFinished ? 'Unsold' : 'No Bids'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default Profile;

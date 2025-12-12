
import React, { useState, useEffect } from 'react';
import { auth, cardService, tradeService } from '../services/store';
import { UserProfile, SubscriptionTier, Card, BinderType, AuctionStatus, GameType, TradeInteraction } from '../types';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Loader2, ArrowLeft, Crown, Shield, Star, Gavel, ExternalLink, CheckCircle, AlertCircle, Send, Zap, ShieldAlert, ChevronRight, Navigation, Share2, Layers, Search, Filter, ChevronLeft, Eye, MessageCircle, ThumbsUp, Gamepad2, Megaphone } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';
import { db } from '../services/firebase';
import MTGCard from '../components/MTGCard';

interface ProfileProps {
    viewingUserId?: string | null;
    onBack?: () => void;
    onViewProfile?: (userId: string) => void;
    onAdminClick?: () => void;
}

const COUNTRY_CODES = [
    { code: '51', label: 'Peru (+51)', flag: '🇵🇪' },
    { code: '1', label: 'USA (+1)', flag: '🇺🇸' },
    { code: '52', label: 'Mexico (+52)', flag: '🇲🇽' },
    { code: '56', label: 'Chile (+56)', flag: '🇨🇱' },
    { code: '57', label: 'Colombia (+57)', flag: '🇨🇴' },
    { code: '54', label: 'Argentina (+54)', flag: '🇦🇷' },
    { code: '34', label: 'Spain (+34)', flag: '🇪🇸' },
    { code: '55', label: 'Brazil (+55)', flag: '🇧🇷' },
];

interface StoreData {
    name: string;
    location: string;
    mapUrl: string;
}

const STORES: StoreData[] = [
    { 
        name: 'La Mazmorra', 
        location: 'Santiago de Surco, Lima', 
        mapUrl: 'https://maps.app.goo.gl/YNTq2rYXo7ce8sSH7' 
    },
    { 
        name: 'Reinos Olvidados', 
        location: 'San Borja, Lima', 
        mapUrl: 'https://maps.app.goo.gl/FjGCR5FshDcbaRXNA' 
    },
    {
        name: 'TCG House | C.C. Arenales',
        location: 'Lince, Lima',
        mapUrl: 'https://maps.app.goo.gl/LkoGT51aMEmEs7mp9'
    }
];

const ITEMS_PER_PAGE = 9;

const Profile: React.FC<ProfileProps> = ({ viewingUserId, onBack, onViewProfile, onAdminClick }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Auction History State
  const [myAuctions, setMyAuctions] = useState<Card[]>([]);
  const [bidderNames, setBidderNames] = useState<Record<string, string>>({});
  const [showAuctions, setShowAuctions] = useState(false);

  // Storefront State
  const [storefrontCards, setStorefrontCards] = useState<Card[]>([]);
  const [storefrontSearch, setStorefrontSearch] = useState('');
  const [gameFilter, setGameFilter] = useState<string>(''); // Empty = All
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingStorefront, setIsLoadingStorefront] = useState(false);
  
  // Interaction State
  const [showContact, setShowContact] = useState(false);
  const [pendingFeedbacks, setPendingFeedbacks] = useState<TradeInteraction[]>([]);

  // Form State
  const [nickname, setNickname] = useState('');
  const [storeName, setStoreName] = useState('');
  const [preferredGame, setPreferredGame] = useState(''); 
  const [storeAnnouncement, setStoreAnnouncement] = useState('');

  // WhatsApp Logic
  const [countryCode, setCountryCode] = useState('51');
  const [localPhone, setLocalPhone] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'IDLE' | 'SENT' | 'VERIFIED'>('IDLE');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  const isOwnProfile = !viewingUserId || viewingUserId === auth.getCurrentUser()?.id;

  useEffect(() => {
    loadProfile();
  }, [viewingUserId]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [storefrontSearch, gameFilter]);

  const loadProfile = async () => {
    setIsLoading(true);
    let targetId = viewingUserId;

    if (isOwnProfile) {
        // Load MY profile
        const currentUser = auth.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            targetId = currentUser.id;
            setNickname(currentUser.displayName || '');
            setStoreName(currentUser.preferredStore || '');
            setPreferredGame(currentUser.preferredGame || '');
            setStoreAnnouncement(currentUser.storeAnnouncement || '');
            
            // Parse existing WhatsApp
            const storedWhatsapp = currentUser.whatsapp || '';
            if (storedWhatsapp) {
                // Try to match known codes, longest first to avoid partial matches
                const sortedCodes = [...COUNTRY_CODES].sort((a,b) => b.code.length - a.code.length);
                const match = sortedCodes.find(c => storedWhatsapp.startsWith(c.code));
                
                if (match) {
                    setCountryCode(match.code);
                    setLocalPhone(storedWhatsapp.slice(match.code.length));
                } else {
                    if (storedWhatsapp.length === 9) {
                        setCountryCode('51');
                        setLocalPhone(storedWhatsapp);
                    } else {
                        setLocalPhone(storedWhatsapp);
                    }
                }
                setVerificationStatus('VERIFIED');
            } else {
                setVerificationStatus('IDLE');
                setLocalPhone('');
                setCountryCode('51');
            }

            loadMyAuctions(currentUser.id);
            loadPendingFeedback();
        }
    } else if (viewingUserId) {
        // Load OTHER profile
        const publicProfile = await auth.getUserPublicProfile(viewingUserId);
        setUser(publicProfile);
    }
    
    // Load Storefront Inventory for ANY profile
    if (targetId) {
        setIsLoadingStorefront(true);
        const inventory = await cardService.getTraderInventory(targetId);
        setStorefrontCards(inventory);
        setIsLoadingStorefront(false);
    }

    setIsLoading(false);
  };

  const loadPendingFeedback = async () => {
      const pending = await tradeService.getPendingFeedback();
      setPendingFeedbacks(pending);
  }

  const loadMyAuctions = async (uid: string) => {
      try {
          const snap = await db.collection("cards")
            .where("userId", "==", uid)
            .where("binderType", "==", BinderType.AUCTION)
            .get();
          
          const auctionCards = snap.docs.map(d => ({ id: d.id, ...d.data() } as Card));
          
          const idsToFetch = new Set<string>();
          auctionCards.forEach(c => {
              if (c.topBidderId) idsToFetch.add(c.topBidderId);
              if (c.winnerId) idsToFetch.add(c.winnerId);
          });

          if (idsToFetch.size > 0) {
              const names: Record<string, string> = {};
              await Promise.all(Array.from(idsToFetch).map(async (id) => {
                  try {
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

  const handleStartVerification = () => {
      if (!localPhone || localPhone.length < 5) {
          alert("Please enter a valid phone number first.");
          return;
      }
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setVerificationStatus('SENT');
      setInputCode('');
      
      const fullNumber = `${countryCode}${localPhone}`;
      const text = `Verification Code: ${code}`;
      window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleVerifyCode = () => {
      if (inputCode.trim() === generatedCode) {
          setVerificationStatus('VERIFIED');
      } else {
          alert("Incorrect code. Please check the message you sent/received on WhatsApp and try again.");
      }
  };

  const handlePhoneChange = (val: string) => {
      setLocalPhone(val);
      if (verificationStatus === 'VERIFIED') {
          setVerificationStatus('IDLE');
      }
  };

  const handleCountryChange = (val: string) => {
      setCountryCode(val);
      if (verificationStatus === 'VERIFIED') {
          setVerificationStatus('IDLE');
      }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let finalWhatsapp = '';
    if (localPhone) {
        if (verificationStatus !== 'VERIFIED') {
            alert("You must verify your WhatsApp number before saving.");
            return;
        }
        finalWhatsapp = `${countryCode}${localPhone}`;
    }
    
    setIsSaving(true);
    try {
        await auth.updateProfile({
            displayName: nickname,
            whatsapp: finalWhatsapp,
            preferredStore: storeName,
            preferredGame: preferredGame,
            storeAnnouncement: storeAnnouncement
        });
        setIsEditing(false);
        loadProfile(); 
    } catch (error) {
        console.error("Failed to update profile", error);
        alert("Failed to update profile.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadProfile();
  };

  const handleShareProfile = () => {
      if (!user) return;
      const url = `${window.location.origin}/?trader=${user.id}`;
      navigator.clipboard.writeText(url).then(() => {
          alert("Profile link copied to clipboard!");
      });
  };

  const handleRevealContact = async () => {
      if (!user) return;
      setShowContact(true);
      await tradeService.logInteraction(user.id, user.displayName, 'Storefront Visit');
      window.open(`https://wa.me/${user.whatsapp}`, '_blank');
  };

  const handleFeedback = async (id: string, success: boolean) => {
      if (!success) {
          await tradeService.dismissFeedback(id);
      } else {
          await tradeService.confirmTrade(id, true);
      }
      loadPendingFeedback();
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
      } else if (tier === SubscriptionTier.MYTHIC) {
          color = 'bg-purple-600 text-white ring-1 ring-purple-400 shadow-lg shadow-purple-900/40';
          Icon = Zap;
      }

      return (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${color}`}>
              <Icon size={12} fill="currentColor" />
              {tier}
          </div>
      );
  };
  
  const currentStoreData = STORES.find(s => s.name === user?.preferredStore);

  // 1. Filter Logic
  const filteredStorefront = storefrontCards
    .filter(c => {
        if (!c.name.toLowerCase().includes(storefrontSearch.toLowerCase())) return false;
        if (gameFilter) {
            const cardGame = c.game || GameType.MTG;
            if (cardGame !== gameFilter) return false;
        }
        return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3. Pagination Logic
  const totalPages = Math.ceil(filteredStorefront.length / ITEMS_PER_PAGE);
  const displayedCards = filteredStorefront.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => {
      if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
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
                loadProfile(); 
            }}
          />
      )}

      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {!isOwnProfile && onBack && (
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{isOwnProfile ? 'My Profile' : 'Trader Profile'}</h1>
                    <p className="text-slate-400">{isOwnProfile ? 'Manage your trader identity & public storefront.' : 'View trader details and inventory.'}</p>
                </div>
            </div>
            
            {/* Share Button */}
            {!isEditing && (
                <button 
                    onClick={handleShareProfile}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700 shadow-lg"
                    title="Copy Public Link"
                >
                    <Share2 size={18} /> <span className="hidden md:inline">Share Profile</span>
                </button>
            )}
        </header>

        {/* Store Announcement Banner (Visible in View Mode) */}
        {!isEditing && user.storeAnnouncement && (
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-4 rounded-xl mb-6 flex items-start gap-4 shadow-lg">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 shrink-0">
                    <Megaphone size={24} />
                </div>
                <div>
                    <h3 className="text-amber-200 font-bold mb-1">Announcement</h3>
                    <p className="text-amber-100/90 text-sm whitespace-pre-wrap">{user.storeAnnouncement}</p>
                </div>
            </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mb-6">
            {/* Banner / Header */}
            <div className={`h-32 relative ${
                user.subscriptionTier === SubscriptionTier.MYTHIC ? 'bg-gradient-to-r from-purple-900 to-fuchsia-900' :
                user.subscriptionTier === SubscriptionTier.RARE ? 'bg-gradient-to-r from-amber-700/50 to-orange-900/50' : 
                'bg-gradient-to-r from-violet-900/50 to-indigo-900/50'
            }`}>
                <div className="absolute -bottom-10 left-6">
                    <div className={`w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg ${
                        user.subscriptionTier === SubscriptionTier.MYTHIC ? 'ring-2 ring-purple-500' :
                        user.subscriptionTier === SubscriptionTier.RARE ? 'ring-2 ring-amber-500' : ''
                    }`}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-slate-500" />
                        )}
                    </div>
                </div>
                {/* Subscription Badge Positioned Top Right */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    {renderTierBadge(user.subscriptionTier)}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-950/60 backdrop-blur-md border border-slate-700 text-slate-200 shadow-sm">
                         <ThumbsUp size={12} className="text-green-400" />
                         Trader Value: {user.successfulTrades || 0}
                    </div>
                </div>
            </div>

            <div className="pt-12 px-6 pb-6">
                {!isEditing ? (
                    // VIEW MODE
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {user.displayName}
                                </h2>
                                {isOwnProfile && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-slate-400 flex items-center gap-2 text-sm">
                                            <Mail size={14} /> {user.email}
                                        </p>
                                        {user.preferredGame && (
                                             <p className="text-indigo-400 flex items-center gap-2 text-sm font-medium">
                                                 <Gamepad2 size={14} /> Plays: {user.preferredGame}
                                             </p>
                                        )}
                                    </div>
                                )}
                                {!isOwnProfile && user.preferredGame && (
                                     <p className="text-indigo-400 flex items-center gap-2 text-sm font-medium mt-1">
                                         <Gamepad2 size={14} /> Plays: {user.preferredGame}
                                     </p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {isOwnProfile && (
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border border-slate-700"
                                        >
                                            <Edit2 size={16} /> Edit Profile
                                        </button>
                                        
                                        {/* Don't show upgrade button for Mythic users */}
                                        {user.subscriptionTier !== SubscriptionTier.MYTHIC && (
                                            <button 
                                                onClick={() => setShowSubscriptionModal(true)}
                                                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg shadow-violet-900/20"
                                            >
                                                <Crown size={16} /> Upgrade Plan
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                             {/* WhatsApp Card */}
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                 <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">WhatsApp</label>
                                 <div className="flex items-center gap-3 text-slate-200">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.whatsapp ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                                         <Phone size={16} />
                                     </div>
                                     <div className="flex-1">
                                         {user.whatsapp ? (
                                             isOwnProfile ? (
                                                 <span className="font-mono text-lg">{user.whatsapp}</span>
                                             ) : (
                                                 !showContact ? (
                                                     <button 
                                                        onClick={handleRevealContact}
                                                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                                                     >
                                                         <Eye size={14} /> Reveal Contact
                                                     </button>
                                                 ) : (
                                                    <a href={`https://wa.me/${user.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-green-400 font-mono text-lg flex items-center gap-1">
                                                        {user.whatsapp} <ExternalLink size={14}/>
                                                    </a>
                                                 )
                                             )
                                         ) : (
                                             <span className="text-slate-500 italic">Not set</span>
                                         )}
                                     </div>
                                 </div>
                                 {!user.whatsapp && isOwnProfile && (
                                     <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                                         <AlertCircle size={12} /> Required for Auctions
                                     </p>
                                 )}
                             </div>

                             {/* Store Card (Enhanced) */}
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                                 <div>
                                     <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">Preferred Store</label>
                                     <div className="flex items-start gap-3 text-slate-200">
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.preferredStore ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                                             <MapPin size={16} />
                                         </div>
                                         <div>
                                            <span className="font-bold text-lg block leading-tight">{user.preferredStore || "None selected"}</span>
                                            {/* Enhanced Location Text */}
                                            {currentStoreData && (
                                                <span className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                                                    <Navigation size={12} /> {currentStoreData.location}
                                                </span>
                                            )}
                                         </div>
                                     </div>
                                 </div>
                                 
                                 {/* Map Link Button */}
                                 {currentStoreData && (
                                     <a 
                                        href={currentStoreData.mapUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="mt-3 text-xs bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-900/50 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                     >
                                         <ExternalLink size={14} /> Open in Google Maps
                                     </a>
                                 )}
                             </div>
                        </div>

                        {/* Pending Feedback Section (Only on Own Profile) */}
                        {isOwnProfile && pendingFeedbacks.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-800 animate-in slide-in-from-top-4">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <CheckCircle className="text-violet-400" /> Pending Trade Confirmations
                                </h3>
                                <div className="space-y-3">
                                    {pendingFeedbacks.map(item => (
                                        <div key={item.id} className="bg-slate-950/50 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <p className="text-slate-200 text-sm">
                                                    Did you successfully trade <b>{item.cardName}</b> with <span className="text-white font-bold">{item.sellerName}</span>?
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">Contacted {Math.floor((Date.now() - item.timestamp) / (1000 * 60 * 60))} hours ago</p>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button 
                                                    onClick={() => handleFeedback(item.id, false)}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <X size={16} /> No / Ignore
                                                </button>
                                                <button 
                                                    onClick={() => handleFeedback(item.id, true)}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                                >
                                                    <ThumbsUp size={16} /> Yes!
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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

                            {/* Store Announcement Field (New) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Store Status / Announcement</label>
                                <div className="relative">
                                    <Megaphone className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <textarea 
                                        value={storeAnnouncement}
                                        onChange={(e) => setStoreAnnouncement(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none h-24 resize-none"
                                        placeholder="e.g. Buying collections this weekend! Closed on Mondays."
                                        maxLength={150}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 text-right">
                                    {storeAnnouncement.length}/150
                                </p>
                            </div>

                            {/* Preferred Game */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Game (Auto-Filters)</label>
                                <div className="relative">
                                    <Gamepad2 className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <select 
                                        value={preferredGame}
                                        onChange={(e) => setPreferredGame(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Every Game (Show All)</option>
                                        {Object.values(GameType).map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Selecting a game here will automatically filter News and Showcase sections to show this game first.
                                </p>
                            </div>

                            {/* WhatsApp Verification Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp Verification</label>
                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-4">
                                    
                                    {/* Phone Entry */}
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="w-full md:w-1/3">
                                            <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Country</label>
                                            <select 
                                                value={countryCode}
                                                onChange={(e) => handleCountryChange(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                            >
                                                {COUNTRY_CODES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 relative">
                                            <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Phone Number</label>
                                            <Phone className="absolute left-3 top-9 text-slate-500" size={16} />
                                            <input 
                                                type="tel"
                                                value={localPhone}
                                                onChange={(e) => handlePhoneChange(e.target.value)}
                                                className={`w-full bg-slate-900 border rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:outline-none ${verificationStatus === 'VERIFIED' ? 'border-green-500/50 focus:ring-green-500' : 'border-slate-700 focus:ring-violet-500'}`}
                                                placeholder="999888777"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
                                        {verificationStatus === 'IDLE' && (
                                            <div className="w-full">
                                                <button 
                                                    type="button"
                                                    onClick={handleStartVerification}
                                                    disabled={!localPhone}
                                                    className="w-full bg-slate-800 hover:bg-violet-600/20 hover:text-violet-400 text-slate-300 border border-slate-700 hover:border-violet-500/50 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Send size={16} /> Get Verification Code
                                                </button>
                                                <p className="text-xs text-slate-500 mt-2 text-center">
                                                    We will open WhatsApp with a pre-filled message.
                                                </p>
                                            </div>
                                        )}

                                        {verificationStatus === 'SENT' && (
                                            <div className="w-full space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="bg-violet-500/10 border border-violet-500/30 p-3 rounded text-sm text-violet-200">
                                                    <p className="font-bold mb-1">Check WhatsApp!</p>
                                                    Step 1: Send the message in the opened chat.<br/>
                                                    Step 2: Copy the code from that message.<br/>
                                                    Step 3: Paste it below.
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Enter 6-digit code"
                                                        value={inputCode}
                                                        onChange={(e) => setInputCode(e.target.value)}
                                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-mono tracking-widest focus:ring-2 focus:ring-violet-500 outline-none"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={handleVerifyCode}
                                                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-bold"
                                                    >
                                                        Verify
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {verificationStatus === 'VERIFIED' && (
                                            <div className="w-full bg-green-500/10 border border-green-500/50 p-3 rounded-lg flex items-center justify-center gap-2 text-green-400 font-bold animate-in zoom-in">
                                                <CheckCircle size={20} /> Verified Number
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Store */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tienda Preferida</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <select 
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">-- Select a Store --</option>
                                        {STORES.map((s) => (
                                            <option key={s.name} value={s.name}>{s.name} ({s.location})</option>
                                        ))}
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
                                disabled={isSaving || (localPhone && verificationStatus !== 'VERIFIED')}
                                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>

        {/* PUBLIC STOREFRONT SECTION */}
        {!isEditing && (
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Layers size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Public Storefront</h2>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
                     {/* Search & Filter Bar */}
                     <div className="mb-6 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <input 
                                type="text"
                                placeholder="Search inventory..."
                                value={storefrontSearch}
                                onChange={(e) => setStorefrontSearch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="relative w-full md:w-48">
                            <Filter className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <select 
                                value={gameFilter}
                                onChange={(e) => setGameFilter(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">All Games</option>
                                {Object.values(GameType).map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                     </div>

                     {isLoadingStorefront ? (
                         <div className="text-center py-10 text-slate-500">
                             <Loader2 className="animate-spin mx-auto mb-2" />
                             Loading inventory...
                         </div>
                     ) : (
                         <>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                                 {displayedCards.map(card => (
                                     <div key={card.id} className="relative">
                                         <MTGCard 
                                            card={card}
                                            enableShowcase={false} // Read only view
                                         />
                                         {/* Game Badge if All Games selected */}
                                         {!gameFilter && card.game && (
                                            <span className="absolute top-1 right-1 z-10 text-[8px] bg-slate-900/80 text-white px-1.5 py-0.5 rounded border border-slate-600">
                                                {card.game === GameType.MTG ? 'MTG' : card.game === GameType.POKEMON ? 'PKM' : 'YGO'}
                                            </span>
                                         )}
                                     </div>
                                 ))}
                                 
                                 {filteredStorefront.length === 0 && (
                                     <div className="col-span-full text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                         <p>{storefrontCards.length === 0 ? "This trader has no cards listed for trade." : "No cards match your search."}</p>
                                     </div>
                                 )}
                             </div>

                             {/* Pagination Controls */}
                             {filteredStorefront.length > ITEMS_PER_PAGE && (
                                 <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                                     <button 
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded hover:bg-slate-800 transition-colors"
                                     >
                                         <ChevronLeft size={16} /> Prev
                                     </button>
                                     
                                     <span className="text-sm text-slate-500">
                                         Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
                                     </span>
                                     
                                     <button 
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded hover:bg-slate-800 transition-colors"
                                     >
                                         Next <ChevronRight size={16} />
                                     </button>
                                 </div>
                             )}
                         </>
                     )}
                </div>
            </div>
        )}

        {/* Admin Panel Button */}
        {isOwnProfile && user.isAdmin && onAdminClick && (
            <button
                onClick={onAdminClick}
                className="w-full mt-6 bg-red-900/20 hover:bg-red-900/30 border border-red-900/50 text-red-400 p-4 rounded-xl flex items-center justify-between group transition-all mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <ShieldAlert size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white">Admin Panel</h3>
                        <p className="text-sm text-slate-400">Manage system configuration and users</p>
                    </div>
                </div>
                <ChevronRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
        )}
        
        {/* Auctions History Section - ONLY VISIBLE ON OWN PROFILE */}
        {isOwnProfile && (
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6">
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

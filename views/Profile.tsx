
import React, { useState, useEffect } from 'react';
import { auth } from '../services/store';
import { UserProfile, SubscriptionTier } from '../types';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Loader2, ArrowLeft, Crown, Shield, Star } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';

interface ProfileProps {
    viewingUserId?: string | null;
    onBack?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ viewingUserId, onBack }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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
        }
    } else if (viewingUserId) {
        // Load OTHER profile
        const publicProfile = await auth.getUserPublicProfile(viewingUserId);
        setUser(publicProfile);
    }
    setIsLoading(false);
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

      <div className="max-w-2xl mx-auto">
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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
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
      </div>
    </div>
  );
};

export default Profile;

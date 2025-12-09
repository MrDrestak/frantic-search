
import React, { useState, useEffect } from 'react';
import { auth } from '../services/store';
import { UserProfile } from '../types';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Loader2 } from 'lucide-react';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [store, setStore] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
        setUser(currentUser);
        setNickname(currentUser.displayName || '');
        setWhatsapp(currentUser.whatsapp || '');
        setStore(currentUser.preferredStore || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
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
    // Reset form to current user values
    if (user) {
        setNickname(user.displayName);
        setWhatsapp(user.whatsapp || '');
        setStore(user.preferredStore || '');
    }
  };

  if (!user) return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;

  return (
    <div className="p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">My Profile</h1>
            <p className="text-slate-400">Manage your trader identity and contact info.</p>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Banner / Header */}
            <div className="h-32 bg-gradient-to-r from-violet-900/50 to-indigo-900/50 relative">
                <div className="absolute -bottom-10 left-6">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-slate-500" />
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-12 px-6 pb-6">
                {!isEditing ? (
                    // VIEW MODE
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
                                <p className="text-slate-400 flex items-center gap-2 text-sm mt-1">
                                    <Mail size={14} /> {user.email}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-slate-700"
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                 <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">WhatsApp</label>
                                 <div className="flex items-center gap-3 text-slate-200">
                                     <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                         <Phone size={16} />
                                     </div>
                                     <span className="font-mono text-lg">{user.whatsapp || "Not set"}</span>
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
                                        placeholder="e.g. 51999888777"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Numbers only. Used for trade coordination.</p>
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

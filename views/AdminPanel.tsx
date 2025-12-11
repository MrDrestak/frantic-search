
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, ShieldAlert, Trash2, UserCheck, Crown, Layers, Heart, Gavel, DollarSign, Bell, Clock } from 'lucide-react';
import { configService, auth, adminService } from '../services/store';
import { GlobalConfig, SubscriptionTier, TierLimits, SystemConfig } from '../types';

interface AdminPanelProps {
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    
    // Partner Management
    const [partnerEmail, setPartnerEmail] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    const [user] = useState(auth.getCurrentUser());

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        // Ensure user is admin
        if (!user?.isAdmin) {
            setIsLoading(false);
            return;
        }
        const data = await configService.loadConfig();
        const sysData = configService.getSystemConfig();
        setConfig(data);
        setSysConfig(sysData);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!config || !sysConfig) return;
        setIsSaving(true);
        try {
            await configService.updateConfig(config);
            await configService.updateSystemConfig(sysConfig);
            alert("Settings saved successfully.");
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save settings.");
        }
        setIsSaving(false);
    };

    const handleAssignMythic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partnerEmail) return;

        setIsAssigning(true);
        try {
            await adminService.assignTierByEmail(partnerEmail, SubscriptionTier.MYTHIC);
            alert(`Success! ${partnerEmail} is now a Mythic partner.`);
            setPartnerEmail('');
        } catch (e: any) {
            alert("Failed to assign Mythic tier: " + e.message);
        }
        setIsAssigning(false);
    };

    const handleWipeDatabase = async () => {
        const confirm1 = window.confirm("DANGER: This will delete ALL users, binders, and cards. This cannot be undone.");
        if (!confirm1) return;
        const confirm2 = window.confirm("Are you absolutely sure you want to restart all tests? This app will reload after wiping.");
        if (!confirm2) return;

        setIsWiping(true);
        try {
            await adminService.wipeDatabase();
            alert("Database wiped successfully. Reloading app...");
            window.location.reload();
        } catch (e: any) {
            alert("Failed to wipe database: " + e.message);
            setIsWiping(false);
        }
    }

    const handleChange = (tier: SubscriptionTier, field: keyof TierLimits, value: string) => {
        if (!config) return;
        
        setConfig(prev => {
            if (!prev) return null;

            let finalValue: string | number = value;
            
            // Only parse as number if it's not the currency field
            if (field !== 'currency') {
                finalValue = value === '' ? 0 : parseFloat(value);
            }

            return {
                ...prev,
                [tier]: {
                    ...prev[tier],
                    [field]: finalValue
                }
            };
        });
    };

    if (!user?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <ShieldAlert size={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-slate-400 mb-6">You do not have administrative privileges.</p>
                <button onClick={onBack} className="text-violet-400 hover:text-white underline">
                    Return to App
                </button>
            </div>
        );
    }

    if (isLoading || !config || !sysConfig) {
        return <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading Admin Panel...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24">
            <header className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        Admin Control Panel <ShieldAlert size={20} className="text-red-500" />
                    </h1>
                    <p className="text-slate-400">Configure system limits per subscription tier.</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isWiping}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-green-900/20"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </header>

            {/* System Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Clock size={20} className="text-blue-500" /> Trade Verification Logic
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block mb-1">Minimum Wait (Hours)</label>
                        <p className="text-xs text-slate-500 mb-2">How long to wait after initial contact before asking buyer for feedback.</p>
                        <input 
                            type="number"
                            value={sysConfig.minTradeConfirmHours}
                            onChange={(e) => setSysConfig({...sysConfig, minTradeConfirmHours: parseInt(e.target.value)})}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300 block mb-1">Maximum Window (Hours)</label>
                        <p className="text-xs text-slate-500 mb-2">How long the feedback request remains active before expiring.</p>
                        <input 
                            type="number"
                            value={sysConfig.maxTradeConfirmHours}
                            onChange={(e) => setSysConfig({...sysConfig, maxTradeConfirmHours: parseInt(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Main Configuration Grid */}
            <div className="space-y-8">
                {Object.values(SubscriptionTier).map((tier) => (
                    <div key={tier} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                         <div className={`px-6 py-4 flex justify-between items-center ${
                             tier === SubscriptionTier.MYTHIC ? 'bg-purple-900/20 border-b border-purple-500/20' :
                             tier === SubscriptionTier.RARE ? 'bg-amber-900/20 border-b border-amber-500/20' :
                             tier === SubscriptionTier.UNCOMMON ? 'bg-slate-800/50 border-b border-slate-700' :
                             'bg-slate-950 border-b border-slate-800'
                         }`}>
                             <div className="flex items-center gap-3">
                                 {tier === SubscriptionTier.MYTHIC && <Crown className="text-purple-500" size={24} />}
                                 <h2 className="text-xl font-bold text-white">{tier} Tier</h2>
                             </div>
                             
                             {/* Price Config */}
                             <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1.5 border border-slate-700">
                                 <DollarSign size={16} className="text-green-500 ml-2" />
                                 <input 
                                     type="number"
                                     min="0"
                                     step="0.01"
                                     value={config[tier].pricePerMonth}
                                     onChange={(e) => handleChange(tier, 'pricePerMonth', e.target.value)}
                                     className="bg-transparent text-white w-16 text-right outline-none font-bold"
                                     placeholder="0.00"
                                 />
                                 <select 
                                     value={config[tier].currency || 'USD'}
                                     onChange={(e) => handleChange(tier, 'currency', e.target.value)}
                                     className="bg-slate-800 text-slate-300 text-xs rounded px-1 py-1 outline-none border-l border-slate-700"
                                 >
                                     <option value="USD">USD</option>
                                     <option value="PEN">PEN</option>
                                 </select>
                             </div>
                         </div>

                         <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                             {/* Trade Config */}
                             <div className="space-y-3">
                                 <h4 className="text-indigo-400 font-bold text-sm uppercase flex items-center gap-2 mb-2">
                                     <Layers size={16} /> Trade / Sell
                                 </h4>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Max Binders</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxTradeBinders}
                                         onChange={(e) => handleChange(tier, 'maxTradeBinders', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Cards per Binder</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxCardsPerTradeBinder}
                                         onChange={(e) => handleChange(tier, 'maxCardsPerTradeBinder', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                     />
                                 </div>
                             </div>

                             {/* Wishlist Config */}
                             <div className="space-y-3">
                                 <h4 className="text-pink-400 font-bold text-sm uppercase flex items-center gap-2 mb-2">
                                     <Heart size={16} /> Wishlist
                                 </h4>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Max Binders</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxWishlistBinders}
                                         onChange={(e) => handleChange(tier, 'maxWishlistBinders', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-pink-500"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Cards per Binder</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxCardsPerWishlistBinder}
                                         onChange={(e) => handleChange(tier, 'maxCardsPerWishlistBinder', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-pink-500"
                                     />
                                 </div>
                             </div>

                             {/* Auction Config */}
                             <div className="space-y-3">
                                 <h4 className="text-amber-400 font-bold text-sm uppercase flex items-center gap-2 mb-2">
                                     <Gavel size={16} /> Auctions
                                 </h4>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Max Binders</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxAuctionBinders}
                                         onChange={(e) => handleChange(tier, 'maxAuctionBinders', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-amber-500"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Cards per Binder</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxAuctionCardsPerBinder}
                                         onChange={(e) => handleChange(tier, 'maxAuctionCardsPerBinder', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-amber-500"
                                     />
                                 </div>
                             </div>

                             {/* General Config */}
                             <div className="space-y-3">
                                 <h4 className="text-slate-400 font-bold text-sm uppercase flex items-center gap-2 mb-2">
                                     General
                                 </h4>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><Bell size={12}/> Max Alerts</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxCardAlerts}
                                         onChange={(e) => handleChange(tier, 'maxCardAlerts', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-violet-500"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500 block mb-1">Max Showcase Items</label>
                                     <input 
                                         type="number"
                                         value={config[tier].maxShowcaseItems}
                                         onChange={(e) => handleChange(tier, 'maxShowcaseItems', e.target.value)}
                                         className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-violet-500"
                                     />
                                 </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {/* Mythic Partner Manager */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Crown size={20} className="text-purple-500" /> Manage Store Partners
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Manually assign the "Mythic" tier to TCG Stores.
                    </p>
                    <form onSubmit={handleAssignMythic} className="flex gap-2">
                        <input 
                            type="email" 
                            placeholder="Store Google Email"
                            value={partnerEmail}
                            onChange={(e) => setPartnerEmail(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            required
                        />
                        <button 
                            type="submit"
                            disabled={isAssigning}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
                            Promote
                        </button>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
                    <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                        <Trash2 size={20} /> Danger Zone
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Resetting the environment will delete all data.
                    </p>
                    <button 
                        onClick={handleWipeDatabase}
                        disabled={isWiping}
                        className="bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 border border-red-600/50 px-4 py-3 rounded-lg flex items-center gap-2 font-bold transition-all w-full justify-center"
                    >
                        {isWiping ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        Wipe Database
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
